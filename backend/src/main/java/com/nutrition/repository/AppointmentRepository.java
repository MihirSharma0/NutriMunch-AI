package com.nutrition.repository;

import com.nutrition.entity.Appointment;
import org.springframework.data.jpa.repository.JpaRepository;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

/**
 * Spring Data JPA Repository for Appointment entities.
Manages telehealth consultation scheduling, nutritionist bookings, status queries, and pessimistic locking.
 */
public interface AppointmentRepository extends JpaRepository<Appointment, Long> {
    /**
     * Executes query to find by user id order by appointment time desc.
     */
    List<Appointment> findByUserIdOrderByAppointmentTimeDesc(Long userId);
    /**
     * Executes query to find by nutritionist id order by appointment time desc.
     */
    List<Appointment> findByNutritionistIdOrderByAppointmentTimeDesc(Long nutritionistId);
    /**
     * Executes query to find by nutritionist id or nutritionist is null order by appointment time desc.
     */
    List<Appointment> findByNutritionistIdOrNutritionistIsNullOrderByAppointmentTimeDesc(Long nutritionistId);
    /**
     * Executes query to find all by order by appointment time desc.
     */
    List<Appointment> findAllByOrderByAppointmentTimeDesc();
    /**
     * Executes query to find first by user id order by appointment time desc.
     */
    Optional<Appointment> findFirstByUserIdOrderByAppointmentTimeDesc(Long userId);
    /**
     * Executes query to find first by nutritionist id and user id order by appointment time desc.
     */
    Optional<Appointment> findFirstByNutritionistIdAndUserIdOrderByAppointmentTimeDesc(Long nutritionistId, Long userId);
    /**
     * Executes query to delete by user id.
     */
    void deleteByUserId(Long userId);
    /**
     * Executes query to delete by nutritionist id.
     */
    void deleteByNutritionistId(Long nutritionistId);

    /**
     * Executes query to find by id with lock.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT a FROM Appointment a WHERE a.id = :id")
    Optional<Appointment> findByIdWithLock(@Param("id") Long id);

    /**
     * Patients this nutritionist actually holds an accepted consultation with.
     * Used to build the "my patients" picker, replacing the old endpoint that
     * exposed every user in the system to every nutritionist.
     */
    @Query("SELECT DISTINCT a.user FROM Appointment a " +
           "WHERE a.nutritionist.id = :nutritionistId AND a.user IS NOT NULL " +
           "AND UPPER(a.status) IN :statuses " +
           "ORDER BY a.user.firstName ASC, a.user.lastName ASC")
    List<com.nutrition.entity.User> findAcceptedPatients(
            @Param("nutritionistId") Long nutritionistId,
            @Param("statuses") java.util.Collection<String> statuses);
}
