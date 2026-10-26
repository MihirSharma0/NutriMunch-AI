package com.nutrition.service;

import com.nutrition.dto.NotificationDto;
import com.nutrition.entity.Notification;
import com.nutrition.entity.Role;
import com.nutrition.entity.User;
import com.nutrition.repository.NotificationRepository;
import com.nutrition.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

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

        Runnable save = () -> {
            try {
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
            } catch (Exception e) {
                log.warn("Failed to create '{}' notification for user {}: {}", type, recipientId, e.getMessage());
            }
        };

        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    save.run();
                }
            });
        } else {
            save.run();
        }
    }

    public List<NotificationDto> getNotificationsForUser(Long userId, Role role) {
        List<Notification> list = notificationRepository.findByUserIdOrUserIsNullOrderByCreatedAtDesc(userId);
        return list.stream()
                .filter(n -> isVisibleTo(n, userId))
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    /**
     * A notification is shown to a user only when it is addressed to them (or to everyone)
     * and was caused by someone else - users never get notified about their own actions.
     */
    private boolean isVisibleTo(Notification n, Long userId) {
        if (userId == null) {
            return false;
        }
        if (n.getSender() != null && userId.equals(n.getSender().getId())) {
            return false;
        }
        if (n.getUser() != null) {
            return userId.equals(n.getUser().getId());
        }
        return n.getUser() == null;
    }

    public NotificationDto sendNotification(NotificationDto dto, Long senderId) {
        if (List.of("CONSULTATION_MSG", "CONSULTATION_CHAT", "CONSULTATION_REQUEST").contains(dto.getType())) {
            throw new IllegalArgumentException("Consultation messages must use the conversation messaging API");
        }
        Notification notification = new Notification();
        if (senderId != null) {
            userRepository.findById(senderId).ifPresent(notification::setSender);
        }

        Optional<User> uOpt = Optional.empty();
        if (dto.getUserEmail() != null && !dto.getUserEmail().trim().isEmpty()) {
            uOpt = userRepository.findByEmail(dto.getUserEmail().trim());
        }
        if (uOpt.isEmpty() && dto.getUserId() != null) {
            uOpt = userRepository.findById(dto.getUserId());
        }
        
        uOpt.ifPresent(notification::setUser);

        notification.setTitle(dto.getTitle());
        notification.setMessage(dto.getMessage());
        notification.setType(dto.getType() != null ? dto.getType() : "SYSTEM");
        notification.setIcon(dto.getIcon() != null ? dto.getIcon() : "notifications");
        notification.setPath(dto.getPath());
        notification.setReadStatus(false);

        Notification saved = notificationRepository.save(notification);
        return mapToDto(saved);
    }

    public void markAsRead(Long notificationId, Long userId) {
        Optional<Notification> nOpt = notificationRepository.findById(notificationId);
        nOpt.ifPresent(n -> {
            if (n.getUser() == null || !Objects.equals(n.getUser().getId(), userId)) {
                throw new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.FORBIDDEN, "Notification is not owned by user");
            }
            n.setReadStatus(true);
            notificationRepository.save(n);
        });
    }

    public void markAllAsReadForUser(Long userId) {
        List<Notification> list = userId != null
                ? notificationRepository.findByUserIdOrderByCreatedAtDesc(userId)
                : List.of();
        for (Notification n : list) {
            if (!n.isReadStatus()) {
                n.setReadStatus(true);
                notificationRepository.save(n);
            }
        }
    }

    public void deleteNotification(Long notificationId, Long userId) {
        Notification n = notificationRepository.findById(notificationId).orElseThrow(() ->
                new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.NOT_FOUND));
        if (n.getUser() == null || !Objects.equals(n.getUser().getId(), userId)) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.FORBIDDEN, "Notification is not owned by user");
        }
        notificationRepository.delete(n);
    }

    public void deleteAllNotificationsForUser(Long userId) {
        if (userId != null) {
            List<Notification> list = notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
            notificationRepository.deleteAll(list);
        }
    }

    public void deleteAllNotifications() {
        // Retained for backward compatibility without dropping entire database table
    }

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
        dto.setReadStatus(entity.isReadStatus());
        dto.setCreatedAt(entity.getCreatedAt());
        dto.setTimeAgo(calculateTimeAgo(entity.getCreatedAt()));
        return dto;
    }

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
