/**
 * Unit Test Suite for ConsultationLifecycleService.
 * Validates consultation chat window derivation, 5-day active windows,
 * overdue expiry, thread closures, and nutritionist reopening limits.
 */
package com.nutrition.service;

import com.nutrition.entity.Appointment;
import com.nutrition.entity.Conversation;
import com.nutrition.entity.Role;
import com.nutrition.entity.User;
import com.nutrition.repository.ConversationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests for the consultation chat lifecycle. No database is required: the repository and
 * the notification/stream collaborators are mocked and time is driven by a fixed clock.
 */
@ExtendWith(MockitoExtension.class)
class ConsultationLifecycleServiceTest {

    private static final LocalDateTime NOW = LocalDateTime.of(2026, 3, 10, 9, 0);

    @Mock private ConversationRepository conversationRepository;
    @Mock private NotificationService notificationService;
    @Mock private ChatSseService chatSseService;
    @Mock private WalletSseService walletSseService;

    private ConsultationLifecycleService service;

    /**
     * Initializes test fixtures, mock repositories, and default consultation records before each test.
     */
    @BeforeEach
    void setUp() {
        Clock fixed = Clock.fixed(Instant.parse("2026-03-10T09:00:00Z"), ZoneOffset.UTC);
        service = new ConsultationLifecycleService(
                conversationRepository, notificationService, chatSseService, walletSseService, fixed);
    }

    // ---------- fixtures ----------

    private User user(long id, Role role) {
        User u = new User();
        u.setId(id);
        u.setEmail(role.name().toLowerCase() + id + "@nutrimunch.test");
        u.setFirstName("First" + id);
        u.setLastName("Last" + id);
        u.setRole(role);
        return u;
    }

    private Appointment appointment(String status, LocalDateTime appointmentTime) {
        Appointment a = new Appointment();
        a.setId(100L);
        a.setUser(user(1L, Role.USER));
        a.setNutritionist(user(2L, Role.NUTRITIONIST));
        a.setStatus(status);
        a.setAppointmentTime(appointmentTime);
        return a;
    }

    private Conversation activeConversation(LocalDateTime expiresAt, int reopenCount) {
        Conversation c = new Conversation();
        c.setId(50L);
        c.setAppointment(appointment("Confirmed", NOW.minusDays(1)));
        c.setPatient(user(1L, Role.USER));
        c.setNutritionist(user(2L, Role.NUTRITIONIST));
        c.setStatus(Conversation.STATUS_ACTIVE);
        c.setActivatedAt(NOW.minusDays(1));
        c.setExpiresAt(expiresAt);
        c.setReopenCount(reopenCount);
        return c;
    }

    // ---------- window ----------

    @Test
    @DisplayName("the window starts at the later of acceptance and the scheduled session")
    void windowUsesLaterOfAcceptanceAndAppointment() {
        // session is in the future -> window runs from the session
        assertThat(service.windowEnd(NOW, NOW.plusDays(20)))
                .isEqualTo(NOW.plusDays(20 + ConsultationLifecycleService.CHAT_WINDOW_DAYS));

        // session already happened -> window runs from acceptance
        assertThat(service.windowEnd(NOW, NOW.minusDays(3)))
                .isEqualTo(NOW.plusDays(ConsultationLifecycleService.CHAT_WINDOW_DAYS));
    }

    // ---------- activation ----------

    @Test
    @DisplayName("a chat cannot be opened for a consultation the nutritionist has not accepted")
    void openRejectsUnacceptedConsultation() {
        Appointment requested = appointment("Requested", NOW.plusDays(1));

        assertThatThrownBy(() -> service.openForAppointment(requested))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(e -> assertThat(((ResponseStatusException) e).getStatusCode())
                        .isEqualTo(HttpStatus.CONFLICT));

        verify(conversationRepository, never()).save(any());
    }

    @Test
    @DisplayName("accepting a consultation creates an active chat with a five day window")
    void openCreatesActiveConversation() {
        Appointment accepted = appointment("Confirmed", NOW.minusHours(2));
        when(conversationRepository.findByAppointmentId(anyLong())).thenReturn(Optional.empty());
        when(conversationRepository.save(any(Conversation.class))).thenAnswer(i -> i.getArgument(0));

        Conversation created = service.openForAppointment(accepted);

        assertThat(created.getStatus()).isEqualTo(Conversation.STATUS_ACTIVE);
        assertThat(created.getActivatedAt()).isEqualTo(NOW);
        assertThat(created.getExpiresAt()).isEqualTo(NOW.plusDays(ConsultationLifecycleService.CHAT_WINDOW_DAYS));
        assertThat(created.getReopenCount()).isZero();
        assertThat(service.canSend(created)).isTrue();
    }

