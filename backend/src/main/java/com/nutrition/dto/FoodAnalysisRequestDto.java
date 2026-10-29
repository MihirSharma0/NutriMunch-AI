package com.nutrition.dto;

import lombok.Data;

/**
 * Data Transfer Object for submitting food images or barcode strings for AI nutrition analysis.
 */
@Data
public class FoodAnalysisRequestDto {
    private String inputType; // FOOD_IMAGE, INGREDIENT_LABEL, NUTRITION_LABEL, BARCODE
    private String imageUrl;
    private String imageData; // Base64 or image data
    private String barcode;
    private String customAllergies;
    private String dietType;
}
