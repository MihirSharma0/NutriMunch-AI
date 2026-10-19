ALTER TABLE appointments
    CHANGE COLUMN dietitian_id nutritionist_id BIGINT NULL;

UPDATE diet_plans
SET meals_json = REPLACE(
    REPLACE(
        REPLACE(
            REPLACE(
                REPLACE(meals_json, '"dietitianId"', '"nutritionistId"'),
                '"dietitianSpecialization"', '"nutritionistSpecialization"'
            ),
            '"dietitianName"', '"nutritionistName"'
        ),
        '"dietitianEmail"', '"nutritionistEmail"'
    ),
    '"dietitianCredentials"', '"nutritionistCredentials"'
)
WHERE meals_json IS NOT NULL;
