# NutriMunch AI — Comprehensive Role-Based Feature Catalog & Testing Guide

This document provides an exhaustive, role-by-role breakdown of every feature available in the **NutriMunch AI** platform across all 4 system roles:
1. 🌐 **Guest / Unauthenticated Visitor Role**
2. 👤 **Standard User Role (`ROLE_USER`)**
3. 🩺 **Certified Nutritionist / Dietitian Role (`ROLE_NUTRITIONIST`)**
4. 🛠️ **Platform Admin Role (`ROLE_ADMIN`)**

Each feature entry includes its **Live Test URL** (`http://localhost:5173/...`), **Frontend Component Link**, **Backend Implementation Link** (where applicable), and a **Detailed Technical & Functional Explanation**.

---

## 🌐 1. Guest / Unauthenticated Visitor Role

### Feature 1.1: Platform Roles & Capabilities Showcase Page
- 🔗 **Test URL:** [http://localhost:5173/user-roles](http://localhost:5173/user-roles)
- 💻 **Frontend Component:** [`UserRoles.jsx`](file:///Users/mihirsharma/Downloads/Projects/Nutrition-AI%20Minor%20Project/frontend/src/pages/UserRoles.jsx)
- **Explanation:**  
  A dedicated interactive web page displaying a side-by-side feature matrix and capability cards for both Standard Users and Certified Dietitians. Includes role tab switchers, direct registration CTA buttons, and detailed explanations of platform permissions.

### Feature 1.2: Dynamic "View All Services" Popup Modal
- 🔗 **Test URL:** [http://localhost:5173/](http://localhost:5173/) *(Click "View All Services" button on Home page)*
- 💻 **Frontend Component:** [`ServicesOverview.jsx`](file:///Users/mihirsharma/Downloads/Projects/Nutrition-AI%20Minor%20Project/frontend/src/pages/HomeSections/ServicesOverview.jsx)
- **Explanation:**  
  A portal overlay modal that dynamically adapts its layout and content based on the active user role. For guests, it highlights visitor tools (*AI Diet Generator, AI Food Scanner, Water Tracker, Consultation Schedule*).

### Feature 1.3: Role-Aware Global Navigation Bar
- 🔗 **Test URL:** [http://localhost:5173/](http://localhost:5173/)
- 💻 **Frontend Component:** [`Navbar.jsx`](file:///Users/mihirsharma/Downloads/Projects/Nutrition-AI%20Minor%20Project/frontend/src/common/Navbar.jsx)
- **Explanation:**  
  The main top navigation bar featuring ambient glowing indicators, active route highlighting, and quick links to `Platform Roles`, `AI Suite`, `Pricing`, `About`, and `Contact`. Replaces profile management links with `Platform Roles` when browsing as a guest.

### Feature 1.4: Testimonial & Story Submission Portal
- 🔗 **Test URL:** [http://localhost:5173/testimonials](http://localhost:5173/testimonials) *(or Home page section)*
- 💻 **Frontend Components:** [`ShareYourStoryForm.jsx`](file:///Users/mihirsharma/Downloads/Projects/Nutrition-AI%20Minor%20Project/frontend/src/pages/TestimonialSections/ShareYourStoryForm.jsx) | [`ClientTestimonials.jsx`](file:///Users/mihirsharma/Downloads/Projects/Nutrition-AI%20Minor%20Project/frontend/src/pages/HomeSections/ClientTestimonials.jsx)
- ⚙️ **Backend Controller:** [`TestimonialController.java`](file:///Users/mihirsharma/Downloads/Projects/Nutrition-AI%20Minor%20Project/backend/src/main/java/com/nutrition/controller/TestimonialController.java)
- **Explanation:**  
  A full CRUD feedback system allowing users to select a 1-to-5 star rating (⭐⭐⭐⭐⭐), preview their testimonial card in real-time, submit transformation stories, edit or delete their submitted stories, and see published testimonials update live on the Home page.

### Feature 1.5: Platform Landing & Home Page
- 🔗 **Test URL:** [http://localhost:5173/](http://localhost:5173/)
- 💻 **Frontend Component:** [`Home.jsx`](file:///Users/mihirsharma/Downloads/Projects/Nutrition-AI%20Minor%20Project/frontend/src/pages/Home.jsx)
- **Explanation:**  
  The primary entry point showcasing platform value propositions, interactive feature highlights, transformation metrics, customer stories, and direct onboarding entry points.

### Feature 1.6: Platform Pricing & Membership Plans
- 🔗 **Test URL:** [http://localhost:5173/pricing](http://localhost:5173/pricing)
- 💻 **Frontend Component:** [`Pricing.jsx`](file:///Users/mihirsharma/Downloads/Projects/Nutrition-AI%20Minor%20Project/frontend/src/pages/Pricing.jsx)
- **Explanation:**  
  Displays tiered membership pricing plans (Free Tier vs. Pro Dietitian Membership), breakdown of included features, and call-to-action buttons redirecting to user registration.

### Feature 1.7: Contact & Support Inquiries Form
- 🔗 **Test URL:** [http://localhost:5173/contact](http://localhost:5173/contact)
- 💻 **Frontend Component:** [`Contact.jsx`](file:///Users/mihirsharma/Downloads/Projects/Nutrition-AI%20Minor%20Project/frontend/src/pages/Contact.jsx)
- **Explanation:**  
  Allows unauthenticated visitors to submit platform inquiries, support questions, or enterprise partnership messages.

---

## 👤 2. Standard User Role (`ROLE_USER`)

### Feature 2.1: Authentication, OTP Verification & Onboarding Stepper
- 🔗 **Test URLs:** [http://localhost:5173/login](http://localhost:5173/login) | [http://localhost:5173/register](http://localhost:5173/register) | [http://localhost:5173/verify-otp](http://localhost:5173/verify-otp)
- 💻 **Frontend Components:** [`Login.jsx`](file:///Users/mihirsharma/Downloads/Projects/Nutrition-AI%20Minor%20Project/frontend/src/pages/Authentication/Login.jsx) | [`Register.jsx`](file:///Users/mihirsharma/Downloads/Projects/Nutrition-AI%20Minor%20Project/frontend/src/pages/Authentication/Register.jsx) | [`VerifyOtp.jsx`](file:///Users/mihirsharma/Downloads/Projects/Nutrition-AI%20Minor%20Project/frontend/src/pages/Authentication/VerifyOtp.jsx) | [`OnboardingWizard.jsx`](file:///Users/mihirsharma/Downloads/Projects/Nutrition-AI%20Minor%20Project/frontend/src/components/OnboardingWizard.jsx)
- ⚙️ **Backend Controller:** [`AuthController.java`](file:///Users/mihirsharma/Downloads/Projects/Nutrition-AI%20Minor%20Project/backend/src/main/java/com/nutrition/controller/AuthController.java)
- **Explanation:**  
  Handles JWT authentication, new user registration, 6-digit OTP verification, Google OAuth 2.0 single sign-on, and an interactive step-by-step biometrics onboarding stepper (`OnboardingWizard.jsx`).

### Feature 2.2: User Profile & Biometrics Management Engine
- 🔗 **Test URL:** [http://localhost:5173/profile](http://localhost:5173/profile)
- 💻 **Frontend Component:** [`Profile.jsx`](file:///Users/mihirsharma/Downloads/Projects/Nutrition-AI%20Minor%20Project/frontend/src/pages/Dashboard/User/Profile.jsx)
- ⚙️ **Backend Controller:** [`UserProfileController.java`](file:///Users/mihirsharma/Downloads/Projects/Nutrition-AI%20Minor%20Project/backend/src/main/java/com/nutrition/controller/UserProfileController.java)
- **Explanation:**  
  Complete management of biometric data: Age, Height, Weight, Activity Level, Dietary Restrictions, Allergen Filters, and Daily Fluid Target (Liters). Calculates Basal Metabolic Rate (BMR) and Total Daily Energy Expenditure (TDEE) dynamically using the Mifflin-St Jeor formula.

### Feature 2.3: Smart Hydration & Water Intake Tracker
- 🔗 **Test URL:** [http://localhost:5173/progress](http://localhost:5173/progress)
- 💻 **Frontend Component:** [`ProgressTracking.jsx`](file:///Users/mihirsharma/Downloads/Projects/Nutrition-AI%20Minor%20Project/frontend/src/pages/Dashboard/User/ProgressTracking.jsx)
- ⚙️ **Backend Controllers:** [`ProgressLogController.java`](file:///Users/mihirsharma/Downloads/Projects/Nutrition-AI%20Minor%20Project/backend/src/main/java/com/nutrition/controller/ProgressLogController.java) | [`UserProfileController.java`](file:///Users/mihirsharma/Downloads/Projects/Nutrition-AI%20Minor%20Project/backend/src/main/java/com/nutrition/controller/UserProfileController.java)
- **Explanation:**  
  An interactive hydration manager featuring a dynamic circular fluid progress ring, quick-add buttons (`+250ml`, `+500ml`, `+750ml`, `+1000ml`), custom ml logger, reset button, Edit Target Goal popover modal, real-time 2-way sync with profile settings, and persistent API logging.

### Feature 2.4: AI Food Photo Scanner & Vision Analyzer
- 🔗 **Test URL:** [http://localhost:5173/ai-image](http://localhost:5173/ai-image)
- 💻 **Frontend Component:** [`AiImageAnalyzer.jsx`](file:///Users/mihirsharma/Downloads/Projects/Nutrition-AI%20Minor%20Project/frontend/src/pages/Dashboard/User/AiImageAnalyzer.jsx)
- ⚙️ **Backend Controller:** [`AiController.java`](file:///Users/mihirsharma/Downloads/Projects/Nutrition-AI%20Minor%20Project/backend/src/main/java/com/nutrition/controller/AiController.java)
- **Explanation:**  
  Uploads or captures meal photos and executes AI vision analysis via `/api/ai/analyze-image`. Extracts identified dish names, estimated Calories, Protein, Carbs, and Fat metrics, detects potential allergens, and displays safety verdict badges (🟢 Safe, 🟡 Caution, 🔴 Avoid).

### Feature 2.5: AI Weekly Diet Plan Generator
- 🔗 **Test URL:** [http://localhost:5173/ai-diet](http://localhost:5173/ai-diet)
- 💻 **Frontend Component:** [`AiDietGenerator.jsx`](file:///Users/mihirsharma/Downloads/Projects/Nutrition-AI%20Minor%20Project/frontend/src/pages/Dashboard/User/AiDietGenerator.jsx)
- ⚙️ **Backend Controller:** [`DietPlanController.java`](file:///Users/mihirsharma/Downloads/Projects/Nutrition-AI%20Minor%20Project/backend/src/main/java/com/nutrition/controller/DietPlanController.java)
- **Explanation:**  
  Generates automated 7-day meal schedules tailored to caloric targets, budget tiers (Affordable, Moderate, Gourmet), and dietary preferences (High-Protein, Keto, Vegan, Balanced).

### Feature 2.6: Personal Diet Plans Library
- 🔗 **Test URL:** [http://localhost:5173/diet-plans](http://localhost:5173/diet-plans)
- 💻 **Frontend Component:** [`DietPlans.jsx`](file:///Users/mihirsharma/Downloads/Projects/Nutrition-AI%20Minor%20Project/frontend/src/pages/Dashboard/User/DietPlans.jsx)
- ⚙️ **Backend Controller:** [`DietPlanController.java`](file:///Users/mihirsharma/Downloads/Projects/Nutrition-AI%20Minor%20Project/backend/src/main/java/com/nutrition/controller/DietPlanController.java)
- **Explanation:**  
  A repository for viewing, activating, and following active weekly meal plans generated by AI or assigned by a certified dietitian.

### Feature 2.7: 24/7 AI Health Companion Chatbot
- 🔗 **Test URL:** [http://localhost:5173/ai-chat](http://localhost:5173/ai-chat)
- 💻 **Frontend Component:** [`AiChat.jsx`](file:///Users/mihirsharma/Downloads/Projects/Nutrition-AI%20Minor%20Project/frontend/src/pages/Dashboard/User/AiChat.jsx)
- ⚙️ **Backend Controller:** [`AiController.java`](file:///Users/mihirsharma/Downloads/Projects/Nutrition-AI%20Minor%20Project/backend/src/main/java/com/nutrition/controller/AiController.java)
- **Explanation:**  
  Real-time conversational AI health companion offering advice on recipe substitutions, macro calculation queries, and hydration optimization.

### Feature 2.8: Consultation Appointment Booking
- 🔗 **Test URL:** [http://localhost:5173/appointments](http://localhost:5173/appointments)
- 💻 **Frontend Component:** [`Appointments.jsx`](file:///Users/mihirsharma/Downloads/Projects/Nutrition-AI%20Minor%20Project/frontend/src/pages/Dashboard/User/Appointments.jsx)
- ⚙️ **Backend Controller:** [`AppointmentController.java`](file:///Users/mihirsharma/Downloads/Projects/Nutrition-AI%20Minor%20Project/backend/src/main/java/com/nutrition/controller/AppointmentController.java)
- **Explanation:**  
  Allows users to browse verified platform dietitians, schedule virtual video consultation slots, and manage appointment statuses.

### Feature 2.9: Health Reports & Progress Exporter
- 🔗 **Test URL:** [http://localhost:5173/reports](http://localhost:5173/reports)
- 💻 **Frontend Component:** [`Reports.jsx`](file:///Users/mihirsharma/Downloads/Projects/Nutrition-AI%20Minor%20Project/frontend/src/pages/Dashboard/User/Reports.jsx)
- **Explanation:**  
  Renders health summary cards, nutrient adherence trends, and printable report previews for patient-doctor sharing.

---

## 🩺 3. Certified Nutritionist / Dietitian Role (`ROLE_NUTRITIONIST`)

### Feature 3.1: Dietitian Clinical Workspace Overview
- 🔗 **Test URL:** [http://localhost:5173/dashboard/nutritionist](http://localhost:5173/dashboard/nutritionist)
- 💻 **Frontend Component:** [`DietitianHome.jsx`](file:///Users/mihirsharma/Downloads/Projects/Nutrition-AI%20Minor%20Project/frontend/src/pages/Dashboard/Dietitian/DietitianHome.jsx)
- **Explanation:**  
  The main dashboard for verified dietitians, rendering active patient counts, pending consultation requests, weekly consultation metrics, and clinical shortcuts.

### Feature 3.2: Patient & Client Roster Management
- 🔗 **Test URL:** [http://localhost:5173/dashboard/nutritionist/clients](http://localhost:5173/dashboard/nutritionist/clients)
- 💻 **Frontend Component:** [`ClientManagement.jsx`](file:///Users/mihirsharma/Downloads/Projects/Nutrition-AI%20Minor%20Project/frontend/src/pages/Dashboard/Dietitian/ClientManagement.jsx)
- ⚙️ **Backend Controller:** [`NutritionistProfileController.java`](file:///Users/mihirsharma/Downloads/Projects/Nutrition-AI%20Minor%20Project/backend/src/main/java/com/nutrition/controller/NutritionistProfileController.java)
- **Explanation:**  
  Allows dietitians to inspect assigned patient profiles, review historical biometric progress, check macro adherence, and access patient health notes.

### Feature 3.3: Custom Clinical Diet Plan Builder
- 🔗 **Test URL:** [http://localhost:5173/dashboard/nutritionist/builder](http://localhost:5173/dashboard/nutritionist/builder)
- 💻 **Frontend Component:** [`DietPlanBuilder.jsx`](file:///Users/mihirsharma/Downloads/Projects/Nutrition-AI%20Minor%20Project/frontend/src/pages/Dashboard/Dietitian/DietPlanBuilder.jsx)
- ⚙️ **Backend Controller:** [`DietPlanController.java`](file:///Users/mihirsharma/Downloads/Projects/Nutrition-AI%20Minor%20Project/backend/src/main/java/com/nutrition/controller/DietPlanController.java)
- **Explanation:**  
  An interactive meal plan creation studio for constructing custom daily breakfast, lunch, dinner, and snack prescriptions tailored to patient medical needs.

### Feature 3.4: Virtual Consultation Appointment Management
- 🔗 **Test URL:** [http://localhost:5173/dashboard/nutritionist/schedule](http://localhost:5173/dashboard/nutritionist/schedule)
- 💻 **Frontend Component:** [`AppointmentManagement.jsx`](file:///Users/mihirsharma/Downloads/Projects/Nutrition-AI%20Minor%20Project/frontend/src/pages/Dashboard/Dietitian/AppointmentManagement.jsx)
- ⚙️ **Backend Controller:** [`AppointmentController.java`](file:///Users/mihirsharma/Downloads/Projects/Nutrition-AI%20Minor%20Project/backend/src/main/java/com/nutrition/controller/AppointmentController.java)
- **Explanation:**  
  Allows dietitians to view incoming patient appointment bookings, accept requests, reschedule slots, and manage consultation logs via backend APIs.

### Feature 3.5: Public Nutritionist Profile & Credentials Management
- 🔗 **Test URL:** [http://localhost:5173/dashboard/nutritionist/profile](http://localhost:5173/dashboard/nutritionist/profile)
- 💻 **Frontend Component:** [`NutritionistProfile.jsx`](file:///Users/mihirsharma/Downloads/Projects/Nutrition-AI%20Minor%20Project/frontend/src/pages/Dashboard/Nutritionist/NutritionistProfile.jsx)
- ⚙️ **Backend Controller:** [`NutritionistProfileController.java`](file:///Users/mihirsharma/Downloads/Projects/Nutrition-AI%20Minor%20Project/backend/src/main/java/com/nutrition/controller/NutritionistProfileController.java)
- **Explanation:**  
  Manages public practitioner bio, license verification credentials, hourly consultation rates, specializations (e.g., PCOS, Sports Nutrition, Diabetes), and weekly availability hours.

### Feature 3.6: Admin Verification Access Control
- 🔗 **Test URL:** [http://localhost:5173/dashboard/nutritionist](http://localhost:5173/dashboard/nutritionist)
- 💻 **Frontend Layout:** [`NutritionistDashboardLayout.jsx`](file:///Users/mihirsharma/Downloads/Projects/Nutrition-AI%20Minor%20Project/frontend/src/layouts/NutritionistDashboardLayout.jsx)
- **Explanation:**  
  Restricts access to certified clinical tools until an administrator approves the nutritionist's professional license.

---

## 🛠️ 4. Platform Admin Role (`ROLE_ADMIN`)

### Feature 4.1: Admin Control Core Overview Console
- 🔗 **Test URL:** [http://localhost:5173/dashboard/admin](http://localhost:5173/dashboard/admin)
- 💻 **Frontend Component:** [`AdminHome.jsx`](file:///Users/mihirsharma/Downloads/Projects/Nutrition-AI%20Minor%20Project/frontend/src/pages/Dashboard/Admin/AdminHome.jsx)
- ⚙️ **Backend Controller:** [`AdminController.java`](file:///Users/mihirsharma/Downloads/Projects/Nutrition-AI%20Minor%20Project/backend/src/main/java/com/nutrition/controller/AdminController.java)
- **Explanation:**  
  Central system overview displaying live system counters, active registered user tallies, total AI image scans, system uptime telemetry, and administrative shortcuts.

### Feature 4.2: User Management Portal (Search + Role & Status Filters)
- 🔗 **Test URL:** [http://localhost:5173/dashboard/admin/users](http://localhost:5173/dashboard/admin/users)
- 💻 **Frontend Component:** [`UserManagement.jsx`](file:///Users/mihirsharma/Downloads/Projects/Nutrition-AI%20Minor%20Project/frontend/src/pages/Dashboard/Admin/UserManagement.jsx)
- ⚙️ **Backend Controller:** [`AdminController.java`](file:///Users/mihirsharma/Downloads/Projects/Nutrition-AI%20Minor%20Project/backend/src/main/java/com/nutrition/controller/AdminController.java)
- **Explanation:**  
  Advanced user administration featuring real-time search by Name or Email, filter tabs for Roles (`ALL`, `USER`, `NUTRITIONIST`, `ADMIN`), filter tabs for Verification Status (`VERIFIED`, `PENDING OTP`), role promotion/demotion, user account deletion, and password reset trigger.

### Feature 4.3: Dietitian Verification & Compliance Portal
- 🔗 **Test URL:** [http://localhost:5173/dashboard/admin/dietitians](http://localhost:5173/dashboard/admin/dietitians)
- 💻 **Frontend Component:** [`DietitianManagement.jsx`](file:///Users/mihirsharma/Downloads/Projects/Nutrition-AI%20Minor%20Project/frontend/src/pages/Dashboard/Admin/DietitianManagement.jsx)
- ⚙️ **Backend Controller:** [`AdminController.java`](file:///Users/mihirsharma/Downloads/Projects/Nutrition-AI%20Minor%20Project/backend/src/main/java/com/nutrition/controller/AdminController.java)
- **Explanation:**  
  Inspects incoming practitioner verification applications, evaluates license documents, and grants or revokes certified clinical status.

### Feature 4.4: Interactive SQL Database Console
- 🔗 **Test URL:** [http://localhost:5173/dashboard/admin/sql](http://localhost:5173/dashboard/admin/sql)
- 💻 **Frontend Component:** [`SqlConsole.jsx`](file:///Users/mihirsharma/Downloads/Projects/Nutrition-AI%20Minor%20Project/frontend/src/pages/Dashboard/Admin/SqlConsole.jsx)
- ⚙️ **Backend Controller:** [`AdminController.java`](file:///Users/mihirsharma/Downloads/Projects/Nutrition-AI%20Minor%20Project/backend/src/main/java/com/nutrition/controller/AdminController.java)
- **Explanation:**  
  Allows administrators to execute real-time SQL queries against the database (e.g., `SELECT * FROM users;`) with interactive tabular output and query history logging.

### Feature 4.5: Testimonial Moderation & Control Console
- 🔗 **Test URL:** [http://localhost:5173/dashboard/admin/testimonials](http://localhost:5173/dashboard/admin/testimonials)
- 💻 **Frontend Component:** [`TestimonialManagement.jsx`](file:///Users/mihirsharma/Downloads/Projects/Nutrition-AI%20Minor%20Project/frontend/src/pages/Dashboard/Admin/TestimonialManagement.jsx)
- ⚙️ **Backend Controller:** [`TestimonialController.java`](file:///Users/mihirsharma/Downloads/Projects/Nutrition-AI%20Minor%20Project/backend/src/main/java/com/nutrition/controller/TestimonialController.java)
- **Explanation:**  
  Allows administrators to review submitted member transformation stories, search by text or author, filter by role, toggle published status, and permanently delete stories.

### Feature 4.6: Financial Transaction & Payment Logs
- 🔗 **Test URL:** [http://localhost:5173/dashboard/admin/payments](http://localhost:5173/dashboard/admin/payments)
- 💻 **Frontend Component:** [`PaymentManagement.jsx`](file:///Users/mihirsharma/Downloads/Projects/Nutrition-AI%20Minor%20Project/frontend/src/pages/Dashboard/Admin/PaymentManagement.jsx)
- **Explanation:**  
  Monitors subscription billing records, transaction statuses, payout histories, and financial logs.

### Feature 4.7: System Analytics & Telemetry Dashboard
- 🔗 **Test URL:** [http://localhost:5173/dashboard/admin/analytics](http://localhost:5173/dashboard/admin/analytics)
- 💻 **Frontend Component:** [`AdminAnalytics.jsx`](file:///Users/mihirsharma/Downloads/Projects/Nutrition-AI%20Minor%20Project/frontend/src/pages/Dashboard/Admin/AdminAnalytics.jsx)
- **Explanation:**  
  Visualizes platform performance graphs, user acquisition trends, AI API usage statistics, and server response latencies.

---

- **Document Location:** [`ROLE_BASED_FEATURES_CATALOG.md`](file:///Users/mihirsharma/Downloads/Projects/Nutrition-AI%20Minor%20Project/ROLE_BASED_FEATURES_CATALOG.md)  
- **Last Updated:** October 10, 2026  
