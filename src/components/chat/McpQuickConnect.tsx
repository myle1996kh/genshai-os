import { Server, Globe, FileText, Database, BookOpen, Terminal, MessageSquare } from "lucide-react";

export interface McpTemplate {
  id: string;
  name: string;
  description: string;
  icon: typeof Server;
  urlTemplate: string;
  urlPlaceholder: string;
  authType: "none" | "bearer" | "api_key";
  category: "productivity" | "dev" | "knowledge" | "communication";
}

export const mcpTemplates: McpTemplate[] = [
  {
    id: "obsidian",
    name: "Obsidian",
    description: "Connect to Obsidian vault via Local REST API plugin",
    icon: BookOpen,
    urlTemplate: "http://localhost:27124/mcp",
    urlPlaceholder: "http://localhost:27124/mcp",
    authType: "bearer",
    category: "knowledge",
  },
  {
    id: "filesystem",
    name: "Filesystem",
    description: "Access local files and directories",
    icon: FileText,
    urlTemplate: "http://localhost:3100/mcp",
    urlPlaceholder: "http://localhost:3100/mcp",
    authType: "none",
    category: "dev",
  },
  {
    id: "notion",
    name: "Notion",
    description: "Connect to Notion workspaces and databases",
    icon: Database,
    urlTemplate: "https://mcp.notion.so",
    urlPlaceholder: "https://mcp.notion.so",
    authType: "bearer",
    category: "productivity",
  },
  {
    id: "github",
    name: "GitHub",
    description: "Access repos, issues, PRs via GitHub MCP",
    icon: Terminal,
    urlTemplate: "http://localhost:3200/mcp",
    urlPlaceholder: "http://localhost:3200/mcp",
    authType: "bearer",
    category: "dev",
  },
  {
    id: "slack",
    name: "Slack",
    description: "Read and send messages in Slack channels",
    icon: MessageSquare,
    urlTemplate: "http://localhost:3300/mcp",
    urlPlaceholder: "http://localhost:3300/mcp",
    authType: "bearer",
    category: "communication",
  },
  {
    id: "custom",
    name: "Custom MCP",
    description: "Connect to any MCP-compatible server",
    icon: Globe,
    urlTemplate: "",
    urlPlaceholder: "https://your-mcp-server.com/mcp",
    authType: "none",
    category: "dev",
  },
];

interface McpQuickConnectProps {
  onConnect: (prompt: string) => void;
}

export function McpQuickConnect({ onConnect }: McpQuickConnectProps) {
  return (
    <div className="my-3 rounded-xl border border-gold/15 overflow-hidden">
      <div className="px-4 py-2.5 border-b border-gold/10 flex items-center gap-2">
        <Server className="w-4 h-4 text-gold/70" />
        <span className="text-xs font-mono text-gold/60 uppercase tracking-widest">Quick Connect MCP</span>
      </div>
      <div className="grid grid-cols-2 gap-1 p-2">
        {mcpTemplates.filter(t => t.id !== "custom").map(template => {
          const Icon = template.icon;
          return (
            <button
              key={template.id}
              onClick={() => onConnect(`Connect to ${template.name} MCP server at ${template.urlTemplate}`)}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-gold/8 border border-transparent hover:border-gold/15 transition-all text-left"
            >
              <div className="w-7 h-7 rounded-md bg-gold/10 flex items-center justify-center flex-shrink-0">
                <Icon className="w-3.5 h-3.5 text-gold/70" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-medium text-foreground truncate">{template.name}</div>
                <div className="text-[10px] text-muted-foreground truncate">{template.description}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
