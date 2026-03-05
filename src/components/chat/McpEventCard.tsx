import { Server, Wifi, WifiOff, CheckCircle2, XCircle, RefreshCw, Wrench } from "lucide-react";

interface McpEventCardProps {
  type: "connected" | "disconnected" | "discovered" | "error" | "listing";
  name?: string;
  serverUrl?: string;
  toolsCount?: number;
  tools?: Array<{ name: string; description?: string }>;
  connections?: Array<{ id: string; name: string; server_url: string; is_active: boolean }>;
  error?: string;
}

export function McpEventCard({ type, name, serverUrl, toolsCount, tools, connections, error }: McpEventCardProps) {
  if (type === "connected") {
    return (
      <div className="my-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-emerald-500/10">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
            <Wifi className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">{name}</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <span className="text-xs text-muted-foreground font-mono truncate block">{serverUrl}</span>
          </div>
        </div>
        {toolsCount !== undefined && toolsCount > 0 && (
          <div className="px-4 py-2.5 flex items-center gap-2">
            <Wrench className="w-3.5 h-3.5 text-gold/70" />
            <span className="text-xs text-muted-foreground">
              <span className="text-gold font-medium">{toolsCount}</span> tools discovered and assigned
            </span>
          </div>
        )}
        {tools && tools.length > 0 && (
          <div className="px-4 pb-3">
            <div className="flex flex-wrap gap-1.5">
              {tools.slice(0, 8).map((t, i) => (
                <span key={i} className="px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/15 text-[11px] font-mono text-emerald-300">
                  {t.name}
                </span>
              ))}
              {tools.length > 8 && (
                <span className="px-2 py-1 text-[11px] text-muted-foreground">+{tools.length - 8} more</span>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (type === "disconnected") {
    return (
      <div className="my-3 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 flex items-center gap-3">
        <WifiOff className="w-4 h-4 text-destructive/70" />
        <div>
          <span className="text-sm text-foreground">{name || "MCP Connection"}</span>
          <span className="text-xs text-muted-foreground ml-2">disconnected</span>
        </div>
      </div>
    );
  }

  if (type === "listing" && connections) {
    return (
      <div className="my-3 rounded-xl border border-gold/15 bg-gold/5 overflow-hidden">
        <div className="px-4 py-2.5 border-b border-gold/10 flex items-center gap-2">
          <Server className="w-4 h-4 text-gold/70" />
          <span className="text-xs font-mono text-gold/60 uppercase tracking-widest">MCP Connections</span>
          <span className="text-[11px] text-muted-foreground ml-auto">{connections.length} total</span>
        </div>
        {connections.length === 0 ? (
          <div className="px-4 py-3 text-xs text-muted-foreground">No MCP connections found.</div>
        ) : (
          <div className="divide-y divide-gold/8">
            {connections.map(c => (
              <div key={c.id} className="px-4 py-2.5 flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${c.is_active ? "bg-emerald-400" : "bg-muted-foreground/30"}`} />
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-foreground">{c.name}</span>
                  <span className="text-[11px] text-muted-foreground font-mono ml-2 truncate">{c.server_url}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (type === "discovered") {
    return (
      <div className="my-3 rounded-xl border border-gold/20 bg-gold/5 px-4 py-3 flex items-center gap-3">
        <RefreshCw className="w-4 h-4 text-gold" />
        <span className="text-sm text-foreground">
          Discovered <span className="text-gold font-medium">{toolsCount || 0}</span> tools from <span className="font-medium">{name}</span>
        </span>
      </div>
    );
  }

  if (type === "error") {
    return (
      <div className="my-3 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 flex items-center gap-3">
        <XCircle className="w-4 h-4 text-destructive" />
        <span className="text-sm text-destructive">{error || "MCP connection failed"}</span>
      </div>
    );
  }

  return null;
}
