package com.nutrition.repository;

import com.nutrition.entity.WalletTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface WalletTransactionRepository extends JpaRepository<WalletTransaction, Long> {
    Optional<WalletTransaction> findByTransactionReference(String transactionReference);
    List<WalletTransaction> findAllByOrderByCreatedAtDesc();
    List<WalletTransaction> findByInitiatorIdOrRecipientIdOrderByCreatedAtDesc(Long initiatorId, Long recipientId);
    void deleteByInitiatorIdOrRecipientId(Long initiatorId, Long recipientId);
    void deleteBySourceWallet_User_IdOrTargetWallet_User_Id(Long sourceUserId, Long targetUserId);
}
