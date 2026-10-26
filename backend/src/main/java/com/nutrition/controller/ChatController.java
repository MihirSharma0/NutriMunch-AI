package com.nutrition.controller;

import com.nutrition.dto.*;
import com.nutrition.security.CustomUserDetails;
import com.nutrition.service.ChatService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/conversations")
@RequiredArgsConstructor
public class ChatController {
    private final ChatService chatService;
    @PostMapping
    public ConversationDto create(@AuthenticationPrincipal CustomUserDetails u, @Valid @RequestBody ConversationCreateRequest r) {
        return chatService.createConversation(r.getAppointmentId(), r.getParticipantId(), u.getId(), u.getRole());
    }
    @GetMapping("/{id}/messages")
    public ChatHistoryDto history(@AuthenticationPrincipal CustomUserDetails u, @PathVariable Long id,
                                  @RequestParam(required = false) Long before, @RequestParam(defaultValue = "30") int limit) {
        return chatService.history(id, u.getId(), before, limit);
    }
    @PostMapping("/{id}/messages")
    public ChatMessageDto send(@AuthenticationPrincipal CustomUserDetails u, @PathVariable Long id,
                               @Valid @RequestBody ChatMessageRequest request) {
        return chatService.send(id, u.getId(), request);
    }
    @PutMapping("/{id}/read")
    public ResponseEntity<Void> read(@AuthenticationPrincipal CustomUserDetails u, @PathVariable Long id) {
        chatService.markRead(id, u.getId()); return ResponseEntity.noContent().build();
    }
}
