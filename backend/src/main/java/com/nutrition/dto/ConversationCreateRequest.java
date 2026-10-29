package com.nutrition.dto;
import lombok.Data;
/**
 * Data Transfer Object for initiating a new consultation conversation.
 * Links the conversation thread to an approved consultation appointment.
 */
@Data public class ConversationCreateRequest {
    private Long appointmentId;
    private Long participantId;
}
