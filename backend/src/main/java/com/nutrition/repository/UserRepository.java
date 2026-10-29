package com.nutrition.repository;

import com.nutrition.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * Spring Data JPA Repository for User entities.
Manages user authentication credentials, email lookups, and role-based listings.
 */
@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    /**
     * Executes query to find by email.
     */
    Optional<User> findByEmail(String email);
    /**
     * Executes query to exists by email.
     */
    boolean existsByEmail(String email);
    /**
     * Executes query to find by role.
     */
    java.util.List<User> findByRole(com.nutrition.entity.Role role);
}
