package com.nutrition.dto;
import lombok.Data;
import java.time.LocalDateTime;
@Data public class ConversationDto {
    private Long id, appointmentId, patientId, nutritionistId;
    private String status, patientName, patientEmail, nutritionistName, nutritionistEmail;
    private LocalDateTime createdAt, updatedAt;
}
