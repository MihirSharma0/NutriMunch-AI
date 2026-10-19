package com.nutrition.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "wallet_transactions")
@Data
public class WalletTransaction {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "transaction_reference", nullable = false, unique = true, length = 64)
    private String transactionReference;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "source_wallet_id")
    private Wallet sourceWallet;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "target_wallet_id")
    private Wallet targetWallet;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "initiator_id")
    private User initiator;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "recipient_id")
    private User recipient;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false, length = 10)
    private String currency = "INR";

    @Column(name = "transaction_type", nullable = false, length = 50)
    private String transactionType; // ADMIN_CREDIT_ALLOCATION | SERVICE_PAYMENT

    @Column(nullable = false, length = 20)
    private String status; // SUCCESS | LOW_BALANCE | FAILED

    @Column(name = "razorpay_order_id", length = 100)
    private String razorpayOrderId;

    @Column(name = "razorpay_payment_id", length = 100)
    private String razorpayPaymentId;

    @Column(name = "razorpay_signature", length = 255)
    private String razorpaySignature;

    @Column(name = "appointment_id")
    private Long appointmentId;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "sender_balance_before", precision = 12, scale = 2)
    private BigDecimal senderBalanceBefore;

    @Column(name = "sender_balance_after", precision = 12, scale = 2)
    private BigDecimal senderBalanceAfter;

    @Column(name = "receiver_balance_before", precision = 12, scale = 2)
    private BigDecimal receiverBalanceBefore;

    @Column(name = "receiver_balance_after", precision = 12, scale = 2)
    private BigDecimal receiverBalanceAfter;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
