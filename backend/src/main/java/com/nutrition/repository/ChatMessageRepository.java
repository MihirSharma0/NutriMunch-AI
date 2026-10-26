package com.nutrition.repository;

import com.nutrition.entity.ChatMessage;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {
    List<ChatMessage> findByConversationIdAndIdLessThanOrderByIdDesc(Long conversationId, Long beforeId, Pageable pageable);
    List<ChatMessage> findByConversationIdOrderByIdDesc(Long conversationId, Pageable pageable);
    Optional<ChatMessage> findByConversationIdAndSenderIdAndClientMessageId(Long conversationId, Long senderId, String clientMessageId);
    @Modifying
    @Query("update ChatMessage m set m.readAt = :readAt where m.conversation.id = :conversationId and m.sender.id <> :readerId and m.readAt is null")
    int markReadForConversationAndRecipient(@Param("conversationId") Long conversationId, @Param("readerId") Long readerId, @Param("readAt") java.time.LocalDateTime readAt);
}
