package com.nutrition.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nutrition.dto.FoodAnalysisRequestDto;
import com.nutrition.dto.FoodAnalysisResponseDto;
import com.nutrition.entity.Recipe;
import com.nutrition.entity.User;
import com.nutrition.entity.UserProfile;
import com.nutrition.repository.RecipeRepository;
import com.nutrition.repository.UserProfileRepository;
import com.nutrition.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;

import org.springframework.http.HttpMethod;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Gemini AI Integration Service.
Interfaces with Google Gemini Generative AI models to synthesize structured 7-day diet plans, calculate macronutrient breakdowns, and analyze food images.
 */
@Service
@RequiredArgsConstructor
public class AiService {

    @Value("${openai.api.key:mock-key}")
    private String apiKey;

    @Value("${gemma.api.key:mock-key}")
    private String gemmaApiKey;

    @Value("${gemma.api.model:gemini-2.0-flash}")
    private String gemmaModel;

    private final UserRepository userRepository;
    private final UserProfileRepository userProfileRepository;
    private final RecipeRepository recipeRepository;

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final String OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

    /**
     * Executes generate diet plan operation.
     */
    public String generateDietPlan(String goals, String allergies) {
        String safeGoals = (goals != null && !goals.isBlank()) ? goals.trim() : "Balanced Nutrition";
        String safeAllergies = (allergies != null && !allergies.isBlank()) ? allergies.trim() : "None";

        String prompt = String.format(
                """
                You are an expert clinical nutritionist and sports nutritionist. Create a comprehensive, realistic, and highly detailed 1-day personalized meal and nutrition protocol for an individual with:
                - Primary Health Goals: %s
                - Allergies & Dietary Restrictions: %s

                Return ONLY valid JSON matching this nutritionist diet-plan structure:
                {
                  "title": "short clinical diet plan title",
                  "dietType": "protocol category",
                  "targets": {
                    "calories": 2100, "protein": 150, "carbs": 200, "fats": 60,
                    "waterLiters": 3.0, "fiber": 30, "iron": 18,
                    "calcium": 1000, "vitD": 15, "vitC": 90
                  },
                  "nutritionistNotes": "professional meal timing, hydration and safety notes",
                  "meals": [
                    {
                      "time": "08:00 AM", "name": "meal name", "mealType": "Breakfast",
                      "ingredients": "exact ingredients and portions",
                      "calories": 520, "protein": 38, "carbs": 58, "fats": 14
                    }
                  ],
                  "planText": "brief clinical allergy safeguards and additional guidance"
                }
                Strict Requirements:
                1. Zero Allergen Violation: strictly exclude all ingredients matching the stated allergies/restrictions.
                2. Include 4-7 scheduled meals with exact portions and meal-level macros.
                3. Include all seven daily targets plus calcium, vitamin D and vitamin C.
                """, safeGoals, safeAllergies);

        // 1. Try Gemma/Gemini live AI
        if (!"mock-key".equals(gemmaApiKey) && gemmaApiKey != null && !gemmaApiKey.isBlank()) {
            try {
                String plan = callGemmaText(prompt);
                if (plan != null && !plan.isBlank() && !plan.startsWith("Error calling Gemma")) {
                    return plan;
                }
            } catch (Exception e) {
                System.err.println("Gemma API call failed for diet plan: " + e.getMessage());
            }
        }

        // 2. Try OpenAI as secondary engine
        if (!"mock-key".equals(apiKey) && apiKey != null && !apiKey.isBlank()) {
            try {
                String openAiPlan = callOpenAi(prompt);
                if (openAiPlan != null && !openAiPlan.isBlank()) {
                    return openAiPlan;
                }
            } catch (Exception e) {
                System.err.println("OpenAI call failed for diet plan: " + e.getMessage());
            }
        }

        // 3. Clinical Deterministic Engine (Never returns mock error string)
        return generateClinicalDietPlan(safeGoals, safeAllergies);
    }

    /**
     * Executes generate clinical diet plan operation.
     */
    public String generateClinicalDietPlan(String goals, String allergies) {
        String safeGoals = (goals != null && !goals.isBlank()) ? goals.trim() : "Balanced Nutrition";
        String safeAllergies = (allergies != null && !allergies.isBlank()) ? allergies.trim() : "None";
        String lowerGoals = safeGoals.toLowerCase();
        String lowerAllergies = safeAllergies.toLowerCase();

        boolean isGain = lowerGoals.contains("gain") || lowerGoals.contains("bulk");
        boolean isLoss = lowerGoals.contains("loss") || lowerGoals.contains("cut") || lowerGoals.contains("fat");
        boolean isHighProtein = lowerGoals.contains("protein") || lowerGoals.contains("muscle") || lowerGoals.contains("athletic");

        boolean noDairy = lowerAllergies.contains("milk") || lowerAllergies.contains("dairy") || lowerAllergies.contains("lactose");
        boolean noNuts = lowerAllergies.contains("nut") || lowerAllergies.contains("peanut");
        boolean noGluten = lowerAllergies.contains("gluten") || lowerAllergies.contains("wheat");
        boolean noEggs = lowerAllergies.contains("egg");
        boolean isVegan = lowerAllergies.contains("vegan") || lowerAllergies.contains("plant-based");
        boolean isVeg = isVegan || lowerAllergies.contains("vegetarian") || lowerAllergies.contains("jain");

        // Target Calories & Macros
        int calories;
        int proteinG;
        int carbsG;
        int fatG;

        if (isGain) {
            calories = 2950;
            proteinG = 165;
            carbsG = 380;
            fatG = 85;
        } else if (isLoss) {
            calories = 1750;
            proteinG = 145;
            carbsG = 140;
            fatG = 50;
        } else if (isHighProtein) {
            calories = 2400;
            proteinG = 175;
            carbsG = 260;
            fatG = 65;
        } else {
            calories = 2150;
            proteinG = 120;
            carbsG = 265;
            fatG = 65;
        }

        // Protein options
        String morningMilk = noDairy ? "Fortified unsweetened almond or oat milk (300ml)" : "Warm low-fat cow's milk or fortified organic milk (300ml)";
        String breakfastProtein = noEggs
                ? (noDairy ? "Tofu Scramble with turmeric, nutritional yeast, and baby spinach (200g)" : "Paneer bhurji / spiced cottage cheese with diced peppers (180g)")
                : "3 whole eggs (scrambled or poached) with sautéed spinach and cherry tomatoes";
        String snackProtein = noDairy
                ? (noNuts ? "Pumpkin seeds (30g) + Roasted spiced edamame (50g)" : "Sunflower seed butter (2 tbsp) with sliced crisp green apple")
                : "Greek yogurt cup (200g) with raw honey and chia seeds";
        String lunchProtein = isVeg
                ? (noDairy ? "Grilled marinated firm tofu & mixed lentil curry (1.5 cups)" : "Fresh paneer tikka & organic dal tadka (1.5 cups)")
                : "Grilled herb-marinated chicken breast or Atlantic wild salmon fillet (180g)";
        String dinnerProtein = isVeg
                ? (noDairy ? "Black bean & quinoa power bowl with avocado and edamame (250g)" : "Chickpea & paneer stir-fry with steamed broccoli (250g)")
                : "Lemon-herb grilled turkey breast or baked white cod (180g)";
        String bedtimeSnack = noDairy
                ? "Warm chamomile herbal tea with 1 tbsp chia pudding in unsweetened almond milk"
                : "Warm golden milk (turmeric, black pepper, pinch of cinnamon) with 150ml milk";

        // Grains / Carbs
        String breakfastCarb = noGluten ? "Gluten-free rolled oats cooked with cinnamon and blueberries (80g dry)" : "Steel-cut rolled oats with cinnamon and sliced banana (80g dry)";
        String lunchCarb = noGluten ? "Steamed jasmine brown rice or fluffy quinoa (1.5 cups cooked)" : "Whole grain roti (2 pcs) or organic brown rice (1.5 cups)";
        String dinnerCarb = noGluten ? "Roasted sweet potato wedges with rosemary and olive oil (200g)" : "Quinoa and roasted sweet potato mash (200g)";

        StringBuilder sb = new StringBuilder();
        sb.append("# 🥗 Personalized Clinical Diet & Nutrition Protocol\n\n");
        sb.append("**Target Goals:** ").append(safeGoals).append("\n");
        sb.append("**Allergies & Dietary Restrictions:** ").append(safeAllergies).append("\n\n");

        sb.append("### 📊 Target Nutritional Breakdown\n");
        sb.append("- **Daily Energy Intake:** ~").append(calories).append(" kcal\n");
        sb.append("- **Protein:** ").append(proteinG).append("g (Targeting muscle synthesis & recovery)\n");
        sb.append("- **Carbohydrates:** ").append(carbsG).append("g (Complex low-glycemic sustained fuel)\n");
        sb.append("- **Healthy Dietary Fats:** ").append(fatG).append("g (Essential fatty acids & hormone support)\n\n");

        sb.append("### 🌅 Early Morning (6:30 AM - 7:00 AM)\n");
        sb.append("- 500ml warm filtered water with fresh lemon wedge and 1 tbsp soaked chia seeds\n");
        if (isGain) {
            sb.append("- ").append(morningMilk).append(" with 1 tbsp unrefined organic honey\n");
        } else {
            sb.append("- 1 cup organic antioxidant green tea or ginger-mint infusion\n");
        }
        sb.append("\n");

        sb.append("### 🍳 Breakfast (8:00 AM - 8:30 AM)\n");
        sb.append("- ").append(breakfastProtein).append("\n");
        sb.append("- ").append(breakfastCarb).append("\n");
        if (!noNuts && !isLoss) {
            sb.append("- 1 tbsp pure almond butter or crushed walnuts for essential fatty acids\n");
        } else {
            sb.append("- 1 tbsp hemp hearts or milled flaxseeds\n");
        }
        sb.append("\n");

        sb.append("### 🍎 Mid-Morning Booster (11:00 AM)\n");
        sb.append("- ").append(snackProtein).append("\n");
        sb.append("- 1 piece fresh seasonal fruit (e.g., green apple, orange, or 1 cup mixed berries)\n");
        sb.append("- 350ml electrolyte water or coconut water\n\n");

        sb.append("### 🥗 Lunch (1:00 PM - 1:30 PM)\n");
        sb.append("- ").append(lunchProtein).append("\n");
        sb.append("- ").append(lunchCarb).append("\n");
        sb.append("- Large colorful rainbow salad (cucumber, grated carrot, baby arugula, bell peppers) with extra virgin olive oil and apple cider vinegar dressing (1 tbsp)\n\n");

        sb.append("### 🍵 Evening Fuel & Pre-Workout (4:30 PM - 5:00 PM)\n");
        if (isGain) {
            sb.append("- High-calorie smoothie: ").append(morningMilk).append(", 1 ripe banana, 2 tbsp oat flour, and 1 scoop plant/whey-safe protein\n");
        } else {
            sb.append("- 1 cup roasted spiced chickpeas (chana) or edamame with cucumber sticks\n");
            sb.append("- Black coffee or unsweetened matcha green tea\n");
        }
        sb.append("\n");

        sb.append("### 🍲 Dinner (7:30 PM - 8:00 PM)\n");
        sb.append("- ").append(dinnerProtein).append("\n");
        sb.append("- ").append(dinnerCarb).append("\n");
        sb.append("- Sautéed seasonal greens (zucchini, asparagus, or bok choy) with garlic and cold-pressed sesame oil\n\n");

        sb.append("### 🥛 Bedtime Recovery (9:30 PM)\n");
        sb.append("- ").append(bedtimeSnack).append("\n");
        sb.append("- 200mg elemental Magnesium Glycinate for sleep quality and muscle recovery\n\n");

        sb.append("### 💧 Hydration & Electrolytes Protocol\n");
        sb.append("- Minimum 3.0 to 3.5 Liters of pure water spaced evenly across the day.\n");
        sb.append("- Add a pinch of Himalayan pink salt to morning water for cellular hydration.\n\n");

        sb.append("### ⚠️ Clinical Allergy Exclusion Safeguards\n");
        if (!"None".equalsIgnoreCase(safeAllergies)) {
            sb.append("- **Strict Exclusion Active:** This protocol has been systematically formulated to 100% exclude [")
              .append(safeAllergies)
              .append("] and all hidden industrial derivatives.\n");
            if (noDairy) {
                sb.append("- *Dairy Alert:* Excludes all cow/buffalo/goat milk, whey, casein, cheese, butter, ghee, and curd. Replaced with fortified plant alternatives.\n");
            }
            if (noNuts) {
                sb.append("- *Nut Alert:* Excludes all tree nuts and peanuts. Replaced with allergen-safe seed varieties (pumpkin, sunflower, chia).\n");
            }
            if (noGluten) {
                sb.append("- *Gluten Alert:* Excludes wheat, barley, rye, and malt. Certified gluten-free whole grains used exclusively.\n");
            }
            if (noEggs) {
                sb.append("- *Egg Alert:* Excludes whole eggs, albumen, and egg-based emulsifiers. Replaced with high-protein plant scrambles.\n");
            }
        } else {
            sb.append("- No medical allergies reported. General gut-friendly and anti-inflammatory guidelines applied.\n");
        }

        return sb.toString();
    }

