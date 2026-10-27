package com.nutrition.service;

import com.nutrition.dto.*;
import com.nutrition.entity.*;
import com.nutrition.repository.*;
import lombok.RequiredArgsConstructor;
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

    @Transactional
    public ConversationDto createConversation(Long appointmentId, Long participantId, Long userId, Role role) {
        if (role == Role.ADMIN && appointmentId == null) {
            if (participantId == null || Objects.equals(participantId, userId)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose a user or nutritionist to start a chat");
            }
            User participant = userRepository.findById(participantId)
                    .filter(candidate -> candidate.getRole() == Role.USER || candidate.getRole() == Role.NUTRITIONIST)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Chat participant not found"));
            Long patientId = participant.getRole() == Role.USER ? participant.getId() : userId;
            Long nutritionistId = participant.getRole() == Role.NUTRITIONIST ? participant.getId() : userId;
            Optional<Conversation> active = conversationRepository
                    .findFirstByPatient_IdAndNutritionist_IdAndStatusOrderByUpdatedAtDesc(
                            patientId, nutritionistId, "ACTIVE");
            return active.map(this::conversationDto).orElseGet(() -> {
                Conversation conversation = new Conversation();
                conversation.setPatient(userRepository.getReferenceById(patientId));
                conversation.setNutritionist(userRepository.getReferenceById(nutritionistId));
                conversation.setStatus("ACTIVE");
                return conversationDto(conversationRepository.save(conversation));
            });
        }
        if (role == Role.NUTRITIONIST && appointmentId == null) {
            if (participantId == null || Objects.equals(participantId, userId)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose a patient to start a chat");
            }
            User patient = userRepository.findById(participantId)
                    .filter(candidate -> candidate.getRole() == Role.USER)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
            Optional<Conversation> active = conversationRepository
                    .findFirstByPatient_IdAndNutritionist_IdAndStatusOrderByUpdatedAtDesc(
                            patient.getId(), userId, "ACTIVE");
            return active.map(this::conversationDto).orElseGet(() -> {
                Conversation conversation = new Conversation();
                conversation.setPatient(patient);
                conversation.setNutritionist(userRepository.getReferenceById(userId));
                conversation.setStatus("ACTIVE");
                return conversationDto(conversationRepository.save(conversation));
            });
        }

        if (appointmentId == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Book a consultation before starting a chat");
        }
        Optional<Appointment> appointment = appointmentRepository.findById(appointmentId);
        Appointment resolvedAppointment = appointment
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Appointment not found"));
        if (resolvedAppointment.getNutritionist() == null || resolvedAppointment.getUser() == null) deny();
        boolean isPatient = role == Role.USER && Objects.equals(resolvedAppointment.getUser().getId(), userId);
        boolean isNutritionist = role == Role.NUTRITIONIST &&
                Objects.equals(resolvedAppointment.getNutritionist().getId(), userId);
        if (!isPatient && !isNutritionist) deny();
        if (participantId != null && !Objects.equals(participantId, resolvedAppointment.getUser().getId())) deny();
        String appointmentStatus = String.valueOf(resolvedAppointment.getStatus()).toUpperCase(Locale.ROOT);
        if (isPatient && (appointmentStatus.equals("CANCELLED") || appointmentStatus.equals("REJECTED"))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This consultation is no longer available");
        }
        Optional<Conversation> existing = conversationRepository.findByAppointmentId(resolvedAppointment.getId());
        if (existing.isPresent()) {
            Conversation conversation = existing.get();
            if (isNutritionist && "CLOSED".equals(conversation.getStatus())) {
                conversation.setStatus("ACTIVE");
                conversationRepository.save(conversation);
            }
            return conversationDto(conversation);
        }
        return conversationDto(createAppointmentConversation(resolvedAppointment));
    }

    private Conversation createAppointmentConversation(Appointment appointment) {
            Conversation c = new Conversation();
            c.setAppointment(appointment);
            c.setPatient(appointment.getUser());
            c.setNutritionist(appointment.getNutritionist());
            c.setStatus("ACTIVE");
            return conversationRepository.save(c);
    }

    @Transactional(readOnly = true)
    public List<ChatParticipantDto> availableRecipients(Long userId, Role role) {
        if (role != Role.NUTRITIONIST) deny();
        return userRepository.findByRole(Role.USER).stream()
                .map(user -> new ChatParticipantDto(
                        user.getId(),
                        ((user.getFirstName() == null ? "" : user.getFirstName()) + " " +
                                (user.getLastName() == null ? "" : user.getLastName())).trim(),
                        user.getEmail(),
                        Role.USER.name()))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ChatParticipantDto> availableAdminRecipients(Role role) {
        requireAdmin(role);
        return java.util.stream.Stream.concat(
                        userRepository.findByRole(Role.USER).stream(),
                        userRepository.findByRole(Role.NUTRITIONIST).stream())
                .map(user -> new ChatParticipantDto(
                    user.getId(),
                    displayName(user),
                    user.getEmail(),
                    user.getRole().name()))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ConversationDto> listConversations(Long userId, Role role) {
        List<Conversation> conversations;
        if (role == Role.USER) {
            conversations = conversationRepository.findByPatient_IdOrderByUpdatedAtDesc(userId);
        } else if (role == Role.NUTRITIONIST) {
            conversations = conversationRepository.findByNutritionist_IdOrderByUpdatedAtDesc(userId);
        } else if (role == Role.ADMIN) {
            conversations = conversationRepository.findByPatient_IdOrNutritionist_IdOrderByUpdatedAtDescIdDesc(userId, userId);
        } else {
            deny();
            return List.of();
        }
        return conversations.stream().map(this::conversationDto).toList();
    }

    @Transactional(readOnly = true)
    public ConversationPageDto listNutritionistConversationPage(Long userId, Role role, int requestedPage, int requestedSize) {
        int page = Math.max(0, requestedPage);
        var pageable = PageRequest.of(page, clampPageSize(requestedSize));
        if (role == Role.NUTRITIONIST) {
            return conversationPage(conversationRepository.findByNutritionist_IdOrderByUpdatedAtDescIdDesc(userId, pageable));
        }
        if (role == Role.ADMIN) {
            return conversationPage(conversationRepository.findByPatient_IdOrNutritionist_IdOrderByUpdatedAtDescIdDesc(userId, userId, pageable));
        }
        deny();
        return new ConversationPageDto();
    }

    @Transactional(readOnly = true)
    private ConversationPageDto conversationPage(Slice<Conversation> page) {
        int pageNumber = page.getNumber();
        ConversationPageDto result = new ConversationPageDto();
        result.setConversations(page.getContent().stream().map(this::conversationDto).toList());
        result.setNextPage(pageNumber + 1);
        result.setHasMore(page.hasNext());
        return result;
    }

    private static int clampPageSize(int requestedSize) {
        return Math.max(1, Math.min(50, requestedSize));
    }

    @Transactional(readOnly = true)
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

    private static void requireAdmin(Role role) {
        if (role != Role.ADMIN) deny();
    }

    @Transactional(readOnly = true)
    public ConversationDto getConversation(Long conversationId, Long userId) {
        return conversationDto(authorized(conversationId, userId));
    }

    @Transactional(readOnly = true)
    public ChatHistoryDto history(Long conversationId, Long userId, Long before, int requestedLimit) {
        Conversation c = authorized(conversationId, userId);
        return historyForConversation(c, before, requestedLimit);
    }

    @Transactional
    public ChatMessageDto send(Long conversationId, Long userId, ChatMessageRequest request) {
        Conversation c = authorized(conversationId, userId);
        ensureActive(c);
        ChatMessage message = messageRepository.findByConversationIdAndSenderIdAndClientMessageId(
                conversationId, userId, request.getClientMessageId()).orElseGet(() -> {
            ChatMessage m = new ChatMessage();
            m.setConversation(c);
            m.setSender(userRepository.getReferenceById(userId));
            m.setContent(request.getContent().trim());
            m.setClientMessageId(request.getClientMessageId().trim());
            return messageRepository.save(m);
        });
        ChatMessageDto dto = messageDto(message);
        c.setUpdatedAt(LocalDateTime.now());
        conversationRepository.save(c);
        Long patientId = c.getPatient().getId();
        Long nutritionistId = c.getNutritionist().getId();
        afterCommit(() -> chatSseService.publishMessage(
                conversationId, patientId, nutritionistId, dto));
        return dto;
    }

    @Transactional
    public void markRead(Long conversationId, Long userId) {
        authorized(conversationId, userId);
        messageRepository.markReadForConversationAndRecipient(conversationId, userId, LocalDateTime.now());
    }

    @Transactional
    public ConversationDto endConversation(Long conversationId, Long userId, Role role) {
        Conversation conversation = authorized(conversationId, userId);
        if (role != Role.NUTRITIONIST || !Objects.equals(conversation.getNutritionist().getId(), userId)) deny();
        if ("ACTIVE".equals(conversation.getStatus())) {
            conversation.setStatus("CLOSED");
            conversation = conversationRepository.save(conversation);
            Conversation endedConversation = conversation;
            afterCommit(() -> chatSseService.publishStatus(
                    conversationId,
                    endedConversation.getPatient().getId(),
                    endedConversation.getNutritionist().getId(),
                    new ConversationStatusDto(conversationId, "CLOSED")));
        }
        return conversationDto(conversation);
    }

    @Transactional
    public ConversationDto reopenConversation(Long conversationId, Long userId, Role role) {
        Conversation conversation = authorized(conversationId, userId);
        if (role != Role.NUTRITIONIST || !Objects.equals(conversation.getNutritionist().getId(), userId)) deny();
        if ("CLOSED".equals(conversation.getStatus())) {
            conversation.setStatus("ACTIVE");
            conversation = conversationRepository.save(conversation);
            Conversation reopenedConversation = conversation;
            afterCommit(() -> chatSseService.publishStatus(
                    conversationId,
                    reopenedConversation.getPatient().getId(),
                    reopenedConversation.getNutritionist().getId(),
                    new ConversationStatusDto(conversationId, "ACTIVE")));
        }
        return conversationDto(conversation);
    }

    @Transactional(readOnly = true)
    public SseEmitter subscribe(Long conversationId, Long userId) {
        return chatSseService.subscribe(authorized(conversationId, userId), userId);
    }

    public Conversation authorizedConversation(Long id, Long userId) { return authorized(id, userId); }

    private Conversation authorized(Long id, Long userId) {
        Conversation c = conversationRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Conversation not found"));
        if (!Objects.equals(c.getPatient().getId(), userId) && !Objects.equals(c.getNutritionist().getId(), userId)) deny();
        return c;
    }
    private static void ensureActive(Conversation conversation) {
        if (!"ACTIVE".equals(conversation.getStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This consultation chat has ended");
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
    private ConversationDto conversationDto(Conversation c) {
        ConversationDto d = new ConversationDto(); d.setId(c.getId());
        d.setAppointmentId(c.getAppointment() == null ? null : c.getAppointment().getId());
        d.setPatientId(c.getPatient().getId()); d.setNutritionistId(c.getNutritionist().getId());
        d.setPatientName(displayName(c.getPatient()));
        d.setPatientEmail(c.getPatient().getEmail());
        d.setPatientRole(c.getPatient().getRole().name());
        d.setNutritionistName(displayName(c.getNutritionist()));
        d.setNutritionistEmail(c.getNutritionist().getEmail());
        d.setNutritionistRole(c.getNutritionist().getRole().name());
        d.setStatus(c.getStatus());
        d.setCreatedAt(c.getCreatedAt()); d.setUpdatedAt(c.getUpdatedAt()); return d;
    }
    private static String displayName(User user) {
        String name = ((user.getFirstName() == null ? "" : user.getFirstName()) + " " +
                (user.getLastName() == null ? "" : user.getLastName())).trim();
        return name.isEmpty() ? user.getEmail() : name;
    }
    private ChatMessageDto messageDto(ChatMessage m) {
        ChatMessageDto d = new ChatMessageDto(); d.setId(m.getId()); d.setConversationId(m.getConversation().getId());
        d.setSenderId(m.getSender().getId()); d.setContent(m.getContent()); d.setClientMessageId(m.getClientMessageId());
        d.setCreatedAt(m.getCreatedAt()); d.setReadAt(m.getReadAt()); return d;
    }
}
