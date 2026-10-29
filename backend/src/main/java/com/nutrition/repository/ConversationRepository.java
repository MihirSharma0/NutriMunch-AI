package com.nutrition.repository;

import com.nutrition.entity.Conversation;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Spring Data JPA Repository for Conversation entities.
Manages active consultation chat sessions, lifecycle windows, participant queries, and dead-session closures.
 */
public interface ConversationRepository extends JpaRepository<Conversation, Long> {
    /**
     * Executes query to find by appointment id.
     */
    Optional<Conversation> findByAppointmentId(Long appointmentId);
    Optional<Conversation> findFirstByPatient_IdAndNutritionist_IdAndStatusOrderByUpdatedAtDesc(
            Long patientId, Long nutritionistId, String status);

    /**
     * Executes query to find by patient id order by updated at desc.
     */
    @EntityGraph(attributePaths = {"patient", "nutritionist", "appointment"})
    List<Conversation> findByPatient_IdOrderByUpdatedAtDesc(Long patientId);

    /**
     * Executes query to find by nutritionist id order by updated at desc.
     */
    @EntityGraph(attributePaths = {"patient", "nutritionist", "appointment"})
    List<Conversation> findByNutritionist_IdOrderByUpdatedAtDesc(Long nutritionistId);

    /**
     * Executes query to find by patient id or nutritionist id order by updated at desc id desc.
     */
    List<Conversation> findByPatient_IdOrNutritionist_IdOrderByUpdatedAtDescIdDesc(Long patientId, Long nutritionistId);

    /**
     * Executes query to find by nutritionist id order by updated at desc id desc.
     */
    @EntityGraph(attributePaths = {"patient", "nutritionist", "appointment"})
    Slice<Conversation> findByNutritionist_IdOrderByUpdatedAtDescIdDesc(Long nutritionistId, Pageable pageable);

    @EntityGraph(attributePaths = {"patient", "nutritionist", "appointment"})
    Slice<Conversation> findByPatient_IdOrNutritionist_IdOrderByUpdatedAtDescIdDesc(
            Long patientId, Long nutritionistId, Pageable pageable);

    /** Active conversations whose consultation was cancelled or declined and must be closed. */
    @EntityGraph(attributePaths = {"patient", "nutritionist", "appointment"})
    @Query("SELECT c FROM Conversation c JOIN c.appointment a " +
           "WHERE c.status = 'ACTIVE' AND UPPER(a.status) IN :deadStatuses")
    List<Conversation> findActiveWithDeadConsultation(
            @Param("deadStatuses") java.util.Collection<String> deadStatuses);

    /** Conversations whose messaging window has run out but that are still marked ACTIVE. */
    @EntityGraph(attributePaths = {"patient", "nutritionist", "appointment"})
    List<Conversation> findByStatusAndExpiresAtLessThanEqual(String status, LocalDateTime cutoff);
}
