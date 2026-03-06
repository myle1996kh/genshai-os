import { useState, useEffect, useCallback } from "react";
import { Server, Wifi, WifiOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface McpConnection {
  id: string;
  name: string;
  server_url: string;
  is_active: boolean;
}

interface InputMcpToggleProps {
  activeIds: string[];
  onToggle: (ids: string[]) => void;
  refreshKey?: number;
}

export function InputMcpToggle({ activeIds, onToggle, refreshKey }: InputMcpToggleProps) {
  const [open, setOpen] = useState(false);
  const [connections, setConnections] = useState<McpConnection[]>([]);

  useEffect(() => {
    supabase
      .from("mcp_connections")
      .select("id, name, server_url, is_active")
      .eq("is_active", true)
      .then(({ data }) => setConnections(data || []));
  }, [refreshKey]);

  if (connections.length === 0) return null;

  const activeCount = activeIds.filter(id => connections.some(c => c.id === id)).length;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 border ${
          activeCount > 0
            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
            : "border-transparent hover:bg-gold/10 text-muted-foreground hover:text-gold"
        }`}
        title={`MCP: ${activeCount} active`}
      >
        <Server className="w-4 h-4" />
        {activeCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 text-[9px] text-white font-bold flex items-center justify-center">
            {activeCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full mb-2 left-0 w-72 glass-strong rounded-xl border border-gold/20 shadow-xl overflow-hidden z-[9999]">
            <div className="px-3 py-2 border-b border-gold/10 flex items-center justify-between">
              <span className="font-mono text-gold/60 text-[10px] uppercase tracking-widest">MCP Servers</span>
              <span className="text-[10px] text-muted-foreground">{activeCount}/{connections.length} active</span>
            </div>
            <div className="py-1 max-h-48 overflow-y-auto">
              {connections.map(conn => {
                const isOn = activeIds.includes(conn.id);
                return (
                  <button
                    key={conn.id}
                    onClick={() => onToggle(isOn ? activeIds.filter(id => id !== conn.id) : [...activeIds, conn.id])}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-gold/8 transition-colors ${isOn ? "bg-emerald-500/5" : ""}`}
                  >
                    {isOn
                      ? <Wifi className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                      : <WifiOff className="w-3.5 h-3.5 text-muted-foreground/30 flex-shrink-0" />
                    }
                    <div className="flex-1 min-w-0">
                      <span className="text-foreground text-xs truncate block">{conn.name}</span>
                      <span className="text-muted-foreground/40 text-[10px] font-mono truncate block">{conn.server_url}</span>
                    </div>
                    <div className={`w-7 h-3.5 rounded-full transition-colors flex-shrink-0 ${isOn ? "bg-emerald-500" : "bg-muted-foreground/20"}`}>
                      <div className={`w-2.5 h-2.5 rounded-full bg-white mt-[2px] transition-transform ${isOn ? "translate-x-3.5" : "translate-x-0.5"}`} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
