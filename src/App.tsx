import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Index from "./pages/Index";
import Library from "./pages/Library";
import Session from "./pages/Session";
import NotFound from "./pages/NotFound";
import Navigation from "./components/Navigation";

const queryClient = new QueryClient();

const AppLayout = () => {
  const location = useLocation();
  const isSession = location.pathname.startsWith("/session/");

  return (
    <>
      {!isSession && <Navigation />}
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/library" element={<Library />} />
        <Route path="/session/:agentId" element={<Session />} />
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
        <AppLayout />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
