package com.nutrition.repository;

import com.nutrition.entity.ProgressLog;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * Spring Data JPA Repository for ProgressLog entities.
Manages daily user biometric, fluid intake, and macronutrient tracking records.
 */
public interface ProgressLogRepository extends JpaRepository<ProgressLog, Long> {
    /**
     * Executes query to find by user id order by log date desc.
     */
    List<ProgressLog> findByUserIdOrderByLogDateDesc(Long userId);
    /**
     * Executes query to find by user id and log date.
     */
    Optional<ProgressLog> findByUserIdAndLogDate(Long userId, LocalDate logDate);
    /**
     * Executes query to delete by user id.
     */
    void deleteByUserId(Long userId);
}
