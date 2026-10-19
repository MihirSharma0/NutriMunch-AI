package com.nutrition.controller;

import com.nutrition.dto.AppointmentDto;
import com.nutrition.exception.LowBalanceException;
import com.nutrition.security.CustomUserDetails;
import com.nutrition.service.AppointmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/bookings")
@RequiredArgsConstructor
public class BookingController {

    private final AppointmentService appointmentService;

    /**
     * STEP 2.2: Booking Request & Escrow Lock (POST /api/bookings/request)
     * User requests an appointment with a Dietitian for a specific amount.
     * Deducts/locks amount into ESCROW state and creates booking with status "requested".
     */
    @PostMapping("/request")
    public ResponseEntity<?> requestBooking(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestBody Map<String, Object> payload) {
        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        AppointmentDto dto = new AppointmentDto();
        if (payload.get("dietitianId") != null) {
            dto.setDietitianId(Long.valueOf(payload.get("dietitianId").toString()));
        }
        if (payload.get("userId") != null) {
            dto.setUserId(Long.valueOf(payload.get("userId").toString()));
        } else {
            dto.setUserId(userDetails.getId());
        }

        if (payload.get("amount") != null) {
            dto.setSessionFee(new BigDecimal(payload.get("amount").toString()));
        } else if (payload.get("sessionFee") != null) {
            dto.setSessionFee(new BigDecimal(payload.get("sessionFee").toString()));
        }

        if (payload.get("appointmentTime") != null) {
            dto.setAppointmentTime(LocalDateTime.parse(payload.get("appointmentTime").toString()));
        }
        if (payload.get("title") != null) {
            dto.setTitle(payload.get("title").toString());
        }
        if (payload.get("sessionType") != null) {
            dto.setSessionType(payload.get("sessionType").toString());
        }
        if (payload.get("notes") != null) {
            dto.setNotes(payload.get("notes").toString());
        }
        if (payload.get("meetingLink") != null) {
            dto.setMeetingLink(payload.get("meetingLink").toString());
        }
        dto.setStatus("requested");

        try {
            AppointmentDto result = appointmentService.bookAppointment(
                    userDetails.getId(), userDetails.getUser().getRole(), dto);
            return ResponseEntity.status(HttpStatus.CREATED).body(result);
        } catch (LowBalanceException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                    "status", "LOW_BALANCE",
                    "message", e.getMessage(),
                    "currentBalance", e.getCurrentBalance(),
                    "requiredAmount", e.getRequiredAmount(),
                    "deficit", e.getDeficit()
            ));
        }
    }

    /**
     * STEP 2.3: Dietitian Response (PATCH /api/bookings/:id/respond)
     * If Accepted: Moves funds from escrow to dietitian's balance, records transfer, status -> accepted.
     * If Cancelled/Declined: Releases funds back to user's balance, records refund, status -> cancelled.
     */
    @PatchMapping("/{id}/respond")
    public ResponseEntity<AppointmentDto> respondToBooking(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        String status = body.get("status");
        String meetingLink = body.get("meetingLink");
        String notes = body.get("notes");

        AppointmentDto updated = appointmentService.updateAppointmentStatus(id, status, meetingLink, notes);
        return ResponseEntity.ok(updated);
    }

    @PostMapping("/{id}/request-cancel")
    public ResponseEntity<AppointmentDto> requestCancellation(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestBody(required = false) Map<String, String> body) {
        String reason = body != null ? body.get("reason") : null;
        return ResponseEntity.ok(appointmentService.requestCancellation(id, userDetails.getId(), reason));
    }

    @GetMapping
    public ResponseEntity<List<AppointmentDto>> getMyBookings(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(appointmentService.getMyAppointments(userDetails.getId(), userDetails.getUser().getRole()));
    }
}
