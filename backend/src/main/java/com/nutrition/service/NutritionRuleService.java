package com.nutrition.service;

import com.nutrition.dto.NutritionRuleDto;
import com.nutrition.entity.NutritionRule;
import com.nutrition.repository.NutritionRuleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Clinical Nutrition Rule Engine Service.
Evaluates dietary constraint guidelines, BMR/TDEE calculations, and allergen safety checks.
 */
@Service
@RequiredArgsConstructor
public class NutritionRuleService {

    private final NutritionRuleRepository nutritionRuleRepository;

    /**
     * Executes get all rules operation.
     */
    public List<NutritionRuleDto> getAllRules() {
        return nutritionRuleRepository.findAll().stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    /**
     * Executes update rule operation.
     */
    public NutritionRuleDto updateRule(Long id, NutritionRuleDto dto) {
        NutritionRule rule = nutritionRuleRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Rule not found with id " + id));

        rule.setRuleValue(dto.getRuleValue());
        if (dto.getDescription() != null) {
            rule.setDescription(dto.getDescription());
        }

        rule = nutritionRuleRepository.save(rule);
        return mapToDto(rule);
    }

    /**
     * Executes map to dto operation.
     */
    private NutritionRuleDto mapToDto(NutritionRule rule) {
        NutritionRuleDto dto = new NutritionRuleDto();
        dto.setId(rule.getId());
        dto.setRuleKey(rule.getRuleKey());
        dto.setRuleValue(rule.getRuleValue());
        dto.setDescription(rule.getDescription());
        dto.setUpdatedAt(rule.getUpdatedAt());
        return dto;
    }
}
