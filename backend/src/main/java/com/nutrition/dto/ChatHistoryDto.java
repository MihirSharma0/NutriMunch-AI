package com.nutrition.dto;
import lombok.Data;
import java.util.List;
/**
 * Data Transfer Object for historical chat query responses.
 * Returns paginated chat messages, cursor references, and remaining history flags.
 */
@Data public class ChatHistoryDto { private List<ChatMessageDto> messages; private Long nextCursor; }
