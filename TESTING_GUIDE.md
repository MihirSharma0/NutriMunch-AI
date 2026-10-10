# NutriMunch AI — Comprehensive Feature Testing Guide & Implementation Map

This document provides a step-by-step testing guide and code mapping for every feature built across the NutriMunch AI platform.

---

## 🌐 Environment & Test Setup

- **Frontend Application:** `http://localhost:5173`
- **Spring Boot Backend:** `http://localhost:8080/api/v1`
- **Active Dev Commands:**
  - Frontend: `npm run dev` (in `/frontend`)
  - Backend: `./mvnw spring-boot:run` (in `/backend`)

---

## 🗺️ Feature Implementation Mapping

| Feature | Frontend File(s) / Route | Backend Controller / Service / Entity |
|---|---|---|
| **Auth & OTP Verification** | `/register`, `/login`, `/verify-otp`<br>[`Login.jsx`](file:///Users/mihirsharma/Downloads/Projects/Nutrition-AI%20Minor%20Project/frontend/src/pages/Authentication/Login.jsx)<br>[`Register.jsx`](file:///Users/mihirsharma/Downloads/Projects/Nutrition-AI%20Minor%20Project/frontend/src/pages/Authentication/Register.jsx)<br>[`VerifyOtp.jsx`](file:///Users/mihirsharma/Downloads/Projects/Nutrition-AI%20Minor%20Project/frontend/src/pages/Authentication/VerifyOtp.jsx)<br>[`OnboardingWizard.jsx`](file:///Users/mihirsharma/Downloads/Projects/Nutrition-AI%20Minor%20Project/frontend/src/components/OnboardingWizard.jsx) | `AuthController.java`<br>`User.java`<br>`VerificationToken.java`<br>`PasswordResetToken.java` |
| **User Profile & Biometrics** | `/profile`, `/dashboard/user/profile`<br>[`Profile.jsx`](file:///Users/mihirsharma/Downloads/Projects/Nutrition-AI%20Minor%20Project/frontend/src/pages/Dashboard/User/Profile.jsx) | `UserProfileController.java`<br>`UserProfile.java` |
| **BMR & Nutrition Engine** | Dynamic calculation inside [`Profile.jsx`](file:///Users/mihirsharma/Downloads/Projects/Nutrition-AI%20Minor%20Project/frontend/src/pages/Dashboard/User/Profile.jsx) & [`ProgressTracking.jsx`](file:///Users/mihirsharma/Downloads/Projects/Nutrition-AI%20Minor%20Project/frontend/src/pages/Dashboard/User/ProgressTracking.jsx) | `UserProfileController.java`<br>`NutritionRuleController.java` |
| **AI Food Photo Analyzer** | `/ai-image`, `/dashboard/user/ai-image`<br>[`AiImageAnalyzer.jsx`](file:///Users/mihirsharma/Downloads/Projects/Nutrition-AI%20Minor%20Project/frontend/src/pages/Dashboard/User/AiImageAnalyzer.jsx) | `AiController.java` |
| **AI Diet Plan Generator** | `/ai-diet`, `/dashboard/user/ai-diet`<br>[`AiDietGenerator.jsx`](file:///Users/mihirsharma/Downloads/Projects/Nutrition-AI%20Minor%20Project/frontend/src/pages/Dashboard/User/AiDietGenerator.jsx) | `DietPlanController.java`<br>`DietPlan.java` |
| **Diet Plans Library** | `/diet-plans`, `/dashboard/user/diet-plans`<br>[`DietPlans.jsx`](file:///Users/mihirsharma/Downloads/Projects/Nutrition-AI%20Minor%20Project/frontend/src/pages/Dashboard/User/DietPlans.jsx) | `DietPlanController.java`<br>`DietPlan.java` |
| **Progress & Water Tracker** | `/progress`, `/dashboard/user/progress`<br>[`ProgressTracking.jsx`](file:///Users/mihirsharma/Downloads/Projects/Nutrition-AI%20Minor%20Project/frontend/src/pages/Dashboard/User/ProgressTracking.jsx) | `ProgressLogController.java`<br>`ProgressLog.java` |
| **AI Health Companion Chat** | `/ai-chat`, `/dashboard/user/ai-chat`<br>[`AiChat.jsx`](file:///Users/mihirsharma/Downloads/Projects/Nutrition-AI%20Minor%20Project/frontend/src/pages/Dashboard/User/AiChat.jsx) | `AiController.java` |
| **Dietitian Client Roster** | `/dashboard/nutritionist/clients`<br>[`ClientManagement.jsx`](file:///Users/mihirsharma/Downloads/Projects/Nutrition-AI%20Minor%20Project/frontend/src/pages/Dashboard/Dietitian/ClientManagement.jsx) | `NutritionistProfileController.java` |
| **Custom Diet Builder** | `/dashboard/nutritionist/builder`<br>[`DietPlanBuilder.jsx`](file:///Users/mihirsharma/Downloads/Projects/Nutrition-AI%20Minor%20Project/frontend/src/pages/Dashboard/Dietitian/DietPlanBuilder.jsx) | `DietPlanController.java` |
| **Appointment Schedule** | `/dashboard/nutritionist/schedule`, `/appointments`<br>[`AppointmentManagement.jsx`](file:///Users/mihirsharma/Downloads/Projects/Nutrition-AI%20Minor%20Project/frontend/src/pages/Dashboard/Dietitian/AppointmentManagement.jsx)<br>[`Appointments.jsx`](file:///Users/mihirsharma/Downloads/Projects/Nutrition-AI%20Minor%20Project/frontend/src/pages/Dashboard/User/Appointments.jsx) | `AppointmentController.java`<br>`Appointment.java` |
| **Admin User & Dietitian Portal** | `/dashboard/admin/users`, `/dashboard/admin/dietitians`<br>[`UserManagement.jsx`](file:///Users/mihirsharma/Downloads/Projects/Nutrition-AI%20Minor%20Project/frontend/src/pages/Dashboard/Admin/UserManagement.jsx)<br>[`DietitianManagement.jsx`](file:///Users/mihirsharma/Downloads/Projects/Nutrition-AI%20Minor%20Project/frontend/src/pages/Dashboard/Admin/DietitianManagement.jsx) | `AdminController.java`<br>`User.java` |
| **Admin SQL Console** | `/dashboard/admin/sql`<br>[`SqlConsole.jsx`](file:///Users/mihirsharma/Downloads/Projects/Nutrition-AI%20Minor%20Project/frontend/src/pages/Dashboard/Admin/SqlConsole.jsx) | `AdminController.java` |
| **Platform Roles Showcase** | `/user-roles` (or `/roles`) <br>[`UserRoles.jsx`](file:///Users/mihirsharma/Downloads/Projects/Nutrition-AI%20Minor%20Project/frontend/src/pages/UserRoles.jsx) | Rendered directly via GlobalLayout |

---

## 🧪 Step-by-Step Feature Testing Guide

### Test Suite 1: Authentication & Onboarding Flow

#### Step 1.1: Register a New Standard User
1. Navigate to `http://localhost:5173/register`.
2. Fill out Full Name, Email, Password, and select **Standard User** role.
3. Click **Create Account**.
4. **Expected Result:** Redirects to `/verify-otp` (or `/verify-otp?email=...`) showing the 6-digit OTP verification screen with progress indicator.

#### Step 1.2: Complete OTP Verification & Biometrics Onboarding Wizard
1. Enter `123456` (or test OTP code) on `/verify-otp`.
2. Upon OTP submission, the **Onboarding Wizard** (`OnboardingWizard.jsx`) opens with progress stepper (`------o------o------o------`).
3. Select your Age, Height, Weight, Activity Level, Dietary Goals, and Allergen restrictions.
4. Click **Complete Profile**.
5. **Expected Result:** Automatically logs in user, updates context, and lands on `/profile` or `/dashboard/user`.

#### Step 1.3: Google OAuth 2.0 Login
1. Navigate to `http://localhost:5173/login`.
2. Click **Continue with Google**.
3. **Expected Result:** Authenticates user via Google OAuth, triggers onboarding if first-time user, and sets valid session.

---

### Test Suite 2: User Dashboard & Nutrition Engine

#### Step 2.1: Verify BMR & Target Recalculation
1. Navigate to `http://localhost:5173/profile`.
2. Inspect BMR & TDEE cards (computed using Mifflin-St Jeor formula).
3. Change Weight (e.g., from 70kg to 75kg) or Activity Level (e.g., to Moderately Active).
4. Click **Save Changes**.
5. **Expected Result:** Calorie target, protein, carbs, fat, and hydration (ml) metrics immediately update in real time.

#### Step 2.2: Test Hydration & Water Intake Logging
1. Navigate to `http://localhost:5173/progress`.
2. Click `+ 250 ml` or `+ 500 ml` water logging buttons.
3. **Expected Result:** Water consumed counter increases, progress circle fills, and log is stored in backend (`ProgressLogController.java`).

---

### Test Suite 3: AI Tools (Vision Scanner, Diet Plan Generator, AI Companion)

#### Step 3.1: Test AI Food Photo Scanner (`AiImageAnalyzer.jsx`)
1. Navigate to `http://localhost:5173/ai-image`.
2. Upload any food image (e.g., salad, pizza, apple) or click **Analyze Sample Image**.
3. Click **Analyze Meal**.
4. **Expected Result:** AI vision model processes image and returns:
   - Identified dish name
   - Estimated Calorie, Protein, Carb, and Fat metrics
   - Safety Verdict badge (🟢 Safe, 🟡 Caution, or 🔴 Avoid)
   - Detailed plain-language Verdict Explanation.

#### Step 3.2: Test AI Weekly Diet Generator (`AiDietGenerator.jsx`)
1. Navigate to `http://localhost:5173/ai-diet`.
2. Select your Target Caloric Intake (e.g., 2000 kcal), Budget Tier (e.g., Medium/Affordable), and Diet Type (e.g., High-Protein or Vegan).
3. Click **Generate Weekly Meal Plan**.
4. **Expected Result:** Generates customized Monday–Sunday meal schedule with Breakfast, Lunch, Snacks, Dinner, macro breakdown, and Smart Grocery List.

#### Step 3.3: Test 24/7 AI Health Companion Chat (`AiChat.jsx`)
1. Navigate to `http://localhost:5173/ai-chat`.
2. Type a question (e.g., *"What is a high-protein vegetarian breakfast recipe under 400 calories?"*).
3. Press **Send**.
4. **Expected Result:** Receives real-time streaming response from AI assistant explaining the recipe and macro breakdown.

---

### Test Suite 4: Role-Based Navigation & Platform Roles Page

#### Step 4.1: Test Unauthenticated Guest Navbar
1. Logout of any active session.
2. Observe the top Navbar menu bar.
3. Confirm link is **Platform Roles** (points to `/user-roles`).
4. Click **View All Services** on the Home page.
5. **Expected Result:** Modal popup opens frontmost displaying guest user tools (*AI Diet Generator, AI Food Analyzer, Progress Tracking, Consultations, AI Chatbot, Diet Plans, Reports*).

#### Step 4.2: Test Dedicated Platform Roles Web Page (`/user-roles`)
1. Click **Platform Roles** in the Navbar or navigate directly to `http://localhost:5173/user-roles`.
2. Click tab toggle between **Standard User** and **Nutritionist / Dietitian**.
3. **Expected Result:** Displays rich feature breakdown cards for each role, side-by-side comparison matrix table, and Login/Register action buttons.

#### Step 4.3: Test Logged-In Role Services Popup
1. Login as a **Nutritionist / Dietitian** account.
2. Click **View All Services** on the Home page.
3. **Expected Result:** Modal popup updates title to **Nutritionist Workspace & Clinical Tools** with **Dietitian Tools** badge, displaying clinical features (*Overview Console, Client Roster, Custom Diet Builder, Appointment Schedule, Clinical Reports, Profile*).

---

### Test Suite 5: Nutritionist / Dietitian Workspace

#### Step 5.1: Test Client Roster & Diet Builder
1. Login as a Verified Nutritionist and navigate to `http://localhost:5173/dashboard/nutritionist/clients`.
2. Inspect assigned patient profiles and health history logs.
3. Navigate to `http://localhost:5173/dashboard/nutritionist/builder`.
4. Create a prescription meal plan for a client and click **Assign to Client**.
5. **Expected Result:** Plan is attached to client profile and viewable inside client's `/diet-plans` section.

#### Step 5.2: Test Appointment Management
1. Navigate to `http://localhost:5173/dashboard/nutritionist/schedule`.
2. View incoming virtual consultation requests.
3. Click **Accept Appointment** or change appointment status.
4. **Expected Result:** Appointment updates status in backend (`AppointmentController.java`).

---

### Test Suite 6: Admin Back-Office Panel

#### Step 6.1: Test User & Dietitian Verification Management
1. Login as an Admin account and navigate to `http://localhost:5173/dashboard/admin/dietitians`.
2. View pending nutritionist verification applications.
3. Click **Approve Verification**.
4. **Expected Result:** Nutritionist role status updates to Verified (`AdminController.java`).

#### Step 6.2: Test Database SQL Console (`SqlConsole.jsx`)
1. Navigate to `http://localhost:5173/dashboard/admin/sql`.
2. Execute query (e.g. `SELECT * FROM users;` or `SELECT * FROM user_profiles;`).
3. **Expected Result:** Safely executes query against database and renders interactive tabular result set.

---

## 📌 Document Versioning

- **Author:** Antigravity AI Assistant  
- **File Location:** [`TESTING_GUIDE.md`](file:///Users/mihirsharma/Downloads/Projects/Nutrition-AI%20Minor%20Project/TESTING_GUIDE.md)  
- **Last Updated:** October 10, 2026  
