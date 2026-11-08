package com.nutrition.controller;

import com.nutrition.entity.Role;
import com.nutrition.entity.Testimonial;
import com.nutrition.security.CustomUserDetails;
import com.nutrition.service.TestimonialService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Objects;

/**
 * Client Testimonial Controller.
 *
 * Public visitors may read the approved list. Creating a testimonial requires a
 * signed-in account; the server owns the status and the author id, so a request
 * body can neither approve itself nor pretend to be somebody else. Editing and
 * deleting are limited to the author (or an administrator), and only an
 * administrator may change the visibility status.
 */
@RestController
@RequestMapping("/api/testimonials")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class TestimonialController {

    private final TestimonialService testimonialService;

    /** All statuses — moderation view, ADMIN only. */
    @GetMapping
    public ResponseEntity<List<Testimonial>> getAllTestimonials(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        requireAdmin(userDetails);
        return ResponseEntity.ok(testimonialService.getAllTestimonials());
    }

    /** Public marketing page. */
    @GetMapping("/approved")
    public ResponseEntity<List<Testimonial>> getApprovedTestimonials() {
        return ResponseEntity.ok(testimonialService.getApprovedTestimonials());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Testimonial> getTestimonialById(@PathVariable Long id) {
        return ResponseEntity.ok(testimonialService.getTestimonialById(id));
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<Testimonial>> getTestimonialsByUserId(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long userId) {
        if (!isAdmin(userDetails) && !Objects.equals(userId, requireSignedIn(userDetails))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not your testimonial list");
        }
        return ResponseEntity.ok(testimonialService.getTestimonialsByUserId(userId));
    }

    @PostMapping
    public ResponseEntity<Testimonial> createTestimonial(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestBody Testimonial testimonial) {
        Long callerId = requireSignedIn(userDetails);
        testimonial.setId(null);
        testimonial.setUserId(callerId);
        testimonial.setStatus("APPROVED");
        return ResponseEntity.ok(testimonialService.createTestimonial(testimonial));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Testimonial> updateTestimonial(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id,
            @RequestBody Testimonial testimonial) {
        requireOwnerOrAdmin(userDetails, id);
        if (!isAdmin(userDetails)) {
            // Only administrators may change visibility; a user cannot un-hide
            // a testimonial an admin has hidden.
            testimonial.setStatus(null);
        }
        return ResponseEntity.ok(testimonialService.updateTestimonial(id, testimonial));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTestimonial(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id) {
        requireOwnerOrAdmin(userDetails, id);
        testimonialService.deleteTestimonial(id);
        return ResponseEntity.noContent().build();
    }

    private void requireOwnerOrAdmin(CustomUserDetails userDetails, Long id) {
        Long callerId = requireSignedIn(userDetails);
        if (isAdmin(userDetails)) return;
        Testimonial existing;
        try {
            existing = testimonialService.getTestimonialById(id);
        } catch (RuntimeException e) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Testimonial not found");
        }
        if (!Objects.equals(existing.getUserId(), callerId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not your testimonial");
        }
    }

    private Long requireSignedIn(CustomUserDetails userDetails) {
        if (userDetails == null || userDetails.getId() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sign in required");
        }
        return userDetails.getId();
    }

    private void requireAdmin(CustomUserDetails userDetails) {
        if (!isAdmin(userDetails)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin access required");
        }
    }

    private boolean isAdmin(CustomUserDetails userDetails) {
        return userDetails != null && userDetails.getRole() == Role.ADMIN;
    }
}
