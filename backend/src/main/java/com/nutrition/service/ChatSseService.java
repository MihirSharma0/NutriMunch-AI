package com.nutrition.service;

import com.nutrition.dto.ChatMessageDto;
import com.nutrition.dto.ConversationStatusDto;
import com.nutrition.entity.Conversation;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArraySet;

@Slf4j
@Service
public class ChatSseService {
    private static final long STREAM_TIMEOUT_MILLIS = 30 * 60 * 1000L;
    private final Map<Long, CopyOnWriteArraySet<Subscriber>> subscribers = new ConcurrentHashMap<>();

    public SseEmitter subscribe(Conversation conversation, Long userId) {
        SseEmitter emitter = new SseEmitter(STREAM_TIMEOUT_MILLIS);
        Subscriber subscriber = new Subscriber(userId, emitter);
        subscribers.computeIfAbsent(conversation.getId(), ignored -> new CopyOnWriteArraySet<>()).add(subscriber);
        emitter.onCompletion(() -> remove(conversation.getId(), subscriber));
        emitter.onTimeout(() -> {
            remove(conversation.getId(), subscriber);
            emitter.complete();
        });
        emitter.onError(error -> remove(conversation.getId(), subscriber));
        sendTo(conversation.getId(), subscriber, "connected",
                Map.of("conversationId", conversation.getId(), "status", conversation.getStatus()));
        return emitter;
    }

    public void publishMessage(Long conversationId, Long patientId, Long nutritionistId, ChatMessageDto message) {
        publish(conversationId, patientId, nutritionistId, "message", message);
    }

    public void publishStatus(Long conversationId, Long patientId, Long nutritionistId, ConversationStatusDto status) {
        publish(conversationId, patientId, nutritionistId, "status", status);
    }

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

    private void sendTo(Long conversationId, Subscriber subscriber, String event, Object data) {
        try {
            subscriber.emitter().send(SseEmitter.event().name(event).data(data));
        } catch (IOException | IllegalStateException error) {
            log.debug("Removing inactive chat event stream for user {}", subscriber.userId());
            remove(conversationId, subscriber);
            subscriber.emitter().completeWithError(error);
        }
    }

    private void remove(Long conversationId, Subscriber subscriber) {
        CopyOnWriteArraySet<Subscriber> listeners = subscribers.get(conversationId);
        if (listeners != null) {
            listeners.remove(subscriber);
            if (listeners.isEmpty()) subscribers.remove(conversationId, listeners);
        }
    }

    private record Subscriber(Long userId, SseEmitter emitter) {}
}
