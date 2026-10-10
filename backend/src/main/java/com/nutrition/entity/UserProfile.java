package com.nutrition.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;

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
    
    // New targets for Module 3
    @Column(name = "daily_water_target_liters")
    private Double dailyWaterTargetLiters;
    
    @Column(name = "daily_fiber_target_g")
    private Integer dailyFiberTargetG;
    
    @Column(name = "iron_target_mg")
    private Double ironTargetMg;
    
    @Column(name = "calcium_target_mg")
    private Double calciumTargetMg;
    
    @Column(name = "vit_d_target_mcg")
    private Double vitDTargetMcg;
    
    @Column(name = "vit_b12_target_mcg")
    private Double vitB12TargetMcg;
    
    @Column(name = "vit_c_target_mg")
    private Double vitCTargetMg;
    
    @Column(name = "magnesium_target_mg")
    private Double magnesiumTargetMg;
    
    @Column(name = "potassium_target_mg")
    private Double potassiumTargetMg;
    
    @Column(name = "zinc_target_mg")
    private Double zincTargetMg;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
