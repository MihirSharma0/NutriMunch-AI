package com.nutrition.dto;

import lombok.Data;

@Data
public class ChatParticipantDto {
    private Long id;
    private String name;
    private String email;
    private String role;

    /** The accepted consultation that authorises this chat, if it has been opened yet. */
    private Long appointmentId;
    private Long conversationId;

    public ChatParticipantDto(Long id, String name, String email, String role) {
        this(id, name, email, role, null, null);
    }

    public ChatParticipantDto(Long id, String name, String email, String role, Long appointmentId, Long conversationId) {
        this.id = id;
        this.name = name;
        this.email = email;
        this.role = role;
        this.appointmentId = appointmentId;
        this.conversationId = conversationId;
    }
}
