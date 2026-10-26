package com.nutrition.controller;

import com.nutrition.dto.ChatParticipantDto;
import com.nutrition.security.CustomUserDetails;
import com.nutrition.service.ChatService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/admin/conversations")
@RequiredArgsConstructor
public class AdminChatController {
    private final ChatService chatService;

    @GetMapping("/recipients")
    public List<ChatParticipantDto> recipients(@AuthenticationPrincipal CustomUserDetails admin) {
        return chatService.availableAdminRecipients(admin.getRole());
    }
}
