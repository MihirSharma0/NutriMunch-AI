package com.nutrition.service;

import com.nutrition.entity.Testimonial;
import com.nutrition.repository.TestimonialRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Client Testimonial Moderation Service.
Manages user transformation reviews, ratings, approval workflows, and public listings.
 */
@Service
@RequiredArgsConstructor
public class TestimonialService {

    private final TestimonialRepository testimonialRepository;

    /**
     * Executes get all testimonials operation.
     */
    public List<Testimonial> getAllTestimonials() {
        return testimonialRepository.findAll();
    }

    /**
     * Executes get approved testimonials operation.
     */
    public List<Testimonial> getApprovedTestimonials() {
        return testimonialRepository.findByStatusOrderByCreatedAtDesc("APPROVED");
    }

    /**
     * Executes get testimonials by user id operation.
     */
    public List<Testimonial> getTestimonialsByUserId(Long userId) {
        return testimonialRepository.findByUserId(userId);
    }

    /**
     * Executes get testimonials by email operation.
     */
    public List<Testimonial> getTestimonialsByEmail(String email) {
        return testimonialRepository.findByAuthorEmail(email);
    }

    /**
     * Executes get testimonial by id operation.
     */
    public Testimonial getTestimonialById(Long id) {
        return testimonialRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Testimonial not found with id: " + id));
    }

    /**
     * Executes create testimonial operation.
     */
    public Testimonial createTestimonial(Testimonial testimonial) {
        if (testimonial.getRating() == null || testimonial.getRating() < 1) {
            testimonial.setRating(5);
        }
        if (testimonial.getStatus() == null) {
            testimonial.setStatus("APPROVED");
        }
        return testimonialRepository.save(testimonial);
    }

    /**
     * Executes update testimonial operation.
     */
    public Testimonial updateTestimonial(Long id, Testimonial updated) {
        Testimonial existing = getTestimonialById(id);
        if (updated.getAuthorName() != null) existing.setAuthorName(updated.getAuthorName());
        if (updated.getAuthorRole() != null) existing.setAuthorRole(updated.getAuthorRole());
        if (updated.getRating() != null) existing.setRating(updated.getRating());
        if (updated.getProgramResult() != null) existing.setProgramResult(updated.getProgramResult());
        if (updated.getContent() != null) existing.setContent(updated.getContent());
        if (updated.getAvatarUrl() != null) existing.setAvatarUrl(updated.getAvatarUrl());
        if (updated.getStatus() != null) existing.setStatus(updated.getStatus());
        return testimonialRepository.save(existing);
    }

    /**
     * Executes delete testimonial operation.
     */
    public void deleteTestimonial(Long id) {
        testimonialRepository.deleteById(id);
    }
}
