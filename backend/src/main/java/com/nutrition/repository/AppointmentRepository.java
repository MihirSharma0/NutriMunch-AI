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

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT a FROM Appointment a WHERE a.id = :id")
    Optional<Appointment> findByIdWithLock(@Param("id") Long id);
}
