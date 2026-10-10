package com.nutrition.service;

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
import java.util.Random;
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

@Service
@RequiredArgsConstructor
public class AuthService {

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

    public String authenticateUser(LoginRequest loginRequest) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(loginRequest.getEmail(), loginRequest.getPassword()));

        SecurityContextHolder.getContext().setAuthentication(authentication);
        return jwtUtils.generateJwtToken(authentication);
    }

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
                Map.class
            );

            Map<String, Object> payload = response.getBody();
            if (payload != null && payload.containsKey("email")) {
                String email = (String) payload.get("email");
                String firstName = (String) payload.get("given_name");
                String lastName = (String) payload.get("family_name");

                User user = userRepository.findByEmail(email).orElse(null);
                
                if (user == null) {
                    if (roleStr == null || roleStr.isBlank()) {
                        throw new com.nutrition.exception.RoleRequiredException("Role selection required for new Google login");
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
                        profile.setCredentials(request.getCredentials() != null && !request.getCredentials().isBlank() ? request.getCredentials() : "N/A");
                        profile.setSpecialization(request.getSpecialization() != null && !request.getSpecialization().isBlank() ? request.getSpecialization() : "General");
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
                Authentication authentication = new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
                SecurityContextHolder.getContext().setAuthentication(authentication);
                
                return jwtUtils.generateJwtToken(authentication);
            } else {
                throw new RuntimeException("Failed to retrieve email from Google.");
            }
        } catch (com.nutrition.exception.RoleRequiredException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("Google authentication failed: " + (e.getMessage() != null ? e.getMessage() : "Unknown error"));
        }
    }

    public void registerUser(RegisterRequest signUpRequest) {
        if (userRepository.existsByEmail(signUpRequest.getEmail())) {
            User existingUser = userRepository.findByEmail(signUpRequest.getEmail()).orElse(null);
            if (existingUser != null) {
                if (existingUser.isVerified()) {
                    throw new RuntimeException("Error: Email is already in use!");
                } else {
                    // User exists but is not verified. Delete the old unverified record so they can register again.
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
            profile.setSpecialization(signUpRequest.getSpecialization() != null ? signUpRequest.getSpecialization() : "General");
            nutritionistProfileRepository.save(profile);
        }

        if (systemSettingService.isOtpEnabled()) {
            String otp = String.format("%06d", new Random().nextInt(999999));
            user.setOtpCode(otp);
            user.setOtpExpiryDate(LocalDateTime.now().plusMinutes(15));
            userRepository.save(user);
            
            try {
                emailService.sendOtpVerificationEmail(user.getEmail(), user.getFirstName(), otp);
            } catch(Exception e) {
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

    public AuthResponse verifyOtp(String email, String otp) {
        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null || user.getOtpCode() == null || !user.getOtpCode().equals(otp)) {
            return null;
        }
        if (user.getOtpExpiryDate() == null || user.getOtpExpiryDate().isBefore(LocalDateTime.now())) {
            return null;
        }
        user.setVerified(true);
        user.setOtpCode(null);
        user.setOtpExpiryDate(null);
        userRepository.save(user);

        try {
            String fullName = user.getFirstName() + (user.getLastName() != null && !user.getLastName().isBlank() ? " " + user.getLastName() : "");
            emailService.sendAccountVerifiedEmail(user.getEmail(), fullName);
        } catch(Exception e) {
            System.err.println("Failed to send account verified email: " + e.getMessage());
        }

        String token = jwtTokenProvider.generateToken(user.getEmail(), user.getRole().name());
        return new AuthResponse(token, user.getId(), user.getEmail(), user.getFirstName(), user.getLastName(), user.getRole().name());
    }

    public void resendOtp(String email) {
        User user = userRepository.findByEmail(email).orElse(null);
        if (user != null && !user.isVerified() && systemSettingService.isOtpEnabled()) {
            String otp = String.format("%06d", new Random().nextInt(999999));
            user.setOtpCode(otp);
            user.setOtpExpiryDate(LocalDateTime.now().plusMinutes(15));
            userRepository.save(user);
            
            try {
                emailService.sendOtpVerificationEmail(user.getEmail(), user.getFirstName(), otp);
            } catch(Exception e) {
                System.err.println("Failed to resend OTP email: " + e.getMessage());
            }
        }
    }

    public boolean changePassword(Long userId, String currentPassword, String newPassword) {
        User user = userRepository.findById(userId).orElseThrow(() -> new RuntimeException("User not found"));
        if (!passwordEncoder.matches(currentPassword, user.getPasswordHash())) {
            return false;
        }
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        return true;
    }

    public void requestPasswordReset(String email) {
        User user = userRepository.findByEmail(email).orElse(null);
        if (user != null) {
            String token = UUID.randomUUID().toString();
            PasswordResetToken resetToken = new PasswordResetToken();
            resetToken.setToken(token);
            resetToken.setUser(user);
            resetToken.setExpiryDate(LocalDateTime.now().plusHours(1));
            passwordResetTokenRepository.save(resetToken);

            mailService.sendPasswordResetEmail(user.getEmail(), token);
        }
    }

    public boolean resetPassword(String token, String newPassword) {
        PasswordResetToken resetToken = passwordResetTokenRepository.findByToken(token).orElse(null);
        if (resetToken == null || resetToken.getExpiryDate().isBefore(LocalDateTime.now())) {
            return false;
        }

        User user = resetToken.getUser();
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        passwordResetTokenRepository.delete(resetToken);
        return true;
    }
}
