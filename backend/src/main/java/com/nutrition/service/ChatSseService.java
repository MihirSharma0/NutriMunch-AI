package com.nutrition.service;

import com.nutrition.dto.ChatMessageDto;
import com.nutrition.dto.ConversationStatusDto;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArraySet;

/**
 * Chat SSE Emitter Service.
Manages active Server-Sent Event (SSE) emitter subscriptions for real-time consultation chat streaming.
 */
@Slf4j
@Service
public class ChatSseService {
    private static final long STREAM_TIMEOUT_MILLIS = 30 * 60 * 1000L;
    private final Map<Long, CopyOnWriteArraySet<Subscriber>> subscribers = new ConcurrentHashMap<>();

    /**
     * Registers a stream for a conversation. Takes plain values rather than a JPA entity so the
     * caller can finish its database work first: nothing may stay checked out for the lifetime
     * of the stream.
     */
    public SseEmitter subscribe(Long conversationId, Long userId, String status) {
        SseEmitter emitter = new SseEmitter(STREAM_TIMEOUT_MILLIS);
        Subscriber subscriber = new Subscriber(userId, emitter);
        subscribers.computeIfAbsent(conversationId, ignored -> new CopyOnWriteArraySet<>()).add(subscriber);
        emitter.onCompletion(() -> remove(conversationId, subscriber));
        emitter.onTimeout(() -> {
            remove(conversationId, subscriber);
            emitter.complete();
        });
        emitter.onError(error -> remove(conversationId, subscriber));
        sendTo(conversationId, subscriber, "connected",
                Map.of("conversationId", conversationId, "status", status == null ? "ACTIVE" : status));
        return emitter;
    }

    /**
     * Executes publish message operation.
     */
    public void publishMessage(Long conversationId, Long patientId, Long nutritionistId, ChatMessageDto message) {
        publish(conversationId, patientId, nutritionistId, "message", message);
    }

    /**
     * Executes publish status operation.
     */
    public void publishStatus(Long conversationId, Long patientId, Long nutritionistId, ConversationStatusDto status) {
        publish(conversationId, patientId, nutritionistId, "status", status);
    }

    /**
     * Ends every stream attached to a conversation (used when it expires) so an open
     * chat window cannot keep receiving events for a session that is no longer usable.
     */
    public void closeConversation(Long conversationId) {
        CopyOnWriteArraySet<Subscriber> listeners = subscribers.remove(conversationId);
        if (listeners == null) return;
        listeners.forEach(listener -> {
            try {
                listener.emitter().complete();
            } catch (Exception ignored) {
                // stream already gone
            }
        });
    }

    /**
     * Executes send keepalives operation.
     */
    @Scheduled(fixedDelay = 15000)
    public void sendKeepalives() {
        subscribers.forEach((conversationId, listeners) -> listeners.forEach(listener -> {
            try {
                listener.emitter().send(SseEmitter.event().comment("keepalive"));
            } catch (IOException | IllegalStateException error) {
                remove(conversationId, listener);
            }
        }));
    }

    /**
     * Executes publish operation.
     */
    private void publish(Long conversationId, Long patientId, Long nutritionistId, String event, Object data) {
        CopyOnWriteArraySet<Subscriber> listeners = subscribers.get(conversationId);
        if (listeners == null) return;
        List<Long> allowedRecipients = List.of(patientId, nutritionistId);
        listeners.forEach(listener -> {
            if (allowedRecipients.contains(listener.userId())) {
                sendTo(conversationId, listener, event, data);
            }
        });
    }

    /**
     * Executes send to operation.
     */
    private void sendTo(Long conversationId, Subscriber subscriber, String event, Object data) {
        try {
            subscriber.emitter().send(SseEmitter.event().name(event).data(data));
        } catch (IOException | IllegalStateException error) {
            log.debug("Removing inactive chat event stream for user {}", subscriber.userId());
            remove(conversationId, subscriber);
            subscriber.emitter().completeWithError(error);
        }
    }

    /**
     * Executes remove operation.
     */
    private void remove(Long conversationId, Subscriber subscriber) {
        CopyOnWriteArraySet<Subscriber> listeners = subscribers.get(conversationId);
        if (listeners != null) {
            listeners.remove(subscriber);
            if (listeners.isEmpty()) subscribers.remove(conversationId, listeners);
        }
    }

    /**
     * Executes subscriber operation.
     */
    private record Subscriber(Long userId, SseEmitter emitter) {}
}
