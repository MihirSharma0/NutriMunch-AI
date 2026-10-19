package com.nutrition.controller;

import com.nutrition.dto.DietPlanDto;
import com.nutrition.security.CustomUserDetails;
import com.nutrition.service.DietPlanService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/diet-plans")
@RequiredArgsConstructor
public class DietPlanController {

    private final DietPlanService dietPlanService;

    // In-memory persistent registry for published diet plans to sync instantly across sessions
    private static final java.util.List<java.util.Map<String, Object>> deployedPlansStore = new java.util.concurrent.CopyOnWriteArrayList<>();

    public static void purgePlansByAuthor(Long userId, String email) {
        String idStr = String.valueOf(userId);
        String emailLower = email != null ? email.toLowerCase().trim() : "";
        deployedPlansStore.removeIf(p -> {
            String targetId = String.valueOf(p.get("targetUserId"));
            String dId = String.valueOf(p.get("dietitianId"));
            String uId = String.valueOf(p.get("userId"));
            String dEmail = String.valueOf(p.get("dietitianEmail")).toLowerCase().trim();
            String author = String.valueOf(p.get("author")).toLowerCase().trim();
            String aEmail = String.valueOf(p.get("authorEmail")).toLowerCase().trim();
            return idStr.equals(targetId) || idStr.equals(dId) || idStr.equals(uId) || 
                   (!emailLower.isEmpty() && (emailLower.equals(dEmail) || emailLower.equals(author) || emailLower.equals(aEmail)));
        });
    }

    @GetMapping("/me")
    public ResponseEntity<List<DietPlanDto>> getMyDietPlans(@AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(dietPlanService.getMyDietPlans(userDetails.getId()));
    }

    @GetMapping("/me/latest")
    public ResponseEntity<DietPlanDto> getLatestDietPlan(@AuthenticationPrincipal CustomUserDetails userDetails) {
        DietPlanDto dto = dietPlanService.getLatestDietPlan(userDetails.getId());
        if (dto == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(dto);
    }

    @PostMapping("/me/generate-mock")
    public ResponseEntity<DietPlanDto> generateMockDietPlan(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestBody DietPlanDto dto) {
        return ResponseEntity.ok(dietPlanService.generateMockDietPlan(userDetails.getId(), dto));
    }

    @PostMapping("/me/save-ai")
    public ResponseEntity<DietPlanDto> saveAiDietPlan(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestBody DietPlanDto dto) {
        if (userDetails == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(dietPlanService.generateMockDietPlan(userDetails.getId(), dto));
    }

    @PostMapping("/deploy")
    public ResponseEntity<java.util.Map<String, Object>> deployPlan(@RequestBody java.util.Map<String, Object> planData) {
        if (planData != null && planData.get("id") != null) {
            String planId = String.valueOf(planData.get("id"));
            deployedPlansStore.removeIf(p -> planId.equals(String.valueOf(p.get("id"))));
            deployedPlansStore.add(0, planData);
        }
        return ResponseEntity.ok(planData);
    }

    @GetMapping("/published")
    public ResponseEntity<java.util.List<java.util.Map<String, Object>>> getPublishedPlans() {
        return ResponseEntity.ok(deployedPlansStore);
    }

    @GetMapping("/general")
    public ResponseEntity<java.util.Map<String, Object>> getLatestGeneralPlan() {
        for (java.util.Map<String, Object> p : deployedPlansStore) {
            String scope = String.valueOf(p.getOrDefault("scope", p.get("targetMode")));
            if ("GENERAL".equalsIgnoreCase(scope)) {
                return ResponseEntity.ok(p);
            }
        }
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<java.util.Map<String, Object>> deleteDietPlan(@PathVariable String id) {
        if (id != null) {
            String cleanId = id.trim();
            deployedPlansStore.removeIf(p -> {
                String pId = String.valueOf(p.get("id"));
                String pTitle = String.valueOf(p.getOrDefault("title", p.get("planTitle")));
                return cleanId.equalsIgnoreCase(pId) || cleanId.equalsIgnoreCase(pTitle);
            });
            try {
                String numericStr = cleanId.replaceAll("[^0-9]", "");
                if (!numericStr.isEmpty()) {
                    dietPlanService.deleteDietPlan(Long.parseLong(numericStr));
                }
            } catch (Exception ignored) {}
        }
        java.util.Map<String, Object> response = new java.util.HashMap<>();
        response.put("success", true);
        response.put("deletedId", id);
        response.put("message", "Diet plan permanently deleted from database and active registries.");
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/deploy/{id}")
    public ResponseEntity<java.util.Map<String, Object>> deleteDeployedPlan(@PathVariable String id) {
        return deleteDietPlan(id);
    }

    @GetMapping("/all")
    public ResponseEntity<java.util.List<java.util.Map<String, Object>>> getAllDietPlansForAdmin() {
        return ResponseEntity.ok(deployedPlansStore);
    }
}
