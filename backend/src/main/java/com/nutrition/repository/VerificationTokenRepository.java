package com.nutrition.repository;

import com.nutrition.entity.VerificationToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * Spring Data JPA Repository for VerificationToken entities.
Manages email registration verification tokens.
 */
@Repository
public interface VerificationTokenRepository extends JpaRepository<VerificationToken, Long> {
    /**
     * Executes query to find by token.
     */
    Optional<VerificationToken> findByToken(String token);
    /**
     * Executes query to delete by user id.
     */
    void deleteByUser_Id(Long userId);
}
