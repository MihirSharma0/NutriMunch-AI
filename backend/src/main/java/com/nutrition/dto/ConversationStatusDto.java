package com.nutrition.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

/**
 * Data Transfer Object representing the current operational status of a chat thread.
 */
@Data
@AllArgsConstructor
public class ConversationStatusDto {
    private Long conversationId;
    private String status;
}
