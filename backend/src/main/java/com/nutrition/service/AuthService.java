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

    /** Expected, actionable credential outcomes (kept as they were before C1). */
    public static final String PROFILE_NOT_FOUND_MESSAGE = "Profile/E-Mail Id Doesn't Exist. Please Create One";
    public static final String INCORRECT_PASSWORD_MESSAGE = "Incorrect Password";
    public static final String UNVERIFIED_MESSAGE = "Please verify your email before logging in.";

    /** Generic message shown only for unexpected backend failures. */
    public static final String INVALID_CREDENTIALS_MESSAGE = "Invalid Username/Password";

    /** Marks an expected credential outcome; anything else is an unexpected error. */
    public static class CredentialException extends RuntimeException {
        public CredentialException(String message) {
            super(message);
        }
    }

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    /** Failed OTP attempts per email, retained only for a bounded window. */
    private static final java.util.Map<String, OtpAttempts> OTP_ATTEMPTS = new java.util.concurrent.ConcurrentHashMap<>();
    private static final int MAX_OTP_ATTEMPTS = 5;
    /** A lock-out window expires after 15 minutes, matching the OTP lifetime. */
    private static final long OTP_ATTEMPT_WINDOW_MILLIS = 15L * 60L * 1000L;
    /** Hard cap on tracked emails so the in-memory map cannot grow without bound. */
    private static final int MAX_TRACKED_EMAILS = 10000;

    /** One email's failed-attempt count and the start of its window. */
    private static final class OtpAttempts {
        private int count;
        private long windowStartMillis;
    }

    /** Returns the current (non-expired) failed-attempt count for an email. */
    private static int currentOtpAttempts(String email) {
        OtpAttempts entry = OTP_ATTEMPTS.get(email);
        if (entry == null) return 0;
        if (System.currentTimeMillis() - entry.windowStartMillis >= OTP_ATTEMPT_WINDOW_MILLIS) {
            OTP_ATTEMPTS.remove(email);
            return 0;
        }
        return entry.count;
    }

    /** Records one failed attempt, evicting stale entries so the map stays bounded. */
    private static int recordOtpFailure(String email) {
        long now = System.currentTimeMillis();
        if (OTP_ATTEMPTS.size() >= MAX_TRACKED_EMAILS) {
            // First drop expired windows. If every entry is still fresh, drop the
            // oldest ones so a burst of distinct emails cannot grow the map.
            OTP_ATTEMPTS.entrySet().removeIf(e ->
                now - e.getValue().windowStartMillis >= OTP_ATTEMPT_WINDOW_MILLIS);
            if (OTP_ATTEMPTS.size() >= MAX_TRACKED_EMAILS) {
                int excess = OTP_ATTEMPTS.size() - MAX_TRACKED_EMAILS + 1;
                OTP_ATTEMPTS.entrySet().stream()
                    .sorted(java.util.Comparator.comparingLong(e -> e.getValue().windowStartMillis))
                    .limit(excess)
                    .map(java.util.Map.Entry::getKey)
                    .toList()
                    .forEach(OTP_ATTEMPTS::remove);
            }
        }
        OtpAttempts entry = OTP_ATTEMPTS.compute(email, (k, existing) -> {
            OtpAttempts fresh = (existing == null
                || now - existing.windowStartMillis >= OTP_ATTEMPT_WINDOW_MILLIS)
                ? new OtpAttempts() : existing;
            if (fresh.count == 0) fresh.windowStartMillis = now;
            fresh.count++;
            return fresh;
        });
        return entry.count;
    }

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
    private final RestTemplate restTemplate;

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
            throw new CredentialException(PROFILE_NOT_FOUND_MESSAGE);
        }

        if (!passwordEncoder.matches(loginRequest.getPassword(), user.getPasswordHash())) {
            throw new CredentialException(INCORRECT_PASSWORD_MESSAGE);
        }
        if (!user.isVerified()) {
            throw new CredentialException(UNVERIFIED_MESSAGE);
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
                String fullName = (String) payload.get("name");
                String[] nameParts = fullName == null || fullName.isBlank()
                        ? new String[0]
                        : fullName.trim().split("\\s+", 2);
                if ((firstName == null || firstName.isBlank()) && nameParts.length > 0) {
                    firstName = nameParts[0];
                }
                if ((lastName == null || lastName.isBlank()) && nameParts.length > 1) {
                    lastName = nameParts[1];
                }

                User user = userRepository.findByEmail(email).orElse(null);

                if (user == null) {
                    if (roleStr == null || roleStr.isBlank()) {
                        throw new com.nutrition.exception.RoleRequiredException(
                                "Role selection required for new Google login",
                                firstName != null ? firstName : "User",
                                lastName != null ? lastName : "");
                    }

                    Role selectedRole = selfServiceRole(roleStr);
                    if (selectedRole == Role.NUTRITIONIST) {
                        validateNutritionistGoogleOnboarding(request);
                    }

                    user = new User();
                    user.setEmail(email);
                    user.setFirstName(!isBlank(request.getFirstName())
                            ? request.getFirstName().trim()
                            : (firstName != null ? firstName : "User"));
                    user.setLastName(!isBlank(request.getLastName())
                            ? request.getLastName().trim()
                            : (lastName != null ? lastName : ""));
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
                        profile.setLicenseNumber(request.getLicenseNumber());
                        profile.setYearsOfExperience(request.getYearsOfExperience());
                        profile.setConsultationFee(request.getConsultationFee());
                        profile.setLanguages(request.getLanguages());
                        profile.setAge(request.getAge());
                        profile.setGender(request.getGender());
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

    private void validateNutritionistGoogleOnboarding(GoogleLoginRequest request) {
        if (isBlank(request.getFirstName()) || isBlank(request.getLastName())
                || request.getAge() == null || request.getAge() < 18 || request.getAge() > 120
                || isBlank(request.getGender())) {
            throw new IllegalArgumentException("Complete the required name, age, and gender fields.");
        }
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
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

        Role userRole = selfServiceRole(signUpRequest.getRole());
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

        int attempts = currentOtpAttempts(normalizedEmail);
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
            int newAttempts = recordOtpFailure(normalizedEmail);
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

    /**
     * Resolves the role a caller may assign to themselves during open sign-up.
     *
     * <p>Both the registration endpoint and the Google sign-in endpoint accept a role from
     * the client, so without this guard a crafted request could create an administrator
     * account. Self-service sign-up is therefore limited to {@link Role#USER} and
     * {@link Role#NUTRITIONIST}; an ADMIN request is downgraded to USER and logged.
     * Administrator and role changes continue to be performed by an authenticated
     * administrator through the existing admin endpoints.
     *
     * @param requestedRole raw role value supplied by the client, possibly null or invalid
     * @return a safe role for self-service sign-up
     */
    private static Role selfServiceRole(String requestedRole) {
        if (requestedRole == null || requestedRole.isBlank()) {
            return Role.USER;
        }
        try {
            Role parsed = Role.valueOf(requestedRole.trim().toUpperCase());
            if (parsed == Role.ADMIN) {
                System.err.println("Rejected self-service ADMIN sign-up; assigning USER instead.");
                return Role.USER;
            }
            return parsed;
        } catch (IllegalArgumentException e) {
            return Role.USER;
        }
    }
}
