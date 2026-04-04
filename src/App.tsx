import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Landing from "./pages/Landing";
import AuthPage from "./pages/AuthPage";
import SetupPage from "./pages/SetupPage";
import CustomerHome from "./pages/CustomerHome";
import CustomerProfile from "./pages/CustomerProfile";
import ShopDetail from "./pages/ShopDetail";
import BookingFlow from "./pages/BookingFlow";
import BookingSuccess from "./pages/BookingSuccess";
import MyBookings from "./pages/MyBookings";
import OwnerLayout from "./components/OwnerLayout";
import OwnerDashboard from "./pages/OwnerDashboard";
import OwnerShop from "./pages/OwnerShop";
import OwnerServices from "./pages/OwnerServices";
import OwnerStaff from "./pages/OwnerStaff";
import OwnerBookings from "./pages/OwnerBookings";
import OwnerProfile from "./pages/OwnerProfile";
import StylistSchedule from "./pages/StylistSchedule";
import AdminLayout from "./components/AdminLayout";
import AdminOverview from "./pages/admin/AdminOverview";
import AdminRequests from "./pages/admin/AdminRequests";
import AdminShops from "./pages/admin/AdminShops";
import AdminBookings from "./pages/admin/AdminBookings";
import AdminPackages from "./pages/admin/AdminPackages";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminSettings from "./pages/admin/AdminSettings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Customer home is now at / — Landing only shows for unauthenticated */}
            <Route path="/" element={<ProtectedRoute allowedRoles={['customer']}><CustomerHome /></ProtectedRoute>} />
            <Route path="/welcome" element={<Landing />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/setup" element={<ProtectedRoute><SetupPage /></ProtectedRoute>} />
            <Route path="/shop/:id" element={<ProtectedRoute><ShopDetail /></ProtectedRoute>} />
            <Route path="/book/:shopId/:step" element={<ProtectedRoute allowedRoles={['customer']}><BookingFlow /></ProtectedRoute>} />
            <Route path="/book/success" element={<ProtectedRoute allowedRoles={['customer']}><BookingSuccess /></ProtectedRoute>} />
            <Route path="/bookings" element={<ProtectedRoute allowedRoles={['customer']}><MyBookings /></ProtectedRoute>} />
            <Route path="/customer/profile" element={<ProtectedRoute allowedRoles={['customer']}><CustomerProfile /></ProtectedRoute>} />

            {/* Stylist Admin portal — nested layout */}
            <Route path="/owner" element={<ProtectedRoute allowedRoles={['stylist_admin']}><OwnerLayout /></ProtectedRoute>}>
              <Route path="dashboard" element={<OwnerDashboard />} />
              <Route path="shop" element={<OwnerShop />} />
              <Route path="services" element={<OwnerServices />} />
              <Route path="staff" element={<OwnerStaff />} />
              <Route path="bookings" element={<OwnerBookings />} />
              <Route path="profile" element={<OwnerProfile />} />
            </Route>

            <Route path="/stylist/schedule" element={<ProtectedRoute allowedRoles={['stylist']}><StylistSchedule /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminLayout /></ProtectedRoute>}>
              <Route index element={<AdminOverview />} />
              <Route path="requests" element={<AdminRequests />} />
              <Route path="shops" element={<AdminShops />} />
              <Route path="bookings" element={<AdminBookings />} />
              <Route path="packages" element={<AdminPackages />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="settings" element={<AdminSettings />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
