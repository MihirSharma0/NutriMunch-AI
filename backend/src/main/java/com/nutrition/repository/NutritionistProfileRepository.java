package com.nutrition.repository;

import com.nutrition.entity.NutritionistProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * Spring Data JPA Repository for NutritionistProfile entities.
Manages clinical licensing records, professional bios, and nutritionist profiles.
 */
@Repository
public interface NutritionistProfileRepository extends JpaRepository<NutritionistProfile, Long> {
    /**
     * Executes query to find by user id.
     */
    Optional<NutritionistProfile> findByUserId(Long userId);
}
