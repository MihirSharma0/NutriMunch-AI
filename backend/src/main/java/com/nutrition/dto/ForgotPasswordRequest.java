package com.nutrition.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * Data Transfer Object for self-service password reset requests.
 * Contains the user email to which the reset token link will be dispatched.
 */
@Data
public class ForgotPasswordRequest {
    @NotBlank
    @Email
    private String email;
}
