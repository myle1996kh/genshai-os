import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Search, Trash2, Users, Clock, Star } from "lucide-react";

interface SessionRow {
  id: string;
  agent_id: string;
  user_id: string | null;
  user_session: string;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
  message_count?: number;
}

interface GroupSessionRow {
  id: string;
  topic: string;
  user_id: string | null;
  user_session: string;
  status: string;
  current_turn: number;
  max_turns: number;
  is_favorite: boolean;
  created_at: string;
}

export default function SessionsTab() {
  const { toast } = useToast();
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [groupSessions, setGroupSessions] = useState<GroupSessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"chats" | "debates">("chats");
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchSessions = async () => {
    setLoading(true);
    const [chatRes, debateRes] = await Promise.all([
      supabase.from("conversations").select("*").order("updated_at", { ascending: false }).limit(200),
      supabase.from("group_sessions").select("*").order("updated_at", { ascending: false }).limit(200),
    ]);
    if (chatRes.error) toast({ title: "Error", description: chatRes.error.message, variant: "destructive" });
    if (debateRes.error) toast({ title: "Error", description: debateRes.error.message, variant: "destructive" });
    setSessions((chatRes.data || []) as SessionRow[]);
    setGroupSessions((debateRes.data || []) as GroupSessionRow[]);
    setLoading(false);
  };

  useEffect(() => { fetchSessions(); }, []);

  const deleteChat = async (id: string) => {
    setDeleting(id);
    // Delete messages first, then conversation
    await supabase.from("messages").delete().eq("conversation_id", id);
    const { error } = await supabase.from("conversations").delete().eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Session deleted" });
      setSessions(prev => prev.filter(s => s.id !== id));
    }
    setDeleting(null);
  };

  const deleteDebate = async (id: string) => {
    setDeleting(id);
    await supabase.from("group_messages").delete().eq("session_id", id);
    await supabase.from("group_session_agents").delete().eq("session_id", id);
    const { error } = await supabase.from("group_sessions").delete().eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Debate deleted" });
      setGroupSessions(prev => prev.filter(s => s.id !== id));
    }
    setDeleting(null);
  };

  const filteredChats = sessions.filter(s =>
    !search || s.agent_id.toLowerCase().includes(search.toLowerCase()) || s.id.includes(search)
  );

  const filteredDebates = groupSessions.filter(s =>
    !search || s.topic.toLowerCase().includes(search.toLowerCase()) || s.id.includes(search)
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1 p-1 glass rounded-lg">
          {(["chats", "debates"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all capitalize ${tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              {t === "chats" ? <MessageSquare className="w-3 h-3 inline mr-1" /> : <Users className="w-3 h-3 inline mr-1" />}
              {t}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input type="text" placeholder="Search sessions..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full glass rounded-xl pl-10 pr-4 py-2.5 text-sm text-foreground border border-border focus:border-primary/50 outline-none" />
        </div>
        <span className="text-xs text-muted-foreground">
          {tab === "chats" ? `${filteredChats.length} chats` : `${filteredDebates.length} debates`}
        </span>
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="glass rounded-2xl h-16 animate-pulse bg-muted/30" />)}</div>
      ) : tab === "chats" ? (
        <div className="glass-strong rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50">
                {["Agent", "User", "Favorite", "Created", "Updated", "Actions"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs text-muted-foreground uppercase tracking-wider font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredChats.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">No chat sessions</td></tr>
              ) : filteredChats.map(s => (
                <tr key={s.id} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <span className="text-xs font-mono text-primary">{s.agent_id}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground font-mono">
                    {s.user_id ? s.user_id.slice(0, 12) + "…" : s.user_session.slice(0, 12) + "…"}
                  </td>
                  <td className="px-4 py-3">
                    {s.is_favorite && <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(s.created_at).toLocaleDateString("vi-VN")}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(s.updated_at).toLocaleDateString("vi-VN")}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => deleteChat(s.id)} disabled={deleting === s.id}
                      className="flex items-center gap-1 text-xs text-destructive hover:underline disabled:opacity-50">
                      <Trash2 className="w-3 h-3" /> {deleting === s.id ? "..." : "Delete"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="glass-strong rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50">
                {["Topic", "Status", "Turns", "User", "Created", "Actions"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs text-muted-foreground uppercase tracking-wider font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredDebates.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">No debates</td></tr>
              ) : filteredDebates.map(s => (
                <tr key={s.id} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 text-foreground text-xs max-w-[200px] truncate">{s.topic}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${s.status === "active" ? "bg-green-500/15 text-green-400" : "bg-muted text-muted-foreground"}`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{s.current_turn}/{s.max_turns}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground font-mono">
                    {s.user_id ? s.user_id.slice(0, 12) + "…" : s.user_session.slice(0, 12) + "…"}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(s.created_at).toLocaleDateString("vi-VN")}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => deleteDebate(s.id)} disabled={deleting === s.id}
                      className="flex items-center gap-1 text-xs text-destructive hover:underline disabled:opacity-50">
                      <Trash2 className="w-3 h-3" /> {deleting === s.id ? "..." : "Delete"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
