package com.nutrition.controller;

import com.nutrition.entity.NutritionistProfile;
import com.nutrition.entity.User;
import com.nutrition.repository.NutritionistProfileRepository;
import com.nutrition.repository.UserRepository;
import com.nutrition.security.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Certified Nutritionist Profile Controller.
Manages clinical credentials, medical licensing data, consultation fees, and professional biographies.
 */
@RestController
@RequestMapping("/api/nutritionist/profile")
@RequiredArgsConstructor
public class NutritionistProfileController {

    private final NutritionistProfileRepository nutritionistProfileRepository;
    private final UserRepository userRepository;

    /**
     * Handles request to get profile.
     */
    @GetMapping
    public ResponseEntity<?> getProfile() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();

        NutritionistProfile profile = nutritionistProfileRepository.findByUserId(userDetails.getId())
                .orElse(null);

        if (profile == null) {
            return ResponseEntity.notFound().build();
        }

        User user = profile.getUser();
        if (user == null) {
            user = userRepository.findById(userDetails.getId()).orElse(null);
        }

        boolean isApproved = "APPROVED".equalsIgnoreCase(profile.getApprovalStatus()) || "VERIFIED".equalsIgnoreCase(profile.getApprovalStatus());

        String licenseNo = profile.getLicenseNumber();
        if (licenseNo == null || licenseNo.isBlank() || licenseNo.equals("RD-84920-IN") || licenseNo.equals("RD-94820")) {
            licenseNo = "RD-" + userDetails.getId() + "84920-IN";
            profile.setLicenseNumber(licenseNo);
            nutritionistProfileRepository.save(profile);
        }

        java.util.Map<String, Object> map = new java.util.HashMap<>();
        map.put("id", profile.getId());
        map.put("credentials", profile.getCredentials());
        map.put("specialization", profile.getSpecialization());
        map.put("bio", profile.getBio());
        map.put("yearsOfExperience", profile.getYearsOfExperience());
        map.put("consultationFee", profile.getConsultationFee());
        map.put("languages", profile.getLanguages());
        map.put("licenseNumber", licenseNo);
        map.put("availability", profile.getAvailability());
        map.put("approvalStatus", isApproved ? "APPROVED" : "PENDING");
        map.put("isApproved", isApproved);
        map.put("verified", isApproved);
        map.put("age", profile.getAge());
        map.put("gender", profile.getGender());
        map.put("email", user != null ? user.getEmail() : userDetails.getUsername());
        map.put("firstName", user != null ? user.getFirstName() : "");
        map.put("lastName", user != null ? user.getLastName() : "");

        return ResponseEntity.ok(map);
    }

    /**
     * Handles request to update profile.
     */
    @PutMapping
    public ResponseEntity<?> updateProfile(@RequestBody Map<String, String> body) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();

        NutritionistProfile profile = nutritionistProfileRepository.findByUserId(userDetails.getId())
                .orElseThrow(() -> new RuntimeException("Profile not found"));

        if (body.containsKey("credentials")) {
            profile.setCredentials(body.get("credentials"));
        }
        if (body.containsKey("specialization")) {
            profile.setSpecialization(body.get("specialization"));
        }
        if (body.containsKey("bio")) {
            profile.setBio(body.get("bio"));
        }
        if (body.containsKey("yearsOfExperience")) {
            profile.setYearsOfExperience(body.get("yearsOfExperience"));
        }
        if (body.containsKey("consultationFee")) {
            profile.setConsultationFee(body.get("consultationFee"));
        }
        if (body.containsKey("languages")) {
            profile.setLanguages(body.get("languages"));
        }
        if (body.containsKey("licenseNumber")) {
            profile.setLicenseNumber(body.get("licenseNumber"));
        }
        if (body.containsKey("availability")) {
            profile.setAvailability(body.get("availability"));
        }
        if (body.containsKey("age") && body.get("age") != null && !body.get("age").isBlank()) {
            try {
                profile.setAge(Integer.parseInt(body.get("age").trim()));
            } catch (Exception e) {}
        }
        if (body.containsKey("gender")) {
            profile.setGender(body.get("gender"));
        }

        if (body.containsKey("firstName") || body.containsKey("lastName")) {
            User user = profile.getUser();
            if (user != null) {
                if (body.containsKey("firstName")) user.setFirstName(body.get("firstName"));
                if (body.containsKey("lastName")) user.setLastName(body.get("lastName"));
                userRepository.save(user);
            }
        }

        nutritionistProfileRepository.save(profile);
        return getProfile();
    }
}
