package com.nutrition.config;

import com.nutrition.entity.Role;
import com.nutrition.entity.User;
import com.nutrition.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.admin.email:}")
    private String adminEmail;

    @Value("${app.admin.password:}")
    private String adminPassword;

    @Override
    public void run(String... args) {
        if (adminEmail == null || adminEmail.isBlank() || adminPassword == null || adminPassword.isBlank()) {
            System.out.println(">>> Admin bootstrap skipped: configure ADMIN_EMAIL and ADMIN_PASSWORD.");
            return;
        }
        createOrUpdateAdmin(adminEmail.trim(), adminPassword);
    }

    private void createOrUpdateAdmin(String email, String password) {
        if (email == null || email.isBlank())
            return;
        User admin = userRepository.findByEmail(email).orElse(null);

        if (admin == null) {
            admin = new User();
            admin.setEmail(email);
            admin.setFirstName("System");
            admin.setLastName("Admin");
            admin.setPasswordHash(passwordEncoder.encode(password));
            admin.setRole(Role.ADMIN);
            admin.setVerified(true);
            userRepository.save(admin);
            System.out.println(">>> Created configured Admin account: " + email);
        } else {
            admin.setPasswordHash(passwordEncoder.encode(password));
            admin.setRole(Role.ADMIN);
            admin.setVerified(true);
            userRepository.save(admin);
            System.out.println(">>> Updated configured Admin account credentials for: " + email);
        }
    }
}
