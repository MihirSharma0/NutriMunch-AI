package com.nutrition.service;

import com.nutrition.dto.AppointmentDto;
import com.nutrition.entity.Appointment;
import com.nutrition.entity.Role;
import com.nutrition.entity.User;
import com.nutrition.repository.AppointmentRepository;
import com.nutrition.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AppointmentService {

    private final AppointmentRepository appointmentRepository;
    private final UserRepository userRepository;

    public List<AppointmentDto> getMyAppointments(Long userId, Role role) {
        List<Appointment> list;
        if (role == Role.NUTRITIONIST) {
            list = appointmentRepository.findByDietitianIdOrDietitianIsNullOrderByAppointmentTimeDesc(userId);
            if (list.isEmpty()) {
                list = appointmentRepository.findAllByOrderByAppointmentTimeDesc();
            }
        } else if (role == Role.ADMIN) {
            list = appointmentRepository.findAllByOrderByAppointmentTimeDesc();
        } else {
            list = appointmentRepository.findByUserIdOrderByAppointmentTimeDesc(userId);
        }
        return list.stream().map(this::mapToDto).collect(Collectors.toList());
    }

    public List<Map<String, Object>> getAvailableDietitians() {
        List<User> dietitians = userRepository.findByRole(Role.NUTRITIONIST);
        List<Map<String, Object>> result = new ArrayList<>();
        for (User d : dietitians) {
            Map<String, Object> map = new HashMap<>();
            map.put("id", d.getId());
            map.put("name", (d.getFirstName() != null ? d.getFirstName() : "") + " " + (d.getLastName() != null ? d.getLastName() : ""));
            map.put("email", d.getEmail());
            result.add(map);
        }
        return result;
    }

    public AppointmentDto bookAppointment(Long currentUserId, Role role, AppointmentDto dto) {
        User user = null;
        if (dto.getUserId() != null) {
            user = userRepository.findById(dto.getUserId()).orElse(null);
        }
        if (user == null) {
            user = userRepository.findById(currentUserId).orElseThrow(() -> new RuntimeException("User not found"));
        }

        User dietitian = null;
        if (dto.getDietitianId() != null) {
            dietitian = userRepository.findById(dto.getDietitianId()).orElse(null);
        } else if (role == Role.NUTRITIONIST) {
            dietitian = userRepository.findById(currentUserId).orElse(null);
        } else {
            List<User> nutritionists = userRepository.findByRole(Role.NUTRITIONIST);
            if (!nutritionists.isEmpty()) {
                dietitian = nutritionists.get(0);
            }
        }

        Appointment appointment = new Appointment();
        appointment.setUser(user);
        appointment.setDietitian(dietitian);
        appointment.setAppointmentTime(dto.getAppointmentTime() != null ? dto.getAppointmentTime() : LocalDateTime.now().plusDays(1).withHour(10).withMinute(0));
        appointment.setTitle(dto.getTitle() != null && !dto.getTitle().trim().isEmpty() ? dto.getTitle() : "Clinical Nutrition Consultation");
        appointment.setSessionType(dto.getSessionType() != null && !dto.getSessionType().trim().isEmpty() ? dto.getSessionType() : "Clinical Consultation");
        appointment.setNotes(dto.getNotes() != null ? dto.getNotes() : "");
        appointment.setStatus(dto.getStatus() != null ? dto.getStatus() : "Pending Review");
        appointment.setMeetingLink(dto.getMeetingLink() != null ? dto.getMeetingLink() : "https://meet.google.com/nutri-ai-session");

        return mapToDto(appointmentRepository.save(appointment));
    }

    public AppointmentDto updateAppointmentStatus(Long appointmentId, String status, String meetingLink, String notes) {
        Appointment apt = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new RuntimeException("Appointment not found: " + appointmentId));
        if (status != null && !status.trim().isEmpty()) {
            apt.setStatus(status);
        }
        if (meetingLink != null && !meetingLink.trim().isEmpty()) {
            apt.setMeetingLink(meetingLink);
        }
        if (notes != null) {
            apt.setNotes(notes);
        }
        return mapToDto(appointmentRepository.save(apt));
    }

    public void deleteAppointment(Long appointmentId) {
        appointmentRepository.deleteById(appointmentId);
    }

    private AppointmentDto mapToDto(Appointment apt) {
        AppointmentDto dto = new AppointmentDto();
        dto.setId(apt.getId());
        if (apt.getUser() != null) {
            dto.setUserId(apt.getUser().getId());
            dto.setUserName((apt.getUser().getFirstName() != null ? apt.getUser().getFirstName() : "") + " " + (apt.getUser().getLastName() != null ? apt.getUser().getLastName() : ""));
            dto.setUserEmail(apt.getUser().getEmail());
        }
        if (apt.getDietitian() != null) {
            dto.setDietitianId(apt.getDietitian().getId());
            dto.setDietitianName((apt.getDietitian().getFirstName() != null ? apt.getDietitian().getFirstName() : "") + " " + (apt.getDietitian().getLastName() != null ? apt.getDietitian().getLastName() : ""));
        }
        dto.setAppointmentTime(apt.getAppointmentTime());
        dto.setStatus(apt.getStatus());
        dto.setMeetingLink(apt.getMeetingLink());
        dto.setNotes(apt.getNotes());
        dto.setTitle(apt.getTitle());
        dto.setSessionType(apt.getSessionType());
        return dto;
    }
}
