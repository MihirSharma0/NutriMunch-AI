package com.nutrition.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

/**
 * Data Transfer Object returning an authenticated JWT token and user profile summary.
 */
@Data
@AllArgsConstructor
public class JwtResponse {
    private String token;
    private Long id;
    private String email;
    private String firstName;
    private String lastName;
    private String role;
}
