package com.nutrition.controller;

import com.nutrition.entity.NutritionistProfile;
import com.nutrition.entity.Role;
import com.nutrition.entity.User;
import com.nutrition.repository.NutritionistProfileRepository;
import com.nutrition.repository.UserProfileRepository;
import com.nutrition.repository.UserRepository;
import com.nutrition.dto.UserProfileDto;
import com.nutrition.service.UserProfileService;
import com.nutrition.service.SystemSettingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final UserRepository userRepository;
    private final NutritionistProfileRepository nutritionistProfileRepository;
    private final UserProfileRepository userProfileRepository;
    private final UserProfileService userProfileService;
    private final com.nutrition.repository.DietPlanRepository dietPlanRepository;
    private final SystemSettingService systemSettingService;
    private final PasswordEncoder passwordEncoder;
    private final JdbcTemplate jdbcTemplate;

    @org.springframework.beans.factory.annotation.Value("${app.admin.email:admin@nutrimunch.com}")
    private String configuredAdminEmail;

    @org.springframework.beans.factory.annotation.Value("${app.admin.password:AdminPass123!}")
    private String configuredAdminPassword;

    private String activeAdminEmail;
    private String activeAdminPassword;

    @jakarta.annotation.PostConstruct
    public void initCredentials() {
        this.activeAdminEmail = configuredAdminEmail;
        this.activeAdminPassword = configuredAdminPassword;
    }

    @GetMapping("/credentials")
    public ResponseEntity<Map<String, String>> getAdminCredentials() {
        User adminUser = userRepository.findByRole(Role.ADMIN).stream().findFirst().orElse(null);
        String email = adminUser != null ? adminUser.getEmail() : activeAdminEmail;
        return ResponseEntity.ok(Map.of(
            "email", email,
            "password", activeAdminPassword != null ? activeAdminPassword : "••••••••",
            "firstName", adminUser != null && adminUser.getFirstName() != null ? adminUser.getFirstName() : "System",
            "lastName", adminUser != null && adminUser.getLastName() != null ? adminUser.getLastName() : "Admin"
        ));
    }

    @PutMapping("/credentials")
    public ResponseEntity<Map<String, String>> updateAdminCredentials(@RequestBody Map<String, String> body) {
        String newEmail = body.get("email");
        String newPassword = body.get("password");
        String newFirstName = body.get("firstName");
        String newLastName = body.get("lastName");

        if (newEmail == null || newEmail.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email cannot be empty"));
        }

        User adminUser = userRepository.findByRole(Role.ADMIN).stream().findFirst().orElse(null);
        if (adminUser == null) {
            adminUser = userRepository.findByEmail(activeAdminEmail).orElse(null);
        }

        if (adminUser != null) {
            adminUser.setEmail(newEmail);
            if (newFirstName != null) adminUser.setFirstName(newFirstName);
            if (newLastName != null) adminUser.setLastName(newLastName);
            if (newPassword != null && !newPassword.isBlank()) {
                adminUser.setPasswordHash(passwordEncoder.encode(newPassword));
                this.activeAdminPassword = newPassword;
            }
            adminUser.setRole(Role.ADMIN);
            adminUser.setVerified(true);
            userRepository.save(adminUser);
            this.activeAdminEmail = newEmail;
            return ResponseEntity.ok(Map.of(
                "message", "Admin credentials updated successfully!",
                "email", newEmail,
                "password", activeAdminPassword
            ));
        } else {
            return ResponseEntity.badRequest().body(Map.of("message", "Admin user account not found in database"));
        }
    }

    @GetMapping("/all-users")
    public ResponseEntity<List<User>> getAllUsersList() {
        return ResponseEntity.ok(userRepository.findAll());
    }

    @GetMapping("/all-user-profiles")
    public ResponseEntity<List<UserProfileDto>> getAllUserProfiles() {
        return ResponseEntity.ok(userProfileService.getAllUserProfiles());
    }

    @GetMapping("/users")
    public ResponseEntity<List<User>> getAllUsers() {
        return ResponseEntity.ok(userRepository.findByRole(Role.USER));
    }

    @GetMapping({"/nutritionists", "/dietitians"})
    public ResponseEntity<List<Map<String, Object>>> getAllNutritionists() {
        // Automatically cleanup any stale nutritionist profiles for users whose role is no longer NUTRITIONIST
        try {
            List<NutritionistProfile> allProfiles = nutritionistProfileRepository.findAll();
            for (NutritionistProfile p : allProfiles) {
                if (p.getUser() == null || p.getUser().getRole() != Role.NUTRITIONIST) {
                    nutritionistProfileRepository.delete(p);
                }
            }
        } catch (Exception ignored) {}

        // STRICT: Only fetch users whose CURRENT role in the database is Role.NUTRITIONIST
        List<User> nutritionistUsers = userRepository.findByRole(Role.NUTRITIONIST);
        List<Map<String, Object>> resultList = new ArrayList<>();

        for (User u : nutritionistUsers) {
            Map<String, Object> map = new HashMap<>();
            map.put("id", u.getId());
            map.put("userId", u.getId());
            map.put("firstName", u.getFirstName());
            map.put("lastName", u.getLastName());
            map.put("email", u.getEmail());
            map.put("role", u.getRole() != null ? u.getRole().name() : "NUTRITIONIST");
            map.put("verified", false);
            map.put("credentials", "Certified Clinical Dietitian");
            map.put("specialization", "Clinical & Medical Nutrition");
            map.put("licenseNumber", "RD-" + u.getId() + "84920-IN");
            map.put("approvalStatus", "PENDING");
            map.put("isApproved", false);

            NutritionistProfile profile = nutritionistProfileRepository.findByUserId(u.getId()).orElse(null);
            if (profile != null) {
                if (profile.getCredentials() != null && !profile.getCredentials().isBlank()) {
                    map.put("credentials", profile.getCredentials());
                }
                if (profile.getSpecialization() != null && !profile.getSpecialization().isBlank()) {
                    map.put("specialization", profile.getSpecialization());
                }
                if (profile.getLicenseNumber() != null && !profile.getLicenseNumber().isBlank()) {
                    map.put("licenseNumber", profile.getLicenseNumber());
                }
                String status = profile.getApprovalStatus() != null ? profile.getApprovalStatus() : "PENDING";
                map.put("approvalStatus", status);
                boolean approved = "APPROVED".equalsIgnoreCase(status) || "VERIFIED".equalsIgnoreCase(status);
                map.put("isApproved", approved);
                map.put("verified", approved && u.isVerified());
            }
            resultList.add(map);
        }

        return ResponseEntity.ok(resultList);
    }
    
    @PutMapping("/users/{id}/role")
    public ResponseEntity<User> updateUserRole(@PathVariable Long id, @RequestBody Map<String, String> body) {
        User user = userRepository.findById(id).orElseThrow(() -> new RuntimeException("User not found"));
        Role newRole = Role.valueOf(body.get("role").toUpperCase());
        user.setRole(newRole);

        if (newRole == Role.NUTRITIONIST) {
            // When role is changed to dietitian, their license state should by default be in pending review stage,
            // like a newly formed account for that particular role
            NutritionistProfile profile = nutritionistProfileRepository.findByUserId(id).orElseGet(() -> {
                NutritionistProfile p = new NutritionistProfile();
                p.setUser(user);
                return p;
            });
            profile.setCredentials("Certified Clinical Dietitian");
            profile.setSpecialization("Clinical & Medical Nutrition");
            profile.setLicenseNumber("RD-" + user.getId() + "84920-IN");
            profile.setApprovalStatus("PENDING");
            nutritionistProfileRepository.save(profile);
            user.setVerified(false);
        } else {
            // When role is changed away from NUTRITIONIST to USER or ADMIN,
            // completely remove their dietitian profile so they no longer appear in dietitian verification
            nutritionistProfileRepository.findByUserId(id).ifPresent(nutritionistProfileRepository::delete);
        }

        return ResponseEntity.ok(userRepository.save(user));
    }

    @PostMapping("/users/{id}/reset-password")
    public ResponseEntity<Map<String, String>> resetUserPassword(@PathVariable Long id, @RequestBody Map<String, String> body) {
        String newPassword = body.get("newPassword");
        if (newPassword == null || newPassword.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "New password cannot be empty"));
        }
        User user = userRepository.findById(id).orElseThrow(() -> new RuntimeException("User not found"));
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        user.setVerified(true);
        user.setOtpCode(null);
        user.setOtpExpiryDate(null);
        userRepository.save(user);
        return ResponseEntity.ok(Map.of("message", "Password reset successfully for user " + user.getEmail() + ". Account is verified and enabled."));
    }

    @PutMapping("/users/{id}/verify")
    public ResponseEntity<User> verifyUser(@PathVariable Long id) {
        User user = userRepository.findById(id).orElseThrow(() -> new RuntimeException("User not found"));
        user.setVerified(true);
        user.setOtpCode(null);
        user.setOtpExpiryDate(null);
        return ResponseEntity.ok(userRepository.save(user));
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        User user = userRepository.findById(id).orElse(null);
        String userEmail = user != null ? user.getEmail() : null;

        // If any dietitian account is deleted, all of their diet plans and settings are deleted as well
        try {
            dietPlanRepository.deleteByUserId(id);
        } catch (Exception ignored) {}

        if (userEmail != null) {
            DietPlanController.purgePlansByAuthor(id, userEmail);
        }

        nutritionistProfileRepository.findByUserId(id).ifPresent(nutritionistProfileRepository::delete);
        userProfileRepository.findByUserId(id).ifPresent(userProfileRepository::delete);
        userRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
    
    @PutMapping({"/nutritionists/{id}/approve", "/dietitians/{id}/verify", "/nutritionists/{id}/verify"})
    public ResponseEntity<Map<String, Object>> approveNutritionist(@PathVariable Long id) {
        User user = userRepository.findById(id).orElse(null);
        if (user != null) {
            user.setVerified(true);
            userRepository.save(user);
        }

        NutritionistProfile profile = nutritionistProfileRepository.findByUserId(id).orElse(null);
        if (profile == null && user != null) {
            profile = new NutritionistProfile();
            profile.setUser(user);
            profile.setCredentials("Certified Clinical Dietitian");
            profile.setSpecialization("Clinical & Medical Nutrition");
            profile.setLicenseNumber("RD-84920-IN");
        }

        if (profile != null) {
            profile.setApprovalStatus("APPROVED");
            nutritionistProfileRepository.save(profile);
        }

        return ResponseEntity.ok(Map.of(
            "message", "Dietitian verified & approved successfully!",
            "id", id,
            "verified", true,
            "approvalStatus", "APPROVED"
        ));
    }

    @PutMapping({"/nutritionists/{id}/revoke", "/dietitians/{id}/revoke"})
    public ResponseEntity<Map<String, Object>> revokeNutritionist(@PathVariable Long id) {
        User user = userRepository.findById(id).orElse(null);
        if (user != null) {
            user.setVerified(false);
            userRepository.save(user);
        }

        NutritionistProfile profile = nutritionistProfileRepository.findByUserId(id).orElse(null);
        if (profile != null) {
            profile.setApprovalStatus("PENDING");
            nutritionistProfileRepository.save(profile);
        }

        return ResponseEntity.ok(Map.of(
            "message", "Dietitian verification revoked",
            "id", id,
            "verified", false,
            "approvalStatus", "PENDING"
        ));
    }

    @PostMapping("/settings/otp")
    public ResponseEntity<Map<String, Boolean>> toggleOtp(@RequestBody Map<String, Boolean> body) {
        Boolean enabled = body.get("enabled");
        if (enabled != null) {
            systemSettingService.setOtpEnabled(enabled);
        }
        return ResponseEntity.ok(Map.of("otpEnabled", systemSettingService.isOtpEnabled()));
    }

    @GetMapping("/analytics")
    public ResponseEntity<Map<String, Object>> getAnalytics() {
        Map<String, Object> stats = new HashMap<>();
        stats.put("totalUsers", userRepository.findAll().size());
        stats.put("totalNutritionists", userRepository.findByRole(Role.NUTRITIONIST).size());
        stats.put("totalRevenue", 15200);
        stats.put("totalAppointments", 145);
        return ResponseEntity.ok(stats);
    }

    @PostMapping("/query")
    public ResponseEntity<Map<String, Object>> executeSqlQuery(@RequestBody Map<String, String> body) {
        String query = body.get("query");
        if (query == null || query.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "SQL Query cannot be empty"));
        }

        Map<String, Object> result = new HashMap<>();
        try {
            String upperQuery = query.trim().toUpperCase();
            if (upperQuery.startsWith("SELECT") || upperQuery.startsWith("SHOW") || upperQuery.startsWith("DESCRIBE")) {
                List<Map<String, Object>> rows = jdbcTemplate.queryForList(query);
                List<String> columns = new ArrayList<>();
                if (!rows.isEmpty()) {
                    columns.addAll(rows.get(0).keySet());
                }

                result.put("columns", columns);
                result.put("rows", rows);
                result.put("rowCount", rows.size());
                result.put("success", true);
            } else {
                int affectedRows = jdbcTemplate.update(query);
                result.put("columns", new ArrayList<>());
                result.put("rows", new ArrayList<>());
                result.put("rowCount", affectedRows);
                result.put("success", true);
                result.put("message", "Statement executed successfully. " + affectedRows + " rows affected.");
            }
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            result.put("success", false);
            result.put("error", e.getMessage());
            return ResponseEntity.ok(result);
        }
    }
}
