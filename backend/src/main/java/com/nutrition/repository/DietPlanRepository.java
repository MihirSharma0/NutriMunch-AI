package com.nutrition.repository;

import com.nutrition.entity.DietPlan;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.time.LocalDate;
import java.util.Optional;

public interface DietPlanRepository extends JpaRepository<DietPlan, Long> {
    List<DietPlan> findByUserIdOrderByGeneratedDateDesc(Long userId);
    Optional<DietPlan> findFirstByUserIdOrderByGeneratedDateDesc(Long userId);
    Optional<DietPlan> findByUserIdAndGeneratedDate(Long userId, LocalDate generatedDate);
    void deleteByUserId(Long userId);
}
