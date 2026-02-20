import { memo, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Copy, Check, TrendingUp, Lightbulb, AlertTriangle, CheckCircle2, Info, BookOpen, Quote } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";
import { MermaidBlock } from "./MermaidBlock";
import { ImageBlock } from "./ImageBlock";

// ─── Chart ────────────────────────────────────────────────────────────────────
interface ChartData {
  type: "bar" | "pie" | "line" | "radar";
  title?: string;
  data: Array<Record<string, any>>;
  dataKey?: string;
  nameKey?: string;
}

const CHART_COLORS = [
  "hsl(42, 80%, 52%)",   // gold
  "hsl(200, 70%, 55%)",  // blue
  "hsl(150, 60%, 45%)",  // green
  "hsl(340, 65%, 55%)",  // rose
  "hsl(270, 60%, 55%)",  // purple
  "hsl(25, 80%, 50%)",   // orange
];

const TOOLTIP_STYLE = {
  background: "hsl(240, 16%, 10%)",
  border: "1px solid hsl(42, 80%, 52%, 0.2)",
  borderRadius: 8,
  color: "hsl(42, 30%, 92%)",
  fontSize: 12,
};

function ChartBlock({ config }: { config: ChartData }) {
  const { type, title, data, dataKey = "value", nameKey = "name" } = config;

  return (
    <div className="my-5 p-4 rounded-xl border border-gold/15 bg-obsidian-light/40">
      {title && (
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-gold/70" />
          <span className="font-mono text-gold/80 text-xs uppercase tracking-widest">{title}</span>
        </div>
      )}
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          {type === "bar" ? (
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 16%, 20%)" />
              <XAxis dataKey={nameKey} tick={{ fill: "hsl(42, 20%, 60%)", fontSize: 11 }} />
              <YAxis tick={{ fill: "hsl(42, 20%, 60%)", fontSize: 11 }} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey={dataKey} radius={[4, 4, 0, 0]}>
                {data.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          ) : type === "pie" ? (
            <PieChart>
              <Pie data={data} dataKey={dataKey} nameKey={nameKey} cx="50%" cy="50%" outerRadius={80}
                label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {data.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={TOOLTIP_STYLE} />
            </PieChart>
          ) : type === "radar" ? (
            <RadarChart data={data} cx="50%" cy="50%" outerRadius={80}>
              <PolarGrid stroke="hsl(240, 16%, 20%)" />
              <PolarAngleAxis dataKey={nameKey} tick={{ fill: "hsl(42, 20%, 60%)", fontSize: 11 }} />
              <PolarRadiusAxis tick={{ fill: "hsl(42, 20%, 60%)", fontSize: 10 }} />
              <Radar dataKey={dataKey} stroke={CHART_COLORS[0]} fill={CHART_COLORS[0]} fillOpacity={0.3} />
            </RadarChart>
          ) : (
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 16%, 20%)" />
              <XAxis dataKey={nameKey} tick={{ fill: "hsl(42, 20%, 60%)", fontSize: 11 }} />
              <YAxis tick={{ fill: "hsl(42, 20%, 60%)", fontSize: 11 }} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Line type="monotone" dataKey={dataKey} stroke={CHART_COLORS[0]} strokeWidth={2} dot={{ fill: CHART_COLORS[0] }} />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ─── Code Block with copy ─────────────────────────────────────────────────────
function CodeBlock({ language, children }: { language: string; children: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group my-3">
      <div className="flex items-center justify-between px-4 py-1.5 bg-obsidian-light/80 border border-gold/10 border-b-0 rounded-t-xl">
        <span className="font-mono text-gold/50 text-xs">{language || "code"}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-2 py-0.5 rounded glass border border-transparent hover:border-gold/20 text-cream-dim/50 hover:text-cream-dim transition-colors text-xs"
        >
          {copied ? <Check className="w-3 h-3 text-gold" /> : <Copy className="w-3 h-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="p-4 bg-obsidian-light/60 rounded-b-xl border border-gold/10 overflow-x-auto">
        <code className="text-cream font-mono text-xs leading-relaxed">{children}</code>
      </pre>
    </div>
  );
}

// ─── Callout patterns ─────────────────────────────────────────────────────────
const CALLOUT_PATTERNS: Record<string, { icon: typeof Lightbulb; label: string; className: string }> = {
  "💡": { icon: Lightbulb,    label: "Insight",   className: "border-gold/40 bg-gold/5" },
  "⚠️": { icon: AlertTriangle, label: "Warning",   className: "border-destructive/40 bg-destructive/5" },
  "✅": { icon: CheckCircle2, label: "Key Point",  className: "border-emerald-500/40 bg-emerald-500/5" },
  "ℹ️": { icon: Info,         label: "Note",       className: "border-blue-400/40 bg-blue-400/5" },
  "📖": { icon: BookOpen,     label: "Reference",  className: "border-purple-400/40 bg-purple-400/5" },
};

// ─── Main AgentMarkdown ───────────────────────────────────────────────────────
interface AgentMarkdownProps {
  content: string;
}

export const AgentMarkdown = memo(({ content }: AgentMarkdownProps) => {
  // Strip <think>...</think> tags (reasoning models)
  const cleanContent = useMemo(() => {
    let cleaned = content.replace(/<think>[\s\S]*?<\/think>/gi, "");
    cleaned = cleaned.replace(/<think>[\s\S]*$/gi, "");
    return cleaned.trim();
  }, [content]);

  // Pre-extract chart, mermaid, image blocks — replace with placeholders
  const { processedContent, charts, mermaidDiagrams, images } = useMemo(() => {
    const chartBlocks: ChartData[] = [];
    const mermaidBlocks: { chart: string; title?: string }[] = [];
    const imageBlocks: { prompt: string; caption?: string }[] = [];

    let processed = cleanContent
      // chart blocks
      .replace(/```chart\n([\s\S]*?)```/g, (_, json) => {
        try {
          chartBlocks.push(JSON.parse(json.trim()));
          return `\n<!--chart-${chartBlocks.length - 1}-->\n`;
        } catch {
          return `\`\`\`\n${json}\`\`\``;
        }
      })
      // mermaid blocks
      .replace(/```mermaid\n([\s\S]*?)```/g, (_, diagram) => {
        mermaidBlocks.push({ chart: diagram.trim() });
        return `\n<!--mermaid-${mermaidBlocks.length - 1}-->\n`;
      })
      // image blocks
      .replace(/```image\n([\s\S]*?)```/g, (_, json) => {
        try {
          imageBlocks.push(JSON.parse(json.trim()));
          return `\n<!--image-${imageBlocks.length - 1}-->\n`;
        } catch {
          return `\`\`\`\n${json}\`\`\``;
        }
      });

    return { processedContent: processed, charts: chartBlocks, mermaidDiagrams: mermaidBlocks, images: imageBlocks };
  }, [cleanContent]);

  // Split by placeholders for rendering
  const segments = useMemo(() => {
    const parts = processedContent.split(/<!--(chart|mermaid|image)-(\d+)-->/);
    const result: Array<{ type: "chart" | "mermaid" | "image" | "markdown"; index?: number; content?: string }> = [];

    for (let i = 0; i < parts.length; i++) {
      if (i % 3 === 0 && parts[i].trim()) {
        result.push({ type: "markdown", content: parts[i] });
      } else if (i % 3 === 1) {
        const blockType = parts[i] as "chart" | "mermaid" | "image";
        const index = parseInt(parts[i + 1]);
        result.push({ type: blockType, index });
        i++; // skip the index part
      }
    }

    return result;
  }, [processedContent]);

  return (
    <div className="space-y-1">
      {segments.map((seg, i) => {
        if (seg.type === "chart" && seg.index !== undefined && charts[seg.index]) {
          return <ChartBlock key={`chart-${i}`} config={charts[seg.index]} />;
        }
        if (seg.type === "mermaid" && seg.index !== undefined && mermaidDiagrams[seg.index]) {
          return <MermaidBlock key={`mermaid-${i}`} {...mermaidDiagrams[seg.index]} />;
        }
        if (seg.type === "image" && seg.index !== undefined && images[seg.index]) {
          return <ImageBlock key={`image-${i}`} {...images[seg.index]} />;
        }
        if (seg.type === "markdown" && seg.content?.trim()) {
          return <MarkdownSegment key={`md-${i}`} content={seg.content} />;
        }
        return null;
      })}
    </div>
  );
}, (prev, next) => prev.content === next.content);

AgentMarkdown.displayName = "AgentMarkdown";

// ─── Markdown Segment (pure markdown, no special blocks) ──────────────────────
function MarkdownSegment({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => (
          <h1 className="font-display text-xl text-cream font-semibold mt-4 mb-2 first:mt-0 border-b border-gold/20 pb-1 flex items-center gap-2">
            <span className="inline-block w-1 h-5 rounded-full bg-gold flex-shrink-0" />
            {children}
          </h1>
        ),
        h2: ({ children }) => (
          <h2 className="font-display text-lg text-cream font-semibold mt-3 mb-1.5 first:mt-0 flex items-center gap-1.5">
            <span className="text-gold">✦</span>
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className="font-semibold text-gold text-xs mt-2.5 mb-1 first:mt-0 tracking-widest uppercase font-mono border-b border-gold/10 pb-0.5">
            {children}
          </h3>
        ),
        p: ({ children }) => (
          <p className="text-cream leading-[1.8] mb-3 last:mb-0">{children}</p>
        ),
        strong: ({ children }) => (
          <strong className="text-gold font-semibold">{children}</strong>
        ),
        em: ({ children }) => (
          <em className="text-cream-dim not-italic border-b border-gold/30 pb-px">{children}</em>
        ),
        ul: ({ children }) => (
          <ul className="my-2 space-y-1.5 list-disc list-outside ml-4">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="my-2 space-y-1.5 list-decimal list-outside ml-4">{children}</ol>
        ),
        li: ({ children }) => (
          <li className="text-cream leading-relaxed text-sm">{children}</li>
        ),
        blockquote: ({ children }) => {
          const text = String(children);
          let calloutMatch: { icon: typeof Lightbulb; label: string; className: string } | null = null;
          for (const [emoji, cfg] of Object.entries(CALLOUT_PATTERNS)) {
            if (text.includes(emoji)) { calloutMatch = cfg; break; }
          }
          if (calloutMatch) {
            const Icon = calloutMatch.icon;
            return (
              <div className={`my-3 p-3 rounded-lg border-l-2 ${calloutMatch.className}`}>
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="w-4 h-4 text-gold flex-shrink-0" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-cream-dim/60 font-mono">
                    {calloutMatch.label}
                  </span>
                </div>
                <div className="text-sm text-cream-dim [&>p]:mb-0">{children}</div>
              </div>
            );
          }
          return (
            <blockquote className="my-3 pl-4 border-l-2 border-gold/50 bg-gold/5 rounded-r-lg py-2 pr-3 flex gap-2">
              <Quote className="w-4 h-4 text-gold/50 flex-shrink-0 mt-0.5" />
              <div className="text-cream-dim italic">{children}</div>
            </blockquote>
          );
        },
        code: ({ className, children, ...props }: any) => {
          const lang = (className || "").replace("language-", "").trim();
          const raw = String(children).replace(/\n$/, "");
          // Check if it looks like a block code (has newlines or explicit language)
          const isBlock = lang || raw.includes("\n");
          if (isBlock) {
            return <CodeBlock language={lang}>{raw}</CodeBlock>;
          }
          return (
            <code className="bg-obsidian-light/80 text-gold px-1.5 py-0.5 rounded font-mono text-xs border border-gold/15" {...props}>
              {children}
            </code>
          );
        },
        hr: () => (
          <div className="my-4 flex items-center gap-3">
            <div className="flex-1 h-px bg-gold/15" />
            <span className="text-gold/30 text-xs">✦</span>
            <div className="flex-1 h-px bg-gold/15" />
          </div>
        ),
        table: ({ children }) => (
          <div className="my-3 overflow-x-auto rounded-xl border border-gold/15">
            <table className="w-full text-sm">{children}</table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="bg-gold/10 border-b border-gold/20">{children}</thead>
        ),
        th: ({ children }) => (
          <th className="px-4 py-2 text-left text-gold font-mono text-xs uppercase tracking-wider">{children}</th>
        ),
        td: ({ children }) => (
          <td className="px-4 py-2.5 text-cream border-b border-gold/8 last:border-0">{children}</td>
        ),
        a: ({ href, children }) => (
          <a href={href} target="_blank" rel="noopener noreferrer"
            className="text-gold hover:text-gold-bright underline underline-offset-2 decoration-gold/40 hover:decoration-gold transition-colors">
            {children}
          </a>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
