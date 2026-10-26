package com.nutrition.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;

@Entity
@Table(name = "conversations")
@Data
public class Conversation {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "appointment_id", unique = true)
    private Appointment appointment;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "patient_id", nullable = false)
    private User patient;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "nutritionist_id", nullable = false)
    private User nutritionist;
    @Column(nullable = false, length = 20)
    private String status = "ACTIVE";
    @CreationTimestamp @Column(name = "created_at", updatable = false, nullable = false)
    private LocalDateTime createdAt;
    @UpdateTimestamp @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
