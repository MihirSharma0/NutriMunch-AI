package com.nutrition.controller;

import com.nutrition.service.AiService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AiController {

    private final AiService aiService;

    @PostMapping("/diet-plan")
    public ResponseEntity<Map<String, String>> generateDietPlan(@RequestBody Map<String, Object> request) {
        // Accept both legacy plain-string and new tag-list payloads
        String goals = resolveStringOrList(request.get("goals"));
        String allergies = resolveStringOrList(request.get("allergies"));
        String plan = aiService.generateDietPlan(goals, allergies);
        return ResponseEntity.ok(Map.of("plan", plan));
    }

    /**
     * Validates a single custom user-typed value (health goal or dietary
     * restriction) via AI.
     */
    @PostMapping("/validate-custom-input")
    public ResponseEntity<Map<String, Object>> validateCustomInput(@RequestBody Map<String, String> request) {
        String value = request.get("value");
        String category = request.get("category"); // "goal" or "restriction"
        Map<String, Object> result = aiService.validateCustomInput(value, category);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/chat")
    public ResponseEntity<Map<String, String>> chat(@RequestBody Map<String, String> request) {
        String response = aiService.chat(request.get("message"));
        return ResponseEntity.ok(Map.of("response", response));
    }

    @PostMapping("/analyze-image")
    public ResponseEntity<Map<String, String>> analyzeImage(@RequestBody Map<String, String> request) {
        String analysis = aiService.analyzeFoodImage(request.get("imageUrl"));
        return ResponseEntity.ok(Map.of("analysis", analysis));
    }

    @PostMapping("/analyze-food")
    public ResponseEntity<com.nutrition.dto.FoodAnalysisResponseDto> analyzeFood(
            @RequestBody com.nutrition.dto.FoodAnalysisRequestDto request,
            @org.springframework.security.core.annotation.AuthenticationPrincipal com.nutrition.security.CustomUserDetails userDetails) {
        String email = userDetails != null ? userDetails.getUsername() : null;
        com.nutrition.dto.FoodAnalysisResponseDto response = aiService.analyzeFood(request, email);
        return ResponseEntity.ok(response);
    }

    @SuppressWarnings("unchecked")
    private String resolveStringOrList(Object value) {
        if (value == null)
            return "";
        if (value instanceof String)
            return (String) value;
        if (value instanceof List)
            return String.join(", ", (List<String>) value);
        return value.toString();
    }
}
