# Redundant and Unused Web Pages

Audit date: 19 October 2026

This inventory compares the page components under `frontend/src/pages` with the
routes registered in `frontend/src/App.jsx` and the navigation references in the
frontend.

## Confirmed unreachable page components

These page components are imported in `App.jsx` or present in the project, but
they do not have a registered route. They cannot be opened through the
application router.

| Component | File | Evidence | Recommendation |
|---|---|---|---|
| `Services` | `frontend/src/pages/Services.jsx` | Imported in `App.jsx`, but no `/services` route exists | Remove if the services landing page is not planned; otherwise add a route |
| `Blog` | `frontend/src/pages/Blog.jsx` | Imported in `App.jsx`, but no `/blog` route exists | Remove if blog functionality is not planned; otherwise add a route |
| `Recipes` | `frontend/src/pages/Recipes.jsx` | Imported in `App.jsx`, but no `/recipes` route exists | Remove if recipes are not planned; otherwise add a route |
| `AdminAnalytics` | `frontend/src/pages/Dashboard/Admin/AdminAnalytics.jsx` | Imported in `App.jsx`, but no admin analytics route exists | Remove the unused page/import or register an analytics route |

## Unused layout components

These dashboard layouts are not rendered by any route. The dashboard pages are
currently mounted directly under the global layout.

| Component | File | Recommendation |
|---|---|---|
| `UserDashboardLayout` | `frontend/src/layouts/UserDashboardLayout.jsx` | Remove after confirming its navigation/sidebar is no longer needed |
| `NutritionistDashboardLayout` | `frontend/src/layouts/NutritionistDashboardLayout.jsx` | Remove after confirming the nutritionist layout is intentionally unused |
| `AdminDashboardLayout` | `frontend/src/layouts/AdminDashboardLayout.jsx` | Keep only if the admin dashboard will be migrated to nested layout routes |

`App.jsx` imports all three layouts but does not use them in JSX.

## Orphaned page sections

These files are only used by pages that are themselves unreachable, or were
left behind after the corresponding page was removed.

### Pricing sections — no longer used

The pricing page and `/pricing` route were removed. These files now have no
active consumer:

- `frontend/src/pages/PricingSections/FeatureComparisonTable.jsx`
- `frontend/src/pages/PricingSections/PricingFAQ.jsx`

The `frontend/src/pages/PricingSections/` directory can be removed if pricing
will not return.

### Unreachable page sections

The following sections are used only by currently unreachable landing pages:

- `frontend/src/pages/ServicesSections/DetailedServices.jsx`
- `frontend/src/pages/BlogSections/FeaturedArticle.jsx`
- `frontend/src/pages/BlogSections/CategoriesFilter.jsx`
- `frontend/src/pages/BlogSections/NewsletterSignup.jsx`
- `frontend/src/pages/BlogSections/Pagination.jsx`
- `frontend/src/pages/RecipesSections/RecipeCategories.jsx`
- `frontend/src/pages/RecipesSections/SubmitRecipeCTA.jsx`

They should be removed together with their parent page if those features are
not going to be restored.

## Navigation links without registered routes

`AdminDashboardLayout.jsx` contains navigation entries for:

- `/dashboard/admin/blogs`
- `/dashboard/admin/recipes`

There are corresponding components:

- `frontend/src/pages/Dashboard/Admin/BlogManagement.jsx`
- `frontend/src/pages/Dashboard/Admin/RecipeManagement.jsx`

However, neither route is registered in `App.jsx`. These are not redundant
pages in the strict sense; they are currently unreachable admin features.
Either register the routes or remove the navigation items and components.

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

## Recommended cleanup order

1. Decide whether Services, Blog, and Recipes are planned features.
2. Register or remove the admin Blog and Recipes management pages.
3. Remove the unused pricing sections.
4. Remove unused layout components after confirming no migration to nested
   layouts is planned.
5. Remove the unreachable page components and their child sections.
6. Remove unused imports from `App.jsx`.

No files other than this audit were deleted as part of this review.
