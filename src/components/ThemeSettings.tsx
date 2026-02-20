import { Sun, Moon, Palette } from "lucide-react";
import { useTheme, AccentColor, ColorMode } from "@/contexts/ThemeContext";

const ACCENT_OPTIONS: { id: AccentColor; label: string; hsl: string; preview: string }[] = [
  { id: "gold", label: "Gold", hsl: "42 80% 52%", preview: "from-yellow-500 to-amber-600" },
  { id: "cyan", label: "Cyan", hsl: "185 80% 48%", preview: "from-cyan-400 to-teal-500" },
  { id: "violet", label: "Violet", hsl: "265 70% 60%", preview: "from-violet-500 to-purple-600" },
  { id: "rose", label: "Rose", hsl: "350 75% 55%", preview: "from-rose-500 to-pink-600" },
];

export default function ThemeSettings() {
  const { accent, setAccent, mode, setMode } = useTheme();

  return (
    <div className="space-y-6">
      {/* Color Mode */}
      <div className="glass-strong rounded-2xl p-6 border border-border/50">
        <div className="flex items-center gap-2 mb-5">
          <Moon className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-foreground">Color Mode</h3>
        </div>
        <div className="flex gap-3">
          {(["dark", "light"] as ColorMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex items-center gap-2.5 px-5 py-3 rounded-xl border text-sm font-medium transition-all duration-200 ${
                mode === m
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground hover:border-border/80"
              }`}
            >
              {m === "dark" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              {m === "dark" ? "Dark" : "Light"}
            </button>
          ))}
        </div>
      </div>

      {/* Accent Color */}
      <div className="glass-strong rounded-2xl p-6 border border-border/50">
        <div className="flex items-center gap-2 mb-5">
          <Palette className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-foreground">Accent Color</h3>
          <span className="text-xs text-muted-foreground ml-1">— primary highlights & buttons</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {ACCENT_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setAccent(opt.id)}
              className={`relative group rounded-2xl border-2 p-4 transition-all duration-200 ${
                accent === opt.id
                  ? "border-primary shadow-[0_0_20px_hsl(var(--primary)/0.3)]"
                  : "border-border hover:border-border/80"
              }`}
            >
              {/* Color swatch */}
              <div
                className={`w-full h-10 rounded-lg mb-3 bg-gradient-to-br ${opt.preview}`}
                style={{ boxShadow: accent === opt.id ? `0 0 16px hsl(${opt.hsl}/0.5)` : undefined }}
              />
              <div className="text-sm font-medium text-foreground">{opt.label}</div>
              {accent === opt.id && (
                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                  <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Live preview bar */}
        <div className="mt-5 p-4 rounded-xl bg-muted/30 border border-border/30">
          <div className="text-xs text-muted-foreground mb-2">Preview</div>
          <div className="flex items-center gap-3">
            <button
              className="px-4 py-2 rounded-lg text-sm font-semibold text-primary-foreground"
              style={{ background: `hsl(${ACCENT_OPTIONS.find(o => o.id === accent)?.hsl})` }}
            >
              Primary Button
            </button>
            <span className="text-sm font-medium" style={{ color: `hsl(${ACCENT_OPTIONS.find(o => o.id === accent)?.hsl})` }}>
              Accent text
            </span>
            <div
              className="w-6 h-6 rounded-full"
              style={{
                background: `hsl(${ACCENT_OPTIONS.find(o => o.id === accent)?.hsl})`,
                boxShadow: `0 0 12px hsl(${ACCENT_OPTIONS.find(o => o.id === accent)?.hsl}/0.5)`
              }}
            />
          </div>
        </div>
      </div>

      <div className="text-xs text-muted-foreground px-1">
        Theme preferences are saved locally in your browser.
      </div>
    </div>
  );
}
