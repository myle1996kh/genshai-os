import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type AccentColor = "gold" | "cyan" | "violet" | "rose";
export type ColorMode = "dark" | "light";

interface ThemeContextValue {
  accent: AccentColor;
  setAccent: (a: AccentColor) => void;
  mode: ColorMode;
  setMode: (m: ColorMode) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  accent: "gold",
  setAccent: () => {},
  mode: "dark",
  setMode: () => {},
});

// HSL values for each accent
const ACCENT_VARS: Record<AccentColor, { primary: string; primaryFg: string; gold: string; goldDim: string; goldBright: string; ring: string; accent: string; accentFg: string }> = {
  gold: {
    primary: "42 80% 52%",
    primaryFg: "240 18% 5%",
    gold: "42 80% 52%",
    goldDim: "42 60% 35%",
    goldBright: "42 90% 65%",
    ring: "42 80% 52%",
    accent: "38 85% 58%",
    accentFg: "240 18% 5%",
  },
  cyan: {
    primary: "185 80% 48%",
    primaryFg: "240 18% 5%",
    gold: "185 80% 48%",
    goldDim: "185 60% 30%",
    goldBright: "185 90% 60%",
    ring: "185 80% 48%",
    accent: "195 85% 55%",
    accentFg: "240 18% 5%",
  },
  violet: {
    primary: "265 70% 60%",
    primaryFg: "240 18% 5%",
    gold: "265 70% 60%",
    goldDim: "265 50% 38%",
    goldBright: "265 80% 72%",
    ring: "265 70% 60%",
    accent: "275 75% 65%",
    accentFg: "240 18% 5%",
  },
  rose: {
    primary: "350 75% 55%",
    primaryFg: "0 0% 100%",
    gold: "350 75% 55%",
    goldDim: "350 55% 35%",
    goldBright: "350 85% 68%",
    ring: "350 75% 55%",
    accent: "5 80% 58%",
    accentFg: "0 0% 100%",
  },
};

const LIGHT_OVERRIDES = {
  background: "0 0% 97%",
  foreground: "240 20% 10%",
  card: "0 0% 100%",
  cardForeground: "240 20% 10%",
  popover: "0 0% 100%",
  popoverForeground: "240 20% 10%",
  secondary: "240 10% 92%",
  secondaryForeground: "240 20% 20%",
  muted: "240 10% 93%",
  mutedForeground: "240 12% 42%",
  border: "240 10% 85%",
  input: "240 10% 88%",
  sidebarBg: "0 0% 96%",
  sidebarFg: "240 20% 15%",
  sidebarBorder: "240 10% 88%",
  obsidian: "0 0% 97%",
  obsidianLight: "0 0% 100%",
  obsidianMid: "240 8% 93%",
  cream: "240 20% 12%",
  creamDim: "240 12% 40%",
};

function applyTheme(accent: AccentColor, mode: ColorMode) {
  const root = document.documentElement;
  const vars = ACCENT_VARS[accent];

  // Accent vars always apply
  root.style.setProperty("--primary", vars.primary);
  root.style.setProperty("--primary-foreground", vars.primaryFg);
  root.style.setProperty("--gold", vars.gold);
  root.style.setProperty("--gold-dim", vars.goldDim);
  root.style.setProperty("--gold-bright", vars.goldBright);
  root.style.setProperty("--ring", vars.ring);
  root.style.setProperty("--accent", vars.accent);
  root.style.setProperty("--accent-foreground", vars.accentFg);
  root.style.setProperty("--sidebar-primary", vars.primary);
  root.style.setProperty("--sidebar-primary-foreground", vars.primaryFg);
  root.style.setProperty("--sidebar-ring", vars.ring);

  if (mode === "light") {
    root.style.setProperty("--background", LIGHT_OVERRIDES.background);
    root.style.setProperty("--foreground", LIGHT_OVERRIDES.foreground);
    root.style.setProperty("--card", LIGHT_OVERRIDES.card);
    root.style.setProperty("--card-foreground", LIGHT_OVERRIDES.cardForeground);
    root.style.setProperty("--popover", LIGHT_OVERRIDES.popover);
    root.style.setProperty("--popover-foreground", LIGHT_OVERRIDES.popoverForeground);
    root.style.setProperty("--secondary", LIGHT_OVERRIDES.secondary);
    root.style.setProperty("--secondary-foreground", LIGHT_OVERRIDES.secondaryForeground);
    root.style.setProperty("--muted", LIGHT_OVERRIDES.muted);
    root.style.setProperty("--muted-foreground", LIGHT_OVERRIDES.mutedForeground);
    root.style.setProperty("--border", LIGHT_OVERRIDES.border);
    root.style.setProperty("--input", LIGHT_OVERRIDES.input);
    root.style.setProperty("--sidebar-background", LIGHT_OVERRIDES.sidebarBg);
    root.style.setProperty("--sidebar-foreground", LIGHT_OVERRIDES.sidebarFg);
    root.style.setProperty("--sidebar-border", LIGHT_OVERRIDES.sidebarBorder);
    root.style.setProperty("--obsidian", LIGHT_OVERRIDES.obsidian);
    root.style.setProperty("--obsidian-light", LIGHT_OVERRIDES.obsidianLight);
    root.style.setProperty("--obsidian-mid", LIGHT_OVERRIDES.obsidianMid);
    root.style.setProperty("--cream", LIGHT_OVERRIDES.cream);
    root.style.setProperty("--cream-dim", LIGHT_OVERRIDES.creamDim);
    document.documentElement.setAttribute("data-theme", "light");
  } else {
    // Reset to dark defaults
    root.style.setProperty("--background", "240 18% 5%");
    root.style.setProperty("--foreground", "42 30% 92%");
    root.style.setProperty("--card", "240 16% 8%");
    root.style.setProperty("--card-foreground", "42 30% 92%");
    root.style.setProperty("--popover", "240 16% 9%");
    root.style.setProperty("--popover-foreground", "42 30% 92%");
    root.style.setProperty("--secondary", "240 25% 13%");
    root.style.setProperty("--secondary-foreground", "42 30% 85%");
    root.style.setProperty("--muted", "240 20% 11%");
    root.style.setProperty("--muted-foreground", "42 15% 55%");
    root.style.setProperty("--border", "240 20% 14%");
    root.style.setProperty("--input", "240 20% 12%");
    root.style.setProperty("--sidebar-background", "240 18% 6%");
    root.style.setProperty("--sidebar-foreground", "42 30% 85%");
    root.style.setProperty("--sidebar-border", "240 20% 13%");
    root.style.setProperty("--obsidian", "240 18% 5%");
    root.style.setProperty("--obsidian-light", "240 16% 8%");
    root.style.setProperty("--obsidian-mid", "240 18% 11%");
    root.style.setProperty("--cream", "42 30% 92%");
    root.style.setProperty("--cream-dim", "42 20% 70%");
    document.documentElement.removeAttribute("data-theme");
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [accent, setAccentState] = useState<AccentColor>(() => {
    return (localStorage.getItem("genshai-accent") as AccentColor) || "gold";
  });
  const [mode, setModeState] = useState<ColorMode>(() => {
    return (localStorage.getItem("genshai-mode") as ColorMode) || "dark";
  });

  useEffect(() => {
    applyTheme(accent, mode);
  }, [accent, mode]);

  const setAccent = (a: AccentColor) => {
    setAccentState(a);
    localStorage.setItem("genshai-accent", a);
  };

  const setMode = (m: ColorMode) => {
    setModeState(m);
    localStorage.setItem("genshai-mode", m);
  };

  return (
    <ThemeContext.Provider value={{ accent, setAccent, mode, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
