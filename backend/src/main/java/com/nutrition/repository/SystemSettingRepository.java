package com.nutrition.repository;

import com.nutrition.entity.SystemSetting;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * Spring Data JPA Repository for SystemSetting entities.
Manages dynamic platform configuration settings and key-value platform parameters.
 */
@Repository
public interface SystemSettingRepository extends JpaRepository<SystemSetting, Long> {
    /**
     * Executes query to find by setting key.
     */
    Optional<SystemSetting> findBySettingKey(String settingKey);
}
