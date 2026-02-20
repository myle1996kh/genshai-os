import { Link, useLocation } from "react-router-dom";
import { Brain } from "lucide-react";

const Navigation = () => {
  const location = useLocation();

  const links = [
    { to: "/library", label: "Agent Library" },
    { to: "/about", label: "How It Works" },
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
        </div>

        {/* CTA */}
        <Link
          to="/library"
          className="hidden md:flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg gradient-gold text-obsidian hover:opacity-90 transition-opacity duration-200"
        >
          Explore Agents
        </Link>
      </div>
    </nav>
  );
};

export default Navigation;
