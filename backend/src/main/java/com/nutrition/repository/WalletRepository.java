package com.nutrition.repository;

import com.nutrition.entity.User;
import com.nutrition.entity.Wallet;
import org.springframework.data.jpa.repository.JpaRepository;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.Optional;

/**
 * Spring Data JPA Repository for Wallet entities.
Manages digital credit balances and pessimistic locking for financial transactions.
 */
public interface WalletRepository extends JpaRepository<Wallet, Long> {
    /**
     * Executes query to find by user id.
     */
    Optional<Wallet> findByUserId(Long userId);
    /**
     * Executes query to find by user.
     */
    Optional<Wallet> findByUser(User user);
    /**
     * Executes query to delete by user id.
     */
    void deleteByUserId(Long userId);

    /**
     * Executes query to find by user id with lock.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT w FROM Wallet w WHERE w.user.id = :userId")
    Optional<Wallet> findByUserIdWithLock(@Param("userId") Long userId);

    /**
     * Executes query to find by id with lock.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT w FROM Wallet w WHERE w.id = :id")
    Optional<Wallet> findByIdWithLock(@Param("id") Long id);
}
