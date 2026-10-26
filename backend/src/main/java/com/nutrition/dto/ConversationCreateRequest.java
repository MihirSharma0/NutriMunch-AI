package com.nutrition.dto;
import lombok.Data;
@Data public class ConversationCreateRequest {
    private Long appointmentId;
    private Long participantId;
}
