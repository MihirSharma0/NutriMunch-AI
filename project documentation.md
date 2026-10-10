# NutriMunch AI — Complete Project Documentation

## 1. Project Overview

**Name:** NutriMunch AI (Nutrition-AI-Platform)
**Type:** AI-powered personalized food & nutrition assistant
**Architecture:** 3-tier client-server
- **Client:** React 18+ (Vite)
- **Server:** Spring Boot 3.x (Java 17+), Spring Web, Spring Security, Spring Data JPA
- **Database:** PostgreSQL/MySQL
- **Auth:** JWT (stateless) + optional email OTP second factor
- **AI/OCR:** External or self-hosted OCR + LLM/vision provider
- **Containerization:** Docker + Docker Compose for local orchestration
- **CI/CD:** GitHub Actions (separate client/server pipelines)

**Purpose:** Users get personalized nutrition targets, analyze food (image/barcode/label) for safety, track daily intake, receive AI-generated meal plans within budget, get real-time nutrition gap alerts, chat with an AI nutrition assistant, and optionally consult verified nutritionists. Admins manage users, content databases, and AI rules.

---

## 2. Project Structure

```
nutrition-ai-platform/
├── client/                       # React Frontend
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── services/             # API call wrappers
│   │   ├── context/               # Auth/user context
│   │   ├── utils/
│   │   └── App.jsx
│   ├── package.json
│   ├── vite.config.js
│   └── Dockerfile
│
├── server/                       # Spring Boot Backend
│   ├── src/main/java/com/nutritionai/
│   │   ├── auth/                 # Registration, login, OTP, JWT
│   │   ├── user/                 # Profile, preferences
│   │   ├── nutrition/            # Nutrition engine, targets
│   │   ├── analyzer/             # AI Food Analyzer (OCR, verdict)
│   │   ├── tracker/              # Food/water/protein logs
│   │   ├── mealplanner/          # Meal plan generation, grocery list
│   │   ├── recommendation/       # "What Should I Eat?" engine
│   │   ├── gapdetection/         # Nutrition gap detection
│   │   ├── assistant/            # AI chat assistant
│   │   ├── nutritionist/         # Nutritionist marketplace
│   │   ├── analytics/            # Trends & progress
│   │   ├── admin/                # Admin panel APIs
│   │   ├── common/               # Shared DTOs, exceptions, config
│   │   └── NutritionAiApplication.java
│   ├── src/main/resources/
│   │   └── application.yml
│   ├── pom.xml
│   └── Dockerfile
│
├── database/                     # SQL Database Config & Migrations
│   ├── init/
│   │   ├── 01_schema.sql
│   │   └── 02_seed_data.sql
│   └── flyway/                   # versioned migrations post-launch
│
├── docs/
│   ├── api-collection.json       # Postman/Insomnia collection
│   ├── architecture.md
│   └── setup-guide.md
│
├── .github/workflows/
│   ├── deploy-client.yml
│   └── deploy-server.yml
│
├── docker-compose.yml
├── .env.example
├── .gitignore
└── README.md
```

---

## 3. Environment Variables (`.env.example`)

```
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=nutrition_ai
DB_USER=postgres
DB_PASSWORD=changeme

# Auth
JWT_SECRET=changeme_long_random_secret
JWT_EXPIRY_MINUTES=60
JWT_REFRESH_EXPIRY_DAYS=7
OTP_ENABLED=true
OTP_EXPIRY_MINUTES=10

# Mail (OTP / password reset)
MAIL_HOST=smtp.company.com
MAIL_PORT=587
MAIL_USERNAME=noreply@company.com
MAIL_PASSWORD=changeme

# AI / OCR Providers
AI_PROVIDER_API_KEY=changeme
OCR_PROVIDER_API_KEY=changeme

# Client
VITE_API_BASE_URL=http://localhost:8080/api/v1
```

---

## 4. User Roles

