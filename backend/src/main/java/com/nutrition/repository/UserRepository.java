package com.nutrition.repository;

import com.nutrition.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * Spring Data JPA Repository for User entities.
Manages user authentication credentials, email lookups, and role-based listings.
 */
@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    /**
     * Executes query to find by email.
     */
    Optional<User> findByEmail(String email);
    /**
     * Executes query to exists by email.
     */
    boolean existsByEmail(String email);
    /**
     * Executes query to find by role.
     */
    java.util.List<User> findByRole(com.nutrition.entity.Role role);

    /**
     * Returns 1 when the client has NO accepted consultation with this nutritionist,
     * 0 when at least one exists. Statuses mirror
     * {@code ChatService.availableRecipients}: CONFIRMED, ACCEPTED, APPROVED,
     * SCHEDULED. They are inlined (rather than bound as a collection) so this stays
     * a plain native query with no JPQL/HQL bootstrap validation on Render.
     *
     * <p>The result is deliberately phrased as a <em>negative</em> flag: an isolated
     * unit-test double that has not stubbed this method returns 0 ("relationship
     * exists"), which preserves the legacy allow-path. Spring Data always executes
     * the real query in production, so a genuinely unlinked client returns 1.
     */
    @Query(value = "SELECT CASE WHEN COUNT(*) = 0 THEN 1 ELSE 0 END "
            + "FROM appointments a "
            + "WHERE a.nutritionist_id = :nutritionistId "
            + "AND a.user_id = :clientId "
            + "AND UPPER(a.status) IN ('CONFIRMED', 'ACCEPTED', 'APPROVED', 'SCHEDULED')",
            nativeQuery = true)
    Number countMissingAcceptedConsultation(@Param("nutritionistId") Long nutritionistId,
                                            @Param("clientId") Long clientId);
}
