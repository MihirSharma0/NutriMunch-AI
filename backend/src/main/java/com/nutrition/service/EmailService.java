package com.nutrition.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

/**
 * Transactional Email Service.
Dispatches templated email notifications including verification OTPs, appointment confirmations, and password reset links.
 */
@Service
public class EmailService {

    @Value("${app.frontend.login-url}")
    private String loginUrl;

    @Value("${google.script.url}")
    private String scriptUrl;

    @Value("${google.script.api-key}")
    private String scriptApiKey;

    @Autowired
    private RestTemplate restTemplate;

    /**
     * Executes send otp verification email operation.
     */
    @Async
    public void sendOtpVerificationEmail(String toEmail, String userName, String otp) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            Map<String, String> body = new HashMap<>();
            body.put("apiKey", scriptApiKey);
            body.put("email", toEmail);
            body.put("userName", userName);
            body.put("otp", otp);
            body.put("type", "verification");
            body.put("loginUrl", loginUrl);

            HttpEntity<Map<String, String>> request = new HttpEntity<>(body, headers);
            restTemplate.postForEntity(scriptUrl, request, String.class);
        } catch (Exception e) {
            // Log the error but do not throw to prevent disrupting the registration flow
            System.err.println("Failed to send OTP webhook: " + e.getMessage());
        }
    }

    /**
     * Executes send account verified email operation.
     */
    @Async
    public void sendAccountVerifiedEmail(String toEmail, String userName) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            Map<String, String> body = new HashMap<>();
            body.put("apiKey", scriptApiKey);
            body.put("email", toEmail);
            body.put("userName", userName);
            body.put("type", "verified");
            body.put("loginUrl", loginUrl);

            HttpEntity<Map<String, String>> request = new HttpEntity<>(body, headers);
            restTemplate.postForEntity(scriptUrl, request, String.class);
        } catch (Exception e) {
            System.err.println("Failed to send Account Verified webhook: " + e.getMessage());
        }
    }
}
