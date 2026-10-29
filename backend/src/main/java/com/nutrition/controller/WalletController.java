package com.nutrition.controller;

import com.nutrition.entity.Role;
import com.nutrition.security.CustomUserDetails;
import com.nutrition.service.WalletService;
import com.nutrition.entity.User;
import com.nutrition.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import com.nutrition.service.WalletSseService;
import org.springframework.http.MediaType;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequestMapping("/api/wallet")
@RequiredArgsConstructor
public class WalletController {

    private final WalletService walletService;
    private final UserRepository userRepository;
    private final WalletSseService walletSseService;

    /**
     * Server-Sent Events (SSE) Endpoint for real-time live wallet balance updates.
     * Clients maintain a persistent HTTP connection to receive live push updates.
     */
    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamWalletUpdates(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam(value = "userId", required = false) Long paramUserId,
            @RequestParam(value = "email", required = false) String paramEmail,
            @RequestParam(value = "role", required = false) String paramRole,
            jakarta.servlet.http.HttpServletResponse response) {

        // Prevent proxy buffering (Nginx, Cloudflare, AWS ALB) & Chrome pipeline stalls
        response.setHeader("X-Accel-Buffering", "no");
        response.setHeader("Cache-Control", "no-cache, no-transform");
        response.setHeader("Connection", "keep-alive");
        response.setContentType(MediaType.TEXT_EVENT_STREAM_VALUE);

        // The stream is always bound to the authenticated principal. The legacy userId/email/role
        // query parameters are intentionally ignored: trusting them let any signed-in user listen
        // to somebody else's wallet and appointment events.
        if (userDetails == null) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.UNAUTHORIZED, "Sign in to open a live stream");
        }

        // No repository call here on purpose: this method's response is a long-lived stream, and
        // running a query on this request keeps a pooled connection checked out for as long as
        // the stream lives (which is what previously exhausted the pool). The principal already
        // carries both the id and the email, so no lookup is needed.
        Long targetUserId = userDetails.getId();
        String targetEmail = userDetails.getUsername();
        boolean isAdmin = userDetails.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().contains("ADMIN"));

        return walletSseService.subscribe(targetUserId, targetEmail, isAdmin);
    }

    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> getMyWallet(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam(value = "userId", required = false) Long paramUserId,
            @RequestParam(value = "email", required = false) String paramEmail,
            @RequestHeader(value = "X-User-Email", required = false) String headerEmail) {

        Long targetUserId = null;
        if (paramUserId != null) {
            targetUserId = paramUserId;
        } else {
            String emailToFind = (paramEmail != null && !paramEmail.isBlank()) ? paramEmail : headerEmail;
            if (emailToFind != null && !emailToFind.isBlank()) {
                User u = userRepository.findByEmail(emailToFind.trim()).orElse(null);
                if (u != null) targetUserId = u.getId();
            }
        }

        if (targetUserId == null && userDetails != null && userDetails.getId() != null) {
            targetUserId = userDetails.getId();
        }

        if (targetUserId == null) {
            return ResponseEntity.ok(Map.of("balance", BigDecimal.ZERO, "currency", "INR"));
        }

        return ResponseEntity.ok(walletService.getWalletInfo(targetUserId));
    }

    @GetMapping("/transactions")
    public ResponseEntity<List<Map<String, Object>>> getMyTransactions(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam(value = "userId", required = false) Long paramUserId,
            @RequestParam(value = "email", required = false) String paramEmail) {

        Long targetUserId = null;
        if (userDetails != null && userDetails.getId() != null) {
            targetUserId = userDetails.getId();
        } else if (paramUserId != null) {
            targetUserId = paramUserId;
        } else if (paramEmail != null && !paramEmail.isBlank()) {
            User u = userRepository.findByEmail(paramEmail.trim()).orElse(null);
            if (u != null) targetUserId = u.getId();
        }

        if (targetUserId == null) {
            return ResponseEntity.ok(List.of());
        }

        return ResponseEntity.ok(walletService.getUserTransactionHistory(targetUserId));
    }

    /**
     * Checkout Balance Validation & Precise Deduction ("Low Balance" Guard)
     */
    @PostMapping("/pay-service")
    public ResponseEntity<Map<String, Object>> payForService(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestBody Map<String, Object> payload) {
        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        Long nutritionistId = payload.get("nutritionistId") != null
                ? Long.valueOf(payload.get("nutritionistId").toString())
                : null;

        BigDecimal servicePrice = payload.get("servicePrice") != null
                ? new BigDecimal(payload.get("servicePrice").toString())
                : BigDecimal.ZERO;

        String serviceName = payload.get("serviceName") != null
                ? payload.get("serviceName").toString()
                : "Clinical Nutrition Service";

        Long appointmentId = payload.get("appointmentId") != null
                ? Long.valueOf(payload.get("appointmentId").toString())
                : null;

        if (nutritionistId == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "nutritionistId is required"));
        }

        Map<String, Object> result = walletService.transferForServicePayment(
                userDetails.getId(), nutritionistId, servicePrice, serviceName, appointmentId);

        if ("LOW_BALANCE".equals(result.get("status"))) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(result);
        }

        return ResponseEntity.ok(result);
    }

    // -------------------------------------------------------------
    // ADMIN ENDPOINTS: Credit Allocation & Audit Ledger
    // -------------------------------------------------------------

    @GetMapping("/admin/recipients")
    public ResponseEntity<List<Map<String, Object>>> getEligibleRecipients(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(walletService.getEligibleRecipients());
    }

    @PostMapping("/admin/create-order")
    public ResponseEntity<Map<String, Object>> createAdminAllocationOrder(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestBody Map<String, Object> payload) {
        Long recipientId = payload.get("recipientId") != null
                ? Long.valueOf(payload.get("recipientId").toString())
                : null;

        BigDecimal amount = payload.get("amount") != null
                ? new BigDecimal(payload.get("amount").toString())
                : BigDecimal.ZERO;

        String notes = payload.get("notes") != null ? payload.get("notes").toString() : null;

        if (recipientId == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "recipientId is required"));
        }

        Long adminId = (userDetails != null && userDetails.getId() != null) ? userDetails.getId() : null;

        Map<String, Object> order = walletService.createAdminAllocationOrder(
                adminId, recipientId, amount, notes);
        return ResponseEntity.ok(order);
    }

    @PostMapping("/admin/verify-and-credit")
    public ResponseEntity<Map<String, Object>> verifyAndCredit(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestBody Map<String, Object> payload) {
        Long recipientId = payload.get("recipientId") != null
                ? Long.valueOf(payload.get("recipientId").toString())
                : null;

        BigDecimal amount = payload.get("amount") != null
                ? new BigDecimal(payload.get("amount").toString())
                : BigDecimal.ZERO;

        String orderId = payload.get("orderId") != null ? payload.get("orderId").toString() : null;
        String paymentId = payload.get("paymentId") != null ? payload.get("paymentId").toString() : null;
        String signature = payload.get("signature") != null ? payload.get("signature").toString() : null;
        String notes = payload.get("notes") != null ? payload.get("notes").toString() : null;

        if (recipientId == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "recipientId is required"));
        }

        Long adminId = (userDetails != null && userDetails.getId() != null) ? userDetails.getId() : null;

        Map<String, Object> result = walletService.verifyAndCreditAdminAllocation(
                adminId, recipientId, amount, orderId, paymentId, signature, notes);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/admin/sync-balance")
    public ResponseEntity<Map<String, Object>> syncRecipientBalance(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestBody Map<String, Object> payload) {
        Long recipientId = payload.get("recipientId") != null
                ? Long.valueOf(payload.get("recipientId").toString())
                : null;
        BigDecimal balance = payload.get("balance") != null
                ? new BigDecimal(payload.get("balance").toString())
                : null;
        String notes = payload.get("notes") != null ? payload.get("notes").toString() : null;

        if (recipientId == null || balance == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "recipientId and balance are required"));
        }

        Long adminId = (userDetails != null && userDetails.getId() != null) ? userDetails.getId() : null;
        Map<String, Object> result = walletService.syncRecipientBalance(adminId, recipientId, balance, notes);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/admin/record-failed-transaction")
    public ResponseEntity<Map<String, Object>> recordFailedTransaction(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestBody Map<String, Object> payload) {
        Long recipientId = payload.get("recipientId") != null
                ? Long.valueOf(payload.get("recipientId").toString())
                : null;
        BigDecimal amount = payload.get("amount") != null
                ? new BigDecimal(payload.get("amount").toString())
                : BigDecimal.ZERO;
        String status = payload.get("status") != null ? payload.get("status").toString() : "FAILED";
        String reason = payload.get("reason") != null ? payload.get("reason").toString() : null;
        String orderId = payload.get("orderId") != null ? payload.get("orderId").toString() : null;
        String paymentId = payload.get("paymentId") != null ? payload.get("paymentId").toString() : null;

        Long adminId = (userDetails != null && userDetails.getId() != null) ? userDetails.getId() : null;
        Map<String, Object> result = walletService.recordFailedOrCancelledTransaction(
                adminId, recipientId, amount, status, reason, orderId, paymentId);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/admin/manual-topup")
    public ResponseEntity<Map<String, Object>> manualTopup(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestBody Map<String, Object> payload) {
        Long recipientId = payload.get("recipientId") != null ? Long.valueOf(payload.get("recipientId").toString()) : null;
        BigDecimal amount = payload.get("amount") != null ? new BigDecimal(payload.get("amount").toString()) : BigDecimal.ZERO;
        String notes = payload.get("notes") != null ? payload.get("notes").toString() : null;
        if (recipientId == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            return ResponseEntity.badRequest().body(Map.of("message", "recipientId and positive amount are required"));
        }
        Long adminId = (userDetails != null && userDetails.getId() != null) ? userDetails.getId() : null;
        return ResponseEntity.ok(walletService.adminManualTopup(adminId, recipientId, amount, notes));
    }

    @PostMapping("/admin/bonus-credit")
    public ResponseEntity<Map<String, Object>> bonusCredit(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestBody Map<String, Object> payload) {
        Long recipientId = payload.get("recipientId") != null ? Long.valueOf(payload.get("recipientId").toString()) : null;
        BigDecimal amount = payload.get("amount") != null ? new BigDecimal(payload.get("amount").toString()) : BigDecimal.ZERO;
        String notes = payload.get("notes") != null ? payload.get("notes").toString() : null;
        if (recipientId == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            return ResponseEntity.badRequest().body(Map.of("message", "recipientId and positive amount are required"));
        }
        Long adminId = (userDetails != null && userDetails.getId() != null) ? userDetails.getId() : null;
        return ResponseEntity.ok(walletService.adminBonusCredit(adminId, recipientId, amount, notes));
    }

    @PostMapping("/admin/platform-deduction")
    public ResponseEntity<Map<String, Object>> platformDeduction(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestBody Map<String, Object> payload) {
        Long recipientId = payload.get("recipientId") != null ? Long.valueOf(payload.get("recipientId").toString()) : null;
        BigDecimal amount = payload.get("amount") != null ? new BigDecimal(payload.get("amount").toString()) : BigDecimal.ZERO;
        String notes = payload.get("notes") != null ? payload.get("notes").toString() : null;
        if (recipientId == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            return ResponseEntity.badRequest().body(Map.of("message", "recipientId and positive amount are required"));
        }
        Long adminId = (userDetails != null && userDetails.getId() != null) ? userDetails.getId() : null;
        return ResponseEntity.ok(walletService.adminPlatformDeduction(adminId, recipientId, amount, notes));
    }

    @GetMapping("/admin/ledger")
    public ResponseEntity<List<Map<String, Object>>> getLedger(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(walletService.getAllTransactionsLedger());
    }
}