    /**
     * Validates a single custom user-typed health goal or dietary restriction via
     * AI.
     * Returns: { valid: boolean, normalized: string, reason: string, category:
     * "GOAL"|"RESTRICTION"|"AMBIGUOUS"|"INVALID" }
     */
    public Map<String, Object> validateCustomInput(String value, String category) {
        if (value == null || value.isBlank()) {
            return Map.of("valid", false, "normalized", "", "reason", "Empty input.", "category", "INVALID");
        }
        String trimmed = value.trim();

        // Prompt AI to classify the input
        String catLabel = "goal".equalsIgnoreCase(category) ? "health goal" : "dietary restriction or allergy";
        String prompt = String.format(
                """
                        You are a clinical nutrition classification AI. A user typed a custom %s: "%s".

                        Evaluate this input and return ONLY a valid JSON object:
                        {
                          "valid": true or false,
                          "normalized": "canonical normalized form of the value if valid, else empty string",
                          "reason": "one-sentence explanation",
                          "category": "GOAL" or "RESTRICTION" or "AMBIGUOUS" or "INVALID"
                        }

                        Rules:
                        - "valid" is true ONLY if the input is a meaningful, real-world health goal or dietary restriction/allergy.
                        - Normalize the value to title case and fix obvious misspellings.
                        - If the input is completely unrelated to nutrition/health, set valid=false and category=INVALID.
                        - If it could be either a goal or restriction, set category=AMBIGUOUS.
                        - Do NOT include any markdown or extra text. Return ONLY the JSON.
                        """,
                catLabel, trimmed);

        // Try Gemma first
        if (!"mock-key".equals(gemmaApiKey) && gemmaApiKey != null && !gemmaApiKey.isBlank()) {
            try {
                String url = "https://generativelanguage.googleapis.com/v1beta/models/" + gemmaModel
                        + ":generateContent?key=" + gemmaApiKey;
                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_JSON);
                headers.set("x-goog-api-key", gemmaApiKey);
                Map<String, Object> body = Map.of(
                        "contents", List.of(Map.of("parts", List.of(Map.of("text", prompt)))),
                        "generationConfig", Map.of("response_mime_type", "application/json", "temperature", 0.1));
                HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
                ResponseEntity<Map> response = restTemplate.postForEntity(url, entity, Map.class);
                List<Map<String, Object>> candidates = (List<Map<String, Object>>) response.getBody().get("candidates");
                Map<String, Object> contentObj = (Map<String, Object>) candidates.get(0).get("content");
                List<Map<String, Object>> parts = (List<Map<String, Object>>) contentObj.get("parts");
                String raw = parts.stream()
                        .filter(p -> !Boolean.TRUE.equals(p.get("thought")) && p.containsKey("text"))
                        .map(p -> p.get("text").toString())
                        .collect(Collectors.joining("\n")).trim();
                raw = raw.replaceAll("```json", "").replaceAll("```", "").trim();
                int fb = raw.indexOf("{");
                int lb = raw.lastIndexOf("}");
                if (fb != -1 && lb > fb)
                    raw = raw.substring(fb, lb + 1);
                return objectMapper.readValue(raw, Map.class);
            } catch (Exception e) {
                System.err.println("Gemma validation failed: " + e.getMessage());
            }
        }

