# NutriMunch AI — Feature Audit & Testing Links Guide

This document provides an audited breakdown of all features across the 4 user roles (**Guest/Public**, **Standard User**, **Certified Nutritionist**, and **Admin**), equipped with **live browser testing links** (`http://localhost:5173/...`), **frontend component file links**, and **backend controller implementation links**.

---

## 🌐 1. Guest / Public Role (Unauthenticated Visitors)

### ✅ Real / Working Features:
1. **Platform Roles & Capabilities Page**:
   - 🔗 **Test URL:** [http://localhost:5173/user-roles](http://localhost:5173/user-roles)
   - 💻 **Frontend Component:** [`UserRoles.jsx`](file:///Users/mihirsharma/Downloads/Projects/Nutrition-AI%20Minor%20Project/frontend/src/pages/UserRoles.jsx)
   - **Details:** Interactive tab switcher between Standard User and Certified Nutritionist, feature breakdown cards, and side-by-side comparison matrix.

2. **View All Services Popup Modal**:
   - 🔗 **Test URL:** [http://localhost:5173/](http://localhost:5173/) *(Click "View All Services" button)*
   - 💻 **Frontend Component:** [`ServicesOverview.jsx`](file:///Users/mihirsharma/Downloads/Projects/Nutrition-AI%20Minor%20Project/frontend/src/pages/HomeSections/ServicesOverview.jsx)
   - **Details:** Dynamic portal overlay modal rendering role-specific platform tools.

4. **Testimonial Share & Transformation Portal**:
   - 🔗 **Test URL:** [http://localhost:5173/testimonials](http://localhost:5173/testimonials) *(or Home page)*
   - 💻 **Frontend Components:** [`ShareYourStoryForm.jsx`](file:///Users/mihirsharma/Downloads/Projects/Nutrition-AI%20Minor%20Project/frontend/src/pages/TestimonialSections/ShareYourStoryForm.jsx) | [`ClientTestimonials.jsx`](file:///Users/mihirsharma/Downloads/Projects/Nutrition-AI%20Minor%20Project/frontend/src/pages/HomeSections/ClientTestimonials.jsx)
   - ⚙️ **Backend Controller:** [`TestimonialController.java`](file:///Users/mihirsharma/Downloads/Projects/Nutrition-AI%20Minor%20Project/backend/src/main/java/com/nutrition/controller/TestimonialController.java)
   - **Details:** Interactive 1-to-5 star rating selector, live testimonial Card Preview modal, user submit/deploy, user edit & delete controls, and real-time live synchronization across the Home page and `/testimonials` page.

### ⚠️ Decorative / Show-Only Sections:
1. **Contact Form Submission**:
   - 🔗 **Test URL:** [http://localhost:5173/contact](http://localhost:5173/contact)
   - 💻 **Frontend Component:** [`Contact.jsx`](file:///Users/mihirsharma/Downloads/Projects/Nutrition-AI%20Minor%20Project/frontend/src/pages/Contact.jsx)
   - **Details:** Form uses a `setTimeout(1500)` mock success state ("Transmission Received") instead of saving to a backend `/contact` database table.

2. **Pricing Tiers Checkout**:
   - 🔗 **Test URL:** [http://localhost:5173/pricing](http://localhost:5173/pricing)
   - 💻 **Frontend Component:** [`Pricing.jsx`](file:///Users/mihirsharma/Downloads/Projects/Nutrition-AI%20Minor%20Project/frontend/src/pages/Pricing.jsx)
   - **Details:** Displays pricing plans ($0, $19/mo, $49/mo); plan buttons redirect to `/register` or `/login` (no live credit card payment gateway like Stripe integrated in v1).

---

## 👤 2. Standard User Role (`ROLE_USER`)

### ✅ Real / Working Features:
1. **Authentication & Onboarding Stepper**:
   - 🔗 **Test URLs:** [http://localhost:5173/login](http://localhost:5173/login) | [http://localhost:5173/register](http://localhost:5173/register) | [http://localhost:5173/verify-otp](http://localhost:5173/verify-otp)
   - 💻 **Frontend Components:** [`Login.jsx`](file:///Users/mihirsharma/Downloads/Projects/Nutrition-AI%20Minor%20Project/frontend/src/pages/Authentication/Login.jsx) | [`Register.jsx`](file:///Users/mihirsharma/Downloads/Projects/Nutrition-AI%20Minor%20Project/frontend/src/pages/Authentication/Register.jsx) | [`VerifyOtp.jsx`](file:///Users/mihirsharma/Downloads/Projects/Nutrition-AI%20Minor%20Project/frontend/src/pages/Authentication/VerifyOtp.jsx) | [`OnboardingWizard.jsx`](file:///Users/mihirsharma/Downloads/Projects/Nutrition-AI%20Minor%20Project/frontend/src/components/OnboardingWizard.jsx)
   - ⚙️ **Backend Controller:** [`AuthController.java`](file:///Users/mihirsharma/Downloads/Projects/Nutrition-AI%20Minor%20Project/backend/src/main/java/com/nutrition/controller/AuthController.java)
   - **Details:** JWT login, account registration, 6-digit OTP verification flow, Google OAuth 2.0, and Onboarding Wizard stepper.

2. **User Profile & Biometrics Management**:
   - 🔗 **Test URL:** [http://localhost:5173/profile](http://localhost:5173/profile)
   - 💻 **Frontend Component:** [`Profile.jsx`](file:///Users/mihirsharma/Downloads/Projects/Nutrition-AI%20Minor%20Project/frontend/src/pages/Dashboard/User/Profile.jsx)
   - ⚙️ **Backend Controller:** [`UserProfileController.java`](file:///Users/mihirsharma/Downloads/Projects/Nutrition-AI%20Minor%20Project/backend/src/main/java/com/nutrition/controller/UserProfileController.java)
   - **Details:** Full CRUD editing of Age, Height, Weight, Activity Level, Goals, Dietary Restrictions, Allergen Filters, and Daily Fluid Target. Automatic Mifflin-St Jeor BMR & TDEE calculation.

3. **Smart Hydration & Water Intake Tracker**:
   - 🔗 **Test URL:** [http://localhost:5173/progress](http://localhost:5173/progress)
   - 💻 **Frontend Component:** [`ProgressTracking.jsx`](file:///Users/mihirsharma/Downloads/Projects/Nutrition-AI%20Minor%20Project/frontend/src/pages/Dashboard/User/ProgressTracking.jsx)
   - ⚙️ **Backend Controllers:** [`ProgressLogController.java`](file:///Users/mihirsharma/Downloads/Projects/Nutrition-AI%20Minor%20Project/backend/src/main/java/com/nutrition/controller/ProgressLogController.java) | [`UserProfileController.java`](file:///Users/mihirsharma/Downloads/Projects/Nutrition-AI%20Minor%20Project/backend/src/main/java/com/nutrition/controller/UserProfileController.java)
   - **Details:** Interactive circular fluid progress ring, quick water logging (`+250ml`, `+500ml`, `+750ml`, `+1000ml`), custom intake, reset, Edit Goal popover, 2-way permanent sync with Profile, and API backend logging.

4. **AI Food Photo Scanner**:
   - 🔗 **Test URL:** [http://localhost:5173/ai-image](http://localhost:5173/ai-image)
   - 💻 **Frontend Component:** [`AiImageAnalyzer.jsx`](file:///Users/mihirsharma/Downloads/Projects/Nutrition-AI%20Minor%20Project/frontend/src/pages/Dashboard/User/AiImageAnalyzer.jsx)
   - ⚙️ **Backend Controller:** [`AiController.java`](file:///Users/mihirsharma/Downloads/Projects/Nutrition-AI%20Minor%20Project/backend/src/main/java/com/nutrition/controller/AiController.java)
   - **Details:** Upload or camera photo analysis calling `/api/ai/analyze-image`, extracting calories/macros, allergen warnings, and safety verdicts (🟢 Safe, 🟡 Caution, 🔴 Avoid).

5. **AI Weekly Diet Generator**:
   - 🔗 **Test URL:** [http://localhost:5173/ai-diet](http://localhost:5173/ai-diet)
   - 💻 **Frontend Component:** [`AiDietGenerator.jsx`](file:///Users/mihirsharma/Downloads/Projects/Nutrition-AI%20Minor%20Project/frontend/src/pages/Dashboard/User/AiDietGenerator.jsx)
   - ⚙️ **Backend Controller:** [`DietPlanController.java`](file:///Users/mihirsharma/Downloads/Projects/Nutrition-AI%20Minor%20Project/backend/src/main/java/com/nutrition/controller/DietPlanController.java)
   - **Details:** Custom weekly meal plans based on calorie targets, budget tiers, and diet types.

6. **Diet Plans Library**:
   - 🔗 **Test URL:** [http://localhost:5173/diet-plans](http://localhost:5173/diet-plans)
   - 💻 **Frontend Component:** [`DietPlans.jsx`](file:///Users/mihirsharma/Downloads/Projects/Nutrition-AI%20Minor%20Project/frontend/src/pages/Dashboard/User/DietPlans.jsx)
   - ⚙️ **Backend Controller:** [`DietPlanController.java`](file:///Users/mihirsharma/Downloads/Projects/Nutrition-AI%20Minor%20Project/backend/src/main/java/com/nutrition/controller/DietPlanController.java)
   - **Details:** View and manage active personal weekly meal plan regimens.

7. **24/7 AI Health Companion Chatbot**:
   - 🔗 **Test URL:** [http://localhost:5173/ai-chat](http://localhost:5173/ai-chat)
   - 💻 **Frontend Component:** [`AiChat.jsx`](file:///Users/mihirsharma/Downloads/Projects/Nutrition-AI%20Minor%20Project/frontend/src/pages/Dashboard/User/AiChat.jsx)
   - ⚙️ **Backend Controller:** [`AiController.java`](file:///Users/mihirsharma/Downloads/Projects/Nutrition-AI%20Minor%20Project/backend/src/main/java/com/nutrition/controller/AiController.java)
   - **Details:** Real-time AI chat assistant calling `/api/ai/chat`.

### ⚠️ Decorative / Show-Only Sections:
1. **Lipid Oxidation & Weight Curve Chart**:
   - 🔗 **Test URL:** [http://localhost:5173/progress](http://localhost:5173/progress)
   - 💻 **Frontend Component:** [`ProgressTracking.jsx`](file:///Users/mihirsharma/Downloads/Projects/Nutrition-AI%20Minor%20Project/frontend/src/pages/Dashboard/User/ProgressTracking.jsx)
   - **Details:** Renders a sample 6-week weight trajectory chart (`[195, 192, 189.5, 188, 185, 183 lbs]`) rather than plotting historical weight logs dynamically from user database records.

2. **Metabolic Biomarkers Tile**:
   - 🔗 **Test URL:** [http://localhost:5173/progress](http://localhost:5173/progress)
   - 💻 **Frontend Component:** [`ProgressTracking.jsx`](file:///Users/mihirsharma/Downloads/Projects/Nutrition-AI%20Minor%20Project/frontend/src/pages/Dashboard/User/ProgressTracking.jsx)
   - **Details:** Resting Heart Rate (`54 bpm`), HRV (`82 ms`), and Blood Glucose (`92 mg/dL`) are static display widgets (would require continuous wearable API sync in future).

3. **Health Reports Exporter**:
   - 🔗 **Test URL:** [http://localhost:5173/reports](http://localhost:5173/reports)
   - 💻 **Frontend Component:** [`Reports.jsx`](file:///Users/mihirsharma/Downloads/Projects/Nutrition-AI%20Minor%20Project/frontend/src/pages/Dashboard/User/Reports.jsx)
   - **Details:** Displays report summaries on screen; PDF export button triggers browser print preview or mock download rather than a dynamic server-side generated PDF stream.

---

## 🩺 3. Certified Nutritionist / Nutritionist Role (`ROLE_NUTRITIONIST`)

### ✅ Real / Working Features:
1. **Appointment Management**:
   - 🔗 **Test URL:** [http://localhost:5173/dashboard/nutritionist/schedule](http://localhost:5173/dashboard/nutritionist/schedule)
   - 💻 **Frontend Component:** [`AppointmentManagement.jsx`](file:///Users/mihirsharma/Downloads/Projects/Nutrition-AI%20Minor%20Project/frontend/src/pages/Dashboard/Nutritionist/AppointmentManagement.jsx)
   - ⚙️ **Backend Controller:** [`AppointmentController.java`](file:///Users/mihirsharma/Downloads/Projects/Nutrition-AI%20Minor%20Project/backend/src/main/java/com/nutrition/controller/AppointmentController.java)
   - **Details:** View incoming patient consultation requests, accept appointments, and reject requests via backend APIs.

2. **Nutritionist Profile & Credentials**:
   - 🔗 **Test URL:** [http://localhost:5173/dashboard/nutritionist/profile](http://localhost:5173/dashboard/nutritionist/profile)
   - 💻 **Frontend Component:** [`NutritionistProfile.jsx`](file:///Users/mihirsharma/Downloads/Projects/Nutrition-AI%20Minor%20Project/frontend/src/pages/Dashboard/Nutritionist/NutritionistProfile.jsx)
   - ⚙️ **Backend Controller:** [`NutritionistProfileController.java`](file:///Users/mihirsharma/Downloads/Projects/Nutrition-AI%20Minor%20Project/backend/src/main/java/com/nutrition/controller/NutritionistProfileController.java)
   - **Details:** Edit public bio, consultation fees, specializations, and availability.

3. **Admin Verification Access Control**:
   - 🔗 **Test URL:** [http://localhost:5173/dashboard/nutritionist](http://localhost:5173/dashboard/nutritionist)
   - 💻 **Frontend Layout:** [`NutritionistDashboardLayout.jsx`](file:///Users/mihirsharma/Downloads/Projects/Nutrition-AI%20Minor%20Project/frontend/src/layouts/NutritionistDashboardLayout.jsx)
   - **Details:** Certified features stay locked until approved by Admin.

### ⚠️ Decorative / Show-Only Sections:
1. **Nutritionist Dashboard Stats Bar**:
   - 🔗 **Test URL:** [http://localhost:5173/dashboard/nutritionist](http://localhost:5173/dashboard/nutritionist)
   - 💻 **Frontend Component:** [`NutritionistHome.jsx`](file:///Users/mihirsharma/Downloads/Projects/Nutrition-AI%20Minor%20Project/frontend/src/pages/Dashboard/Nutritionist/NutritionistHome.jsx)
   - **Details:** Overview KPI cards showing Active Clients (`14`), Pending Requests (`3`), Hours This Week (`28`) are hardcoded summary numbers.

2. **Client Roster Data**:
   - 🔗 **Test URL:** [http://localhost:5173/dashboard/nutritionist/clients](http://localhost:5173/dashboard/nutritionist/clients)
   - 💻 **Frontend Component:** [`ClientManagement.jsx`](file:///Users/mihirsharma/Downloads/Projects/Nutrition-AI%20Minor%20Project/frontend/src/pages/Dashboard/Nutritionist/ClientManagement.jsx)
   - **Details:** Displays patient profiles and health histories using structured frontend mock data.

3. **Diet Plan Builder**:
   - 🔗 **Test URL:** [http://localhost:5173/dashboard/nutritionist/builder](http://localhost:5173/dashboard/nutritionist/builder)
   - 💻 **Frontend Component:** [`DietPlanBuilder.jsx`](file:///Users/mihirsharma/Downloads/Projects/Nutrition-AI%20Minor%20Project/frontend/src/pages/Dashboard/Nutritionist/DietPlanBuilder.jsx)
   - **Details:** Interactive UI for building prescription meal plans; clicking "Assign to Client" displays a success modal rather than linking to a specific patient ID in the database.

---

## 🛠️ 4. Admin Role (`ROLE_ADMIN`)

### ✅ Real / Working Features:
1. **User Management Portal (Search + Role & Status Filters)**:
   - 🔗 **Test URL:** [http://localhost:5173/dashboard/admin/users](http://localhost:5173/dashboard/admin/users)
   - 💻 **Frontend Component:** [`UserManagement.jsx`](file:///Users/mihirsharma/Downloads/Projects/Nutrition-AI%20Minor%20Project/frontend/src/pages/Dashboard/Admin/UserManagement.jsx)
   - ⚙️ **Backend Controller:** [`AdminController.java`](file:///Users/mihirsharma/Downloads/Projects/Nutrition-AI%20Minor%20Project/backend/src/main/java/com/nutrition/controller/AdminController.java)
   - **Details:** View all users, search by Name/Email, filter by Role (`ALL`, `USER`, `NUTRITIONIST`, `ADMIN`), filter by Status (`VERIFIED`, `PENDING OTP`), change user roles, delete users, and reset passwords via backend endpoints.

2. **Nutritionist Verification Portal**:
   - 🔗 **Test URL:** [http://localhost:5173/dashboard/admin/nutritionists](http://localhost:5173/dashboard/admin/nutritionists)
   - 💻 **Frontend Component:** [`NutritionistManagement.jsx`](file:///Users/mihirsharma/Downloads/Projects/Nutrition-AI%20Minor%20Project/frontend/src/pages/Dashboard/Admin/NutritionistManagement.jsx)
   - ⚙️ **Backend Controller:** [`AdminController.java`](file:///Users/mihirsharma/Downloads/Projects/Nutrition-AI%20Minor%20Project/backend/src/main/java/com/nutrition/controller/AdminController.java)
   - **Details:** Approve or suspend nutritionist verification applications.

3. **SQL Console**:
   - 🔗 **Test URL:** [http://localhost:5173/dashboard/admin/sql](http://localhost:5173/dashboard/admin/sql)
   - 💻 **Frontend Component:** [`SqlConsole.jsx`](file:///Users/mihirsharma/Downloads/Projects/Nutrition-AI%20Minor%20Project/frontend/src/pages/Dashboard/Admin/SqlConsole.jsx)
   - ⚙️ **Backend Controller:** [`AdminController.java`](file:///Users/mihirsharma/Downloads/Projects/Nutrition-AI%20Minor%20Project/backend/src/main/java/com/nutrition/controller/AdminController.java)
   - **Details:** Execute real-time database queries directly against PostgreSQL/MySQL via `/api/admin/sql`.

4. **Testimonial Management Portal**:
   - 🔗 **Test URL:** [http://localhost:5173/dashboard/admin/testimonials](http://localhost:5173/dashboard/admin/testimonials)
   - 💻 **Frontend Component:** [`TestimonialManagement.jsx`](file:///Users/mihirsharma/Downloads/Projects/Nutrition-AI%20Minor%20Project/frontend/src/pages/Dashboard/Admin/TestimonialManagement.jsx)
   - ⚙️ **Backend Controller:** [`TestimonialController.java`](file:///Users/mihirsharma/Downloads/Projects/Nutrition-AI%20Minor%20Project/backend/src/main/java/com/nutrition/controller/TestimonialController.java)
   - **Details:** Moderate, publish/unpublish, filter by role/search, and delete any member testimonial across the platform.

### ⚠️ Decorative / Show-Only Sections:
1. **Admin Overview KPI Counters**:
   - 🔗 **Test URL:** [http://localhost:5173/dashboard/admin](http://localhost:5173/dashboard/admin)
   - 💻 **Frontend Component:** [`AdminHome.jsx`](file:///Users/mihirsharma/Downloads/Projects/Nutrition-AI%20Minor%20Project/frontend/src/pages/Dashboard/Admin/AdminHome.jsx)
   - **Details:** System stats (Active Users `1,284`, Active Nutritionists `42`, AI Queries Today `8,920`, System Uptime `99.9%`) are static KPI counters.

2. **Payment Management Page**:
   - 🔗 **Test URL:** [http://localhost:5173/dashboard/admin/payments](http://localhost:5173/dashboard/admin/payments)
   - 💻 **Frontend Component:** [`PaymentManagement.jsx`](file:///Users/mihirsharma/Downloads/Projects/Nutrition-AI%20Minor%20Project/frontend/src/pages/Dashboard/Admin/PaymentManagement.jsx)
   - **Details:** Displays a mock transaction logs table for demonstrating transaction monitoring UI.

---

- **File Location:** [`AUDIT_SHOW_VS_REAL_FEATURES.md`](file:///Users/mihirsharma/Downloads/Projects/Nutrition-AI%20Minor%20Project/AUDIT_SHOW_VS_REAL_FEATURES.md)
- **Last Updated:** October 10, 2026