| Role | Description |
|---|---|
| **User** | General consumer. Builds profile, gets nutrition targets, analyzes food, tracks intake, gets meal plans/recommendations, can consult nutritionists. |
| **Nutritionist** | Professional. Registers → Admin verifies → can view consenting users' data and issue professional plans. |
| **Admin** | Internal staff. Manages users/nutritionists, food/additive/allergen databases, AI rules, and system analytics. Not self-registrable. |

---

## 5. Functional Requirements by Module

### Module 1 — Authentication & Account Management
- Users register with name, email, password.
- If OTP is enabled (Admin toggle), send a one-time code from a company email; account activates only after correct OTP entry.
- Admin can enable/disable OTP verification globally at runtime (no redeploy).
- Login returns a JWT; logout invalidates the session.
- "Forgot Password" sends a secure, time-limited reset link/OTP.
- Authenticated users can change password (must re-enter current password).
- Nutritionist registration requires professional details (credentials, specialization) and stays "Pending Verification" until Admin approval.
- Nutritionist can edit their public profile once verified.
- RBAC enforced at API layer for User/Nutritionist/Admin.
- Admin accounts are provisioned internally, not via public registration.

**Business rules:** Passwords hashed with bcrypt/Argon2, never logged in plaintext. OTPs expire (default 10 min), single-use. Nutritionist-only features blocked until verification = Approved.

### Module 2 — User Profile & Personalization
- Personal info: name, age, gender, height, weight.
- Activity level: Sedentary / Lightly Active / Moderately Active / Very Active / Highly Active-Athlete.
- Goal: General Nutrition / Weight Loss / Weight Maintenance / Muscle Gain / Strength-Performance.
- Diet type: Vegetarian / Non-Vegetarian / Vegan / Other.
- Allergies: predefined list (Milk, Nuts, Gluten, Soy, Egg) + free-text custom allergies.
- Food preferences: favorites, dislikes, taste, cuisine.
- Food Budget Profile: Lifestyle Class (Middle-Class / High-Income Class) + Preferred Meal Budget (Budget/Affordable or High/Premium).
- Any profile update triggers immediate recalculation of nutrition targets.
- Input validation on physiological ranges (age, height, weight).

### Module 3 — Personalized Nutrition Requirement Engine
- Calculate Daily Calorie Target (BMR/TDEE methodology using age, gender, height, weight, activity level).
- Calculate Protein/Carb/Fat targets (grams) from calorie target + goal.
- Calculate Daily Fiber Target and Daily Water Target (from body weight + activity).
- Estimate micronutrient targets: Iron, Calcium, Vitamin D, Vitamin B12, Vitamin C, Magnesium, Potassium, Zinc.
- Apply goal-based adjustments (Weight Loss / Maintenance / Muscle Gain / Strength-Performance / General Nutrition).
- Auto-recalculate on relevant profile changes.
- Admin can tune calculation coefficients via AI/Recommendation Rules without code changes.

### Module 4 — AI Food Analyzer
**Input:** food image (camera/upload), barcode scan, ingredient-label image, nutrition-label image.

**Processing:**
- Food/product recognition via AI vision model.
- OCR extracts ingredients, nutrition values, product info, serving size.
- Ingredient detection/classification + diet-type suitability check.
- Additive analysis: preservatives, artificial colors, sweeteners, flavor enhancers, other.
- Allergen detection compared against user's recorded allergies → explicit warning on match.
- Nutrition analysis: calories, protein, carbs, fat, fiber, sugar, sodium, micronutrients.

**Verdict:**
- 🟢 **Safe** — suitable, no relevant allergen, fits diet, fits requirements.
- 🟡 **Caution** — high sugar/sodium/fat, additive concern, or personal-preference concern.
- 🔴 **Avoid** — relevant allergen detected, diet conflict, personal restriction, or major concern.
- Always include a plain-language Verdict Explanation (why safe/caution/avoid).
- On Caution/Avoid, suggest at least one Better Alternative from the Food Database.

### Module 5 — Food & Nutrition Tracker
- Log meals under Breakfast / Lunch / Snacks / Dinner.
- Logging methods: text search, barcode scan, image upload, manual entry.
- Water intake logged incrementally.
- Display Target / Consumed / Remaining for calories, protein, carbs, fat, fiber, water — updated immediately per log.
- Edit/delete past entries with automatic recalculation.
- Retain historical logs (timestamped) for Analytics.

