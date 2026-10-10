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

@RestController
@RequestMapping("/api/appointments")
@RequiredArgsConstructor
public class AppointmentController {

    private final AppointmentService appointmentService;

    @GetMapping("/me")
    public ResponseEntity<List<AppointmentDto>> getMyAppointments(@AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(appointmentService.getMyAppointments(userDetails.getId(), userDetails.getUser().getRole()));
    }

    @GetMapping("/dietitians")
    public ResponseEntity<List<Map<String, Object>>> getAvailableDietitians() {
        return ResponseEntity.ok(appointmentService.getAvailableDietitians());
    }

    @PostMapping("/book")
    public ResponseEntity<AppointmentDto> bookAppointment(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestBody AppointmentDto dto) {
        return ResponseEntity.ok(appointmentService.bookAppointment(userDetails.getId(), userDetails.getUser().getRole(), dto));
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<AppointmentDto> updateStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        String status = body.get("status");
        String meetingLink = body.get("meetingLink");
        String notes = body.get("notes");
        return ResponseEntity.ok(appointmentService.updateAppointmentStatus(id, status, meetingLink, notes));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteAppointment(@PathVariable Long id) {
        appointmentService.deleteAppointment(id);
        return ResponseEntity.noContent().build();
    }
}
