/**
 * Diet and Allergen Filtering Utilities
 * Provides shared definitions, regex detection patterns, and matching functions
 * to evaluate user dietary restrictions and allergen safety against meal plans.
 */

/** List of supported allergen options mapped with UI labels and emoji icons. */
export const ALLERGEN_OPTIONS = [
    { id: 'Nuts', label: 'Nuts', icon: '🥜' },
    { id: 'Dairy', label: 'Dairy', icon: '🥛' },
    { id: 'Gluten', label: 'Gluten', icon: '🌾' },
    { id: 'Soy', label: 'Soy', icon: '🫘' },
    { id: 'Eggs', label: 'Eggs', icon: '🥚' },
    { id: 'Shellfish', label: 'Shellfish', icon: '🦐' },
    { id: 'Fish', label: 'Fish', icon: '🐟' },
    { id: 'Sesame', label: 'Sesame', icon: '🫛' },
    { id: 'Sulfites', label: 'Sulfites', icon: '🍷' }
];

/** List of supported dietary preferences and lifestyles. */
export const DIET_OPTIONS = [
    { id: 'Vegetarian', label: 'Vegetarian' },
    { id: 'Non-Vegetarian', label: 'Non-Veg' },
    { id: 'Vegan', label: 'Vegan' },
    { id: 'Eggetarian', label: 'Eggetarian' },
    { id: 'Pescatarian', label: 'Pescatarian' },
    { id: 'Keto', label: 'Keto' },
    { id: 'Paleo', label: 'Paleo' }
];

/** Regular expression patterns used to detect allergen keywords in ingredient text. */
const ALLERGEN_PATTERNS = {
    Nuts: /\b(nuts?|peanuts?|almonds?|cashews?|walnuts?|pistachios?|hazelnuts?|pecans?|macadamia)\b/i,
    Dairy: /\b(milk|cheese|yogh?urt|(?<!(peanut|almond|nut) )butter|cream|paneer|whey|ghee|curd|casein|kefir)\b/i,
    Gluten: /\b(wheat|bread|pasta|barley|rye|gluten|roti|chapati|naan|flour|couscous|seitan|semolina|noodles?)\b/i,
    Soy: /\b(soy|soya|tofu|tempeh|edamame|miso)\b/i,
    Eggs: /\b(eggs?|omelett?e|mayonnaise)\b/i,
    Shellfish: /\b(shrimps?|prawns?|crabs?|lobsters?|shellfish|oysters?|mussels?|clams?|scallops?)\b/i,
    Fish: /\b(fish|salmon|tuna|cod|sardines?|mackerel|tilapia|anchov(y|ies)|trout|halibut)\b/i,
    Sesame: /\b(sesame|tahini)\b/i,
    Sulfites: /\b(wine|sulfites?|sulphites?|dried fruits?|vinegar)\b/i
};

/** Regular expression detecting common meat and poultry ingredients. */
const MEAT_PATTERN = /\b(chicken|beef|pork|lamb|mutton|turkey|bacon|ham|sausages?|steak|meat|goat|duck|venison|salami|prosciutto)\b/i;
/** Regular expression detecting honey or related bee products. */
const HONEY_PATTERN = /\bhoney\b/i;

/**
 * Aggregates all searchable text (name, description, ingredients) from a meal item.
 * 
 * @param {Object|string} meal - Meal object or raw string
 * @returns {string} Concatenated text representation of the meal
 */
const mealText = (meal) => {
    if (!meal) return '';
    if (typeof meal === 'string') return meal;
    const ingredients = Array.isArray(meal.ingredients) ? meal.ingredients.join(' ') : (meal.ingredients || '');
    return `${meal.name || ''} ${meal.description || ''} ${ingredients}`;
};

/**
 * Extracts all searchable text across a complete diet plan.
 * 
 * @param {Object} plan - Diet plan object
 * @returns {string} Combined text across title, meal items, and notes
 */
const planFoodText = (plan) => {
    const meals = Array.isArray(plan.meals) ? plan.meals.map(mealText).join(' ') : '';
    return `${plan.title || plan.planTitle || ''} ${meals} ${plan.planText || ''}`;
};

/**
 * Tests whether a diet plan contains ingredients conflicting with a specific allergen.
 * 
 * @param {Object} plan - Diet plan object
 * @param {string} allergenId - Allergen identifier to test
 * @returns {boolean} True if the plan matches the allergen pattern
 */
export const planContainsAllergen = (plan, allergenId) => {
    const pattern = ALLERGEN_PATTERNS[allergenId];
    return pattern ? pattern.test(planFoodText(plan)) : false;
};

/**
 * Tests whether a diet plan complies with a chosen diet type, checking declared tags and ingredients.
 * 
 * @param {Object} plan - Diet plan object
 * @param {string} dietId - Diet type identifier
 * @returns {boolean} True if the plan is compliant with the diet
 */
export const planMatchesDiet = (plan, dietId) => {
    const declared = String(plan.dietType || '').toLowerCase();
    const food = planFoodText(plan);
    const hasMeat = MEAT_PATTERN.test(food);
    const hasSeafood = ALLERGEN_PATTERNS.Fish.test(food) || ALLERGEN_PATTERNS.Shellfish.test(food);

    switch (dietId) {
        case 'Vegetarian':
            return (declared.includes('vegetarian') && !declared.includes('non')) || (!hasMeat && !hasSeafood);
        case 'Eggetarian':
            return declared.includes('egg') || (!hasMeat && !hasSeafood);
        case 'Vegan':
            return declared.includes('vegan') || (!hasMeat && !hasSeafood
                && !ALLERGEN_PATTERNS.Dairy.test(food) && !ALLERGEN_PATTERNS.Eggs.test(food) && !HONEY_PATTERN.test(food));
        case 'Pescatarian':
            return declared.includes('pescatarian') || !hasMeat;
        case 'Non-Vegetarian':
            return declared.includes('non-veg') || declared.includes('non veg') || hasMeat || hasSeafood;
        default:
            return declared.includes(String(dietId).toLowerCase());
    }
};

/**
 * Parses stored allergies input (comma-separated string or array) into a clean list of identifiers.
 * 
 * @param {string|Array<string>} value - Stored allergy data
 * @returns {Array<string>} Filtered array of valid allergen names
 */
export const parseAllergies = (value) => {
    if (!value) return [];
    const list = Array.isArray(value) ? value : String(value).split(',');
    return list.map(s => String(s).trim()).filter(s => s && !/^(none|none reported|n\/a)$/i.test(s));
};
