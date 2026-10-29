package com.nutrition.repository;

import com.nutrition.entity.UserProfile;
import com.nutrition.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

/**
 * Spring Data JPA Repository for UserProfile entities.
Manages patient demographic profiles, biometrics, dietary restrictions, and water intake targets.
 */
public interface UserProfileRepository extends JpaRepository<UserProfile, Long> {
    /**
     * Executes query to find by user.
     */
    Optional<UserProfile> findByUser(User user);
    /**
     * Executes query to find by user id.
     */
    Optional<UserProfile> findByUserId(Long userId);
}
