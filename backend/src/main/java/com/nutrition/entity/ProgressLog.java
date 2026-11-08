package com.nutrition.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * ProgressLog Entity.
 * Records daily biometric tracking entries including body weight, water intake,
 * calories consumed, and macronutrient breakdown for trend analytics.
 */
@Entity
@Table(name = "progress_logs")
@Data
public class ProgressLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private LocalDate logDate;

    private Double weightKg;
    private Integer sleepScore;
    private Integer hrvScore;

    // The five daily nutrition metrics persisted server-side (the DB is the only
    // source of truth). caloriesConsumed already existed; the other four are new
    // additive columns created by Hibernate ddl-auto: update on the next deploy.
    private Integer caloriesConsumed;

    @Column(name = "water_consumed_ml")
    private Integer waterConsumedMl;

    @Column(name = "protein_g")
    private Double proteinG;

    @Column(name = "carbs_g")
    private Double carbsG;

    @Column(name = "fats_g")
    private Double fatsG;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @CreationTimestamp
    private LocalDateTime createdAt;
}
