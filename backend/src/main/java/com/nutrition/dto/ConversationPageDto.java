package com.nutrition.dto;

import lombok.Data;

import java.util.List;

@Data
public class ConversationPageDto {
    private List<ConversationDto> conversations;
    private int nextPage;
    private boolean hasMore;
}
