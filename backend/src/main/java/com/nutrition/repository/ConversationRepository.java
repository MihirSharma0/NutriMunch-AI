package com.nutrition.repository;

import com.nutrition.entity.Conversation;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface ConversationRepository extends JpaRepository<Conversation, Long> {
    Optional<Conversation> findByAppointmentId(Long appointmentId);
}
