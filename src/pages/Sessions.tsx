import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  MessageSquare, Users, Trash2, Loader2, ArrowLeft,
  Clock, Brain, Search, Filter,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { agents } from "@/data/agents";
import { toast } from "sonner";

interface ChatSession {
  id: string;
  agent_id: string;
  created_at: string;
  updated_at: string;
  messageCount?: number;
  lastMessage?: string;
}

interface DebateSession {
  id: string;
  topic: string;
  status: string;
  current_turn: number;
  max_turns: number;
  created_at: string;
  agents: { agent_name: string; agent_image: string | null }[];
}

type TabType = "chats" | "debates";

const Sessions = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabType>("chats");
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [debates, setDebates] = useState<DebateSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Fetch chat sessions
  useEffect(() => {
    if (!user) return;
    setLoading(true);

    const fetchChats = async () => {
      const { data: convos } = await supabase
        .from("conversations")
        .select("id, agent_id, created_at, updated_at")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      if (convos) {
        // Fetch message counts
        const enriched = await Promise.all(
          convos.map(async (c) => {
            const { count } = await supabase
              .from("messages")
              .select("*", { count: "exact", head: true })
              .eq("conversation_id", c.id);

            const { data: lastMsg } = await supabase
              .from("messages")
              .select("content")
              .eq("conversation_id", c.id)
              .order("created_at", { ascending: false })
              .limit(1);

            return {
              ...c,
              messageCount: count || 0,
              lastMessage: lastMsg?.[0]?.content?.slice(0, 100) || "",
            };
          })
        );
        setChats(enriched);
      }
    };

    const fetchDebates = async () => {
      const { data: sessions } = await supabase
        .from("group_sessions")
        .select("id, topic, status, current_turn, max_turns, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (sessions) {
        const enriched = await Promise.all(
          sessions.map(async (s) => {
            const { data: agentRows } = await supabase
              .from("group_session_agents")
              .select("agent_name, agent_image")
              .eq("session_id", s.id)
              .order("turn_order");

            return { ...s, agents: agentRows || [] };
          })
        );
        setDebates(enriched);
      }
    };

    Promise.all([fetchChats(), fetchDebates()]).finally(() => setLoading(false));
  }, [user]);

  const deleteChat = async (id: string) => {
    setDeleting(id);
    try {
      await supabase.from("messages").delete().eq("conversation_id", id);
      await supabase.from("conversations").delete().eq("id", id);
      setChats((prev) => prev.filter((c) => c.id !== id));
      toast.success("Conversation deleted");
    } catch {
      toast.error("Failed to delete conversation");
    } finally {
      setDeleting(null);
    }
  };

  const deleteDebate = async (id: string) => {
    setDeleting(id);
    try {
      await supabase.from("group_messages").delete().eq("session_id", id);
      await supabase.from("group_session_agents").delete().eq("session_id", id);
      await supabase.from("group_sessions").delete().eq("id", id);
      setDebates((prev) => prev.filter((d) => d.id !== id));
      toast.success("Debate session deleted");
    } catch {
      toast.error("Failed to delete debate");
    } finally {
      setDeleting(null);
    }
  };

  const getAgentName = (agentId: string) => {
    const staticAgent = agents.find((a) => a.id === agentId);
    return staticAgent?.name || agentId;
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

  const filteredChats = chats.filter((c) =>
    !search || getAgentName(c.agent_id).toLowerCase().includes(search.toLowerCase())
  );

  const filteredDebates = debates.filter((d) =>
    !search || d.topic.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-obsidian pt-[72px]">
      <div className="container mx-auto px-5 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-2xl text-cream font-semibold flex items-center gap-2">
              <Clock className="w-6 h-6 text-primary" />
              Sessions
            </h1>
            <p className="text-cream-dim/60 text-sm mt-1">
              Manage your conversations and debate sessions
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-obsidian-light/60 border border-primary/10 mb-5 w-fit">
          <button
            onClick={() => setTab("chats")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === "chats"
                ? "bg-primary/15 text-primary border border-primary/25"
                : "text-cream-dim hover:text-cream border border-transparent"
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            Conversations
            <span className={`text-xs px-1.5 py-0.5 rounded-md ${
              tab === "chats" ? "bg-primary/20 text-primary" : "bg-muted/50 text-cream-dim/50"
            }`}>
              {chats.length}
            </span>
          </button>
          <button
            onClick={() => setTab("debates")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === "debates"
                ? "bg-primary/15 text-primary border border-primary/25"
                : "text-cream-dim hover:text-cream border border-transparent"
            }`}
          >
            <Users className="w-4 h-4" />
            Debates
            <span className={`text-xs px-1.5 py-0.5 rounded-md ${
              tab === "debates" ? "bg-primary/20 text-primary" : "bg-muted/50 text-cream-dim/50"
            }`}>
              {debates.length}
            </span>
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-5">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cream-dim/40" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={tab === "chats" ? "Search by agent name..." : "Search by topic..."}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-obsidian-light/60 border border-primary/10 text-cream text-sm placeholder:text-cream-dim/30 focus:outline-none focus:border-primary/30 transition-colors"
          />
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20 text-cream-dim/50">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            Loading sessions...
          </div>
        )}

        {/* Chat Sessions */}
        {!loading && tab === "chats" && (
          <div className="space-y-2">
            {filteredChats.length === 0 && (
              <div className="text-center py-16 text-cream-dim/40">
                <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No conversations yet</p>
              </div>
            )}
            {filteredChats.map((chat) => (
              <div
                key={chat.id}
                className="group flex items-center gap-4 p-4 rounded-xl border border-primary/8 bg-obsidian-light/30 hover:bg-obsidian-light/50 hover:border-primary/20 transition-all"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Brain className="w-5 h-5 text-primary/70" />
                </div>
                <Link
                  to={`/session/${chat.agent_id}`}
                  className="flex-1 min-w-0 cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-cream truncate">
                      {getAgentName(chat.agent_id)}
                    </span>
                    <span className="text-xs text-cream-dim/40">{formatDate(chat.updated_at)}</span>
                  </div>
                  {chat.lastMessage && (
                    <p className="text-xs text-cream-dim/50 truncate mt-0.5">{chat.lastMessage}</p>
                  )}
                  <span className="text-[11px] text-cream-dim/30 mt-0.5 block">
                    {chat.messageCount} messages
                  </span>
                </Link>
                <button
                  onClick={() => deleteChat(chat.id)}
                  disabled={deleting === chat.id}
                  className="opacity-0 group-hover:opacity-100 p-2 rounded-lg text-cream-dim/40 hover:text-destructive hover:bg-destructive/10 transition-all disabled:opacity-50"
                  title="Delete conversation"
                >
                  {deleting === chat.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Debate Sessions */}
        {!loading && tab === "debates" && (
          <div className="space-y-2">
            {filteredDebates.length === 0 && (
              <div className="text-center py-16 text-cream-dim/40">
                <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No debate sessions yet</p>
              </div>
            )}
            {filteredDebates.map((debate) => (
              <div
                key={debate.id}
                className="group flex items-center gap-4 p-4 rounded-xl border border-primary/8 bg-obsidian-light/30 hover:bg-obsidian-light/50 hover:border-primary/20 transition-all"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5 text-primary/70" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-cream truncate">{debate.topic}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${
                      debate.status === "active"
                        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                        : "bg-muted/30 text-cream-dim/50 border border-primary/10"
                    }`}>
                      {debate.status}
                    </span>
                    <span className="text-xs text-cream-dim/40">{formatDate(debate.created_at)}</span>
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    {debate.agents.map((a, i) => (
                      <span key={i} className="text-[11px] text-cream-dim/50 bg-primary/5 px-1.5 py-0.5 rounded-md border border-primary/8">
                        {a.agent_name}
                      </span>
                    ))}
                  </div>
                  <span className="text-[11px] text-cream-dim/30 mt-0.5 block">
                    Turn {debate.current_turn}/{debate.max_turns}
                  </span>
                </div>
                <button
                  onClick={() => deleteDebate(debate.id)}
                  disabled={deleting === debate.id}
                  className="opacity-0 group-hover:opacity-100 p-2 rounded-lg text-cream-dim/40 hover:text-destructive hover:bg-destructive/10 transition-all disabled:opacity-50"
                  title="Delete debate session"
                >
                  {deleting === debate.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Sessions;
