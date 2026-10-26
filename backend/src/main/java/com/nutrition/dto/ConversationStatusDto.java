package com.nutrition.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class ConversationStatusDto {
    private Long conversationId;
    private String status;
}
