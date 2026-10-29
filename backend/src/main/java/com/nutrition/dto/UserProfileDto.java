package com.nutrition.dto;

import lombok.Data;
import java.time.LocalDateTime;

/**
 * Data Transfer Object for patient biometric profiles and health targets.
 * Transmits age, height, weight, dietary lifestyle, allergen exclusions, and hydration goals.
 */
@Data
public class UserProfileDto {
    private Long id;
    private Long userId;
    private Double heightCm;
    private Double weightKg;
    private Double targetWeightKg;
    private String activityLevel;
    private String dietaryPreferences;
    private String allergies;
    
    private Integer age;
    private String gender;
    private String goal;
    private String dietType;
    private String lifestyleClass;
    private String mealBudget;
    private String email;
    private String firstName;
    private String lastName;
    private String favoriteFoods;
    private String dislikedFoods;
    private String cuisinePreferences;
    private Boolean isCustomTargets;

    private Double bmr;
    private Double tdee;
    private Integer dailyCaloriesTarget;
    private Integer proteinTarget;
    private Integer carbsTarget;
    private Integer fatsTarget;
    private Integer sugarTargetG;
    
    private Double dailyWaterTargetLiters;
    private Integer dailyFiberTargetG;
    private Double ironTargetMg;
    private Double calciumTargetMg;
    private Double vitDTargetMcg;
    private Double vitB12TargetMcg;
    private Double vitCTargetMg;
    private Double magnesiumTargetMg;
    private Double potassiumTargetMg;
    private Double zincTargetMg;

    private LocalDateTime updatedAt;
}
