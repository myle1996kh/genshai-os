import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Brain, LogIn, Shield, Plus, LogOut, ChevronDown, Cpu,
  Menu, X, BookOpen, Sparkles
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const Navigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, isAdmin, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => { setMobileOpen(false); setMenuOpen(false); }, [location.pathname]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const isActive = (path: string) => location.pathname === path;

  const navLinkClass = (path: string) =>
    `relative text-sm font-medium transition-all duration-200 group ${
      isActive(path)
        ? "text-gold"
        : "text-cream-dim hover:text-cream"
    }`;

  const activeDot = (path: string) =>
    isActive(path) ? (
      <span className="absolute -bottom-1 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent rounded-full" />
    ) : null;

  return (
    <>
      {/* ── Navbar ── */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "glass-strong border-b border-gold/15 shadow-[0_4px_24px_hsl(240_18%_3%/0.5)]"
            : "bg-transparent border-b border-transparent"
        }`}
      >
        <div className="container mx-auto flex items-center justify-between h-[62px] px-5">
          {/* ── Logo ── */}
          <Link to="/" className="flex items-center gap-2.5 group shrink-0">
            <div className="relative w-8 h-8 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-gold/15 group-hover:bg-gold/25 transition-colors duration-300 pulse-gold" />
              <Brain className="w-4 h-4 text-gold relative z-10" />
            </div>
            <span className="font-display text-[1.1rem] font-semibold text-cream tracking-tight">
              Gen<span className="text-gradient-gold">Shai</span>
            </span>
            <span className="hidden sm:inline os-tag">OS</span>
          </Link>

          {/* ── Desktop Nav Links ── */}
          <div className="hidden md:flex items-center gap-7">
            <Link to="/library" className={navLinkClass("/library")}>
              <BookOpen className="inline w-3.5 h-3.5 mr-1.5 opacity-60" />
              Library
              {activeDot("/library")}
            </Link>

            {user && (
              <Link to="/create-agent" className={navLinkClass("/create-agent")}>
                <Plus className="inline w-3.5 h-3.5 mr-1 opacity-60" />
                New Agent
                {activeDot("/create-agent")}
              </Link>
            )}

            {isAdmin && (
              <>
                <Link to="/admin" className={navLinkClass("/admin")}>
                  <Shield className="inline w-3.5 h-3.5 mr-1 opacity-60" />
                  Admin
                  {activeDot("/admin")}
                </Link>
                <Link to="/ai-provider" className={navLinkClass("/ai-provider")}>
                  <Cpu className="inline w-3.5 h-3.5 mr-1 opacity-60" />
                  AI Providers
                  {activeDot("/ai-provider")}
                </Link>
              </>
            )}
          </div>

          {/* ── Desktop Auth ── */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setMenuOpen(o => !o)}
                  className="flex items-center gap-2 text-sm font-medium text-cream-dim hover:text-cream transition-all duration-200 px-3 py-1.5 rounded-xl border border-transparent hover:border-gold/20 hover:bg-gold/5"
                >
                  <div className="w-7 h-7 rounded-full gradient-gold flex items-center justify-center text-obsidian text-xs font-bold shadow-[0_0_8px_hsl(42_80%_52%/0.4)]">
                    {(profile?.full_name || user.email || "U")[0].toUpperCase()}
                  </div>
                  <span className="max-w-[110px] truncate">{profile?.full_name || user.email?.split("@")[0]}</span>
                  {isAdmin && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-gold/15 text-gold font-mono border border-gold/20">admin</span>
                  )}
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${menuOpen ? "rotate-180" : ""}`} />
                </button>

                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 w-56 glass-strong border border-gold/15 rounded-2xl shadow-[0_8px_32px_hsl(240_18%_3%/0.7)] z-50 overflow-hidden">
                      <div className="px-4 py-3 border-b border-gold/10">
                        <div className="text-[11px] text-cream-dim/50 font-mono truncate">{user.email}</div>
                      </div>
                      <div className="p-1.5 space-y-0.5">
                        <Link
                          to="/library"
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-cream-dim hover:text-cream hover:bg-gold/8 transition-colors"
                        >
                          <BookOpen className="w-4 h-4 text-gold" />
                          Agent Library
                        </Link>
                        <Link
                          to="/create-agent"
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-cream-dim hover:text-cream hover:bg-gold/8 transition-colors"
                        >
                          <Plus className="w-4 h-4 text-gold" />
                          Create Agent
                        </Link>
                        <Link
                          to="/billing"
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-cream-dim hover:text-cream hover:bg-gold/8 transition-colors"
                        >
                          <Sparkles className="w-4 h-4 text-gold" />
                          Billing & Plan
                        </Link>
                        {isAdmin && (
                          <>
                            <div className="h-px bg-gold/8 mx-2 my-1" />
                            <div className="px-3 py-1">
                              <span className="text-[10px] font-mono uppercase tracking-widest text-cream-dim/40">Admin</span>
                            </div>
                            <Link
                              to="/admin"
                              onClick={() => setMenuOpen(false)}
                              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-cream-dim hover:text-cream hover:bg-gold/8 transition-colors"
                            >
                              <Shield className="w-4 h-4 text-gold" />
                              Admin Dashboard
                            </Link>
                            <Link
                              to="/ai-provider"
                              onClick={() => setMenuOpen(false)}
                              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-cream-dim hover:text-cream hover:bg-gold/8 transition-colors"
                            >
                              <Cpu className="w-4 h-4 text-gold" />
                              AI Providers
                            </Link>
                          </>
                        )}
                        <div className="h-px bg-gold/8 mx-2 my-1" />
                        <button
                          onClick={() => { setMenuOpen(false); handleSignOut(); }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-cream-dim hover:text-red-400 hover:bg-red-500/8 transition-colors"
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
                  className="flex items-center gap-1.5 text-sm font-medium text-cream-dim hover:text-cream transition-colors px-3 py-1.5"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  Đăng nhập
                </Link>
                <Link
                  to="/signup"
                  className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl gradient-gold text-obsidian hover:opacity-90 transition-all duration-200 shadow-[0_0_16px_hsl(42_80%_52%/0.25)] hover:shadow-[0_0_24px_hsl(42_80%_52%/0.4)]"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Bắt đầu
                </Link>
              </>
            )}
          </div>

          {/* ── Mobile Hamburger ── */}
          <button
            onClick={() => setMobileOpen(o => !o)}
            className="md:hidden flex items-center justify-center w-9 h-9 rounded-xl border border-gold/20 text-cream-dim hover:text-cream hover:border-gold/40 hover:bg-gold/5 transition-all duration-200"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-4.5 h-4.5" /> : <Menu className="w-4.5 h-4.5" />}
          </button>
        </div>
      </nav>

      {/* ── Mobile Drawer ── */}
      {mobileOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-obsidian/70 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />

          {/* Panel */}
          <div className="fixed top-0 right-0 bottom-0 z-50 w-72 glass-strong border-l border-gold/15 flex flex-col shadow-[-8px_0_40px_hsl(240_18%_3%/0.6)]">
            {/* Header */}
            <div className="flex items-center justify-between px-5 h-[62px] border-b border-gold/10 shrink-0">
              <Link to="/" onClick={() => setMobileOpen(false)} className="flex items-center gap-2">
                <div className="relative w-7 h-7 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full bg-gold/15" />
                  <Brain className="w-3.5 h-3.5 text-gold relative z-10" />
                </div>
                <span className="font-display text-base font-semibold text-cream">
                  Gen<span className="text-gradient-gold">Shai</span>
                </span>
              </Link>
              <button
                onClick={() => setMobileOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-cream-dim hover:text-cream hover:bg-gold/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Nav items */}
            <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
              {/* Public */}
              <MobileLink to="/library" icon={<BookOpen className="w-4 h-4" />} active={isActive("/library")} onClick={() => setMobileOpen(false)}>
                Agent Library
              </MobileLink>

              {user && (
                <MobileLink to="/create-agent" icon={<Plus className="w-4 h-4" />} active={isActive("/create-agent")} onClick={() => setMobileOpen(false)}>
                  Create Agent
                </MobileLink>
              )}

              {user && (
                <MobileLink to="/billing" icon={<Sparkles className="w-4 h-4" />} active={isActive("/billing")} onClick={() => setMobileOpen(false)}>
                  Billing & Plan
                </MobileLink>
              )}

              {/* Admin section */}
              {isAdmin && (
                <>
                  <div className="pt-3 pb-1 px-3">
                    <p className="text-[10px] font-mono uppercase tracking-widest text-cream-dim/40">Admin</p>
                  </div>
                  <MobileLink to="/admin" icon={<Shield className="w-4 h-4" />} active={isActive("/admin")} onClick={() => setMobileOpen(false)}>
                    Admin Dashboard
                  </MobileLink>
                  <MobileLink to="/ai-provider" icon={<Cpu className="w-4 h-4" />} active={isActive("/ai-provider")} onClick={() => setMobileOpen(false)}>
                    AI Providers
                  </MobileLink>
                </>
              )}
            </nav>

            {/* Footer auth */}
            <div className="shrink-0 border-t border-gold/10 p-4">
              {user ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-3 px-3 py-2">
                    <div className="w-8 h-8 rounded-full gradient-gold flex items-center justify-center text-obsidian text-sm font-bold shrink-0">
                      {(profile?.full_name || user.email || "U")[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-cream truncate">{profile?.full_name || user.email?.split("@")[0]}</div>
                      <div className="text-[11px] text-cream-dim/50 font-mono truncate">{user.email}</div>
                    </div>
                    {isAdmin && (
                      <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-md bg-gold/15 text-gold font-mono border border-gold/20">admin</span>
                    )}
                  </div>
                  <button
                    onClick={() => { setMobileOpen(false); handleSignOut(); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-cream-dim hover:text-red-400 hover:bg-red-500/10 transition-colors border border-transparent hover:border-red-500/20"
                  >
                    <LogOut className="w-4 h-4" />
                    Đăng xuất
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Link
                    to="/login"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl text-sm font-medium text-cream-dim border border-gold/20 hover:border-gold/40 hover:text-cream hover:bg-gold/5 transition-all"
                  >
                    <LogIn className="w-4 h-4" />
                    Đăng nhập
                  </Link>
                  <Link
                    to="/signup"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl text-sm font-semibold gradient-gold text-obsidian hover:opacity-90 transition-all shadow-[0_0_16px_hsl(42_80%_52%/0.25)]"
                  >
                    <Sparkles className="w-4 h-4" />
                    Bắt đầu ngay
                  </Link>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
};

// ── Mobile link helper ──
interface MobileLinkProps {
  to: string;
  icon: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}

const MobileLink = ({ to, icon, active, onClick, children }: MobileLinkProps) => (
  <Link
    to={to}
    onClick={onClick}
    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
      active
        ? "bg-gold/12 text-gold border border-gold/20"
        : "text-cream-dim hover:text-cream hover:bg-gold/6 border border-transparent"
    }`}
  >
    <span className={active ? "text-gold" : "text-cream-dim/60"}>{icon}</span>
    {children}
  </Link>
);

export default Navigation;
