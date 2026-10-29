package com.nutrition.controller;

import com.nutrition.dto.*;
import com.nutrition.security.CustomUserDetails;
import com.nutrition.service.ChatService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.http.MediaType;
import org.springframework.http.HttpHeaders;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import java.util.List;

/**
 * Consultation Chat Controller.
Manages real-time telehealth chat threads, message dispatch, SSE live event streaming, read receipts, and thread reopening.
 */
@RestController
@RequestMapping("/api/conversations")
@RequiredArgsConstructor
public class ChatController {
    private final ChatService chatService;
    /**
     * Handles request to create.
     */
    @PostMapping
    public ConversationDto create(@AuthenticationPrincipal CustomUserDetails u, @Valid @RequestBody ConversationCreateRequest r) {
        return chatService.createConversation(r.getAppointmentId(), r.getParticipantId(), u.getId(), u.getRole());
    }
    /**
     * Handles request to recipients.
     */
    @GetMapping("/recipients")
    public List<ChatParticipantDto> recipients(@AuthenticationPrincipal CustomUserDetails u) {
        return chatService.availableRecipients(u.getId(), u.getRole());
    }
    /**
     * Handles request to conversations.
     */
    @GetMapping
    public List<ConversationDto> conversations(@AuthenticationPrincipal CustomUserDetails u) {
        return chatService.listConversations(u.getId(), u.getRole());
    }
    /**
     * Handles request to unread.
     */
    @GetMapping("/unread")
    public UnreadSummaryDto unread(@AuthenticationPrincipal CustomUserDetails u) {
        return chatService.unreadSummary(u.getId());
    }
    /**
     * Handles request to conversation page.
     */
    @GetMapping("/page")
    public ConversationPageDto conversationPage(
            @AuthenticationPrincipal CustomUserDetails u,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "30") int size) {
        return chatService.listNutritionistConversationPage(u.getId(), u.getRole(), page, size);
    }
    /**
     * Handles request to conversation.
     */
    @GetMapping("/{id}")
    public ConversationDto conversation(@AuthenticationPrincipal CustomUserDetails u, @PathVariable Long id) {
        return chatService.getConversation(id, u.getId());
    }
    /**
     * Handles request to events.
     */
    @GetMapping(value = "/{id}/events", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public ResponseEntity<SseEmitter> events(@AuthenticationPrincipal CustomUserDetails u, @PathVariable Long id) {
        // Authorise and refresh first, in a short transaction that is already finished by the
        // time the stream is returned - otherwise a pooled connection stays checked out for the
        // whole 30 minute stream and the pool runs dry.
        ConversationStatusDto authorization = chatService.authorizeSubscription(id, u.getId());
        return ResponseEntity.ok()
                .header(HttpHeaders.CACHE_CONTROL, "no-cache")
                .header("X-Accel-Buffering", "no")
                .body(chatService.subscribe(id, u.getId(), authorization.getStatus()));
    }
    /**
     * Handles request to history.
     */
    @GetMapping("/{id}/messages")
    public ChatHistoryDto history(@AuthenticationPrincipal CustomUserDetails u, @PathVariable Long id,
                                  @RequestParam(required = false) Long before, @RequestParam(defaultValue = "30") int limit) {
        return chatService.history(id, u.getId(), before, limit);
    }
    /**
     * Handles request to send.
     */
    @PostMapping("/{id}/messages")
    public ChatMessageDto send(@AuthenticationPrincipal CustomUserDetails u, @PathVariable Long id,
                               @Valid @RequestBody ChatMessageRequest request) {
        return chatService.send(id, u.getId(), request);
    }
    /**
     * Handles request to read.
     */
    @PutMapping("/{id}/read")
    public ResponseEntity<Void> read(@AuthenticationPrincipal CustomUserDetails u, @PathVariable Long id) {
        chatService.markRead(id, u.getId()); return ResponseEntity.noContent().build();
    }
    /**
     * Handles request to end.
     */
    @PutMapping("/{id}/end")
    public ConversationDto end(@AuthenticationPrincipal CustomUserDetails u, @PathVariable Long id) {
        return chatService.endConversation(id, u.getId(), u.getRole());
    }
    /**
     * Handles request to reopen.
     */
    @PutMapping("/{id}/reopen")
    public ConversationDto reopen(@AuthenticationPrincipal CustomUserDetails u, @PathVariable Long id) {
        return chatService.reopenConversation(id, u.getId(), u.getRole());
    }
}
