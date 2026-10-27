# Role-Based Feature Matrix

Audit date: 19 October 2026

This document lists the frontend features, navigation groups, and routes
currently present for each application role. Role names are normalized from
values such as `ROLE_ADMIN` and `ROLE_NUTRITIONIST`.

## Guest / unauthenticated visitor

### Available navigation

- Home
- Platform Roles
- AI Suite & Features
- Testimonials
- About
- Contact

### Available features

- View the public home page
- Browse platform role information
- Open the public AI feature links:
  - AI Diet Generator
  - AI Food Analyzer
  - AI Health Companion
  - Smart Hydration & Progress
  - Personal Diet Plans
  - Consultations & Bookings
  - Health Reports
- View testimonials
- View About content
- Submit or view Contact content
- Register
- Log in
- Verify email
- Verify OTP
- Reset a forgotten password

Guest access to protected features is controlled by `FeatureGate` and may
redirect the visitor to login or registration.

## Standard user

### Home page content

- Personal nutrition workspace messaging
- AI meal planning call-to-action
- AI Diet Generator
- AI Food Analyzer
- Progress and water tracking
- Consultation booking
- AI Nutrition Coach
- User appointments call-to-action

### Navigation groups

#### Platform Features

- AI Diet Generator — `/ai-diet`
- AI Food Analyzer — `/ai-image`
- AI Health Companion — `/ai-chat`

#### Diet & Progress

- Progress Tracking — `/progress`
- Diet Plans — `/diet-plans`
- Health Reports — `/reports`

#### Consultation

- Appointments — `/appointments`
- Transactions — `/transactions`

### User features and routes

| Feature | Route |
|---|---|
| User dashboard | `/dashboard/user` |
| Profile and preferences | `/profile` or `/dashboard/user/profile` |
| AI diet generation | `/ai-diet` or `/dashboard/user/ai-diet` |
| AI food image analysis | `/ai-image` or `/dashboard/user/ai-image` |
| AI nutrition chat | `/ai-chat` or `/dashboard/user/ai-chat` |
| Progress, hydration, and targets | `/progress`, `/dashboard/user/progress`, or `/dashboard/progress` |
| Personal diet plan library | `/diet-plans` or `/dashboard/user/diet-plans` |
| Appointments and bookings | `/appointments`, `/dashboard/appointments`, or `/dashboard/user/appointments` |
| Health reports | `/reports`, `/dashboard/reports`, or `/dashboard/user/reports` |
| Virtual consultation room | `/virtual-room` or `/room` |
| Transactions and wallet history | `/transactions` or `/dashboard/user/transactions` |

## Nutritionist / nutritionist

The application treats `NUTRITIONIST` and `NUTRITIONIST` as the same clinical
feature role.

### Home page content

- Clinical workspace messaging
- Clinical dashboard call-to-action
- Clinical Dashboard
- Diet Plan Builder
- Consultation Schedule
- Clinical Operations & Schedule call-to-action
- Patient consultation overview
- Real upcoming consultation data
- Wallet earnings
- Consultation totals

### Navigation groups

#### Platform Features

- Clinical Command Core — `/dashboard/nutritionist`
- AI Diet Generator — `/ai-diet`
- AI Food Analyzer — `/ai-image`
- AI Health Companion — `/ai-chat`

#### Schedule

- Schedule — `/dashboard/nutritionist/schedule`

#### Diet & Reports

- Diet Builder — `/dashboard/nutritionist/builder`
- Clinical Reports — `/dashboard/nutritionist/reports`

### Nutritionist features and routes

