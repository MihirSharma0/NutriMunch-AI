package com.nutrition.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;

@Entity
@Table(name = "appointments")
@Data
public class Appointment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "nutritionist_id")
    private User nutritionist;

    @Column(nullable = false)
    private LocalDateTime appointmentTime;

    private String title;
    private String sessionType;
    private String status = "Requested";
    private String meetingLink;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "escrow_amount", precision = 12, scale = 2)
    private java.math.BigDecimal escrowAmount = java.math.BigDecimal.ZERO;

    @Column(name = "escrow_status", length = 30)
    private String escrowStatus = "NONE"; // NONE | HELD | CAPTURED | REFUNDED

    @Column(name = "escrow_transaction_ref", length = 64)
    private String escrowTransactionRef;

    @CreationTimestamp
    private LocalDateTime createdAt;
}
