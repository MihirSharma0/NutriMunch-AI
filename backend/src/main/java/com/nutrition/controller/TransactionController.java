package com.nutrition.controller;

import com.nutrition.entity.Role;
import com.nutrition.security.CustomUserDetails;
import com.nutrition.service.WalletService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Financial Transaction Ledger Controller.
Exposes endpoints for querying double-entry wallet transactions and consultation audit logs.
 */
@RestController
@RequestMapping("/api/transactions")
@RequiredArgsConstructor
public class TransactionController {

    private final WalletService walletService;

    /**
     * STEP 4: Transaction History API (GET /api/transactions)
     * Fetches all ledger records tied to the authenticated user/nutritionist/admin.
     */
    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getTransactions(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam(value = "userId", required = false) Long queryUserId) {

        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        Role role = userDetails.getUser().getRole();
        Long myId = userDetails.getId();

        // Admin can optionally query all or query a specific user
        if (role == Role.ADMIN) {
            if (queryUserId != null) {
                return ResponseEntity.ok(walletService.getUserTransactionHistory(queryUserId));
            }
            return ResponseEntity.ok(walletService.getAllTransactionsLedger());
        }

        // Standard user or nutritionist: always scope strictly to self
        return ResponseEntity.ok(walletService.getUserTransactionHistory(myId));
    }
}
