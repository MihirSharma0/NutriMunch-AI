package com.nutrition.service;

import com.nutrition.dto.AppointmentDto;
import com.nutrition.entity.Appointment;
import com.nutrition.entity.Role;
import com.nutrition.entity.User;
import com.nutrition.entity.NutritionistProfile;
import com.nutrition.entity.Wallet;
import com.nutrition.entity.WalletTransaction;
import com.nutrition.exception.LowBalanceException;
import com.nutrition.repository.AppointmentRepository;
import com.nutrition.repository.ConversationRepository;
import com.nutrition.repository.NutritionistProfileRepository;
import com.nutrition.repository.UserRepository;
import com.nutrition.repository.WalletRepository;
import com.nutrition.repository.WalletTransactionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AppointmentService {

    private final AppointmentRepository appointmentRepository;
    private final UserRepository userRepository;
    private final NutritionistProfileRepository nutritionistProfileRepository;
    private final WalletRepository walletRepository;
    private final WalletTransactionRepository walletTransactionRepository;
    private final WalletService walletService;
    private final WalletSseService walletSseService;
    private final NotificationService notificationService;
    private final ConversationRepository conversationRepository;
    private final ConsultationLifecycleService consultationLifecycleService;

    private static final String USER_APPOINTMENTS_PATH = "/appointments";
    private static final String NUTRITIONIST_SCHEDULE_PATH = "/dashboard/nutritionist/schedule";

    public List<AppointmentDto> getMyAppointments(Long userId, Role role) {
        List<Appointment> list;
        if (role == Role.NUTRITIONIST) {
            // Only this nutritionist's own consultations: never unassigned rows, never another
            // nutritionist's patients, and no "show everything" fallback.
            list = appointmentRepository.findByNutritionistIdOrderByAppointmentTimeDesc(userId);
        } else if (role == Role.ADMIN) {
            list = appointmentRepository.findAllByOrderByAppointmentTimeDesc();
        } else {
            list = appointmentRepository.findByUserIdOrderByAppointmentTimeDesc(userId);
        }
        return list.stream().map(this::mapToDto).collect(Collectors.toList());
    }

    public List<Map<String, Object>> getAvailableNutritionists() {
        List<User> allUsers = userRepository.findAll();
        List<User> nutritionists = allUsers.stream()
                .filter(u -> u.getRole() != null && (u.getRole() == Role.NUTRITIONIST || "NUTRITIONIST".equalsIgnoreCase(u.getRole().name())))
                .collect(Collectors.toList());

        if (nutritionists.isEmpty()) {
            List<NutritionistProfile> profiles = nutritionistProfileRepository.findAll();
            for (NutritionistProfile p : profiles) {
                if (p.getUser() != null && p.getUser().getRole() == Role.NUTRITIONIST && !nutritionists.contains(p.getUser())) {
                    nutritionists.add(p.getUser());
                }
            }
        }

        List<Map<String, Object>> result = new ArrayList<>();
        for (User d : nutritionists) {
            Map<String, Object> map = new HashMap<>();
            map.put("id", d.getId());
            String name = (d.getFirstName() != null ? d.getFirstName() : "") + " " + (d.getLastName() != null ? d.getLastName() : "");
            if (name.trim().isEmpty()) {
                name = d.getEmail();
            }
            map.put("name", name.trim());
            map.put("email", d.getEmail());

            Optional<NutritionistProfile> profOpt = nutritionistProfileRepository.findByUserId(d.getId());
            if (profOpt.isPresent()) {
                NutritionistProfile prof = profOpt.get();
                map.put("credentials", prof.getCredentials() != null && !prof.getCredentials().trim().isEmpty() ? prof.getCredentials() : "Certified Clinical Nutritionist");
                map.put("specialization", prof.getSpecialization() != null && !prof.getSpecialization().trim().isEmpty() ? prof.getSpecialization() : "Clinical Nutrition");
                map.put("bio", prof.getBio() != null ? prof.getBio() : "Specialist in evidence-based nutrition protocols.");
                map.put("yearsOfExperience", prof.getYearsOfExperience() != null ? prof.getYearsOfExperience() : "7+ Years Exp.");
                map.put("consultationFee", prof.getConsultationFee() != null ? prof.getConsultationFee() : "₹1,500 / Session");
                map.put("languages", prof.getLanguages() != null ? prof.getLanguages() : "English, Hindi");
                map.put("licenseNumber", prof.getLicenseNumber() != null ? prof.getLicenseNumber() : "RD-LIC-98402");
                map.put("availability", prof.getAvailability() != null ? prof.getAvailability() : "Mon-Fri (09:00 - 17:00 EST)");
                String status = prof.getApprovalStatus() != null ? prof.getApprovalStatus() : "PENDING";
                map.put("approvalStatus", status);
                map.put("isApproved", "APPROVED".equalsIgnoreCase(status) || "VERIFIED".equalsIgnoreCase(status));
            } else {
                map.put("credentials", "Certified Clinical Nutritionist");
                map.put("specialization", "General Metabolic & Sports Nutrition");
                map.put("bio", "Specialist in evidence-based nutrition protocols.");
                map.put("yearsOfExperience", "7+ Years Exp.");
                map.put("consultationFee", "₹1,500 / Session");
                map.put("languages", "English, Hindi");
                map.put("licenseNumber", "RD-LIC-98402");
                map.put("availability", "Mon-Fri (09:00 - 17:00 EST)");
                map.put("approvalStatus", "PENDING");
                map.put("isApproved", false);
            }
            result.add(map);
        }
        return result;
    }

    /**
     * STEP 1: ATOMIC BOOKING CREATION WITH ESCROW HOLD (ACID)
     * Deducts funds from user's available balance and locks them in ESCROW / PENDING state.
     * Nutritionist balance is NOT credited until acceptance.
     */
    @Transactional(rollbackFor = Exception.class)
    public AppointmentDto bookAppointment(Long currentUserId, Role role, AppointmentDto dto) {
        // The booking belongs to the authenticated caller; only an admin may book for someone else.
        Long ownerId = role == Role.ADMIN && dto.getUserId() != null ? dto.getUserId() : currentUserId;
        User user = userRepository.findById(ownerId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        User nutritionist;
        if (dto.getNutritionistId() != null) {
            nutritionist = userRepository.findById(dto.getNutritionistId())
                    .filter(candidate -> candidate.getRole() == Role.NUTRITIONIST)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST,
                            "Choose a registered nutritionist for this consultation"));
        } else if (role == Role.NUTRITIONIST) {
            nutritionist = userRepository.findById(currentUserId)
                    .filter(candidate -> candidate.getRole() == Role.NUTRITIONIST)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Nutritionist not found"));
        } else {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Choose a registered nutritionist for this consultation");
        }

        // Calculate session fee
        BigDecimal fee = dto.getSessionFee();
        if (fee == null || fee.compareTo(BigDecimal.ZERO) <= 0) {
            if (nutritionist != null) {
                Optional<NutritionistProfile> profOpt = nutritionistProfileRepository.findByUserId(nutritionist.getId());
                if (profOpt.isPresent() && profOpt.get().getConsultationFee() != null) {
                    try {
                        String clean = profOpt.get().getConsultationFee().replaceAll("[^0-9.]", "");
                        if (!clean.isEmpty()) {
                            fee = new BigDecimal(clean);
                        }
                    } catch (Exception ignored) {}
                }
            }
        }
        if (fee == null || fee.compareTo(BigDecimal.ZERO) <= 0) {
            fee = new BigDecimal("500.00");
        }

        Wallet userWallet = walletService.getOrCreateWalletWithLock(user);
        BigDecimal currentBalance = userWallet.getBalance() != null ? userWallet.getBalance() : BigDecimal.ZERO;

        // Check if user has sufficient balance for escrow hold
        if (currentBalance.compareTo(fee) < 0) {
            BigDecimal deficit = fee.subtract(currentBalance);
            String failRef = "TXN-LOWBAL-" + System.currentTimeMillis() + "-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase();

            WalletTransaction blockedTx = new WalletTransaction();
            blockedTx.setTransactionReference(failRef);
            blockedTx.setSourceWallet(userWallet);
            blockedTx.setTargetWallet(nutritionist != null ? walletService.getOrCreateWallet(nutritionist) : null);
            blockedTx.setInitiator(user);
            blockedTx.setRecipient(nutritionist);
            blockedTx.setAmount(fee);
            blockedTx.setCurrency(userWallet.getCurrency());
            blockedTx.setTransactionType("ESCROW_HOLD");
            blockedTx.setStatus("LOW_BALANCE");
            blockedTx.setNotes(String.format("Blocked by Low Balance Guard: Consultation fee ₹%.2f required but available balance is ₹%.2f (Deficit: ₹%.2f)",
                    fee, currentBalance, deficit));
            blockedTx.setSenderBalanceBefore(currentBalance);
            blockedTx.setSenderBalanceAfter(currentBalance);
            walletTransactionRepository.save(blockedTx);

            log.warn("Escrow hold blocked for user {} - balance ₹{} < fee ₹{}", user.getEmail(), currentBalance, fee);
            throw new LowBalanceException(currentBalance, fee, deficit,
                    String.format("Insufficient wallet balance. You have ₹%.2f but ₹%.2f is required for appointment escrow.", currentBalance, fee));
        }

        // Execute Escrow Hold: Deduct from user wallet, do NOT credit nutritionist yet
        BigDecimal userBalBefore = currentBalance;
        BigDecimal userBalAfter = userBalBefore.subtract(fee);
        userWallet.setBalance(userBalAfter);
        walletRepository.save(userWallet);

        String escrowRef = "ESCROW-HOLD-" + System.currentTimeMillis() + "-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase();

        Appointment appointment = new Appointment();
        appointment.setUser(user);
        appointment.setNutritionist(nutritionist);
        appointment.setAppointmentTime(dto.getAppointmentTime() != null ? dto.getAppointmentTime() : LocalDateTime.now().plusDays(1).withHour(10).withMinute(0));
        appointment.setTitle(dto.getTitle() != null && !dto.getTitle().trim().isEmpty() ? dto.getTitle() : "Clinical Nutrition Consultation");
        appointment.setSessionType(dto.getSessionType() != null && !dto.getSessionType().trim().isEmpty() ? dto.getSessionType() : "Clinical Consultation");
        appointment.setNotes(dto.getNotes() != null ? dto.getNotes() : "");
        // A new booking always starts as a request: the client can no longer self-confirm.
        appointment.setStatus("Requested");
        appointment.setMeetingLink(dto.getMeetingLink() != null ? dto.getMeetingLink() : "https://meet.google.com");
        appointment.setEscrowAmount(fee);
        appointment.setEscrowStatus("HELD");
        appointment.setEscrowTransactionRef(escrowRef);

        Appointment savedAppointment = appointmentRepository.save(appointment);

        // Record Escrow Hold in Audit Ledger
        Wallet nutritionistWallet = nutritionist != null ? walletService.getOrCreateWallet(nutritionist) : null;
        BigDecimal nutritionistBal = nutritionistWallet != null && nutritionistWallet.getBalance() != null ? nutritionistWallet.getBalance() : BigDecimal.ZERO;

        WalletTransaction holdTx = new WalletTransaction();
        holdTx.setTransactionReference(escrowRef);
        holdTx.setSourceWallet(userWallet);
        holdTx.setTargetWallet(nutritionistWallet);
        holdTx.setInitiator(user);
        holdTx.setRecipient(nutritionist);
        holdTx.setAmount(fee);
        holdTx.setCurrency(userWallet.getCurrency());
        holdTx.setTransactionType("ESCROW_HOLD");
        holdTx.setStatus("HELD");
        holdTx.setAppointmentId(savedAppointment.getId());
        holdTx.setNotes(String.format("Escrow payment hold of ₹%.2f for appointment #%d with %s",
                fee, savedAppointment.getId(), nutritionist != null ? nutritionist.getEmail() : "Nutritionist"));
        holdTx.setSenderBalanceBefore(userBalBefore);
        holdTx.setSenderBalanceAfter(userBalAfter);
        holdTx.setReceiverBalanceBefore(nutritionistBal);
        holdTx.setReceiverBalanceAfter(nutritionistBal); // Nutritionist not credited yet!

        WalletTransaction savedTx = walletTransactionRepository.save(holdTx);

        log.info("ESCROW HELD: User [{}] locked ₹{} in escrow for Appointment #{}. Balance: ₹{} -> ₹{}. Ref: {}",
                user.getEmail(), fee, savedAppointment.getId(), userBalBefore, userBalAfter, escrowRef);

        AppointmentDto resultDto = mapToDto(savedAppointment);

        // Emit real-time SSE updates
        // 1. User wallet update
        Map<String, Object> holdPayload = new HashMap<>();
        holdPayload.put("eventType", "ESCROW_HOLD");
        holdPayload.put("type", "ESCROW_HOLD");
        holdPayload.put("transactionId", savedTx.getId());
        holdPayload.put("transactionReference", escrowRef);
        holdPayload.put("recipientId", user.getId());
        holdPayload.put("recipientEmail", user.getEmail());
        holdPayload.put("newBalance", userBalAfter);
        holdPayload.put("balance", userBalAfter);
        holdPayload.put("amount", fee.negate());
        holdPayload.put("description", holdTx.getNotes());
        holdPayload.put("timestamp", java.time.Instant.now().toString());
        holdPayload.put("status", "HELD");
        walletSseService.sendWalletUpdate(user.getId(), user.getEmail(), holdPayload);

        // 2. Appointment update to nutritionist & user
        Map<String, Object> aptEvent = Map.of(
                "type", "APPOINTMENT_UPDATED",
                "action", "REQUESTED",
                "appointment", resultDto
        );
        if (nutritionist != null) {
            walletSseService.sendAppointmentUpdate(nutritionist.getId(), nutritionist.getEmail(), aptEvent);
        }
        walletSseService.sendAppointmentUpdate(user.getId(), user.getEmail(), aptEvent);

        // 3. Admin Ledger stream
        walletSseService.broadcastToAdmins(Map.of(
                "type", "LEDGER_UPDATED",
                "transaction", Map.of(
                        "id", savedTx.getId(),
                        "transactionReference", escrowRef,
                        "amount", fee,
                        "currency", userWallet.getCurrency(),
                        "transactionType", "ESCROW_HOLD",
                        "status", "HELD",
                        "senderBalanceBefore", userBalBefore,
                        "senderBalanceAfter", userBalAfter,
                        "createdAt", savedTx.getCreatedAt() != null ? savedTx.getCreatedAt() : LocalDateTime.now()
                )
        ));

        if (nutritionist != null) {
            notificationService.notifyUser(nutritionist, currentUserId, "New Appointment Request",
                    String.format("%s requested \"%s\" on %s. ₹%.2f is held in escrow until you respond.",
                            displayName(user), savedAppointment.getTitle(), formatWhen(savedAppointment), fee),
                    "APPOINTMENT", "event", NUTRITIONIST_SCHEDULE_PATH);
        }

        return resultDto;
    }

    /**
     * STEP 2a & 2b: ATOMIC ESCROW CAPTURE OR COMPENSATING REFUND (ACID & IDEMPOTENT)
     * - If ACCEPTED / Confirmed: Release funds from ESCROW to nutritionist's balance.
     * - If REJECTED / CANCELLED: Immediately refund locked funds back to user's balance.
     */
    @Transactional(rollbackFor = Exception.class)
    public AppointmentDto updateAppointmentStatus(Long appointmentId, String status, String meetingLink, String notes) {
        return updateAppointmentStatus(appointmentId, status, meetingLink, notes, null, true);
    }

    @Transactional(rollbackFor = Exception.class)
    public AppointmentDto updateAppointmentStatus(Long appointmentId, String status, String meetingLink, String notes, Long callerId, boolean isAdmin) {
        Appointment apt = appointmentRepository.findByIdWithLock(appointmentId)
                .orElseThrow(() -> new RuntimeException("Appointment not found: " + appointmentId));

        // Snapshot for change-based alerts sent once the update is saved
        String prevStatus = apt.getStatus();
        String prevEscrow = apt.getEscrowStatus();
        BigDecimal escrowAmount = apt.getEscrowAmount();

        if (!isAdmin && callerId != null) {
            Long patientId = apt.getUser() != null ? apt.getUser().getId() : null;
            Long nutritionistId = apt.getNutritionist() != null ? apt.getNutritionist().getId() : null;
            if ((patientId == null || !callerId.equals(patientId)) &&
                (nutritionistId == null || !callerId.equals(nutritionistId))) {
                throw new org.springframework.security.access.AccessDeniedException("Unauthorized to modify this appointment.");
            }
        }

        if (meetingLink != null && !meetingLink.trim().isEmpty()) {
            apt.setMeetingLink(meetingLink);
        }
        if (notes != null) {
            apt.setNotes(notes);
        }

        if (status != null && !status.trim().isEmpty()) {
            String upperStatus = status.trim().toUpperCase();

            // Accepting or declining a consultation is the nutritionist's decision alone. Without
            // this the patient could confirm their own request and unlock the chat.
            boolean callerIsAssignedNutritionist = callerId != null && apt.getNutritionist() != null
                    && callerId.equals(apt.getNutritionist().getId());
            boolean isAcceptOrDecline = "CONFIRMED".equals(upperStatus) || "ACCEPTED".equals(upperStatus)
                    || "APPROVED".equals(upperStatus) || "REJECTED".equals(upperStatus)
                    || "DENIED".equals(upperStatus);
            if (isAcceptOrDecline && !isAdmin && !callerIsAssignedNutritionist) {
                throw new org.springframework.security.access.AccessDeniedException(
                        "Only the assigned nutritionist can accept or decline this consultation.");
            }

            // Only the nutritionist (or an admin) may approve/decline a cancellation request
            boolean isCancellationDecision = upperStatus.startsWith("APPROVE_CANCELLATION")
                    || "DECLINE_CANCELLATION".equals(upperStatus) || "REJECT_CANCELLATION".equals(upperStatus);
            boolean callerIsPatient = callerId != null && apt.getUser() != null && callerId.equals(apt.getUser().getId());
            if (isCancellationDecision && !isAdmin && callerIsPatient) {
                throw new org.springframework.security.access.AccessDeniedException("Only the nutritionist can respond to a cancellation request.");
            }

            // Policy: once confirmed, cancellation approval is non-refundable. Refunds require
            // the explicit admin-only APPROVE_CANCELLATION_REFUND action.
            if (!isAdmin && ("APPROVE_CANCELLATION".equals(upperStatus) || "APPROVE_CANCELLATION_REFUND".equals(upperStatus))) {
                upperStatus = "APPROVE_CANCELLATION_NO_REFUND";
            }

            boolean isNutritionistCancellationResponse =
                    "APPROVE_CANCELLATION_NO_REFUND".equals(upperStatus)
                            || "APPROVE_CANCELLATION".equals(upperStatus)
                            || "DECLINE_CANCELLATION".equals(upperStatus)
                            || "REJECT_CANCELLATION".equals(upperStatus);
            if (isNutritionistCancellationResponse
                    && !"CANCELLATION_REQUESTED".equalsIgnoreCase(apt.getStatus())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "There is no pending cancellation request for this appointment.");
            }

            if ("CANCELLED_BY_NUTRITIONIST".equals(upperStatus)) {
                if (isAdmin || callerId == null || apt.getNutritionist() == null
                        || !callerId.equals(apt.getNutritionist().getId())) {
                    throw new org.springframework.security.access.AccessDeniedException(
                            "Only the assigned nutritionist can cancel this appointment.");
                }
                String currentStatus = apt.getStatus() != null ? apt.getStatus().toUpperCase() : "";
                if (!"CONFIRMED".equals(currentStatus) && !"ACCEPTED".equals(currentStatus)
                        && !"APPROVED".equals(currentStatus) && !"SCHEDULED".equals(currentStatus)
                        && !"CANCELLATION_REQUESTED".equals(currentStatus)) {
                    throw new ResponseStatusException(HttpStatus.CONFLICT,
                            "Only a confirmed appointment can be cancelled by the nutritionist.");
                }

                if ("CAPTURED".equalsIgnoreCase(apt.getEscrowStatus())) {
                    refundCapturedEscrowToUser(apt, apt.getNutritionist());
                } else if ("HELD".equalsIgnoreCase(apt.getEscrowStatus())) {
                    refundEscrowHoldToUser(apt, "CANCELLED_BY_NUTRITIONIST");
                } else {
                    throw new ResponseStatusException(HttpStatus.CONFLICT,
                            "This confirmed appointment has no refundable payment.");
                }
                apt.setStatus("CANCELLED_BY_NUTRITIONIST");
                apt.setNotes(notes != null && !notes.isBlank()
                        ? notes
                        : "Cancelled by nutritionist after confirmation. The consultation fee was refunded.");

            // STEP 2a: Nutritionist ACCEPTS the booking (Hold & Capture)
            } else if ("CONFIRMED".equals(upperStatus) || "ACCEPTED".equals(upperStatus) || "APPROVED".equals(upperStatus)) {
                // Idempotency check: prevent duplicate escrow capture
                if ("CAPTURED".equalsIgnoreCase(apt.getEscrowStatus())) {
                    log.info("Appointment #{} escrow already CAPTURED. Skipping duplicate capture.", appointmentId);
                } else if ("HELD".equalsIgnoreCase(apt.getEscrowStatus()) && apt.getEscrowAmount() != null && apt.getEscrowAmount().compareTo(BigDecimal.ZERO) > 0) {
                    User nutritionist = apt.getNutritionist();
                    if (nutritionist != null) {
                        Wallet nutritionistWallet = walletService.getOrCreateWalletWithLock(nutritionist);
                        BigDecimal nutritionistBalBefore = nutritionistWallet.getBalance() != null ? nutritionistWallet.getBalance() : BigDecimal.ZERO;
                        BigDecimal nutritionistBalAfter = nutritionistBalBefore.add(apt.getEscrowAmount());
                        nutritionistWallet.setBalance(nutritionistBalAfter);
                        walletRepository.save(nutritionistWallet);

                        String captureRef = "ESCROW-REL-" + System.currentTimeMillis() + "-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase();
                        apt.setEscrowStatus("CAPTURED");
                        apt.setEscrowTransactionRef(captureRef);

                        // Audit Ledger Entry
                        User user = apt.getUser();
                        Wallet userWallet = user != null ? walletService.getOrCreateWallet(user) : null;
                        BigDecimal userBal = userWallet != null && userWallet.getBalance() != null ? userWallet.getBalance() : BigDecimal.ZERO;

                        WalletTransaction releaseTx = new WalletTransaction();
                        releaseTx.setTransactionReference(captureRef);
                        releaseTx.setSourceWallet(userWallet);
                        releaseTx.setTargetWallet(nutritionistWallet);
                        releaseTx.setInitiator(user);
                        releaseTx.setRecipient(nutritionist);
                        releaseTx.setAmount(apt.getEscrowAmount());
                        releaseTx.setCurrency(nutritionistWallet.getCurrency());
                        releaseTx.setTransactionType("ESCROW_RELEASE");
                        releaseTx.setStatus("SUCCESS");
                        releaseTx.setAppointmentId(apt.getId());
                        releaseTx.setNotes(String.format("Escrow released to Nutritionist [%s] upon appointment #%d confirmation", nutritionist.getEmail(), apt.getId()));
                        releaseTx.setSenderBalanceBefore(userBal);
                        releaseTx.setSenderBalanceAfter(userBal);
                        releaseTx.setReceiverBalanceBefore(nutritionistBalBefore);
                        releaseTx.setReceiverBalanceAfter(nutritionistBalAfter);
                        WalletTransaction savedTx = walletTransactionRepository.save(releaseTx);

                        // Mark original hold transaction as RELEASED
                        if (apt.getId() != null) {
                            try {
                                walletTransactionRepository.findAll().stream()
                                        .filter(tx -> apt.getId().equals(tx.getAppointmentId()) && "ESCROW_HOLD".equalsIgnoreCase(tx.getTransactionType()))
                                        .forEach(tx -> {
                                            tx.setStatus("RELEASED");
                                            walletTransactionRepository.save(tx);
                                        });
                            } catch (Exception ignored) {}
                        }

                        log.info("ESCROW CAPTURED: Credited ₹{} to Nutritionist [{}] (Bal: ₹{} -> ₹{}). Ref: {}",
                                apt.getEscrowAmount(), nutritionist.getEmail(), nutritionistBalBefore, nutritionistBalAfter, captureRef);

                        // Push SSE to Nutritionist
                        Map<String, Object> releasePayload = new HashMap<>();
                        releasePayload.put("eventType", "ESCROW_RELEASE");
                        releasePayload.put("type", "ESCROW_RELEASE");
                        releasePayload.put("transactionId", savedTx.getId());
                        releasePayload.put("transactionReference", captureRef);
                        releasePayload.put("recipientId", nutritionist.getId());
                        releasePayload.put("recipientEmail", nutritionist.getEmail());
                        releasePayload.put("newBalance", nutritionistBalAfter);
                        releasePayload.put("balance", nutritionistBalAfter);
                        releasePayload.put("amount", apt.getEscrowAmount());
                        releasePayload.put("description", releaseTx.getNotes());
                        releasePayload.put("timestamp", java.time.Instant.now().toString());
                        releasePayload.put("status", "SUCCESS");
                        walletSseService.sendWalletUpdate(nutritionist.getId(), nutritionist.getEmail(), releasePayload);

                        // Stream to Admin Ledger
                        walletSseService.broadcastToAdmins(Map.of(
                                "type", "LEDGER_UPDATED",
                                "transaction", Map.of(
                                        "id", savedTx.getId(),
                                        "transactionReference", captureRef,
                                        "amount", apt.getEscrowAmount(),
                                        "currency", nutritionistWallet.getCurrency(),
                                        "transactionType", "ESCROW_RELEASE",
                                        "status", "SUCCESS",
                                        "receiverBalanceBefore", nutritionistBalBefore,
                                        "receiverBalanceAfter", nutritionistBalAfter,
                                        "createdAt", savedTx.getCreatedAt() != null ? savedTx.getCreatedAt() : LocalDateTime.now()
                                )
                        ));
                    }
                }
                apt.setStatus("Confirmed");

            // STEP 2c: Nutritionist approves cancellation; captured funds remain in their wallet.
            } else if ("APPROVE_CANCELLATION_NO_REFUND".equals(upperStatus) ||
                      "APPROVE_CANCELLATION".equals(upperStatus)) {
                apt.setStatus("CANCELLED");
                if (notes != null && !notes.isBlank()) {
                    apt.setNotes(notes);
                } else {
                    apt.setNotes("Cancellation approved by nutritionist. The session fee remains in the nutritionist wallet.");
                }
                log.info("Cancellation approved without refund for appointment #{}", apt.getId());

            // STEP 2c-alt: Explicit admin override - approve cancellation AND refund captured funds.
            } else if ("APPROVE_CANCELLATION_REFUND".equals(upperStatus)) {
                if ("CAPTURED".equalsIgnoreCase(apt.getEscrowStatus())) {
                    User nutritionist = apt.getNutritionist();
                    User user = apt.getUser();
                    BigDecimal refundAmt = apt.getEscrowAmount();

                    if (refundAmt == null || refundAmt.compareTo(BigDecimal.ZERO) <= 0) {
                        throw new ResponseStatusException(HttpStatus.CONFLICT, "This appointment has no refundable captured amount.");
                    }
                    if (nutritionist == null || user == null) {
                        throw new ResponseStatusException(HttpStatus.CONFLICT, "The appointment is missing a client or nutritionist account.");
                    }

                    Wallet nutritionistWallet = walletService.getOrCreateWalletWithLock(nutritionist);
                    Wallet userWallet = walletService.getOrCreateWalletWithLock(user);

                    BigDecimal nutritionistBalBefore = nutritionistWallet.getBalance() != null ? nutritionistWallet.getBalance() : BigDecimal.ZERO;
                    if (nutritionistBalBefore.compareTo(refundAmt) < 0) {
                        throw new ResponseStatusException(HttpStatus.CONFLICT, "The nutritionist's wallet balance is insufficient to issue this refund.");
                    }
                    BigDecimal nutritionistBalAfter = nutritionistBalBefore.subtract(refundAmt);
                    nutritionistWallet.setBalance(nutritionistBalAfter);
                    walletRepository.save(nutritionistWallet);

                    BigDecimal userBalBefore = userWallet.getBalance() != null ? userWallet.getBalance() : BigDecimal.ZERO;
                    BigDecimal userBalAfter = userBalBefore.add(refundAmt);
                    userWallet.setBalance(userBalAfter);
                    walletRepository.save(userWallet);

                    String refundRef = "TXN-REFUND-" + System.currentTimeMillis() + "-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase();
                    apt.setEscrowStatus("REFUNDED");
                    apt.setEscrowTransactionRef(refundRef);
                    apt.setStatus("CANCELLED");
                    User admin = userRepository.findById(callerId)
                            .orElseThrow(() -> new RuntimeException("Admin user not found: " + callerId));

                    WalletTransaction refundTx = new WalletTransaction();
                    refundTx.setTransactionReference(refundRef);
                    refundTx.setSourceWallet(nutritionistWallet);
                    refundTx.setTargetWallet(userWallet);
                    refundTx.setInitiator(admin);
                    refundTx.setRecipient(user);
                    refundTx.setAmount(refundAmt);
                    refundTx.setCurrency(userWallet.getCurrency());
                    refundTx.setTransactionType("ESCROW_REFUND");
                    refundTx.setStatus("REFUNDED");
                    refundTx.setAppointmentId(apt.getId());
                    refundTx.setNotes(String.format("Admin [%s] issued a cancellation refund of ₹%.2f to client [%s]",
                            admin.getEmail(), refundAmt, user.getEmail()));
                    refundTx.setSenderBalanceBefore(nutritionistBalBefore);
                    refundTx.setSenderBalanceAfter(nutritionistBalAfter);
                    refundTx.setReceiverBalanceBefore(userBalBefore);
                    refundTx.setReceiverBalanceAfter(userBalAfter);
                    WalletTransaction savedTx = walletTransactionRepository.save(refundTx);

                    log.info("ADMIN-ISSUED REFUND: Deducted ₹{} from Nutritionist [{}] and refunded to User [{}]. Ref: {}",
                            refundAmt, nutritionist.getEmail(), user.getEmail(), refundRef);

                    // Push SSE to Nutritionist (deduction)
                    Map<String, Object> nutritionistPayload = new HashMap<>();
                    nutritionistPayload.put("eventType", "ESCROW_REFUND");
                    nutritionistPayload.put("type", "ESCROW_REFUND");
                    nutritionistPayload.put("transactionId", savedTx.getId());
                    nutritionistPayload.put("transactionReference", refundRef);
                    nutritionistPayload.put("recipientId", nutritionist.getId());
                    nutritionistPayload.put("recipientEmail", nutritionist.getEmail());
                    nutritionistPayload.put("newBalance", nutritionistBalAfter);
                    nutritionistPayload.put("balance", nutritionistBalAfter);
                    nutritionistPayload.put("amount", refundAmt.negate());
                    nutritionistPayload.put("description", "Admin-issued refund of ₹" + refundAmt + " to client");
                    nutritionistPayload.put("timestamp", java.time.Instant.now().toString());
                    nutritionistPayload.put("status", "SUCCESS");
                    walletSseService.sendWalletUpdate(nutritionist.getId(), nutritionist.getEmail(), nutritionistPayload);

                    // Push SSE to User (refund credit)
                    Map<String, Object> userPayload = new HashMap<>();
                    userPayload.put("eventType", "ESCROW_REFUND");
                    userPayload.put("type", "ESCROW_REFUND");
                    userPayload.put("transactionId", savedTx.getId());
                    userPayload.put("transactionReference", refundRef);
                    userPayload.put("recipientId", user.getId());
                    userPayload.put("recipientEmail", user.getEmail());
                    userPayload.put("newBalance", userBalAfter);
                    userPayload.put("balance", userBalAfter);
                    userPayload.put("amount", refundAmt);
                    userPayload.put("description", "Consultation fee of ₹" + refundAmt + " refunded by admin");
                    userPayload.put("timestamp", java.time.Instant.now().toString());
                    userPayload.put("status", "SUCCESS");
                    walletSseService.sendWalletUpdate(user.getId(), user.getEmail(), userPayload);

                    // Stream to Admin Ledger
                    walletSseService.broadcastToAdmins(Map.of(
                            "type", "LEDGER_UPDATED",
                            "transaction", Map.ofEntries(
                                    Map.entry("id", savedTx.getId()),
                                    Map.entry("transactionReference", refundRef),
                                    Map.entry("amount", refundAmt),
                                    Map.entry("currency", userWallet.getCurrency()),
                                    Map.entry("transactionType", "ESCROW_REFUND"),
                                    Map.entry("status", "REFUNDED"),
                                    Map.entry("senderBalanceBefore", nutritionistBalBefore),
                                    Map.entry("senderBalanceAfter", nutritionistBalAfter),
                                    Map.entry("receiverBalanceBefore", userBalBefore),
                                    Map.entry("receiverBalanceAfter", userBalAfter),
                                    Map.entry("createdAt", savedTx.getCreatedAt() != null ? savedTx.getCreatedAt() : LocalDateTime.now())
                            )
                    ));
                } else if ("HELD".equalsIgnoreCase(apt.getEscrowStatus())) {
                    if (apt.getEscrowAmount() == null || apt.getEscrowAmount().compareTo(BigDecimal.ZERO) <= 0 || apt.getUser() == null) {
                        throw new ResponseStatusException(HttpStatus.CONFLICT, "This appointment does not have a refundable escrow hold.");
                    }
                    refundEscrowHoldToUser(apt, "CANCELLED");
                } else {
                    throw new ResponseStatusException(HttpStatus.CONFLICT, "This appointment does not have refundable escrow funds.");
                }
                apt.setStatus("CANCELLED");

            // STEP 2d: Nutritionist DECLINES Cancellation Request
            } else if ("DECLINE_CANCELLATION".equals(upperStatus) || "REJECT_CANCELLATION".equals(upperStatus)) {
                apt.setStatus("Confirmed");
                if (notes != null && !notes.isBlank()) {
                    apt.setNotes(notes);
                }

            // STEP 2e: Client Requests Cancellation from Nutritionist
            } else if ("CANCELLATION_REQUESTED".equals(upperStatus) || "REQUEST_CANCEL".equals(upperStatus)) {
                apt.setStatus("CANCELLATION_REQUESTED");

            // STEP 2b: Nutritionist REJECTS unconfirmed booking OR User cancels unconfirmed booking (HELD state)
            } else if ("REJECTED".equals(upperStatus) || "CANCELLED".equals(upperStatus) || "DENIED".equals(upperStatus)) {
                // If appointment was already confirmed, user cannot directly cancel unilaterally
                if ("Confirmed".equalsIgnoreCase(apt.getStatus()) || "CAPTURED".equalsIgnoreCase(apt.getEscrowStatus())) {
                    apt.setStatus("CANCELLATION_REQUESTED");
                } else {
                    refundEscrowHoldToUser(apt, upperStatus);
                    apt.setStatus("REJECTED".equals(upperStatus) || "DENIED".equals(upperStatus) ? "REJECTED" : "CANCELLED");
                }
            } else {
                apt.setStatus(status);
            }
        }

        Appointment updated = appointmentRepository.save(apt);
        syncConversationWithAppointment(updated);
        AppointmentDto dtoResult = mapToDto(updated);
        notifyAppointmentChange(updated, prevStatus, prevEscrow, escrowAmount, callerId);

        // Push real-time SSE appointment update to both parties
        Map<String, Object> sseEvent = Map.of(
                "type", "APPOINTMENT_UPDATED",
                "action", "STATUS_CHANGED",
                "appointment", dtoResult
        );
        if (updated.getUser() != null) {
            walletSseService.sendAppointmentUpdate(updated.getUser().getId(), updated.getUser().getEmail(), sseEvent);
        }
        if (updated.getNutritionist() != null) {
            walletSseService.sendAppointmentUpdate(updated.getNutritionist().getId(), updated.getNutritionist().getEmail(), sseEvent);
        }

        return dtoResult;
    }

    /**
     * Client requests to cancel an appointment.
     * - If still in unconfirmed state: immediately cancels with escrow release back to client.
     * - If already confirmed/accepted by nutritionist: transitions state to CANCELLATION_REQUESTED.
     *   Approval cancels the consultation without refund; refunds require an explicit admin override.
     */
    @Transactional(rollbackFor = Exception.class)
    public AppointmentDto requestCancellation(Long appointmentId, Long userId, String reason) {
        Appointment apt = appointmentRepository.findByIdWithLock(appointmentId)
                .orElseThrow(() -> new RuntimeException("Appointment not found: " + appointmentId));

        if (apt.getUser() == null || !apt.getUser().getId().equals(userId)) {
            throw new RuntimeException("Unauthorized: Only the booking client can request cancellation.");
        }

        String currentStatus = apt.getStatus() != null ? apt.getStatus().toUpperCase() : "";
        if ("CANCELLED".equals(currentStatus) || "REJECTED".equals(currentStatus)) {
            return mapToDto(apt);
        }

        // If unconfirmed, process direct refund immediately
        if (!"CONFIRMED".equals(currentStatus) && !"ACCEPTED".equals(currentStatus) && !"CAPTURED".equalsIgnoreCase(apt.getEscrowStatus())) {
            return updateAppointmentStatus(appointmentId, "CANCELLED", null, reason, userId, true);
        }

        // Already confirmed by nutritionist -> Require nutritionist approval to cancel without refund
        String prevStatusBeforeRequest = apt.getStatus();
        apt.setStatus("CANCELLATION_REQUESTED");
        if (reason != null && !reason.isBlank()) {
            apt.setNotes(apt.getNotes() != null ? apt.getNotes() + " | Cancellation Reason: " + reason : "Cancellation Reason: " + reason);
        }

        Appointment updated = appointmentRepository.save(apt);
        AppointmentDto dtoResult = mapToDto(updated);
        notifyAppointmentChange(updated, prevStatusBeforeRequest, updated.getEscrowStatus(), updated.getEscrowAmount(), userId);

        Map<String, Object> sseEvent = Map.of(
                "type", "APPOINTMENT_UPDATED",
                "action", "CANCELLATION_REQUESTED",
                "appointment", dtoResult
        );
        if (updated.getUser() != null) {
            walletSseService.sendAppointmentUpdate(updated.getUser().getId(), updated.getUser().getEmail(), sseEvent);
        }
        if (updated.getNutritionist() != null) {
            walletSseService.sendAppointmentUpdate(updated.getNutritionist().getId(), updated.getNutritionist().getEmail(), sseEvent);
        }

        log.info("Client [{}] submitted cancellation request for confirmed appointment #{}", apt.getUser().getEmail(), apt.getId());
        return dtoResult;
    }

    private void refundCapturedEscrowToUser(Appointment apt, User initiator) {
        User user = apt.getUser();
        User nutritionist = apt.getNutritionist();
        BigDecimal amount = apt.getEscrowAmount();
        if (user == null || nutritionist == null || amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This appointment has no refundable captured payment.");
        }

        Wallet nutritionistWallet = walletService.getOrCreateWalletWithLock(nutritionist);
        Wallet userWallet = walletService.getOrCreateWalletWithLock(user);
        BigDecimal nutritionistBefore = nutritionistWallet.getBalance() != null ? nutritionistWallet.getBalance() : BigDecimal.ZERO;
        if (nutritionistBefore.compareTo(amount) < 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "The nutritionist's wallet balance is insufficient to issue this refund.");
        }
        BigDecimal nutritionistAfter = nutritionistBefore.subtract(amount);
        BigDecimal userBefore = userWallet.getBalance() != null ? userWallet.getBalance() : BigDecimal.ZERO;
        BigDecimal userAfter = userBefore.add(amount);

        nutritionistWallet.setBalance(nutritionistAfter);
        userWallet.setBalance(userAfter);
        walletRepository.save(nutritionistWallet);
        walletRepository.save(userWallet);

        String refundRef = "ESCROW-REFUND-" + System.currentTimeMillis() + "-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase();
        apt.setEscrowStatus("REFUNDED");
        apt.setEscrowTransactionRef(refundRef);

        WalletTransaction refundTx = new WalletTransaction();
        refundTx.setTransactionReference(refundRef);
        refundTx.setSourceWallet(nutritionistWallet);
        refundTx.setTargetWallet(userWallet);
        refundTx.setInitiator(initiator);
        refundTx.setRecipient(user);
        refundTx.setAmount(amount);
        refundTx.setCurrency(userWallet.getCurrency());
        refundTx.setTransactionType("ESCROW_REFUND");
        refundTx.setStatus("REFUNDED");
        refundTx.setAppointmentId(apt.getId());
        refundTx.setNotes(String.format("Refunded ₹%.2f to client because nutritionist cancelled confirmed appointment #%d",
                amount, apt.getId()));
        refundTx.setSenderBalanceBefore(nutritionistBefore);
        refundTx.setSenderBalanceAfter(nutritionistAfter);
        refundTx.setReceiverBalanceBefore(userBefore);
        refundTx.setReceiverBalanceAfter(userAfter);
        WalletTransaction savedTx = walletTransactionRepository.save(refundTx);

        Map<String, Object> nutritionistPayload = new HashMap<>();
        nutritionistPayload.put("eventType", "ESCROW_REFUND");
        nutritionistPayload.put("type", "ESCROW_REFUND");
        nutritionistPayload.put("transactionId", savedTx.getId());
        nutritionistPayload.put("transactionReference", refundRef);
        nutritionistPayload.put("recipientId", nutritionist.getId());
        nutritionistPayload.put("recipientEmail", nutritionist.getEmail());
        nutritionistPayload.put("newBalance", nutritionistAfter);
        nutritionistPayload.put("balance", nutritionistAfter);
        nutritionistPayload.put("amount", amount.negate());
        nutritionistPayload.put("description", "Refunded ₹" + amount + " to client after nutritionist cancellation");
        nutritionistPayload.put("timestamp", java.time.Instant.now().toString());
        nutritionistPayload.put("status", "SUCCESS");
        walletSseService.sendWalletUpdate(nutritionist.getId(), nutritionist.getEmail(), nutritionistPayload);

        Map<String, Object> userPayload = new HashMap<>();
        userPayload.put("eventType", "ESCROW_REFUND");
        userPayload.put("type", "ESCROW_REFUND");
        userPayload.put("transactionId", savedTx.getId());
        userPayload.put("transactionReference", refundRef);
        userPayload.put("recipientId", user.getId());
        userPayload.put("recipientEmail", user.getEmail());
        userPayload.put("newBalance", userAfter);
        userPayload.put("balance", userAfter);
        userPayload.put("amount", amount);
        userPayload.put("description", refundTx.getNotes());
        userPayload.put("timestamp", java.time.Instant.now().toString());
        userPayload.put("status", "REFUNDED");
        walletSseService.sendWalletUpdate(user.getId(), user.getEmail(), userPayload);

        walletSseService.broadcastToAdmins(Map.of(
                "type", "LEDGER_UPDATED",
                "transaction", Map.ofEntries(
                        Map.entry("id", savedTx.getId()),
                        Map.entry("transactionReference", refundRef),
                        Map.entry("amount", amount),
                        Map.entry("currency", userWallet.getCurrency()),
                        Map.entry("transactionType", "ESCROW_REFUND"),
                        Map.entry("status", "REFUNDED"),
                        Map.entry("senderBalanceBefore", nutritionistBefore),
                        Map.entry("senderBalanceAfter", nutritionistAfter),
                        Map.entry("receiverBalanceBefore", userBefore),
                        Map.entry("receiverBalanceAfter", userAfter),
                        Map.entry("createdAt", savedTx.getCreatedAt() != null ? savedTx.getCreatedAt() : LocalDateTime.now())
                )
        ));
    }

    private void refundEscrowHoldToUser(Appointment apt, String finalStatus) {
        if ("REFUNDED".equalsIgnoreCase(apt.getEscrowStatus())) return;
        if (!"HELD".equalsIgnoreCase(apt.getEscrowStatus())) return;
        if (apt.getEscrowAmount() == null || apt.getEscrowAmount().compareTo(BigDecimal.ZERO) <= 0) return;

        User user = apt.getUser();
        if (user == null) return;

        Wallet userWallet = walletService.getOrCreateWalletWithLock(user);
        BigDecimal userBalBefore = userWallet.getBalance() != null ? userWallet.getBalance() : BigDecimal.ZERO;
        BigDecimal userBalAfter = userBalBefore.add(apt.getEscrowAmount());
        userWallet.setBalance(userBalAfter);
        walletRepository.save(userWallet);

        String refundRef = "ESCROW-REFUND-" + System.currentTimeMillis() + "-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase();
        apt.setEscrowStatus("REFUNDED");
        apt.setEscrowTransactionRef(refundRef);

        User nutritionist = apt.getNutritionist();
        WalletTransaction refundTx = new WalletTransaction();
        refundTx.setTransactionReference(refundRef);
        refundTx.setSourceWallet(null);
        refundTx.setTargetWallet(userWallet);
        refundTx.setInitiator(nutritionist != null ? nutritionist : user);
        refundTx.setRecipient(user);
        refundTx.setAmount(apt.getEscrowAmount());
        refundTx.setCurrency(userWallet.getCurrency());
        refundTx.setTransactionType("ESCROW_REFUND");
        refundTx.setStatus("REFUNDED");
        refundTx.setAppointmentId(apt.getId());
        refundTx.setNotes(String.format("Compensating transaction: Refunded escrow of ₹%.2f for %s appointment #%d",
                apt.getEscrowAmount(), finalStatus, apt.getId()));
        refundTx.setReceiverBalanceBefore(userBalBefore);
        refundTx.setReceiverBalanceAfter(userBalAfter);
        WalletTransaction savedTx = walletTransactionRepository.save(refundTx);

        // Mark original hold transaction as REFUNDED
        if (apt.getId() != null) {
            try {
                walletTransactionRepository.findAll().stream()
                        .filter(tx -> apt.getId().equals(tx.getAppointmentId()) && "ESCROW_HOLD".equalsIgnoreCase(tx.getTransactionType()))
                        .forEach(tx -> {
                            tx.setStatus("REFUNDED");
                            walletTransactionRepository.save(tx);
                        });
            } catch (Exception ignored) {}
        }

        // Push SSE to User
        Map<String, Object> refundPayload = new HashMap<>();
        refundPayload.put("eventType", "ESCROW_REFUND");
        refundPayload.put("type", "ESCROW_REFUND");
        refundPayload.put("transactionId", savedTx.getId());
        refundPayload.put("transactionReference", refundRef);
        refundPayload.put("recipientId", user.getId());
        refundPayload.put("recipientEmail", user.getEmail());
        refundPayload.put("newBalance", userBalAfter);
        refundPayload.put("balance", userBalAfter);
        refundPayload.put("amount", apt.getEscrowAmount());
        refundPayload.put("description", refundTx.getNotes());
        refundPayload.put("timestamp", java.time.Instant.now().toString());
        refundPayload.put("status", "REFUNDED");
        walletSseService.sendWalletUpdate(user.getId(), user.getEmail(), refundPayload);

        // Stream to Admin Ledger
        walletSseService.broadcastToAdmins(Map.of(
                "type", "LEDGER_UPDATED",
                "transaction", Map.of(
                        "id", savedTx.getId(),
                        "transactionReference", refundRef,
                        "amount", apt.getEscrowAmount(),
                        "currency", userWallet.getCurrency(),
                        "transactionType", "ESCROW_REFUND",
                        "status", "REFUNDED",
                        "receiverBalanceBefore", userBalBefore,
                        "receiverBalanceAfter", userBalAfter,
                        "createdAt", savedTx.getCreatedAt() != null ? savedTx.getCreatedAt() : LocalDateTime.now()
                )
        ));
    }

    /**
     * Delete appointment with automated compensating refund if escrow is currently HELD.
     */
    @Transactional(rollbackFor = Exception.class)
    public void deleteAppointment(Long appointmentId) {
        deleteAppointment(appointmentId, null, true);
    }

    @Transactional(rollbackFor = Exception.class)
    public void deleteAppointment(Long appointmentId, Long callerId, boolean isAdmin) {
        Appointment apt = appointmentRepository.findByIdWithLock(appointmentId).orElse(null);
        if (apt != null) {
            if (!isAdmin && callerId != null) {
                Long patientId = apt.getUser() != null ? apt.getUser().getId() : null;
                Long nutritionistId = apt.getNutritionist() != null ? apt.getNutritionist().getId() : null;
                if ((patientId == null || !callerId.equals(patientId)) &&
                    (nutritionistId == null || !callerId.equals(nutritionistId))) {
                    throw new org.springframework.security.access.AccessDeniedException("Unauthorized to delete this appointment.");
                }
            }
            if ("HELD".equalsIgnoreCase(apt.getEscrowStatus()) && apt.getEscrowAmount() != null && apt.getEscrowAmount().compareTo(BigDecimal.ZERO) > 0) {
                User user = apt.getUser();
                if (user != null) {
                    Wallet userWallet = walletService.getOrCreateWalletWithLock(user);
                    BigDecimal userBalBefore = userWallet.getBalance() != null ? userWallet.getBalance() : BigDecimal.ZERO;
                    BigDecimal userBalAfter = userBalBefore.add(apt.getEscrowAmount());
                    userWallet.setBalance(userBalAfter);
                    walletRepository.save(userWallet);
                    notificationService.notifyUser(user, callerId, "Refund Credited",
                            String.format("₹%.2f was refunded to your wallet because your appointment with %s was removed. New balance: ₹%.2f",
                                    apt.getEscrowAmount(), displayName(apt.getNutritionist()), userBalAfter),
                            "WALLET", "account_balance_wallet", "/transactions");

                    String refundRef = "ESCROW-REFUND-DEL-" + System.currentTimeMillis() + "-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase();
                    WalletTransaction refundTx = new WalletTransaction();
                    refundTx.setTransactionReference(refundRef);
                    refundTx.setTargetWallet(userWallet);
                    refundTx.setRecipient(user);
                    refundTx.setAmount(apt.getEscrowAmount());
                    refundTx.setCurrency(userWallet.getCurrency());
                    refundTx.setTransactionType("ESCROW_REFUND");
                    refundTx.setStatus("REFUNDED");
                    refundTx.setAppointmentId(apt.getId());
                    refundTx.setNotes("Compensating refund due to appointment deletion #" + apt.getId());
                    refundTx.setReceiverBalanceBefore(userBalBefore);
                    refundTx.setReceiverBalanceAfter(userBalAfter);
                    walletTransactionRepository.save(refundTx);

                    Map<String, Object> delRefundPayload = new HashMap<>();
                    delRefundPayload.put("eventType", "ESCROW_REFUND");
                    delRefundPayload.put("type", "ESCROW_REFUND");
                    delRefundPayload.put("transactionId", refundTx.getId());
                    delRefundPayload.put("transactionReference", refundRef);
                    delRefundPayload.put("recipientId", user.getId());
                    delRefundPayload.put("recipientEmail", user.getEmail());
                    delRefundPayload.put("newBalance", userBalAfter);
                    delRefundPayload.put("balance", userBalAfter);
                    delRefundPayload.put("amount", apt.getEscrowAmount());
                    delRefundPayload.put("description", refundTx.getNotes());
                    delRefundPayload.put("timestamp", java.time.Instant.now().toString());
                    delRefundPayload.put("status", "REFUNDED");
                    walletSseService.sendWalletUpdate(user.getId(), user.getEmail(), delRefundPayload);
                }
            }

            // conversations.appointment_id is a foreign key: the thread has to go first.
            conversationRepository.findByAppointmentId(apt.getId())
                    .ifPresent(conversationRepository::delete);

            appointmentRepository.delete(apt);

            Map<String, Object> delEvent = Map.of(
                    "type", "APPOINTMENT_UPDATED",
                    "action", "DELETED",
                    "appointmentId", appointmentId
            );
            if (apt.getUser() != null) {
                walletSseService.sendAppointmentUpdate(apt.getUser().getId(), apt.getUser().getEmail(), delEvent);
            }
            if (apt.getNutritionist() != null) {
                walletSseService.sendAppointmentUpdate(apt.getNutritionist().getId(), apt.getNutritionist().getEmail(), delEvent);
            }
        }
    }

    /**
     * Sends bell alerts for an appointment change by comparing its state before and after the update.
     * The person who made the change is never alerted (handled by NotificationService).
     */
    private void notifyAppointmentChange(Appointment apt, String prevStatus, String prevEscrow, BigDecimal escrowAmount, Long actorId) {
        User patient = apt.getUser();
        User nutritionist = apt.getNutritionist();
        String status = apt.getStatus() != null ? apt.getStatus().toUpperCase() : "";
        String before = prevStatus != null ? prevStatus.toUpperCase() : "";
        String escrow = apt.getEscrowStatus() != null ? apt.getEscrowStatus().toUpperCase() : "";
        String escrowBefore = prevEscrow != null ? prevEscrow.toUpperCase() : "";
        BigDecimal amount = escrowAmount != null ? escrowAmount : BigDecimal.ZERO;
        String when = formatWhen(apt);

        if ("HELD".equals(escrowBefore) && "CAPTURED".equals(escrow)) {
            notificationService.notifyUser(patient, actorId, "Appointment Confirmed",
                    String.format("%s confirmed \"%s\" on %s.", displayName(nutritionist), apt.getTitle(), when),
                    "APPOINTMENT", "event_available", USER_APPOINTMENTS_PATH);
            notificationService.notifyUser(nutritionist, actorId, "Payment Received",
                    String.format("₹%.2f from %s was credited to your wallet for the appointment on %s.", amount, displayName(patient), when),
                    "WALLET", "account_balance_wallet", "/transactions");
            return;
        }

        if (!"REFUNDED".equals(escrowBefore) && "REFUNDED".equals(escrow)) {
            String reason = "REJECTED".equals(status) ? "declined" : "cancelled";
            notificationService.notifyUser(patient, actorId, "Refund Credited",
                    String.format("Your appointment with %s on %s was %s. ₹%.2f has been refunded to your wallet.", displayName(nutritionist), when, reason, amount),
                    "WALLET", "account_balance_wallet", "/transactions");
            if ("CAPTURED".equals(escrowBefore)) {
                notificationService.notifyUser(nutritionist, actorId, "Wallet Deduction",
                        String.format("₹%.2f was deducted from your wallet as a refund to %s for the cancelled appointment on %s.", amount, displayName(patient), when),
                        "WALLET", "account_balance_wallet", "/transactions");
            } else {
                notificationService.notifyUser(nutritionist, actorId, "Appointment Cancelled",
                        String.format("%s cancelled \"%s\" on %s.", displayName(patient), apt.getTitle(), when),
                        "APPOINTMENT", "event_busy", NUTRITIONIST_SCHEDULE_PATH);
            }
            return;
        }

        if ("CANCELLATION_REQUESTED".equals(status) && !"CANCELLATION_REQUESTED".equals(before)) {
            notificationService.notifyUser(nutritionist, actorId, "Cancellation Requested",
                    String.format("%s asked to cancel the confirmed appointment on %s. Please approve or decline the request.", displayName(patient), when),
                    "APPOINTMENT", "event_busy", NUTRITIONIST_SCHEDULE_PATH);
            return;
        }

        if ("CANCELLATION_REQUESTED".equals(before)) {
            if ("CANCELLED".equals(status)) {
                notificationService.notifyUser(patient, actorId, "Cancellation Approved",
                        String.format("Your cancellation request for the appointment on %s was approved. As per policy, the fee is not refunded.", when),
                        "APPOINTMENT", "event_busy", USER_APPOINTMENTS_PATH);
            } else if ("CONFIRMED".equals(status)) {
                notificationService.notifyUser(patient, actorId, "Cancellation Request Declined",
                        String.format("%s declined your cancellation request. Your appointment on %s is still confirmed.", displayName(nutritionist), when),
                        "APPOINTMENT", "event_available", USER_APPOINTMENTS_PATH);
            }
            return;
        }

        if ("REJECTED".equals(status) && !"REJECTED".equals(before)) {
            notificationService.notifyUser(patient, actorId, "Appointment Declined",
                    String.format("%s declined your appointment request for %s.", displayName(nutritionist), when),
                    "APPOINTMENT", "event_busy", USER_APPOINTMENTS_PATH);
        }
    }

    /**
     * A conversation is a projection of its consultation: it opens when the consultation is
     * accepted and closes for good when the consultation is cancelled or declined.
     */
    private void syncConversationWithAppointment(Appointment appointment) {
        if (appointment == null || appointment.getId() == null) return;
        String status = appointment.getStatus() != null
                ? appointment.getStatus().toUpperCase(Locale.ROOT) : "";
        if (ConsultationLifecycleService.isAcceptedAppointmentStatus(status)) {
            consultationLifecycleService.openForAppointment(appointment);
        } else if (ConsultationLifecycleService.isDeadAppointmentStatus(status)) {
            consultationLifecycleService.closeForConsultation(appointment);
        }
    }

    private static String formatWhen(Appointment apt) {
        return apt.getAppointmentTime() != null
                ? apt.getAppointmentTime().format(java.time.format.DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a"))
                : "the scheduled date";
    }

    private static String displayName(User u) {
        if (u == null) return "Your nutritionist";
        String name = ((u.getFirstName() != null ? u.getFirstName() : "") + " " + (u.getLastName() != null ? u.getLastName() : "")).trim();
        return name.isEmpty() ? u.getEmail() : name;
    }

    private AppointmentDto mapToDto(Appointment apt) {
        AppointmentDto dto = new AppointmentDto();
        dto.setId(apt.getId());
        if (apt.getUser() != null) {
            dto.setUserId(apt.getUser().getId());
            dto.setUserName((apt.getUser().getFirstName() != null ? apt.getUser().getFirstName() : "") + " " + (apt.getUser().getLastName() != null ? apt.getUser().getLastName() : ""));
            dto.setUserEmail(apt.getUser().getEmail());
        }
        if (apt.getNutritionist() != null) {
            User d = apt.getNutritionist();
            dto.setNutritionistId(d.getId());
            String dName = (d.getFirstName() != null ? d.getFirstName() : "") + " " + (d.getLastName() != null ? d.getLastName() : "");
            if (dName.trim().isEmpty()) {
                dName = d.getEmail();
            }
            dto.setNutritionistName(dName.trim());
            dto.setNutritionistEmail(d.getEmail());

            Optional<NutritionistProfile> profOpt = nutritionistProfileRepository.findByUserId(d.getId());
            if (profOpt.isPresent()) {
                NutritionistProfile prof = profOpt.get();
                dto.setNutritionistCredentials(prof.getCredentials() != null && !prof.getCredentials().trim().isEmpty() ? prof.getCredentials() : "Certified Nutritionist");
                dto.setNutritionistSpecialization(prof.getSpecialization() != null && !prof.getSpecialization().trim().isEmpty() ? prof.getSpecialization() : "Clinical Nutrition");
            } else {
                dto.setNutritionistCredentials("Certified Clinical Nutritionist");
                dto.setNutritionistSpecialization("General Metabolic & Sports Nutrition");
            }
        }
        dto.setAppointmentTime(apt.getAppointmentTime());
        dto.setStatus(apt.getStatus());
        dto.setMeetingLink(apt.getMeetingLink());
        dto.setNotes(apt.getNotes());
        dto.setTitle(apt.getTitle());
        dto.setSessionType(apt.getSessionType());
        dto.setSessionFee(apt.getEscrowAmount());
        dto.setEscrowAmount(apt.getEscrowAmount());
        dto.setEscrowStatus(apt.getEscrowStatus());
        dto.setEscrowTransactionRef(apt.getEscrowTransactionRef());
        return dto;
    }
}
