package com.nutrition.repository;

import com.nutrition.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Spring Data JPA Repository for Notification entities.
Handles in-app notification dispatch, unread counters, and conversation alert aggregation.
 */
@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {
    /**
     * Executes query to find by user id order by created at desc.
     */
    List<Notification> findByUserIdOrderByCreatedAtDesc(Long userId);
    /**
     * Executes query to find by user id or user is null order by created at desc.
     */
    List<Notification> findByUserIdOrUserIsNullOrderByCreatedAtDesc(Long userId);
    /**
     * Executes query to delete by user id or sender id.
     */
    void deleteByUserIdOrSenderId(Long userId, Long senderId);

    /**
     * Executes query to count by user id and read status false.
     */
    long countByUser_IdAndReadStatusFalse(Long userId);

    /** The single aggregated unread chat notification for one conversation, if any. */
    Optional<Notification> findFirstByUser_IdAndConversationIdAndTypeAndReadStatusFalseOrderByIdDesc(
            Long userId, Long conversationId, String type);

    @Modifying
    @Query("update Notification n set n.readStatus = true " +
           "where n.user.id = :userId and n.conversationId = :conversationId and n.readStatus = false")
    /**
     * Executes query to mark conversation notifications read.
     */
    int markConversationNotificationsRead(@Param("userId") Long userId, @Param("conversationId") Long conversationId);

    /**
     * Executes query to mark all read.
     */
    @Modifying
    @Query("update Notification n set n.readStatus = true where n.user.id = :userId and n.readStatus = false")
    int markAllRead(@Param("userId") Long userId);
}
