package com.nutrition.controller;

import com.nutrition.dto.UserProfileDto;
import com.nutrition.entity.Role;
import com.nutrition.security.CustomUserDetails;
import com.nutrition.service.UserProfileService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

/**
 * Clinical Client Profile Controller.
Allows certified nutritionists to inspect biometric profiles and clinical dossiers of assigned patients.
 */
@RestController
@RequestMapping("/api/client-profiles")
@RequiredArgsConstructor
public class ClientProfileController {

    private final UserProfileService userProfileService;

    /**
     * Handles request to get client profiles.
     *
     * <p>Restricted to nutritionists and administrators: the payload contains every
     * patient's biometrics, allergies and health targets, and previously any authenticated
     * account could read it.
     *
     * @param userDetails the authenticated caller, injected from the security context
     * @return clinical profiles visible to the caller
     */
    @GetMapping
    public ResponseEntity<List<UserProfileDto>> getClientProfiles(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        Role role = userDetails != null ? userDetails.getRole() : null;
        if (role != Role.NUTRITIONIST && role != Role.ADMIN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Only nutritionists and administrators can view client profiles.");
        }
        return ResponseEntity.ok(userProfileService.getAllUserProfiles());
    }
}
