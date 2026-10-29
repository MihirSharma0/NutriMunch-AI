package com.nutrition.dto;

import lombok.Data;
import java.time.LocalDateTime;

/**
 * Data Transfer Object for consultation appointments.
 * Transmits scheduled consultation details, nutritionist assignment, notes, and escrow status.
 */
@Data
public class AppointmentDto {
    private Long id;
    private Long userId;
    private String userName;
    private String userEmail;
    private Long nutritionistId;
    private String nutritionistName;
    private String nutritionistEmail;
    private String nutritionistCredentials;
    private String nutritionistSpecialization;
    private LocalDateTime appointmentTime;
    private String status;
    private String meetingLink;
    private String notes;
    private String title;
    private String sessionType;
    private java.math.BigDecimal sessionFee;
    private java.math.BigDecimal escrowAmount;
    private String escrowStatus;
    private String escrowTransactionRef;
}
