package com.nutrition.dto;
import lombok.Data;
import java.time.LocalDateTime;
@Data public class ConversationDto {
    private Long id, appointmentId, patientId, nutritionistId;
    private String status, patientName, patientEmail, patientRole, nutritionistName, nutritionistEmail, nutritionistRole;

    /** When the chat became usable (consultation acceptance). */
    private LocalDateTime activatedAt;
    /** Hard end of the messaging window; the backend refuses messages after this. */
    private LocalDateTime expiresAt;
    private LocalDateTime closedAt;
    /** MANUAL | EXPIRED | CONSULTATION_CANCELLED */
    private String closedReason;
    private LocalDateTime reopenedAt;
    private int reopenCount;

    /** Server-computed flags so the UI never has to guess whether an action is allowed. */
    private boolean canSend;
    private boolean canReopen;
    private long unreadCount;

    private LocalDateTime createdAt, updatedAt;
}
