package com.nutrition.service;

import com.nutrition.dto.*;
import com.nutrition.entity.*;
import com.nutrition.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Slice;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class ChatService {
    private static final int MAX_PAGE_SIZE = 50;

    private final ConversationRepository conversationRepository;
    private final ChatMessageRepository messageRepository;
    private final AppointmentRepository appointmentRepository;
    private final UserRepository userRepository;
    private final ChatSseService chatSseService;
    private final ConsultationLifecycleService lifecycleService;
    private final NotificationService notificationService;
    private final WalletSseService walletSseService;

    /**
     * Opens the chat for an accepted consultation. A conversation can no longer be created
     * without an appointment, which is what keeps a nutritionist from messaging a user they
     * were never assigned to.
     */
    @Transactional
    public ConversationDto createConversation(Long appointmentId, Long participantId, Long userId, Role role) {
        if (role == Role.ADMIN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Administrators do not take part in consultation chats");
        }
        if (appointmentId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "A consultation is required before a chat can be opened");
        }

        Appointment appointment = appointmentRepository.findByIdWithLock(appointmentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Consultation not found"));

        if (appointment.getUser() == null || appointment.getNutritionist() == null) deny();

        boolean isPatient = role == Role.USER && Objects.equals(appointment.getUser().getId(), userId);
        boolean isNutritionist = role == Role.NUTRITIONIST
                && Objects.equals(appointment.getNutritionist().getId(), userId);
        if (!isPatient && !isNutritionist) deny();

        if (participantId != null && !Objects.equals(participantId, appointment.getUser().getId())) deny();

        String status = appointment.getStatus() != null ? appointment.getStatus().toUpperCase(Locale.ROOT) : "";
        if (ConsultationLifecycleService.isDeadAppointmentStatus(status)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This consultation is no longer available");
        }
        if (!ConsultationLifecycleService.isAcceptedAppointmentStatus(status)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "The chat becomes available once the nutritionist accepts the consultation");
        }

        Conversation conversation = lifecycleService.openForAppointment(appointment);
        return conversationDto(lifecycleService.refreshLifecycle(conversation), userId);
    }

    /**
     * The nutritionist's selectable contacts. Only users with an accepted consultation appear,
     * replacing the previous "every user in the database" list.
     */
    @Transactional
    public List<ChatParticipantDto> availableRecipients(Long userId, Role role) {
        if (role != Role.NUTRITIONIST) deny();
        return appointmentRepository
                .findAcceptedPatients(userId, List.of("CONFIRMED", "ACCEPTED", "APPROVED", "SCHEDULED"))
                .stream()
                .map(patient -> {
                    Appointment latest = appointmentRepository
                            .findFirstByNutritionistIdAndUserIdOrderByAppointmentTimeDesc(userId, patient.getId())
                            .orElse(null);
                    Conversation conversation = latest != null
                            ? conversationRepository.findByAppointmentId(latest.getId()).orElse(null)
                            : null;
                    return new ChatParticipantDto(
                            patient.getId(),
                            displayName(patient),
                            patient.getEmail(),
                            Role.USER.name(),
                            latest != null ? latest.getId() : null,
                            conversation != null ? conversation.getId() : null);
                })
                .filter(Objects::nonNull)
                .toList();
    }

    @Transactional
    public List<ConversationDto> listConversations(Long userId, Role role) {
        List<Conversation> conversations;
        if (role == Role.USER) {
            conversations = conversationRepository.findByPatient_IdOrderByUpdatedAtDesc(userId);
        } else if (role == Role.NUTRITIONIST) {
            conversations = conversationRepository.findByNutritionist_IdOrderByUpdatedAtDesc(userId);
        } else {
            deny();
            return List.of();
        }
        List<Conversation> refreshed = conversations.stream()
                .map(lifecycleService::refreshLifecycle)
                .toList();
        return conversationDtos(refreshed, userId);
    }

    @Transactional
    public ConversationPageDto listNutritionistConversationPage(Long userId, Role role, int requestedPage, int requestedSize) {
        if (role != Role.NUTRITIONIST) deny();
        int page = Math.max(0, requestedPage);
        var pageable = PageRequest.of(page, clampPageSize(requestedSize));
        Slice<Conversation> slice = conversationRepository
                .findByNutritionist_IdOrderByUpdatedAtDescIdDesc(userId, pageable);

        List<Conversation> refreshed = slice.getContent().stream()
                .map(lifecycleService::refreshLifecycle)
                .toList();

        ConversationPageDto result = new ConversationPageDto();
        result.setConversations(conversationDtos(refreshed, userId));
        result.setNextPage(slice.getNumber() + 1);
        result.setHasMore(slice.hasNext());
        return result;
    }

    private static int clampPageSize(int requestedSize) {
        return Math.max(1, Math.min(50, requestedSize));
    }

    @Transactional
    public ChatHistoryDto history(Long conversationId, Long userId, Long before, int requestedLimit) {
        Conversation c = lifecycleService.refreshLifecycle(authorized(conversationId, userId));
        return historyForConversation(c, before, requestedLimit);
    }

    private ChatHistoryDto historyForConversation(Conversation c, Long before, int requestedLimit) {
        int limit = Math.max(1, Math.min(MAX_PAGE_SIZE, requestedLimit <= 0 ? 30 : requestedLimit));
        var page = PageRequest.of(0, limit, Sort.by(Sort.Direction.DESC, "id"));
        List<ChatMessage> messages = before == null
                ? messageRepository.findByConversationIdOrderByIdDesc(c.getId(), page)
                : messageRepository.findByConversationIdAndIdLessThanOrderByIdDesc(c.getId(), before, page);
        ChatHistoryDto result = new ChatHistoryDto();
        result.setMessages(messages.stream().sorted(Comparator.comparing(ChatMessage::getId)).map(this::messageDto).toList());
        result.setNextCursor(messages.size() == limit ? messages.get(messages.size() - 1).getId() : null);
        return result;
    }

    @Transactional
    public ConversationDto getConversation(Long conversationId, Long userId) {
        return conversationDto(lifecycleService.refreshLifecycle(authorized(conversationId, userId)), userId);
    }

    @Transactional
    public ChatMessageDto send(Long conversationId, Long userId, ChatMessageRequest request) {
        Conversation c = lifecycleService.refreshLifecycle(authorized(conversationId, userId));
        ensureSendable(c);

        ChatMessage message = messageRepository.findByConversationIdAndSenderIdAndClientMessageId(
                conversationId, userId, request.getClientMessageId().trim()).orElse(null);

        if (message == null) {
            try {
                ChatMessage fresh = new ChatMessage();
                fresh.setConversation(c);
                fresh.setSender(userRepository.getReferenceById(userId));
                fresh.setContent(request.getContent().trim());
                fresh.setClientMessageId(request.getClientMessageId().trim());
                message = messageRepository.saveAndFlush(fresh);
            } catch (DataIntegrityViolationException duplicate) {
                // Concurrent retry of the same client message: return the stored one instead of a 500.
                message = messageRepository.findByConversationIdAndSenderIdAndClientMessageId(
                                conversationId, userId, request.getClientMessageId().trim())
                        .orElseThrow(() -> duplicate);
            }
        }

        ChatMessageDto dto = messageDto(message);
        Conversation conversation = c;
        afterCommit(() -> chatSseService.publishMessage(
                conversationId,
                conversation.getPatient().getId(),
                conversation.getNutritionist().getId(),
                dto));

        User recipient = Objects.equals(conversation.getPatient().getId(), userId)
                ? conversation.getNutritionist()
                : conversation.getPatient();
        User sender = Objects.equals(conversation.getPatient().getId(), userId)
                ? conversation.getPatient()
                : conversation.getNutritionist();
        long unreadForRecipient = messageRepository.countUnreadForConversation(conversationId, recipient.getId());

        notificationService.notifyChatMessage(
                recipient, sender, conversationId, displayName(sender), request.getContent().trim(), unreadForRecipient);

        afterCommit(() -> {
            walletSseService.sendUserEvent(recipient.getId(), recipient.getEmail(), "chat_message", Map.of(
                    "conversationId", conversationId,
                    "senderId", sender.getId(),
                    "recipientId", recipient.getId(),
                    "preview", dto.getContent() == null ? "" :
                            dto.getContent().substring(0, Math.min(dto.getContent().length(), 120)),
                    "createdAt", String.valueOf(dto.getCreatedAt())));
            walletSseService.sendUserEvent(recipient.getId(), recipient.getEmail(), "notification", Map.of(
                    "type", NotificationService.TYPE_CONSULTATION_MSG,
                    "conversationId", conversationId));
        });

        return dto;
    }

    @Transactional
    public void markRead(Long conversationId, Long userId) {
        authorized(conversationId, userId);
        messageRepository.markReadForConversationAndRecipient(conversationId, userId, LocalDateTime.now());
        notificationService.markConversationNotificationsRead(userId, conversationId);
    }

    @Transactional
    public ConversationDto endConversation(Long conversationId, Long userId, Role role) {
        Conversation conversation = authorized(conversationId, userId);
        if (role != Role.NUTRITIONIST) deny();
        Conversation closed = lifecycleService.close(conversation, userId);
        return conversationDto(closed, userId);
    }

    @Transactional
    public ConversationDto reopenConversation(Long conversationId, Long userId, Role role) {
        Conversation conversation = authorized(conversationId, userId);
        if (role != Role.NUTRITIONIST) deny();
        Conversation reopened = lifecycleService.reopen(conversation, userId);
        return conversationDto(reopened, userId);
    }

    /**
     * All database work for opening a stream: authorisation plus a lazy expiry check.
     * Kept as its own proxied transaction so it commits and releases its connection before the
     * long-lived response starts. Calling this from inside {@link #subscribe} would bypass the
     * proxy and re-introduce the held connection.
     */
    @Transactional
    public ConversationStatusDto authorizeSubscription(Long conversationId, Long userId) {
        Conversation conversation = lifecycleService.refreshLifecycle(authorized(conversationId, userId));
        return new ConversationStatusDto(conversation.getId(), conversation.getStatus());
    }

    /** Deliberately NOT transactional: the response is a stream that can live for 30 minutes. */
    public SseEmitter subscribe(Long conversationId, Long userId, String status) {
        return chatSseService.subscribe(conversationId, userId, status);
    }

    /** Aggregated unread summary used by the navbar chat badge and the conversation list. */
    @Transactional
    public UnreadSummaryDto unreadSummary(Long userId) {
        List<Conversation> conversations = conversationRepository
                .findByPatient_IdOrNutritionist_IdOrderByUpdatedAtDescIdDesc(userId, userId);

        List<Long> ids = conversations.stream().map(Conversation::getId).toList();
        Map<Long, Long> counts = new HashMap<>();
        if (!ids.isEmpty()) {
            for (Object[] row : messageRepository.countUnreadByConversationIds(ids, userId)) {
                Long conversationId = ((Number) row[0]).longValue();
                Long count = ((Number) row[1]).longValue();
                if (count > 0) counts.put(conversationId, count);
            }
        }
        long total = messageRepository.countTotalUnreadForUser(userId);

        List<UnreadSummaryDto.ConversationUnread> perConversation = conversations.stream()
                .filter(c -> counts.containsKey(c.getId()))
                .map(c -> new UnreadSummaryDto.ConversationUnread(c.getId(), counts.get(c.getId())))
                .toList();

        return new UnreadSummaryDto(total, perConversation);
    }

    public Conversation authorizedConversation(Long id, Long userId) { return authorized(id, userId); }

    private Conversation authorized(Long id, Long userId) {
        Conversation c = conversationRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Conversation not found"));
        if (c.getPatient() == null || c.getNutritionist() == null) deny();
        if (!Objects.equals(c.getPatient().getId(), userId) && !Objects.equals(c.getNutritionist().getId(), userId)) deny();
        return c;
    }

    /**
     * Expiry is enforced here as well as in the lifecycle service: a direct API call, a stale
     * frontend, or a replayed request all hit the same 410.
     */
    private void ensureSendable(Conversation conversation) {
        if (Conversation.STATUS_EXPIRED.equals(conversation.getStatus())) {
            throw new ResponseStatusException(HttpStatus.GONE, "This consultation chat has expired");
        }
        if (!Conversation.STATUS_ACTIVE.equals(conversation.getStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This consultation chat has ended");
        }
        if (!lifecycleService.canSend(conversation)) {
            throw new ResponseStatusException(HttpStatus.GONE, "This consultation chat has expired");
        }
    }

    private static void afterCommit(Runnable action) {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            action.run();
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                action.run();
            }
        });
    }

    private static void deny() { throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not a conversation participant"); }

    private ConversationDto conversationDto(Conversation c, Long viewerId) {
        ConversationDto d = new ConversationDto();
        d.setId(c.getId());
        d.setAppointmentId(c.getAppointment() == null ? null : c.getAppointment().getId());
        d.setPatientId(c.getPatient().getId());
        d.setNutritionistId(c.getNutritionist().getId());
        d.setPatientName(displayName(c.getPatient()));
        d.setPatientEmail(c.getPatient().getEmail());
        d.setPatientRole(c.getPatient().getRole().name());
        d.setNutritionistName(displayName(c.getNutritionist()));
        d.setNutritionistEmail(c.getNutritionist().getEmail());
        d.setNutritionistRole(c.getNutritionist().getRole().name());
        d.setStatus(c.getStatus());
        d.setActivatedAt(c.getActivatedAt());
        d.setExpiresAt(c.getExpiresAt());
        d.setClosedAt(c.getClosedAt());
        d.setClosedReason(c.getClosedReason());
        d.setReopenedAt(c.getReopenedAt());
        d.setReopenCount(c.getReopenCount());
        d.setCanSend(lifecycleService.canSend(c));
        d.setCanReopen(lifecycleService.canReopen(c, viewerId));
        d.setUnreadCount(messageRepository.countUnreadForConversation(c.getId(), viewerId));
        d.setCreatedAt(c.getCreatedAt());
        d.setUpdatedAt(c.getUpdatedAt());
        return d;
    }

    private List<ConversationDto> conversationDtos(List<Conversation> conversations, Long viewerId) {
        if (conversations.isEmpty()) return List.of();
        List<Long> ids = conversations.stream().map(Conversation::getId).toList();
        Map<Long, Long> unread = new HashMap<>();
        for (Object[] row : messageRepository.countUnreadByConversationIds(ids, viewerId)) {
            unread.put(((Number) row[0]).longValue(), ((Number) row[1]).longValue());
        }
        return conversations.stream()
                .map(c -> {
                    ConversationDto dto = conversationDto(c, viewerId);
                    dto.setUnreadCount(unread.getOrDefault(c.getId(), 0L));
                    return dto;
                })
                .toList();
    }

    private static String displayName(User user) {
        if (user == null) return "";
        String name = ((user.getFirstName() == null ? "" : user.getFirstName()) + " " +
                (user.getLastName() == null ? "" : user.getLastName())).trim();
        return name.isEmpty() ? user.getEmail() : name;
    }

    private ChatMessageDto messageDto(ChatMessage m) {
        ChatMessageDto d = new ChatMessageDto();
        d.setId(m.getId());
        d.setConversationId(m.getConversation().getId());
        d.setSenderId(m.getSender().getId());
        d.setContent(m.getContent());
        d.setClientMessageId(m.getClientMessageId());
        d.setCreatedAt(m.getCreatedAt());
        d.setReadAt(m.getReadAt());
        return d;
    }
}
