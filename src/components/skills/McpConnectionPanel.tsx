import { useState } from "react";
import { Server, Plus, Wifi, WifiOff, RefreshCw, Loader2, Wrench, ExternalLink, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface McpConnection {
  id: string;
  name: string;
  server_url: string;
  auth_type: string;
  is_active: boolean;
}

interface DiscoveredTool {
  name: string;
  description?: string;
}

interface McpConnectionPanelProps {
  connections: McpConnection[];
  agentId?: string;
  onRefresh: () => void;
}

export function McpConnectionPanel({ connections, agentId, onRefresh }: McpConnectionPanelProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [newMcp, setNewMcp] = useState({ name: "", server_url: "", auth_type: "none", auth_token: "" });
  const [connecting, setConnecting] = useState(false);
  const [discovering, setDiscovering] = useState<string | null>(null);
  const [discoveredTools, setDiscoveredTools] = useState<Record<string, DiscoveredTool[]>>({});

  const createConnection = async () => {
    if (!newMcp.name || !newMcp.server_url) return;
    setConnecting(true);
    try {
      const authConfig: any = {};
      if (newMcp.auth_type === "bearer" && newMcp.auth_token) authConfig.token = newMcp.auth_token;
      if (newMcp.auth_type === "api_key" && newMcp.auth_token) authConfig.api_key = newMcp.auth_token;

      const { data, error } = await supabase.from("mcp_connections").insert({
        name: newMcp.name,
        server_url: newMcp.server_url,
        auth_type: newMcp.auth_type,
        auth_config: authConfig,
      }).select("id").single();

      if (error) throw error;

      toast({ title: "MCP server connected" });
      setNewMcp({ name: "", server_url: "", auth_type: "none", auth_token: "" });
      setShowAdd(false);
      onRefresh();

      // Auto-discover tools
      if (data?.id) {
        await discoverTools(data.id);
      }
    } catch (e: any) {
      toast({ title: "Connection failed", description: e.message, variant: "destructive" });
    } finally {
      setConnecting(false);
    }
  };

  const discoverTools = async (connectionId: string) => {
    setDiscovering(connectionId);
    try {
      const { data, error } = await supabase.functions.invoke("mcp-proxy", {
        body: { connectionId, method: "tools/list", params: {} },
      });

      if (error) throw error;

      const tools: DiscoveredTool[] = data?.result?.tools || data?.tools || [];
      setDiscoveredTools(prev => ({ ...prev, [connectionId]: tools }));

      // Register tools as agent skills and assign to agent
      let created = 0;
      for (const tool of tools) {
        const skillName = `mcp_${tool.name}`;
        const { data: existing } = await supabase
          .from("agent_skills")
          .select("id")
          .eq("mcp_connection_id", connectionId)
          .eq("mcp_tool_name", tool.name)
          .maybeSingle();

        if (!existing) {
          const { data: newSkill } = await supabase.from("agent_skills").insert({
            name: skillName,
            description: tool.description || tool.name,
            skill_type: "mcp",
            mcp_connection_id: connectionId,
            mcp_tool_name: tool.name,
            tool_schema: { type: "object", properties: {} },
          }).select("id").single();

          if (newSkill && agentId) {
            await supabase.from("agent_skill_assignments").insert({
              agent_id: agentId,
              skill_id: newSkill.id,
            });
            created++;
          }
        }
      }

      toast({
        title: `Discovered ${tools.length} tools`,
        description: created > 0 ? `${created} new tools assigned to agent` : "All tools already registered",
      });
      onRefresh();
    } catch (e: any) {
      toast({ title: "Discovery failed", description: e.message, variant: "destructive" });
      setDiscoveredTools(prev => ({ ...prev, [connectionId]: [] }));
    } finally {
      setDiscovering(null);
    }
  };

  const disconnectServer = async (connectionId: string) => {
    await supabase.from("mcp_connections").update({ is_active: false }).eq("id", connectionId);
    // Deactivate associated skills
    const { data: skills } = await supabase.from("agent_skills").select("id").eq("mcp_connection_id", connectionId);
    for (const s of (skills || [])) {
      await supabase.from("agent_skills").update({ is_active: false }).eq("id", s.id);
    }
    toast({ title: "Server disconnected" });
    onRefresh();
  };

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-lg text-foreground flex items-center gap-2">
          <Server className="w-5 h-5 text-emerald-400" />
          MCP Servers
        </h2>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="gap-2">
              <Plus className="w-4 h-4" /> Connect Server
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Connect MCP Server</DialogTitle>
              <DialogDescription>
                Connect a remote MCP server to discover and use its tools. The server must be publicly accessible (not localhost).
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Display name (e.g. Notion MCP)"
                value={newMcp.name}
                onChange={e => setNewMcp({ ...newMcp, name: e.target.value })}
              />
              <Input
                placeholder="Server URL (e.g. https://mcp.example.com/sse)"
                value={newMcp.server_url}
                onChange={e => setNewMcp({ ...newMcp, server_url: e.target.value })}
              />
              <Select value={newMcp.auth_type} onValueChange={v => setNewMcp({ ...newMcp, auth_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Auth</SelectItem>
                  <SelectItem value="bearer">Bearer Token</SelectItem>
                  <SelectItem value="api_key">API Key</SelectItem>
                </SelectContent>
              </Select>
              {newMcp.auth_type !== "none" && (
                <Input
                  type="password"
                  placeholder={newMcp.auth_type === "bearer" ? "Bearer token" : "API key"}
                  value={newMcp.auth_token}
                  onChange={e => setNewMcp({ ...newMcp, auth_token: e.target.value })}
                />
              )}
              <Button onClick={createConnection} className="w-full" disabled={connecting}>
                {connecting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Connecting...</> : "Connect & Discover Tools"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {connections.length === 0 ? (
        <Card className="p-8 text-center">
          <Server className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-1">No MCP servers connected</p>
          <p className="text-xs text-muted-foreground/60">
            Connect a remote MCP server to extend your agent with external tools like Notion, GitHub, or custom APIs.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {connections.map(conn => {
            const tools = discoveredTools[conn.id];
            return (
              <Card key={conn.id} className="overflow-hidden">
                <div className="p-4 flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                    <Wifi className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-foreground">{conn.name}</div>
                    <div className="text-xs text-muted-foreground font-mono truncate flex items-center gap-1">
                      {conn.server_url}
                      <ExternalLink className="w-3 h-3 flex-shrink-0" />
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span className="text-[10px] text-emerald-400/70 font-mono">Active</span>
                      <span className="text-[10px] text-muted-foreground/50 font-mono">· {conn.auth_type}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => discoverTools(conn.id)}
                      disabled={discovering === conn.id}
                      className="text-xs gap-1"
                    >
                      {discovering === conn.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="w-3.5 h-3.5" />
                      )}
                      Discover
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => disconnectServer(conn.id)}
                      className="text-destructive/60 hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Discovered tools */}
                {tools && tools.length > 0 && (
                  <div className="border-t border-border/50 px-4 py-3 bg-muted/30">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Wrench className="w-3 h-3 text-gold/60" />
                      <span className="text-[10px] font-mono text-gold/60 uppercase tracking-widest">
                        {tools.length} Tools Discovered
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {tools.map((t, i) => (
                        <span
                          key={i}
                          className="px-2 py-1 rounded-md bg-emerald-500/8 border border-emerald-500/15 text-[11px] font-mono text-emerald-300"
                          title={t.description}
                        >
                          {t.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