### Module 6 — Protein Tracker
- Daily Protein Target / Consumed / Remaining + progress indicator.
- Categorize sources: Dairy (Milk, Curd, Paneer, Greek Yogurt), Plant-Based (Soy, Tofu, Lentils, Chickpeas, Beans), Non-Vegetarian (Eggs, Chicken, Fish, Meat).
- Filter suggestions by diet type (exclude non-veg sources for vegetarians, etc.).
- Updates in real time as food is logged (Module 5).

### Module 7 — AI Meal Planner
- Plans differentiated by Lifestyle Class (Middle-Class / High-Income Class), each with Budget and High-Budget variants.
- Daily Meal Plan: Breakfast, Mid-Morning, Lunch, Evening Snack, Dinner.
- Weekly Meal Plan: Monday–Sunday, built from daily plans.
- Aligned to goal (Weight Loss / Maintenance / Muscle Gain / Performance).
- Matches calorie/protein/carb/fat/fiber/micronutrient targets within tolerance.
- Budget tier drives ingredient/meal selection (low-cost vs. premium).
- Auto-generate Smart Grocery List: ingredients, quantity, estimated cost, budget status (within/over budget).
- Allow swapping/regenerating individual meals while preserving nutrition/budget targets.
- Allow marking plan items complete → feeds Analytics adherence tracking.

### Module 8 — "What Should I Eat?"
- Inputs: Hunger Level, Mood/Feeling, Craving, optional Available Ingredients, Diet Preference, Allergies, Budget.
- Computes Remaining Nutrition at request time (calories, protein, carbs, fat, fiber, water).
- Returns ONE Personalized Recommendation: food/meal, portion suggestion, nutrition contribution, estimated cost, reason for recommendation.
- Allow requesting an alternative if the first isn't acceptable.

### Module 9 — Nutrition Gap Detection
- Continuously compares Target vs. Actual Intake across calories, protein, carbs, fat, fiber, water, micronutrients.
- Identifies gaps per dimension.
- Classifies gaps as Important / Moderate / Minor (based on % unmet + time remaining in day).
- Matches gaps against Food Database (Food Matching) and composite meals (Meal Matching), respecting Budget.
- Updates immediately after any new food log.

### Module 10 — AI Food Assistant
- Conversational chat for free-text nutrition questions.
- Suggests recipes and meal ideas.
- Explains nutrition concepts and reasoning behind targets/verdicts.
- Suggests alternatives respecting diet, allergies, budget.
- Personalizes responses using user profile, targets, and remaining nutrition.

### Module 11 — Nutritionist Module
- Search nutritionists by specialization, rating, availability.
- View nutritionist profile: credentials, specialization, aggregate rating.
- Submit ratings/reviews after consultation.
- Submit a Consultation Request to a chosen nutritionist.
- On acceptance, exchange contact details for further communication (no in-app messaging/payment in v1).
- Nutritionist can only view a user's Nutrition Targets, Food Logs, Progress after explicit, revocable consent (DataSharingConsent).
- Verified nutritionist can issue a Professional Plan (meal plan, diet plan, recommendations) to a consenting client.

### Module 12 — Analytics & Progress
- Daily / Weekly / Monthly analytics views.
- Nutrition Trends charts: calories, protein, carbs, fat, fiber, water.
- Goal Progress: Weight Progress, Nutrition Progress, Meal Adherence, Overall Progress.
- Optional export/view of summarized progress report for a date range.

### Module 13 — User Dashboard
- Calories (Target/Consumed/Remaining) with Daily/Weekly/Monthly views.
- Current-day Protein, Carbs, Fat, Fiber, Water status.
- Today's Meals list.
- Quick links: "What Should I Eat?", Today's Meal Plan, Nutrition Gaps, Food Analyzer, AI Assistant.
- Surfaces highest-priority Nutrition Gap prominently.

