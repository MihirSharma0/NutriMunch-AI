package com.nutrition.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "nutritionist_profiles")
public class NutritionistProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private String credentials;

    @Column(nullable = false)
    private String specialization;

    @Column(columnDefinition = "TEXT")
    private String bio;

    @Column(name = "years_of_experience")
    private String yearsOfExperience;

    @Column(name = "consultation_fee")
    private String consultationFee;

    private String languages;

    @Column(name = "license_number")
    private String licenseNumber;

    private String availability;

    private Integer age;

    private String gender;

    @Column(name = "approval_status", nullable = false)
    private String approvalStatus = "PENDING"; // PENDING, APPROVED, REJECTED

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
