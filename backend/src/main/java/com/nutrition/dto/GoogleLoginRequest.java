package com.nutrition.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * Data Transfer Object for Google OAuth sign-in requests.
 * Carries the Google ID token credential, optional selected role, and initial biometrics.
 */
@Data
public class GoogleLoginRequest {
    @NotBlank
    private String credential; // The Google ID token
    
    private String role; // Optional role for first-time login
    
    // User Onboarding Fields
    private Integer age;
    private String gender;
    private Double heightCm;
    private Double weightKg;
    private String goal;
    
    // Nutritionist Onboarding Fields
    private String credentials;
    private String specialization;
}
