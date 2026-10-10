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

    @GetMapping("/nutritionists")
    public ResponseEntity<List<User>> getAllNutritionists() {
        return ResponseEntity.ok(userRepository.findByRole(Role.NUTRITIONIST));
    }
    
    @PutMapping("/users/{id}/role")
    public ResponseEntity<User> updateUserRole(@PathVariable Long id, @RequestBody Map<String, String> body) {
        User user = userRepository.findById(id).orElseThrow(() -> new RuntimeException("User not found"));
        user.setRole(Role.valueOf(body.get("role").toUpperCase()));
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
        userRepository.save(user);
        return ResponseEntity.ok(Map.of("message", "Password reset successfully for user " + user.getEmail()));
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        nutritionistProfileRepository.findByUserId(id).ifPresent(nutritionistProfileRepository::delete);
        userProfileRepository.findByUserId(id).ifPresent(userProfileRepository::delete);
        userRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
    
    @PutMapping("/nutritionists/{id}/approve")
    public ResponseEntity<NutritionistProfile> approveNutritionist(@PathVariable Long id) {
        NutritionistProfile profile = nutritionistProfileRepository.findByUserId(id)
                .orElseThrow(() -> new RuntimeException("Nutritionist profile not found"));
        profile.setApprovalStatus("APPROVED");
        
        // Also verify the user
        User user = profile.getUser();
        user.setVerified(true);
        userRepository.save(user);

        return ResponseEntity.ok(nutritionistProfileRepository.save(profile));
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
