package com.nutrition.repository;

import com.nutrition.entity.NutritionRule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * Spring Data JPA Repository for NutritionRule entities.
Manages dietary constraint rules and nutritional guidelines for the recommendation engine.
 */
@Repository
public interface NutritionRuleRepository extends JpaRepository<NutritionRule, Long> {
    /**
     * Executes query to find by rule key.
     */
    Optional<NutritionRule> findByRuleKey(String ruleKey);
}
