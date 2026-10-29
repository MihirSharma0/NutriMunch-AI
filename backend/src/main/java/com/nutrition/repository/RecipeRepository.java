package com.nutrition.repository;

import com.nutrition.entity.Recipe;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Spring Data JPA Repository for Recipe entities.
Manages meal recipe catalog records, macronutrient values, and culinary details.
 */
@Repository
public interface RecipeRepository extends JpaRepository<Recipe, Long> {
}
