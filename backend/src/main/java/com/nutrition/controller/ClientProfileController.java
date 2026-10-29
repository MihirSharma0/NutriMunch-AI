package com.nutrition.controller;

import com.nutrition.dto.UserProfileDto;
import com.nutrition.service.UserProfileService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

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
     */
    @GetMapping
    public ResponseEntity<List<UserProfileDto>> getClientProfiles() {
        return ResponseEntity.ok(userProfileService.getAllUserProfiles());
    }
}
