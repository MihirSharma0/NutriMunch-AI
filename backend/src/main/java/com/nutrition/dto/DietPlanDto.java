package com.nutrition.dto;

import lombok.Data;
import java.time.LocalDate;

/**
 * Data Transfer Object for structured 7-day diet plans.
 * Encapsulates daily meals, macro targets (protein, carbs, fats), and scope (general vs exclusive).
 */
@Data
public class DietPlanDto {
    private Long id;
    private Long userId;
    private LocalDate generatedDate;
    private Integer totalCalories;
    private Integer proteinG;
    private Integer carbsG;
    private Integer fatG;
    private Double waterTargetLiters;
    private String mealsJson;
}
