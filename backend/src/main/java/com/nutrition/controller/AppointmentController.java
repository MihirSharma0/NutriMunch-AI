package com.nutrition.controller;

import com.nutrition.dto.AppointmentDto;
import com.nutrition.security.CustomUserDetails;
import com.nutrition.service.AppointmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Consultation Appointment Controller.
Manages consultation bookings, slot availability, session status transitions, and escrow settlements.
 */
@RestController
@RequestMapping("/api/appointments")
@RequiredArgsConstructor
public class AppointmentController {

    private final AppointmentService appointmentService;

    /**
     * Handles request to get my appointments.
     */
    @GetMapping("/me")
    public ResponseEntity<List<AppointmentDto>> getMyAppointments(@AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(appointmentService.getMyAppointments(userDetails.getId(), userDetails.getUser().getRole()));
    }

    @GetMapping("/nutritionists")
    public ResponseEntity<List<Map<String, Object>>> getAvailableNutritionists() {
        return ResponseEntity.ok(appointmentService.getAvailableNutritionists());
    }

    /**
     * Handles request to book appointment.
     */
    @PostMapping("/book")
    public ResponseEntity<?> bookAppointment(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestBody AppointmentDto dto) {
        try {
            return ResponseEntity.ok(appointmentService.bookAppointment(userDetails.getId(), userDetails.getUser().getRole(), dto));
        } catch (com.nutrition.exception.LowBalanceException e) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.BAD_REQUEST).body(Map.of(
                    "status", "LOW_BALANCE",
                    "message", e.getMessage(),
                    "currentBalance", e.getCurrentBalance(),
                    "requiredAmount", e.getRequiredAmount(),
                    "deficit", e.getDeficit()
            ));
        }
    }

    /**
     * Handles request to update status.
     */
    @PutMapping("/{id}/status")
    public ResponseEntity<AppointmentDto> updateStatus(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestBody Map<String, String> body) {
        String status = body.get("status");
        String meetingLink = body.get("meetingLink");
        String notes = body.get("notes");
        Long callerId = userDetails != null ? userDetails.getId() : null;
        boolean isAdmin = userDetails != null && userDetails.getUser().getRole() == com.nutrition.entity.Role.ADMIN;
        return ResponseEntity.ok(appointmentService.updateAppointmentStatus(id, status, meetingLink, notes, callerId, isAdmin));
    }

    /**
     * Handles request to request cancellation.
     */
    @PostMapping("/{id}/request-cancel")
    public ResponseEntity<AppointmentDto> requestCancellation(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestBody(required = false) Map<String, String> body) {
        String reason = body != null ? body.get("reason") : null;
        return ResponseEntity.ok(appointmentService.requestCancellation(id, userDetails.getId(), reason));
    }

    /**
     * Handles request to delete appointment.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteAppointment(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        Long callerId = userDetails != null ? userDetails.getId() : null;
        boolean isAdmin = userDetails != null && userDetails.getUser().getRole() == com.nutrition.entity.Role.ADMIN;
        appointmentService.deleteAppointment(id, callerId, isAdmin);
        return ResponseEntity.noContent().build();
    }
}
