package com.nutrition.controller;

import com.nutrition.dto.ProgressLogDto;
import com.nutrition.security.CustomUserDetails;
import com.nutrition.service.ProgressLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.util.List;

/**
 * Biometric Progress Logging Controller.
Handles daily fluid intake tracking, weight progression logs, and manual meal nutrition records.
 */
@RestController
@RequestMapping("/api/progress")
@RequiredArgsConstructor
public class ProgressLogController {

    private final ProgressLogService progressLogService;

    /**
     * Handles request to get my logs.
     */
    @GetMapping("/me")
    public ResponseEntity<List<ProgressLogDto>> getMyLogs(@AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(progressLogService.getMyLogs(userDetails.getId()));
    }

    /**
     * Handles request to save log.
     */
    @PostMapping("/me")
    public ResponseEntity<ProgressLogDto> saveLog(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestBody ProgressLogDto dto) {
        return ResponseEntity.ok(progressLogService.saveLog(userDetails.getId(), dto));
    }
}
