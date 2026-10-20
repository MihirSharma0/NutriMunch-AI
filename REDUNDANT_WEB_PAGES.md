# Redundant and Unused Web Pages

Audit date: 19 October 2026

This inventory compares the page components under `frontend/src/pages` with the
routes registered in `frontend/src/App.jsx` and the navigation references in the
frontend.

## Removed unreachable page components

The following unreachable page components and their unused `App.jsx` imports
were removed:

- `frontend/src/pages/Services.jsx`
- `frontend/src/pages/Blog.jsx`
- `frontend/src/pages/Recipes.jsx`
- `frontend/src/pages/Dashboard/Admin/AdminAnalytics.jsx`

## Removed unused layout components

The following unused dashboard layout components and their `App.jsx` imports
were removed. Dashboard pages remain mounted directly under the global layout:

- `frontend/src/layouts/UserDashboardLayout.jsx`
- `frontend/src/layouts/NutritionistDashboardLayout.jsx`
- `frontend/src/layouts/AdminDashboardLayout.jsx`

## Removed orphaned sections and admin pages

The following unused sections and unreachable admin management components were
also removed:

- Pricing sections
- Services page sections
- Blog page sections
- Recipes page sections
- `frontend/src/pages/Dashboard/Admin/BlogManagement.jsx`
- `frontend/src/pages/Dashboard/Admin/RecipeManagement.jsx`
- `frontend/src/pages/HomeSections/GlobalAISection.jsx`
- `frontend/src/pages/HomeSections/AINutritionCoach.jsx`
- `frontend/src/pages/HomeSections/BenefitsPersonalizedNutrition.jsx`
- `frontend/src/pages/HomeSections/FeaturedPrograms.jsx`
- `frontend/src/pages/HomeSections/HealthTransformation.jsx`
- `frontend/src/pages/HomeSections/WhyChooseUs.jsx`
- `frontend/src/pages/TestimonialSections/SuccessMetrics.jsx`
- `frontend/src/pages/TestimonialSections/VideoTestimonials.jsx`
- `frontend/src/pages/Dashboard/User/AiChat.jsx`

## Removed orphaned backend dead code

- `BlogController.java`, `BlogService.java`, `BlogRepository.java`, `Blog.java`
- `RecipeController.java`, `RecipeService.java` (retaining `Recipe.java` and `RecipeRepository.java` for active AI food analyzer alternative suggestions)
- `BookingController.java` (sessions are managed via `AppointmentController.java`)
- `NutritionRuleController.java` (unreferenced admin rule controller)

## Active pages

The following top-level pages currently have registered routes and should not
be classified as redundant:

- Home
- About
- User Roles
- Testimonials
- Contact
- Authentication pages
- User dashboard pages
- Nutritionist dashboard pages
- Admin dashboard pages
- Virtual Room
- Transaction History
- Not Found

The unreachable page components, orphaned sections, empty directories, and
unused `App.jsx` imports listed above have been deleted.
