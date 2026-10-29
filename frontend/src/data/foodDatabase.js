/**
 * Comprehensive Food Nutrition Repository for Manual Food Logging.
 * Standard servings mapped with calories (kcal), protein (g), carbs (g), fats (g), and fiber (g).
 */
export const FOOD_DATABASE = [
    // Grains, Rice & Breads
    { id: 'g1', name: 'Oatmeal (Cooked)', category: 'Grains', servingSize: '1 cup (234g)', calories: 158, protein: 6.0, carbs: 27.0, fats: 3.2, fiber: 4.0 },
    { id: 'g2', name: 'Rolled Oats (Raw)', category: 'Grains', servingSize: '1/2 cup (40g)', calories: 150, protein: 5.0, carbs: 27.0, fats: 2.5, fiber: 4.0 },
    { id: 'g3', name: 'Brown Rice (Cooked)', category: 'Grains', servingSize: '1 cup (195g)', calories: 216, protein: 5.0, carbs: 45.0, fats: 1.8, fiber: 3.5 },
    { id: 'g4', name: 'White Basmati Rice (Cooked)', category: 'Grains', servingSize: '1 cup (180g)', calories: 210, protein: 4.4, carbs: 46.0, fats: 0.5, fiber: 0.7 },
    { id: 'g5', name: 'Quinoa (Cooked)', category: 'Grains', servingSize: '1 cup (185g)', calories: 222, protein: 8.1, carbs: 39.4, fats: 3.6, fiber: 5.2 },
    { id: 'g6', name: 'Whole Wheat Bread', category: 'Breads', servingSize: '1 slice (40g)', calories: 82, protein: 4.0, carbs: 13.8, fats: 1.1, fiber: 2.0 },
    { id: 'g7', name: 'Multigrain Bread', category: 'Breads', servingSize: '1 slice (43g)', calories: 109, protein: 5.0, carbs: 18.0, fats: 1.8, fiber: 3.0 },
    { id: 'g8', name: 'Sourdough Bread', category: 'Breads', servingSize: '1 slice (50g)', calories: 120, protein: 4.5, carbs: 24.0, fats: 0.7, fiber: 1.2 },
    { id: 'g9', name: 'Plain Bagel', category: 'Breads', servingSize: '1 bagel (100g)', calories: 260, protein: 10.0, carbs: 53.0, fats: 1.5, fiber: 2.5 },
    { id: 'g10', name: 'Roti / Whole Wheat Chapati', category: 'Indian', servingSize: '1 medium (35g)', calories: 85, protein: 3.1, carbs: 17.5, fats: 0.5, fiber: 2.8 },
    { id: 'g11', name: 'Ghee Roti / Chapati', category: 'Indian', servingSize: '1 medium (40g)', calories: 120, protein: 3.1, carbs: 17.5, fats: 4.5, fiber: 2.8 },
    { id: 'g12', name: 'Plain Paratha', category: 'Indian', servingSize: '1 medium (60g)', calories: 180, protein: 4.0, carbs: 26.0, fats: 7.0, fiber: 3.2 },
    { id: 'g13', name: 'Aloo Paratha', category: 'Indian', servingSize: '1 medium (100g)', calories: 260, protein: 5.5, carbs: 38.0, fats: 10.0, fiber: 3.8 },
    { id: 'g14', name: 'Garlic Naan', category: 'Indian', servingSize: '1 piece (90g)', calories: 260, protein: 7.5, carbs: 44.0, fats: 6.0, fiber: 2.0 },
    { id: 'g15', name: 'Whole Wheat Pasta (Cooked)', category: 'Grains', servingSize: '1 cup (140g)', calories: 174, protein: 7.5, carbs: 37.0, fats: 0.8, fiber: 4.5 },
    { id: 'g16', name: 'White Spaghetti (Cooked)', category: 'Grains', servingSize: '1 cup (140g)', calories: 220, protein: 8.0, carbs: 43.0, fats: 1.3, fiber: 2.5 },
    { id: 'g17', name: 'Sweet Potato (Baked/Boiled)', category: 'Vegetables', servingSize: '1 medium (130g)', calories: 112, protein: 2.0, carbs: 26.0, fats: 0.1, fiber: 3.9 },
    { id: 'g18', name: 'Boiled Potato', category: 'Vegetables', servingSize: '1 medium (150g)', calories: 130, protein: 3.0, carbs: 30.0, fats: 0.2, fiber: 2.4 },
    { id: 'g19', name: 'Corn Tortilla', category: 'Breads', servingSize: '1 tortilla (30g)', calories: 65, protein: 1.5, carbs: 13.0, fats: 0.8, fiber: 1.6 },
    { id: 'g20', name: 'Flour Tortilla (Large)', category: 'Breads', servingSize: '1 wrap (65g)', calories: 200, protein: 5.0, carbs: 34.0, fats: 4.5, fiber: 1.5 },

    // Poultry, Meat & Seafood
    { id: 'p1', name: 'Grilled Chicken Breast', category: 'Protein', servingSize: '100g', calories: 165, protein: 31.0, carbs: 0.0, fats: 3.6, fiber: 0.0 },
    { id: 'p2', name: 'Boiled Chicken Breast', category: 'Protein', servingSize: '150g', calories: 240, protein: 46.0, carbs: 0.0, fats: 5.0, fiber: 0.0 },
    { id: 'p3', name: 'Chicken Thigh (Skinless, Roasted)', category: 'Protein', servingSize: '100g', calories: 180, protein: 24.0, carbs: 0.0, fats: 8.5, fiber: 0.0 },
    { id: 'p4', name: 'Chicken Tikka (Tandoori)', category: 'Indian', servingSize: '150g (6 pcs)', calories: 220, protein: 32.0, carbs: 4.0, fats: 8.0, fiber: 1.0 },
    { id: 'p5', name: 'Turkey Breast (Roasted)', category: 'Protein', servingSize: '100g', calories: 135, protein: 30.0, carbs: 0.0, fats: 1.5, fiber: 0.0 },
    { id: 'p6', name: 'Atlantic Salmon Fillet (Pan-seared)', category: 'Seafood', servingSize: '150g', calories: 310, protein: 34.0, carbs: 0.0, fats: 18.0, fiber: 0.0 },
    { id: 'p7', name: 'Canned Tuna (in Water)', category: 'Seafood', servingSize: '1 can drained (130g)', calories: 140, protein: 30.0, carbs: 0.0, fats: 1.0, fiber: 0.0 },
    { id: 'p8', name: 'Grilled Shrimp / Prawns', category: 'Seafood', servingSize: '100g', calories: 99, protein: 24.0, carbs: 0.2, fats: 0.3, fiber: 0.0 },
    { id: 'p9', name: 'Tilapia Fillet (Baked)', category: 'Seafood', servingSize: '120g', calories: 128, protein: 26.0, carbs: 0.0, fats: 2.7, fiber: 0.0 },
    { id: 'p10', name: 'Lean Sirloin Beef Steak (90% lean)', category: 'Protein', servingSize: '150g', calories: 260, protein: 39.0, carbs: 0.0, fats: 11.0, fiber: 0.0 },
    { id: 'p11', name: 'Ground Beef (85/15, Cooked)', category: 'Protein', servingSize: '100g', calories: 215, protein: 26.0, carbs: 0.0, fats: 12.0, fiber: 0.0 },
    { id: 'p12', name: 'Pork Tenderloin (Roasted)', category: 'Protein', servingSize: '100g', calories: 143, protein: 26.0, carbs: 0.0, fats: 3.5, fiber: 0.0 },

    // Eggs & Dairy
    { id: 'e1', name: 'Whole Boiled Egg', category: 'Eggs', servingSize: '1 large (50g)', calories: 72, protein: 6.3, carbs: 0.4, fats: 4.8, fiber: 0.0 },
    { id: 'e2', name: 'Egg White (Boiled)', category: 'Eggs', servingSize: '1 large (33g)', calories: 17, protein: 3.6, carbs: 0.2, fats: 0.1, fiber: 0.0 },
    { id: 'e3', name: 'Scrambled Eggs (2 eggs in butter)', category: 'Eggs', servingSize: '2 eggs (120g)', calories: 180, protein: 12.5, carbs: 1.5, fats: 14.0, fiber: 0.0 },
    { id: 'e4', name: 'Egg Omelette (with Onions & Herbs)', category: 'Eggs', servingSize: '2 eggs (130g)', calories: 190, protein: 13.0, carbs: 3.0, fats: 14.0, fiber: 0.5 },
    { id: 'e5', name: 'Paneer (Raw Indian Cottage Cheese)', category: 'Indian', servingSize: '100g', calories: 265, protein: 18.3, carbs: 3.4, fats: 20.8, fiber: 0.0 },
    { id: 'e6', name: 'Paneer Tikka (Grilled)', category: 'Indian', servingSize: '150g (5 cubes)', calories: 290, protein: 21.0, carbs: 6.0, fats: 20.0, fiber: 1.2 },
    { id: 'e7', name: 'Greek Yogurt (Plain 0% Nonfat)', category: 'Dairy', servingSize: '1 cup (170g)', calories: 100, protein: 18.0, carbs: 6.0, fats: 0.0, fiber: 0.0 },
    { id: 'e8', name: 'Greek Yogurt (Whole Milk)', category: 'Dairy', servingSize: '1 cup (170g)', calories: 170, protein: 15.0, carbs: 7.0, fats: 9.0, fiber: 0.0 },
    { id: 'e9', name: 'Cottage Cheese (Low Fat 2%)', category: 'Dairy', servingSize: '1 cup (226g)', calories: 180, protein: 24.0, carbs: 8.0, fats: 5.0, fiber: 0.0 },
    { id: 'e10', name: 'Cow Milk (Whole)', category: 'Dairy', servingSize: '1 glass (240ml)', calories: 150, protein: 8.0, carbs: 12.0, fats: 8.0, fiber: 0.0 },
    { id: 'e11', name: 'Cow Milk (Skim / Toned)', category: 'Dairy', servingSize: '1 glass (240ml)', calories: 90, protein: 8.5, carbs: 12.5, fats: 0.5, fiber: 0.0 },
    { id: 'e12', name: 'Unsweetened Almond Milk', category: 'Dairy', servingSize: '1 cup (240ml)', calories: 30, protein: 1.0, carbs: 1.0, fats: 2.5, fiber: 1.0 },
    { id: 'e13', name: 'Soy Milk (Organic Unsweetened)', category: 'Dairy', servingSize: '1 cup (240ml)', calories: 80, protein: 7.0, carbs: 4.0, fats: 4.0, fiber: 2.0 },
    { id: 'e14', name: 'Cheddar Cheese (Shredded)', category: 'Dairy', servingSize: '1/4 cup (28g)', calories: 110, protein: 7.0, carbs: 0.4, fats: 9.0, fiber: 0.0 },
    { id: 'e15', name: 'Mozzarella Cheese', category: 'Dairy', servingSize: '1 slice (28g)', calories: 85, protein: 6.3, carbs: 0.8, fats: 6.3, fiber: 0.0 },
    { id: 'e16', name: 'Whey Protein Isolate', category: 'Protein', servingSize: '1 scoop (30g)', calories: 120, protein: 25.0, carbs: 2.0, fats: 1.0, fiber: 0.5 },
    { id: 'e17', name: 'Plant-Based Protein Powder', category: 'Protein', servingSize: '1 scoop (34g)', calories: 130, protein: 22.0, carbs: 4.0, fats: 2.5, fiber: 2.0 },

    // Legumes, Lentils & Vegan Protein
    { id: 'l1', name: 'Dal Tadka (Yellow Moong/Toor)', category: 'Indian', servingSize: '1 bowl (180g)', calories: 160, protein: 9.0, carbs: 22.0, fats: 4.5, fiber: 6.0 },
    { id: 'l2', name: 'Dal Makhani', category: 'Indian', servingSize: '1 bowl (180g)', calories: 280, protein: 11.0, carbs: 26.0, fats: 14.0, fiber: 7.5 },
    { id: 'l3', name: 'Chana Masala (Chickpeas Curry)', category: 'Indian', servingSize: '1 bowl (200g)', calories: 230, protein: 11.0, carbs: 32.0, fats: 6.5, fiber: 8.0 },
    { id: 'l4', name: 'Rajma Masala (Kidney Beans Curry)', category: 'Indian', servingSize: '1 bowl (200g)', calories: 210, protein: 12.0, carbs: 30.0, fats: 5.0, fiber: 8.5 },
    { id: 'l5', name: 'Boiled Chickpeas (Garbanzo)', category: 'Legumes', servingSize: '1 cup (164g)', calories: 269, protein: 14.5, carbs: 45.0, fats: 4.2, fiber: 12.5 },
    { id: 'l6', name: 'Boiled Black Beans', category: 'Legumes', servingSize: '1 cup (172g)', calories: 227, protein: 15.2, carbs: 40.8, fats: 0.9, fiber: 15.0 },
    { id: 'l7', name: 'Boiled Red Lentils', category: 'Legumes', servingSize: '1 cup (198g)', calories: 230, protein: 17.8, carbs: 39.8, fats: 0.8, fiber: 15.6 },
    { id: 'l8', name: 'Tofu (Firm / Organic)', category: 'Vegan', servingSize: '100g', calories: 83, protein: 10.0, carbs: 2.0, fats: 5.0, fiber: 1.0 },
    { id: 'l9', name: 'Tempeh (Pan-seared)', category: 'Vegan', servingSize: '100g', calories: 195, protein: 20.0, carbs: 8.0, fats: 11.0, fiber: 5.0 },
    { id: 'l10', name: 'Edamame (Steamed, in Pod)', category: 'Vegan', servingSize: '1 cup (155g)', calories: 188, protein: 18.5, carbs: 13.8, fats: 8.0, fiber: 8.0 },

    // Indian Popular Dishes & Breakfast
    { id: 'in1', name: 'Plain Idli (Steamed)', category: 'Indian', servingSize: '2 pcs (70g)', calories: 120, protein: 3.8, carbs: 25.0, fats: 0.5, fiber: 1.5 },
    { id: 'in2', name: 'Plain Dosa (Thin & Crisp)', category: 'Indian', servingSize: '1 medium (80g)', calories: 140, protein: 3.5, carbs: 24.0, fats: 3.5, fiber: 1.5 },
    { id: 'in3', name: 'Masala Dosa with Potato Filling', category: 'Indian', servingSize: '1 large (150g)', calories: 280, protein: 6.0, carbs: 42.0, fats: 10.0, fiber: 3.5 },
    { id: 'in4', name: 'Vegetable Upma', category: 'Indian', servingSize: '1 bowl (150g)', calories: 180, protein: 4.5, carbs: 28.0, fats: 5.5, fiber: 3.0 },
    { id: 'in5', name: 'Kanda Poha (Flattened Rice)', category: 'Indian', servingSize: '1 bowl (150g)', calories: 190, protein: 4.0, carbs: 32.0, fats: 5.0, fiber: 2.5 },
    { id: 'in6', name: 'Moong Dal Khichdi', category: 'Indian', servingSize: '1 bowl (200g)', calories: 220, protein: 8.5, carbs: 36.0, fats: 4.5, fiber: 5.0 },
    { id: 'in7', name: 'Chicken Biryani (Homestyle)', category: 'Indian', servingSize: '1 plate (300g)', calories: 420, protein: 26.0, carbs: 54.0, fats: 12.0, fiber: 3.0 },
    { id: 'in8', name: 'Vegetable Biryani', category: 'Indian', servingSize: '1 plate (280g)', calories: 340, protein: 7.0, carbs: 56.0, fats: 10.0, fiber: 5.5 },
    { id: 'in9', name: 'Palak Paneer', category: 'Indian', servingSize: '1 bowl (180g)', calories: 240, protein: 12.0, carbs: 8.0, fats: 18.0, fiber: 4.5 },
    { id: 'in10', name: 'Aloo Gobi', category: 'Indian', servingSize: '1 bowl (160g)', calories: 140, protein: 3.5, carbs: 20.0, fats: 5.5, fiber: 4.0 },
    { id: 'in11', name: 'Bhindi Masala (Okra)', category: 'Indian', servingSize: '1 bowl (150g)', calories: 120, protein: 3.0, carbs: 14.0, fats: 6.0, fiber: 4.5 },
    { id: 'in12', name: 'Mixed Vegetable Sambar', category: 'Indian', servingSize: '1 bowl (200g)', calories: 110, protein: 5.0, carbs: 18.0, fats: 2.5, fiber: 4.0 },
    { id: 'in13', name: 'Cucumber Onion Raita', category: 'Indian', servingSize: '1 bowl (120g)', calories: 75, protein: 4.0, carbs: 6.0, fats: 3.5, fiber: 1.0 },

    // Fruits & Berries
    { id: 'f1', name: 'Banana (Fresh)', category: 'Fruits', servingSize: '1 medium (118g)', calories: 105, protein: 1.3, carbs: 27.0, fats: 0.3, fiber: 3.1 },
    { id: 'f2', name: 'Apple (with Skin)', category: 'Fruits', servingSize: '1 medium (182g)', calories: 95, protein: 0.5, carbs: 25.0, fats: 0.3, fiber: 4.4 },
    { id: 'f3', name: 'Strawberries (Fresh)', category: 'Fruits', servingSize: '1 cup (150g)', calories: 49, protein: 1.0, carbs: 11.7, fats: 0.5, fiber: 3.0 },
    { id: 'f4', name: 'Blueberries (Fresh)', category: 'Fruits', servingSize: '1 cup (148g)', calories: 84, protein: 1.1, carbs: 21.4, fats: 0.5, fiber: 3.6 },
    { id: 'f5', name: 'Hass Avocado', category: 'Fruits', servingSize: '1/2 avocado (100g)', calories: 160, protein: 2.0, carbs: 8.5, fats: 14.7, fiber: 6.7 },
    { id: 'f6', name: 'Orange', category: 'Fruits', servingSize: '1 medium (131g)', calories: 62, protein: 1.2, carbs: 15.4, fats: 0.2, fiber: 3.1 },
    { id: 'f7', name: 'Mango Slices', category: 'Fruits', servingSize: '1 cup (165g)', calories: 99, protein: 1.4, carbs: 24.7, fats: 0.6, fiber: 2.6 },
    { id: 'f8', name: 'Pineapple Chunks', category: 'Fruits', servingSize: '1 cup (165g)', calories: 82, protein: 0.9, carbs: 21.6, fats: 0.2, fiber: 2.3 },
    { id: 'f9', name: 'Watermelon (Diced)', category: 'Fruits', servingSize: '1 cup (154g)', calories: 46, protein: 0.9, carbs: 11.5, fats: 0.2, fiber: 0.6 },
    { id: 'f10', name: 'Papaya Cubes', category: 'Fruits', servingSize: '1 cup (145g)', calories: 62, protein: 0.7, carbs: 15.7, fats: 0.4, fiber: 2.5 },
    { id: 'f11', name: 'Guava', category: 'Fruits', servingSize: '1 medium (100g)', calories: 68, protein: 2.6, carbs: 14.3, fats: 1.0, fiber: 5.4 },
    { id: 'f12', name: 'Pomegranate Seeds', category: 'Fruits', servingSize: '1/2 cup (87g)', calories: 72, protein: 1.5, carbs: 16.3, fats: 1.0, fiber: 3.5 },

    // Vegetables & Greens
    { id: 'v1', name: 'Raw Baby Spinach', category: 'Vegetables', servingSize: '2 cups (60g)', calories: 14, protein: 1.7, carbs: 2.2, fats: 0.2, fiber: 1.3 },
    { id: 'v2', name: 'Steamed Broccoli', category: 'Vegetables', servingSize: '1 cup (150g)', calories: 55, protein: 3.7, carbs: 11.2, fats: 0.6, fiber: 5.1 },
    { id: 'v3', name: 'Steamed Cauliflower', category: 'Vegetables', servingSize: '1 cup (124g)', calories: 28, protein: 2.3, carbs: 5.1, fats: 0.5, fiber: 2.9 },
    { id: 'v4', name: 'Sliced Cucumber', category: 'Vegetables', servingSize: '1 cup (104g)', calories: 16, protein: 0.7, carbs: 3.8, fats: 0.1, fiber: 0.5 },
    { id: 'v5', name: 'Sliced Carrots', category: 'Vegetables', servingSize: '1 cup (128g)', calories: 52, protein: 1.2, carbs: 12.3, fats: 0.3, fiber: 3.6 },
    { id: 'v6', name: 'Bell Peppers (Assorted)', category: 'Vegetables', servingSize: '1 cup chopped (150g)', calories: 30, protein: 1.3, carbs: 6.9, fats: 0.3, fiber: 2.5 },
    { id: 'v7', name: 'White Mushrooms (Sliced)', category: 'Vegetables', servingSize: '1 cup (70g)', calories: 15, protein: 2.2, carbs: 2.3, fats: 0.2, fiber: 0.7 },
    { id: 'v8', name: 'Grilled Asparagus', category: 'Vegetables', servingSize: '6 spears (90g)', calories: 20, protein: 2.2, carbs: 3.7, fats: 0.2, fiber: 1.8 },
    { id: 'v9', name: 'Kale (Raw/Chopped)', category: 'Vegetables', servingSize: '1 cup (67g)', calories: 33, protein: 2.9, carbs: 6.0, fats: 0.6, fiber: 1.3 },
    { id: 'v10', name: 'Green Beans (Steamed)', category: 'Vegetables', servingSize: '1 cup (125g)', calories: 44, protein: 2.4, carbs: 9.9, fats: 0.4, fiber: 4.0 },

    // Nuts, Seeds & Healthy Fats
    { id: 'n1', name: 'Whole Raw Almonds', category: 'Nuts & Seeds', servingSize: '1 oz (28g / ~23 nuts)', calories: 164, protein: 6.0, carbs: 6.1, fats: 14.2, fiber: 3.5 },
    { id: 'n2', name: 'Walnut Halves', category: 'Nuts & Seeds', servingSize: '1 oz (28g / ~14 halves)', calories: 185, protein: 4.3, carbs: 3.9, fats: 18.5, fiber: 1.9 },
    { id: 'n3', name: 'Roasted Cashews', category: 'Nuts & Seeds', servingSize: '1 oz (28g)', calories: 157, protein: 5.2, carbs: 8.6, fats: 12.4, fiber: 0.9 },
    { id: 'n4', name: 'Roasted Peanuts', category: 'Nuts & Seeds', servingSize: '1 oz (28g)', calories: 161, protein: 7.3, carbs: 4.6, fats: 14.0, fiber: 2.4 },
    { id: 'n5', name: 'Natural Peanut Butter', category: 'Nuts & Seeds', servingSize: '2 tbsp (32g)', calories: 190, protein: 8.0, carbs: 7.0, fats: 16.0, fiber: 2.0 },
    { id: 'n6', name: 'Chia Seeds', category: 'Nuts & Seeds', servingSize: '2 tbsp (24g)', calories: 120, protein: 4.0, carbs: 10.0, fats: 7.5, fiber: 8.0 },
    { id: 'n7', name: 'Flaxseeds (Ground)', category: 'Nuts & Seeds', servingSize: '2 tbsp (14g)', calories: 75, protein: 2.6, carbs: 4.0, fats: 6.0, fiber: 3.8 },
    { id: 'n8', name: 'Pumpkin Seeds (Pepitas)', category: 'Nuts & Seeds', servingSize: '1 oz (28g)', calories: 151, protein: 7.0, carbs: 5.0, fats: 13.0, fiber: 1.7 },
    { id: 'n9', name: 'Extra Virgin Olive Oil', category: 'Oils & Fats', servingSize: '1 tbsp (14g)', calories: 120, protein: 0.0, carbs: 0.0, fats: 14.0, fiber: 0.0 },
    { id: 'n10', name: 'Pure Desi Ghee', category: 'Oils & Fats', servingSize: '1 tbsp (14g)', calories: 120, protein: 0.0, carbs: 0.0, fats: 14.0, fiber: 0.0 },
    { id: 'n11', name: 'Dark Chocolate (85% Cocoa)', category: 'Snacks', servingSize: '1 square (30g)', calories: 170, protein: 3.0, carbs: 13.0, fats: 14.0, fiber: 3.0 },

    // Beverages & Common Snacks
    { id: 'b1', name: 'Green Tea (Unsweetened)', category: 'Beverages', servingSize: '1 cup (240ml)', calories: 2, protein: 0.2, carbs: 0.2, fats: 0.0, fiber: 0.0 },
    { id: 'b2', name: 'Black Coffee (No Sugar)', category: 'Beverages', servingSize: '1 cup (240ml)', calories: 2, protein: 0.3, carbs: 0.0, fats: 0.0, fiber: 0.0 },
    { id: 'b3', name: 'Chai with Milk & Sugar', category: 'Beverages', servingSize: '1 cup (150ml)', calories: 85, protein: 2.5, carbs: 12.0, fats: 3.0, fiber: 0.0 },
    { id: 'b4', name: 'Fresh Coconut Water', category: 'Beverages', servingSize: '1 cup (240ml)', calories: 45, protein: 1.7, carbs: 8.9, fats: 0.5, fiber: 2.6 },
    { id: 'b5', name: 'Fresh Orange Juice', category: 'Beverages', servingSize: '1 glass (240ml)', calories: 112, protein: 1.7, carbs: 25.8, fats: 0.5, fiber: 0.5 },
    { id: 'b6', name: 'Protein Bar', category: 'Snacks', servingSize: '1 bar (60g)', calories: 210, protein: 20.0, carbs: 22.0, fats: 7.0, fiber: 10.0 },
    { id: 'b7', name: 'Air-popped Popcorn', category: 'Snacks', servingSize: '3 cups (24g)', calories: 92, protein: 3.0, carbs: 18.6, fats: 1.1, fiber: 3.6 },
    { id: 'b8', name: 'Roasted Makhana (Fox Nuts)', category: 'Snacks', servingSize: '1 bowl (35g)', calories: 125, protein: 3.5, carbs: 24.0, fats: 1.5, fiber: 2.5 }
];

