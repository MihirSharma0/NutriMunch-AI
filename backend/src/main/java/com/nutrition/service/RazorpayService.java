package com.nutrition.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.math.BigDecimal;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@Slf4j
public class RazorpayService {

    @Value("${razorpay.key-id:rzp_test_TpZmiL9G36VVd4}")
    private String keyId;

    @Value("${razorpay.key-secret:TW253Q6QppcSG3oEIFyr3fhx}")
    private String keySecret;

    public String getKeyId() {
        return keyId;
    }

    /**
     * Create Razorpay Order for Test Mode Simulation
     */
    public Map<String, Object> createOrder(BigDecimal amountInRupees, String receipt, Map<String, String> notes) {
        long amountInPaise = amountInRupees.multiply(BigDecimal.valueOf(100)).longValue();
        String orderId = null;

        try {
            URL url = new URL("https://api.razorpay.com/v1/orders");
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setConnectTimeout(5000);
            conn.setReadTimeout(5000);
            conn.setRequestProperty("Content-Type", "application/json");

            String auth = keyId + ":" + keySecret;
            String encodedAuth = Base64.getEncoder().encodeToString(auth.getBytes(StandardCharsets.UTF_8));
            conn.setRequestProperty("Authorization", "Basic " + encodedAuth);
            conn.setDoOutput(true);

            String jsonPayload = String.format("{\"amount\":%d,\"currency\":\"INR\",\"receipt\":\"%s\"}",
                    amountInPaise, receipt != null ? receipt : "rcpt_" + System.currentTimeMillis());

            try (OutputStream os = conn.getOutputStream()) {
                os.write(jsonPayload.getBytes(StandardCharsets.UTF_8));
            }

            int responseCode = conn.getResponseCode();
            if (responseCode >= 200 && responseCode < 300) {
                try (BufferedReader br = new BufferedReader(new InputStreamReader(conn.getInputStream(), StandardCharsets.UTF_8))) {
                    StringBuilder response = new StringBuilder();
                    String line;
                    while ((line = br.readLine()) != null) {
                        response.append(line);
                    }
                    Pattern idPattern = Pattern.compile("\"id\"\\s*:\\s*\"([^\"]+)\"");
                    Matcher matcher = idPattern.matcher(response.toString());
                    if (matcher.find()) {
                        orderId = matcher.group(1);
                    }
                }
            } else {
                log.warn("Razorpay API returned code: {}, falling back to simulated test order", responseCode);
            }
        } catch (Exception e) {
            log.warn("Could not reach Razorpay live endpoint ({}). Generating simulated test order ID.", e.getMessage());
        }

        if (orderId == null || orderId.trim().isEmpty()) {
            orderId = "order_test_" + UUID.randomUUID().toString().replace("-", "").substring(0, 14);
        }

        Map<String, Object> orderDetails = new HashMap<>();
        orderDetails.put("orderId", orderId);
        orderDetails.put("amount", amountInPaise);
        orderDetails.put("amountInRupees", amountInRupees);
        orderDetails.put("currency", "INR");
        orderDetails.put("keyId", keyId);
        orderDetails.put("receipt", receipt);
        return orderDetails;
    }

    /**
     * Verify payment signature
     */
    public boolean verifySignature(String orderId, String paymentId, String signature) {
        if (signature == null || signature.trim().isEmpty()) {
            return false;
        }
        try {
            String data = orderId + "|" + paymentId;
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(keySecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] hash = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString().equalsIgnoreCase(signature);
        } catch (Exception e) {
            log.error("Signature verification failed", e);
            return false;
        }
    }
}
