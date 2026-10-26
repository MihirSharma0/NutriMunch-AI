package com.nutrition.dto;

import lombok.Data;
import java.time.LocalDateTime;

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
    private boolean readStatus;
    private LocalDateTime createdAt;
    private String timeAgo;
}
