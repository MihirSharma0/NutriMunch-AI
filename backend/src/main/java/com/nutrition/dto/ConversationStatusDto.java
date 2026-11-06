package com.nutrition.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Data Transfer Object representing the current operational status of a chat thread.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ConversationStatusDto {
    private Long conversationId;
    private String status;
    private String targetUrl;

    public ConversationStatusDto(Long conversationId, String status) {
        this.conversationId = conversationId;
        this.status = status;
        this.targetUrl = "/consultation-chat?conversationId=" + conversationId;
    }
}
