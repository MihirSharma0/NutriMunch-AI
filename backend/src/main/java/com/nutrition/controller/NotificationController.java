package com.nutrition.controller;

import com.nutrition.dto.NotificationDto;
import com.nutrition.security.CustomUserDetails;
import com.nutrition.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping("/me")
    public ResponseEntity<List<NotificationDto>> getMyNotifications(@AuthenticationPrincipal CustomUserDetails userDetails) {
        Long userId = userDetails != null ? userDetails.getId() : null;
        com.nutrition.entity.Role role = userDetails != null ? userDetails.getUser().getRole() : null;
        return ResponseEntity.ok(notificationService.getNotificationsForUser(userId, role));
    }

    @PostMapping("/send")
    public ResponseEntity<NotificationDto> sendNotification(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestBody NotificationDto dto) {
        // Sender always comes from the authenticated session, never from the request body
        Long senderId = userDetails != null ? userDetails.getId() : null;
        return ResponseEntity.ok(notificationService.sendNotification(dto, senderId));
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<Void> markAsRead(@PathVariable Long id) {
        notificationService.markAsRead(id);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/read-all")
    public ResponseEntity<Void> markAllAsRead(@AuthenticationPrincipal CustomUserDetails userDetails) {
        Long userId = userDetails != null ? userDetails.getId() : null;
        notificationService.markAllAsReadForUser(userId);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteNotification(@PathVariable Long id) {
        notificationService.deleteNotification(id);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/clear-all")
    public ResponseEntity<Void> clearAllNotifications(@AuthenticationPrincipal CustomUserDetails userDetails) {
        Long userId = userDetails != null ? userDetails.getId() : null;
        if (userId != null) {
            notificationService.deleteAllNotificationsForUser(userId);
        }
        return ResponseEntity.ok().build();
    }
}
