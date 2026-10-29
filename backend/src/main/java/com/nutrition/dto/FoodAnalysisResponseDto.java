package com.nutrition.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

/**
 * Data Transfer Object returning AI food nutrition analysis.
 * Contains calorie estimates, macronutrient compositions, ingredients, and allergen warnings.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FoodAnalysisResponseDto {
    private String productName;
    private String category;
    private String servingSize;
    private String verdict; // SAFE, CAUTION, AVOID
    private String verdictExplanation;
    private List<String> ingredientsList;
    private List<AllergenWarning> matchedAllergens;
    private List<AdditiveInfo> additives;
    private Map<String, Boolean> dietSuitability;
    private NutritionInfo nutrition;
    private List<AlternativeOption> betterAlternatives;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AllergenWarning {
        private String allergen; // Peanuts, Dairy, Gluten, Soy, etc.
        private String severity; // HIGH, MEDIUM
        private String reason;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AdditiveInfo {
        private String name; // e.g. E211 (Sodium Benzoate), Aspartame, Red 40
        private String category; // Preservative, Artificial Color, Sweetener, Flavor Enhancer
        private String riskLevel; // LOW, MODERATE, HIGH
        private String description;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class NutritionInfo {
        private Integer calories;
        private Double proteinG;
        private Double carbsG;
        private Double fatG;
        private Double fiberG;
        private Double sugarG;
        private Double sodiumMg;
        private Map<String, String> micronutrients; // e.g., "Vitamin C": "25mg (30% DV)", "Iron": "3.2mg"
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AlternativeOption {
        private Long id;
        private String title;
        private String description;
        private Integer calories;
        private Double proteinG;
        private Double carbsG;
        private Double fatG;
        private String imageUrl;
        private String whyBetter;
    }
}
