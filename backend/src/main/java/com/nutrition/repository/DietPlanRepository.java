package com.nutrition.repository;

import com.nutrition.entity.DietPlan;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.time.LocalDate;
import java.util.Optional;

/**
 * Spring Data JPA Repository for DietPlan entities.
Manages persistence and retrieval of structured 7-day meal plans for clients.
 */
public interface DietPlanRepository extends JpaRepository<DietPlan, Long> {
    /**
     * Executes query to find by user id order by generated date desc.
     */
    List<DietPlan> findByUserIdOrderByGeneratedDateDesc(Long userId);
    /**
     * Executes query to find first by user id order by generated date desc.
     */
    Optional<DietPlan> findFirstByUserIdOrderByGeneratedDateDesc(Long userId);
    /**
     * Executes query to find by user id and generated date.
     */
    Optional<DietPlan> findByUserIdAndGeneratedDate(Long userId, LocalDate generatedDate);
    /**
     * Executes query to delete by user id.
     */
    void deleteByUserId(Long userId);
}
