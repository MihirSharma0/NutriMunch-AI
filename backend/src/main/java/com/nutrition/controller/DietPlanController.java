package com.nutrition.controller;

import com.nutrition.dto.DietPlanDto;
import com.nutrition.entity.Role;
import com.nutrition.security.CustomUserDetails;
import com.nutrition.service.DietPlanService;
import com.nutrition.service.NutritionistDietPlanService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Diet Plan Management Controller.
 *
 * Two distinct stores: the user's own personal/AI plans (DietPlanService, keyed by
 * the signed-in user) and nutritionist-published plans (NutritionistDietPlanService),
 * whose visibility, ownership and deletion are enforced on the server.
 */
@RestController
@RequestMapping("/api/diet-plans")
@RequiredArgsConstructor
public class DietPlanController {

    private final DietPlanService dietPlanService;
    private final NutritionistDietPlanService nutritionistDietPlanService;

    /**
     * Retained for the admin user-deletion flow. Published plans now live in the
     * database with an ON DELETE CASCADE author foreign key, so there is no
     * in-memory registry left to purge.
     */
    public static void purgePlansByAuthor(Long userId, String email) {
        // No-op: ownership is enforced by fk_ndp_nutritionist.
    }

    /**
     * Handles request to get my diet plans.
     */
    @GetMapping("/me")
    public ResponseEntity<List<DietPlanDto>> getMyDietPlans(@AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(dietPlanService.getMyDietPlans(userDetails.getId()));
    }

    /**
     * Handles request to get latest diet plan.
     */
    @GetMapping("/me/latest")
    public ResponseEntity<DietPlanDto> getLatestDietPlan(@AuthenticationPrincipal CustomUserDetails userDetails) {
        DietPlanDto dto = dietPlanService.getLatestDietPlan(userDetails.getId());
        if (dto == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(dto);
    }

    /**
     * Handles request to generate mock diet plan.
     */
    @PostMapping("/me/generate-mock")
    public ResponseEntity<DietPlanDto> generateMockDietPlan(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestBody DietPlanDto dto) {
        return ResponseEntity.ok(dietPlanService.generateMockDietPlan(userDetails.getId(), dto));
    }

    /**
     * Handles request to save ai diet plan.
     */
    @PostMapping("/me/save-ai")
    public ResponseEntity<DietPlanDto> saveAiDietPlan(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestBody DietPlanDto dto) {
        if (userDetails == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(dietPlanService.generateMockDietPlan(userDetails.getId(), dto));
    }

    /**
     * Publish or replace a nutritionist-created plan. Author, scope and target are
     * validated server-side; the request body cannot choose the author.
     */
    @PostMapping("/deploy")
    public ResponseEntity<Map<String, Object>> deployPlan(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestBody Map<String, Object> planData) {
        if (userDetails == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(nutritionistDietPlanService.deploy(
                userDetails.getId(), userDetails.getRole(), planData));
    }

    /**
     * Role-aware published list: clients see general plans + their own exclusive
     * plans, nutritionists see only plans they created, admins see everything.
     */
    @GetMapping("/published")
    public ResponseEntity<List<Map<String, Object>>> getPublishedPlans(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(nutritionistDietPlanService.visiblePlans(
                userDetails.getId(), userDetails.getRole()));
    }

    /** First general plan for a client. No longer public and never served to nutritionists. */
    @GetMapping("/general")
    public ResponseEntity<Map<String, Object>> getLatestGeneralPlan(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(401).build();
        }
        if (userDetails.getRole() != Role.USER) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Only client accounts can browse general diet plans");
        }
        Map<String, Object> plan = nutritionistDietPlanService.latestGeneral(
                userDetails.getId(), userDetails.getRole());
        return plan == null ? ResponseEntity.noContent().build() : ResponseEntity.ok(plan);
    }

    /**
     * Delete a published plan (author/admin only) or one of the caller's own
     * personal/AI plans. Imported targets and progress history are never touched.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> deleteDietPlan(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable String id) {
        if (userDetails == null) {
            return ResponseEntity.status(401).build();
        }
        String cleanId = id == null ? "" : id.trim();

        boolean removedPublished = nutritionistDietPlanService.deletePublished(
                cleanId, userDetails.getId(), userDetails.getRole());

        if (!removedPublished) {
            // Legacy personal/AI plan: numeric id, caller must own it.
            // Only personal/AI-plan identifiers carry a numeric DB id; published
            // plan keys (plan_<timestamp>) must never be mined for digits.
            boolean legacyId = cleanId.matches("\\d+") || cleanId.startsWith("saved-ai-");
            String numericStr = legacyId ? cleanId.replaceAll("[^0-9]", "") : "";
            if (!numericStr.isEmpty()) {
                try {
                    dietPlanService.deleteOwnedDietPlan(Long.parseLong(numericStr), userDetails.getId());
                } catch (NumberFormatException ignored) {
                    // Non-numeric plan identifiers simply have no legacy row to remove.
                }
            }
        }

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("deletedId", id);
        response.put("message", "Diet plan removed from the published registry.");
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/deploy/{id}")
    public ResponseEntity<Map<String, Object>> deleteDeployedPlan(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable String id) {
        return deleteDietPlan(userDetails, id);
    }

    /**
     * Handles request to get all diet plans for admin.
     */
    @GetMapping("/all")
    public ResponseEntity<List<DietPlanDto>> getAllDietPlansForAdmin(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(401).build();
        }
        if (userDetails.getRole() != Role.ADMIN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin access required");
        }
        return ResponseEntity.ok(dietPlanService.getAllDietPlans());
    }
}
