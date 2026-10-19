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
import com.nutrition.repository.NutritionistProfileRepository;
import com.nutrition.repository.UserRepository;
import com.nutrition.repository.WalletRepository;
import com.nutrition.repository.WalletTransactionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

    public List<AppointmentDto> getMyAppointments(Long userId, Role role) {
        List<Appointment> list;
        if (role == Role.NUTRITIONIST) {
            list = appointmentRepository.findByDietitianIdOrDietitianIsNullOrderByAppointmentTimeDesc(userId);
            if (list.isEmpty()) {
                list = appointmentRepository.findAllByOrderByAppointmentTimeDesc();
            }
        } else if (role == Role.ADMIN) {
            list = appointmentRepository.findAllByOrderByAppointmentTimeDesc();
        } else {
            list = appointmentRepository.findByUserIdOrderByAppointmentTimeDesc(userId);
        }
        return list.stream().map(this::mapToDto).collect(Collectors.toList());
    }

    public List<Map<String, Object>> getAvailableDietitians() {
        List<User> allUsers = userRepository.findAll();
        List<User> dietitians = allUsers.stream()
                .filter(u -> u.getRole() != null && (u.getRole() == Role.NUTRITIONIST || "NUTRITIONIST".equalsIgnoreCase(u.getRole().name())))
                .collect(Collectors.toList());

        if (dietitians.isEmpty()) {
            List<NutritionistProfile> profiles = nutritionistProfileRepository.findAll();
            for (NutritionistProfile p : profiles) {
                if (p.getUser() != null && p.getUser().getRole() == Role.NUTRITIONIST && !dietitians.contains(p.getUser())) {
                    dietitians.add(p.getUser());
                }
            }
        }

        List<Map<String, Object>> result = new ArrayList<>();
        for (User d : dietitians) {
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
                map.put("credentials", prof.getCredentials() != null && !prof.getCredentials().trim().isEmpty() ? prof.getCredentials() : "Certified Clinical Dietitian");
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
                map.put("credentials", "Certified Clinical Dietitian");
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
     * Dietitian balance is NOT credited until acceptance.
     */
    @Transactional(rollbackFor = Exception.class)
    public AppointmentDto bookAppointment(Long currentUserId, Role role, AppointmentDto dto) {
        User user = null;
        if (dto.getUserId() != null) {
            user = userRepository.findById(dto.getUserId()).orElse(null);
        }
        if (user == null) {
            user = userRepository.findById(currentUserId).orElseThrow(() -> new RuntimeException("User not found"));
        }

        User dietitian = null;
        if (dto.getDietitianId() != null) {
            dietitian = userRepository.findById(dto.getDietitianId()).orElse(null);
        } else if (role == Role.NUTRITIONIST) {
            dietitian = userRepository.findById(currentUserId).orElse(null);
        } else {
            List<User> nutritionists = userRepository.findByRole(Role.NUTRITIONIST);
            if (!nutritionists.isEmpty()) {
                dietitian = nutritionists.get(0);
            }
        }

        // Calculate session fee
        BigDecimal fee = dto.getSessionFee();
        if (fee == null || fee.compareTo(BigDecimal.ZERO) <= 0) {
            if (dietitian != null) {
                Optional<NutritionistProfile> profOpt = nutritionistProfileRepository.findByUserId(dietitian.getId());
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

        Wallet userWallet = walletService.getOrCreateWallet(user);
        BigDecimal currentBalance = userWallet.getBalance() != null ? userWallet.getBalance() : BigDecimal.ZERO;

        // Check if user has sufficient balance for escrow hold
        if (currentBalance.compareTo(fee) < 0) {
            BigDecimal deficit = fee.subtract(currentBalance);
            String failRef = "TXN-LOWBAL-" + System.currentTimeMillis() + "-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase();

            WalletTransaction blockedTx = new WalletTransaction();
            blockedTx.setTransactionReference(failRef);
            blockedTx.setSourceWallet(userWallet);
            blockedTx.setTargetWallet(dietitian != null ? walletService.getOrCreateWallet(dietitian) : null);
            blockedTx.setInitiator(user);
            blockedTx.setRecipient(dietitian);
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

        // Execute Escrow Hold: Deduct from user wallet, do NOT credit dietitian yet
        BigDecimal userBalBefore = currentBalance;
        BigDecimal userBalAfter = userBalBefore.subtract(fee);
        userWallet.setBalance(userBalAfter);
        walletRepository.save(userWallet);

        String escrowRef = "ESCROW-HOLD-" + System.currentTimeMillis() + "-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase();

        Appointment appointment = new Appointment();
        appointment.setUser(user);
        appointment.setDietitian(dietitian);
        appointment.setAppointmentTime(dto.getAppointmentTime() != null ? dto.getAppointmentTime() : LocalDateTime.now().plusDays(1).withHour(10).withMinute(0));
        appointment.setTitle(dto.getTitle() != null && !dto.getTitle().trim().isEmpty() ? dto.getTitle() : "Clinical Nutrition Consultation");
        appointment.setSessionType(dto.getSessionType() != null && !dto.getSessionType().trim().isEmpty() ? dto.getSessionType() : "Clinical Consultation");
        appointment.setNotes(dto.getNotes() != null ? dto.getNotes() : "");
        appointment.setStatus(dto.getStatus() != null && !dto.getStatus().isBlank() ? dto.getStatus() : "Requested");
        appointment.setMeetingLink(dto.getMeetingLink() != null ? dto.getMeetingLink() : "https://meet.google.com");
        appointment.setEscrowAmount(fee);
        appointment.setEscrowStatus("HELD");
        appointment.setEscrowTransactionRef(escrowRef);

        Appointment savedAppointment = appointmentRepository.save(appointment);

        // Record Escrow Hold in Audit Ledger
        Wallet dietitianWallet = dietitian != null ? walletService.getOrCreateWallet(dietitian) : null;
        BigDecimal dietitianBal = dietitianWallet != null && dietitianWallet.getBalance() != null ? dietitianWallet.getBalance() : BigDecimal.ZERO;

        WalletTransaction holdTx = new WalletTransaction();
        holdTx.setTransactionReference(escrowRef);
        holdTx.setSourceWallet(userWallet);
        holdTx.setTargetWallet(dietitianWallet);
        holdTx.setInitiator(user);
        holdTx.setRecipient(dietitian);
        holdTx.setAmount(fee);
        holdTx.setCurrency(userWallet.getCurrency());
        holdTx.setTransactionType("ESCROW_HOLD");
        holdTx.setStatus("HELD");
        holdTx.setAppointmentId(savedAppointment.getId());
        holdTx.setNotes(String.format("Escrow payment hold of ₹%.2f for appointment #%d with %s",
                fee, savedAppointment.getId(), dietitian != null ? dietitian.getEmail() : "Dietitian"));
        holdTx.setSenderBalanceBefore(userBalBefore);
        holdTx.setSenderBalanceAfter(userBalAfter);
        holdTx.setReceiverBalanceBefore(dietitianBal);
        holdTx.setReceiverBalanceAfter(dietitianBal); // Dietitian not credited yet!

        WalletTransaction savedTx = walletTransactionRepository.save(holdTx);

        log.info("ESCROW HELD: User [{}] locked ₹{} in escrow for Appointment #{}. Balance: ₹{} -> ₹{}. Ref: {}",
                user.getEmail(), fee, savedAppointment.getId(), userBalBefore, userBalAfter, escrowRef);

        AppointmentDto resultDto = mapToDto(savedAppointment);

        // Emit real-time SSE updates
        // 1. User wallet update
        walletSseService.sendWalletUpdate(user.getId(), user.getEmail(), Map.of(
                "type", "WALLET_UPDATED",
                "recipientId", user.getId(),
                "recipientEmail", user.getEmail(),
                "newBalance", userBalAfter,
                "balance", userBalAfter,
                "amount", fee,
                "transactionReference", escrowRef,
                "status", "HELD"
        ));

        // 2. Appointment update to dietitian & user
        Map<String, Object> aptEvent = Map.of(
                "type", "APPOINTMENT_UPDATED",
                "action", "REQUESTED",
                "appointment", resultDto
        );
        if (dietitian != null) {
            walletSseService.sendAppointmentUpdate(dietitian.getId(), dietitian.getEmail(), aptEvent);
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

        return resultDto;
    }

    /**
     * STEP 2a & 2b: ATOMIC ESCROW CAPTURE OR COMPENSATING REFUND (ACID & IDEMPOTENT)
     * - If ACCEPTED / Confirmed: Release funds from ESCROW to dietitian's balance.
     * - If REJECTED / CANCELLED: Immediately refund locked funds back to user's balance.
     */
    @Transactional(rollbackFor = Exception.class)
    public AppointmentDto updateAppointmentStatus(Long appointmentId, String status, String meetingLink, String notes) {
        Appointment apt = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new RuntimeException("Appointment not found: " + appointmentId));

        if (meetingLink != null && !meetingLink.trim().isEmpty()) {
            apt.setMeetingLink(meetingLink);
        }
        if (notes != null) {
            apt.setNotes(notes);
        }

        if (status != null && !status.trim().isEmpty()) {
            String upperStatus = status.trim().toUpperCase();

            // STEP 2a: Dietitian ACCEPTS the booking (Hold & Capture)
            if ("CONFIRMED".equals(upperStatus) || "ACCEPTED".equals(upperStatus) || "APPROVED".equals(upperStatus)) {
                // Idempotency check: prevent duplicate escrow capture
                if ("CAPTURED".equalsIgnoreCase(apt.getEscrowStatus())) {
                    log.info("Appointment #{} escrow already CAPTURED. Skipping duplicate capture.", appointmentId);
                } else if ("HELD".equalsIgnoreCase(apt.getEscrowStatus()) && apt.getEscrowAmount() != null && apt.getEscrowAmount().compareTo(BigDecimal.ZERO) > 0) {
                    User dietitian = apt.getDietitian();
                    if (dietitian != null) {
                        Wallet dietitianWallet = walletService.getOrCreateWallet(dietitian);
                        BigDecimal dietitianBalBefore = dietitianWallet.getBalance() != null ? dietitianWallet.getBalance() : BigDecimal.ZERO;
                        BigDecimal dietitianBalAfter = dietitianBalBefore.add(apt.getEscrowAmount());
                        dietitianWallet.setBalance(dietitianBalAfter);
                        walletRepository.save(dietitianWallet);

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
                        releaseTx.setTargetWallet(dietitianWallet);
                        releaseTx.setInitiator(user);
                        releaseTx.setRecipient(dietitian);
                        releaseTx.setAmount(apt.getEscrowAmount());
                        releaseTx.setCurrency(dietitianWallet.getCurrency());
                        releaseTx.setTransactionType("ESCROW_RELEASE");
                        releaseTx.setStatus("SUCCESS");
                        releaseTx.setAppointmentId(apt.getId());
                        releaseTx.setNotes(String.format("Escrow released to Dietitian [%s] upon appointment #%d confirmation", dietitian.getEmail(), apt.getId()));
                        releaseTx.setSenderBalanceBefore(userBal);
                        releaseTx.setSenderBalanceAfter(userBal);
                        releaseTx.setReceiverBalanceBefore(dietitianBalBefore);
                        releaseTx.setReceiverBalanceAfter(dietitianBalAfter);
                        WalletTransaction savedTx = walletTransactionRepository.save(releaseTx);

                        log.info("ESCROW CAPTURED: Credited ₹{} to Dietitian [{}] (Bal: ₹{} -> ₹{}). Ref: {}",
                                apt.getEscrowAmount(), dietitian.getEmail(), dietitianBalBefore, dietitianBalAfter, captureRef);

                        // Push SSE to Dietitian
                        walletSseService.sendWalletUpdate(dietitian.getId(), dietitian.getEmail(), Map.of(
                                "type", "WALLET_UPDATED",
                                "recipientId", dietitian.getId(),
                                "recipientEmail", dietitian.getEmail(),
                                "newBalance", dietitianBalAfter,
                                "balance", dietitianBalAfter,
                                "amount", apt.getEscrowAmount(),
                                "transactionReference", captureRef,
                                "status", "SUCCESS"
                        ));

                        // Stream to Admin Ledger
                        walletSseService.broadcastToAdmins(Map.of(
                                "type", "LEDGER_UPDATED",
                                "transaction", Map.of(
                                        "id", savedTx.getId(),
                                        "transactionReference", captureRef,
                                        "amount", apt.getEscrowAmount(),
                                        "currency", dietitianWallet.getCurrency(),
                                        "transactionType", "ESCROW_RELEASE",
                                        "status", "SUCCESS",
                                        "receiverBalanceBefore", dietitianBalBefore,
                                        "receiverBalanceAfter", dietitianBalAfter,
                                        "createdAt", savedTx.getCreatedAt() != null ? savedTx.getCreatedAt() : LocalDateTime.now()
                                )
                        ));
                    }
                }
                apt.setStatus("Confirmed");

            // STEP 2b: Dietitian REJECTS or User CANCELS (Automated Compensating Refund)
            } else if ("REJECTED".equals(upperStatus) || "CANCELLED".equals(upperStatus) || "DENIED".equals(upperStatus)) {
                // Idempotency check: prevent duplicate refund
                if ("REFUNDED".equalsIgnoreCase(apt.getEscrowStatus())) {
                    log.info("Appointment #{} escrow already REFUNDED. Skipping duplicate refund.", appointmentId);
                } else if ("HELD".equalsIgnoreCase(apt.getEscrowStatus()) && apt.getEscrowAmount() != null && apt.getEscrowAmount().compareTo(BigDecimal.ZERO) > 0) {
                    User user = apt.getUser();
                    if (user != null) {
                        Wallet userWallet = walletService.getOrCreateWallet(user);
                        BigDecimal userBalBefore = userWallet.getBalance() != null ? userWallet.getBalance() : BigDecimal.ZERO;
                        BigDecimal userBalAfter = userBalBefore.add(apt.getEscrowAmount());
                        userWallet.setBalance(userBalAfter);
                        walletRepository.save(userWallet);

                        String refundRef = "ESCROW-REFUND-" + System.currentTimeMillis() + "-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase();
                        apt.setEscrowStatus("REFUNDED");
                        apt.setEscrowTransactionRef(refundRef);

                        // Audit Ledger Entry
                        User dietitian = apt.getDietitian();
                        Wallet dietitianWallet = dietitian != null ? walletService.getOrCreateWallet(dietitian) : null;
                        BigDecimal dietitianBal = dietitianWallet != null && dietitianWallet.getBalance() != null ? dietitianWallet.getBalance() : BigDecimal.ZERO;

                        WalletTransaction refundTx = new WalletTransaction();
                        refundTx.setTransactionReference(refundRef);
                        refundTx.setSourceWallet(null);
                        refundTx.setTargetWallet(userWallet);
                        refundTx.setInitiator(dietitian != null ? dietitian : user);
                        refundTx.setRecipient(user);
                        refundTx.setAmount(apt.getEscrowAmount());
                        refundTx.setCurrency(userWallet.getCurrency());
                        refundTx.setTransactionType("ESCROW_REFUND");
                        refundTx.setStatus("REFUNDED");
                        refundTx.setAppointmentId(apt.getId());
                        refundTx.setNotes(String.format("Compensating transaction: Refunded escrow of ₹%.2f for %s appointment #%d",
                                apt.getEscrowAmount(), upperStatus, apt.getId()));
                        refundTx.setReceiverBalanceBefore(userBalBefore);
                        refundTx.setReceiverBalanceAfter(userBalAfter);
                        WalletTransaction savedTx = walletTransactionRepository.save(refundTx);

                        log.info("ESCROW REFUNDED: Refunded ₹{} to User [{}] (Bal: ₹{} -> ₹{}). Ref: {}",
                                apt.getEscrowAmount(), user.getEmail(), userBalBefore, userBalAfter, refundRef);

                        // Push SSE to User
                        walletSseService.sendWalletUpdate(user.getId(), user.getEmail(), Map.of(
                                "type", "WALLET_UPDATED",
                                "recipientId", user.getId(),
                                "recipientEmail", user.getEmail(),
                                "newBalance", userBalAfter,
                                "balance", userBalAfter,
                                "amount", apt.getEscrowAmount(),
                                "transactionReference", refundRef,
                                "status", "REFUNDED"
                        ));

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
                }
                apt.setStatus("REJECTED".equals(upperStatus) || "DENIED".equals(upperStatus) ? "REJECTED" : "CANCELLED");
            } else {
                apt.setStatus(status);
            }
        }

        Appointment updated = appointmentRepository.save(apt);
        AppointmentDto dtoResult = mapToDto(updated);

        // Push real-time SSE appointment update to both parties
        Map<String, Object> sseEvent = Map.of(
                "type", "APPOINTMENT_UPDATED",
                "action", "STATUS_CHANGED",
                "appointment", dtoResult
        );
        if (updated.getUser() != null) {
            walletSseService.sendAppointmentUpdate(updated.getUser().getId(), updated.getUser().getEmail(), sseEvent);
        }
        if (updated.getDietitian() != null) {
            walletSseService.sendAppointmentUpdate(updated.getDietitian().getId(), updated.getDietitian().getEmail(), sseEvent);
        }

        return dtoResult;
    }

    /**
     * Delete appointment with automated compensating refund if escrow is currently HELD.
     */
    @Transactional(rollbackFor = Exception.class)
    public void deleteAppointment(Long appointmentId) {
        Appointment apt = appointmentRepository.findById(appointmentId).orElse(null);
        if (apt != null) {
            if ("HELD".equalsIgnoreCase(apt.getEscrowStatus()) && apt.getEscrowAmount() != null && apt.getEscrowAmount().compareTo(BigDecimal.ZERO) > 0) {
                User user = apt.getUser();
                if (user != null) {
                    Wallet userWallet = walletService.getOrCreateWallet(user);
                    BigDecimal userBalBefore = userWallet.getBalance() != null ? userWallet.getBalance() : BigDecimal.ZERO;
                    BigDecimal userBalAfter = userBalBefore.add(apt.getEscrowAmount());
                    userWallet.setBalance(userBalAfter);
                    walletRepository.save(userWallet);

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

                    walletSseService.sendWalletUpdate(user.getId(), user.getEmail(), Map.of(
                            "type", "WALLET_UPDATED",
                            "recipientId", user.getId(),
                            "recipientEmail", user.getEmail(),
                            "newBalance", userBalAfter,
                            "balance", userBalAfter,
                            "amount", apt.getEscrowAmount(),
                            "transactionReference", refundRef,
                            "status", "REFUNDED"
                    ));
                }
            }

            appointmentRepository.delete(apt);

            Map<String, Object> delEvent = Map.of(
                    "type", "APPOINTMENT_UPDATED",
                    "action", "DELETED",
                    "appointmentId", appointmentId
            );
            if (apt.getUser() != null) {
                walletSseService.sendAppointmentUpdate(apt.getUser().getId(), apt.getUser().getEmail(), delEvent);
            }
            if (apt.getDietitian() != null) {
                walletSseService.sendAppointmentUpdate(apt.getDietitian().getId(), apt.getDietitian().getEmail(), delEvent);
            }
        }
    }

    private AppointmentDto mapToDto(Appointment apt) {
        AppointmentDto dto = new AppointmentDto();
        dto.setId(apt.getId());
        if (apt.getUser() != null) {
            dto.setUserId(apt.getUser().getId());
            dto.setUserName((apt.getUser().getFirstName() != null ? apt.getUser().getFirstName() : "") + " " + (apt.getUser().getLastName() != null ? apt.getUser().getLastName() : ""));
            dto.setUserEmail(apt.getUser().getEmail());
        }
        if (apt.getDietitian() != null) {
            User d = apt.getDietitian();
            dto.setDietitianId(d.getId());
            String dName = (d.getFirstName() != null ? d.getFirstName() : "") + " " + (d.getLastName() != null ? d.getLastName() : "");
            if (dName.trim().isEmpty()) {
                dName = d.getEmail();
            }
            dto.setDietitianName(dName.trim());
            dto.setDietitianEmail(d.getEmail());

            Optional<NutritionistProfile> profOpt = nutritionistProfileRepository.findByUserId(d.getId());
            if (profOpt.isPresent()) {
                NutritionistProfile prof = profOpt.get();
                dto.setDietitianCredentials(prof.getCredentials() != null && !prof.getCredentials().trim().isEmpty() ? prof.getCredentials() : "Certified Dietitian");
                dto.setDietitianSpecialization(prof.getSpecialization() != null && !prof.getSpecialization().trim().isEmpty() ? prof.getSpecialization() : "Clinical Nutrition");
            } else {
                dto.setDietitianCredentials("Certified Clinical Dietitian");
                dto.setDietitianSpecialization("General Metabolic & Sports Nutrition");
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

