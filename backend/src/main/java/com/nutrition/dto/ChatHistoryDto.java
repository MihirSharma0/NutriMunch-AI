package com.nutrition.dto;
import lombok.Data;
import java.util.List;
@Data public class ChatHistoryDto { private List<ChatMessageDto> messages; private Long nextCursor; }
