package com.nutrition.service;

import com.nutrition.dto.NotificationDto;
import com.nutrition.entity.Notification;
import com.nutrition.entity.User;
import com.nutrition.repository.NotificationRepository;
import com.nutrition.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    public List<NotificationDto> getNotificationsForUser(Long userId) {
        List<Notification> list = notificationRepository.findAllByOrderByCreatedAtDesc();
        return list.stream().map(this::mapToDto).collect(Collectors.toList());
    }

    public NotificationDto sendNotification(NotificationDto dto) {
        Notification notification = new Notification();
        
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

    public void markAsRead(Long notificationId) {
        Optional<Notification> nOpt = notificationRepository.findById(notificationId);
        nOpt.ifPresent(n -> {
            n.setReadStatus(true);
            notificationRepository.save(n);
        });
    }

    public void markAllAsReadForUser(Long userId) {
        List<Notification> list = (userId != null)
                ? notificationRepository.findByUserIdOrUserIsNullOrderByCreatedAtDesc(userId)
                : notificationRepository.findAllByOrderByCreatedAtDesc();
        for (Notification n : list) {
            if (!n.isReadStatus()) {
                n.setReadStatus(true);
                notificationRepository.save(n);
            }
        }
    }

    public void deleteNotification(Long notificationId) {
        if (notificationRepository.existsById(notificationId)) {
            notificationRepository.deleteById(notificationId);
        }
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
