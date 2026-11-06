package com.nutrition.config;

import com.nutrition.entity.NutritionRule;
import com.nutrition.entity.Role;
import com.nutrition.entity.SystemSetting;
import com.nutrition.entity.User;
import com.nutrition.repository.NutritionRuleRepository;
import com.nutrition.repository.SystemSettingRepository;
import com.nutrition.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.Locale;

/**
 * Application Bootstrap Data Initializer.
 * Seeds baseline system settings, clinical nutrition rules, and the master administrator
 * account on application startup when running against a fresh or unpopulated database.
 */
@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final SystemSettingRepository systemSettingRepository;
    private final NutritionRuleRepository nutritionRuleRepository;

    @Value("${app.admin.email:}")
    private String adminEmail;

    @Value("${app.admin.password:}")
    private String adminPassword;

    /**
     * Executes bootstrapping logic on startup to ensure an administrator account and default
     * configuration rules are provisioned.
     *
     * @param args incoming command-line execution arguments
     */
    @Override
    public void run(String... args) {
        initSystemSettings();
        initNutritionRules();
        initAdminAccount();
    }

    private void initSystemSettings() {
        if (systemSettingRepository.findBySettingKey("OTP_ENABLED").isEmpty()) {
            SystemSetting setting = new SystemSetting();
            setting.setSettingKey("OTP_ENABLED");
            setting.setSettingValue("true");
            systemSettingRepository.save(setting);
            System.out.println(">>> Initialized default system setting: OTP_ENABLED = true");
        }
    }

    private void initNutritionRules() {
        if (nutritionRuleRepository.count() > 0) {
            return;
        }

        seedRule("multiplier_lightly_active", 1.375, "BMR multiplier for lightly active users");
        seedRule("multiplier_moderately_active", 1.55, "BMR multiplier for moderately active users");
        seedRule("multiplier_very_active", 1.725, "BMR multiplier for very active users");
        seedRule("multiplier_highly_active", 1.9, "BMR multiplier for highly active athletes");
        seedRule("multiplier_sedentary", 1.2, "BMR multiplier for sedentary users");

        seedRule("goal_weight_loss_adj", -500.0, "Calorie adjustment for weight loss");
        seedRule("goal_muscle_gain_adj", 500.0, "Calorie adjustment for muscle gain");
        seedRule("goal_strength_adj", 300.0, "Calorie adjustment for strength performance");
        seedRule("goal_maintenance_adj", 0.0, "Calorie adjustment for maintenance");

        seedRule("macro_protein_pct_default", 0.30, "Default protein percentage (30%)");
        seedRule("macro_carbs_pct_default", 0.40, "Default carbs percentage (40%)");
        seedRule("macro_fats_pct_default", 0.30, "Default fats percentage (30%)");

        seedRule("macro_protein_pct_muscle", 0.35, "Protein percentage for muscle gain (35%)");
        seedRule("macro_carbs_pct_muscle", 0.45, "Carbs percentage for muscle gain (45%)");
        seedRule("macro_fats_pct_muscle", 0.20, "Fats percentage for muscle gain (20%)");

        seedRule("water_multiplier_liters_per_kg", 0.033, "Liters of water per kg of body weight");
        seedRule("fiber_grams_per_1000_kcal", 14.0, "Grams of fiber per 1000 calories");

        System.out.println(">>> Seeded default clinical nutrition rules.");
    }

    private void seedRule(String key, Double value, String description) {
        if (nutritionRuleRepository.findByRuleKey(key).isEmpty()) {
            NutritionRule rule = new NutritionRule();
            rule.setRuleKey(key);
            rule.setRuleValue(value);
            rule.setDescription(description);
            nutritionRuleRepository.save(rule);
        }
    }

    private void initAdminAccount() {
        if (adminEmail == null || adminEmail.isBlank() || adminPassword == null || adminPassword.isBlank()) {
            System.out.println(">>> Admin bootstrap skipped: ADMIN_EMAIL and ADMIN_PASSWORD must both be configured on the backend service.");
            return;
        }
        createOrUpdateAdmin(adminEmail.trim().toLowerCase(Locale.ROOT), adminPassword);
    }

    /**
     * Creates or updates the administrator account with encrypted credentials and ADMIN role.
     *
     * @param email administrator email address
     * @param password raw administrator password to hash and persist
     */
    private void createOrUpdateAdmin(String email, String password) {
        User admin = userRepository.findByEmail(email)
                .orElseGet(() -> userRepository.findAll().stream()
                        .filter(user -> user.getEmail() != null
                                && user.getEmail().equalsIgnoreCase(email))
                        .findFirst()
                        .orElse(null));

        if (admin == null) {
            admin = new User();
            admin.setEmail(email);
            admin.setFirstName("System");
            admin.setLastName("Admin");
            admin.setPasswordHash(passwordEncoder.encode(password));
            admin.setRole(Role.ADMIN);
            admin.setVerified(true);
            userRepository.save(admin);
            System.out.println(">>> Created configured Admin account.");
        } else {
            admin.setPasswordHash(passwordEncoder.encode(password));
            admin.setRole(Role.ADMIN);
            admin.setVerified(true);
            userRepository.save(admin);
            System.out.println(">>> Updated configured Admin account credentials.");
        }
    }
}
