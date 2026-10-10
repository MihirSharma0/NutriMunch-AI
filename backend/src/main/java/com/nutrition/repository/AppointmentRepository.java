package com.nutrition.repository;

import com.nutrition.entity.Appointment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface AppointmentRepository extends JpaRepository<Appointment, Long> {
    List<Appointment> findByUserIdOrderByAppointmentTimeDesc(Long userId);
    List<Appointment> findByDietitianIdOrderByAppointmentTimeDesc(Long dietitianId);
    List<Appointment> findByDietitianIdOrDietitianIsNullOrderByAppointmentTimeDesc(Long dietitianId);
    List<Appointment> findAllByOrderByAppointmentTimeDesc();
}
