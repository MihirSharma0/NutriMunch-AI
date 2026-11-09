package com.nutrition.controller;

import com.nutrition.entity.NutritionistProfile;
import com.nutrition.entity.Role;
import com.nutrition.entity.User;
import com.nutrition.repository.NutritionistProfileRepository;
import com.nutrition.repository.UserProfileRepository;
import com.nutrition.repository.UserRepository;
import com.nutrition.repository.NutritionistDietPlanRepository;
import com.nutrition.dto.UserProfileDto;
import com.nutrition.security.CustomUserDetails;
import com.nutrition.service.UserProfileService;
import com.nutrition.service.SystemSettingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Administrative Command Controller.
Provides endpoints for system telemetry, user role management, SQL query console, appointment refunds, and nutritionist licensing audits.
 */
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final UserRepository userRepository;
    private final NutritionistProfileRepository nutritionistProfileRepository;
    private final NutritionistDietPlanRepository nutritionistDietPlanRepository;
    private final UserProfileRepository userProfileRepository;
    private final UserProfileService userProfileService;
    private final com.nutrition.repository.DietPlanRepository dietPlanRepository;
    private final com.nutrition.service.AiService aiService;
    private final SystemSettingService systemSettingService;
    private final PasswordEncoder passwordEncoder;
    private final JdbcTemplate jdbcTemplate;
    private final com.nutrition.service.WalletService walletService;
    private final com.nutrition.service.NotificationService notificationService;
    private final com.nutrition.repository.AppointmentRepository appointmentRepository;
    private final com.nutrition.repository.ConversationRepository conversationRepository;
    private final com.nutrition.repository.ProgressLogRepository progressLogRepository;
    private final com.nutrition.repository.NotificationRepository notificationRepository;
    private final com.nutrition.repository.WalletRepository walletRepository;
    private final com.nutrition.repository.WalletTransactionRepository walletTransactionRepository;
    private final com.nutrition.repository.TestimonialRepository testimonialRepository;
    private final com.nutrition.repository.VerificationTokenRepository verificationTokenRepository;
    private final com.nutrition.repository.PasswordResetTokenRepository passwordResetTokenRepository;

    @org.springframework.beans.factory.annotation.Value("${app.admin.email:}")
    private String configuredAdminEmail;

    /**
     * Retrieves the current LLM configuration (OpenRouter only).
     */
    @GetMapping("/llm-config")
    public ResponseEntity<Map<String, Object>> getLlmConfig() {
        String effectiveKey = aiService.getEffectiveApiKey();
        boolean hasKey = effectiveKey != null && !effectiveKey.isBlank() && !"mock-key".equals(effectiveKey);
        String maskedKey = "";
        if (hasKey) {
            maskedKey = effectiveKey.length() > 8
                    ? effectiveKey.substring(0, 4) + "..." + effectiveKey.substring(effectiveKey.length() - 4)
                    : "••••••••";
        }

        Map<String, Object> response = new HashMap<>();
        response.put("provider", "OPENROUTER");
        response.put("model", aiService.getEffectiveModel());
        response.put("baseUrl", aiService.getEffectiveBaseUrl());
        response.put("hasApiKey", hasKey);
        response.put("maskedApiKey", maskedKey);
        response.put("defaultModel", "google/gemini-2.5-flash");
        return ResponseEntity.ok(response);
    }

    /**
     * Updates the OpenRouter LLM configuration.
     */
    @PutMapping("/llm-config")
    public ResponseEntity<Map<String, Object>> updateLlmConfig(@RequestBody Map<String, String> body) {
        String model = body.get("model");
        String apiKey = body.get("apiKey");
        String baseUrl = body.get("baseUrl");

        if (model != null && !model.isBlank()) {
            systemSettingService.setSetting("OPENROUTER_MODEL", model.trim());
        }
        if (apiKey != null && !apiKey.isBlank()) {
            systemSettingService.setSetting("OPENROUTER_API_KEY", apiKey.trim());
        }
        if (baseUrl != null) {
            systemSettingService.setSetting("OPENROUTER_BASE_URL", baseUrl.trim());
        }

        return getLlmConfig();
    }

    /**
     * Tests connectivity to OpenRouter with either the saved or candidate configuration.
     */
    @PostMapping("/llm-config/test")
    public ResponseEntity<Map<String, Object>> testLlmConnection(@RequestBody(required = false) Map<String, String> body) {
        String candidateKey = body != null ? body.get("apiKey") : null;
        String candidateModel = body != null ? body.get("model") : null;
        String candidateBaseUrl = body != null ? body.get("baseUrl") : null;

        Map<String, Object> result = aiService.testOpenRouterConnection(candidateKey, candidateModel, candidateBaseUrl);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/credentials")
    public ResponseEntity<Map<String, String>> getAdminCredentials() {
        User adminUser = userRepository.findByRole(Role.ADMIN).stream().findFirst().orElse(null);
        // The ADMIN row is authoritative; config is only a fallback for a
        // database that has not been bootstrapped yet.
        String email = adminUser != null ? adminUser.getEmail() : configuredAdminEmail;
        return ResponseEntity.ok(Map.of(
            "email", email == null ? "" : email,
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
            adminUser = configuredAdminEmail == null || configuredAdminEmail.isBlank()
                ? null : userRepository.findByEmail(configuredAdminEmail).orElse(null);
        }

        if (adminUser != null) {
            adminUser.setEmail(newEmail);
            if (newFirstName != null) adminUser.setFirstName(newFirstName);
            if (newLastName != null) adminUser.setLastName(newLastName);
            if (newPassword != null && !newPassword.isBlank()) {
                adminUser.setPasswordHash(passwordEncoder.encode(newPassword));
            }
            adminUser.setRole(Role.ADMIN);
            adminUser.setVerified(true);
            userRepository.save(adminUser);
            return ResponseEntity.ok(Map.of(
                "message", "Admin credentials updated successfully!",
                "email", newEmail
            ));
        } else {
            return ResponseEntity.badRequest().body(Map.of("message", "Admin user account not found in database"));
        }
    }

    /**
     * Handles request to get all users list.
     */
    @GetMapping("/all-users")
    public ResponseEntity<List<User>> getAllUsersList() {
        return ResponseEntity.ok(userRepository.findAll());
    }

    /**
     * Handles request to get all user profiles.
     */
    @GetMapping("/all-user-profiles")
    public ResponseEntity<List<UserProfileDto>> getAllUserProfiles() {
        return ResponseEntity.ok(userProfileService.getAllUserProfiles());
    }

    /**
     * Handles request to get all users.
     */
    @GetMapping("/users")
    public ResponseEntity<List<User>> getAllUsers() {
        return ResponseEntity.ok(userRepository.findByRole(Role.USER));
    }

    @GetMapping({"/nutritionists", "/nutritionists"})
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
            map.put("credentials", "Certified Clinical Nutritionist");
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

    /**
     * Handles request to update user role.
     */
    @PutMapping("/users/{id}/role")
    @Transactional
    public ResponseEntity<User> updateUserRole(@org.springframework.security.core.annotation.AuthenticationPrincipal com.nutrition.security.CustomUserDetails adminDetails, @PathVariable Long id, @RequestBody Map<String, String> body) {
        User user = userRepository.findById(id).orElseThrow(() -> new RuntimeException("User not found"));
        String requestedRole = body.get("role");
        if (requestedRole == null || requestedRole.isBlank()) {
            throw new IllegalArgumentException("Role cannot be empty");
        }
        Role newRole;
        try {
            newRole = Role.valueOf(requestedRole.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("Invalid role: " + requestedRole);
        }
        user.setRole(newRole);
        // Role changes must not invalidate the user's existing OTP verification.
        user.setVerified(true);
        user.setOtpCode(null);
        user.setOtpExpiryDate(null);

        if (newRole == Role.NUTRITIONIST) {
            NutritionistProfile profile = nutritionistProfileRepository.findByUserId(id).orElseGet(() -> {
                NutritionistProfile p = new NutritionistProfile();
                p.setUser(user);
                return p;
            });
            profile.setCredentials("Certified Clinical Nutritionist");
            profile.setSpecialization("Clinical & Medical Nutrition");
            profile.setLicenseNumber("RD-" + user.getId() + "84920-IN");
            profile.setApprovalStatus("PENDING");
            nutritionistProfileRepository.save(profile);
        } else {
            nutritionistProfileRepository.findByUserId(id).ifPresent(nutritionistProfileRepository::delete);
        }

        User savedUser = userRepository.save(user);
        notificationService.notifyUser(savedUser, actorId(adminDetails), "Account Role Updated",
                newRole == Role.NUTRITIONIST
                        ? "Your account is now a Nutritionist account. Complete your nutritionist profile; it will be reviewed before verification."
                        : "Your account role was changed to " + newRole.name().charAt(0) + newRole.name().substring(1).toLowerCase() + " by the NutriMunch team.",
                "SYSTEM", "manage_accounts", newRole == Role.NUTRITIONIST ? "/dashboard/nutritionist/profile" : "/profile");
        return ResponseEntity.ok(savedUser);
    }

    @PostMapping("/users/{id}/reset-password")
    public ResponseEntity<Map<String, String>> resetUserPassword(@org.springframework.security.core.annotation.AuthenticationPrincipal com.nutrition.security.CustomUserDetails adminDetails, @PathVariable Long id, @RequestBody Map<String, String> body) {
        String newPassword = body.get("newPassword");
        if (newPassword == null || newPassword.length() < 6) {
            return ResponseEntity.badRequest().body(Map.of("message", "New password must be at least 6 characters long"));
        }
        User user = userRepository.findById(id).orElseThrow(() -> new RuntimeException("User not found"));
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        user.setVerified(true);
        user.setOtpCode(null);
        user.setOtpExpiryDate(null);
        userRepository.save(user);
        notificationService.notifyUser(user, actorId(adminDetails), "Password Changed",
                "Your password was reset by the NutriMunch team. If you did not request this, use \"Forgot Password?\" on the login page to set a new one.",
                "SYSTEM", "lock_reset", "/profile");
        return ResponseEntity.ok(Map.of("message", "Password reset successfully for user " + user.getEmail() + ". Account is verified and enabled."));
    }

    /**
     * Handles request to verify user.
     */
    @PutMapping("/users/{id}/verify")
    public ResponseEntity<User> verifyUser(@PathVariable Long id) {
        User user = userRepository.findById(id).orElseThrow(() -> new RuntimeException("User not found"));
        user.setVerified(true);
        user.setOtpCode(null);
        user.setOtpExpiryDate(null);
        return ResponseEntity.ok(userRepository.save(user));
    }

    /**
     * Handles request to delete user.
     */
    @DeleteMapping("/users/{id}")
    @Transactional
    public ResponseEntity<Void> deleteUser(
            @AuthenticationPrincipal CustomUserDetails adminDetails,
            @PathVariable Long id) {
        if (adminDetails != null && id.equals(adminDetails.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        User user = userRepository.findById(id).orElse(null);
        if (user == null) {
            return ResponseEntity.notFound().build();
        }
        String userEmail = user != null ? user.getEmail() : null;

        // Remove all records owned by or directly linked to the account first.
        conversationRepository.deleteByPatient_IdOrNutritionist_Id(id, id);
        nutritionistDietPlanRepository.deleteReferencingUser(id);
        dietPlanRepository.deleteByUserId(id);
        appointmentRepository.deleteByUserId(id);
        appointmentRepository.deleteByNutritionistId(id);
        progressLogRepository.deleteByUserId(id);
        notificationRepository.deleteByUserIdOrSenderId(id, id);
        walletTransactionRepository.deleteByInitiatorIdOrRecipientId(id, id);
        walletTransactionRepository.deleteBySourceWallet_User_IdOrTargetWallet_User_Id(id, id);
        testimonialRepository.deleteByUserId(id);
        verificationTokenRepository.deleteByUser_Id(id);
        passwordResetTokenRepository.deleteByUser_Id(id);
        walletRepository.deleteByUserId(id);

        if (userEmail != null) {
            DietPlanController.purgePlansByAuthor(id, userEmail);
        }

        nutritionistProfileRepository.findByUserId(id).ifPresent(nutritionistProfileRepository::delete);
        userProfileRepository.findByUserId(id).ifPresent(userProfileRepository::delete);
        userRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping({"/nutritionists/{id}/approve", "/nutritionists/{id}/verify", "/nutritionists/{id}/verify"})
    public ResponseEntity<Map<String, Object>> approveNutritionist(@org.springframework.security.core.annotation.AuthenticationPrincipal com.nutrition.security.CustomUserDetails adminDetails, @PathVariable Long id) {
        User user = userRepository.findById(id).orElse(null);
        if (user != null) {
            user.setVerified(true);
            userRepository.save(user);
        }

        NutritionistProfile profile = nutritionistProfileRepository.findByUserId(id).orElse(null);
        if (profile == null && user != null) {
            profile = new NutritionistProfile();
            profile.setUser(user);
            profile.setCredentials("Certified Clinical Nutritionist");
            profile.setSpecialization("Clinical & Medical Nutrition");
            profile.setLicenseNumber("RD-84920-IN");
        }

        if (profile != null) {
            profile.setApprovalStatus("APPROVED");
            nutritionistProfileRepository.save(profile);
        }
        notificationService.notifyUser(user, actorId(adminDetails), "Profile Verified",
                "Congratulations! Your nutritionist credentials have been verified. Your profile now shows as verified to clients.",
                "SYSTEM", "verified", "/dashboard/nutritionist/profile");

        return ResponseEntity.ok(Map.of(
            "message", "Nutritionist verified & approved successfully!",
            "id", id,
            "verified", true,
            "approvalStatus", "APPROVED"
        ));
    }

    @PutMapping({"/nutritionists/{id}/revoke", "/nutritionists/{id}/revoke"})
    public ResponseEntity<Map<String, Object>> revokeNutritionist(@org.springframework.security.core.annotation.AuthenticationPrincipal com.nutrition.security.CustomUserDetails adminDetails, @PathVariable Long id) {
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
        notificationService.notifyUser(user, actorId(adminDetails), "Verification Revoked",
                "Your nutritionist verification was revoked and your profile is back under review. Please check that your credentials and license details are up to date.",
                "SYSTEM", "gpp_maybe", "/dashboard/nutritionist/profile");

        return ResponseEntity.ok(Map.of(
            "message", "Nutritionist verification revoked",
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

            // Safety guard: prevent accidental deletion of shared cloud database or core tables
            if (upperQuery.contains("DROP DATABASE") || upperQuery.contains("DROP SCHEMA")
                    || upperQuery.startsWith("DROP TABLE") || upperQuery.contains("DROP TABLE")
                    || upperQuery.startsWith("TRUNCATE")) {
                result.put("success", false);
                result.put("error", "Destructive DDL operations (DROP DATABASE/TABLE, TRUNCATE) are disabled to protect shared database integrity.");
                return ResponseEntity.ok(result);
            }

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

    /**
     * STEP 2.1: Admin Allocation Endpoint (POST /api/admin/allocate)
     * Admin allocates funds to a User or Nutritionist.
     * Creates a single unique ledger entry of type "admin_allocation", updates recipient's balance, and triggers SSE.
     */
    @PostMapping("/allocate")
    public ResponseEntity<Map<String, Object>> allocateFunds(
            @org.springframework.security.core.annotation.AuthenticationPrincipal com.nutrition.security.CustomUserDetails userDetails,
            @RequestBody Map<String, Object> payload) {
        Long recipientId = payload.get("recipientId") != null
                ? Long.valueOf(payload.get("recipientId").toString())
                : (payload.get("receiver_id") != null ? Long.valueOf(payload.get("receiver_id").toString()) : null);
        java.math.BigDecimal amount = payload.get("amount") != null
                ? new java.math.BigDecimal(payload.get("amount").toString())
                : java.math.BigDecimal.ZERO;
        String notes = payload.get("notes") != null ? payload.get("notes").toString() : null;

        if (recipientId == null || amount.compareTo(java.math.BigDecimal.ZERO) <= 0) {
            return ResponseEntity.badRequest().body(Map.of("message", "recipientId and positive amount are required"));
        }

        Long adminId = (userDetails != null && userDetails.getId() != null) ? userDetails.getId() : null;
        return ResponseEntity.ok(walletService.adminAllocate(adminId, recipientId, amount, notes));
    }

    /**
     * Handles request to actor id.
     */
    private static Long actorId(com.nutrition.security.CustomUserDetails details) {
        return details != null ? details.getId() : null;
    }
}
