package com.nutrition.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Data Transfer Object aggregating unread notification and chat message counts for user badges.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UnreadSummaryDto {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ConversationUnread {
        private Long conversationId;
        private long unreadCount;
    }

    private long total;
    private List<ConversationUnread> conversations;
}
