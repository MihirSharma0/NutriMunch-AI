package com.nutrition.repository;

import com.nutrition.entity.Conversation;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface ConversationRepository extends JpaRepository<Conversation, Long> {
    Optional<Conversation> findByAppointmentId(Long appointmentId);
    Optional<Conversation> findFirstByPatient_IdAndNutritionist_IdAndStatusOrderByUpdatedAtDesc(
            Long patientId, Long nutritionistId, String status);
    List<Conversation> findByPatient_IdOrderByUpdatedAtDesc(Long patientId);
    List<Conversation> findByNutritionist_IdOrderByUpdatedAtDesc(Long nutritionistId);
    List<Conversation> findByPatient_IdOrNutritionist_IdOrderByUpdatedAtDescIdDesc(Long patientId, Long nutritionistId);
    @EntityGraph(attributePaths = {"patient", "nutritionist", "appointment"})
    Slice<Conversation> findByNutritionist_IdOrderByUpdatedAtDescIdDesc(Long nutritionistId, Pageable pageable);
    @EntityGraph(attributePaths = {"patient", "nutritionist", "appointment"})
    Slice<Conversation> findByPatient_IdOrNutritionist_IdOrderByUpdatedAtDescIdDesc(
            Long patientId, Long nutritionistId, Pageable pageable);
}