    // ---------- sending ----------

    @Test
    @DisplayName("messages are refused once the window has elapsed")
    void cannotSendAfterExpiry() {
        Conversation expired = activeConversation(NOW.minusMinutes(1), 0);
        assertThat(service.canSend(expired)).isFalse();

        Conversation stillOpen = activeConversation(NOW.plusMinutes(1), 0);
        assertThat(service.canSend(stillOpen)).isTrue();
    }

    @Test
    @DisplayName("reading an overdue conversation flips it to EXPIRED exactly once")
    void refreshExpiresOverdueConversation() {
        Conversation overdue = activeConversation(NOW.minusHours(1), 0);
        when(conversationRepository.save(any(Conversation.class))).thenAnswer(i -> i.getArgument(0));

        Conversation refreshed = service.refreshLifecycle(overdue);

        assertThat(refreshed.getStatus()).isEqualTo(Conversation.STATUS_EXPIRED);
        assertThat(refreshed.getClosedReason()).isEqualTo(Conversation.CLOSED_EXPIRED);
        assertThat(refreshed.getClosedAt()).isEqualTo(overdue.getExpiresAt());
        assertThat(service.canSend(refreshed)).isFalse();
    }

    // ---------- reopen ----------

    @Test
    @DisplayName("only the assigned nutritionist may reopen")
    void patientCannotReopen() {
        Conversation expired = activeConversation(NOW.minusHours(1), 0);
        expired.setStatus(Conversation.STATUS_EXPIRED);

        assertThatThrownBy(() -> service.reopen(expired, 1L))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(e -> assertThat(((ResponseStatusException) e).getStatusCode())
                        .isEqualTo(HttpStatus.FORBIDDEN));
    }

    @Test
    @DisplayName("reopen is capped at three per consultation")
    void reopenIsCappedAtThree() {
        Conversation expired = activeConversation(NOW.minusHours(1), ConsultationLifecycleService.MAX_REOPENS);
        expired.setStatus(Conversation.STATUS_EXPIRED);

        assertThatThrownBy(() -> service.reopen(expired, 2L))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(e -> assertThat(((ResponseStatusException) e).getStatusCode())
                        .isEqualTo(HttpStatus.CONFLICT));
    }

    @Test
    @DisplayName("reopening grants a fresh five day window and records the count")
    void reopenExtendsWindow() {
        Conversation expired = activeConversation(NOW.minusHours(1), 1);
        expired.setStatus(Conversation.STATUS_EXPIRED);
        when(conversationRepository.save(any(Conversation.class))).thenAnswer(i -> i.getArgument(0));

        Conversation reopened = service.reopen(expired, 2L);

        assertThat(reopened.getStatus()).isEqualTo(Conversation.STATUS_ACTIVE);
        assertThat(reopened.getExpiresAt()).isEqualTo(NOW.plusDays(ConsultationLifecycleService.CHAT_WINDOW_DAYS));
        assertThat(reopened.getReopenCount()).isEqualTo(2);
        assertThat(reopened.getClosedReason()).isNull();
        assertThat(service.canSend(reopened)).isTrue();
    }

    @Test
    @DisplayName("a chat whose consultation was cancelled is closed even though the window has not run out")
    void cancelledConsultationClosesChat() {
        Conversation stillInWindow = activeConversation(NOW.plusDays(3), 0);
        stillInWindow.setAppointment(appointment("CANCELLED", NOW.minusDays(2)));
        when(conversationRepository.save(any(Conversation.class))).thenAnswer(i -> i.getArgument(0));

        Conversation refreshed = service.refreshLifecycle(stillInWindow);

        assertThat(refreshed.getStatus()).isEqualTo(Conversation.STATUS_CLOSED);
        assertThat(refreshed.getClosedReason()).isEqualTo(Conversation.CLOSED_CONSULTATION_CANCELLED);
        assertThat(service.canSend(refreshed)).isFalse();
    }

    @Test
    @DisplayName("a cancelled consultation can never be reopened")
    void cannotReopenCancelledConsultation() {
        Conversation expired = activeConversation(NOW.minusHours(1), 0);
        expired.setStatus(Conversation.STATUS_EXPIRED);
        expired.setAppointment(appointment("CANCELLED", NOW.minusDays(2)));

        assertThatThrownBy(() -> service.reopen(expired, 2L))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(e -> assertThat(((ResponseStatusException) e).getStatusCode())
                        .isEqualTo(HttpStatus.CONFLICT));

        assertThat(service.canReopen(expired, 2L)).isFalse();
    }
}
