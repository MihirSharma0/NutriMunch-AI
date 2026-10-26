package com.nutrition.controller;

import com.nutrition.dto.ForgotPasswordRequest;
import com.nutrition.dto.JwtResponse;
import com.nutrition.dto.LoginRequest;
import com.nutrition.dto.MessageResponse;
import com.nutrition.dto.RegisterRequest;
import com.nutrition.dto.ResetPasswordRequest;
import com.nutrition.entity.User;
import com.nutrition.repository.UserRepository;
import com.nutrition.security.CustomUserDetails;
import com.nutrition.service.AuthService;
import com.nutrition.dto.GoogleLoginRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final UserRepository userRepository;

    @PostMapping("/login")
    public ResponseEntity<?> authenticateUser(@Valid @RequestBody LoginRequest loginRequest) {
        try {
            String jwt = authService.authenticateUser(loginRequest);
            
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();

            User user = userRepository.findById(userDetails.getId()).orElseThrow();

            return ResponseEntity.ok(new JwtResponse(jwt,
                    userDetails.getId(),
                    userDetails.getUsername(),
                    user.getFirstName(),
                    user.getLastName(),
                    userDetails.getAuthorities().iterator().next().getAuthority()));
        } catch (Exception e) {
            String msg = e.getMessage();
            if (msg == null || msg.isBlank() || msg.equalsIgnoreCase("Bad credentials")) {
                msg = "Incorrect Password";
            }
            return ResponseEntity.badRequest().body(new MessageResponse(msg));
        }
    }

    @PostMapping("/google")
    public ResponseEntity<?> authenticateWithGoogle(@Valid @RequestBody GoogleLoginRequest request) {
        try {
            String jwt = authService.authenticateWithGoogle(request);
            
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();

            User user = userRepository.findById(userDetails.getId()).orElseThrow();

            return ResponseEntity.ok(new JwtResponse(jwt,
                    userDetails.getId(),
                    userDetails.getUsername(),
                    user.getFirstName(),
                    user.getLastName(),
                    userDetails.getAuthorities().iterator().next().getAuthority()));
        } catch (com.nutrition.exception.RoleRequiredException e) {
            return ResponseEntity.status(428).body(new MessageResponse("requires_role"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(new MessageResponse(e.getMessage()));
        }
    }

    @PostMapping("/register")
    public ResponseEntity<?> registerUser(@Valid @RequestBody RegisterRequest signUpRequest) {
        try {
            authService.registerUser(signUpRequest);
            return ResponseEntity.ok(new MessageResponse("User registered successfully! Please check your email to verify your account."));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(new MessageResponse(e.getMessage()));
        }
    }

    @GetMapping("/verify")
    public ResponseEntity<?> verifyEmail(@RequestParam("token") String token) {
        boolean isVerified = authService.verifyEmail(token);
        if (isVerified) {
            return ResponseEntity.ok(new MessageResponse("Email verified successfully!"));
        } else {
            return ResponseEntity.badRequest().body(new MessageResponse("Invalid or expired verification token."));
        }
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        try {
            authService.requestPasswordReset(request.getEmail());
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(new MessageResponse(e.getMessage()));
        }
        return ResponseEntity.ok(new MessageResponse("A password reset link has been sent to your registered email."));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        boolean isReset = authService.resetPassword(request.getToken(), request.getNewPassword());
        if (isReset) {
            return ResponseEntity.ok(new MessageResponse("Password reset successfully!"));
        } else {
            return ResponseEntity.badRequest().body(new MessageResponse("Invalid or expired reset token."));
        }
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<?> verifyOtp(@Valid @RequestBody com.nutrition.dto.OtpVerificationRequest request) {
        com.nutrition.dto.AuthResponse response = authService.verifyOtp(request.getEmail(), request.getOtp());
        if (response != null) {
            return ResponseEntity.ok(response);
        } else {
            return ResponseEntity.badRequest().body(new MessageResponse("Invalid or expired OTP."));
        }
    }

    @PostMapping("/resend-otp")
    public ResponseEntity<?> resendOtp(@RequestParam("email") String email) {
        try {
            authService.resendOtp(email);
            return ResponseEntity.ok(new MessageResponse("If your account exists and is unverified, a new OTP has been sent to your email."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new MessageResponse("Failed to resend OTP."));
        }
    }

    @PostMapping("/change-password")
    public ResponseEntity<?> changePassword(@Valid @RequestBody com.nutrition.dto.ChangePasswordRequest request) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401).body(new MessageResponse("Unauthorized"));
        }
        
        Object principal = authentication.getPrincipal();
        if (!(principal instanceof CustomUserDetails)) {
            return ResponseEntity.status(401).body(new MessageResponse("Unauthorized"));
        }
        
        CustomUserDetails userDetails = (CustomUserDetails) principal;
        boolean isChanged = authService.changePassword(userDetails.getId(), request.getCurrentPassword(), request.getNewPassword());
        if (isChanged) {
            return ResponseEntity.ok(new MessageResponse("Password changed successfully!"));
        } else {
            return ResponseEntity.badRequest().body(new MessageResponse("Invalid current password."));
        }
    }
}
