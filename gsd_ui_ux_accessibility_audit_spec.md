# GSD Browser Automation & UI/UX Accessibility Audit Spec
**Project:** NutriMunch-AI  
**Target:** WCAG 2.1 AA/AAA Compliance across all 4 User Access Tiers  

---

## 1. Execution Objectives
Using the GSD browser automation subagent (`/browser` / `gsd-browser`), systematically crawl, inspect, and remediate all UI/UX contrast defects across the four security and privilege tiers:
1. **Guest / Pre-Authentication:** Landing page (`Home.jsx`), Login (`Login.jsx`), Register (`Register.jsx`), FAQ, and Contact forms.
2. **User Dashboard:** Dashboard home, AI diet generator, OCR/image analyzer, diet plans, appointments, progress tracking, and wallets.
3. **Nutritionist Portal:** Client roster, appointment management, and Diet Plan Builder (`DietPlanBuilder.jsx`).
4. **Admin Console:** Metrics home, user/nutritionist management, payment/refund management, and SQL/LLM configuration consoles.

---

## 2. Contrast & Visual Standards Checklist
* **Normal Text (< 18pt):** Minimum contrast ratio of **4.5:1** against backgrounds.
* **Large Text (≥ 18pt normal / ≥ 14pt bold):** Minimum contrast ratio of **3:1**.
* **UI Components, Borders, & Icons:** Minimum contrast ratio of **3:1**.
* **Tailwind Token Replacement Rules:**
  * *Failing Tokens:* `text-slate-400`, `text-gray-350`, `text-gray-400`, light placeholder opacities.
  * *Compliant Tokens:* `text-slate-600 dark:text-slate-400` (for secondary labels), `text-slate-800 dark:text-slate-200` (for primary labels/text), `border-slate-400 dark:border-slate-600` (for form inputs).

---

## 3. Step-by-Step Remediation Plan
1. **Launch App & GSD Daemon:** Ensure local server is running on `http://localhost:3000` and `gsd-browser mcp` is active.
2. **Execute Role Walkthrough:** Navigate through Guest -> User -> Nutritionist -> Admin portals.
3. **Apply Code Patches:** Refactor washed-out utility classes in `frontend/src/pages/` and `frontend/src/components/`.