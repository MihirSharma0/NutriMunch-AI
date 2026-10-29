package com.nutrition.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

/**
 * Generic response payload wrapper returning simple textual status or feedback messages.
 */
@Data
@AllArgsConstructor
public class MessageResponse {
    private String message;
}
