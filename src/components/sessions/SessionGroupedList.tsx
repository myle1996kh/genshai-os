import { useState } from "react";
import { Link } from "react-router-dom";
import {
  MessageSquare, Trash2, Loader2, Brain, Star,
  ChevronDown, ChevronRight,
} from "lucide-react";
import { agents } from "@/data/agents";

interface ChatSession {
  id: string;
  agent_id: string;
  created_at: string;
  updated_at: string;
  is_favorite: boolean;
  messageCount?: number;
  lastMessage?: string;
}

interface AgentInfo {
  name: string;
  image: string | null;
  domain: string;
}

interface Props {
  chats: ChatSession[];
  search: string;
  searchInMessages: boolean;
  messageSearchResults: Record<string, string[]>;
  sortMode: "recent" | "favorites";
  customAgentNames: Record<string, { name: string; image: string | null; domain: string }>;
  deleting: string | null;
  onToggleFavorite: (e: React.MouseEvent, id: string) => void;
  onDelete: (e: React.MouseEvent, id: string) => void;
}

const getAgentInfo = (
  agentId: string,
  customAgentNames: Record<string, { name: string; image: string | null; domain: string }>
): AgentInfo => {
  const staticAgent = agents.find((a) => a.id === agentId);
  if (staticAgent) return { name: staticAgent.name, image: staticAgent.image as string | null, domain: staticAgent.domain };
  const custom = customAgentNames[agentId];
  if (custom) return custom;
  return { name: agentId, image: null, domain: "Custom" };
};

const formatDate = (d: string) => {
  const date = new Date(d);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
};

const getDateGroup = (d: string): string => {
  const date = new Date(d);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 24) return "Today";
  const days = Math.floor(hours / 24);
  if (days < 7) return "This week";
  if (days < 30) return "This month";
  return "Earlier";
};

export default function SessionGroupedList({
  chats, search, searchInMessages, messageSearchResults,
  sortMode, customAgentNames, deleting, onToggleFavorite, onDelete,
}: Props) {
  const [collapsedAgents, setCollapsedAgents] = useState<Set<string>>(new Set());

  const filteredChats = chats
    .filter((c) => {
      if (!search) return true;
      const nameMatch = getAgentInfo(c.agent_id, customAgentNames).name.toLowerCase().includes(search.toLowerCase());
      const messageMatch = searchInMessages && messageSearchResults[c.id];
      return nameMatch || !!messageMatch;
    })
    .sort((a, b) => {
      if (sortMode === "favorites") {
        if (a.is_favorite !== b.is_favorite) return a.is_favorite ? -1 : 1;
      }
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });

  if (filteredChats.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground/40">
        <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm">No conversations yet</p>
      </div>
    );
  }

  // Group by agent
  const grouped = new Map<string, ChatSession[]>();
  filteredChats.forEach((c) => {
    if (!grouped.has(c.agent_id)) grouped.set(c.agent_id, []);
    grouped.get(c.agent_id)!.push(c);
  });

  // Sort groups by most recent session
  const sortedGroups = Array.from(grouped.entries()).sort(([, a], [, b]) => {
    const aFav = a.some((c) => c.is_favorite);
    const bFav = b.some((c) => c.is_favorite);
    if (sortMode === "favorites" && aFav !== bFav) return aFav ? -1 : 1;
    return new Date(b[0].updated_at).getTime() - new Date(a[0].updated_at).getTime();
  });

  const toggleCollapse = (agentId: string) => {
    setCollapsedAgents((prev) => {
      const next = new Set(prev);
      if (next.has(agentId)) next.delete(agentId);
      else next.add(agentId);
      return next;
    });
  };

  return (
    <div className="space-y-3">
      {sortedGroups.map(([agentId, sessions]) => {
        const info = getAgentInfo(agentId, customAgentNames);
        const isCollapsed = collapsedAgents.has(agentId);
        const totalMessages = sessions.reduce((sum, s) => sum + (s.messageCount || 0), 0);
        const hasFavorite = sessions.some((s) => s.is_favorite);

        return (
          <div
            key={agentId}
            className="rounded-2xl border border-border/30 bg-muted/5 overflow-hidden"
          >
            {/* Agent group header */}
            <button
              onClick={() => toggleCollapse(agentId)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/15 transition-colors"
            >
              <div className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0 bg-primary/10">
                {info.image ? (
                  <img src={info.image} alt={info.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Brain className="w-4 h-4 text-primary/60" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-foreground truncate">{info.name}</h3>
                  {hasFavorite && <Star className="w-3 h-3 text-yellow-500 fill-yellow-500 flex-shrink-0" />}
                </div>
                <span className="text-[11px] text-muted-foreground/50 font-mono">{info.domain}</span>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className="text-[11px] text-muted-foreground/40 font-mono">
                  {sessions.length} {sessions.length === 1 ? "chat" : "chats"} · {totalMessages} msgs
                </span>
                {isCollapsed ? (
                  <ChevronRight className="w-4 h-4 text-muted-foreground/30" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground/30" />
                )}
              </div>
            </button>

            {/* Sessions list */}
            {!isCollapsed && (
              <div className="border-t border-border/20">
                {sessions.map((chat, idx) => {
                  const dateGroup = getDateGroup(chat.updated_at);
                  const prevDateGroup = idx > 0 ? getDateGroup(sessions[idx - 1].updated_at) : null;
                  const showDateHeader = dateGroup !== prevDateGroup;

                  return (
                    <div key={chat.id}>
                      {showDateHeader && (
                        <div className="px-4 py-1.5 bg-muted/10">
                          <span className="text-[10px] font-semibold text-muted-foreground/40 uppercase tracking-wider">
                            {dateGroup}
                          </span>
                        </div>
                      )}
                      <Link
                        to={`/session/${chat.agent_id}`}
                        className="group flex items-center gap-3 px-4 py-2.5 hover:bg-muted/15 transition-colors border-t border-border/10 first:border-t-0"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-muted-foreground/60 line-clamp-1 leading-relaxed">
                            {chat.lastMessage || <span className="italic text-muted-foreground/30">No messages yet</span>}
                          </p>
                          {searchInMessages && messageSearchResults[chat.id] && (
                            <p className="text-[11px] text-primary/60 truncate mt-0.5">
                              💬 ...{messageSearchResults[chat.id][0]}...
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-[10px] text-muted-foreground/30 font-mono">
                            {chat.messageCount} msgs
                          </span>
                          <span className="text-[10px] text-muted-foreground/25">
                            {formatDate(chat.updated_at)}
                          </span>
                          <button
                            onClick={(e) => onToggleFavorite(e, chat.id)}
                            className="p-1 rounded-lg hover:bg-muted/40 transition-colors"
                          >
                            {chat.is_favorite
                              ? <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                              : <Star className="w-3 h-3 text-muted-foreground/15 group-hover:text-muted-foreground/30" />
                            }
                          </button>
                          <button
                            onClick={(e) => onDelete(e, chat.id)}
                            disabled={deleting === chat.id}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-muted-foreground/25 hover:text-destructive hover:bg-destructive/10 transition-all disabled:opacity-50"
                          >
                            {deleting === chat.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                          </button>
                        </div>
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
