package com.nutrition.dto;

import lombok.Data;

/**
 * Data Transfer Object describing a chat participant in a consultation thread.
 * Encapsulates user identification, contact attributes, role, and associated appointment context.
 */
@Data
public class ChatParticipantDto {
    private Long id;
    private String name;
    private String email;
    private String role;

    /** The accepted consultation that authorises this chat, if it has been opened yet. */
    private Long appointmentId;
    private Long conversationId;

    /**
     * Constructs a basic participant descriptor without consultation linkages.
     *
     * @param id user identifier
     * @param name participant display name
     * @param email participant email address
     * @param role participant user role
     */
    public ChatParticipantDto(Long id, String name, String email, String role) {
        this(id, name, email, role, null, null);
    }

    /**
     * Constructs a full participant descriptor including appointment and conversation linkages.
     *
     * @param id user identifier
     * @param name participant display name
     * @param email participant email address
     * @param role participant user role
     * @param appointmentId linked consultation appointment ID
     * @param conversationId active conversation thread ID
     */
    public ChatParticipantDto(Long id, String name, String email, String role, Long appointmentId, Long conversationId) {
        this.id = id;
        this.name = name;
        this.email = email;
        this.role = role;
        this.appointmentId = appointmentId;
        this.conversationId = conversationId;
    }
}
