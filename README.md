# AI CalorieMeter & Nutrition Platform 🥗✨

A comprehensive, full-stack AI-driven nutrition and diet management platform built with **React (Vite)** and **Spring Boot**. The platform connects everyday users with professional nutritionists and provides AI-powered dietary insights, personalized meal plans, and progress tracking.

## 🌟 Key Features

- **Robust Authentication & Security**
  - Secure JWT-based authentication.
  - Mandatory Email OTP Verification during registration (powered by JavaMailSender & Thymeleaf).
  - Role-Based Access Control (RBAC).
- **Role-Specific Dashboards**
  - **User Portal**: Track calories, get AI-powered diet plans, chat with AI, and book nutritionist appointments.
  - **Dietitian Portal**: Manage client portfolios, build custom meal plans, and track client adherence.
  - **Admin Portal**: Platform analytics, user management, and system overview.
- **Automated Database Management**
  - Seamless schema tracking and updates using **Flyway Migrations**.
- **Modern & Responsive UI**
  - Glassmorphism design system built with Tailwind CSS.
  - Highly responsive for mobile, tablet, and desktop viewing.

----

## 🛠️ Technology Stack

### Frontend (Client)
- **Framework**: React 18 with Vite
- **Styling**: Tailwind CSS
- **Routing**: React Router DOM v6
- **State Management**: Context API & React Query
- **Icons**: Lucide React
- **Deployment**: Vercel

### Backend (Server)
- **Framework**: Java Spring Boot 
- **Security**: Spring Security & JSON Web Tokens (JWT)
- **Database Mapping**: Spring Data JPA / Hibernate
- **Database Migrations**: Flyway
- **Templating**: Thymeleaf (for dynamic HTML emails)
- **Deployment**: Render (via Dockerfile/Java Runtime)

### Database
- **Primary DB**: MySQL 8.0 (Managed via Aiven Cloud)

---

## ⚡ One-Click Cloud Development (GitHub Codespaces)

This repository includes a pre-configured **Dev Container (`.devcontainer`)** for automated cloud development in GitHub Codespaces or VS Code Dev Containers:

1. Click the **Code** button at the top of your GitHub repository.
2. Select the **Codespaces** tab and click **Create codespace on main**.
3. GitHub Codespaces will automatically:
   - Configure **Java 17 (JDK)**, **Maven**, and **Node.js 20**.
   - Spin up a background **MySQL 8.0** service (`nutrition_db` on port `3306`).
   - Run `npm install` for frontend packages and resolve Maven dependencies.
   - Forward ports **5173** (React App), **8080** (Spring Boot API), and **3306** (MySQL).
4. Run the project in the Codespace terminal:
   - **Backend**: `cd backend && ./mvnw spring-boot:run`
   - **Frontend**: `cd frontend && npm run dev`

---

## 🚀 Getting Started (Local Development)

### Prerequisites
- **Node.js** (v18+)
- **Java** (JDK 17+)
- **Maven**
- **MySQL** (Local Docker container or Cloud Database)

### 1. Clone the Repository
```bash
git clone https://github.com/MihirSharma0/Nutrition-AI-Minor-Project.git
cd Nutrition-AI-Minor-Project
```

### 2. Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create a `.env` file in the `backend/` root directory and configure your credentials:
   ```env
   # Frontend URL (For Email redirect links)
   FRONTEND_LOGIN_URL=http://localhost:5173/login

   # Email OTP Configuration (Use Gmail App Passwords)
   OTP_VERIFICATION_EMAIL=your-email@gmail.com
   OTP_VERIFICATION_PASSWORD=your-app-password

   # Database Configuration
   DB_URL=jdbc:mysql://localhost:3306/nutrition_db?createDatabaseIfNotExist=true&sslMode=REQUIRED
   DB_USERNAME=root
   DB_PASSWORD=password

   # Google Gemini API (required for live AI diet plans)
   GEMMA_API_KEY=your-google-ai-studio-key
   GEMMA_MODEL=gemini-2.0-flash
   ```
   The deterministic nutrition plan is used only when the Gemini API is unavailable.
3. Run the Spring Boot application:
   ```bash
   ./mvnw clean spring-boot:run
   ```
   *Note: Flyway will automatically create all necessary tables upon startup.*

### 3. Frontend Setup
1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install the dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the `frontend/` root directory:
   ```env
   VITE_API_BASE_URL=http://localhost:8080/api
   ```
4. Start the Vite development server:
   ```bash
   npm run dev
   ```
5. Open your browser and navigate to `http://localhost:5173`.

---

## ☁️ Deployment

### Backend (Render)
1. Create a new Web Service on Render.
2. Connect your GitHub repository.
3. Set the **Root Directory** to `backend`.
4. Set the **Environment** to `Docker` (Render will use the included `Dockerfile`).
5. Add the environment variables from your `.env` to the Render Environment tab.

### Frontend (Vercel)
1. Import the project into Vercel.
2. Set the **Root Directory** to `frontend`.
3. Add the `VITE_API_BASE_URL` environment variable pointing to your live Render backend URL.
4. Deploy!

---

## 📂 Project Structure

```text
Nutrition-AI-Minor-Project/
├── backend/
│   ├── src/main/java/com/nutrition/
│   │   ├── config/       # Application config
│   │   ├── controller/   # REST API Endpoints
│   │   ├── dto/          # Data Transfer Objects
│   │   ├── entity/       # JPA Database Models
│   │   ├── repository/   # DB Query Interfaces
│   │   ├── security/     # JWT & Auth Filters
│   │   └── service/      # Core Business Logic
│   ├── src/main/resources/
│   │   ├── db/migration/ # Flyway SQL Scripts
│   │   ├── templates/    # HTML Email Templates
│   │   └── application.yml
│   ├── pom.xml
│   └── Dockerfile
└── frontend/
    ├── src/
    │   ├── api/          # Axios Configurations
    │   ├── common/       # Shared UI (Navbar, Footer)
    │   ├── components/   # Reusable UI components
    │   ├── context/      # React Context (Auth)
    │   ├── layouts/      # Dashboard Layout Wrappers
    │   └── pages/        # Route Pages (Login, Dashboards, etc)
    ├── package.json
    └── tailwind.config.js
```
