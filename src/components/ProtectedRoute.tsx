import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requirePro?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requirePro = false }) => {
  const { user, loading, isPro } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requirePro && !isPro()) {
    return <Navigate to="/pricing" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
