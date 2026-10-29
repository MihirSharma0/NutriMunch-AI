package com.nutrition.repository;

import com.nutrition.entity.PasswordResetToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * Spring Data JPA Repository for PasswordResetToken entities.
Manages time-limited security tokens for account password recovery.
 */
@Repository
public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, Long> {
    /**
     * Executes query to find by token.
     */
    Optional<PasswordResetToken> findByToken(String token);
    /**
     * Executes query to delete by user id.
     */
    void deleteByUser_Id(Long userId);
}
