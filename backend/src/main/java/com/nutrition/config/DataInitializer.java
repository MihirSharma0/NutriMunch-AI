package com.nutrition.config;

import com.nutrition.entity.Role;
import com.nutrition.entity.User;
import com.nutrition.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.Locale;

/**
 * Application Bootstrap Data Initializer.
 * Seeds or synchronizes the master administrator account on application startup.
 */
@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.admin.email:}")
    private String adminEmail;

    @Value("${app.admin.password:}")
    private String adminPassword;

    /**
     * Executes bootstrapping logic on startup to ensure an administrator account is provisioned.
     *
     * @param args incoming command-line execution arguments
     */
    @Override
    public void run(String... args) {
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