### Module 14 — Admin Panel
- **User Management:** view/add/edit/delete users; view activity logs.
- **Nutritionist Management:** review pending registrations, approve/reject, suspend/remove verified nutritionists.
- **Food Database:** manage food items, nutrition per 100g, ingredients, recipes.
- **Additive Database:** manage additive name/type/analysis rules.
- **Allergen Database:** manage allergen name/related ingredients/detection rules.
- **AI/Recommendation Rules:** configure Nutrition/Food/Allergen/Diet/Budget rules driving Analyzer, Meal Planner, "What Should I Eat?".
- **System Analytics:** platform-wide user stats, food analysis stats, meal planner usage, system reports.

---

## 6. Data Model (SQL-style Schema Outline)

```sql
-- USERS & AUTH
users (id, name, email, password_hash, role ENUM('USER','NUTRITIONIST','ADMIN'), otp_verified, created_at)

user_profiles (
  user_id FK, age, gender, height, weight,
  activity_level, goal, diet_type,
  lifestyle_class, budget_tier
)

allergies (id, user_id FK, allergen_id FK NULLABLE, custom_name)
food_preferences (id, user_id FK, favorite_foods, disliked_foods, cuisine_preference)

-- NUTRITION ENGINE
nutrition_targets (id, user_id FK, date, calories, protein_g, carbs_g, fat_g, fiber_g, water_ml, micronutrients_json)

-- FOOD DATABASE
food_items (id, name, category, cost_estimate, nutrition_per_100g_json, is_active)
ingredients (id, food_item_id FK, name, is_allergen, additive_type)
allergens (id, name, related_ingredients, detection_rules_json)
additives (id, name, additive_type, analysis_rules_json)

-- TRACKING
food_logs (id, user_id FK, food_item_id FK NULLABLE, meal_type, quantity, logged_at, source)
water_logs (id, user_id FK, amount_ml, logged_at)
analysis_results (id, user_id FK, food_item_id FK NULLABLE, input_type, verdict, explanation, alternative_food_id, created_at)

-- MEAL PLANNING
meal_plans (id, user_id FK, plan_type, lifestyle_class, budget_tier, goal, start_date)
meal_plan_items (id, meal_plan_id FK, day_of_week, slot, food_item_id FK, quantity)
grocery_lists (id, meal_plan_id FK, generated_at, total_estimated_cost, budget_status)
grocery_list_items (id, grocery_list_id FK, ingredient_name, quantity, estimated_cost)

-- GAP DETECTION
nutrition_gaps (id, user_id FK, date, gap_type, amount, priority)

-- NUTRITIONIST
nutritionists (user_id FK PK, credentials, specialization, verification_status, bio)
consultation_requests (id, user_id FK, nutritionist_id FK, status, requested_at, responded_at)
ratings (id, user_id FK, nutritionist_id FK, score, review_text, created_at)
professional_plans (id, nutritionist_id FK, user_id FK, plan_type, content_json, issued_at)
data_sharing_consents (id, user_id FK, nutritionist_id FK, scope, granted_at, revoked_at)

-- AI ASSISTANT
chat_messages (id, user_id FK, role ENUM('user','assistant'), content, created_at)

-- ADMIN
ai_rule_configs (id, rule_category, rule_json, updated_by FK, updated_at)
system_analytics_snapshots (id, metric_type, period, value_json, generated_at)
```

**Key relationships:**
- User 1—1 UserProfile; 1—1 NutritionTarget per date
- User 1—N FoodLog, WaterLog, AnalysisResult, MealPlan, NutritionGap, ChatMessage
- MealPlan 1—N MealPlanItem; 1—1(optional) GroceryList 1—N GroceryListItem
- FoodItem 1—N Ingredient; Ingredient N—1 Allergen/Additive
- Nutritionist extends User (shared PK); 1—N ConsultationRequest, Rating, ProfessionalPlan
- DataSharingConsent gates Nutritionist read-access to a User's data

---

## 7. REST API Endpoints (v1)

