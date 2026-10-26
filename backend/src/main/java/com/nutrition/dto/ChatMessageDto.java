package com.nutrition.dto;
import lombok.Data;
import java.time.LocalDateTime;
@Data public class ChatMessageDto {
    private Long id, conversationId, senderId;
    private String content, clientMessageId;
    private LocalDateTime createdAt, readAt;
}
