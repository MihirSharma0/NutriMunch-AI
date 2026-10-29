package com.nutrition.dto;

import lombok.Data;
import java.time.LocalDate;

/**
 * Data Transfer Object for recording or exporting daily user biometric progress logs.
 * Encapsulates date, weight, fluid intake, and macro consumption.
 */
@Data
public class ProgressLogDto {
    private Long id;
    private Long userId;
    private LocalDate logDate;
    private Double weightKg;
    private Integer sleepScore;
    private Integer hrvScore;
    private Integer caloriesConsumed;
    private String notes;
}
