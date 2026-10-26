package com.nutrition.controller;

import com.nutrition.dto.*;
import com.nutrition.security.CustomUserDetails;
import com.nutrition.service.ChatService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.*;
import org.springframework.stereotype.Controller;
import java.security.Principal;

@Controller
@RequiredArgsConstructor
public class ChatWebSocketController {
    private final ChatService chatService;
    @MessageMapping("/chat/{conversationId}/send")
    public ChatMessageDto send(@DestinationVariable Long conversationId, @Valid ChatMessageRequest request, Principal principal) {
        CustomUserDetails user = (CustomUserDetails) ((org.springframework.security.authentication.UsernamePasswordAuthenticationToken) principal).getPrincipal();
        return chatService.send(conversationId, user.getId(), request);
    }
    @MessageMapping("/chat/{conversationId}/read")
    public void read(@DestinationVariable Long conversationId, Principal principal) {
        CustomUserDetails user = (CustomUserDetails) ((org.springframework.security.authentication.UsernamePasswordAuthenticationToken) principal).getPrincipal();
        chatService.markRead(conversationId, user.getId());
    }
}
