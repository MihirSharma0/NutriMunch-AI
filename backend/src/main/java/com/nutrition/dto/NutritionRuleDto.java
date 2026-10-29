package com.nutrition.dto;

import lombok.Data;
import java.time.LocalDateTime;

/**
 * Data Transfer Object for defining or updating clinical nutrition rules and guidelines.
 */
@Data
public class NutritionRuleDto {
    private Long id;
    private String ruleKey;
    private Double ruleValue;
    private String description;
    private LocalDateTime updatedAt;
}
