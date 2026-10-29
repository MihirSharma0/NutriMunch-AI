package com.nutrition.service;

import com.nutrition.dto.NotificationDto;
import com.nutrition.entity.Notification;
import com.nutrition.entity.Role;
import com.nutrition.entity.User;
import com.nutrition.repository.NotificationRepository;
import com.nutrition.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * In-App Notification Service.
Manages user notification dispatch, unread notification aggregations, and mark-read transactions.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

    /** Chat message notifications are aggregated per conversation, always with this type. */
    public static final String TYPE_CONSULTATION_MSG = "CONSULTATION_MSG";
    public static final String TYPE_CONSULTATION_ACTIVATED = "CONSULTATION_ACTIVATED";
    public static final String TYPE_CONSULTATION_EXPIRED = "CONSULTATION_EXPIRED";
    public static final String TYPE_CONSULTATION_REOPENED = "CONSULTATION_REOPENED";

    private static final int PREVIEW_LENGTH = 120;
    private static final String CONSULTATION_CHAT_PATH = "/consultation-chat";

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final PlatformTransactionManager transactionManager;

    /**
     * Server-generated alert for a system event (wallet credit, refund, appointment change...).
     * Skipped when the recipient caused the event themselves. When called inside a transaction it is
     * saved only after that transaction commits, in its own transaction, so a failed payment never
     * produces an alert and a failed alert never rolls back a payment.
     */
    public void notifyUser(User recipient, Long senderId, String title, String message, String type, String icon, String path) {
        if (recipient == null || recipient.getId() == null) return;
        Long recipientId = recipient.getId();
        if (Objects.equals(recipientId, senderId)) return;

        runAfterCommit(() -> {
            TransactionTemplate tx = new TransactionTemplate(transactionManager);
            tx.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
            tx.executeWithoutResult(status -> {
                Notification n = new Notification();
                n.setUser(userRepository.getReferenceById(recipientId));
                if (senderId != null) n.setSender(userRepository.getReferenceById(senderId));
                n.setTitle(title);
                n.setMessage(message);
                n.setType(type != null ? type : "SYSTEM");
                n.setIcon(icon != null ? icon : "notifications");
                n.setPath(path);
                n.setReadStatus(false);
                notificationRepository.save(n);
            });
        }, "notification '" + type + "' for user " + recipientId);
    }

    /**
     * One aggregated unread notification per (recipient, conversation): a burst of messages
     * bumps the existing row instead of filling the bell with one entry per message.
     */
    public void notifyChatMessage(User recipient, User sender, Long conversationId, String senderName,
                                  String preview, long unreadCount) {
        if (recipient == null || recipient.getId() == null || conversationId == null) return;
        if (sender != null && Objects.equals(sender.getId(), recipient.getId())) return;

        Long recipientId = recipient.getId();
        Long senderId = sender != null ? sender.getId() : null;
        String safePreview = truncate(preview);
        long unread = Math.max(unreadCount, 1L);

        runAfterCommit(() -> {
            TransactionTemplate tx = new TransactionTemplate(transactionManager);
            tx.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
            tx.executeWithoutResult(status -> {
                Notification notification = notificationRepository
                        .findFirstByUser_IdAndConversationIdAndTypeAndReadStatusFalseOrderByIdDesc(
                                recipientId, conversationId, TYPE_CONSULTATION_MSG)
                        .orElseGet(() -> {
                            Notification fresh = new Notification();
                            fresh.setUser(userRepository.getReferenceById(recipientId));
                            fresh.setConversationId(conversationId);
                            fresh.setType(TYPE_CONSULTATION_MSG);
                            fresh.setIcon("forum");
                            fresh.setReadStatus(false);
                            return fresh;
                        });

                String title = senderName == null || senderName.isBlank()
                        ? "New consultation message"
                        : "New message from " + senderName;
                String body = unread == 1
                        ? safePreview
                        : unread + " unread messages. Latest: " + safePreview;

                notification.setTitle(title);
                notification.setMessage(body);
                if (senderId != null) notification.setSender(userRepository.getReferenceById(senderId));
                notification.setPath(CONSULTATION_CHAT_PATH + "?conversationId=" + conversationId);
                notificationRepository.save(notification);
            });
        }, "chat notification for user " + recipientId);
    }

    /**
     * Executes get notifications for user operation.
     */
    public List<NotificationDto> getNotificationsForUser(Long userId, Role role) {
        if (userId == null) return List.of();
        List<Notification> list = notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
        return list.stream()
                .filter(n -> isVisibleTo(n, userId))
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    /**
     * Executes get unread count operation.
     */
    public long getUnreadCount(Long userId) {
        if (userId == null) return 0L;
        return notificationRepository.countByUser_IdAndReadStatusFalse(userId);
    }

    /**
     * A notification is shown to a user only when it is addressed to them
     * and was caused by someone else - users never get notified about their own actions.
     */
    private boolean isVisibleTo(Notification n, Long userId) {
        if (userId == null) return false;
        if (n.getSender() != null && userId.equals(n.getSender().getId())) return false;
        return n.getUser() != null && userId.equals(n.getUser().getId());
    }

    /**
     * Manual notification endpoint. Server-generated consultation events never come through here:
     * those are created by the services themselves so the recipient cannot be chosen by the caller.
     */
    @Transactional
    public NotificationDto sendNotification(NotificationDto dto, Long senderId) {
        if (List.of(TYPE_CONSULTATION_MSG, "CONSULTATION_CHAT", "CONSULTATION_REQUEST").contains(dto.getType())) {
            throw new IllegalArgumentException("Consultation messages must use the conversation messaging API");
        }

        User sender = senderId != null ? userRepository.findById(senderId).orElse(null) : null;
        if (sender == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "A signed-in sender is required");
        }
        if (sender.getRole() == Role.USER) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Clients cannot send notifications");
        }

        Optional<User> uOpt = Optional.empty();
        if (dto.getUserEmail() != null && !dto.getUserEmail().trim().isEmpty()) {
            uOpt = userRepository.findByEmail(dto.getUserEmail().trim());
        }
        if (uOpt.isEmpty() && dto.getUserId() != null) {
            uOpt = userRepository.findById(dto.getUserId());
        }

        // A nutritionist may only address clients; never another practitioner or an admin.
        if (sender.getRole() == Role.NUTRITIONIST && uOpt.isPresent()
                && uOpt.get().getRole() != Role.USER) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Nutritionists can only notify client accounts");
        }

        if (uOpt.isPresent()) {
            Notification saved = notificationRepository.save(buildNotification(dto, sender, uOpt.get()));
            return mapToDto(saved);
        }

        // No specific recipient: fan out so every reader owns an independent read state.
        // Broadcast rows (user_id IS NULL) could never be marked read by their reader.
        List<User> audience = userRepository.findAll().stream()
                .filter(Objects::nonNull)
                .filter(u -> u.getRole() == Role.USER || u.getRole() == Role.NUTRITIONIST)
                .filter(u -> !Objects.equals(u.getId(), sender.getId()))
                .collect(Collectors.toList());

        NotificationDto first = null;
        for (User recipient : audience) {
            Notification saved = notificationRepository.save(buildNotification(dto, sender, recipient));
            if (first == null) first = mapToDto(saved);
        }
        return first;
    }

    /**
     * Executes build notification operation.
     */
    private Notification buildNotification(NotificationDto dto, User sender, User recipient) {
        Notification notification = new Notification();
        notification.setSender(sender);
        notification.setUser(recipient);
        notification.setTitle(dto.getTitle());
        notification.setMessage(dto.getMessage());
        notification.setType(dto.getType() != null ? dto.getType() : "SYSTEM");
        notification.setIcon(dto.getIcon() != null ? dto.getIcon() : "notifications");
        notification.setPath(dto.getPath());
        notification.setReadStatus(false);
        return notification;
    }

    /**
     * Executes mark as read operation.
     */
    public void markAsRead(Long notificationId, Long userId) {
        Optional<Notification> nOpt = notificationRepository.findById(notificationId);
        nOpt.ifPresent(n -> {
            if (n.getUser() == null || !Objects.equals(n.getUser().getId(), userId)) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Notification is not owned by user");
            }
            n.setReadStatus(true);
            notificationRepository.save(n);
        });
    }

    /**
     * Executes mark all as read for user operation.
     */
    @Transactional
    public void markAllAsReadForUser(Long userId) {
        if (userId != null) {
            notificationRepository.markAllRead(userId);
        }
    }

    /** Opening a conversation clears the aggregated chat notification that pointed at it. */
    @Transactional
    public void markConversationNotificationsRead(Long userId, Long conversationId) {
        if (userId == null || conversationId == null) return;
        notificationRepository.markConversationNotificationsRead(userId, conversationId);
    }

    /**
     * Executes delete notification operation.
     */
    public void deleteNotification(Long notificationId, Long userId) {
        Notification n = notificationRepository.findById(notificationId).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (n.getUser() == null || !Objects.equals(n.getUser().getId(), userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Notification is not owned by user");
        }
        notificationRepository.delete(n);
    }

    /**
     * Executes delete all notifications for user operation.
     */
    public void deleteAllNotificationsForUser(Long userId) {
        if (userId != null) {
            List<Notification> list = notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
            notificationRepository.deleteAll(list);
        }
    }

    /**
     * Executes delete all notifications operation.
     */
    public void deleteAllNotifications() {
        // Retained for backward compatibility without dropping entire database table
    }

    /**
     * Executes run after commit operation.
     */
    private static void runAfterCommit(Runnable action, String description) {
        Runnable wrapped = () -> {
            try {
                action.run();
            } catch (Exception e) {
                log.warn("Failed to create {}: {}", description, e.getMessage());
            }
        };
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
    /**
     * Executes after commit operation.
     */
                @Override
                public void afterCommit() {
                    wrapped.run();
                }
            });
        } else {
            wrapped.run();
        }
    }

    /**
     * Executes truncate operation.
     */
    private static String truncate(String value) {
        if (value == null) return "";
        String trimmed = value.trim();
        return trimmed.length() <= PREVIEW_LENGTH ? trimmed : trimmed.substring(0, PREVIEW_LENGTH) + "...";
    }

    /**
     * Executes map to dto operation.
     */
    private NotificationDto mapToDto(Notification entity) {
        NotificationDto dto = new NotificationDto();
        dto.setId(entity.getId());
        if (entity.getUser() != null) {
            dto.setUserId(entity.getUser().getId());
            dto.setUserEmail(entity.getUser().getEmail());
            dto.setUserName(entity.getUser().getFirstName() != null ? entity.getUser().getFirstName() + " " + (entity.getUser().getLastName() != null ? entity.getUser().getLastName() : "") : entity.getUser().getEmail());
        }
        if (entity.getSender() != null) {
            dto.setSenderId(entity.getSender().getId());
        }
        dto.setTitle(entity.getTitle());
        dto.setMessage(entity.getMessage());
        dto.setType(entity.getType());
        dto.setIcon(entity.getIcon());
        dto.setPath(entity.getPath());
        dto.setConversationId(entity.getConversationId());
        dto.setReadStatus(entity.isReadStatus());
        dto.setCreatedAt(entity.getCreatedAt());
        dto.setTimeAgo(calculateTimeAgo(entity.getCreatedAt()));
        return dto;
    }

    /**
     * Executes calculate time ago operation.
     */
    private String calculateTimeAgo(LocalDateTime createdAt) {
        if (createdAt == null) return "Just now";
        long minutes = ChronoUnit.MINUTES.between(createdAt, LocalDateTime.now());
        if (minutes < 1) return "Just now";
        if (minutes < 60) return minutes + "m ago";
        long hours = ChronoUnit.HOURS.between(createdAt, LocalDateTime.now());
        if (hours < 24) return hours + "h ago";
        long days = ChronoUnit.DAYS.between(createdAt, LocalDateTime.now());
        return days + "d ago";
    }
}
