package com.nutrition.repository;

import com.nutrition.entity.Appointment;
import org.springframework.data.jpa.repository.JpaRepository;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface AppointmentRepository extends JpaRepository<Appointment, Long> {
    List<Appointment> findByUserIdOrderByAppointmentTimeDesc(Long userId);
    List<Appointment> findByNutritionistIdOrderByAppointmentTimeDesc(Long nutritionistId);
    List<Appointment> findByNutritionistIdOrNutritionistIsNullOrderByAppointmentTimeDesc(Long nutritionistId);
    List<Appointment> findAllByOrderByAppointmentTimeDesc();
    Optional<Appointment> findFirstByUserIdOrderByAppointmentTimeDesc(Long userId);
    Optional<Appointment> findFirstByNutritionistIdAndUserIdOrderByAppointmentTimeDesc(Long nutritionistId, Long userId);
    void deleteByUserId(Long userId);
    void deleteByNutritionistId(Long nutritionistId);

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
