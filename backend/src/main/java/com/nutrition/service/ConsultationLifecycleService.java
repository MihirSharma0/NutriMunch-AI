package com.nutrition.service;

import com.nutrition.dto.ConversationStatusDto;
import com.nutrition.entity.Appointment;
import com.nutrition.entity.Conversation;
import com.nutrition.entity.User;
import com.nutrition.repository.ConversationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Clock;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * Owns the consultation chat lifecycle: activation, the five day window, expiry and reopening.
 *
 * Rules enforced here (and therefore on every caller, including direct API requests):
 *  - a conversation only exists for an accepted consultation;
 *  - messaging is allowed only while the conversation is ACTIVE and now < expiresAt;
 *  - the window ends five days after whichever is later: the acceptance moment or the
 *    scheduled consultation time;
 *  - only the assigned nutritionist may reopen, at most {@value #MAX_REOPENS} times,
 *    and only while the consultation itself is still live.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ConsultationLifecycleService {

    /** Length of one messaging window. */
    public static final int CHAT_WINDOW_DAYS = 5;

    /** How many times a nutritionist may reopen the same consultation chat. */
    public static final int MAX_REOPENS = 3;

    /** Appointment statuses that mean "the nutritionist accepted this consultation". */
    private static final Set<String> ACCEPTED_APPOINTMENT_STATUSES =
            Set.of("CONFIRMED", "ACCEPTED", "APPROVED", "SCHEDULED");

    /** Appointment statuses that mean the consultation can never be chatted about again. */
    private static final Set<String> DEAD_APPOINTMENT_STATUSES =
            Set.of("CANCELLED", "REJECTED", "DENIED", "CANCELLED_BY_NUTRITIONIST");

    private static final DateTimeFormatter DATE_FORMAT =
            DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a");

    private final ConversationRepository conversationRepository;
    private final NotificationService notificationService;
    private final ChatSseService chatSseService;
    private final WalletSseService walletSseService;
    private final Clock clock;

    /**
     * Executes is accepted appointment status operation.
     */
    public static boolean isAcceptedAppointmentStatus(String status) {
        return status != null && ACCEPTED_APPOINTMENT_STATUSES.contains(status.trim().toUpperCase(Locale.ROOT));
    }

    /**
     * Executes is dead appointment status operation.
     */
    public static boolean isDeadAppointmentStatus(String status) {
        return status != null && DEAD_APPOINTMENT_STATUSES.contains(status.trim().toUpperCase(Locale.ROOT));
    }

    /**
     * The five day window starts at whichever is later: the moment the consultation was
     * accepted, or the time the session was booked for. A consultation booked next month
     * therefore keeps its chat open until five days after that session.
     */
    public LocalDateTime windowEnd(LocalDateTime acceptedAt, LocalDateTime appointmentTime) {
        LocalDateTime start = acceptedAt;
        if (appointmentTime != null && (start == null || appointmentTime.isAfter(start))) {
            start = appointmentTime;
        }
        if (start == null) start = LocalDateTime.now(clock);
        return start.plusDays(CHAT_WINDOW_DAYS);
    }

    /**
     * Creates (or reuses) the conversation for an accepted consultation and opens its window.
     * Called inside the acceptance transaction, so the chat can never exist without an
     * accepted appointment.
     */
    @Transactional
    public Conversation openForAppointment(Appointment appointment) {
        if (appointment == null || appointment.getId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Appointment is required to open a chat");
        }
        if (appointment.getUser() == null || appointment.getNutritionist() == null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This consultation has no assigned nutritionist");
        }
        if (!isAcceptedAppointmentStatus(appointment.getStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "The consultation has not been accepted yet");
        }

        LocalDateTime now = LocalDateTime.now(clock);
        Conversation conversation = conversationRepository.findByAppointmentId(appointment.getId())
                .orElse(null);

        boolean created = false;
        if (conversation == null) {
            conversation = new Conversation();
            conversation.setAppointment(appointment);
            conversation.setPatient(appointment.getUser());
            conversation.setNutritionist(appointment.getNutritionist());
            conversation.setActivatedAt(now);
            conversation.setExpiresAt(windowEnd(now, appointment.getAppointmentTime()));
            conversation.setReopenCount(0);
            conversation.setStatus(Conversation.STATUS_ACTIVE);
            created = true;
        }

        conversation = conversationRepository.save(conversation);

        if (created) {
            notifyActivated(conversation, appointment);
        }
        return conversation;
    }

    /**
     * Lazily expires a conversation whose window has run out. Safe to call from read paths:
     * a stale ACTIVE row is never served to a client, and an open SSE stream is terminated.
     */
    @Transactional
    public Conversation refreshLifecycle(Conversation conversation) {
        if (conversation == null) return null;
        if (!Conversation.STATUS_ACTIVE.equals(conversation.getStatus())) return conversation;

        // A cancelled or declined consultation can never keep a usable chat, whatever the clock says.
        Appointment appointment = conversation.getAppointment();
        if (appointment != null && isDeadAppointmentStatus(appointment.getStatus())) {
            return closeAsCancelled(conversation);
        }

        LocalDateTime expiresAt = conversation.getExpiresAt();
        if (expiresAt == null) return conversation;
        if (expiresAt.isAfter(LocalDateTime.now(clock))) return conversation;

        return expire(conversation, true);
    }

    /**
     * Background sweep. On a free hosting tier the process sleeps when idle, so this is a
     * best-effort notifier: correctness never depends on it because every read and write
     * path calls {@link #refreshLifecycle(Conversation)} first.
     */
    @Scheduled(fixedDelay = 60_000, initialDelay = 30_000)
    @Transactional
    public void sweepExpiredConversations() {
        LocalDateTime now = LocalDateTime.now(clock);
        List<Conversation> due = conversationRepository
                .findByStatusAndExpiresAtLessThanEqual(Conversation.STATUS_ACTIVE, now);

        for (Conversation conversation : due) {
            try {
                expire(conversation, true);
            } catch (Exception e) {
                log.warn("Failed to expire conversation {}: {}", conversation.getId(), e.getMessage());
            }
        }
        if (!due.isEmpty()) {
            log.info("Expired {} consultation chat session(s)", due.size());
        }

        // Runs on its own schedule: a consultation can be cancelled without any window elapsing.
        List<Conversation> orphaned = conversationRepository
                .findActiveWithDeadConsultation(DEAD_APPOINTMENT_STATUSES);
        for (Conversation conversation : orphaned) {
            try {
                closeAsCancelled(conversation);
            } catch (Exception e) {
                log.warn("Failed to close conversation {} after its consultation ended: {}",
                        conversation.getId(), e.getMessage());
            }
        }
    }

    /**
     * Executes close as cancelled operation.
     */
    private Conversation closeAsCancelled(Conversation conversation) {
        conversation.setStatus(Conversation.STATUS_CLOSED);
        conversation.setClosedAt(LocalDateTime.now(clock));
        conversation.setClosedReason(Conversation.CLOSED_CONSULTATION_CANCELLED);
        Conversation saved = conversationRepository.save(conversation);
        publishStatus(saved, Conversation.STATUS_CLOSED);
        return saved;
    }

    /**
     * Executes expire operation.
     */
    private Conversation expire(Conversation conversation, boolean publish) {
        LocalDateTime closedAt = conversation.getExpiresAt() != null
                ? conversation.getExpiresAt()
                : LocalDateTime.now(clock);

        conversation.setStatus(Conversation.STATUS_EXPIRED);
        conversation.setClosedAt(closedAt);
        conversation.setClosedReason(Conversation.CLOSED_EXPIRED);
        Conversation saved = conversationRepository.save(conversation);

        if (publish) {
            publishStatus(saved, Conversation.STATUS_EXPIRED);
            notifyExpired(saved);
        }
        return saved;
    }

    /**
     * Reopen is reserved for the assigned nutritionist, is limited to {@value #MAX_REOPENS}
     * per consultation, and grants a fresh window from the moment of reopening.
     */
    @Transactional
    public Conversation reopen(Conversation conversation, Long userId) {
        if (conversation == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Conversation not found");
        }
        if (userId == null || conversation.getNutritionist() == null
                || !userId.equals(conversation.getNutritionist().getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only the assigned nutritionist can reopen this chat");
        }
        if (Conversation.STATUS_ACTIVE.equals(conversation.getStatus())) {
            return conversation;
        }
        if (conversation.getReopenCount() >= MAX_REOPENS) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "This chat has already been reopened " + MAX_REOPENS + " times. Please start a new consultation.");
        }

        Appointment appointment = conversation.getAppointment();
        if (appointment == null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This chat is not linked to a consultation");
        }
        String appointmentStatus = appointment.getStatus() != null
                ? appointment.getStatus().toUpperCase(Locale.ROOT) : "";
        if (isDeadAppointmentStatus(appointmentStatus) || !isAcceptedAppointmentStatus(appointmentStatus)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "The consultation is no longer active, so this chat cannot be reopened");
        }

        LocalDateTime now = LocalDateTime.now(clock);
        conversation.setStatus(Conversation.STATUS_ACTIVE);
        conversation.setActivatedAt(conversation.getActivatedAt() != null ? conversation.getActivatedAt() : now);
        conversation.setExpiresAt(now.plusDays(CHAT_WINDOW_DAYS));
        conversation.setReopenedAt(now);
        conversation.setReopenCount(conversation.getReopenCount() + 1);
        conversation.setClosedAt(null);
        conversation.setClosedReason(null);
        Conversation saved = conversationRepository.save(conversation);

        publishStatus(saved, Conversation.STATUS_ACTIVE);
        notifyReopened(saved);
        return saved;
    }

    /** Manual close by the nutritionist. Does not consume a reopen. */
    @Transactional
    public Conversation close(Conversation conversation, Long userId) {
        if (conversation == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Conversation not found");
        }
        if (userId == null || conversation.getNutritionist() == null
                || !userId.equals(conversation.getNutritionist().getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only the assigned nutritionist can end this chat");
        }
        if (!Conversation.STATUS_ACTIVE.equals(conversation.getStatus())) {
            return conversation;
        }

        conversation.setStatus(Conversation.STATUS_CLOSED);
        conversation.setClosedAt(LocalDateTime.now(clock));
        conversation.setClosedReason(Conversation.CLOSED_MANUAL);
        Conversation saved = conversationRepository.save(conversation);

        publishStatus(saved, Conversation.STATUS_CLOSED);
        return saved;
    }

    /** Terminal closure when the consultation itself is cancelled or refunded. */
    @Transactional
    public void closeForConsultation(Appointment appointment) {
        if (appointment == null || appointment.getId() == null) return;
        conversationRepository.findByAppointmentId(appointment.getId()).ifPresent(conversation -> {
            if (Conversation.STATUS_CLOSED.equals(conversation.getStatus())
                    && Conversation.CLOSED_CONSULTATION_CANCELLED.equals(conversation.getClosedReason())) {
                return;
            }
            conversation.setStatus(Conversation.STATUS_CLOSED);
            conversation.setClosedAt(LocalDateTime.now(clock));
            conversation.setClosedReason(Conversation.CLOSED_CONSULTATION_CANCELLED);
            Conversation saved = conversationRepository.save(conversation);
            publishStatus(saved, Conversation.STATUS_CLOSED);
        });
    }

    /**
     * Executes can send operation.
     */
    public boolean canSend(Conversation conversation) {
        if (conversation == null) return false;
        if (!Conversation.STATUS_ACTIVE.equals(conversation.getStatus())) return false;
        Appointment appointment = conversation.getAppointment();
        if (appointment != null && isDeadAppointmentStatus(appointment.getStatus())) return false;
        LocalDateTime expiresAt = conversation.getExpiresAt();
        return expiresAt == null || expiresAt.isAfter(LocalDateTime.now(clock));
    }

    /**
     * Executes can reopen operation.
     */
    public boolean canReopen(Conversation conversation, Long userId) {
        if (conversation == null || userId == null) return false;
        if (conversation.getNutritionist() == null
                || !userId.equals(conversation.getNutritionist().getId())) return false;
        if (Conversation.STATUS_ACTIVE.equals(conversation.getStatus())) return false;
        if (conversation.getReopenCount() >= MAX_REOPENS) return false;
        Appointment appointment = conversation.getAppointment();
        if (appointment == null || appointment.getStatus() == null) return false;
        String status = appointment.getStatus().toUpperCase(Locale.ROOT);
        return isAcceptedAppointmentStatus(status) && !isDeadAppointmentStatus(status);
    }

    /**
     * Executes publish status operation.
     */
    private void publishStatus(Conversation conversation, String status) {
        Long conversationId = conversation.getId();
        Long patientId = conversation.getPatient() != null ? conversation.getPatient().getId() : null;
        Long nutritionistId = conversation.getNutritionist() != null ? conversation.getNutritionist().getId() : null;

        ConversationStatusDto payload = new ConversationStatusDto(conversationId, status);
        if (patientId != null && nutritionistId != null) {
            chatSseService.publishStatus(conversationId, patientId, nutritionistId, payload);
        }

        if (Conversation.STATUS_EXPIRED.equals(status) || Conversation.STATUS_CLOSED.equals(status)) {
            chatSseService.closeConversation(conversationId);
        }

        if (patientId != null) {
            walletSseService.sendUserEvent(patientId,
                    conversation.getPatient().getEmail(), "conversation_status", payload);
        }
        if (nutritionistId != null) {
            walletSseService.sendUserEvent(nutritionistId,
                    conversation.getNutritionist().getEmail(), "conversation_status", payload);
        }
    }

    /**
     * Executes notify activated operation.
     */
    private void notifyActivated(Conversation conversation, Appointment appointment) {
        String until = conversation.getExpiresAt() != null
                ? conversation.getExpiresAt().format(DATE_FORMAT) : "the end of the consultation";
        notificationService.notifyUser(conversation.getPatient(), null,
                "Consultation Chat Open",
                "Your consultation with " + displayName(conversation.getNutritionist())
                        + " is confirmed. The chat is open until " + until + ".",
                NotificationService.TYPE_CONSULTATION_ACTIVATED, "forum",
                "/consultation-chat?conversationId=" + conversation.getId());
        notificationService.notifyUser(conversation.getNutritionist(), null,
                "Consultation Chat Open",
                "The consultation with " + displayName(conversation.getPatient())
                        + " is confirmed. The chat is open until " + until + ".",
                NotificationService.TYPE_CONSULTATION_ACTIVATED, "forum",
                "/consultation-chat?conversationId=" + conversation.getId());
    }

    /**
     * Executes notify expired operation.
     */
    private void notifyExpired(Conversation conversation) {
        notificationService.notifyUser(conversation.getPatient(), null,
                "Consultation Chat Expired",
                "The chat with " + displayName(conversation.getNutritionist())
                        + " has expired. Book a new consultation to keep talking.",
                NotificationService.TYPE_CONSULTATION_EXPIRED, "timer_off",
                "/consultation-chat?conversationId=" + conversation.getId());
        notificationService.notifyUser(conversation.getNutritionist(), null,
                "Consultation Chat Expired",
                "The chat with " + displayName(conversation.getPatient())
                        + " has expired. You can reopen it " + MAX_REOPENS + " more times at most.",
                NotificationService.TYPE_CONSULTATION_EXPIRED, "timer_off",
                "/consultation-chat?conversationId=" + conversation.getId());
    }

    /**
     * Executes notify reopened operation.
     */
    private void notifyReopened(Conversation conversation) {
        String until = conversation.getExpiresAt() != null
                ? conversation.getExpiresAt().format(DATE_FORMAT) : "the end of the new window";
        notificationService.notifyUser(conversation.getPatient(), null,
                "Consultation Chat Reopened",
                displayName(conversation.getNutritionist())
                        + " reopened your chat. It is open again until " + until + ".",
                NotificationService.TYPE_CONSULTATION_REOPENED, "forum",
                "/consultation-chat?conversationId=" + conversation.getId());
    }

    /**
     * Executes display name operation.
     */
    private static String displayName(User user) {
        if (user == null) return "Your contact";
        String name = ((user.getFirstName() == null ? "" : user.getFirstName()) + " "
                + (user.getLastName() == null ? "" : user.getLastName())).trim();
        return name.isEmpty() ? user.getEmail() : name;
    }
}
