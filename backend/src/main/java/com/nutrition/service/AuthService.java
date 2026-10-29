package com.nutrition.service;

import com.nutrition.dto.AuthResponse;
import com.nutrition.dto.LoginRequest;
import com.nutrition.dto.RegisterRequest;
import com.nutrition.entity.NutritionistProfile;
import com.nutrition.entity.PasswordResetToken;
import com.nutrition.entity.Role;
import com.nutrition.entity.User;
import com.nutrition.entity.VerificationToken;
import com.nutrition.repository.NutritionistProfileRepository;
import com.nutrition.repository.PasswordResetTokenRepository;
import com.nutrition.repository.UserRepository;
import com.nutrition.repository.VerificationTokenRepository;
import com.nutrition.repository.UserProfileRepository;
import com.nutrition.entity.UserProfile;
import com.nutrition.security.JwtUtils;
import com.nutrition.dto.GoogleLoginRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.UUID;
import java.util.Locale;
import java.security.SecureRandom;
import java.util.Collections;
import java.util.Map;
import org.springframework.dao.DataIntegrityViolationException;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestTemplate;
import com.nutrition.security.CustomUserDetails;

/**
 * Authentication and Security Service.
Handles user credential validation, password hashing, JWT token issuance, OTP verification, and Google OAuth SSO.
 */
@Service
@RequiredArgsConstructor
public class AuthService {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final java.util.Map<String, Integer> OTP_ATTEMPTS = new java.util.concurrent.ConcurrentHashMap<>();
    private static final int MAX_OTP_ATTEMPTS = 5;

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final VerificationTokenRepository verificationTokenRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final NutritionistProfileRepository nutritionistProfileRepository;
    private final UserProfileRepository userProfileRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtils jwtUtils;
    private final MailService mailService;
    private final EmailService emailService;
    private final SystemSettingService systemSettingService;

    @Value("${google.client.id}")
    private String googleClientId;

    /**
     * Executes authenticate user operation.
     */
    public String authenticateUser(LoginRequest loginRequest) {
        String cleanEmail = loginRequest.getEmail() != null
                ? loginRequest.getEmail().trim().toLowerCase(Locale.ROOT)
                : "";
        User user = userRepository.findByEmail(cleanEmail)
                .orElseGet(() -> userRepository.findAll().stream()
                        .filter(u -> u.getEmail() != null && u.getEmail().trim().equalsIgnoreCase(cleanEmail))
                        .findFirst().orElse(null));

        if (user == null) {
            throw new RuntimeException("Profile/E-Mail Id Doesn't Exist. Please Create One");
        }

        if (!passwordEncoder.matches(loginRequest.getPassword(), user.getPasswordHash())) {
            throw new RuntimeException("Incorrect Password");
        }
        if (!user.isVerified()) {
            throw new RuntimeException(
                    "Please verify your email before logging in.");
        }

        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(user.getEmail(), loginRequest.getPassword()));

