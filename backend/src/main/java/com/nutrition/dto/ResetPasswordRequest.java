package com.nutrition.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * Data Transfer Object for completing password resets.
 * Carries the reset security token and new account password.
 */
@Data
public class ResetPasswordRequest {
    @NotBlank
    private String token;
    
    @NotBlank
    private String newPassword;
}
