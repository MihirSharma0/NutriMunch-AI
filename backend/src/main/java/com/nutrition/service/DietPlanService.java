package com.nutrition.service;

import com.nutrition.dto.DietPlanDto;
import com.nutrition.entity.DietPlan;
import com.nutrition.entity.User;
import com.nutrition.repository.DietPlanRepository;
import com.nutrition.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DietPlanService {

    private final DietPlanRepository dietPlanRepository;
    private final UserRepository userRepository;

    public List<DietPlanDto> getMyDietPlans(Long userId) {
        return dietPlanRepository.findByUserIdOrderByGeneratedDateDesc(userId)
            .stream()
            .map(this::mapToDto)
            .collect(Collectors.toList());
    }

    public DietPlanDto getLatestDietPlan(Long userId) {
        return dietPlanRepository.findFirstByUserIdOrderByGeneratedDateDesc(userId)
            .map(this::mapToDto)
            .orElse(null);
    }

    public DietPlanDto generateMockDietPlan(Long userId, DietPlanDto request) {
        User user = userRepository.findById(userId).orElseThrow();
        DietPlan plan = new DietPlan();
        plan.setUser(user);
        plan.setGeneratedDate(request.getGeneratedDate() != null ? request.getGeneratedDate() : LocalDate.now());
        plan.setTotalCalories(request.getTotalCalories() != null ? request.getTotalCalories() : 2000);
        plan.setProteinG(request.getProteinG() != null ? request.getProteinG() : 150);
        plan.setCarbsG(request.getCarbsG() != null ? request.getCarbsG() : 200);
        plan.setFatG(request.getFatG() != null ? request.getFatG() : 65);
        plan.setWaterTargetLiters(request.getWaterTargetLiters() != null ? request.getWaterTargetLiters() : 2.5);
        plan.setMealsJson(request.getMealsJson());

        return mapToDto(dietPlanRepository.save(plan));
    }

    public void deleteDietPlan(Long id) {
        if (id != null && dietPlanRepository.existsById(id)) {
            dietPlanRepository.deleteById(id);
        }
    }

    public List<DietPlanDto> getAllDietPlans() {
        return dietPlanRepository.findAll()
            .stream()
            .map(this::mapToDto)
            .collect(Collectors.toList());
    }

    private DietPlanDto mapToDto(DietPlan plan) {
        DietPlanDto dto = new DietPlanDto();
        dto.setId(plan.getId());
        dto.setUserId(plan.getUser().getId());
        dto.setGeneratedDate(plan.getGeneratedDate());
        dto.setTotalCalories(plan.getTotalCalories());
        dto.setProteinG(plan.getProteinG());
        dto.setCarbsG(plan.getCarbsG());
        dto.setFatG(plan.getFatG());
        dto.setWaterTargetLiters(plan.getWaterTargetLiters());
        dto.setMealsJson(plan.getMealsJson());
        return dto;
    }
}