        SecurityContextHolder.getContext().setAuthentication(authentication);
        return jwtUtils.generateJwtToken(authentication);
    }

    /**
     * Executes authenticate with google operation.
     */
    public String authenticateWithGoogle(GoogleLoginRequest request) {
        String accessToken = request.getCredential();
        String roleStr = request.getRole();
        try {
            RestTemplate restTemplate = new RestTemplate();
            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(accessToken);
            HttpEntity<String> entity = new HttpEntity<>("", headers);

            ResponseEntity<Map> response = restTemplate.exchange(
                    "https://www.googleapis.com/oauth2/v3/userinfo",
                    HttpMethod.GET,
                    entity,
                    Map.class);

            Map<String, Object> payload = response.getBody();
            if (payload != null && payload.containsKey("email")) {
                String email = (String) payload.get("email");
                String firstName = (String) payload.get("given_name");
                String lastName = (String) payload.get("family_name");

                User user = userRepository.findByEmail(email).orElse(null);

                if (user == null) {
                    if (roleStr == null || roleStr.isBlank()) {
                        throw new com.nutrition.exception.RoleRequiredException(
                                "Role selection required for new Google login");
                    }

                    Role selectedRole;
                    try {
                        selectedRole = Role.valueOf(roleStr.toUpperCase());
                    } catch (IllegalArgumentException e) {
                        selectedRole = Role.USER;
                    }

                    user = new User();
                    user.setEmail(email);
                    user.setFirstName(firstName != null ? firstName : "User");
                    user.setLastName(lastName != null ? lastName : "");
                    user.setPasswordHash(passwordEncoder.encode(UUID.randomUUID().toString()));
                    user.setRole(selectedRole);
                    user.setVerified(true);
                    user = userRepository.save(user);

                    if (selectedRole == Role.NUTRITIONIST) {
                        NutritionistProfile profile = new NutritionistProfile();
                        profile.setUser(user);
                        profile.setCredentials(request.getCredentials() != null && !request.getCredentials().isBlank()
                                ? request.getCredentials()
                                : "N/A");
                        profile.setSpecialization(
                                request.getSpecialization() != null && !request.getSpecialization().isBlank()
                                        ? request.getSpecialization()
                                        : "General");
                        nutritionistProfileRepository.save(profile);
                    } else if (selectedRole == Role.USER) {
                        UserProfile profile = new UserProfile();
                        profile.setUser(user);
                        profile.setAge(request.getAge());
                        profile.setGender(request.getGender() != null ? request.getGender() : "Not Specified");
                        profile.setHeightCm(request.getHeightCm() != null ? request.getHeightCm() : 170.0);
                        profile.setWeightKg(request.getWeightKg() != null ? request.getWeightKg() : 70.0);
                        profile.setGoal(request.getGoal() != null ? request.getGoal() : "Maintenance");
                        profile.setActivityLevel("Moderate"); // default
                        profile.setDietaryPreferences("None"); // default
                        userProfileRepository.save(profile);
                    }
                }

                CustomUserDetails userDetails = new CustomUserDetails(user);
                Authentication authentication = new UsernamePasswordAuthenticationToken(userDetails, null,
                        userDetails.getAuthorities());
                SecurityContextHolder.getContext().setAuthentication(authentication);

                return jwtUtils.generateJwtToken(authentication);
            } else {
                throw new RuntimeException("Failed to retrieve email from Google.");
            }
        } catch (com.nutrition.exception.RoleRequiredException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException(
                    "Google authentication failed: " + (e.getMessage() != null ? e.getMessage() : "Unknown error"));
        }
    }

    /**
     * Executes register user operation.
     */
    public void registerUser(RegisterRequest signUpRequest) {
        if (userRepository.existsByEmail(signUpRequest.getEmail())) {
            User existingUser = userRepository.findByEmail(signUpRequest.getEmail()).orElse(null);
            if (existingUser != null) {
                if (existingUser.isVerified()) {
                    throw new RuntimeException("Error: Email is already in use!");
                } else {
                    // User exists but is not verified. Delete the old unverified record so they can
                    // register again.
                    // Cascading will handle related tokens or profiles.
                    userRepository.delete(existingUser);
                    userRepository.flush(); // ensure deletion before inserting new record with same email
                }
            }
        }

        User user = new User();
        user.setFirstName(signUpRequest.getFirstName());
        user.setLastName(signUpRequest.getLastName());
        user.setEmail(signUpRequest.getEmail());
        user.setPasswordHash(passwordEncoder.encode(signUpRequest.getPassword()));

        Role userRole = Role.USER;
        if (signUpRequest.getRole() != null) {
            try {
                userRole = Role.valueOf(signUpRequest.getRole().toUpperCase());
            } catch (IllegalArgumentException e) {
                userRole = Role.USER;
            }
        }
        user.setRole(userRole);
        user.setVerified(false);

        try {
            user = userRepository.save(user);
        } catch (DataIntegrityViolationException e) {
            throw new RuntimeException("Error: Email is already in use!");
        }

        if (userRole == Role.NUTRITIONIST) {
            NutritionistProfile profile = new NutritionistProfile();
            profile.setUser(user);
            profile.setCredentials(signUpRequest.getCredentials() != null ? signUpRequest.getCredentials() : "N/A");
            profile.setSpecialization(
                    signUpRequest.getSpecialization() != null ? signUpRequest.getSpecialization() : "General");
            nutritionistProfileRepository.save(profile);
        }

        if (systemSettingService.isOtpEnabled()) {
            String otp = String.format("%06d", SECURE_RANDOM.nextInt(1_000_000));
            user.setOtpCode(otp);
            user.setOtpExpiryDate(LocalDateTime.now().plusMinutes(15));
            userRepository.save(user);

            try {
                emailService.sendOtpVerificationEmail(user.getEmail(), user.getFirstName(), otp);
            } catch (Exception e) {
                System.err.println("Failed to send OTP email: " + e.getMessage());
            }
        } else {
            // Generate Verification Token
            String token = UUID.randomUUID().toString();
            VerificationToken verificationToken = new VerificationToken();
            verificationToken.setToken(token);
            verificationToken.setUser(user);
            verificationToken.setExpiryDate(LocalDateTime.now().plusHours(24));
            verificationTokenRepository.save(verificationToken);

            mailService.sendVerificationEmail(user.getEmail(), token);
        }
    }

    /**
     * Executes verify email operation.
     */
    public boolean verifyEmail(String token) {
        VerificationToken verificationToken = verificationTokenRepository.findByToken(token).orElse(null);
        if (verificationToken == null || verificationToken.getExpiryDate().isBefore(LocalDateTime.now())) {
            return false;
        }

        User user = verificationToken.getUser();
        user.setVerified(true);
        userRepository.save(user);
        verificationTokenRepository.delete(verificationToken);
        return true;
    }

    /**
     * Executes verify otp operation.
     */
    public AuthResponse verifyOtp(String email, String otp) {
        if (email == null) {
            return null;
        }
        String normalizedEmail = email.toLowerCase().trim();

        int attempts = OTP_ATTEMPTS.getOrDefault(normalizedEmail, 0);
        if (attempts >= MAX_OTP_ATTEMPTS) {
            User user = userRepository.findByEmail(normalizedEmail).orElse(null);
            if (user != null && user.getOtpCode() != null) {
                user.setOtpCode(null);
                user.setOtpExpiryDate(null);
                userRepository.save(user);
            }
            return null;
        }

        User user = userRepository.findByEmail(normalizedEmail).orElse(null);
        if (user == null || user.getOtpCode() == null || !user.getOtpCode().equals(otp)) {
            int newAttempts = attempts + 1;
            OTP_ATTEMPTS.put(normalizedEmail, newAttempts);
            if (newAttempts >= MAX_OTP_ATTEMPTS && user != null) {
                user.setOtpCode(null);
                user.setOtpExpiryDate(null);
                userRepository.save(user);
            }
            return null;
        }
        if (user.getOtpExpiryDate() == null || user.getOtpExpiryDate().isBefore(LocalDateTime.now())) {
            return null;
        }

        // On successful verification, clear failed attempt counter
        OTP_ATTEMPTS.remove(normalizedEmail);
        user.setVerified(true);
        user.setOtpCode(null);
        user.setOtpExpiryDate(null);
        userRepository.save(user);

        try {
            String fullName = user.getFirstName()
                    + (user.getLastName() != null && !user.getLastName().isBlank() ? " " + user.getLastName() : "");
            emailService.sendAccountVerifiedEmail(user.getEmail(), fullName);
        } catch (Exception e) {
            System.err.println("Failed to send account verified email: " + e.getMessage());
        }

        String token = jwtUtils.generateTokenFromUsername(user.getEmail(), user.getRole().name(), user.getId());
        return new AuthResponse(token, user.getId(), user.getEmail(), user.getFirstName(), user.getLastName(),
                user.getRole().name());
    }

    /**
     * Executes resend otp operation.
     */
    public void resendOtp(String email) {
        if (email != null) {
            OTP_ATTEMPTS.remove(email.toLowerCase().trim());
        }
        User user = userRepository.findByEmail(email).orElse(null);
        if (user != null && !user.isVerified() && systemSettingService.isOtpEnabled()) {
            String otp = String.format("%06d", SECURE_RANDOM.nextInt(1_000_000));
            user.setOtpCode(otp);
            user.setOtpExpiryDate(LocalDateTime.now().plusMinutes(15));
            userRepository.save(user);

            try {
                emailService.sendOtpVerificationEmail(user.getEmail(), user.getFirstName(), otp);
            } catch (Exception e) {
                System.err.println("Failed to resend OTP email: " + e.getMessage());
            }
        }
    }

    /**
     * Executes change password operation.
     */
    public boolean changePassword(Long userId, String currentPassword, String newPassword) {
        User user = userRepository.findById(userId).orElseThrow(() -> new RuntimeException("User not found"));
        if (!passwordEncoder.matches(currentPassword, user.getPasswordHash())) {
            return false;
        }
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        return true;
    }

    /**
     * Executes request password reset operation.
     */
    public void requestPasswordReset(String email) {
        String normalizedEmail = email.toLowerCase().trim();
        User user = userRepository.findByEmail(normalizedEmail)
                .or(() -> userRepository.findByEmail(email.trim()))
                .orElseThrow(() -> new RuntimeException(
                        "This email is not registered. Please enter the email you signed up with."));

        String token = UUID.randomUUID().toString();
        PasswordResetToken resetToken = new PasswordResetToken();
        resetToken.setToken(token);
        resetToken.setUser(user);
        resetToken.setExpiryDate(LocalDateTime.now().plusHours(1));
        passwordResetTokenRepository.save(resetToken);

        // Always send to the email stored on the account, never the raw input
        mailService.sendPasswordResetEmail(user.getEmail(), token);
    }

    /**
     * Executes reset password operation.
     */
    public boolean resetPassword(String token, String newPassword) {
        PasswordResetToken resetToken = passwordResetTokenRepository.findByToken(token).orElse(null);
        if (resetToken == null || resetToken.getExpiryDate().isBefore(LocalDateTime.now())) {
            return false;
        }

        User user = resetToken.getUser();
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        user.setVerified(true);
        user.setOtpCode(null);
        user.setOtpExpiryDate(null);
        userRepository.save(user);
        passwordResetTokenRepository.delete(resetToken);
        return true;
    }
}
