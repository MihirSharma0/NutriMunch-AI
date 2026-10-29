package com.nutrition.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Data
/**
 * Testimonial Entity.
 * Represents patient transformation reviews, star ratings, and clinical testimonials
 * moderated by platform administrators.
 */
@Entity
@Table(name = "testimonials")
public class Testimonial {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, name = "author_name")
    private String authorName;

    @Column(name = "author_email")
    private String authorEmail;

    @Column(name = "author_role")
    private String authorRole; // e.g. "Standard User", "Certified Nutritionist", "Nutritionist"

    @Column(name = "user_id")
    private Long userId;

    @Column(nullable = false)
    private Integer rating; // 1 to 5 stars

    @Column(name = "program_result")
    private String programResult; // e.g. "-25 lbs in 4 months", "+32% Deep Sleep"

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(name = "avatar_url")
    private String avatarUrl;

    @Column(name = "status")
    private String status = "APPROVED"; // APPROVED, PENDING, REJECTED

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
