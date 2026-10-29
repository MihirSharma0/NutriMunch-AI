package com.nutrition.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@Service
@Slf4j
public class WalletSseService {

    // 30 minutes timeout for SSE emitter
    private static final Long SSE_TIMEOUT = 30 * 60 * 1000L;

    // Subscriptions keyed by userId
    private final Map<Long, List<SseEmitter>> userEmitters = new ConcurrentHashMap<>();

    // Subscriptions keyed by lowercased email
    private final Map<String, List<SseEmitter>> emailEmitters = new ConcurrentHashMap<>();

    // Subscriptions for admins (to receive live ledger updates)
    private final List<SseEmitter> adminEmitters = new CopyOnWriteArrayList<>();

    public SseEmitter subscribe(Long userId, String email, boolean isAdmin) {
        SseEmitter emitter = new SseEmitter(SSE_TIMEOUT);

        if (userId != null) {
            userEmitters.computeIfAbsent(userId, k -> new CopyOnWriteArrayList<>()).add(emitter);
        }
        if (email != null && !email.isBlank()) {
            emailEmitters.computeIfAbsent(email.trim().toLowerCase(), k -> new CopyOnWriteArrayList<>()).add(emitter);
        }
        if (isAdmin) {
            adminEmitters.add(emitter);
        }

        Runnable cleanup = () -> removeEmitter(userId, email, isAdmin, emitter);
        emitter.onCompletion(cleanup);
        emitter.onTimeout(cleanup);
        emitter.onError(e -> cleanup.run());

        // Send initial connection handshake
        try {
            emitter.send(SseEmitter.event()
                    .name("CONNECTED")
                    .data(Map.of(
                            "status", "CONNECTED",
                            "userId", userId != null ? userId : "",
                            "email", email != null ? email : "",
                            "timestamp", System.currentTimeMillis()
                    )));
        } catch (IOException e) {
            log.warn("Failed to send initial SSE handshake: {}", e.getMessage());
            cleanup.run();
        }

        log.info("SSE subscription established for userId={} email={} isAdmin={}", userId, email, isAdmin);
        return emitter;
    }

    private void removeEmitter(Long userId, String email, boolean isAdmin, SseEmitter emitter) {
        if (userId != null) {
            List<SseEmitter> list = userEmitters.get(userId);
            if (list != null) {
                list.remove(emitter);
                if (list.isEmpty()) userEmitters.remove(userId);
            }
        }
        if (email != null && !email.isBlank()) {
            String lower = email.trim().toLowerCase();
            List<SseEmitter> list = emailEmitters.get(lower);
            if (list != null) {
                list.remove(emitter);
                if (list.isEmpty()) emailEmitters.remove(lower);
            }
        }
        if (isAdmin) {
            adminEmitters.remove(emitter);
        }
    }

    public void sendWalletUpdate(Long userId, String email, Map<String, Object> data) {
        List<SseEmitter> targetEmitters = new CopyOnWriteArrayList<>();

        if (userId != null && userEmitters.containsKey(userId)) {
            targetEmitters.addAll(userEmitters.get(userId));
        }
        if (email != null && !email.isBlank()) {
            String lower = email.trim().toLowerCase();
            if (emailEmitters.containsKey(lower)) {
                for (SseEmitter em : emailEmitters.get(lower)) {
                    if (!targetEmitters.contains(em)) {
                        targetEmitters.add(em);
                    }
                }
            }
        }

        if (targetEmitters.isEmpty()) {
            log.info("No active SSE listeners for userId={} email={}. (Balance updated in database/ledger)", userId, email);
            return;
        }

        // Ensure standardized fields exist in payload
        if (!data.containsKey("timestamp")) {
            data.put("timestamp", java.time.Instant.now().toString());
        }
        if (!data.containsKey("eventType")) {
            data.put("eventType", "WALLET_UPDATED");
        }
        if (!data.containsKey("balance") && data.containsKey("newBalance")) {
            data.put("balance", data.get("newBalance"));
        } else if (!data.containsKey("newBalance") && data.containsKey("balance")) {
            data.put("newBalance", data.get("balance"));
        }

        log.info("Pushing SSE wallet_update to {} listener(s) for userId={} email={}", targetEmitters.size(), userId, email);
        for (SseEmitter emitter : targetEmitters) {
            try {
                emitter.send(SseEmitter.event()
                        .name("wallet_update")
                        .data(data));
                emitter.send(SseEmitter.event()
                        .name("WALLET_UPDATED")
                        .data(data));
                emitter.send(SseEmitter.event()
                        .data(data));
            } catch (Exception e) {
                log.warn("Failed to send SSE wallet update, removing dead emitter: {}", e.getMessage());
                removeEmitter(userId, email, false, emitter);
            }
        }
    }

