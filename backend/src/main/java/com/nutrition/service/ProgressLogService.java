package com.nutrition.service;

import com.nutrition.dto.ProgressLogDto;
import com.nutrition.entity.ProgressLog;
import com.nutrition.entity.User;
import com.nutrition.repository.ProgressLogRepository;
import com.nutrition.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
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
     * Upserts one day's progress with MERGE semantics: only fields actually
     * supplied are written, so a water-only post cannot wipe the day's calories
     * or macros (and vice versa). A value of 0 is an explicit reset.
     */
    @Transactional
    public ProgressLogDto saveLog(Long userId, ProgressLogDto dto) {
        LocalDate date = dto.getLogDate();
        if (date == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "logDate is required");
        }
        if (date.isAfter(LocalDate.now().plusDays(1))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "logDate cannot be in the future");
        }

        ProgressLog log = progressLogRepository.findByUserIdAndLogDate(userId, date)
            .orElseGet(ProgressLog::new);

        if (log.getId() == null) {
            User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
            log.setUser(user);
            log.setLogDate(date);
            // Never return nulls for the five criteria on a fresh row.
            log.setCaloriesConsumed(0);
            log.setWaterConsumedMl(0);
            log.setProteinG(0.0);
            log.setCarbsG(0.0);
            log.setFatsG(0.0);
        }

        if (dto.getWeightKg() != null) log.setWeightKg(dto.getWeightKg());
        if (dto.getSleepScore() != null) log.setSleepScore(dto.getSleepScore());
        if (dto.getHrvScore() != null) log.setHrvScore(dto.getHrvScore());
        if (dto.getCaloriesConsumed() != null) log.setCaloriesConsumed(dto.getCaloriesConsumed());
        if (dto.getWaterConsumedMl() != null) log.setWaterConsumedMl(dto.getWaterConsumedMl());
        if (dto.getProteinG() != null) log.setProteinG(dto.getProteinG());
        if (dto.getCarbsG() != null) log.setCarbsG(dto.getCarbsG());
        if (dto.getFatsG() != null) log.setFatsG(dto.getFatsG());
        if (dto.getNotes() != null) log.setNotes(dto.getNotes());

        return mapToDto(progressLogRepository.save(log));
    }

    /**
     * Executes map to dto operation.
     */
    private ProgressLogDto mapToDto(ProgressLog log) {
        ProgressLogDto dto = new ProgressLogDto();
        dto.setId(log.getId());
        dto.setLogDate(log.getLogDate());
        dto.setWeightKg(log.getWeightKg());
        dto.setSleepScore(log.getSleepScore());
        dto.setHrvScore(log.getHrvScore());
        dto.setCaloriesConsumed(log.getCaloriesConsumed());
        dto.setWaterConsumedMl(log.getWaterConsumedMl());
        dto.setProteinG(log.getProteinG());
        dto.setCarbsG(log.getCarbsG());
        dto.setFatsG(log.getFatsG());
        dto.setNotes(log.getNotes());
        return dto;
    }
}
