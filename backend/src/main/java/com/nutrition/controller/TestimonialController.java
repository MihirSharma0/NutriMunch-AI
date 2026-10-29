package com.nutrition.controller;

import com.nutrition.entity.Testimonial;
import com.nutrition.service.TestimonialService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Client Testimonial Controller.
Manages user transformation reviews, approved testimonial listings, and administrator moderation workflows.
 */
@RestController
@RequestMapping("/api/testimonials")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class TestimonialController {

    private final TestimonialService testimonialService;

    /**
     * Handles request to get all testimonials.
     */
    @GetMapping
    public ResponseEntity<List<Testimonial>> getAllTestimonials() {
        return ResponseEntity.ok(testimonialService.getAllTestimonials());
    }

    /**
     * Handles request to get approved testimonials.
     */
    @GetMapping("/approved")
    public ResponseEntity<List<Testimonial>> getApprovedTestimonials() {
        return ResponseEntity.ok(testimonialService.getApprovedTestimonials());
    }

    /**
     * Handles request to get testimonial by id.
     */
    @GetMapping("/{id}")
    public ResponseEntity<Testimonial> getTestimonialById(@PathVariable Long id) {
        return ResponseEntity.ok(testimonialService.getTestimonialById(id));
    }

    /**
     * Handles request to get testimonials by user id.
     */
    @GetMapping("/user/{userId}")
    public ResponseEntity<List<Testimonial>> getTestimonialsByUserId(@PathVariable Long userId) {
        return ResponseEntity.ok(testimonialService.getTestimonialsByUserId(userId));
    }

    /**
     * Handles request to create testimonial.
     */
    @PostMapping
    public ResponseEntity<Testimonial> createTestimonial(@RequestBody Testimonial testimonial) {
        return ResponseEntity.ok(testimonialService.createTestimonial(testimonial));
    }

    /**
     * Handles request to update testimonial.
     */
    @PutMapping("/{id}")
    public ResponseEntity<Testimonial> updateTestimonial(@PathVariable Long id, @RequestBody Testimonial testimonial) {
        return ResponseEntity.ok(testimonialService.updateTestimonial(id, testimonial));
    }

    /**
     * Handles request to delete testimonial.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTestimonial(@PathVariable Long id) {
        testimonialService.deleteTestimonial(id);
        return ResponseEntity.noContent().build();
    }
}
