package com.nutrition.dto;
import lombok.Data;
import java.time.LocalDateTime;
/**
 * Data Transfer Object for individual chat messages.
 * Transmits message text, sender details, timestamp, and read status.
 */
@Data public class ChatMessageDto {
    private Long id, conversationId, senderId;
    private String content, clientMessageId;
    private LocalDateTime createdAt, readAt;
}
