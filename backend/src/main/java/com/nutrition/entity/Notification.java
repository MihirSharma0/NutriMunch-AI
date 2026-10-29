package com.nutrition.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;

/**
 * Notification Entity.
 * Represents in-app notifications and alerts dispatched to users for appointment updates,
 * incoming chat messages, wallet transactions, and clinical announcements.
 */
@Entity
@Table(name = "notifications")
@Data
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    // The user whose action triggered this notification (never shown it themselves)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sender_id")
    private User sender;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String message;

    private String type = "SYSTEM";
    private String icon = "notifications";
    private String path;

    /** Set for consultation-chat notifications so they can be routed and aggregated per conversation. */
    @Column(name = "conversation_id")
    private Long conversationId;
    
    @Column(name = "read_status")
    private boolean readStatus = false;

    @CreationTimestamp
    private LocalDateTime createdAt;
}
