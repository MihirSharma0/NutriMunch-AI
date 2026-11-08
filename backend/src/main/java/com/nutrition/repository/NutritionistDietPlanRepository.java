package com.nutrition.repository;

import com.nutrition.entity.NutritionistDietPlan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

/**
 * Repository for nutritionist-published diet plans.
 *
 * Visibility is decided here, in the database, rather than in the browser:
 * a client only ever receives general plans plus exclusive plans addressed to them.
 */
public interface NutritionistDietPlanRepository extends JpaRepository<NutritionistDietPlan, Long> {

    @Query("SELECT p FROM NutritionistDietPlan p " +
           "WHERE p.deleted = false AND (p.scope = 'GENERAL' " +
           "OR (p.scope = 'EXCLUSIVE' AND p.targetUser.id = :userId)) " +
           "ORDER BY p.createdAt DESC")
    List<NutritionistDietPlan> findVisibleForUser(@Param("userId") Long userId);

    @Query("SELECT p FROM NutritionistDietPlan p " +
           "WHERE p.deleted = false AND p.scope = 'GENERAL' " +
           "ORDER BY p.createdAt DESC")
    List<NutritionistDietPlan> findActiveGeneral();

    List<NutritionistDietPlan> findByDeletedFalseAndNutritionistIdOrderByCreatedAtDesc(Long nutritionistId);

    List<NutritionistDietPlan> findByDeletedFalseOrderByCreatedAtDesc();

    Optional<NutritionistDietPlan> findByPlanKey(String planKey);

    Optional<NutritionistDietPlan> findByPlanKeyAndDeletedFalse(String planKey);

    /** Exact lookup of server-namespaced keys created by COMMIT 09. */
    List<NutritionistDietPlan> findByPlanKeyIn(Collection<String> planKeys);
}
