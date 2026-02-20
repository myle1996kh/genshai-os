import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Brain, LogIn, Shield, Plus, LogOut, ChevronDown, Cpu } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const Navigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!user) { setIsAdmin(false); return; }
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle()
      .then(({ data }) => setIsAdmin(!!data));
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const navLinks = [
    { to: "/library", label: "Agent Library" },
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
          {navLinks.map((link) => (
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
          {user && (
            <Link
              to="/create-agent"
              className={`text-sm font-medium transition-colors duration-200 flex items-center gap-1.5 ${
                location.pathname === "/create-agent" ? "text-gold" : "text-cream-dim hover:text-cream"
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              New Agent
            </Link>
          )}
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
          {isAdmin && (
            <Link
              to="/ai-provider"
              className={`text-sm font-medium transition-colors duration-200 flex items-center gap-1.5 ${
                location.pathname === "/ai-provider" ? "text-gold" : "text-cream-dim hover:text-cream"
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              AI Providers
            </Link>
          )}
        </div>

        {/* Auth area */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen(o => !o)}
                className="flex items-center gap-2 text-sm font-medium text-cream-dim hover:text-cream transition-colors px-3 py-2 rounded-lg glass border border-transparent hover:border-gold/20"
              >
                <div className="w-7 h-7 rounded-full bg-gold/20 flex items-center justify-center text-gold text-xs font-bold">
                  {(profile?.full_name || user.email || "U")[0].toUpperCase()}
                </div>
                <span className="max-w-[120px] truncate">{profile?.full_name || user.email?.split("@")[0]}</span>
                {isAdmin && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-gold/20 text-gold font-mono">admin</span>
                )}
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-52 glass-strong border border-gold/15 rounded-xl shadow-xl z-50 overflow-hidden">
                    <div className="px-4 py-3 border-b border-gold/10">
                      <div className="text-xs text-cream-dim/60 font-mono truncate">{user.email}</div>
                    </div>
                    <div className="p-1.5 space-y-0.5">
                      {user && (
                        <Link
                          to="/create-agent"
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-cream-dim hover:text-cream hover:bg-gold/8 transition-colors"
                        >
                          <Plus className="w-4 h-4 text-gold" />
                          Create Agent
                        </Link>
                      )}
                      {isAdmin && (
                        <Link
                          to="/admin"
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-cream-dim hover:text-cream hover:bg-gold/8 transition-colors"
                        >
                          <Shield className="w-4 h-4 text-gold" />
                          Admin Dashboard
                        </Link>
                      )}
                      {isAdmin && (
                        <Link
                          to="/ai-provider"
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-cream-dim hover:text-cream hover:bg-gold/8 transition-colors"
                        >
                          <Cpu className="w-4 h-4 text-gold" />
                          AI Providers
                        </Link>
                      )}
                      <button
                        onClick={() => { setMenuOpen(false); handleSignOut(); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-cream-dim hover:text-cream hover:bg-destructive/10 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        Đăng xuất
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
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
                Bắt đầu
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
