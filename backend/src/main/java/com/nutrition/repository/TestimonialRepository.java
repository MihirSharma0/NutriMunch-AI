package com.nutrition.repository;

import com.nutrition.entity.Testimonial;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TestimonialRepository extends JpaRepository<Testimonial, Long> {
    List<Testimonial> findByUserId(Long userId);
    void deleteByUserId(Long userId);
    List<Testimonial> findByAuthorEmail(String authorEmail);
    List<Testimonial> findByStatusOrderByCreatedAtDesc(String status);
}
