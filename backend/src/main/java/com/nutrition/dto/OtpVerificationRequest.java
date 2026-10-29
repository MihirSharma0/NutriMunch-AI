package com.nutrition.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * Data Transfer Object for validating email one-time password (OTP) codes.
 * Contains target email address and 6-digit verification OTP code.
 */
@Data
public class OtpVerificationRequest {
    @NotBlank
    @Email
    private String email;

    @NotBlank
    private String otp;
}
