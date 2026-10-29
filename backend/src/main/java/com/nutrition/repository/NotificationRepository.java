package com.nutrition.repository;

import com.nutrition.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {
    List<Notification> findByUserIdOrderByCreatedAtDesc(Long userId);
    List<Notification> findByUserIdOrUserIsNullOrderByCreatedAtDesc(Long userId);
    void deleteByUserIdOrSenderId(Long userId, Long senderId);

    long countByUser_IdAndReadStatusFalse(Long userId);

    /** The single aggregated unread chat notification for one conversation, if any. */
    Optional<Notification> findFirstByUser_IdAndConversationIdAndTypeAndReadStatusFalseOrderByIdDesc(
            Long userId, Long conversationId, String type);

    @Modifying
    @Query("update Notification n set n.readStatus = true " +
           "where n.user.id = :userId and n.conversationId = :conversationId and n.readStatus = false")
    int markConversationNotificationsRead(@Param("userId") Long userId, @Param("conversationId") Long conversationId);

    @Modifying
    @Query("update Notification n set n.readStatus = true where n.user.id = :userId and n.readStatus = false")
    int markAllRead(@Param("userId") Long userId);
}
