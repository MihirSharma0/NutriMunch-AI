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

public interface ConversationRepository extends JpaRepository<Conversation, Long> {
    Optional<Conversation> findByAppointmentId(Long appointmentId);
    Optional<Conversation> findFirstByPatient_IdAndNutritionist_IdAndStatusOrderByUpdatedAtDesc(
            Long patientId, Long nutritionistId, String status);

    @EntityGraph(attributePaths = {"patient", "nutritionist", "appointment"})
    List<Conversation> findByPatient_IdOrderByUpdatedAtDesc(Long patientId);

    @EntityGraph(attributePaths = {"patient", "nutritionist", "appointment"})
    List<Conversation> findByNutritionist_IdOrderByUpdatedAtDesc(Long nutritionistId);

    List<Conversation> findByPatient_IdOrNutritionist_IdOrderByUpdatedAtDescIdDesc(Long patientId, Long nutritionistId);

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
