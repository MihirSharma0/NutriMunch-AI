package com.nutrition.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "diet_plans")
@Data
public class DietPlan {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
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

    @Column(columnDefinition = "TEXT")
    private String mealsJson; 

    @CreationTimestamp
    private LocalDateTime createdAt;
}