| Feature | Route |
|---|---|
| Clinical command dashboard | `/dashboard/nutritionist` |
| Structured diet plan builder | `/dashboard/nutritionist/builder` |
| Appointment schedule and management | `/dashboard/nutritionist/schedule` |
| Clinical reports and adherence reporting | `/dashboard/nutritionist/reports` |
| Nutritionist profile | `/dashboard/nutritionist/profile` |
| AI diet generation | `/ai-diet` |
| AI food analysis | `/ai-image` |
| AI nutrition chat | `/ai-chat` |
| Virtual consultation room | `/virtual-room` or `/room` |
| Wallet and transaction history | `/dashboard/nutritionist/transactions` |
| Public testimonials and contact | `/testimonials`, `/contact` |

The dashboard consultation summary loads appointments from
`/api/appointments/me`. The wallet card loads the authenticated wallet from
`/api/wallet/me`.

## Administrator

### Home page content

- Administration workspace messaging
- Admin Dashboard
- Diet Plan Management
- User and Nutritionist Management
- Payment Operations
- Platform Administration & Controls call-to-action
- Platform operations and system metrics

### Navigation groups

#### System and Analytics Core

- System Core — `/dashboard/admin`
- Diet Plans Management — `/dashboard/admin/diet-plans`
- Payments — `/dashboard/admin/payments`
- SQL Console — `/dashboard/admin/sql`

#### Platform Features

- AI Diet Generator — `/ai-diet`
- AI Food Analyzer — `/ai-image`
- AI Health Companion — `/ai-chat`

#### User Administration

- User Directory & Roles — `/dashboard/admin/users`
- Nutritionist Verification — `/dashboard/admin/nutritionists`

#### Additional navigation

- Testimonials — `/dashboard/admin/testimonials`
- Contact — `/contact`

### Administrator features and routes

| Feature | Route |
|---|---|
| Admin home and system core | `/dashboard/admin` |
| All stored diet plan management | `/dashboard/admin/diet-plans` |
| User directory and role management | `/dashboard/admin/users` |
| Nutritionist/nutritionist verification | `/dashboard/admin/nutritionists` |
| SQL console | `/dashboard/admin/sql` |
| Payment management and wallet operations | `/dashboard/admin/payments` |
| Transaction history | `/dashboard/admin/transactions` |
| Testimonial management | `/dashboard/admin/testimonials` |
| AI diet generation tools | `/ai-diet` |
| AI food analysis tools | `/ai-image` |
| AI nutrition chat | `/ai-chat` |
| Admin profile and credentials | `/dashboard/admin/profile` |
| Public contact page | `/contact` |

The admin diet plan management screen is intended to show every database
record, including AI-created plans, without collapsing duplicate records.

## Shared routes and platform services

These routes are registered in the application and may be used by more than
one role, subject to backend authentication and authorization:

- Home — `/`
- About — `/about`
- User Roles — `/user-roles` and `/roles`
- Testimonials — `/testimonials`
- Contact — `/contact`
- Virtual Room — `/virtual-room` and `/room`
- Authentication routes:
  - `/login`
  - `/register`
  - `/verify`
  - `/verify-otp`
  - `/forgot-password`
  - `/reset-password`
- Not found page — all unmatched routes

## Role-specific home behavior

The home page uses the authenticated role to change its content:

- Guests and users see personal AI nutrition features.
- Nutritionists and nutritionists see clinical workflow features.
- Administrators see system management features.
- The final CTA also changes its destination:
  - User: `/dashboard/user/appointments`
  - Nutritionist/nutritionist: `/dashboard/nutritionist/schedule`
  - Admin: `/dashboard/admin`

## Important implementation notes

- The route table mounts dashboard page components directly under the global
  layout. The previously unused role-specific dashboard layout components were
  removed.
- The admin layout contains Blog CMS and Global Recipes navigation entries, but
  `/dashboard/admin/blogs` and `/dashboard/admin/recipes` are not registered in
  `App.jsx`. They are currently unreachable until routes are added.
- The previously unreachable Services, Blog, Recipes, and Admin Analytics page
  components have been removed.
- Backend authorization remains the source of truth. Frontend role-specific
  navigation improves usability but must not be treated as a security boundary.
