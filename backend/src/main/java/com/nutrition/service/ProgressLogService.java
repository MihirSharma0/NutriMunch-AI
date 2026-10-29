package com.nutrition.service;

import com.nutrition.dto.ProgressLogDto;
import com.nutrition.entity.ProgressLog;
import com.nutrition.entity.User;
import com.nutrition.repository.ProgressLogRepository;
import com.nutrition.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Biometric Progress Logging Service.
Manages user daily fluid intake logs, body weight milestones, and consumed calorie records.
 */
@Service
@RequiredArgsConstructor
public class ProgressLogService {

    private final ProgressLogRepository progressLogRepository;
    private final UserRepository userRepository;

    /**
     * Executes get my logs operation.
     */
    public List<ProgressLogDto> getMyLogs(Long userId) {
        return progressLogRepository.findByUserIdOrderByLogDateDesc(userId)
            .stream()
            .map(this::mapToDto)
            .collect(Collectors.toList());
    }

    /**
     * Executes save log operation.
     */
    public ProgressLogDto saveLog(Long userId, ProgressLogDto dto) {
        ProgressLog log = progressLogRepository.findByUserIdAndLogDate(userId, dto.getLogDate())
            .orElseGet(ProgressLog::new);

        if (log.getId() == null) {
            User user = userRepository.findById(userId).orElseThrow();
            log.setUser(user);
            log.setLogDate(dto.getLogDate());
        }

        log.setWeightKg(dto.getWeightKg());
        log.setSleepScore(dto.getSleepScore());
        log.setHrvScore(dto.getHrvScore());
        log.setCaloriesConsumed(dto.getCaloriesConsumed());
        log.setNotes(dto.getNotes());

        return mapToDto(progressLogRepository.save(log));
    }

    /**
     * Executes map to dto operation.
     */
    private ProgressLogDto mapToDto(ProgressLog log) {
        ProgressLogDto dto = new ProgressLogDto();
        dto.setId(log.getId());
        dto.setUserId(log.getUser().getId());
        dto.setLogDate(log.getLogDate());
        dto.setWeightKg(log.getWeightKg());
        dto.setSleepScore(log.getSleepScore());
        dto.setHrvScore(log.getHrvScore());
        dto.setCaloriesConsumed(log.getCaloriesConsumed());
        dto.setNotes(log.getNotes());
        return dto;
    }
}
