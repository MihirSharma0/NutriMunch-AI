import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from './context/AuthContext';
import GlobalLayout from './layouts/GlobalLayout';
import Home from './pages/Home';
import About from './pages/About';
import Testimonials from './pages/Testimonials';
import Contact from './pages/Contact';
import UserRoles from './pages/UserRoles';
import NotFound from './pages/NotFound';
import Login from './pages/Authentication/Login';
import Register from './pages/Authentication/Register';
import VerifyEmail from './pages/Authentication/VerifyEmail';
import VerifyOtp from './pages/Authentication/VerifyOtp';
import ForgotPassword from './pages/Authentication/ForgotPassword';
import ResetPassword from './pages/Authentication/ResetPassword';

// User Dashboard Layout & Pages
import DashboardHome from './pages/Dashboard/User/DashboardHome';
import Profile from './pages/Dashboard/User/Profile';
import Appointments from './pages/Dashboard/User/Appointments';
import ProgressTracking from './pages/Dashboard/User/ProgressTracking';
import DietPlans from './pages/Dashboard/User/DietPlans';
import Reports from './pages/Dashboard/User/Reports';
import AiDietGenerator from './pages/Dashboard/User/AiDietGenerator';
import AiImageAnalyzer from './pages/Dashboard/User/AiImageAnalyzer';
import VirtualRoom from './pages/VirtualRoom';

// Nutritionist Dashboard Layout & Pages
import NutritionistHome from './pages/Dashboard/Nutritionist/NutritionistHome';
import ClientManagement from './pages/Dashboard/Nutritionist/ClientManagement';
import DietPlanBuilder from './pages/Dashboard/Nutritionist/DietPlanBuilder';
import AppointmentManagement from './pages/Dashboard/Nutritionist/AppointmentManagement';
import NutritionistReports from './pages/Dashboard/Nutritionist/NutritionistReports';
import NutritionistProfile from './pages/Dashboard/Nutritionist/NutritionistProfile';

// Admin Dashboard Layout & Pages
import AdminHome from './pages/Dashboard/Admin/AdminHome';
import UserManagement from './pages/Dashboard/Admin/UserManagement';
import SqlConsole from './pages/Dashboard/Admin/SqlConsole';
import NutritionistManagement from './pages/Dashboard/Admin/NutritionistManagement';
import PaymentManagement from './pages/Dashboard/Admin/PaymentManagement';
import AdminProfile from './pages/Dashboard/Admin/AdminProfile';
import DietPlanManagement from './pages/Dashboard/Admin/DietPlanManagement';
import TransactionHistory from './pages/Dashboard/Shared/TransactionHistory';
import TestimonialManagement from './pages/Dashboard/Admin/TestimonialManagement';

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'instant'
    });
  }, [pathname]);

  return null;
}

const queryClient = new QueryClient();

function App() {
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  return (
    <HelmetProvider>
      <GoogleOAuthProvider clientId={googleClientId}>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <Router>
              <ScrollToTop />
              <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/verify" element={<VerifyEmail />} />
            <Route path="/verify-otp" element={<VerifyOtp />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            <Route path="/" element={<GlobalLayout />}>
              <Route index element={<Home />} />
              <Route path="about" element={<About />} />
              <Route path="user-roles" element={<UserRoles />} />
              <Route path="roles" element={<UserRoles />} />
              <Route path="testimonials" element={<Testimonials />} />
              <Route path="contact" element={<Contact />} />

              {/* User Platform Feature Routes */}
              <Route path="profile" element={<Profile />} />
              <Route path="ai-diet" element={<AiDietGenerator />} />
              <Route path="ai-image" element={<AiImageAnalyzer />} />
              <Route path="progress" element={<ProgressTracking />} />
              <Route path="appointments" element={<Appointments />} />
              <Route path="reports" element={<Reports />} />
              <Route path="diet-plans" element={<DietPlans />} />
              <Route path="virtual-room" element={<VirtualRoom />} />
              <Route path="room" element={<VirtualRoom />} />

              {/* User Dashboard Aliases */}
              <Route path="dashboard/user" element={<DashboardHome />} />
              <Route path="dashboard/user/profile" element={<Profile />} />
              <Route path="dashboard/user/ai-diet" element={<AiDietGenerator />} />
              <Route path="dashboard/user/ai-image" element={<AiImageAnalyzer />} />
              <Route path="dashboard/user/progress" element={<ProgressTracking />} />
              <Route path="dashboard/progress" element={<ProgressTracking />} />
              <Route path="dashboard/diet-plans" element={<DietPlans />} />
              <Route path="dashboard/appointments" element={<Appointments />} />
              <Route path="dashboard/reports" element={<Reports />} />
              <Route path="dashboard/user/appointments" element={<Appointments />} />
              <Route path="dashboard/user/reports" element={<Reports />} />
              <Route path="dashboard/user/diet-plans" element={<DietPlans />} />

              {/* Nutritionist Platform Routes */}
              <Route path="dashboard/nutritionist" element={<NutritionistHome />} />
              <Route path="dashboard/nutritionist/profile" element={<NutritionistProfile />} />
              <Route path="dashboard/nutritionist/clients" element={<ClientManagement />} />
              <Route path="dashboard/nutritionist/builder" element={<DietPlanBuilder />} />
              <Route path="dashboard/nutritionist/schedule" element={<AppointmentManagement />} />
              <Route path="dashboard/nutritionist/reports" element={<NutritionistReports />} />

              {/* Admin Platform Routes */}
              <Route path="dashboard/admin" element={<AdminHome />} />
              <Route path="dashboard/admin/diet-plans" element={<DietPlanManagement />} />
              <Route path="dashboard/admin/profile" element={<AdminProfile />} />
              <Route path="dashboard/admin/users" element={<UserManagement />} />
              <Route path="dashboard/admin/sql" element={<SqlConsole />} />
              <Route path="dashboard/admin/nutritionists" element={<NutritionistManagement />} />
              <Route path="dashboard/admin/testimonials" element={<TestimonialManagement />} />
              <Route path="dashboard/admin/payments" element={<PaymentManagement />} />
              <Route path="transactions" element={<TransactionHistory />} />
              <Route path="dashboard/user/transactions" element={<TransactionHistory />} />
              <Route path="dashboard/nutritionist/transactions" element={<TransactionHistory />} />
              <Route path="dashboard/admin/transactions" element={<TransactionHistory />} />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
    </GoogleOAuthProvider>
    </HelmetProvider>
  );
}

export default App;
