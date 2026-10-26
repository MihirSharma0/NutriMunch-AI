package com.nutrition.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class ChatParticipantDto {
    private Long id;
    private String name;
    private String email;
    private String role;
}
