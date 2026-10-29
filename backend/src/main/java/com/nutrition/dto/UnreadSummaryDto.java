package com.nutrition.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Unread chat summary for the signed-in user. The navbar badge shows {@code total};
 * the conversation list shows one aggregated count per conversation.
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
