package com.nutrition.repository;

import com.nutrition.entity.ProgressLog;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface ProgressLogRepository extends JpaRepository<ProgressLog, Long> {
    List<ProgressLog> findByUserIdOrderByLogDateDesc(Long userId);
    Optional<ProgressLog> findByUserIdAndLogDate(Long userId, LocalDate logDate);
    void deleteByUserId(Long userId);
}