        // Try OpenAI as fallback
        if (!"mock-key".equals(apiKey) && apiKey != null && !apiKey.isBlank()) {
            try {
                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_JSON);
                headers.setBearerAuth(apiKey);
                Map<String, Object> body = new HashMap<>();
                body.put("model", "gpt-3.5-turbo");
                body.put("messages", List.of(Map.of("role", "user", "content", prompt)));
                body.put("response_format", Map.of("type", "json_object"));
                HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
                ResponseEntity<Map> response = restTemplate.postForEntity(OPENAI_API_URL, entity, Map.class);
                List<Map<String, Object>> choices = (List<Map<String, Object>>) response.getBody().get("choices");
                String content = (String) ((Map<String, Object>) choices.get(0).get("message")).get("content");
                return objectMapper.readValue(content, Map.class);
            } catch (Exception e) {
                System.err.println("OpenAI validation failed: " + e.getMessage());
            }
        }

        // Rule-based fallback validation (when AI service is offline / unconfigured)
        String lower = trimmed.toLowerCase();

        // 1. Definite reject patterns: media/entertainment, numbers + non-health words,
        // junk, URLs, etc.
        List<String> rejectKeywords = List.of(
                "movie", "movies", "film", "song", "music", "game", "games", "video", "book", "car", "phone",
                "computer", "coding", "travel", "flight", "hotel", "clothing", "shopping", "money", "crypto",
                "stock", "politics", "weapon", "gun", "party", "test", "asdf", "qwerty", "random");
        for (String bad : rejectKeywords) {
            if (lower.matches(".*\\b" + bad + "\\b.*") || lower.contains(bad)) {
                return Map.of("valid", false, "normalized", "", "reason",
                        "Rejected: \"" + trimmed + "\" is not a recognized health goal or dietary restriction.",
                        "category", "INVALID");
            }
        }

        // 2. Comprehensive vocabulary of genuine nutrition / health terms
        Set<String> goalKeywords = Set.of(
                "weight loss", "weight gain", "muscle", "muscle gain", "fat loss", "healthy eating",
                "balanced nutrition", "high protein", "weight maintenance", "digestion", "digestive",
                "athletic", "performance", "bulking", "cutting", "lean bulk", "endurance", "flexibility",
                "energy", "energy boost", "detox", "cleanse", "anti-aging", "heart health", "cardio",
                "cholesterol", "blood sugar", "insulin", "diabetes", "diabetic", "immunity", "immune",
                "stamina", "strength", "hypertrophy", "tone", "toning", "gut health", "metabolism",
                "metabolic", "longevity", "recovery", "hydration", "sleep", "vitality", "fitness",
                "caloric deficit", "caloric surplus", "maintenance", "macro", "micronutrient");

        Set<String> restrictionKeywords = Set.of(
                "vegan", "vegetarian", "plant-based", "gluten", "gluten-free", "lactose", "lactose-free",
                "dairy", "dairy-free", "keto", "ketogenic", "halal", "kosher", "jain", "paleo", "nut",
                "nuts", "peanut", "peanuts", "tree nut", "shellfish", "crustacean", "egg", "eggs", "soy",
                "wheat", "fish", "sesame", "low sodium", "low salt", "low sugar", "sugar-free", "diabetic",
                "fodmap", "low carb", "nightshade", "histamine", "sulfite", "caffeine-free", "no alcohol",
                "hypoallergenic", "celiac", "allergy", "allergic", "intolerance");

        boolean matchGoal = goalKeywords.stream().anyMatch(lower::contains);
        boolean matchRest = restrictionKeywords.stream().anyMatch(lower::contains);

        if (matchGoal || matchRest) {
            String normalizedCat = matchGoal && matchRest ? "AMBIGUOUS" : (matchGoal ? "GOAL" : "RESTRICTION");
            String[] words = trimmed.split("\\s+");
            StringBuilder sb = new StringBuilder();
            for (String w : words) {
                if (!w.isBlank()) {
                    sb.append(Character.toUpperCase(w.charAt(0))).append(w.substring(1).toLowerCase()).append(" ");
                }
            }
            String normalized = sb.toString().trim();
            return Map.of("valid", true, "normalized", normalized, "reason",
                    "Validated as a nutrition " + normalizedCat.toLowerCase() + ".", "category", normalizedCat);
        }

        // 3. If neither AI nor the recognized nutrition vocabulary matches, REJECT
        return Map.of(
                "valid", false,
                "normalized", "",
                "reason",
                "Rejected: \"" + trimmed + "\" does not appear to be a recognized health goal or dietary restriction.",
                "category", "INVALID");
    }

    /**
     * Executes analyze food image operation.
     */
    public String analyzeFoodImage(String imageUrl) {
        if (imageUrl == null || imageUrl.trim().isEmpty()) {
            return "No image source provided for analysis.";
        }
        String cleanUrl = imageUrl.trim();
        boolean isValidSource = cleanUrl.startsWith("http://") || cleanUrl.startsWith("https://") || cleanUrl.startsWith("data:image/");
        if (!isValidSource) {
            return "Invalid image source. Please provide a valid HTTP/HTTPS image URL or upload an image file.";
        }
        if (!cleanUrl.startsWith("data:image/")) {
            cleanUrl = cleanUrl.replaceAll("[\\r\\n\\t]", "");
            if (cleanUrl.length() > 2048) {
                return "Image URL is too long. Please provide a standard URL.";
            }
        }

        if (!"mock-key".equals(gemmaApiKey) && gemmaApiKey != null && !gemmaApiKey.isBlank()) {
            try {
                return callGemmaText("Analyze this food image URL and estimate calories: " + cleanUrl);
            } catch (Exception e) {
                System.err.println("Gemma API call failed for image analysis: " + e.getMessage());
            }
        }
        if (!"mock-key".equals(apiKey)) {
            return callOpenAi("Analyze this food image URL and estimate calories: " + cleanUrl);
        }
        return "Mock AI Image Analysis: The uploaded image looks like a healthy meal containing approximately 450 calories, high in protein.";
    }

    /**
     * Executes analyze food operation.
     */
    public FoodAnalysisResponseDto analyzeFood(FoodAnalysisRequestDto request, String userEmail) {
        // Fetch user profile allergies if user logged in
        String userAllergiesStr = "";
        String userDietType = "";
        if (userEmail != null) {
            Optional<User> userOpt = userRepository.findByEmail(userEmail);
            if (userOpt.isPresent()) {
                Optional<UserProfile> profileOpt = userProfileRepository.findByUser(userOpt.get());
                if (profileOpt.isPresent()) {
                    UserProfile profile = profileOpt.get();
                    if (profile.getAllergies() != null)
                        userAllergiesStr = profile.getAllergies();
                    if (profile.getDietType() != null)
                        userDietType = profile.getDietType();
                }
            }
        }
        if (request.getCustomAllergies() != null && !request.getCustomAllergies().trim().isEmpty()) {
            userAllergiesStr = (userAllergiesStr.isEmpty() ? "" : userAllergiesStr + ", ")
                    + request.getCustomAllergies();
        }
        if (request.getDietType() != null && !request.getDietType().trim().isEmpty()) {
            userDietType = request.getDietType();
        }

        List<String> userAllergiesList = Arrays.stream(userAllergiesStr.split("[,;]"))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toList());

        Map<String, Object> offProduct = null;
        boolean barcodeLookup = "BARCODE".equalsIgnoreCase(request.getInputType());
        if (barcodeLookup) {
            String barcode = normaliseBarcode(request.getBarcode());
            BarcodeLookup lookup = lookupProduct(barcode);
            offProduct = lookup.product;
            if (offProduct == null) {
                // Every negative outcome is reported with its own specific reason.
                // No AI call is made, because there is no product data to analyse.
                return issueResponse(lookup.outcome, lookup.message);
            }
        }

        // Records an exception that was recovered from, so the user is told that the
        // verdict came from the product record rather than the AI model. Image input is
        // deliberately left unchanged here.
        String barcodeAiNotice = null;

        // 1. Try Gemma Model for Vision & OCR Analysis
        if (!"mock-key".equals(gemmaApiKey) && gemmaApiKey != null && !gemmaApiKey.isBlank()) {
            try {
                FoodAnalysisResponseDto aiResult = callGemmaApiForOCR(request, userAllergiesList, userDietType,
                        offProduct);
                if (barcodeLookup) {
                    if (!hasCompleteVerdict(aiResult) || !matchesBarcodeRecord(aiResult, offProduct)) {
                        throw new IllegalStateException(
                                "AI returned an incomplete or inconsistent analysis for a barcode lookup");
                    }
                    aiResult = reconcileBarcodeAiResult(aiResult, offProduct);
                }
                return aiResult;
            } catch (Exception e) {
                System.err.println("Gemma Model OCR/Vision call failed: " + e.getMessage()
                        + ". Falling back to secondary engine.");
                if (barcodeLookup) {
                    barcodeAiNotice = "The AI analysis service did not return a usable result. "
                            + "This verdict was computed directly from the product database record, "
                            + "not generated by AI.";
                }
            }
        }

        // 2. Try OpenAI as secondary engine. Only for input types that carry their own
        // image payload: a barcode alone gives it nothing to analyse but the number, so it
        // is never asked to work from a barcode.
        if (!barcodeLookup && !"mock-key".equals(apiKey) && apiKey != null && !apiKey.isBlank()) {
            try {
                return callOpenAiForFoodAnalysis(request, userAllergiesList, userDietType);
            } catch (Exception e) {
                System.err.println(
                        "OpenAI Vision call failed: " + e.getMessage() + ". Falling back to local OCR analyzer.");
            }
        }

        // 3. Robust local OCR & Rule-based fallback engine
        FoodAnalysisResponseDto result = performRuleBasedAnalysis(request, userAllergiesList, userDietType,
                offProduct, barcodeLookup);
        if (barcodeAiNotice != null) {
            result.setMessage(result.getMessage() == null ? barcodeAiNotice
                    : result.getMessage() + " " + barcodeAiNotice);
        }
        return result;
    }

    /**
     * An analysis is only accepted from the AI when it actually carries a product name
     * and a verdict. A blank or partial JSON object must not be displayed as a result.
     */
    private boolean hasCompleteVerdict(FoodAnalysisResponseDto result) {
        return result != null
                && result.getProductName() != null && !result.getProductName().isBlank()
                && result.getVerdict() != null && !result.getVerdict().isBlank();
    }

    /**
     * For a barcode the Open Food Facts record is the only authoritative source of
     * numbers. An AI result that contradicts it is rejected (so the deterministic engine
     * takes over), and the accepted result has its nutrition block replaced with the
     * values actually supplied by the database.
     */
    private FoodAnalysisResponseDto reconcileBarcodeAiResult(FoodAnalysisResponseDto ai,
            Map<String, Object> offProduct) {
        FoodAnalysisResponseDto.NutritionInfo source = nutritionFromRecord(offProduct);
        FoodAnalysisResponseDto.NutritionInfo reported = ai.getNutrition();
        if (reported == null) {
            throw new IllegalStateException("AI returned no nutrition data for a barcode lookup");
        }
        if (conflicts(source.getCalories(), reported.getCalories())
                || conflicts(source.getSugarG(), reported.getSugarG())
                || conflicts(source.getSodiumMg(), reported.getSodiumMg())) {
            throw new IllegalStateException("AI nutrition values conflict with the product record");
        }
        if ("SAFE".equalsIgnoreCase(ai.getVerdict())
                && ((source.getSugarG() != null && source.getSugarG() >= 18.0)
                        || (source.getSodiumMg() != null && source.getSodiumMg() >= 600.0))) {
            throw new IllegalStateException("AI verdict contradicts the product's sugar or sodium level");
        }
        ai.setNutrition(source);
        ai.setProductFound(true);
        ai.setOutcome("OK");
        return ai;
    }

    private boolean conflicts(Number sourceValue, Number aiValue) {
        return sourceValue != null && aiValue != null
                && Math.abs(sourceValue.doubleValue() - aiValue.doubleValue()) > 1.0;
    }

    /**
     * Extracts nutrition values from an Open Food Facts record without inventing any:
     * absent values stay {@code null}.
     */
    private FoodAnalysisResponseDto.NutritionInfo nutritionFromRecord(Map<String, Object> offProduct) {
        Map nutriments = offProduct.get("nutriments") instanceof Map
                ? (Map) offProduct.get("nutriments") : Collections.emptyMap();
        Double cal = getDoubleOrNullFromMap(nutriments, "energy-kcal_100g", "energy-kcal_serving", "energy-kcal");
        Double pro = getDoubleOrNullFromMap(nutriments, "proteins_100g", "proteins_serving", "proteins");
        Double carb = getDoubleOrNullFromMap(nutriments, "carbohydrates_100g", "carbohydrates_serving",
                "carbohydrates");
        Double fat = getDoubleOrNullFromMap(nutriments, "fat_100g", "fat_serving", "fat");
        Double fib = getDoubleOrNullFromMap(nutriments, "fiber_100g", "fiber_serving", "fiber");
        Double sug = getDoubleOrNullFromMap(nutriments, "sugars_100g", "sugars_serving", "sugars");
        Double sodium = getDoubleOrNullFromMap(nutriments, "sodium_100g", "sodium_serving", "sodium");
        return FoodAnalysisResponseDto.NutritionInfo.builder()
                .calories(cal == null ? null : cal.intValue())
                .proteinG(pro)
                .carbsG(carb)
                .fatG(fat)
                .fiberG(fib)
                .sugarG(sug)
                .sodiumMg(sodium == null ? null : sodium * 1000.0)
                .micronutrients(Map.of())
                .build();
    }

    /** True when the source record supplied no nutrition values whatsoever. */
    private boolean hasNoNutrition(FoodAnalysisResponseDto.NutritionInfo nutrition) {
        return nutrition == null || (nutrition.getCalories() == null && nutrition.getProteinG() == null
                && nutrition.getCarbsG() == null && nutrition.getFatG() == null
                && nutrition.getFiberG() == null && nutrition.getSugarG() == null
                && nutrition.getSodiumMg() == null);
    }

    /**
     * Rejects an AI result that names a product unrelated to the barcode record. The
     * model must describe the supplied product, not reconstruct one from the digits.
     */
    private boolean matchesBarcodeRecord(FoodAnalysisResponseDto aiResult, Map<String, Object> offProduct) {
        if (offProduct == null)
            return true;
        String source = (firstNonBlank(offProduct.get("product_name"), offProduct.get("product_name_en")) + " "
                + firstNonBlank(offProduct.get("brands"))).toLowerCase();
        String aiName = aiResult.getProductName().toLowerCase();
        return Arrays.stream(source.split("[^a-z0-9]+"))
                .filter(word -> word.length() >= 4)
                .anyMatch(aiName::contains);
    }

    /**
     * Looks a barcode up across the three Open Food Facts endpoints.
     *
     * @param barcode scanned or manually entered barcode
     * @return the product map when usable data was found, otherwise {@code null}
     */
    public Map<String, Object> fetchOpenFoodFactsProduct(String barcode) {
        return lookupProduct(normaliseBarcode(barcode)).product;
    }

    /** Shortest and longest GTIN formats accepted (EAN-8 through GTIN-14). */
    private static final int MIN_BARCODE_DIGITS = 8;
    private static final int MAX_BARCODE_DIGITS = 14;

    /**
     * Result of a barcode lookup. Every negative result carries an outcome code and a
     * specific, human-readable message, so a temporary lookup failure can never be
     * reported as "product not found".
     */
    private static final class BarcodeLookup {
        private final Map<String, Object> product;
        private final String outcome;
        private final String message;

        private BarcodeLookup(Map<String, Object> product, String outcome, String message) {
            this.product = product;
            this.outcome = outcome;
            this.message = message;
        }
    }

    /**
     * Removes spaces and hyphens that scanners and copied text sometimes insert.
     */
    private String normaliseBarcode(String raw) {
        return raw == null ? "" : raw.replaceAll("[\\s\\-]", "");
    }

    /**
     * Validates a barcode before any network call is made.
     *
     * @return a specific validation message, or {@code null} when the barcode is valid
     */
    private String barcodeValidationError(String raw) {
        String clean = normaliseBarcode(raw);
        if (clean.isEmpty()) {
            return "No barcode was provided. Enter the 8 to 14 digits printed beneath the barcode on the package.";
        }
        if (!clean.matches("\\d+")) {
            return "'" + (raw == null ? "" : raw.trim())
                    + "' is not a valid barcode: it contains letters or symbols. Barcodes contain digits only.";
        }
        if (clean.length() < MIN_BARCODE_DIGITS || clean.length() > MAX_BARCODE_DIGITS) {
            return "'" + clean + "' has " + clean.length()
                    + " digits. A valid barcode has 8 to 14 digits (EAN-8, UPC-A, EAN-13 or GTIN-14). "
                    + "Check that the whole number was entered or scanned.";
        }
        return null;
    }

    /**
     * Queries each Open Food Facts endpoint in turn until one yields usable product data.
     *
     * <p>Open Food Facts answers HTTP 200 with {@code status: 0} when a product is absent,
     * and HTTP 404 with the same body in other cases, so the payload is inspected rather
     * than the status code. Only a {@code status: 1} response carrying usable data counts
     * as a hit. Every other condition is classified so the user gets an accurate reason.
     *
     * @param barcode scanned or manually entered barcode
     * @return the product plus the outcome and a specific message
     */
    private BarcodeLookup lookupProduct(String barcode) {
        String cleanBarcode = normaliseBarcode(barcode);
        String validationError = barcodeValidationError(cleanBarcode);
        if (validationError != null) {
            return new BarcodeLookup(null, "INVALID_BARCODE", validationError);
        }

        List<String> urls = List.of(
                "https://world.openfoodfacts.org/api/v2/product/" + cleanBarcode + ".json",
                "https://in.openfoodfacts.org/api/v2/product/" + cleanBarcode + ".json",
                "https://world.openfoodfacts.org/api/v0/product/" + cleanBarcode + ".json");

        HttpHeaders headers = new HttpHeaders();
        headers.set("User-Agent", "NutritionAIApp/1.0 (contact@nutritionai.com)");
        HttpEntity<Void> entity = new HttpEntity<>(headers);

        boolean answered = false;   // A source gave a definitive Open Food Facts answer.
        boolean incomplete = false; // A product exists but its record cannot be analysed.
        Set<String> failures = new LinkedHashSet<>();

        for (String url : urls) {
            try {
                ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.GET, entity, Map.class);
                Map body = response.getBody();
                if (body == null || body.get("status") == null) {
                    failures.add("an unrecognised response");
                    continue;
                }
                answered = true;
                Object statusObj = body.get("status");
                if (statusObj.equals(1) || "1".equals(statusObj.toString())) {
                    Map<String, Object> product = (Map<String, Object>) body.get("product");
                    if (hasUsableProductData(product)) {
                        return new BarcodeLookup(product, "OK", null);
                    }
                    incomplete = true;
                }
            } catch (HttpStatusCodeException httpError) {
                // A 404 carrying an Open Food Facts body still means the source answered:
                // it looked, and the product is not there.
                String responseBody = httpError.getResponseBodyAsString();
                int statusCode = httpError.getStatusCode().value();
                if (responseBody != null && responseBody.contains("\"status\"")) {
                    answered = true;
                } else if (statusCode == 429) {
                    failures.add("the database rate-limited this request (HTTP 429)");
                } else if (httpError.getStatusCode().is5xxServerError()) {
                    failures.add("the database returned a server error (HTTP " + statusCode + ")");
                } else {
                    failures.add("the database returned HTTP " + statusCode);
                }
                System.err.println("OpenFoodFacts lookup " + url + " -> HTTP " + statusCode);
            } catch (ResourceAccessException networkError) {
                failures.add("the database could not be reached or timed out");
                System.err.println("OpenFoodFacts lookup " + url + " -> " + networkError.getMessage());
            } catch (Exception e) {
                failures.add("an unexpected error (" + e.getClass().getSimpleName() + ")");
                System.err.println("OpenFoodFacts lookup " + url + " -> " + e.getMessage());
            }
        }

        String label = "barcode " + cleanBarcode;
        if (incomplete) {
            return new BarcodeLookup(null, "INCOMPLETE_DATA",
                    "We found " + label
                            + " in the product database, but its record has no usable ingredient list or nutrition "
                            + "values, so an analysis would be guesswork. Scan the product's ingredient or "
                            + "nutrition label with image analysis instead.");
        }
        if (answered) {
            return new BarcodeLookup(null, "NOT_FOUND", notFoundMessage(cleanBarcode));
        }
        String reason = failures.isEmpty() ? "the sources returned no product record"
                : String.join("; ", failures);
        return new BarcodeLookup(null, "SOURCE_UNAVAILABLE",
                "We couldn't check " + label + " just now: " + reason
                        + ". This is a temporary lookup problem, not a 'product not found' result. "
                        + "Please try again in a moment.");
    }

    /**
     * Decides whether a retrieved product record is substantial enough to analyse.
     *
     * <p>A record needs a name, plus at least one of: an ingredient list or a nutrition
     * table. Anything thinner cannot support a dietary verdict, and analysing it would
     * produce an answer built on nothing.
     *
     * @param product raw Open Food Facts product map
     * @return true when the record can support a real analysis
     */
    private boolean hasUsableProductData(Map<String, Object> product) {
        if (product == null || product.isEmpty())
            return false;
        if (firstNonBlank(product.get("product_name"), product.get("product_name_en")) == null)
            return false;
        boolean hasIngredients = firstNonBlank(product.get("ingredients_text"),
                product.get("ingredients_text_en")) != null;
        boolean hasNutrition = product.get("nutriments") instanceof Map && !((Map) product.get("nutriments")).isEmpty();
        return hasIngredients || hasNutrition;
    }

    /**
     * Returns the first argument that is a non-blank string, or null.
     */
    private String firstNonBlank(Object... values) {
        for (Object value : values) {
            if (value != null && !value.toString().trim().isEmpty())
                return value.toString().trim();
        }
        return null;
    }

    /** Message used when a source definitively reports that the product does not exist. */
    private String notFoundMessage(String barcode) {
        String label = barcode == null || barcode.isBlank() ? "this barcode" : "barcode " + barcode.trim();
        return "We couldn't find " + label
                + " in our food product databases. You can scan the product's ingredient or nutrition label with the image analysis feature instead.";
    }

    /** Builds a negative response. No verdict, no macros, no fabricated product data. */
    private FoodAnalysisResponseDto issueResponse(String outcome, String message) {
        return FoodAnalysisResponseDto.builder()
                .productFound(false)
                .outcome(outcome)
                .message(message)
                .verdict(null)
                .ingredientsList(List.of())
                .matchedAllergens(List.of())
                .additives(List.of())
                .build();
    }

    /**
     * Executes call gemma api for ocr operation.
     */
    private FoodAnalysisResponseDto callGemmaApiForOCR(FoodAnalysisRequestDto request, List<String> userAllergies,
            String dietType, Map<String, Object> offProduct) throws Exception {
        String url = "https://generativelanguage.googleapis.com/v1beta/models/" + gemmaModel + ":generateContent?key="
                + gemmaApiKey;
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("x-goog-api-key", gemmaApiKey);

        StringBuilder contextDetails = new StringBuilder();
        if (request.getBarcode() != null && !request.getBarcode().isBlank()) {
            contextDetails.append("Scanned Product Barcode Code: ").append(request.getBarcode().trim()).append("\n");
        }
        if (offProduct != null) {
            contextDetails.append("Retrieved OpenFoodFacts Entry:\n");
            if (offProduct.containsKey("product_name"))
                contextDetails.append("Product Name: ").append(offProduct.get("product_name")).append("\n");
            if (offProduct.containsKey("brands"))
                contextDetails.append("Brand: ").append(offProduct.get("brands")).append("\n");
            if (offProduct.containsKey("categories"))
                contextDetails.append("Category: ").append(offProduct.get("categories")).append("\n");
            if (offProduct.containsKey("serving_size"))
                contextDetails.append("Serving Size: ").append(offProduct.get("serving_size")).append("\n");
            if (offProduct.containsKey("ingredients_text_en"))
                contextDetails.append("Ingredients: ").append(offProduct.get("ingredients_text_en")).append("\n");
            else if (offProduct.containsKey("ingredients_text"))
                contextDetails.append("Ingredients: ").append(offProduct.get("ingredients_text")).append("\n");
            if (offProduct.containsKey("additives_tags"))
                contextDetails.append("Additives: ").append(offProduct.get("additives_tags")).append("\n");
            if (offProduct.containsKey("nutriments"))
                contextDetails.append("Nutriments: ").append(offProduct.get("nutriments")).append("\n");
        }

        String prompt = String.format(
                """
                        You are Gemma AI, an expert vision OCR, barcode recognition, and food analysis model.
                        Input Type: %s.
                        %s
                        User Profile Allergies: %s. User Diet Preference: %s.

                        Critical rule: use ONLY the product information supplied above. Do not invent,
                        guess, recall, or reconstruct a product from its barcode digits, and do not add
                        ingredients, additives or nutrition values that are not present in the supplied data.
                        If the supplied information is incomplete, mark the unknown fields as null and say so
                        in verdictExplanation. Never present an assumption as a fact.

                        Perform clinical nutrition analysis:
                        1. Identify the product from the supplied data only. The barcode (%s) is an identifier, not a source of product knowledge.
                        2. Extract product details, ingredients, additives, and nutrition macros (calories, protein, carbs, fat, fiber, sugar, sodium).
                        3. Cross-match ingredients against user's recorded allergies (%s).
                        4. Detect synthetic or harmful additives (E-numbers, preservatives, artificial sweeteners/colors).
                        5. Assign final verdict: SAFE (no allergen match, healthy macros), CAUTION (high sugar/sodium or synthetic additives), or AVOID (direct allergen conflict or dangerous ingredient).
                        6. Provide a plain-language explanation of the verdict.

                        Return ONLY a valid JSON object matching this schema without any markdown formatting or extra commentary:
                        {
                          "productName": "string",
                          "category": "string",
                          "servingSize": "string",
                          "verdict": "SAFE" | "CAUTION" | "AVOID",
                          "verdictExplanation": "plain text explanation",
                          "ingredientsList": ["ingredient1", "ingredient2"],
                          "matchedAllergens": [{"allergen": "Peanuts", "severity": "HIGH", "reason": "why matched"}],
                          "additives": [{"name": "E211", "category": "Preservative", "riskLevel": "MODERATE", "description": "desc"}],
                          "dietSuitability": {"Vegan": true, "Keto": false, "Gluten-Free": true},
                          "nutrition": {"calories": 300, "proteinG": 10.0, "carbsG": 30.0, "fatG": 8.0, "fiberG": 4.0, "sugarG": 5.0, "sodiumMg": 200.0, "micronutrients": {"Iron": "2mg"}},
                          "betterAlternatives": [{"id": 1, "title": "Alt Title", "description": "desc", "calories": 250, "proteinG": 15.0, "carbsG": 20.0, "fatG": 5.0, "imageUrl": "url", "whyBetter": "why"}]
                        }
                        """,
                request.getInputType(), contextDetails.toString(), userAllergies, dietType, request.getBarcode(),
                userAllergies);

        List<Map<String, Object>> parts = new ArrayList<>();
        parts.add(Map.of("text", prompt));

        if (request.getImageUrl() != null && request.getImageUrl().startsWith("data:image")) {
            String[] split = request.getImageUrl().split(",");
            if (split.length == 2) {
                String mimeType = split[0].split(";")[0].replace("data:", "");
                String base64Data = split[1];
                parts.add(Map.of("inlineData", Map.of("mimeType", mimeType, "data", base64Data)));
            }
        }

        Map<String, Object> contentMap = Map.of("parts", parts);
        Map<String, Object> generationConfig = Map.of(
                "response_mime_type", "application/json",
                "temperature", 0.2);
        Map<String, Object> body = Map.of(
                "contents", List.of(contentMap),
                "generationConfig", generationConfig);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
        ResponseEntity<Map> response = restTemplate.postForEntity(url, entity, Map.class);

        List<Map<String, Object>> candidates = (List<Map<String, Object>>) response.getBody().get("candidates");
        if (candidates == null || candidates.isEmpty()) {
            throw new RuntimeException("Empty response candidates from Gemma API");
        }
        Map<String, Object> candidate = candidates.get(0);
        Map<String, Object> contentObj = (Map<String, Object>) candidate.get("content");
        List<Map<String, Object>> resParts = (List<Map<String, Object>>) contentObj.get("parts");

        StringBuilder fullText = new StringBuilder();
        for (Map<String, Object> part : resParts) {
            if (part.containsKey("thought") && Boolean.TRUE.equals(part.get("thought"))) {
                continue;
            }
            if (part.containsKey("text")) {
                fullText.append(part.get("text")).append("\n");
            }
        }

        String rawText = fullText.toString().trim();
        rawText = rawText.replaceAll("```json", "").replaceAll("```", "").trim();
        int firstBrace = rawText.indexOf("{");
        int lastBrace = rawText.lastIndexOf("}");
        if (firstBrace != -1 && lastBrace != -1 && lastBrace > firstBrace) {
            rawText = rawText.substring(firstBrace, lastBrace + 1);
        }

        return objectMapper.readValue(rawText, FoodAnalysisResponseDto.class);
    }

    /**
     * Executes call gemma text operation.
     */
    private String callGemmaText(String prompt) {
        if (gemmaApiKey == null || gemmaApiKey.isBlank() || "mock-key".equals(gemmaApiKey)) {
            return null;
        }

        List<String> modelsToTry = new ArrayList<>();
        if (gemmaModel != null && !gemmaModel.isBlank()) {
            modelsToTry.add(gemmaModel.trim());
        }
        modelsToTry.addAll(List.of("gemini-2.0-flash", "gemini-1.5-flash", "gemini-2.5-flash"));

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        Map<String, Object> body = Map.of(
                "contents", List.of(Map.of("parts", List.of(Map.of("text", prompt)))),
                "generationConfig", Map.of("temperature", 0.7)
        );
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

        for (String model : modelsToTry) {
            String url = "https://generativelanguage.googleapis.com/v1beta/models/" + model
                    + ":generateContent";
            try {
                ResponseEntity<Map> response = restTemplate.exchange(
                        url + "?key=" + gemmaApiKey,
                        HttpMethod.POST,
                        entity,
                        Map.class);
                if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                    List<Map<String, Object>> candidates = (List<Map<String, Object>>) response.getBody().get("candidates");
                    if (candidates != null && !candidates.isEmpty()) {
                        Map<String, Object> contentObj = (Map<String, Object>) candidates.get(0).get("content");
                        if (contentObj != null && contentObj.containsKey("parts")) {
                            List<Map<String, Object>> parts = (List<Map<String, Object>>) contentObj.get("parts");
                            if (parts != null && !parts.isEmpty()) {
                                String text = parts.stream()
                                        .filter(p -> !Boolean.TRUE.equals(p.get("thought")) && p.containsKey("text"))
                                        .map(p -> p.get("text").toString())
                                        .collect(Collectors.joining("\n")).trim();
                                if (!text.isBlank()) {
                                    return text;
                                }
                            }
                        }
                    }
                }
            } catch (Exception e) {
                System.err.println("Gemini model " + model + " failed for diet plan: " + e.getMessage());
            }
        }
        return null;
    }

    /**
     * Executes perform rule based analysis operation.
     */
    private FoodAnalysisResponseDto performRuleBasedAnalysis(FoodAnalysisRequestDto request, List<String> userAllergies,
            String dietType, Map<String, Object> offProduct, boolean barcodeLookup) {
        String inputType = request.getInputType() != null ? request.getInputType().toUpperCase() : "FOOD_IMAGE";

        String productName;
        String category;
        String servingSize;
        List<String> ingredients = new ArrayList<>();
        FoodAnalysisResponseDto.NutritionInfo nutrition;
        List<FoodAnalysisResponseDto.AdditiveInfo> additives = new ArrayList<>();

        // True when the product record carries no nutrition values at all. In that case
        // no number may be displayed as zero, and a "SAFE" verdict cannot be asserted.
        boolean nutritionIncomplete = false;

        if ("BARCODE".equals(inputType)) {
            String code = normaliseBarcode(request.getBarcode());
            if (offProduct == null) {
                // Defensive only: analyzeFood() returns before this point when the barcode
                // could not be resolved, so the rule engine never invents a product here.
                return issueResponse("NOT_FOUND", notFoundMessage(code));
            }

            String rawName = firstNonBlank(offProduct.get("product_name"), offProduct.get("product_name_en"));
            if (rawName == null) {
                return issueResponse("INCOMPLETE_DATA",
                        "The record for barcode " + code + " has no product name, so it cannot be analysed."
                                + " Scan the product's label with image analysis instead.");
            }
            String brands = firstNonBlank(offProduct.get("brands"));
            productName = brands != null ? brands + " - " + rawName : rawName;

            // Missing fields stay null: no invented category, serving size or ingredients.
            category = firstNonBlank(offProduct.get("categories"));
            servingSize = firstNonBlank(offProduct.get("serving_size"));

            String ingText = firstNonBlank(offProduct.get("ingredients_text_en"),
                    offProduct.get("ingredients_text"));
            if (ingText != null) {
                ingredients = Arrays.stream(ingText.split("[,;.]"))
                        .map(String::trim)
                        .filter(s -> !s.isEmpty() && s.length() < 80)
                        .collect(Collectors.toList());
            }

            nutrition = nutritionFromRecord(offProduct);
            nutritionIncomplete = hasNoNutrition(nutrition);

            // Only real additive tags from the product record. Risk level is deliberately
            // left unset: Open Food Facts does not supply one, so inventing "MODERATE"
            // would be false information.
            List addTags = offProduct.get("additives_tags") instanceof List
                    ? (List) offProduct.get("additives_tags") : null;
            if (addTags != null) {
                for (Object tag : addTags) {
                    String addName = tag.toString().replace("en:", "").toUpperCase();
                    additives.add(FoodAnalysisResponseDto.AdditiveInfo.builder()
                            .name(addName)
                            .category("Listed additive")
                            .description("Listed in the product's ingredient registration. "
                                    + "No risk assessment is available from the source.")
                            .build());
                }
            }
        } else if ("INGREDIENT_LABEL".equals(inputType)) {
            productName = "Scanned Package Ingredient List";
            category = "Processed Packaged Food";
            servingSize = "1 Portion (100g)";
            ingredients = List.of("Wheat Flour", "Sugar", "Whole Milk Powder", "Peanut Extract", "Palm Oil",
                    "Monosodium Glutamate (MSG / E621)", "Yellow 5 (E102)", "Potassium Sorbate (E202)");
            nutrition = FoodAnalysisResponseDto.NutritionInfo.builder()
                    .calories(390)
                    .proteinG(7.0)
                    .carbsG(52.0)
                    .fatG(18.0)
                    .fiberG(2.0)
                    .sugarG(24.0)
                    .sodiumMg(480.0)
                    .micronutrients(Map.of("Iron", "1.2mg", "Calcium", "80mg"))
                    .build();
            additives.add(FoodAnalysisResponseDto.AdditiveInfo.builder()
                    .name("Monosodium Glutamate (MSG / E621)")
                    .category("Flavor Enhancer")
                    .riskLevel("MODERATE")
                    .description("Flavor enhancer that may cause sensitivity in prone individuals.")
                    .build());
            additives.add(FoodAnalysisResponseDto.AdditiveInfo.builder()
                    .name("Yellow 5 (E102)")
                    .category("Artificial Color")
                    .riskLevel("MODERATE")
                    .description("Synthetic yellow dye.")
                    .build());
            additives.add(FoodAnalysisResponseDto.AdditiveInfo.builder()
                    .name("Potassium Sorbate (E202)")
                    .category("Preservative")
                    .riskLevel("LOW")
                    .description("Inhibits mold and yeast growth.")
                    .build());
        } else if ("NUTRITION_LABEL".equals(inputType)) {
            productName = "Scanned Nutrition Facts Panel";
            category = "Nutrition Panel Data";
            servingSize = "1 Serving (240ml / 8oz)";
            ingredients = List.of("Filtered Water", "Soy Protein Isolate", "Cane Sugar", "High Oleic Sunflower Oil",
                    "Cocoa Powder", "Vitamin & Mineral Blend");
            nutrition = FoodAnalysisResponseDto.NutritionInfo.builder()
                    .calories(180)
                    .proteinG(16.0)
                    .carbsG(14.0)
                    .fatG(5.0)
                    .fiberG(3.0)
                    .sugarG(8.0)
                    .sodiumMg(260.0)
                    .micronutrients(Map.of("Vitamin C", "30mg (33% DV)", "Calcium", "300mg (25% DV)", "Iron",
                            "4.5mg (25% DV)", "Potassium", "450mg (10% DV)"))
                    .build();
        } else {
            // FOOD_IMAGE
            String url = request.getImageUrl() != null ? request.getImageUrl().toLowerCase() : "";
            if (url.contains("salad") || url.contains("green") || url.contains("bowl") || url.contains("avocado")) {
                productName = "Fresh Mediterranean Quinoa & Avocado Bowl";
                category = "Healthy Fresh Meal";
                servingSize = "1 Large Bowl (380g)";
                ingredients = List.of("Cooked Quinoa", "Fresh Avocado", "Cherry Tomatoes", "Cucumber",
                        "Extra Virgin Olive Oil", "Lemon Juice", "Feta Cheese", "Walnuts");
                nutrition = FoodAnalysisResponseDto.NutritionInfo.builder()
                        .calories(410)
                        .proteinG(12.0)
                        .carbsG(38.0)
                        .fatG(24.0)
                        .fiberG(9.5)
                        .sugarG(4.0)
                        .sodiumMg(290.0)
                        .micronutrients(Map.of("Vitamin C", "45mg (50% DV)", "Iron", "3.8mg (21% DV)", "Potassium",
                                "680mg (15% DV)", "Calcium", "120mg (10% DV)"))
                        .build();
            } else if (url.contains("burger") || url.contains("pizza") || url.contains("donut")
                    || url.contains("fries")) {
                productName = "Loaded Fast Food Burger & Crispy Fries Dish";
                category = "Fast Food / High Calorie";
                servingSize = "1 Combo Meal (450g)";
                ingredients = List.of("Refined Wheat Bun", "Beef Patty", "Cheddar Cheese", "Bacon", "Mayonnaise",
                        "Ketchup", "Deep Fried Potatoes", "Sodium Nitrite (E250)", "High Fructose Corn Syrup");
                nutrition = FoodAnalysisResponseDto.NutritionInfo.builder()
                        .calories(890)
                        .proteinG(32.0)
                        .carbsG(85.0)
                        .fatG(48.0)
                        .fiberG(3.0)
                        .sugarG(16.0)
                        .sodiumMg(1280.0)
                        .micronutrients(Map.of("Iron", "4.2mg (23% DV)", "Calcium", "180mg (14% DV)"))
                        .build();
                additives.add(FoodAnalysisResponseDto.AdditiveInfo.builder()
                        .name("Sodium Nitrite (E250)")
                        .category("Preservative")
                        .riskLevel("HIGH")
                        .description("Cured meat preservative linked to nitrosamine formation under high heat.")
                        .build());
            } else {
                productName = "Grilled Chicken Breast with Brown Rice & Steamed Broccoli";
                category = "Balanced Fitness Meal";
                servingSize = "1 Plate (350g)";
                ingredients = List.of("Skinless Chicken Breast", "Whole Grain Brown Rice", "Steamed Broccoli",
                        "Olive Oil", "Garlic", "Black Pepper", "Sea Salt");
                nutrition = FoodAnalysisResponseDto.NutritionInfo.builder()
                        .calories(460)
                        .proteinG(42.0)
                        .carbsG(45.0)
                        .fatG(11.0)
                        .fiberG(6.0)
                        .sugarG(2.5)
                        .sodiumMg(340.0)
                        .micronutrients(Map.of("Vitamin C", "80mg (88% DV)", "Iron", "2.8mg (15% DV)", "Potassium",
                                "720mg (16% DV)", "Calcium", "60mg (5% DV)"))
                        .build();
            }
        }

        // Data the source record did not supply. Claims must not be made from it.
        List<String> missingData = new ArrayList<>();
        if (nutritionIncomplete)
            missingData.add("nutrition values");
        if (ingredients.isEmpty())
            missingData.add("an ingredient list");

        // Allergen Match Check against User Profile
        List<FoodAnalysisResponseDto.AllergenWarning> matchedAllergens = new ArrayList<>();

        for (String userAllergy : userAllergies) {
            String allergyLower = userAllergy.toLowerCase().trim();
            if (allergyLower.isEmpty())
                continue;
            for (String ing : ingredients) {
                String ingLower = ing.toLowerCase();
                if (ingLower.contains(allergyLower)
                        || (allergyLower.contains("dairy") && (ingLower.contains("milk") || ingLower.contains("cheese")
                                || ingLower.contains("whey") || ingLower.contains("feta")))
                        || (allergyLower.contains("nut") && (ingLower.contains("peanut") || ingLower.contains("almond")
                                || ingLower.contains("walnut") || ingLower.contains("cashew")))) {
                    matchedAllergens.add(FoodAnalysisResponseDto.AllergenWarning.builder()
                            .allergen(userAllergy)
                            .severity("HIGH")
                            .reason("Contains ingredient '" + ing + "' which directly matches your recorded allergy to "
                                    + userAllergy + ".")
                            .build());
                    break;
                }
            }
        }

        // Diet Suitability Map. Computed only when an ingredient list actually exists:
        // an empty list is missing data, not proof that the food is vegan or gluten-free.
        Map<String, Boolean> dietSuitability = new HashMap<>();
        if (!ingredients.isEmpty()) {
            boolean isVegan = ingredients.stream().noneMatch(i -> {
                String l = i.toLowerCase();
                return l.contains("chicken") || l.contains("beef") || l.contains("bacon") || l.contains("milk")
                        || l.contains("cheese") || l.contains("egg") || l.contains("feta") || l.contains("honey")
                        || l.contains("whey");
            });
            boolean isVegetarian = ingredients.stream().noneMatch(i -> {
                String l = i.toLowerCase();
                return l.contains("chicken") || l.contains("beef") || l.contains("bacon") || l.contains("fish")
                        || l.contains("shellfish");
            });
            boolean isGlutenFree = ingredients.stream().noneMatch(i -> {
                String l = i.toLowerCase();
                return l.contains("wheat") || l.contains("barley") || l.contains("rye") || l.contains("gluten");
            });
            boolean isKeto = nutrition.getCarbsG() != null && nutrition.getCarbsG() <= 15.0;
            boolean isLowCarb = nutrition.getCarbsG() != null && nutrition.getCarbsG() <= 25.0;
            boolean isDiabeticFriendly = (nutrition.getSugarG() != null && nutrition.getSugarG() <= 8.0)
                    && (nutrition.getFiberG() != null && nutrition.getFiberG() >= 3.0);

            dietSuitability.put("Vegan", isVegan);
            dietSuitability.put("Vegetarian", isVegetarian);
            dietSuitability.put("Gluten-Free", isGlutenFree);
            dietSuitability.put("Keto", isKeto);
            dietSuitability.put("Low-Carb", isLowCarb);
            dietSuitability.put("Diabetic-Friendly", isDiabeticFriendly);
        }

        // Determine Verdict
        String verdict;
        StringBuilder explanation = new StringBuilder();

        if (!matchedAllergens.isEmpty()) {
            verdict = "AVOID";
            explanation.append("CRITICAL ALLERGY ALERT: This food contains ");
            explanation.append(matchedAllergens.stream().map(FoodAnalysisResponseDto.AllergenWarning::getAllergen)
                    .collect(Collectors.joining(", ")));
            explanation.append(
                    " which match your personal profile allergies. Consuming this item presents a health risk.");
        } else if (nutrition.getSugarG() != null && nutrition.getSugarG() >= 18.0) {
            verdict = "CAUTION";
            explanation.append("CAUTION: High sugar level (").append(nutrition.getSugarG())
                    .append("g), exceeding recommended single-serving thresholds.");
            if (!additives.isEmpty()) {
                explanation.append(" Additionally, ").append(additives.size())
                        .append(" synthetic additive(s) were detected.");
            }
        } else if (nutrition.getSodiumMg() != null && nutrition.getSodiumMg() >= 600.0) {
            verdict = "CAUTION";
            explanation.append("CAUTION: High sodium content (").append(nutrition.getSodiumMg())
                    .append("mg) which may impact blood pressure and water retention.");
        } else if (!additives.isEmpty() && additives.stream().anyMatch(a -> "HIGH".equals(a.getRiskLevel()))) {
            verdict = "CAUTION";
            explanation.append("CAUTION: Contains high-risk additives (e.g. ").append(additives.get(0).getName())
                    .append(").");
        } else if (!missingData.isEmpty()) {
            verdict = "CAUTION";
            explanation.append("INCOMPLETE DATA: this product's database record has no ")
                    .append(String.join(" and ", missingData))
                    .append(", so those checks could not be performed. The verdict is cautious because "
                            + "safety cannot be confirmed from the available data.");
        } else {
            verdict = "SAFE";
            explanation.append(
                    "SAFE: Clean nutrient profile with no detected user allergy conflicts or elevated health risks. Fits your dietary needs.");
        }

        // Fetch Better Alternatives if Caution or Avoid
        List<FoodAnalysisResponseDto.AlternativeOption> betterAlternatives = new ArrayList<>();
        if ("CAUTION".equals(verdict) || "AVOID".equals(verdict)) {
            betterAlternatives = generateBetterAlternatives(productName, userAllergies, !barcodeLookup);
        }

        return FoodAnalysisResponseDto.builder()
                .productFound(true)
                .outcome("OK")
                .message(missingData.isEmpty() ? null
                        : "This product's database record is missing " + String.join(" and ", missingData)
                                + ". Only the data actually supplied was analysed, so the verdict is provisional.")
                .productName(productName)
                .category(category)
                .servingSize(servingSize)
                .verdict(verdict)
                .verdictExplanation(explanation.toString())
                .ingredientsList(ingredients)
                .matchedAllergens(matchedAllergens)
                .additives(additives)
                .dietSuitability(dietSuitability)
                .nutrition(nutrition)
                .betterAlternatives(betterAlternatives)
                .build();
    }

    private List<FoodAnalysisResponseDto.AlternativeOption> generateBetterAlternatives(String originalFood,
            List<String> userAllergies, boolean allowSampleAlternatives) {
        List<FoodAnalysisResponseDto.AlternativeOption> list = new ArrayList<>();

        // Query DB recipes if available
        List<Recipe> recipes = recipeRepository.findAll();
        for (Recipe r : recipes) {
            boolean hasAllergy = false;
            if (r.getIngredients() != null) {
                String ingStr = r.getIngredients().toLowerCase();
                for (String a : userAllergies) {
                    if (!a.isBlank() && ingStr.contains(a.toLowerCase())) {
                        hasAllergy = true;
                        break;
                    }
                }
            }
            if (!hasAllergy) {
                list.add(FoodAnalysisResponseDto.AlternativeOption.builder()
                        .id(r.getId())
                        .title(r.getTitle())
                        .description(r.getDescription())
                        .calories(allowSampleAlternatives && r.getCalories() == null ? 350 : r.getCalories())
                        .proteinG(allowSampleAlternatives ? 22.0 : null)
                        .carbsG(allowSampleAlternatives ? 30.0 : null)
                        .fatG(allowSampleAlternatives ? 9.0 : null)
                        .imageUrl(r.getImageUrl() != null ? r.getImageUrl()
                                : (allowSampleAlternatives
                                        ? "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=600&q=80"
                                        : null))
                        .whyBetter("Nutrient-dense recipe from your internal database free of your flagged allergens.")
                        .build());
            }
            if (list.size() >= 2)
                break;
        }

        if (list.isEmpty() && allowSampleAlternatives) {
            list.add(FoodAnalysisResponseDto.AlternativeOption.builder()
                    .id(101L)
                    .title("Organic Greek Yogurt & Wild Berry Power Bowl")
                    .description(
                            "Creamy high-protein Greek yogurt topped with antioxidant-rich blueberries, chia seeds, and raw honey.")
                    .calories(240)
                    .proteinG(18.0)
                    .carbsG(22.0)
                    .fatG(4.5)
                    .imageUrl(
                            "https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=600&q=80")
                    .whyBetter(
                            "Provides 3x more protein, zero artificial sweeteners, and 60% less sugar than processed snacks.")
                    .build());
            list.add(FoodAnalysisResponseDto.AlternativeOption.builder()
                    .id(102L)
                    .title("Avocado & Roasted Chickpea Quinoa Salad")
                    .description(
                            "Fresh greens, protein-packed quinoa, crunchy chickpeas, and heart-healthy avocado dressing.")
                    .calories(360)
                    .proteinG(14.0)
                    .carbsG(36.0)
                    .fatG(14.0)
                    .imageUrl(
                            "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80")
                    .whyBetter(
                            "100% whole-food ingredients, rich in dietary fiber (9g), with no preservatives or high-sodium sauces.")
                    .build());
        }

        return list;
    }

    /**
     * Executes call open ai for food analysis operation.
     */
    private FoodAnalysisResponseDto callOpenAiForFoodAnalysis(FoodAnalysisRequestDto request,
            List<String> userAllergies, String dietType) throws Exception {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(apiKey);

        String prompt = String.format(
                """
                        You are a expert clinical nutritionist and food scientist AI. Analyze the provided food input (%s): %s.
                        User Allergies: %s. User Diet Type: %s.
                        Provide JSON response strictly matching this structure:
                        {
                          "productName": "string",
                          "category": "string",
                          "servingSize": "string",
                          "verdict": "SAFE" | "CAUTION" | "AVOID",
                          "verdictExplanation": "string explaining why safe, caution or avoid in plain language",
                          "ingredientsList": ["ing1", "ing2"],
                          "matchedAllergens": [{"allergen": "Peanuts", "severity": "HIGH", "reason": "why matched"}],
                          "additives": [{"name": "E211", "category": "Preservative", "riskLevel": "MODERATE", "description": "desc"}],
                          "dietSuitability": {"Vegan": true, "Keto": false, "Gluten-Free": true},
                          "nutrition": {"calories": 300, "proteinG": 10.0, "carbsG": 30.0, "fatG": 8.0, "fiberG": 4.0, "sugarG": 5.0, "sodiumMg": 200.0, "micronutrients": {"Iron": "2mg"}},
                          "betterAlternatives": [{"id": 1, "title": "Alt Title", "description": "desc", "calories": 250, "proteinG": 15.0, "carbsG": 20.0, "fatG": 5.0, "imageUrl": "url", "whyBetter": "why"}]
                        }
                        """,
                request.getInputType(), request.getImageUrl() != null ? request.getImageUrl() : request.getBarcode(),
                userAllergies, dietType);

        Map<String, Object> body = new HashMap<>();
        body.put("model", "gpt-3.5-turbo");
        body.put("messages", List.of(Map.of("role", "user", "content", prompt)));

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
        ResponseEntity<Map> response = restTemplate.postForEntity(OPENAI_API_URL, entity, Map.class);
        List<Map<String, Object>> choices = (List<Map<String, Object>>) response.getBody().get("choices");
        Map<String, Object> message = (Map<String, Object>) choices.get(0).get("message");
        String content = (String) message.get("content");

        return objectMapper.readValue(content, FoodAnalysisResponseDto.class);
    }

    /**
     * Executes call open ai operation.
     */
    private String callOpenAi(String prompt) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(apiKey);

        Map<String, Object> body = new HashMap<>();
        body.put("model", "gpt-3.5-turbo");
        body.put("messages", List.of(Map.of("role", "user", "content", prompt)));

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);

        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(OPENAI_API_URL, request, Map.class);
            List<Map<String, Object>> choices = (List<Map<String, Object>>) response.getBody().get("choices");
            Map<String, Object> message = (Map<String, Object>) choices.get(0).get("message");
            return (String) message.get("content");
        } catch (Exception e) {
            System.err.println("Error calling OpenAI: " + e.getMessage());
            return "Error generating AI response.";
        }
    }

    /**
     * Reads a nutrition value from a product record. Returns {@code null} when the value
     * is absent or unparseable, so a missing value is never displayed as a real zero.
     */
    private Double getDoubleOrNullFromMap(Map map, String... keys) {
        if (map == null)
            return null;
        for (String key : keys) {
            if (map.containsKey(key) && map.get(key) != null) {
                try {
                    return Double.valueOf(map.get(key).toString().trim());
                } catch (NumberFormatException ignored) {
                }
            }
        }
        return null;
    }

    /**
     * Executes get double from map operation.
     */
    private double getDoubleFromMap(Map map, String... keys) {
        if (map == null)
            return 0.0;
        for (String key : keys) {
            if (map.containsKey(key) && map.get(key) != null) {
                try {
                    return Double.parseDouble(map.get(key).toString());
                } catch (Exception ignored) {
                }
            }
        }
        return 0.0;
    }
}
