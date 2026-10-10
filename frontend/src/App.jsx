import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from './context/AuthContext';
import GlobalLayout from './layouts/GlobalLayout';
import Home from './pages/Home';
import About from './pages/About';
import Services from './pages/Services';
import Pricing from './pages/Pricing';
import Blog from './pages/Blog';
import Recipes from './pages/Recipes';
import Testimonials from './pages/Testimonials';
import Contact from './pages/Contact';
import NotFound from './pages/NotFound';
import Login from './pages/Authentication/Login';
import Register from './pages/Authentication/Register';
import VerifyEmail from './pages/Authentication/VerifyEmail';
import VerifyOtp from './pages/Authentication/VerifyOtp';
import ForgotPassword from './pages/Authentication/ForgotPassword';
import ResetPassword from './pages/Authentication/ResetPassword';

// User Dashboard Layout & Pages
import UserDashboardLayout from './layouts/UserDashboardLayout';
import DashboardHome from './pages/Dashboard/User/DashboardHome';
import Profile from './pages/Dashboard/User/Profile';
import Appointments from './pages/Dashboard/User/Appointments';
import ProgressTracking from './pages/Dashboard/User/ProgressTracking';
import DietPlans from './pages/Dashboard/User/DietPlans';
import Reports from './pages/Dashboard/User/Reports';
import AiChat from './pages/Dashboard/User/AiChat';
import AiDietGenerator from './pages/Dashboard/User/AiDietGenerator';
import AiImageAnalyzer from './pages/Dashboard/User/AiImageAnalyzer';

// Nutritionist Dashboard Layout & Pages
import DietitianHome from './pages/Dashboard/Dietitian/DietitianHome';
import ClientManagement from './pages/Dashboard/Dietitian/ClientManagement';
import DietPlanBuilder from './pages/Dashboard/Dietitian/DietPlanBuilder';
import AppointmentManagement from './pages/Dashboard/Dietitian/AppointmentManagement';
import DietitianReports from './pages/Dashboard/Dietitian/DietitianReports';
import NutritionistDashboardLayout from './layouts/NutritionistDashboardLayout';
import NutritionistProfile from './pages/Dashboard/Nutritionist/NutritionistProfile';

// Admin Dashboard Layout & Pages
import AdminDashboardLayout from './layouts/AdminDashboardLayout';
import AdminHome from './pages/Dashboard/Admin/AdminHome';
import UserManagement from './pages/Dashboard/Admin/UserManagement';
import SqlConsole from './pages/Dashboard/Admin/SqlConsole';
import DietitianManagement from './pages/Dashboard/Admin/DietitianManagement';
import BlogManagement from './pages/Dashboard/Admin/BlogManagement';
import RecipeManagement from './pages/Dashboard/Admin/RecipeManagement';
import PaymentManagement from './pages/Dashboard/Admin/PaymentManagement';
import AdminAnalytics from './pages/Dashboard/Admin/AdminAnalytics';
import AdminProfile from './pages/Dashboard/Admin/AdminProfile';

const queryClient = new QueryClient();

function App() {
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  return (
    <HelmetProvider>
      <GoogleOAuthProvider clientId={googleClientId}>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <Router>
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
              <Route path="pricing" element={<Pricing />} />
              <Route path="contact" element={<Contact />} />
              
              {/* User Platform Feature Routes */}
              <Route path="profile" element={<Profile />} />
              <Route path="ai-diet" element={<AiDietGenerator />} />
              <Route path="ai-image" element={<AiImageAnalyzer />} />
              <Route path="progress" element={<ProgressTracking />} />
              <Route path="ai-chat" element={<AiChat />} />
              <Route path="appointments" element={<Appointments />} />
              <Route path="reports" element={<Reports />} />
              <Route path="diet-plans" element={<DietPlans />} />

              {/* User Dashboard Aliases */}
              <Route path="dashboard/user" element={<DashboardHome />} />
              <Route path="dashboard/user/profile" element={<Profile />} />
              <Route path="dashboard/user/ai-diet" element={<AiDietGenerator />} />
              <Route path="dashboard/user/ai-image" element={<AiImageAnalyzer />} />
              <Route path="dashboard/user/progress" element={<ProgressTracking />} />
              <Route path="dashboard/user/ai-chat" element={<AiChat />} />
              <Route path="dashboard/user/appointments" element={<Appointments />} />
              <Route path="dashboard/user/reports" element={<Reports />} />
              <Route path="dashboard/user/diet-plans" element={<DietPlans />} />

              {/* Nutritionist Platform Routes */}
              <Route path="dashboard/nutritionist" element={<DietitianHome />} />
              <Route path="dashboard/nutritionist/profile" element={<NutritionistProfile />} />
              <Route path="dashboard/nutritionist/clients" element={<ClientManagement />} />
              <Route path="dashboard/nutritionist/builder" element={<DietPlanBuilder />} />
              <Route path="dashboard/nutritionist/schedule" element={<AppointmentManagement />} />
              <Route path="dashboard/nutritionist/reports" element={<DietitianReports />} />

              {/* Admin Platform Routes */}
              <Route path="dashboard/admin" element={<AdminHome />} />
              <Route path="dashboard/admin/profile" element={<AdminProfile />} />
              <Route path="dashboard/admin/users" element={<UserManagement />} />
              <Route path="dashboard/admin/sql" element={<SqlConsole />} />
              <Route path="dashboard/admin/dietitians" element={<DietitianManagement />} />
              <Route path="dashboard/admin/blogs" element={<BlogManagement />} />
              <Route path="dashboard/admin/recipes" element={<RecipeManagement />} />
              <Route path="dashboard/admin/payments" element={<PaymentManagement />} />
              <Route path="dashboard/admin/analytics" element={<AdminAnalytics />} />

              <Route path="*" element={<NotFound />} />
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
