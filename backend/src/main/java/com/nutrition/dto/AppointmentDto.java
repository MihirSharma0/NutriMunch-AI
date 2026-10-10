package com.nutrition.dto;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class AppointmentDto {
    private Long id;
    private Long userId;
    private String userName;
    private String userEmail;
    private Long dietitianId;
    private String dietitianName;
    private LocalDateTime appointmentTime;
    private String status;
    private String meetingLink;
    private String notes;
    private String title;
    private String sessionType;
}
