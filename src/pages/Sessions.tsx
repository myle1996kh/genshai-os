import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  MessageSquare, Users, Trash2, Loader2,
  Clock, Brain, Search, Star, StarOff,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { agents } from "@/data/agents";
import AgentAvatar from "@/components/AgentAvatar";
import { toast } from "sonner";

interface ChatSession {
  id: string;
  agent_id: string;
  created_at: string;
  updated_at: string;
  is_favorite: boolean;
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
  is_favorite: boolean;
  agents: { agent_name: string; agent_image: string | null }[];
}

type TabType = "chats" | "debates";
type SortMode = "recent" | "favorites";

const Sessions = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabType>("chats");
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [debates, setDebates] = useState<DebateSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("recent");
  const [searchInMessages, setSearchInMessages] = useState(false);
  const [messageSearchResults, setMessageSearchResults] = useState<Record<string, string[]>>({});

  // ─── Custom agent name cache ────────────────────────────────────────
  const [customAgentNames, setCustomAgentNames] = useState<Record<string, { name: string; image: string | null; domain: string }>>({});

  useEffect(() => {
    if (!user) return;
    setLoading(true);

    const fetchChats = async () => {
      const { data: convos } = await supabase
        .from("conversations")
        .select("id, agent_id, created_at, updated_at, is_favorite")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      if (convos) {
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
              is_favorite: (c as any).is_favorite ?? false,
              messageCount: count || 0,
              lastMessage: lastMsg?.[0]?.content?.slice(0, 120) || "",
            };
          })
        );
        setChats(enriched);

        // Fetch custom agent info for non-static agents
        const customIds = enriched
          .map((c) => c.agent_id)
          .filter((id) => !agents.find((a) => a.id === id));
        const uniqueCustomIds = [...new Set(customIds)];
        if (uniqueCustomIds.length > 0) {
          const { data: customAgents } = await supabase
            .from("custom_agents")
            .select("slug, name, image_url, domain")
            .in("slug", uniqueCustomIds);
          if (customAgents) {
            const map: Record<string, { name: string; image: string | null; domain: string }> = {};
            customAgents.forEach((a) => {
              map[a.slug] = { name: a.name, image: a.image_url, domain: a.domain };
            });
            setCustomAgentNames(map);
          }
        }
      }
    };

    const fetchDebates = async () => {
      const { data: sessions } = await supabase
        .from("group_sessions")
        .select("id, topic, status, current_turn, max_turns, created_at, is_favorite")
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

            return { ...s, is_favorite: (s as any).is_favorite ?? false, agents: agentRows || [] };
          })
        );
        setDebates(enriched);
      }
    };

    Promise.all([fetchChats(), fetchDebates()]).finally(() => setLoading(false));
  }, [user]);

  // Search within messages
  useEffect(() => {
    if (!searchInMessages || !search.trim() || search.length < 3) {
      setMessageSearchResults({});
      return;
    }
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from("messages")
        .select("conversation_id, content")
        .ilike("content", `%${search}%`)
        .limit(50);

      if (data) {
        const grouped: Record<string, string[]> = {};
        data.forEach((m) => {
          if (!grouped[m.conversation_id]) grouped[m.conversation_id] = [];
          grouped[m.conversation_id].push(m.content.slice(0, 120));
        });
        setMessageSearchResults(grouped);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [search, searchInMessages]);

  const toggleFavoriteChat = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    const chat = chats.find((c) => c.id === id);
    if (!chat) return;
    const newVal = !chat.is_favorite;
    setChats((prev) => prev.map((c) => (c.id === id ? { ...c, is_favorite: newVal } : c)));
    await supabase.from("conversations").update({ is_favorite: newVal }).eq("id", id);
  };

  const toggleFavoriteDebate = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    const debate = debates.find((d) => d.id === id);
    if (!debate) return;
    const newVal = !debate.is_favorite;
    setDebates((prev) => prev.map((d) => (d.id === id ? { ...d, is_favorite: newVal } : d)));
    await supabase.from("group_sessions").update({ is_favorite: newVal }).eq("id", id);
  };

  const deleteChat = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
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

  const deleteDebate = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
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

  const getAgentInfo = (agentId: string) => {
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

  const filteredChats = chats
    .filter((c) => {
      if (!search) return true;
      const nameMatch = getAgentInfo(c.agent_id).name.toLowerCase().includes(search.toLowerCase());
      const messageMatch = searchInMessages && messageSearchResults[c.id];
      return nameMatch || !!messageMatch;
    })
    .sort((a, b) => {
      if (sortMode === "favorites") {
        if (a.is_favorite !== b.is_favorite) return a.is_favorite ? -1 : 1;
      }
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });

  const filteredDebates = debates
    .filter((d) => !search || d.topic.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortMode === "favorites") {
        if (a.is_favorite !== b.is_favorite) return a.is_favorite ? -1 : 1;
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  return (
    <div className="min-h-screen bg-background pt-[72px]">
      <div className="container mx-auto px-5 py-8 max-w-5xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-2xl text-foreground font-semibold flex items-center gap-2">
              <Clock className="w-6 h-6 text-primary" />
              Sessions
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Manage your conversations and debate sessions
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/30 border border-border/50 mb-5 w-fit">
          {[
            { key: "chats" as TabType, icon: MessageSquare, label: "Conversations", count: chats.length },
            { key: "debates" as TabType, icon: Users, label: "Debates", count: debates.length },
          ].map(({ key, icon: Icon, label, count }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === key
                  ? "bg-primary/15 text-primary border border-primary/25"
                  : "text-muted-foreground hover:text-foreground border border-transparent"
              }`}>
              <Icon className="w-4 h-4" />
              {label}
              <span className={`text-xs px-1.5 py-0.5 rounded-md ${
                tab === key ? "bg-primary/20 text-primary" : "bg-muted/50 text-muted-foreground"
              }`}>{count}</span>
            </button>
          ))}
        </div>

        {/* Search + Sort controls */}
        <div className="flex gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={tab === "chats" ? "Search by agent name or message content..." : "Search by topic..."}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-muted/20 border border-border text-foreground text-sm placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary/30 transition-colors"
            />
          </div>
          {tab === "chats" && (
            <button
              onClick={() => setSearchInMessages(!searchInMessages)}
              className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all flex-shrink-0 ${
                searchInMessages
                  ? "bg-primary/15 text-primary border-primary/25"
                  : "bg-muted/20 text-muted-foreground border-border hover:text-foreground"
              }`}
              title="Search within message content"
            >
              {searchInMessages ? "Content ✓" : "Content"}
            </button>
          )}
          <button
            onClick={() => setSortMode(sortMode === "recent" ? "favorites" : "recent")}
            className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all flex-shrink-0 flex items-center gap-1.5 ${
              sortMode === "favorites"
                ? "bg-yellow-500/15 text-yellow-500 border-yellow-500/25"
                : "bg-muted/20 text-muted-foreground border-border hover:text-foreground"
            }`}
          >
            <Star className="w-3.5 h-3.5" />
            {sortMode === "favorites" ? "Favorites first" : "Recent"}
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            Loading sessions...
          </div>
        )}

        {/* Chat Sessions — Card Grid */}
        {!loading && tab === "chats" && (
          <>
            {filteredChats.length === 0 && (
              <div className="text-center py-16 text-muted-foreground/40">
                <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No conversations yet</p>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredChats.map((chat) => {
                const info = getAgentInfo(chat.agent_id);
                return (
                  <Link
                    key={chat.id}
                    to={`/session/${chat.agent_id}`}
                    className="group relative flex flex-col rounded-2xl border border-border/30 bg-muted/10 hover:bg-muted/25 hover:border-primary/25 transition-all duration-200 overflow-hidden"
                  >
                    {/* Card header with avatar */}
                    <div className="flex items-center gap-3 p-4 pb-2">
                      <div className="w-11 h-11 rounded-xl overflow-hidden flex-shrink-0 bg-primary/10">
                        {info.image ? (
                          <img src={info.image} alt={info.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Brain className="w-5 h-5 text-primary/60" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-semibold text-foreground truncate">{info.name}</h3>
                        <span className="text-[11px] text-muted-foreground/50 font-mono">{info.domain}</span>
                      </div>
                      <button
                        onClick={(e) => toggleFavoriteChat(e, chat.id)}
                        className="p-1.5 rounded-lg hover:bg-muted/40 transition-colors flex-shrink-0"
                      >
                        {chat.is_favorite
                          ? <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                          : <Star className="w-3.5 h-3.5 text-muted-foreground/20 group-hover:text-muted-foreground/40" />
                        }
                      </button>
                    </div>

                    {/* Message snippet */}
                    <div className="px-4 pb-2 flex-1">
                      {chat.lastMessage ? (
                        <p className="text-xs text-muted-foreground/60 line-clamp-2 leading-relaxed">
                          {chat.lastMessage}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground/30 italic">No messages yet</p>
                      )}
                      {searchInMessages && messageSearchResults[chat.id] && (
                        <div className="mt-1.5 space-y-0.5">
                          {messageSearchResults[chat.id].slice(0, 2).map((snippet, i) => (
                            <p key={i} className="text-[11px] text-primary/60 truncate">
                              💬 ...{snippet}...
                            </p>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Card footer */}
                    <div className="flex items-center justify-between px-4 py-3 border-t border-border/20">
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] text-muted-foreground/40 font-mono">
                          {chat.messageCount} msgs
                        </span>
                        <span className="text-[11px] text-muted-foreground/30">
                          {formatDate(chat.updated_at)}
                        </span>
                      </div>
                      <button
                        onClick={(e) => deleteChat(e, chat.id)}
                        disabled={deleting === chat.id}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-muted-foreground/30 hover:text-destructive hover:bg-destructive/10 transition-all disabled:opacity-50"
                        title="Delete conversation"
                      >
                        {deleting === chat.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        )}

        {/* Debate Sessions — Card Grid */}
        {!loading && tab === "debates" && (
          <>
            {filteredDebates.length === 0 && (
              <div className="text-center py-16 text-muted-foreground/40">
                <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No debate sessions yet</p>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDebates.map((debate) => (
                <Link
                  key={debate.id}
                  to={`/group-debate/${debate.id}`}
                  className="group relative flex flex-col rounded-2xl border border-border/30 bg-muted/10 hover:bg-muted/25 hover:border-primary/25 transition-all duration-200 overflow-hidden"
                >
                  {/* Card header */}
                  <div className="flex items-start gap-3 p-4 pb-2">
                    <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Users className="w-5 h-5 text-primary/60" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-semibold text-foreground line-clamp-2 leading-snug">{debate.topic}</h3>
                      <span className={`inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded-md font-mono ${
                        debate.status === "active"
                          ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                          : "bg-muted/30 text-muted-foreground border border-border"
                      }`}>{debate.status}</span>
                    </div>
                    <button
                      onClick={(e) => toggleFavoriteDebate(e, debate.id)}
                      className="p-1.5 rounded-lg hover:bg-muted/40 transition-colors flex-shrink-0"
                    >
                      {debate.is_favorite
                        ? <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                        : <Star className="w-3.5 h-3.5 text-muted-foreground/20 group-hover:text-muted-foreground/40" />
                      }
                    </button>
                  </div>

                  {/* Participants */}
                  <div className="px-4 pb-2 flex-1">
                    <div className="flex flex-wrap gap-1">
                      {debate.agents.map((a, i) => (
                        <span key={i} className="text-[11px] text-muted-foreground bg-primary/5 px-2 py-1 rounded-lg border border-border/40">
                          {a.agent_name}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Card footer */}
                  <div className="flex items-center justify-between px-4 py-3 border-t border-border/20">
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] text-muted-foreground/40 font-mono">
                        Turn {debate.current_turn}/{debate.max_turns}
                      </span>
                      <span className="text-[11px] text-muted-foreground/30">
                        {formatDate(debate.created_at)}
                      </span>
                    </div>
                    <button
                      onClick={(e) => deleteDebate(e, debate.id)}
                      disabled={deleting === debate.id}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-muted-foreground/30 hover:text-destructive hover:bg-destructive/10 transition-all disabled:opacity-50"
                      title="Delete debate session"
                    >
                      {deleting === debate.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Sessions;
