package com.nutrition.service;

import com.nutrition.entity.Role;
import com.nutrition.entity.User;
import com.nutrition.entity.Wallet;
import com.nutrition.entity.WalletTransaction;
import com.nutrition.repository.UserRepository;
import com.nutrition.repository.WalletRepository;
import com.nutrition.repository.WalletTransactionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class WalletService {

    private final WalletRepository walletRepository;
    private final WalletTransactionRepository walletTransactionRepository;
    private final UserRepository userRepository;
    private final RazorpayService razorpayService;
    private final WalletSseService walletSseService;

    public Wallet getOrCreateWallet(User user) {
        if (user == null || user.getId() == null) {
            Wallet fallback = new Wallet();
            fallback.setBalance(BigDecimal.ZERO);
            fallback.setCurrency("INR");
            return fallback;
        }
        Wallet wallet = walletRepository.findByUserId(user.getId()).orElseGet(() -> {
            Wallet newWallet = new Wallet();
            newWallet.setUser(user);
            newWallet.setBalance(BigDecimal.ZERO);
            newWallet.setCurrency("INR");
            return walletRepository.save(newWallet);
        });
        if (wallet.getBalance() == null) {
            wallet.setBalance(BigDecimal.ZERO);
            wallet = walletRepository.save(wallet);
        }

        return wallet;
    }

    public Wallet getOrCreateWalletWithLock(User user) {
        if (user == null || user.getId() == null) {
            return getOrCreateWallet(user);
        }
        Wallet wallet = walletRepository.findByUserIdWithLock(user.getId()).orElseGet(() -> {
            Wallet newWallet = new Wallet();
            newWallet.setUser(user);
            newWallet.setBalance(BigDecimal.ZERO);
            newWallet.setCurrency("INR");
            return walletRepository.save(newWallet);
        });
        if (wallet.getBalance() == null) {
            wallet.setBalance(BigDecimal.ZERO);
            wallet = walletRepository.save(wallet);
        }
        return wallet;
    }

    public Map<String, Object> getWalletInfo(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));
        Wallet wallet = getOrCreateWallet(user);

        final Long targetWalletId = wallet.getId();
        final String userEmail = user.getEmail();
        final Long targetUserId = userId;

        // Auto-reconcile with ledger transactions
        try {
            List<WalletTransaction> transactions = walletTransactionRepository.findAllByOrderByCreatedAtDesc();
            BigDecimal totalCredits = transactions.stream()
                    .filter(tx -> tx.getRecipient() != null && (tx.getRecipient().getId().equals(targetUserId) 
                            || (userEmail != null && userEmail.equalsIgnoreCase(tx.getRecipient().getEmail()))
                            || (targetWalletId != null && tx.getTargetWallet() != null && tx.getTargetWallet().getId().equals(targetWalletId)))
                            && ("SUCCESS".equalsIgnoreCase(tx.getStatus()) || "REFUNDED".equalsIgnoreCase(tx.getStatus())))
                    .map(WalletTransaction::getAmount)
                    .filter(Objects::nonNull)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            BigDecimal totalDebits = transactions.stream()
                    .filter(tx -> tx.getInitiator() != null && (tx.getInitiator().getId().equals(targetUserId)
                            || (userEmail != null && userEmail.equalsIgnoreCase(tx.getInitiator().getEmail()))
                            || (targetWalletId != null && tx.getSourceWallet() != null && tx.getSourceWallet().getId().equals(targetWalletId)))
                            && (("SERVICE_PAYMENT".equalsIgnoreCase(tx.getTransactionType()) && "SUCCESS".equalsIgnoreCase(tx.getStatus()))
                                || ("ESCROW_HOLD".equalsIgnoreCase(tx.getTransactionType()) && ("HELD".equalsIgnoreCase(tx.getStatus()) || "SUCCESS".equalsIgnoreCase(tx.getStatus())))))
                    .map(WalletTransaction::getAmount)
                    .filter(Objects::nonNull)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            BigDecimal ledgerBalance = totalCredits.subtract(totalDebits);
            if (ledgerBalance.compareTo(BigDecimal.ZERO) >= 0 && (wallet.getBalance() == null || wallet.getBalance().compareTo(ledgerBalance) < 0)) {
                wallet.setBalance(ledgerBalance);
                wallet = walletRepository.save(wallet);
            }
        } catch (Exception ignored) {}

        Map<String, Object> res = new HashMap<>();
        res.put("walletId", wallet.getId());
        res.put("userId", user.getId());
        res.put("userName", (user.getFirstName() != null ? user.getFirstName() : "") + " " + (user.getLastName() != null ? user.getLastName() : "").trim());
        res.put("email", user.getEmail());
        res.put("role", user.getRole() != null ? user.getRole().name() : "USER");
        res.put("balance", wallet.getBalance());
        res.put("currency", wallet.getCurrency());
        res.put("updatedAt", wallet.getUpdatedAt());
        return res;
    }

    public List<Map<String, Object>> getUserTransactionHistory(Long userId) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) return Collections.emptyList();
        Wallet wallet = getOrCreateWallet(user);

        List<WalletTransaction> list = walletTransactionRepository.findAllByOrderByCreatedAtDesc().stream()
                .filter(tx -> (tx.getInitiator() != null && tx.getInitiator().getId().equals(userId))
                        || (tx.getRecipient() != null && tx.getRecipient().getId().equals(userId))
                        || (tx.getSourceWallet() != null && tx.getSourceWallet().getId().equals(wallet.getId()))
                        || (tx.getTargetWallet() != null && tx.getTargetWallet().getId().equals(wallet.getId())))
                .collect(Collectors.toList());

        return list.stream().map(this::mapTransactionToMap).collect(Collectors.toList());
    }

    @Transactional
    public List<Map<String, Object>> getEligibleRecipients() {
        List<User> users = userRepository.findAll().stream()
                .filter(u -> u.getRole() == Role.USER || u.getRole() == Role.NUTRITIONIST)
                .sorted(Comparator.comparing(User::getFirstName, Comparator.nullsLast(String::compareToIgnoreCase)))
                .collect(Collectors.toList());

        List<Map<String, Object>> result = new ArrayList<>();
        for (User u : users) {
            Wallet w = getOrCreateWallet(u);
            Map<String, Object> map = new HashMap<>();
            map.put("id", u.getId());
            map.put("name", (u.getFirstName() != null ? u.getFirstName() : "") + " " + (u.getLastName() != null ? u.getLastName() : "").trim());
            map.put("email", u.getEmail());
            map.put("role", u.getRole() != null ? u.getRole().name() : "USER");
            map.put("balance", w.getBalance());
            map.put("currency", w.getCurrency());
            result.add(map);
        }
        return result;
    }

    public Map<String, Object> createAdminAllocationOrder(Long adminId, Long recipientId, BigDecimal amount, String notes) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Allocation amount must be strictly greater than zero.");
        }

        User recipient = recipientId != null ? userRepository.findById(recipientId).orElse(null) : null;
        if (recipient == null) {
            throw new IllegalArgumentException("Recipient not found with id: " + recipientId);
        }

        User admin = adminId != null ? userRepository.findById(adminId).orElse(null) : null;
        if (admin == null) {
            admin = userRepository.findByRole(Role.ADMIN).stream().findFirst().orElse(null);
        }

        String receipt = "RCPT_ALLOC_" + recipientId + "_" + System.currentTimeMillis();
        Map<String, String> orderNotes = new HashMap<>();
        orderNotes.put("adminId", String.valueOf(adminId));
        orderNotes.put("recipientId", String.valueOf(recipientId));
        orderNotes.put("recipientEmail", recipient.getEmail());
        orderNotes.put("purpose", "ADMIN_CREDIT_ALLOCATION");

        Map<String, Object> razorpayOrder = razorpayService.createOrder(amount, receipt, orderNotes);

        Map<String, Object> response = new HashMap<>(razorpayOrder);
        response.put("recipientId", recipient.getId());
        response.put("recipientName", (recipient.getFirstName() != null ? recipient.getFirstName() : "") + " " + (recipient.getLastName() != null ? recipient.getLastName() : "").trim());
        response.put("recipientEmail", recipient.getEmail());
        response.put("recipientRole", recipient.getRole() != null ? recipient.getRole().name() : "USER");
        response.put("notes", notes != null ? notes : "Admin Wallet Credit Allocation");
        return response;
    }

    @Transactional(rollbackFor = Exception.class)
    public Map<String, Object> verifyAndCreditAdminAllocation(
            Long adminId,
            Long recipientId,
            BigDecimal amount,
            String orderId,
            String paymentId,
            String signature,
            String notes) {

        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Credit amount must be greater than zero.");
        }

        User admin = adminId != null ? userRepository.findById(adminId).orElse(null) : null;
        if (admin == null) {
            admin = userRepository.findByRole(Role.ADMIN).stream().findFirst().orElse(null);
        }
        User recipient = recipientId != null ? userRepository.findById(recipientId).orElse(null) : null;
        if (recipient == null) {
            throw new IllegalArgumentException("Recipient user not found: " + recipientId);
        }

        Wallet recipientWallet = getOrCreateWallet(recipient);
        BigDecimal receiverBalanceBefore = recipientWallet.getBalance() != null 
                ? recipientWallet.getBalance() 
                : BigDecimal.ZERO;
        BigDecimal receiverBalanceAfter = receiverBalanceBefore.add(amount);

        recipientWallet.setBalance(receiverBalanceAfter);
        walletRepository.save(recipientWallet);

        String reference = "TXN-ALLOC-" + System.currentTimeMillis() + "-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase();

        WalletTransaction tx = new WalletTransaction();
        tx.setTransactionReference(reference);
        tx.setSourceWallet(null); // System injection
        tx.setTargetWallet(recipientWallet);
        tx.setInitiator(admin);
        tx.setRecipient(recipient);
        tx.setAmount(amount);
        tx.setCurrency(recipientWallet.getCurrency());
        tx.setTransactionType("ADMIN_CREDIT_ALLOCATION");
        tx.setStatus("SUCCESS");
        tx.setRazorpayOrderId(orderId);
        tx.setRazorpayPaymentId(paymentId != null && !paymentId.isBlank() ? paymentId : "pay_sim_" + System.currentTimeMillis());
        tx.setRazorpaySignature(signature);
        tx.setNotes(notes != null && !notes.isBlank() ? notes : "Admin allocation via Razorpay Test Simulation");
        tx.setSenderBalanceBefore(null);
        tx.setSenderBalanceAfter(null);
        tx.setReceiverBalanceBefore(receiverBalanceBefore);
        tx.setReceiverBalanceAfter(receiverBalanceAfter);

        WalletTransaction savedTx = walletTransactionRepository.save(tx);

        log.info("Admin [{}] credited ₹{} to {} [{}] (Bal: ₹{} -> ₹{}). Ref: {}",
                admin != null ? admin.getEmail() : "SYSTEM", amount, recipient.getEmail(), recipient.getRole(),
                receiverBalanceBefore, receiverBalanceAfter, reference);

        Map<String, Object> txMap = mapTransactionToMap(savedTx);

        // Push real-time Server-Sent Event (SSE) directly to recipient's live dashboard
        Map<String, Object> ssePayload = new HashMap<>();
        ssePayload.put("eventType", "ADMIN_CREDIT");
        ssePayload.put("type", "ADMIN_CREDIT_ALLOCATION");
        ssePayload.put("transactionId", savedTx.getId());
        ssePayload.put("transactionReference", reference);
        ssePayload.put("recipientId", recipient.getId());
        ssePayload.put("recipientEmail", recipient.getEmail());
        ssePayload.put("newBalance", receiverBalanceAfter);
        ssePayload.put("balance", receiverBalanceAfter);
        ssePayload.put("amount", amount);
        ssePayload.put("description", notes != null && !notes.isBlank() ? notes : "Admin credit allocation via Razorpay test mode");
        ssePayload.put("timestamp", java.time.Instant.now().toString());
        ssePayload.put("status", "SUCCESS");
        ssePayload.put("transaction", txMap);
        walletSseService.sendWalletUpdate(recipient.getId(), recipient.getEmail(), ssePayload);

        // Stream real-time update to live admin ledger
        walletSseService.broadcastToAdmins(Map.of(
                "type", "LEDGER_UPDATED",
                "transaction", txMap
        ));

        Map<String, Object> result = new HashMap<>();
        result.put("status", "SUCCESS");
        result.put("message", "Credits successfully allocated via Razorpay test mode simulation.");
        result.put("transactionReference", reference);
        result.put("recipientId", recipient.getId());
        result.put("recipientName", (recipient.getFirstName() != null ? recipient.getFirstName() : "") + " " + (recipient.getLastName() != null ? recipient.getLastName() : "").trim());
        result.put("recipientEmail", recipient.getEmail());
        result.put("creditedAmount", amount);
        result.put("previousBalance", receiverBalanceBefore);
        result.put("newBalance", receiverBalanceAfter);
        result.put("transaction", txMap);
        return result;
    }

    @Transactional(rollbackFor = Exception.class)
    public Map<String, Object> syncRecipientBalance(Long adminId, Long recipientId, BigDecimal targetBalance, String notes) {
        if (targetBalance == null || targetBalance.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("Target balance cannot be negative");
        }

        User recipient = recipientId != null ? userRepository.findById(recipientId).orElse(null) : null;
        if (recipient == null) {
            throw new IllegalArgumentException("Recipient not found with id: " + recipientId);
        }

        User admin = adminId != null ? userRepository.findById(adminId).orElse(null) : null;
        if (admin == null) {
            admin = userRepository.findByRole(Role.ADMIN).stream().findFirst().orElse(null);
        }

        Wallet wallet = getOrCreateWallet(recipient);
        BigDecimal currentBalance = wallet.getBalance() != null ? wallet.getBalance() : BigDecimal.ZERO;

        if (currentBalance.compareTo(targetBalance) != 0) {
            BigDecimal diff = targetBalance.subtract(currentBalance);
            wallet.setBalance(targetBalance);
            wallet = walletRepository.save(wallet);

            String reference = "TXN-SYNC-" + System.currentTimeMillis() + "-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase();
            WalletTransaction tx = new WalletTransaction();
            tx.setTransactionReference(reference);
            tx.setTargetWallet(wallet);
            tx.setInitiator(admin);
            tx.setRecipient(recipient);
            tx.setAmount(diff.abs());
            tx.setCurrency(wallet.getCurrency());
            tx.setTransactionType(diff.compareTo(BigDecimal.ZERO) > 0 ? "ADMIN_CREDIT_ALLOCATION" : "ADMIN_BALANCE_ADJUSTMENT");
            tx.setStatus("SUCCESS");
            tx.setRazorpayOrderId("sync_admin_" + System.currentTimeMillis());
            tx.setRazorpayPaymentId("pay_sync_" + System.currentTimeMillis());
            tx.setNotes(notes != null && !notes.isBlank() ? notes : "Admin direct balance synchronization to DB");
            tx.setReceiverBalanceBefore(currentBalance);
            tx.setReceiverBalanceAfter(targetBalance);
            WalletTransaction savedTx = walletTransactionRepository.save(tx);
            Map<String, Object> txMap = mapTransactionToMap(savedTx);

            // Push real-time Server-Sent Event (SSE) to recipient
            String eventType = diff.compareTo(BigDecimal.ZERO) >= 0 ? "ADMIN_CREDIT" : "ADMIN_DEBIT";
            Map<String, Object> ssePayload = new HashMap<>();
            ssePayload.put("eventType", eventType);
            ssePayload.put("type", tx.getTransactionType());
            ssePayload.put("transactionId", savedTx.getId());
            ssePayload.put("transactionReference", reference);
            ssePayload.put("recipientId", recipient.getId());
            ssePayload.put("recipientEmail", recipient.getEmail());
            ssePayload.put("newBalance", targetBalance);
            ssePayload.put("balance", targetBalance);
            ssePayload.put("amount", diff);
            ssePayload.put("description", tx.getNotes());
            ssePayload.put("timestamp", java.time.Instant.now().toString());
            ssePayload.put("status", "SUCCESS");
            ssePayload.put("transaction", txMap);
            walletSseService.sendWalletUpdate(recipient.getId(), recipient.getEmail(), ssePayload);

            walletSseService.broadcastToAdmins(Map.of(
                    "type", "LEDGER_UPDATED",
                    "transaction", txMap
            ));
        }

        Map<String, Object> res = new HashMap<>();
        res.put("status", "SUCCESS");
        res.put("recipientId", recipient.getId());
        res.put("email", recipient.getEmail());
        res.put("balance", wallet.getBalance());
        return res;
    }

    @Transactional(rollbackFor = Exception.class)
    public Map<String, Object> adminManualTopup(Long adminId, Long recipientId, BigDecimal amount, String notes) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Top-up amount must be strictly positive");
        }
        User recipient = userRepository.findById(recipientId)
                .orElseThrow(() -> new IllegalArgumentException("Recipient not found with id: " + recipientId));
        User admin = adminId != null ? userRepository.findById(adminId).orElse(null) : null;
        if (admin == null) {
            admin = userRepository.findByRole(Role.ADMIN).stream().findFirst().orElse(null);
        }

        Wallet wallet = getOrCreateWallet(recipient);
        BigDecimal before = wallet.getBalance() != null ? wallet.getBalance() : BigDecimal.ZERO;
        BigDecimal after = before.add(amount);
        wallet.setBalance(after);
        walletRepository.save(wallet);

        String reference = "TXN-TOPUP-" + System.currentTimeMillis() + "-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase();
        WalletTransaction tx = new WalletTransaction();
        tx.setTransactionReference(reference);
        tx.setTargetWallet(wallet);
        tx.setInitiator(admin);
        tx.setRecipient(recipient);
        tx.setAmount(amount);
        tx.setCurrency(wallet.getCurrency());
        tx.setTransactionType("ADMIN_MANUAL_TOPUP");
        tx.setStatus("SUCCESS");
        tx.setNotes(notes != null && !notes.isBlank() ? notes : "Administrator manual credit top-up");
        tx.setReceiverBalanceBefore(before);
        tx.setReceiverBalanceAfter(after);
        WalletTransaction savedTx = walletTransactionRepository.save(tx);
        Map<String, Object> txMap = mapTransactionToMap(savedTx);

        Map<String, Object> ssePayload = new HashMap<>();
        ssePayload.put("eventType", "ADMIN_CREDIT");
        ssePayload.put("type", "ADMIN_MANUAL_TOPUP");
        ssePayload.put("transactionId", savedTx.getId());
        ssePayload.put("transactionReference", reference);
        ssePayload.put("recipientId", recipient.getId());
        ssePayload.put("recipientEmail", recipient.getEmail());
        ssePayload.put("newBalance", after);
        ssePayload.put("balance", after);
        ssePayload.put("amount", amount);
        ssePayload.put("description", tx.getNotes());
        ssePayload.put("timestamp", java.time.Instant.now().toString());
        ssePayload.put("status", "SUCCESS");
        ssePayload.put("transaction", txMap);
        walletSseService.sendWalletUpdate(recipient.getId(), recipient.getEmail(), ssePayload);

        walletSseService.broadcastToAdmins(Map.of(
                "type", "LEDGER_UPDATED",
                "transaction", txMap
        ));

        Map<String, Object> res = new HashMap<>();
        res.put("status", "SUCCESS");
        res.put("transactionReference", reference);
        res.put("recipientId", recipient.getId());
        res.put("previousBalance", before);
        res.put("newBalance", after);
        res.put("transaction", txMap);
        return res;
    }

    @Transactional(rollbackFor = Exception.class)
    public Map<String, Object> adminAllocate(Long adminId, Long recipientId, BigDecimal amount, String notes) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Allocation amount must be strictly positive");
        }
        User recipient = userRepository.findById(recipientId)
                .orElseThrow(() -> new IllegalArgumentException("Recipient not found with id: " + recipientId));
        User admin = adminId != null ? userRepository.findById(adminId).orElse(null) : null;
        if (admin == null) {
            admin = userRepository.findByRole(Role.ADMIN).stream().findFirst().orElse(null);
        }

        // Concurrency control: Pessimistic write lock on target wallet
        Wallet wallet = getOrCreateWalletWithLock(recipient);
        BigDecimal before = wallet.getBalance() != null ? wallet.getBalance() : BigDecimal.ZERO;
        BigDecimal after = before.add(amount);
        wallet.setBalance(after);
        walletRepository.save(wallet);

        String reference = "TXN-ALLOC-" + System.currentTimeMillis() + "-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase();
        WalletTransaction tx = new WalletTransaction();
        tx.setTransactionReference(reference);
        tx.setTargetWallet(wallet);
        tx.setInitiator(admin);
        tx.setRecipient(recipient);
        tx.setAmount(amount);
        tx.setCurrency(wallet.getCurrency());
        tx.setTransactionType("admin_allocation");
        tx.setStatus("completed");
        tx.setNotes(notes != null && !notes.isBlank() ? notes : "Administrator allocation");
        tx.setReceiverBalanceBefore(before);
        tx.setReceiverBalanceAfter(after);
        WalletTransaction savedTx = walletTransactionRepository.save(tx);
        Map<String, Object> txMap = mapTransactionToMap(savedTx);

        // Immediate Server-Sent Event (SSE) dispatch
        Map<String, Object> ssePayload = new HashMap<>();
        ssePayload.put("eventType", "ADMIN_CREDIT");
        ssePayload.put("type", "admin_allocation");
        ssePayload.put("transactionType", "admin_allocation");
        ssePayload.put("transactionId", savedTx.getId());
        ssePayload.put("transactionReference", reference);
        ssePayload.put("recipientId", recipient.getId());
        ssePayload.put("recipientEmail", recipient.getEmail());
        ssePayload.put("newBalance", after);
        ssePayload.put("balance", after);
        ssePayload.put("amount", amount);
        ssePayload.put("description", tx.getNotes());
        ssePayload.put("message", String.format("Admin allocated ₹%.2f to your wallet", amount));
        ssePayload.put("timestamp", java.time.Instant.now().toString());
        ssePayload.put("status", "completed");
        ssePayload.put("transaction", txMap);
        walletSseService.sendWalletUpdate(recipient.getId(), recipient.getEmail(), ssePayload);

        walletSseService.broadcastToAdmins(Map.of(
                "type", "LEDGER_UPDATED",
                "transaction", txMap
        ));

        Map<String, Object> res = new HashMap<>();
        res.put("status", "completed");
        res.put("transactionReference", reference);
        res.put("recipientId", recipient.getId());
        res.put("previousBalance", before);
        res.put("newBalance", after);
        res.put("transaction", txMap);
        return res;
    }

    @Transactional(rollbackFor = Exception.class)
    public Map<String, Object> adminBonusCredit(Long adminId, Long recipientId, BigDecimal amount, String notes) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Bonus credit amount must be strictly positive");
        }
        User recipient = userRepository.findById(recipientId)
                .orElseThrow(() -> new IllegalArgumentException("Recipient not found with id: " + recipientId));
        User admin = adminId != null ? userRepository.findById(adminId).orElse(null) : null;
        if (admin == null) {
            admin = userRepository.findByRole(Role.ADMIN).stream().findFirst().orElse(null);
        }

        Wallet wallet = getOrCreateWallet(recipient);
        BigDecimal before = wallet.getBalance() != null ? wallet.getBalance() : BigDecimal.ZERO;
        BigDecimal after = before.add(amount);
        wallet.setBalance(after);
        walletRepository.save(wallet);

        String reference = "TXN-BONUS-" + System.currentTimeMillis() + "-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase();
        WalletTransaction tx = new WalletTransaction();
        tx.setTransactionReference(reference);
        tx.setTargetWallet(wallet);
        tx.setInitiator(admin);
        tx.setRecipient(recipient);
        tx.setAmount(amount);
        tx.setCurrency(wallet.getCurrency());
        tx.setTransactionType("BONUS_CREDIT");
        tx.setStatus("SUCCESS");
        tx.setNotes(notes != null && !notes.isBlank() ? notes : "Promotional or incentive bonus credit");
        tx.setReceiverBalanceBefore(before);
        tx.setReceiverBalanceAfter(after);
        WalletTransaction savedTx = walletTransactionRepository.save(tx);
        Map<String, Object> txMap = mapTransactionToMap(savedTx);

        Map<String, Object> ssePayload = new HashMap<>();
        ssePayload.put("eventType", "ADMIN_CREDIT");
        ssePayload.put("type", "BONUS_CREDIT");
        ssePayload.put("transactionId", savedTx.getId());
        ssePayload.put("transactionReference", reference);
        ssePayload.put("recipientId", recipient.getId());
        ssePayload.put("recipientEmail", recipient.getEmail());
        ssePayload.put("newBalance", after);
        ssePayload.put("balance", after);
        ssePayload.put("amount", amount);
        ssePayload.put("description", tx.getNotes());
        ssePayload.put("timestamp", java.time.Instant.now().toString());
        ssePayload.put("status", "SUCCESS");
        ssePayload.put("transaction", txMap);
        walletSseService.sendWalletUpdate(recipient.getId(), recipient.getEmail(), ssePayload);

        walletSseService.broadcastToAdmins(Map.of(
                "type", "LEDGER_UPDATED",
                "transaction", txMap
        ));

        Map<String, Object> res = new HashMap<>();
        res.put("status", "SUCCESS");
        res.put("transactionReference", reference);
        res.put("recipientId", recipient.getId());
        res.put("previousBalance", before);
        res.put("newBalance", after);
        res.put("transaction", txMap);
        return res;
    }

    @Transactional(rollbackFor = Exception.class)
    public Map<String, Object> adminPlatformDeduction(Long adminId, Long recipientId, BigDecimal amount, String notes) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Deduction amount must be strictly positive");
        }
        User recipient = userRepository.findById(recipientId)
                .orElseThrow(() -> new IllegalArgumentException("Recipient not found with id: " + recipientId));
        User admin = adminId != null ? userRepository.findById(adminId).orElse(null) : null;
        if (admin == null) {
            admin = userRepository.findByRole(Role.ADMIN).stream().findFirst().orElse(null);
        }

        Wallet wallet = getOrCreateWallet(recipient);
        BigDecimal before = wallet.getBalance() != null ? wallet.getBalance() : BigDecimal.ZERO;
        BigDecimal after = before.subtract(amount);
        if (after.compareTo(BigDecimal.ZERO) < 0) {
            after = BigDecimal.ZERO;
        }
        wallet.setBalance(after);
        walletRepository.save(wallet);

        String reference = "TXN-DEDUCT-" + System.currentTimeMillis() + "-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase();
        WalletTransaction tx = new WalletTransaction();
        tx.setTransactionReference(reference);
        tx.setTargetWallet(wallet);
        tx.setInitiator(admin);
        tx.setRecipient(recipient);
        tx.setAmount(amount);
        tx.setCurrency(wallet.getCurrency());
        tx.setTransactionType("PLATFORM_DEDUCTION");
        tx.setStatus("SUCCESS");
        tx.setNotes(notes != null && !notes.isBlank() ? notes : "Administrative fee or platform balance adjustment deduction");
        tx.setReceiverBalanceBefore(before);
        tx.setReceiverBalanceAfter(after);
        WalletTransaction savedTx = walletTransactionRepository.save(tx);
        Map<String, Object> txMap = mapTransactionToMap(savedTx);

        Map<String, Object> ssePayload = new HashMap<>();
        ssePayload.put("eventType", "ADMIN_DEBIT");
        ssePayload.put("type", "PLATFORM_DEDUCTION");
        ssePayload.put("transactionId", savedTx.getId());
        ssePayload.put("transactionReference", reference);
        ssePayload.put("recipientId", recipient.getId());
        ssePayload.put("recipientEmail", recipient.getEmail());
        ssePayload.put("newBalance", after);
        ssePayload.put("balance", after);
        ssePayload.put("amount", amount.negate());
        ssePayload.put("description", tx.getNotes());
        ssePayload.put("timestamp", java.time.Instant.now().toString());
        ssePayload.put("status", "SUCCESS");
        ssePayload.put("transaction", txMap);
        walletSseService.sendWalletUpdate(recipient.getId(), recipient.getEmail(), ssePayload);

        walletSseService.broadcastToAdmins(Map.of(
                "type", "LEDGER_UPDATED",
                "transaction", txMap
        ));

        Map<String, Object> res = new HashMap<>();
        res.put("status", "SUCCESS");
        res.put("transactionReference", reference);
        res.put("recipientId", recipient.getId());
        res.put("previousBalance", before);
        res.put("newBalance", after);
        res.put("transaction", txMap);
        return res;
    }

    @Transactional(rollbackFor = Exception.class)
    public Map<String, Object> recordFailedOrCancelledTransaction(
            Long adminId,
            Long recipientId,
            BigDecimal amount,
            String status,
            String reason,
            String orderId,
            String paymentId) {

        User admin = adminId != null ? userRepository.findById(adminId).orElse(null) : null;
        if (admin == null) {
            admin = userRepository.findByRole(Role.ADMIN).stream().findFirst().orElse(null);
        }

        User recipient = recipientId != null ? userRepository.findById(recipientId).orElse(null) : null;
        Wallet targetWallet = recipient != null ? getOrCreateWallet(recipient) : null;

        String prefix = "CANCELLED".equalsIgnoreCase(status) ? "TXN-CANCEL-" : "TXN-FAIL-";
        String reference = prefix + System.currentTimeMillis() + "-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase();

        WalletTransaction tx = new WalletTransaction();
        tx.setTransactionReference(reference);
        tx.setSourceWallet(null);
        tx.setTargetWallet(targetWallet);
        tx.setInitiator(admin);
        tx.setRecipient(recipient);
        tx.setAmount(amount != null ? amount : BigDecimal.ZERO);
        tx.setCurrency(targetWallet != null ? targetWallet.getCurrency() : "INR");
        tx.setTransactionType("ADMIN_CREDIT_ALLOCATION");
        tx.setStatus("CANCELLED".equalsIgnoreCase(status) ? "CANCELLED" : "FAILED");
        tx.setRazorpayOrderId(orderId);
        tx.setRazorpayPaymentId(paymentId);
        tx.setNotes(reason != null && !reason.isBlank() ? reason : ("Transaction marked as " + status));
        tx.setSenderBalanceBefore(null);
        tx.setSenderBalanceAfter(null);
        BigDecimal currentBal = targetWallet != null ? (targetWallet.getBalance() != null ? targetWallet.getBalance() : BigDecimal.ZERO) : BigDecimal.ZERO;
        tx.setReceiverBalanceBefore(currentBal);
        tx.setReceiverBalanceAfter(currentBal);

        WalletTransaction savedTx = walletTransactionRepository.save(tx);
        Map<String, Object> txMap = mapTransactionToMap(savedTx);

        // Stream failed/cancelled record to live admin ledger via SSE
        walletSseService.broadcastToAdmins(Map.of(
                "type", "LEDGER_UPDATED",
                "transaction", txMap
        ));

        return txMap;
    }

    /**
     * Checkout Balance Validation & Precise Deduction ("Low Balance" Guard)
     */
    @Transactional(rollbackFor = Exception.class)
    public Map<String, Object> transferForServicePayment(
            Long senderUserId,
            Long recipientNutritionistId,
            BigDecimal servicePrice,
            String serviceName,
            Long appointmentId) {

        if (servicePrice == null || servicePrice.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Service price must be strictly positive.");
        }

        User sender = userRepository.findById(senderUserId)
                .orElseThrow(() -> new RuntimeException("Sender user not found: " + senderUserId));

        User nutritionist = userRepository.findById(recipientNutritionistId)
                .orElseThrow(() -> new RuntimeException("Nutritionist recipient not found: " + recipientNutritionistId));

        Wallet senderWallet = getOrCreateWalletWithLock(sender);
        Wallet nutritionistWallet = getOrCreateWalletWithLock(nutritionist);

        BigDecimal currentBalance = senderWallet.getBalance();

        // 1. "Low Balance" Guard Check:
        if (currentBalance.compareTo(servicePrice) < 0) {
            BigDecimal deficit = servicePrice.subtract(currentBalance);
            String failRef = "TXN-LOWBAL-" + System.currentTimeMillis() + "-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase();

            // Record blocked transaction in audit ledger
            WalletTransaction blockedTx = new WalletTransaction();
            blockedTx.setTransactionReference(failRef);
            blockedTx.setSourceWallet(senderWallet);
            blockedTx.setTargetWallet(nutritionistWallet);
            blockedTx.setInitiator(sender);
            blockedTx.setRecipient(nutritionist);
            blockedTx.setAmount(servicePrice);
            blockedTx.setCurrency(senderWallet.getCurrency());
            blockedTx.setTransactionType("SERVICE_PAYMENT");
            blockedTx.setStatus("LOW_BALANCE");
            blockedTx.setNotes(String.format("Blocked by Low Balance Guard: '%s' requires ₹%.2f but available balance is ₹%.2f (Deficit: ₹%.2f)",
                    serviceName, servicePrice, currentBalance, deficit));
            blockedTx.setSenderBalanceBefore(currentBalance);
            blockedTx.setSenderBalanceAfter(currentBalance);
            blockedTx.setReceiverBalanceBefore(nutritionistWallet.getBalance());
            blockedTx.setReceiverBalanceAfter(nutritionistWallet.getBalance());
            walletTransactionRepository.save(blockedTx);

            log.warn("LOW_BALANCE Guard blocked payment by User [{}] for '{}'. Available: ₹{}, Required: ₹{}",
                    sender.getEmail(), serviceName, currentBalance, servicePrice);

            Map<String, Object> lowBalanceResult = new HashMap<>();
            lowBalanceResult.put("status", "LOW_BALANCE");
            lowBalanceResult.put("message", String.format("Insufficient wallet balance. You have ₹%.2f but ₹%.2f is required.", currentBalance, servicePrice));
            lowBalanceResult.put("currentBalance", currentBalance);
            lowBalanceResult.put("requiredAmount", servicePrice);
            lowBalanceResult.put("deficit", deficit);
            lowBalanceResult.put("serviceName", serviceName);
            lowBalanceResult.put("transactionReference", failRef);
            return lowBalanceResult;
        }

        // 2. Atomic Transfer:
        BigDecimal senderBalanceBefore = currentBalance;
        BigDecimal senderBalanceAfter = senderBalanceBefore.subtract(servicePrice);
        senderWallet.setBalance(senderBalanceAfter);

        BigDecimal receiverBalanceBefore = nutritionistWallet.getBalance();
        BigDecimal receiverBalanceAfter = receiverBalanceBefore.add(servicePrice);
        nutritionistWallet.setBalance(receiverBalanceAfter);

        walletRepository.save(senderWallet);
        walletRepository.save(nutritionistWallet);

        String successRef = "TXN-PAY-" + System.currentTimeMillis() + "-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase();

        WalletTransaction successTx = new WalletTransaction();
        successTx.setTransactionReference(successRef);
        successTx.setSourceWallet(senderWallet);
        successTx.setTargetWallet(nutritionistWallet);
        successTx.setInitiator(sender);
        successTx.setRecipient(nutritionist);
        successTx.setAmount(servicePrice);
        successTx.setCurrency(senderWallet.getCurrency());
        successTx.setTransactionType("SERVICE_PAYMENT");
        successTx.setStatus("SUCCESS");
        successTx.setNotes(String.format("Payment for service: %s%s",
                serviceName, appointmentId != null ? " (Appointment #" + appointmentId + ")" : ""));
        successTx.setSenderBalanceBefore(senderBalanceBefore);
        successTx.setSenderBalanceAfter(senderBalanceAfter);
        successTx.setReceiverBalanceBefore(receiverBalanceBefore);
        successTx.setReceiverBalanceAfter(receiverBalanceAfter);

        WalletTransaction savedTx = walletTransactionRepository.save(successTx);

        log.info("SUCCESS: Transferred ₹{} from User [{}] (₹{} -> ₹{}) to Nutritionist [{}] (₹{} -> ₹{}). Ref: {}",
                servicePrice, sender.getEmail(), senderBalanceBefore, senderBalanceAfter,
                nutritionist.getEmail(), receiverBalanceBefore, receiverBalanceAfter, successRef);

        Map<String, Object> txMap = mapTransactionToMap(savedTx);

        // Push real-time SSE update to sender user
        Map<String, Object> senderPayload = new HashMap<>();
        senderPayload.put("eventType", "ADMIN_DEBIT");
        senderPayload.put("type", "SERVICE_PAYMENT");
        senderPayload.put("transactionId", savedTx.getId());
        senderPayload.put("transactionReference", successRef);
        senderPayload.put("recipientId", sender.getId());
        senderPayload.put("recipientEmail", sender.getEmail());
        senderPayload.put("newBalance", senderBalanceAfter);
        senderPayload.put("balance", senderBalanceAfter);
        senderPayload.put("amount", servicePrice.negate());
        senderPayload.put("description", successTx.getNotes());
        senderPayload.put("timestamp", java.time.Instant.now().toString());
        senderPayload.put("status", "SUCCESS");
        senderPayload.put("transaction", txMap);
        walletSseService.sendWalletUpdate(sender.getId(), sender.getEmail(), senderPayload);

        // Push real-time SSE update to recipient nutritionist
        Map<String, Object> nutriPayload = new HashMap<>();
        nutriPayload.put("eventType", "ADMIN_CREDIT");
        nutriPayload.put("type", "SERVICE_PAYMENT");
        nutriPayload.put("transactionId", savedTx.getId());
        nutriPayload.put("transactionReference", successRef);
        nutriPayload.put("recipientId", nutritionist.getId());
        nutriPayload.put("recipientEmail", nutritionist.getEmail());
        nutriPayload.put("newBalance", receiverBalanceAfter);
        nutriPayload.put("balance", receiverBalanceAfter);
        nutriPayload.put("amount", servicePrice);
        nutriPayload.put("description", successTx.getNotes());
        nutriPayload.put("timestamp", java.time.Instant.now().toString());
        nutriPayload.put("status", "SUCCESS");
        nutriPayload.put("transaction", txMap);
        walletSseService.sendWalletUpdate(nutritionist.getId(), nutritionist.getEmail(), nutriPayload);

        // Stream to admin ledger
        walletSseService.broadcastToAdmins(Map.of(
                "type", "LEDGER_UPDATED",
                "transaction", txMap
        ));

        Map<String, Object> successResult = new HashMap<>();
        successResult.put("status", "SUCCESS");
        successResult.put("message", "Service payment completed successfully.");
        successResult.put("transactionReference", successRef);
        successResult.put("servicePrice", servicePrice);
        successResult.put("senderBalanceBefore", senderBalanceBefore);
        successResult.put("senderBalanceAfter", senderBalanceAfter);
        successResult.put("receiverBalanceBefore", receiverBalanceBefore);
        successResult.put("receiverBalanceAfter", receiverBalanceAfter);
        successResult.put("serviceName", serviceName);
        successResult.put("transaction", txMap);
        return successResult;
    }

    public List<Map<String, Object>> getAllTransactionsLedger() {
        return walletTransactionRepository.findAllByOrderByCreatedAtDesc()
                .stream()
                .map(this::mapTransactionToMap)
                .collect(Collectors.toList());
    }

    private Map<String, Object> mapTransactionToMap(WalletTransaction tx) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", tx.getId());
        map.put("appointmentId", tx.getAppointmentId());
        map.put("transactionReference", tx.getTransactionReference());
        map.put("amount", tx.getAmount());
        map.put("currency", tx.getCurrency());
        map.put("transactionType", tx.getTransactionType());
        map.put("status", tx.getStatus());
        map.put("notes", tx.getNotes());
        map.put("razorpayOrderId", tx.getRazorpayOrderId());
        map.put("razorpayPaymentId", tx.getRazorpayPaymentId());
        map.put("senderBalanceBefore", tx.getSenderBalanceBefore());
        map.put("senderBalanceAfter", tx.getSenderBalanceAfter());
        map.put("receiverBalanceBefore", tx.getReceiverBalanceBefore());
        map.put("receiverBalanceAfter", tx.getReceiverBalanceAfter());
        map.put("createdAt", tx.getCreatedAt());
        map.put("created_at", tx.getCreatedAt());
        map.put("type", tx.getTransactionType());
        map.put("related_booking_id", tx.getAppointmentId());
        map.put("relatedBookingId", tx.getAppointmentId());
        map.put("sender_id", tx.getInitiator() != null ? tx.getInitiator().getId() : null);
        map.put("senderId", tx.getInitiator() != null ? tx.getInitiator().getId() : null);
        map.put("receiver_id", tx.getRecipient() != null ? tx.getRecipient().getId() : null);
        map.put("receiverId", tx.getRecipient() != null ? tx.getRecipient().getId() : null);

        if (tx.getInitiator() != null) {
            Map<String, Object> initMap = new HashMap<>();
            initMap.put("id", tx.getInitiator().getId());
            initMap.put("name", (tx.getInitiator().getFirstName() != null ? tx.getInitiator().getFirstName() : "") + " " + (tx.getInitiator().getLastName() != null ? tx.getInitiator().getLastName() : "").trim());
            initMap.put("email", tx.getInitiator().getEmail());
            initMap.put("role", tx.getInitiator().getRole() != null ? tx.getInitiator().getRole().name() : "USER");
            map.put("initiator", initMap);
        }

        if (tx.getRecipient() != null) {
            Map<String, Object> recMap = new HashMap<>();
            recMap.put("id", tx.getRecipient().getId());
            recMap.put("name", (tx.getRecipient().getFirstName() != null ? tx.getRecipient().getFirstName() : "") + " " + (tx.getRecipient().getLastName() != null ? tx.getRecipient().getLastName() : "").trim());
            recMap.put("email", tx.getRecipient().getEmail());
            recMap.put("role", tx.getRecipient().getRole() != null ? tx.getRecipient().getRole().name() : "USER");
            map.put("recipient", recMap);
        }

        return map;
    }
}
