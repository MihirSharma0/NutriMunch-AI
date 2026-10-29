package com.nutrition.repository;

import com.nutrition.entity.WalletTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

/**
 * Spring Data JPA Repository for WalletTransaction entities.
Manages double-entry audit ledgers, escrow holds, and transaction history.
 */
public interface WalletTransactionRepository extends JpaRepository<WalletTransaction, Long> {
    /**
     * Executes query to find by transaction reference.
     */
    Optional<WalletTransaction> findByTransactionReference(String transactionReference);
    /**
     * Executes query to find all by order by created at desc.
     */
    List<WalletTransaction> findAllByOrderByCreatedAtDesc();
    /**
     * Executes query to find by initiator id or recipient id order by created at desc.
     */
    List<WalletTransaction> findByInitiatorIdOrRecipientIdOrderByCreatedAtDesc(Long initiatorId, Long recipientId);
    /**
     * Executes query to delete by initiator id or recipient id.
     */
    void deleteByInitiatorIdOrRecipientId(Long initiatorId, Long recipientId);
    /**
     * Executes query to delete by source wallet user id or target wallet user id.
     */
    void deleteBySourceWallet_User_IdOrTargetWallet_User_Id(Long sourceUserId, Long targetUserId);
}
