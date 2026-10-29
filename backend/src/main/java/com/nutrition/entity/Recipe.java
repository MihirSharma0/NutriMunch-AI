package com.nutrition.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Data
/**
 * Recipe Entity.
 * Stores nutritional recipes with calorie counts, macronutrient ratios, preparation instructions,
 * and allergen classifications.
 */
@Entity
@Table(name = "recipes")
public class Recipe {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String ingredients; // store as JSON string or plain text list

    @Column(nullable = false, columnDefinition = "TEXT")
    private String instructions; // store as JSON string or plain text list

    private Integer prepTimeMinutes;

    private Integer calories;

    @Column(name = "image_url")
    private String imageUrl;

    @Column(name = "author_id")
    private Long authorId;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