```
AUTH
POST   /api/v1/auth/register
POST   /api/v1/auth/verify-otp
POST   /api/v1/auth/login
POST   /api/v1/auth/logout
POST   /api/v1/auth/forgot-password
POST   /api/v1/auth/reset-password
PUT    /api/v1/auth/change-password

PROFILE
GET    /api/v1/users/{id}/profile
PUT    /api/v1/users/{id}/profile

NUTRITION TARGETS
GET    /api/v1/users/{id}/nutrition-targets?date=

FOOD ANALYZER
POST   /api/v1/analyzer/image
POST   /api/v1/analyzer/barcode
POST   /api/v1/analyzer/label

TRACKER
POST   /api/v1/food-logs
GET    /api/v1/food-logs?date=
PUT    /api/v1/food-logs/{id}
DELETE /api/v1/food-logs/{id}
POST   /api/v1/water-logs
GET    /api/v1/water-logs?date=

MEAL PLANNER
POST   /api/v1/meal-plans/generate
GET    /api/v1/meal-plans/{id}
GET    /api/v1/meal-plans/{id}/grocery-list
PUT    /api/v1/meal-plans/{id}/items/{itemId}

WHAT SHOULD I EAT
POST   /api/v1/recommendations/instant

NUTRITION GAPS
GET    /api/v1/users/{id}/nutrition-gaps?date=

AI ASSISTANT
POST   /api/v1/assistant/chat

NUTRITIONIST
GET    /api/v1/nutritionists?specialization=&rating=
GET    /api/v1/nutritionists/{id}
POST   /api/v1/consultations
POST   /api/v1/ratings
POST   /api/v1/consents
DELETE /api/v1/consents/{id}
POST   /api/v1/professional-plans

ANALYTICS
GET    /api/v1/users/{id}/analytics?range=daily|weekly|monthly

ADMIN
GET/POST/PUT/DELETE /api/v1/admin/users
GET/PUT             /api/v1/admin/nutritionists/{id}/verify
GET/POST/PUT/DELETE /api/v1/admin/food-items
GET/POST/PUT/DELETE /api/v1/admin/additives
GET/POST/PUT/DELETE /api/v1/admin/allergens
GET/POST/PUT        /api/v1/admin/ai-rules
GET                  /api/v1/admin/analytics
```

All authenticated requests carry `Authorization: Bearer <JWT>`. All admin routes require `ROLE_ADMIN`.

---

## 8. Non-Functional Requirements

| Category | Requirement |
|---|---|
| **Performance** | 95% of CRUD API calls < 500ms. AI operations respond/progress within 3s, complete within 15s. Support 1,000+ concurrent users. |
| **Security** | Bcrypt/Argon2 password hashing. HTTPS only. JWT with refresh rotation. Server-side RBAC on every endpoint. Consent-gated nutritionist data access. Secrets via env vars only. |
| **Usability** | Verdicts never rely on color alone (text + icon). Core flows completable in ≤3 taps from Dashboard. WCAG 2.1 AA for primary flows. |
| **Reliability** | 99.5% monthly uptime target. AI/OCR outages degrade gracefully (manual logging unaffected). Scheduled DB backups (≤24h data-loss window). |
| **Scalability** | Independently deployable/scalable containers (client/server/db). Schema changes via Flyway migrations. AI rules externally configurable. |
| **Portability** | Identical behavior across local Docker Compose, staging, and production via env-var config only. |

---

## 9. Out of Scope (v1)

- Native mobile apps (React client is responsive web only)
- Wearable device integrations
- In-app payment processing (nutritionist consultations use contact-detail hand-off only)
- In-app messaging with nutritionists

---

## 10. Suggested Build Order (for implementation)

1. Auth + RBAC + OTP toggle
2. User Profile + Nutrition Requirement Engine
3. Food/Additive/Allergen Database (Admin) + seed data
4. Food & Nutrition Tracker + Protein Tracker
5. AI Food Analyzer (image/barcode/label → verdict)
6. Nutrition Gap Detection
7. AI Meal Planner + Grocery List
8. "What Should I Eat?" engine
9. AI Food Assistant (chat)
10. Nutritionist Module (consent, consultation, ratings)
11. Analytics & Dashboard
12. Admin Panel (full back-office)

----