    /**
     * Pushes a named event to one user's live stream. Reuses the single authenticated
     * /api/wallet/stream connection so the browser does not have to open a second
     * EventSource (HTTP/1.1 allows only a handful per origin).
     */
    public void sendUserEvent(Long userId, String email, String eventName, Object payload) {
        List<SseEmitter> targetEmitters = new CopyOnWriteArrayList<>();

        if (userId != null && userEmitters.containsKey(userId)) {
            targetEmitters.addAll(userEmitters.get(userId));
        }
        if (email != null && !email.isBlank()) {
            List<SseEmitter> byEmail = emailEmitters.get(email.trim().toLowerCase());
            if (byEmail != null) {
                for (SseEmitter em : byEmail) {
                    if (!targetEmitters.contains(em)) {
                        targetEmitters.add(em);
                    }
                }
            }
        }

        for (SseEmitter emitter : targetEmitters) {
            try {
                emitter.send(SseEmitter.event().name(eventName).data(payload));
            } catch (Exception e) {
                log.debug("Dropping dead emitter while pushing {} to userId={}: {}", eventName, userId, e.getMessage());
                removeEmitter(userId, email, false, emitter);
            }
        }
    }

    public void sendWalletUpdate(Long userId, com.nutrition.entity.WalletTransaction transaction, java.math.BigDecimal newBalance, String eventType) {
        Map<String, Object> payload = new java.util.HashMap<>();
        payload.put("eventType", eventType != null ? eventType : "WALLET_UPDATED");
        if (transaction != null) {
            payload.put("transactionId", transaction.getId());
            payload.put("transactionReference", transaction.getTransactionReference());
            payload.put("type", transaction.getTransactionType());
            payload.put("amount", transaction.getAmount());
            payload.put("description", transaction.getNotes() != null ? transaction.getNotes() : "");
        } else {
            payload.put("transactionId", null);
            payload.put("type", eventType != null ? eventType : "WALLET_UPDATED");
            payload.put("amount", java.math.BigDecimal.ZERO);
            payload.put("description", "Wallet balance updated");
        }
        payload.put("balance", newBalance);
        payload.put("newBalance", newBalance);
        payload.put("timestamp", java.time.Instant.now().toString());
        payload.put("recipientId", userId);
        String email = null;
        if (transaction != null && transaction.getRecipient() != null) {
            email = transaction.getRecipient().getEmail();
            payload.put("recipientEmail", email);
        }
        sendWalletUpdate(userId, email, payload);
    }

    public void sendAppointmentUpdate(Long userId, String email, Map<String, Object> data) {
        List<SseEmitter> targetEmitters = new CopyOnWriteArrayList<>();

        if (userId != null && userEmitters.containsKey(userId)) {
            targetEmitters.addAll(userEmitters.get(userId));
        }
        if (email != null && !email.isBlank()) {
            String lower = email.trim().toLowerCase();
            if (emailEmitters.containsKey(lower)) {
                for (SseEmitter em : emailEmitters.get(lower)) {
                    if (!targetEmitters.contains(em)) {
                        targetEmitters.add(em);
                    }
                }
            }
        }

        log.info("Pushing SSE appointment update to {} listener(s) for userId={} email={}", targetEmitters.size(), userId, email);
        for (SseEmitter emitter : targetEmitters) {
            try {
                emitter.send(SseEmitter.event()
                        .name("appointment_updated")
                        .data(data));
                emitter.send(SseEmitter.event()
                        .name("APPOINTMENT_UPDATED")
                        .data(data));
            } catch (Exception e) {
                removeEmitter(userId, email, false, emitter);
            }
        }
    }

    public void broadcastToAdmins(Map<String, Object> data) {
        if (adminEmitters.isEmpty()) return;
        for (SseEmitter emitter : adminEmitters) {
            try {
                emitter.send(SseEmitter.event()
                        .name("ledger_updated")
                        .data(data));
                emitter.send(SseEmitter.event()
                        .name("LEDGER_UPDATED")
                        .data(data));
            } catch (Exception e) {
                adminEmitters.remove(emitter);
            }
        }
    }
}
