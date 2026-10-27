package com.nutrition.controller;

import com.nutrition.dto.UserProfileDto;
import com.nutrition.service.UserProfileService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/client-profiles")
@RequiredArgsConstructor
public class ClientProfileController {

    private final UserProfileService userProfileService;

    @GetMapping
    public ResponseEntity<List<UserProfileDto>> getClientProfiles() {
        return ResponseEntity.ok(userProfileService.getAllUserProfiles());
    }
}
