# Dummy and Non-Live Data Audit

Audit date: 19 October 2026

This audit lists frontend and backend blocks that display hardcoded sample
names, fabricated metrics, seeded records, static chart data, or deterministic
fallback content instead of live database/API data.

## Confirmed dummy or non-live data blocks

### 1. Dietitian Reports chart

File: [DietitianReports.jsx](./frontend/src/pages/Dashboard/Dietitian/DietitianReports.jsx)

The six-week adherence chart uses hardcoded values:

```js
data: [72, 78, 85, 84, 88, 88]
```

The following content is also static:

- “Aggregate protocol compliance across your 42 active users”
- Cohort options such as “Diabetes Management Cohort”
- “CGM Spikes” and “HRV Trends” report options
- System insight text claiming “92%” AI efficiency

The chart and claims are not loaded from a backend adherence or analytics
endpoint.

### 2. Dietitian Plan Builder seeded history

File: [DietPlanBuilder.jsx](./frontend/src/pages/Dashboard/Dietitian/DietPlanBuilder.jsx)

`SEED_HISTORY_PLANS` contains fabricated plans:

- Clinical Metabolic Optimization Protocol
- Ketogenic Glycemic Reset Protocol
- Exclusive Protocol for David Miller

The records contain hardcoded:

- Patient names
- Patient IDs
- Dietitian name and email
- Calories and macro targets
- Meal names and ingredients
- Nutritionist notes
- Deployment timestamps

The seed data is used when local diet-plan history is unavailable.

### 3. Dietitian Plan Builder fallback patient roster

File: [DietPlanBuilder.jsx](./frontend/src/pages/Dashboard/Dietitian/DietPlanBuilder.jsx)

The fallback roster contains fabricated patient records:

- David Miller
- Marcus Chen
- Elena Rodriguez
- James Wilson

The records include fake:

- IDs and email addresses
- Age, gender, height, and weight
- BMI, BMR, and TDEE
- Goals and allergies
- Adherence percentages
- Clinical statuses
- Calories, protein, carbs, fats, and water targets
- Clinical notes

This roster is shown when loading real users fails or returns no usable data.

### 4. Consultation chat default patients

File: [ConsultationChatModal.jsx](./frontend/src/components/ConsultationChatModal.jsx)

`DEFAULT_PATIENTS` contains fabricated patients:

- David Miller
- Marcus Chen
- Elena Rodriguez
- James Wilson

The records include hardcoded IDs, emails, and health goals. They are used as
fallback patient data in the consultation chat flow.

### 5. About page testimonials

File: [About.jsx](./frontend/src/pages/About.jsx)

The About page contains hardcoded testimonial identities, including:

- Marcus Chen
- Sarah Jenkins

These should be replaced with records from the testimonial API if the About
page is expected to show live testimonials.

### 6. Seed testimonials

File: [testimonialService.js](./frontend/src/services/testimonialService.js)

The testimonial service contains `seed-*` testimonial records. These are
local/demo records and are not guaranteed to represent database testimonials.

### 7. Admin credential fallback values

File: [AdminHome.jsx](./frontend/src/pages/Dashboard/Admin/AdminHome.jsx)

The page contains hardcoded fallback credentials:

```js
email: import.meta.env.VITE_ADMIN_EMAIL || 'admin@nutrimunch.com',
password: import.meta.env.VITE_ADMIN_PASSWORD || 'AdminPass123!'
```

The page does call `/admin/credentials`, but if that request fails it can
display the fallback values.

Displaying default passwords in the UI is inappropriate for production and
should be removed. The page should show an unavailable/error state instead.

### 8. Admin analytics and system insights

File: [AdminHome.jsx](./frontend/src/pages/Dashboard/Admin/AdminHome.jsx)

The page requests `/admin/analytics`, so the primary path is live. However,
any KPI or insight text in the component that is not sourced from the response
is static and should not be presented as live telemetry.

The backend analytics endpoint should be the only source of truth for:

- System counts
- User counts
- Dietitian counts
- AI request counts
- Platform activity
- System uptime

### 9. Home page static biometric display

File: [Home.jsx](./frontend/src/pages/Home.jsx)

The home page displays fixed marketing values:

- `2,250 kcal`
- `35% P / 45% C / 20% F`

These values are not connected to the logged-in user profile or daily
nutritional targets.

### 10. Static home page imagery

File: [Home.jsx](./frontend/src/pages/Home.jsx)

The home page uses fixed external image URLs and promotional dashboard
imagery. These are presentation assets, not live user data.

### 11. Local food database

File: [foodDatabase.js](./frontend/src/data/foodDatabase.js)

The food database contains hardcoded food nutrition records. This may be an
intentional offline/reference dataset, but it is not database-backed live food
data.

### 12. AI deterministic fallback plans

Frontend file: [AiDietGenerator.jsx](./frontend/src/pages/Dashboard/User/AiDietGenerator.jsx)

When live AI generation is unavailable, the frontend parses deterministic
fallback Markdown plans.

Backend file: [AiService.java](./backend/src/main/java/com/nutrition/service/AiService.java)

The backend also contains a rule-based fallback engine when the AI provider is
unavailable or unconfigured.

These are intentional resilience fallbacks, but the resulting plan is not
generated by live AI.

## Not classified as dummy

The following areas currently use real backend data or valid empty states:

- Nutritionist upcoming consultations in
  [DietitianHome.jsx](./frontend/src/pages/Dashboard/Dietitian/DietitianHome.jsx)
- Nutritionist wallet balance from `/api/wallet/me`
- User transactions
- Admin diet plans from `/api/diet-plans/all`
- User saved diet plans
- User appointment records
- User and nutritionist profiles loaded from backend APIs
- Empty messages such as “No upcoming consultations scheduled”
- Zero anomaly count when no anomaly endpoint or anomaly data exists

## Highest-priority blocks to replace

1. [DietPlanBuilder.jsx](./frontend/src/pages/Dashboard/Dietitian/DietPlanBuilder.jsx) — fallback patient roster
2. [ConsultationChatModal.jsx](./frontend/src/components/ConsultationChatModal.jsx) — default chat patients
3. [DietPlanBuilder.jsx](./frontend/src/pages/Dashboard/Dietitian/DietPlanBuilder.jsx) — seeded diet-plan history
4. [DietitianReports.jsx](./frontend/src/pages/Dashboard/Dietitian/DietitianReports.jsx) — static adherence chart
5. [Home.jsx](./frontend/src/pages/Home.jsx) — static calorie and macro values
6. [AdminHome.jsx](./frontend/src/pages/Dashboard/Admin/AdminHome.jsx) — fallback admin credentials

## Recommended replacement behavior

- Load all patient, appointment, diet-plan, testimonial, and analytics values
  from authenticated backend endpoints.
- Show loading, empty, and error states instead of fabricated records.
- Do not display fallback passwords or default credentials.
- Keep deterministic AI fallbacks clearly labeled as fallback output.
- Keep local food records only if offline/reference behavior is intentional;
  otherwise replace them with a versioned backend nutrition database.
