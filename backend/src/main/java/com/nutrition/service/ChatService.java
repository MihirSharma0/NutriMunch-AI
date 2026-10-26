package com.nutrition.service;

import com.nutrition.dto.*;
import com.nutrition.entity.*;
import com.nutrition.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
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
    private final SimpMessagingTemplate messagingTemplate;

    @Transactional
    public ConversationDto createConversation(Long appointmentId, Long participantId, Long userId, Role role) {
        Optional<Appointment> appointment = appointmentId != null
                ? appointmentRepository.findById(appointmentId)
                : role == Role.NUTRITIONIST && participantId != null
                    ? appointmentRepository.findFirstByNutritionistIdAndUserIdOrderByAppointmentTimeDesc(userId, participantId)
                    : appointmentRepository.findFirstByUserIdOrderByAppointmentTimeDesc(userId);
        Appointment resolvedAppointment = appointment
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Appointment not found"));
        if (resolvedAppointment.getNutritionist() == null || resolvedAppointment.getUser() == null ||
                (!Objects.equals(resolvedAppointment.getUser().getId(), userId)
                        && !Objects.equals(resolvedAppointment.getNutritionist().getId(), userId)
                        && role != Role.ADMIN)) deny();
        return conversationRepository.findByAppointmentId(resolvedAppointment.getId()).map(this::conversationDto).orElseGet(() -> {
            Conversation c = new Conversation();
            c.setAppointment(resolvedAppointment);
            c.setPatient(resolvedAppointment.getUser());
            c.setNutritionist(resolvedAppointment.getNutritionist());
            c.setStatus("ACTIVE");
            return conversationDto(conversationRepository.save(c));
        });
    }

    @Transactional(readOnly = true)
    public ChatHistoryDto history(Long conversationId, Long userId, Long before, int requestedLimit) {
        Conversation c = authorized(conversationId, userId);
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
    public ChatMessageDto send(Long conversationId, Long userId, ChatMessageRequest request) {
        Conversation c = authorized(conversationId, userId);
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
        messagingTemplate.convertAndSend("/topic/conversations/" + conversationId, dto);
        return dto;
    }

    @Transactional
    public void markRead(Long conversationId, Long userId) {
        authorized(conversationId, userId);
        messageRepository.markReadForConversationAndRecipient(conversationId, userId, LocalDateTime.now());
    }

    public Conversation authorizedConversation(Long id, Long userId) { return authorized(id, userId); }

    private Conversation authorized(Long id, Long userId) {
        Conversation c = conversationRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Conversation not found"));
        if (!Objects.equals(c.getPatient().getId(), userId) && !Objects.equals(c.getNutritionist().getId(), userId)) deny();
        return c;
    }
    private static void deny() { throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not a conversation participant"); }
    private ConversationDto conversationDto(Conversation c) {
        ConversationDto d = new ConversationDto(); d.setId(c.getId()); d.setAppointmentId(c.getAppointment().getId());
        d.setPatientId(c.getPatient().getId()); d.setNutritionistId(c.getNutritionist().getId());
        d.setStatus(c.getStatus());
        d.setCreatedAt(c.getCreatedAt()); d.setUpdatedAt(c.getUpdatedAt()); return d;
    }
    private ChatMessageDto messageDto(ChatMessage m) {
        ChatMessageDto d = new ChatMessageDto(); d.setId(m.getId()); d.setConversationId(m.getConversation().getId());
        d.setSenderId(m.getSender().getId()); d.setContent(m.getContent()); d.setClientMessageId(m.getClientMessageId());
        d.setCreatedAt(m.getCreatedAt()); d.setReadAt(m.getReadAt()); return d;
    }
}
