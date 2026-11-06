package com.nutrition.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * DietPlan Entity.
 * Stores 7-day structured meal plans created either by Gemini AI or certified nutritionists,
 * including target scope (GENERAL vs EXCLUSIVE for a patient), calories, and macronutrient targets.
 */
@Entity
@Table(name = "diet_plans", indexes = {
        @Index(name = "idx_diet_plans_user_date", columnList = "user_id, generated_date")
})
@Data
public class DietPlan {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, name = "generated_date")
    private LocalDate generatedDate;

    private Integer totalCalories;
    @Column(name = "protein_g")
    private Integer proteinG;
    @Column(name = "carbs_g")
    private Integer carbsG;
    @Column(name = "fat_g")
    private Integer fatG;

    @Column(name = "water_target_liters")
    private Double waterTargetLiters;

    @Column(name = "meals_json", columnDefinition = "LONGTEXT")
    private String mealsJson; 

    @CreationTimestamp
    private LocalDateTime createdAt;
}
