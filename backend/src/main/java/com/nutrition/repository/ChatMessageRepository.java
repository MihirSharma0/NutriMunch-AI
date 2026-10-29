package com.nutrition.repository;

import com.nutrition.entity.ChatMessage;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {
    List<ChatMessage> findByConversationIdAndIdLessThanOrderByIdDesc(Long conversationId, Long beforeId, Pageable pageable);
    List<ChatMessage> findByConversationIdOrderByIdDesc(Long conversationId, Pageable pageable);
    Optional<ChatMessage> findByConversationIdAndSenderIdAndClientMessageId(Long conversationId, Long senderId, String clientMessageId);
    @Modifying
    @Query("update ChatMessage m set m.readAt = :readAt where m.conversation.id = :conversationId and m.sender.id <> :readerId and m.readAt is null")
    int markReadForConversationAndRecipient(@Param("conversationId") Long conversationId, @Param("readerId") Long readerId, @Param("readAt") java.time.LocalDateTime readAt);

    /** Unread messages per conversation for one recipient, used for the per-conversation badges. */
    @Query("SELECT m.conversation.id, COUNT(m) FROM ChatMessage m " +
           "WHERE m.conversation.id IN :conversationIds " +
           "AND m.sender.id <> :userId AND m.readAt IS NULL " +
           "GROUP BY m.conversation.id")
    List<Object[]> countUnreadByConversationIds(
            @Param("conversationIds") Collection<Long> conversationIds,
            @Param("userId") Long userId);

    /** Total unread across every conversation the user takes part in, used for the navbar chat badge. */
    @Query("SELECT COUNT(m) FROM ChatMessage m " +
           "WHERE m.readAt IS NULL AND m.sender.id <> :userId " +
           "AND (m.conversation.patient.id = :userId OR m.conversation.nutritionist.id = :userId)")
    long countTotalUnreadForUser(@Param("userId") Long userId);

    @Query("SELECT COUNT(m) FROM ChatMessage m " +
           "WHERE m.readAt IS NULL AND m.sender.id <> :userId AND m.conversation.id = :conversationId")
    long countUnreadForConversation(@Param("conversationId") Long conversationId, @Param("userId") Long userId);
}
