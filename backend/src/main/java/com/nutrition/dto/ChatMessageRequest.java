package com.nutrition.dto;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;
/**
 * Data Transfer Object for submitting an outbound chat message.
 * Contains the message body and optional client-generated idempotency key.
 */
@Data public class ChatMessageRequest {
    @NotBlank @Size(max = 4000) private String content;
    @NotBlank @Size(max = 128) private String clientMessageId;
}
