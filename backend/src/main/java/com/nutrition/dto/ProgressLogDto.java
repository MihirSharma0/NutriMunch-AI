package com.nutrition.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;
import java.time.LocalDate;

/**
 * Data Transfer Object for recording or exporting daily user biometric progress logs.
 * Encapsulates date, weight, fluid intake, and macro consumption.
 */
@Data
public class ProgressLogDto {
    private Long id;

    // No userId field: the owner is always derived from the authenticated
    // principal, never from a request body.
    @NotNull(message = "logDate is required")
    private LocalDate logDate;

    private Double weightKg;
    private Integer sleepScore;
    private Integer hrvScore;

    // The five daily nutrition criteria. Null means "leave this field unchanged"
    // (merge semantics); 0 explicitly resets it. Bounds stop absurd payloads.
    @Min(0) @Max(100000)
    private Integer caloriesConsumed;

    @Min(0) @Max(2000000)
    private Integer waterConsumedMl;

    @DecimalMin("0") @DecimalMax("100000")
    private Double proteinG;

    @DecimalMin("0") @DecimalMax("100000")
    private Double carbsG;

    @DecimalMin("0") @DecimalMax("100000")
    private Double fatsG;

    @Size(max = 2000)
    private String notes;
}
