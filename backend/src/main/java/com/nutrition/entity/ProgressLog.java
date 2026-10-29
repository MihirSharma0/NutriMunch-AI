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
    private Integer caloriesConsumed;
    
    @Column(columnDefinition = "TEXT")
    private String notes;

    @CreationTimestamp
    private LocalDateTime createdAt;
}
