#!/usr/bin/env bash
set -e

echo "=========================================="
echo "🚀 Initializing Nutrition AI Dev Container"
echo "=========================================="

# Ensure proper execution permissions
if [ -f "/workspace/backend/mvnw" ]; then
  chmod +x /workspace/backend/mvnw
fi

# Ensure frontend .env exists
if [ ! -f "/workspace/frontend/.env" ]; then
  echo "Creating frontend/.env..."
  cat << 'EOF' > /workspace/frontend/.env
VITE_API_BASE_URL=http://localhost:8080/api
VITE_GOOGLE_CLIENT_ID=821596411066-uue8nf11fgqvpcbj8rn7ugqtqejihd8s.apps.googleusercontent.com
EOF
fi

# Create a reference local database env file for Codespaces
if [ ! -f "/workspace/backend/.env.local" ]; then
  cat << 'EOF' > /workspace/backend/.env.local
FRONTEND_LOGIN_URL=http://localhost:5173/login
DB_URL=jdbc:mysql://db:3306/nutrition_db?createDatabaseIfNotExist=true
DB_USERNAME=root
DB_PASSWORD=password
ADMIN_EMAIL=admin@gmail.com
ADMIN_PASSWORD=admin123
EOF
fi

# Install Frontend Dependencies
echo ""
echo "📦 Installing Frontend Dependencies (npm)..."
cd /workspace/frontend
npm install

# Resolve Backend Dependencies
echo ""
echo "☕ Resolving Backend Maven Dependencies..."
cd /workspace/backend
./mvnw dependency:resolve -B -DskipTests || true

echo ""
echo "============================================================"
echo "✅ Environment Setup Completed Successfully!"
echo "============================================================"
echo ""
echo "To start the application:"
echo "  1. Backend (Spring Boot API):"
echo "       cd backend && ./mvnw spring-boot:run"
echo ""
echo "  2. Frontend (React / Vite):"
echo "       cd frontend && npm run dev -- --host"
echo ""
echo "  3. Local MySQL Database is running on port 3306 (service: 'db')"
echo "     Database: nutrition_db | User: root | Password: password"
echo "============================================================"
