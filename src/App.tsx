import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Library from "./pages/Library";
import Session from "./pages/Session";
import AgentProfile from "./pages/AgentProfile";
import KnowledgeIngestion from "./pages/KnowledgeIngestion";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Pricing from "./pages/Pricing";
import Billing from "./pages/Billing";
import Admin from "./pages/Admin";
import CreateAgent from "./pages/CreateAgent";
import Navigation from "./components/Navigation";

const queryClient = new QueryClient();

const AppLayout = () => {
  const location = useLocation();
  const isSession = location.pathname.startsWith("/session/");
  const isAuthPage = ["/login", "/signup", "/forgot-password", "/reset-password"].includes(location.pathname);

  return (
    <>
      {!isSession && !isAuthPage && <Navigation />}
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Index />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Semi-public: agent browsing */}
        <Route path="/library" element={<Library />} />
        <Route path="/agent/:agentId" element={<AgentProfile />} />

        {/* Protected routes */}
        <Route
          path="/session/:agentId"
          element={
            <ProtectedRoute>
              <Session />
            </ProtectedRoute>
          }
        />
        <Route
          path="/knowledge/:agentId"
          element={
            <ProtectedRoute requirePro>
              <KnowledgeIngestion />
            </ProtectedRoute>
          }
        />
        <Route path="/billing" element={<Billing />} />
        <Route path="/admin" element={<Admin />} />
        <Route
          path="/create-agent"
          element={
            <ProtectedRoute>
              <CreateAgent />
            </ProtectedRoute>
          }
        />
        <Route
          path="/edit-agent/:agentId"
          element={
            <ProtectedRoute>
              <CreateAgent />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppLayout />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
