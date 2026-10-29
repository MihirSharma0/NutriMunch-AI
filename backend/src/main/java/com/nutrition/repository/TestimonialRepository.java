package com.nutrition.repository;

import com.nutrition.entity.Testimonial;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Spring Data JPA Repository for Testimonial entities.
Manages client transformation reviews, ratings, and moderation states.
 */
@Repository
public interface TestimonialRepository extends JpaRepository<Testimonial, Long> {
    /**
     * Executes query to find by user id.
     */
    List<Testimonial> findByUserId(Long userId);
    /**
     * Executes query to delete by user id.
     */
    void deleteByUserId(Long userId);
    /**
     * Executes query to find by author email.
     */
    List<Testimonial> findByAuthorEmail(String authorEmail);
    /**
     * Executes query to find by status order by created at desc.
     */
    List<Testimonial> findByStatusOrderByCreatedAtDesc(String status);
}
