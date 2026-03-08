import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Brain, Search, Trash2, Edit2, Save, X, AlertCircle } from "lucide-react";

interface MemoryRow {
  id: string;
  agent_id: string;
  user_id: string | null;
  user_session: string | null;
  memory_type: string;
  content: string;
  importance_score: number;
  created_at: string;
}

export default function MemoriesTab() {
  const { toast } = useToast();
  const [memories, setMemories] = useState<MemoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [agentFilter, setAgentFilter] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editImportance, setEditImportance] = useState(0.5);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchMemories = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("agent_memories")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else setMemories((data || []) as MemoryRow[]);
    setLoading(false);
  };

  useEffect(() => { fetchMemories(); }, []);

  const agents = [...new Set(memories.map(m => m.agent_id))];

  const filtered = memories.filter(m => {
    if (agentFilter && m.agent_id !== agentFilter) return false;
    if (search && !m.content.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleDelete = async (id: string) => {
    setDeleting(id);
    const { error } = await supabase.from("agent_memories").delete().eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Deleted" });
      setMemories(prev => prev.filter(m => m.id !== id));
    }
    setDeleting(null);
  };

  const handleSave = async (id: string) => {
    const { error } = await supabase.from("agent_memories").update({
      content: editContent,
      importance_score: editImportance,
    }).eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Saved" });
      setMemories(prev => prev.map(m => m.id === id ? { ...m, content: editContent, importance_score: editImportance } : m));
      setEditingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input type="text" placeholder="Search memories..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full glass rounded-xl pl-10 pr-4 py-2.5 text-sm text-foreground border border-border focus:border-primary/50 outline-none" />
        </div>
        <select value={agentFilter} onChange={e => setAgentFilter(e.target.value)}
          className="glass rounded-xl px-3 py-2.5 text-sm text-foreground border border-border focus:border-primary/50 outline-none">
          <option value="">All agents</option>
          {agents.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <span className="text-xs text-muted-foreground">{filtered.length} memories</span>
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="glass rounded-2xl h-20 animate-pulse bg-muted/30" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="glass-strong rounded-2xl p-12 text-center">
          <Brain className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No memories found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(m => (
            <div key={m.id} className="glass-strong rounded-xl border border-border/50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/15 text-primary font-mono">{m.agent_id}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{m.memory_type}</span>
                    <span className="text-[10px] text-muted-foreground">score: {m.importance_score}</span>
                  </div>
                  {editingId === m.id ? (
                    <div className="space-y-2">
                      <textarea value={editContent} onChange={e => setEditContent(e.target.value)} rows={3}
                        className="w-full glass rounded-lg px-3 py-2 text-sm text-foreground border border-primary/40 outline-none resize-none" />
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-muted-foreground">Importance:</label>
                        <input type="number" min={0} max={1} step={0.1} value={editImportance}
                          onChange={e => setEditImportance(Number(e.target.value))}
                          className="w-20 glass rounded-lg px-2 py-1 text-xs text-foreground border border-border outline-none" />
                        <button onClick={() => handleSave(m.id)} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg gradient-gold text-primary-foreground font-medium">
                          <Save className="w-3 h-3" /> Save
                        </button>
                        <button onClick={() => setEditingId(null)} className="text-xs text-muted-foreground hover:text-foreground">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-foreground/80 line-clamp-3">{m.content}</p>
                  )}
                  <div className="text-[10px] text-muted-foreground mt-1.5">
                    {m.user_id ? `User: ${m.user_id.slice(0, 12)}…` : `Session: ${m.user_session?.slice(0, 12) ?? "—"}…`}
                    {" · "}{new Date(m.created_at).toLocaleDateString("vi-VN")}
                  </div>
                </div>
                {editingId !== m.id && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={() => { setEditingId(m.id); setEditContent(m.content); setEditImportance(m.importance_score); }}
                      className="p-1.5 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDelete(m.id)} disabled={deleting === m.id}
                      className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
