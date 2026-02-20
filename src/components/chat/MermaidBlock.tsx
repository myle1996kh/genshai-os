import { useEffect, useRef, useState } from "react";
import { Loader2, Copy, Check } from "lucide-react";

// Sanitize mermaid to prevent parse errors on special chars inside labels
function sanitizeMermaid(raw: string): string {
  return raw
    .split("\n")
    .map((line) =>
      line.replace(
        /(\[|{|>)([^\]}>]+?)(\]|}|<)/g,
        (_match, open, content, close) => {
          const safe = content
            .replace(/\(/g, "﹙")
            .replace(/\)/g, "﹚")
            .replace(/&/g, "＆")
            .replace(/</g, "﹤")
            .replace(/>/g, "﹥");
          return `${open}${safe}${close}`;
        }
      )
    )
    .join("\n");
}

interface MermaidBlockProps {
  chart: string;
  title?: string;
}

export function MermaidBlock({ chart, title }: MermaidBlockProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [rendered, setRendered] = useState(false);
  const [copied, setCopied] = useState(false);
  const id = useRef(`mermaid-${Math.random().toString(36).slice(2)}`);
  const sanitized = sanitizeMermaid(chart);

  useEffect(() => {
    if (!ref.current || !sanitized.trim()) return;
    setError(null);
    setRendered(false);

    import("mermaid").then((mod) => {
      const mermaid = mod.default;
      mermaid.initialize({
        startOnLoad: false,
        theme: "dark",
        themeVariables: {
          primaryColor: "hsl(42 80% 52%)",
          primaryTextColor: "hsl(42 30% 92%)",
          primaryBorderColor: "hsl(42 80% 52% / 0.4)",
          lineColor: "hsl(42 60% 45%)",
          secondaryColor: "hsl(240 16% 12%)",
          tertiaryColor: "hsl(240 18% 8%)",
          background: "hsl(240 18% 5%)",
          mainBkg: "hsl(240 16% 10%)",
          nodeBorder: "hsl(42 80% 52% / 0.5)",
          clusterBkg: "hsl(240 16% 8%)",
          titleColor: "hsl(42 30% 92%)",
          edgeLabelBackground: "hsl(240 16% 10%)",
          fontFamily: "DM Sans, sans-serif",
          fontSize: "13px",
        },
        flowchart: { curve: "basis", padding: 20 },
        securityLevel: "loose",
      });

      mermaid
        .render(id.current, sanitized.trim())
        .then(({ svg }) => {
          if (ref.current) {
            ref.current.innerHTML = svg;
            const svgEl = ref.current.querySelector("svg");
            if (svgEl) {
              svgEl.style.maxWidth = "100%";
              svgEl.style.height = "auto";
            }
            setRendered(true);
          }
        })
        .catch((e) => {
          setError("Could not render diagram. Showing source instead.");
          console.warn("Mermaid render error:", e);
        });
    });
  }, [sanitized]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(chart);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (error) {
    return (
      <div className="my-3">
        <div className="flex items-center gap-2 mb-2 text-xs text-cream-dim/60">
          <span className="text-yellow-500/70">⚠</span> {error}
        </div>
        <pre className="p-4 bg-obsidian-light/60 rounded-xl border border-gold/10 overflow-x-auto">
          <code className="text-cream font-mono text-xs leading-relaxed">{chart}</code>
        </pre>
      </div>
    );
  }

  return (
    <div className="my-4 group">
      {title && (
        <div className="flex items-center gap-2 mb-2">
          <span className="text-gold/60 text-xs font-mono uppercase tracking-widest">◈ {title}</span>
        </div>
      )}
      {!rendered && (
        <div className="flex items-center gap-2 py-6 justify-center text-cream-dim/50 text-xs">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Rendering diagram…
        </div>
      )}
      <div className="relative">
        <div
          ref={ref}
          className="mermaid-container overflow-x-auto rounded-xl bg-obsidian-light/40 border border-gold/15 p-4"
          style={{ display: rendered ? "block" : "none" }}
        />
        {rendered && (
          <button
            onClick={handleCopy}
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg glass border border-gold/15 hover:border-gold/35"
            title="Copy diagram source"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-gold" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-cream-dim/50" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}
