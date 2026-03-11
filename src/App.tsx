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
import VendorOnboarding from "./pages/VendorOnboarding.tsx";
import VendorOnboardingPending from "./pages/VendorOnboardingPending.tsx";
import AdminDashboard from "./pages/AdminDashboard.tsx";
import VendorDashboard from "./pages/VendorDashboard.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
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
          <Route path="/vendor/onboarding" element={<VendorOnboarding />} />
          <Route path="/vendor/onboarding/pending" element={<VendorOnboardingPending />} />
          <Route path="/vendor/dashboard" element={<VendorDashboard />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
