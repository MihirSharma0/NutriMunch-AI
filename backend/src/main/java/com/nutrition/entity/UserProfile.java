package com.nutrition.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;

/**
 * UserProfile Entity.
 * Stores patient demographic and biometric details including age, height, weight,
 * activity level, dietary lifestyle, allergen exclusions, and hydration goals.
 */
@Entity
@Table(name = "user_profiles")
@Data
public class UserProfile {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    private Double heightCm;
    private Double weightKg;
    private Double targetWeightKg;
    private String activityLevel;
    private String dietaryPreferences;
    private String allergies;
    
    // New fields
    private Integer age;
    private String gender;
    private String goal;
    private String dietType;
    private String lifestyleClass;
    private String mealBudget;
    private String favoriteFoods;
    private String dislikedFoods;
    @Column(name = "cuisine_preferences", length = 500)
    private String cuisinePreferences;
    
    @Column(name = "is_custom_targets")
    private Boolean isCustomTargets = false;

    // Recalculated target fields
    private Double bmr;
    private Double tdee;
    private Integer dailyCaloriesTarget;
    private Integer proteinTarget;
    private Integer carbsTarget;
    private Integer fatsTarget;

    // Only the five core daily targets are kept: calories, protein, carbs,
    // fats and water. The micronutrient / sugar / fibre target columns were
    // removed from the entity (DB columns are left in place by ddl-auto:update).
    @Column(name = "daily_water_target_liters")
    private Double dailyWaterTargetLiters;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
