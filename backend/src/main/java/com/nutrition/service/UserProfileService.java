package com.nutrition.service;

import com.nutrition.dto.UserProfileDto;
import com.nutrition.entity.NutritionRule;
import com.nutrition.entity.User;
import com.nutrition.entity.UserProfile;
import com.nutrition.repository.NutritionRuleRepository;
import com.nutrition.repository.UserProfileRepository;
import com.nutrition.repository.UserRepository;
import com.nutrition.entity.Role;
import java.util.List;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class UserProfileService {

    private final UserProfileRepository userProfileRepository;
    private final UserRepository userRepository;
    private final NutritionRuleRepository nutritionRuleRepository;

    public List<UserProfileDto> getAllUserProfiles() {
        List<User> users = userRepository.findByRole(Role.USER);
        return users.stream().map(u -> {
            UserProfile profile = userProfileRepository.findByUserId(u.getId()).orElseGet(() -> {
                UserProfile p = new UserProfile();
                p.setUser(u);
                return userProfileRepository.save(p);
            });
            return mapToDto(profile);
        }).collect(Collectors.toList());
    }

    public UserProfileDto getProfile(Long userId) {
        UserProfile profile = userProfileRepository.findByUserId(userId)
            .orElseGet(() -> createEmptyProfile(userId));
        return mapToDto(profile);
    }

    public UserProfileDto updateProfile(Long userId, UserProfileDto dto) {
        UserProfile profile = userProfileRepository.findByUserId(userId)
            .orElseGet(() -> createEmptyProfile(userId));

        User user = profile.getUser();
        if (dto.getFirstName() != null && !dto.getFirstName().isBlank()) {
            user.setFirstName(dto.getFirstName());
        }
        if (dto.getLastName() != null && !dto.getLastName().isBlank()) {
            user.setLastName(dto.getLastName());
        }
        userRepository.save(user);

        profile.setHeightCm(dto.getHeightCm());
        profile.setWeightKg(dto.getWeightKg());
        profile.setTargetWeightKg(dto.getTargetWeightKg());
        profile.setActivityLevel(dto.getActivityLevel());
        profile.setDietaryPreferences(dto.getDietaryPreferences());
        profile.setAllergies(dto.getAllergies());
        
        profile.setAge(dto.getAge());
        profile.setGender(dto.getGender());
        profile.setGoal(dto.getGoal());
        profile.setDietType(dto.getDietType());
        profile.setLifestyleClass(dto.getLifestyleClass());
        profile.setMealBudget(dto.getMealBudget());
        profile.setFavoriteFoods(dto.getFavoriteFoods());
        profile.setDislikedFoods(dto.getDislikedFoods());
        profile.setCuisinePreferences(dto.getCuisinePreferences());
        profile.setIsCustomTargets(dto.getIsCustomTargets());

        if (Boolean.TRUE.equals(dto.getIsCustomTargets())) {
            if (dto.getDailyCaloriesTarget() != null) profile.setDailyCaloriesTarget(dto.getDailyCaloriesTarget());
            if (dto.getProteinTarget() != null) profile.setProteinTarget(dto.getProteinTarget());
            if (dto.getCarbsTarget() != null) profile.setCarbsTarget(dto.getCarbsTarget());
            if (dto.getFatsTarget() != null) profile.setFatsTarget(dto.getFatsTarget());
            if (dto.getDailyWaterTargetLiters() != null) profile.setDailyWaterTargetLiters(dto.getDailyWaterTargetLiters());
            if (dto.getDailyFiberTargetG() != null) profile.setDailyFiberTargetG(dto.getDailyFiberTargetG());
            if (dto.getIronTargetMg() != null) profile.setIronTargetMg(dto.getIronTargetMg());
            if (dto.getCalciumTargetMg() != null) profile.setCalciumTargetMg(dto.getCalciumTargetMg());
            if (dto.getVitDTargetMcg() != null) profile.setVitDTargetMcg(dto.getVitDTargetMcg());
            if (dto.getVitB12TargetMcg() != null) profile.setVitB12TargetMcg(dto.getVitB12TargetMcg());
            if (dto.getVitCTargetMg() != null) profile.setVitCTargetMg(dto.getVitCTargetMg());
            if (dto.getZincTargetMg() != null) profile.setZincTargetMg(dto.getZincTargetMg());

            recalculateBmrTdeeOnly(profile);
        } else {
            recalculateNutritionTargets(profile);
        }

        profile = userProfileRepository.save(profile);
        return mapToDto(profile);
    }

    private UserProfile createEmptyProfile(Long userId) {
        User user = userRepository.findById(userId).orElseThrow(() -> new RuntimeException("User not found"));
        UserProfile profile = new UserProfile();
        profile.setUser(user);
        return userProfileRepository.save(profile);
    }

    private double getRuleValue(String key, double defaultValue) {
        return nutritionRuleRepository.findByRuleKey(key)
                .map(NutritionRule::getRuleValue)
                .orElse(defaultValue);
    }

    private void recalculateBmrTdeeOnly(UserProfile profile) {
        if (profile.getAge() == null || profile.getHeightCm() == null || profile.getWeightKg() == null || profile.getGender() == null) {
            return;
        }

        double bmr = 10 * profile.getWeightKg() + 6.25 * profile.getHeightCm() - 5 * profile.getAge();
        if ("Female".equalsIgnoreCase(profile.getGender())) {
            bmr -= 161;
        } else {
            bmr += 5;
        }
        profile.setBmr(bmr);

        double multiplier = getRuleValue("multiplier_sedentary", 1.2);
        if (profile.getActivityLevel() != null) {
            switch (profile.getActivityLevel()) {
                case "Lightly Active": multiplier = getRuleValue("multiplier_lightly_active", 1.375); break;
                case "Moderately Active": multiplier = getRuleValue("multiplier_moderately_active", 1.55); break;
                case "Very Active": multiplier = getRuleValue("multiplier_very_active", 1.725); break;
                case "Highly Active-Athlete": multiplier = getRuleValue("multiplier_highly_active", 1.9); break;
            }
        }
        profile.setTdee(bmr * multiplier);
    }

    private void recalculateNutritionTargets(UserProfile profile) {
        if (profile.getAge() == null || profile.getHeightCm() == null || profile.getWeightKg() == null || profile.getGender() == null) {
            return;
        }

        // BMR Calculation (Mifflin-St Jeor)
        double bmr = 10 * profile.getWeightKg() + 6.25 * profile.getHeightCm() - 5 * profile.getAge();
        if ("Female".equalsIgnoreCase(profile.getGender())) {
            bmr -= 161;
        } else {
            bmr += 5;
        }
        profile.setBmr(bmr);

        // Activity Multiplier
        double multiplier = getRuleValue("multiplier_sedentary", 1.2);
        if (profile.getActivityLevel() != null) {
            switch (profile.getActivityLevel()) {
                case "Lightly Active": multiplier = getRuleValue("multiplier_lightly_active", 1.375); break;
                case "Moderately Active": multiplier = getRuleValue("multiplier_moderately_active", 1.55); break;
                case "Very Active": multiplier = getRuleValue("multiplier_very_active", 1.725); break;
                case "Highly Active-Athlete": multiplier = getRuleValue("multiplier_highly_active", 1.9); break;
            }
        }
        double tdee = bmr * multiplier;
        profile.setTdee(tdee);

        // Calorie Goal Adjustments
        int calories = (int) tdee;
        if (profile.getGoal() != null) {
            switch (profile.getGoal()) {
                case "Weight Loss": calories += getRuleValue("goal_weight_loss_adj", -500); break;
                case "Muscle Gain": calories += getRuleValue("goal_muscle_gain_adj", 500); break;
                case "Strength-Performance": calories += getRuleValue("goal_strength_adj", 300); break;
                case "Weight Maintenance": calories += getRuleValue("goal_maintenance_adj", 0); break;
            }
        }
        profile.setDailyCaloriesTarget(calories);

        // Macro Targets based on goals
        double proteinPct = getRuleValue("macro_protein_pct_default", 0.30);
        double carbsPct = getRuleValue("macro_carbs_pct_default", 0.40);
        double fatsPct = getRuleValue("macro_fats_pct_default", 0.30);

        if ("Muscle Gain".equals(profile.getGoal()) || "Strength-Performance".equals(profile.getGoal())) {
            proteinPct = getRuleValue("macro_protein_pct_muscle", 0.35);
            carbsPct = getRuleValue("macro_carbs_pct_muscle", 0.45);
            fatsPct = getRuleValue("macro_fats_pct_muscle", 0.20);
        }

        profile.setProteinTarget((int) ((calories * proteinPct) / 4));
        profile.setCarbsTarget((int) ((calories * carbsPct) / 4));
        profile.setFatsTarget((int) ((calories * fatsPct) / 9));

        // Water and Fiber
        double waterMultiplier = getRuleValue("water_multiplier_liters_per_kg", 0.033);
        profile.setDailyWaterTargetLiters(profile.getWeightKg() * waterMultiplier);
        
        double fiberMultiplier = getRuleValue("fiber_grams_per_1000_kcal", 14.0);
        profile.setDailyFiberTargetG((int) ((calories / 1000.0) * fiberMultiplier));

        // Basic Micronutrient RDAs (simplified estimation logic)
        boolean isFemale = "Female".equalsIgnoreCase(profile.getGender());
        profile.setIronTargetMg(isFemale && profile.getAge() <= 50 ? 18.0 : 8.0);
        profile.setCalciumTargetMg(1000.0);
        profile.setVitDTargetMcg(15.0);
        profile.setVitB12TargetMcg(2.4);
        profile.setVitCTargetMg(isFemale ? 75.0 : 90.0);
        profile.setMagnesiumTargetMg(isFemale ? 310.0 : 400.0);
        profile.setPotassiumTargetMg(3400.0);
        profile.setZincTargetMg(isFemale ? 8.0 : 11.0);
    }

    private UserProfileDto mapToDto(UserProfile profile) {
        UserProfileDto dto = new UserProfileDto();
        dto.setId(profile.getId());
        dto.setUserId(profile.getUser().getId());
        dto.setEmail(profile.getUser().getEmail());
        dto.setHeightCm(profile.getHeightCm());
        dto.setWeightKg(profile.getWeightKg());
        dto.setTargetWeightKg(profile.getTargetWeightKg());
        dto.setActivityLevel(profile.getActivityLevel());
        dto.setDietaryPreferences(profile.getDietaryPreferences());
        dto.setAllergies(profile.getAllergies());
        
        dto.setAge(profile.getAge());
        dto.setGender(profile.getGender());
        dto.setGoal(profile.getGoal());
        dto.setDietType(profile.getDietType());
        dto.setLifestyleClass(profile.getLifestyleClass());
        dto.setMealBudget(profile.getMealBudget());
        dto.setFirstName(profile.getUser().getFirstName());
        dto.setLastName(profile.getUser().getLastName());
        dto.setFavoriteFoods(profile.getFavoriteFoods());
        dto.setDislikedFoods(profile.getDislikedFoods());
        dto.setCuisinePreferences(profile.getCuisinePreferences());
        dto.setIsCustomTargets(profile.getIsCustomTargets());

        dto.setBmr(profile.getBmr());
        dto.setTdee(profile.getTdee());
        dto.setDailyCaloriesTarget(profile.getDailyCaloriesTarget());
        dto.setProteinTarget(profile.getProteinTarget());
        dto.setCarbsTarget(profile.getCarbsTarget());
        dto.setFatsTarget(profile.getFatsTarget());
        
        dto.setDailyWaterTargetLiters(profile.getDailyWaterTargetLiters());
        dto.setDailyFiberTargetG(profile.getDailyFiberTargetG());
        dto.setIronTargetMg(profile.getIronTargetMg());
        dto.setCalciumTargetMg(profile.getCalciumTargetMg());
        dto.setVitDTargetMcg(profile.getVitDTargetMcg());
        dto.setVitB12TargetMcg(profile.getVitB12TargetMcg());
        dto.setVitCTargetMg(profile.getVitCTargetMg());
        dto.setMagnesiumTargetMg(profile.getMagnesiumTargetMg());
        dto.setPotassiumTargetMg(profile.getPotassiumTargetMg());
        dto.setZincTargetMg(profile.getZincTargetMg());

        dto.setUpdatedAt(profile.getUpdatedAt());
        return dto;
    }
}
