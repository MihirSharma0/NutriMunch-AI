package com.nutrition.dto;

import lombok.Data;
import java.time.LocalDateTime;

/**
 * Data Transfer Object for user notifications and system alerts.
 * Transmits notification metadata, display icons, target navigation paths, and read status.
 */
@Data
public class NotificationDto {
    private Long id;
    private Long userId;
    private String userName;
    private String userEmail;
    private Long senderId;
    private String title;
    private String message;
    private String type;
    private String icon;
    private String path;
    /** Set when the notification points at a consultation chat. */
    private Long conversationId;
    private boolean readStatus;
    private LocalDateTime createdAt;
    private String timeAgo;
}