/**
 * High-speed search utility supporting multi-token matching, category filtering, and ranking.
 * 
 * @param {string} query - The search query term
 * @param {number} [limit=15] - Maximum number of matching food items to return
 * @returns {Array<Object>} Sorted list of matching food records
 */
export const searchFoodDatabase = (query, limit = 15) => {
    if (!query || typeof query !== 'string' || !query.trim()) {
        return [];
    }

    const cleanQuery = query.toLowerCase().trim();
    const tokens = cleanQuery.split(/\s+/).filter(Boolean);

    const matches = FOOD_DATABASE.filter(item => {
        const itemName = item.name.toLowerCase();
        const itemCat = item.category.toLowerCase();

        // Exact match has highest priority
        if (itemName === cleanQuery) return true;

        // Check if all tokens match either the name or category
        return tokens.every(token => itemName.includes(token) || itemCat.includes(token));
    });

    // Score & sort results: exact prefix match first, then substring
    matches.sort((a, b) => {
        const nameA = a.name.toLowerCase();
        const nameB = b.name.toLowerCase();

        const aStarts = nameA.startsWith(cleanQuery);
        const bStarts = nameB.startsWith(cleanQuery);

        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;

        return nameA.localeCompare(nameB);
    });

    return matches.slice(0, limit);
};
