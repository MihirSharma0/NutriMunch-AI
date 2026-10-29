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
 * Low-level Mail Dispatch Service.
Wraps JavaMailSender to execute asynchronous SMTP email delivery.
 */
@Service
public class MailService {
    
    @Value("${app.frontend.login-url}")
    private String loginUrl;

    @Value("${google.script.url}")
    private String scriptUrl;

    @Value("${google.script.api-key}")
    private String scriptApiKey;

    @Autowired
    private RestTemplate restTemplate;

    // Base frontend URL derived from the configured login URL (e.g. https://app.example.com/login -> https://app.example.com)
    private String frontendUrl() {
        return loginUrl.replaceAll("/login/?$", "").replaceAll("/$", "");
    }

    /**
     * Executes send verification email operation.
     */
    @Async
    public void sendVerificationEmail(String to, String token) {
        String link = frontendUrl() + "/verify?token=" + token;
        sendWebhook(to, "verification_link", link);
    }
    
    /**
     * Executes send password reset email operation.
     */
    @Async
    public void sendPasswordResetEmail(String to, String token) {
        String link = frontendUrl() + "/reset-password?token=" + token;
        sendWebhook(to, "password_reset", link);
    }

    /**
     * Executes send webhook operation.
     */
    private void sendWebhook(String toEmail, String type, String link) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            Map<String, String> body = new HashMap<>();
            body.put("apiKey", scriptApiKey);
            body.put("email", toEmail);
            body.put("type", type);
            body.put("link", link);

            HttpEntity<Map<String, String>> request = new HttpEntity<>(body, headers);
            restTemplate.postForEntity(scriptUrl, request, String.class);
        } catch (Exception e) {
            System.err.println("Failed to send Mail Webhook (" + type + "): " + e.getMessage());
        }
    }
}
