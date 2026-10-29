package com.nutrition.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;

/**
 * Conversation Entity.
 * Represents an active or historical consultation chat thread tied to an appointment,
 * enforcing 5-day consultation windows, close states, and nutritionist reopening extensions.
 */
@Entity
@Table(name = "conversations")
@Data
public class Conversation {

    public static final String STATUS_ACTIVE = "ACTIVE";
    public static final String STATUS_CLOSED = "CLOSED";
    public static final String STATUS_EXPIRED = "EXPIRED";

    public static final String CLOSED_MANUAL = "MANUAL";
    public static final String CLOSED_EXPIRED = "EXPIRED";
    public static final String CLOSED_CONSULTATION_CANCELLED = "CONSULTATION_CANCELLED";

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "appointment_id", unique = true, nullable = false)
    private Appointment appointment;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "patient_id", nullable = false)
    private User patient;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "nutritionist_id", nullable = false)
    private User nutritionist;
    @Column(nullable = false, length = 20)
    private String status = STATUS_ACTIVE;
    /** When the chat became usable (the moment the consultation was accepted). */
    @Column(name = "activated_at")
    private LocalDateTime activatedAt;
    /** End of the current messaging window; enforced by the backend. */
    @Column(name = "expires_at")
    private LocalDateTime expiresAt;
    @Column(name = "closed_at")
    private LocalDateTime closedAt;
    @Column(name = "closed_reason", length = 30)
    private String closedReason;
    @Column(name = "reopened_at")
    private LocalDateTime reopenedAt;
    @Column(name = "reopen_count", nullable = false)
    private int reopenCount = 0;
    @CreationTimestamp @Column(name = "created_at", updatable = false, nullable = false)
    private LocalDateTime createdAt;
    @UpdateTimestamp @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
