import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Brain, Crown, User, LogIn, Shield, Plus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { SubscriptionBadge } from "@/components/SubscriptionBadge";
import { supabase } from "@/integrations/supabase/client";

const Navigation = () => {
  const location = useLocation();
  const { user, isPro } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!user) { setIsAdmin(false); return; }
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single()
      .then(({ data }) => setIsAdmin(!!data));
  }, [user]);

  const links = [
    { to: "/library", label: "Agent Library" },
    { to: "/pricing", label: "Pricing" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-strong border-b border-gold/10">
      <div className="container mx-auto flex items-center justify-between h-16 px-6">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="relative w-8 h-8 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-gold/20 pulse-gold" />
            <Brain className="w-4 h-4 text-gold relative z-10" />
          </div>
          <span className="font-display text-lg font-semibold text-cream tracking-tight">
            Gen<span className="text-gradient-gold">Shai</span>
          </span>
        </Link>

        {/* Nav links */}
        <div className="hidden md:flex items-center gap-8">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`text-sm font-medium transition-colors duration-200 ${
                location.pathname === link.to
                  ? "text-gold"
                  : "text-cream-dim hover:text-cream"
              }`}
            >
              {link.label}
            </Link>
          ))}
          {isAdmin && (
            <Link
              to="/admin"
              className={`text-sm font-medium transition-colors duration-200 flex items-center gap-1.5 ${
                location.pathname === "/admin" ? "text-gold" : "text-cream-dim hover:text-cream"
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              Admin
            </Link>
          )}
        </div>

        {/* Auth / CTA */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <>
              {isPro() && <SubscriptionBadge />}
              {(isPro() || isAdmin) && (
                <Link
                  to="/create-agent"
                  className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg border border-primary/30 text-primary hover:bg-primary/10 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  New Agent
                </Link>
              )}
              <Link
                to="/billing"
                className="flex items-center gap-1.5 text-sm font-medium text-cream-dim hover:text-cream transition-colors"
              >
                <User className="w-4 h-4" />
                Tài khoản
              </Link>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="flex items-center gap-1.5 text-sm font-medium text-cream-dim hover:text-cream transition-colors"
              >
                <LogIn className="w-4 h-4" />
                Đăng nhập
              </Link>
              <Link
                to="/signup"
                className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg gradient-gold text-obsidian hover:opacity-90 transition-opacity duration-200"
              >
                Bắt đầu miễn phí
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navigation;

