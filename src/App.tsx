import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import Browse from "./pages/Browse.tsx";
import VendorProfile from "./pages/VendorProfile.tsx";
import Neighborhoods from "./pages/Neighborhoods.tsx";
import Auth from "./pages/Auth.tsx";
import AuthCallback from "./pages/AuthCallback.tsx";
import VendorOnboarding from "./pages/VendorOnboarding.tsx";
import VendorOnboardingPending from "./pages/VendorOnboardingPending.tsx";
import AdminDashboard from "./pages/AdminDashboard.tsx";
import VendorDashboard from "./pages/VendorDashboard.tsx";
import MyBookings from "./pages/MyBookings.tsx";
import BookingDetail from "./pages/BookingDetail.tsx";
import JobRequestDetail from "./pages/JobRequestDetail.tsx";
import ProviderOnboarding from "./pages/ProviderOnboarding.tsx";
import ProviderDashboard from "./pages/ProviderDashboard.tsx";
import NotFound from "./pages/NotFound.tsx";
import ChatbotWidget from "./components/ChatbotWidget.tsx";
import { ThemeProvider } from "./components/ThemeProvider.tsx";
import RoleGuard from "./components/RoleGuard.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/browse" element={<Browse />} />
          <Route path="/vendor/:slug" element={<VendorProfile />} />
          <Route path="/neighborhoods" element={<Neighborhoods />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/vendor/onboarding" element={<VendorOnboarding />} />
          <Route path="/vendor/onboarding/pending" element={<VendorOnboardingPending />} />
          <Route path="/vendor/dashboard" element={<RoleGuard allow={['vendor', 'admin']}><VendorDashboard /></RoleGuard>} />
          <Route path="/bookings" element={<RoleGuard allow={['customer', 'vendor', 'admin']}><MyBookings /></RoleGuard>} />
          <Route path="/bookings/:id" element={<RoleGuard allow={['customer', 'vendor', 'admin']}><BookingDetail /></RoleGuard>} />
          <Route path="/jobs/:id" element={<JobRequestDetail />} />
          <Route path="/provider/onboarding" element={<ProviderOnboarding />} />
          <Route path="/provider/dashboard" element={<ProviderDashboard />} />
          <Route path="/admin" element={<RoleGuard allow={['admin']}><AdminDashboard /></RoleGuard>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        <ChatbotWidget />
      </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
