import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { useToast } from "@/hooks/use-toast";
import {
  Users, CreditCard, TrendingUp, DollarSign,
  Shield, BarChart3, Clock, CheckCircle2,
  Edit2, Save, X, Package,
  RefreshCw, Crown, Brain, Sparkles, Search,
  Bot, Trash2, Globe, Lock, ChevronRight, Zap, BookOpen
} from "lucide-react";

interface UserRow {
  user_id: string;
  email: string | null;
  full_name: string | null;
  created_at: string;
  session_limit_override: number | null;
  sessions_this_month: number;
  role?: string;
}

interface AgentRow {
  id: string;
  name: string;
  domain: string;
  created_by: string | null;
  is_public: boolean;
  is_active: boolean;
  created_at: string;
  slug: string;
}

interface Stats {
  totalUsers: number;
  totalAgents: number;
  totalSessions: number;
  totalMessages: number;
}

interface PaymentRow {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  status: string;
  payment_method: string | null;
  paid_at: string | null;
  created_at: string;
  paypal_transaction_id: string | null;
}

interface PlanRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price_monthly: number;
  price_yearly: number;
  features: any;
  max_sessions_per_month: number | null;
  max_knowledge_sources: number | null;
  is_active: boolean;
  sort_order: number;
  paypal_plan_id_monthly: string | null;
  paypal_plan_id_yearly: string | null;
}

function StatCard({ icon: Icon, label, value, sub, color = "text-primary" }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; color?: string;
}) {
  return (
    <div className="glass-strong rounded-2xl p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
          <Icon className={`w-4 h-4 ${color}`} />
        </div>
        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{label}</span>
      </div>
      <div className="font-display text-3xl text-foreground">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}

function PlanEditor({ plan, onSave }: { plan: PlanRow; onSave: () => void }) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<PlanRow>(plan);
  const [saving, setSaving] = useState(false);
  const [featuresText, setFeaturesText] = useState(
    Array.isArray(plan.features) ? plan.features.join("\n") : JSON.stringify(plan.features, null, 2)
  );

  const handleSave = async () => {
    setSaving(true);
    try {
      const featuresArr = featuresText.split("\n").map(f => f.trim()).filter(Boolean);
      const { error } = await supabase.from("plans").update({
        name: form.name, description: form.description,
        price_monthly: form.price_monthly, price_yearly: form.price_yearly,
        features: featuresArr, max_sessions_per_month: form.max_sessions_per_month,
        max_knowledge_sources: form.max_knowledge_sources, is_active: form.is_active,
        paypal_plan_id_monthly: form.paypal_plan_id_monthly, paypal_plan_id_yearly: form.paypal_plan_id_yearly,
      }).eq("id", plan.id);
      if (error) throw error;
      toast({ title: "Plan saved", description: `${form.name} updated` });
      setEditing(false);
      onSave();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  return (
    <div className="glass rounded-2xl border border-border overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-border/50">
        <div className="flex items-center gap-3">
          <Package className="w-4 h-4 text-primary" />
          <span className="font-semibold text-foreground">{plan.name}</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-mono">{plan.slug}</span>
          {!plan.is_active && <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/20 text-destructive">Inactive</span>}
        </div>
        {!editing ? (
          <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 text-xs text-primary hover:underline">
            <Edit2 className="w-3 h-3" /> Edit
          </button>
        ) : (
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg gradient-gold text-primary-foreground font-medium">
              {saving ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Save
            </button>
            <button onClick={() => { setEditing(false); setForm(plan); }}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-muted text-muted-foreground">
              <X className="w-3 h-3" /> Cancel
            </button>
          </div>
        )}
      </div>
      {editing ? (
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { key: "name", label: "Name", type: "text" },
            { key: "description", label: "Description", type: "text" },
            { key: "price_monthly", label: "Price Monthly ($)", type: "number" },
            { key: "price_yearly", label: "Price Yearly ($)", type: "number" },
            { key: "max_sessions_per_month", label: "Max Sessions/Month (null = unlimited)", type: "number" },
            { key: "max_knowledge_sources", label: "Max Knowledge Sources", type: "number" },
            { key: "paypal_plan_id_monthly", label: "PayPal Plan ID Monthly", type: "text" },
            { key: "paypal_plan_id_yearly", label: "PayPal Plan ID Yearly", type: "text" },
          ].map(({ key, label, type }) => (
            <div key={key}>
              <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
              <input type={type} value={(form as any)[key] ?? ""}
                onChange={e => setForm(prev => ({
                  ...prev,
                  [key]: type === "number" ? (e.target.value === "" ? null : Number(e.target.value)) : e.target.value
                }))}
                className="w-full glass rounded-lg px-3 py-2 text-sm text-foreground border border-border focus:border-primary/50 outline-none" />
            </div>
          ))}
          <div className="md:col-span-2">
            <label className="text-xs text-muted-foreground mb-1 block">Features (one per line)</label>
            <textarea value={featuresText} onChange={e => setFeaturesText(e.target.value)} rows={5}
              className="w-full glass rounded-lg px-3 py-2 text-sm text-foreground border border-border focus:border-primary/50 outline-none resize-none" />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id={`active-${plan.id}`} checked={form.is_active}
              onChange={e => setForm(prev => ({ ...prev, is_active: e.target.checked }))} className="accent-primary" />
            <label htmlFor={`active-${plan.id}`} className="text-sm text-foreground">Active</label>
          </div>
        </div>
      ) : (
        <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div><div className="text-xs text-muted-foreground mb-1">Monthly</div><div className="text-foreground font-semibold">${plan.price_monthly}</div></div>
          <div><div className="text-xs text-muted-foreground mb-1">Yearly</div><div className="text-foreground font-semibold">${plan.price_yearly}</div></div>
          <div><div className="text-xs text-muted-foreground mb-1">Sessions/mo</div><div className="text-foreground font-semibold">{plan.max_sessions_per_month ?? "∞"}</div></div>
          <div><div className="text-xs text-muted-foreground mb-1">Knowledge</div><div className="text-foreground font-semibold">{plan.max_knowledge_sources ?? "∞"}</div></div>
        </div>
      )}
    </div>
  );
}

// ─── Auto Research Panel ──────────────────────────────────────────────────────
function AutoResearchPanel() {
  const { toast } = useToast();
  const [agentId, setAgentId] = useState("");
  const [topic, setTopic] = useState("");
  const [sources, setSources] = useState<string[]>(["wikipedia", "books"]);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<any>(null);

  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  const staticAgents = [
    { id: "thich-nhat-hanh", name: "Thich Nhat Hanh" },
    { id: "elon-musk", name: "Elon Musk" },
    { id: "charlie-munger", name: "Charlie Munger" },
    { id: "naval-ravikant", name: "Naval Ravikant" },
    { id: "marcus-aurelius", name: "Marcus Aurelius" },
    { id: "nikola-tesla", name: "Nikola Tesla" },
  ];

  const run = async () => {
    if (!agentId || !topic) {
      toast({ title: "Required", description: "Select an agent and enter a topic", variant: "destructive" }); return;
    }
    setRunning(true);
    setResult(null);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/auto-research`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_KEY}` },
        body: JSON.stringify({ agentId, topic, sources }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setResult(data);
      toast({ title: "Research complete!", description: `${data.sourcesProcessed} sources ingested` });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setRunning(false); }
  };

  return (
    <div className="space-y-4">
      <div className="glass-strong rounded-2xl p-5 border border-border/50">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-foreground">Auto-Research Agent Knowledge</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Agent</label>
            <select value={agentId} onChange={e => setAgentId(e.target.value)}
              className="w-full glass rounded-lg px-3 py-2.5 text-sm text-foreground border border-border focus:border-primary/50 outline-none">
              <option value="">Select agent...</option>
              {staticAgents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Research Topic</label>
            <input type="text" value={topic} onChange={e => setTopic(e.target.value)}
              placeholder="e.g. Stoic philosophy, mental models..."
              className="w-full glass rounded-lg px-3 py-2.5 text-sm text-foreground border border-border focus:border-primary/50 outline-none" />
          </div>
        </div>
        <div className="flex gap-3 mb-4">
          {["wikipedia", "books"].map(s => (
            <label key={s} className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={sources.includes(s)}
                onChange={e => setSources(prev => e.target.checked ? [...prev, s] : prev.filter(x => x !== s))}
                className="accent-primary" />
              <span className="text-sm text-foreground capitalize">{s}</span>
            </label>
          ))}
        </div>
        <button onClick={run} disabled={running || !agentId || !topic}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl gradient-gold text-obsidian font-semibold text-sm disabled:opacity-40">
          {running ? <><RefreshCw className="w-4 h-4 animate-spin" />Researching...</> : <><Sparkles className="w-4 h-4" />Run Research</>}
        </button>
      </div>
      {result && (
        <div className="glass rounded-2xl p-4 border border-green-500/20">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-4 h-4 text-green-400" />
            <span className="text-sm font-semibold text-foreground">Research Complete</span>
          </div>
          <div className="text-xs text-muted-foreground">{result.sourcesProcessed} sources processed and ingested into knowledge base.</div>
          {result.results?.map((r: any, i: number) => (
            <div key={i} className="mt-2 text-xs text-muted-foreground">
              • [{r.source}] {r.title}{r.author ? ` — ${r.author}` : ""}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Users Tab ────────────────────────────────────────────────────────────────
function UsersTab({ users, onUpdate }: { users: UserRow[]; onUpdate: () => void }) {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [limitVal, setLimitVal] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const filtered = users.filter(u =>
    !search || (u.email || "").toLowerCase().includes(search.toLowerCase()) ||
    (u.full_name || "").toLowerCase().includes(search.toLowerCase())
  );

  const handleSaveLimit = async (userId: string) => {
    setSaving(true);
    try {
      const val = limitVal === "" ? null : parseInt(limitVal);
      const { error } = await supabase.from("profiles").update({ session_limit_override: val }).eq("user_id", userId);
      if (error) throw error;
      toast({ title: "Saved", description: "Session limit updated" });
      setEditingId(null);
      onUpdate();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input type="text" placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full glass rounded-xl pl-10 pr-4 py-2.5 text-sm text-foreground border border-border focus:border-primary/50 outline-none" />
        </div>
        <span className="text-xs text-muted-foreground">{users.length} total</span>
      </div>

      <div className="glass-strong rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50">
              {["User", "Sessions This Month", "Session Limit", "Joined", "Actions"].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs text-muted-foreground uppercase tracking-wider font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-12 text-muted-foreground">No users found</td></tr>
            ) : filtered.map(u => (
              <tr key={u.user_id} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
                      {(u.full_name || u.email || "U")[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="text-foreground font-medium text-xs">{u.full_name || "—"}</div>
                      <div className="text-muted-foreground text-xs">{u.email || u.user_id.slice(0, 12) + "…"}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="font-semibold text-foreground">{u.sessions_this_month}</span>
                </td>
                <td className="px-4 py-3">
                  {editingId === u.user_id ? (
                    <div className="flex items-center gap-2">
                      <input type="number" value={limitVal} onChange={e => setLimitVal(e.target.value)}
                        placeholder="null = ∞"
                        className="w-24 glass rounded-lg px-2 py-1 text-xs text-foreground border border-primary/40 outline-none" />
                      <button onClick={() => handleSaveLimit(u.user_id)} disabled={saving}
                        className="text-xs px-2 py-1 rounded-lg gradient-gold text-obsidian font-medium">
                        {saving ? "..." : "Save"}
                      </button>
                      <button onClick={() => setEditingId(null)} className="text-xs text-muted-foreground hover:text-foreground">✕</button>
                    </div>
                  ) : (
                    <span className={`font-mono text-sm ${u.session_limit_override ? "text-primary" : "text-muted-foreground"}`}>
                      {u.session_limit_override ?? "∞"}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-muted-foreground text-xs">
                  {new Date(u.created_at).toLocaleDateString("vi-VN")}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => { setEditingId(u.user_id); setLimitVal(u.session_limit_override?.toString() ?? ""); }}
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    <Edit2 className="w-3 h-3" /> Set limit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Agents Tab ───────────────────────────────────────────────────────────────
function AgentsTab({ agents, onUpdate }: { agents: AgentRow[]; onUpdate: () => void }) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  const togglePublic = async (agent: AgentRow) => {
    const { error } = await supabase.from("custom_agents").update({ is_public: !agent.is_public }).eq("id", agent.id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Updated" }); onUpdate(); }
  };

  const toggleActive = async (agent: AgentRow) => {
    const { error } = await supabase.from("custom_agents").update({ is_active: !agent.is_active }).eq("id", agent.id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Updated" }); onUpdate(); }
  };

  const runAutoResearch = async (agent: AgentRow) => {
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/auto-research`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_KEY}` },
        body: JSON.stringify({ agentId: agent.slug, topic: agent.name, sources: ["wikipedia", "books"] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: "Research done", description: `${data.sourcesProcessed} sources for ${agent.name}` });
    } catch (e: any) {
      toast({ title: "Research failed", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="glass-strong rounded-2xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/50">
            {["Agent", "Domain", "Status", "Created", "Actions"].map(h => (
              <th key={h} className="text-left px-4 py-3 text-xs text-muted-foreground uppercase tracking-wider font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {agents.length === 0 ? (
            <tr><td colSpan={5} className="text-center py-12 text-muted-foreground">No custom agents yet</td></tr>
          ) : agents.map(a => (
            <tr key={a.id} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <div className="text-foreground font-medium">{a.name}</div>
                    <div className="text-muted-foreground text-xs font-mono">{a.slug}</div>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 text-muted-foreground text-xs">{a.domain}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${a.is_active ? "bg-green-500/15 text-green-400" : "bg-muted text-muted-foreground"}`}>
                    {a.is_active ? "Active" : "Inactive"}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${a.is_public ? "bg-blue-500/15 text-blue-400" : "bg-muted text-muted-foreground"}`}>
                    {a.is_public ? "Public" : "Private"}
                  </span>
                </div>
              </td>
              <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(a.created_at).toLocaleDateString("vi-VN")}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <button onClick={() => navigate(`/edit-agent/${a.id}`)} className="text-xs text-primary hover:underline flex items-center gap-1">
                    <Edit2 className="w-3 h-3" /> Edit
                  </button>
                  <button onClick={() => togglePublic(a)} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                    {a.is_public ? <Lock className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
                    {a.is_public ? "Hide" : "Publish"}
                  </button>
                  <button onClick={() => runAutoResearch(a)} className="text-xs text-accent hover:underline flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Research
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main Admin ───────────────────────────────────────────────────────────────
export default function Admin() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "agents" | "research" | "payments" | "plans">("overview");
  const [stats, setStats] = useState<Stats | null>(null);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) { navigate("/login"); return; }
    if (!user) return;
    supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").single()
      .then(({ data }) => {
        if (!data) { navigate("/"); return; }
        setIsAdmin(true);
      });
  }, [user, loading]);

  useEffect(() => {
    if (!isAdmin) return;
    fetchAllData();
  }, [isAdmin]);

  const fetchAllData = useCallback(async () => {
    setDataLoading(true);
    try {
      const [profilesRes, paymentsRes, plansRes, agentsRes, convsRes, msgsRes] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("payments").select("*").order("created_at", { ascending: false }).limit(100),
        supabase.from("plans").select("*").order("sort_order"),
        supabase.from("custom_agents").select("*").order("created_at", { ascending: false }),
        supabase.from("conversations").select("id", { count: "exact", head: true }),
        supabase.from("messages").select("id", { count: "exact", head: true }),
      ]);

      const profileList = (profilesRes.data || []) as UserRow[];
      setUsers(profileList);
      setPayments((paymentsRes.data || []) as PaymentRow[]);
      setPlans((plansRes.data || []) as PlanRow[]);
      setAgents((agentsRes.data || []) as AgentRow[]);
      setStats({
        totalUsers: profileList.length,
        totalAgents: (agentsRes.data || []).length,
        totalSessions: convsRes.count || 0,
        totalMessages: msgsRes.count || 0,
      });
    } catch (e: any) {
      toast({ title: "Error loading data", description: e.message, variant: "destructive" });
    } finally { setDataLoading(false); }
  }, []);

  if (loading || isAdmin === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const tabs = [
    { id: "overview" as const, label: "Overview", icon: BarChart3 },
    { id: "users" as const, label: "Users", icon: Users },
    { id: "agents" as const, label: "Agents", icon: Bot },
    { id: "research" as const, label: "Auto-Research", icon: Sparkles },
    { id: "payments" as const, label: "Payments", icon: CreditCard },
    { id: "plans" as const, label: "Plans", icon: Package },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="pt-24 pb-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl gradient-gold flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-3xl text-foreground">Admin Dashboard</h1>
              <p className="text-muted-foreground text-sm">Platform management & control</p>
            </div>
            <button onClick={fetchAllData} className="ml-auto flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <RefreshCw className={`w-4 h-4 ${dataLoading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 p-1 glass rounded-xl mb-8 overflow-x-auto">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === tab.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}>
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-8">
              {dataLoading ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="glass-strong rounded-2xl p-5 h-28 animate-pulse bg-muted/30" />
                  ))}
                </div>
              ) : stats ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatCard icon={Users} label="Total Users" value={stats.totalUsers} />
                  <StatCard icon={Bot} label="Custom Agents" value={stats.totalAgents} color="text-primary" />
                  <StatCard icon={Brain} label="Total Sessions" value={stats.totalSessions} color="text-accent" />
                  <StatCard icon={Zap} label="Total Messages" value={stats.totalMessages} color="text-green-400" />
                </div>
              ) : null}

              {/* Quick links */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { tab: "users", label: "Manage Users", desc: "Set session limits, view activity", icon: Users, color: "text-blue-400" },
                  { tab: "agents", label: "Manage Agents", desc: "Edit, publish, or research agents", icon: Bot, color: "text-primary" },
                  { tab: "research", label: "Auto-Research", desc: "Enrich any agent with Wikipedia & books", icon: Sparkles, color: "text-accent" },
                ].map(item => (
                  <button key={item.tab} onClick={() => setActiveTab(item.tab as any)}
                    className="glass-strong rounded-2xl p-5 text-left hover:border-primary/30 border border-transparent transition-colors group">
                    <item.icon className={`w-6 h-6 mb-3 ${item.color}`} />
                    <div className="font-semibold text-foreground mb-1">{item.label}</div>
                    <div className="text-xs text-muted-foreground">{item.desc}</div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground mt-3 group-hover:text-foreground transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* USERS */}
          {activeTab === "users" && !dataLoading && (
            <UsersTab users={users} onUpdate={fetchAllData} />
          )}

          {/* AGENTS */}
          {activeTab === "agents" && !dataLoading && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-foreground">Custom Agents</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Manage all user-created cognitive agents</p>
                </div>
                <button onClick={() => navigate("/create-agent")}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl gradient-gold text-obsidian font-semibold text-sm">
                  <Bot className="w-4 h-4" /> New Agent
                </button>
              </div>
              <AgentsTab agents={agents} onUpdate={fetchAllData} />
            </div>
          )}

          {/* RESEARCH */}
          {activeTab === "research" && <AutoResearchPanel />}

          {/* PAYMENTS */}
          {activeTab === "payments" && (
            <div className="glass-strong rounded-2xl overflow-hidden">
              <div className="p-5 border-b border-border/50">
                <h2 className="font-semibold text-foreground">Payment History</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Last 100 transactions</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50">
                      {["User ID", "Amount", "Status", "Method", "Date", "Transaction ID"].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs text-muted-foreground uppercase tracking-wider font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {payments.length === 0 ? (
                      <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">No payments found</td></tr>
                    ) : payments.map(p => (
                      <tr key={p.id} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{p.user_id.slice(0, 12)}…</td>
                        <td className="px-4 py-3 font-semibold text-foreground">${Number(p.amount).toFixed(2)} <span className="text-muted-foreground font-normal text-xs">{p.currency}</span></td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                            p.status === "completed" ? "bg-green-500/15 text-green-400" :
                            p.status === "pending" ? "bg-yellow-500/15 text-yellow-400" : "bg-destructive/15 text-destructive"
                          }`}>
                            {p.status === "completed" ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                            {p.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground capitalize">{p.payment_method || "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">
                          {p.paid_at ? new Date(p.paid_at).toLocaleDateString("vi-VN") : new Date(p.created_at).toLocaleDateString("vi-VN")}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                          {p.paypal_transaction_id ? p.paypal_transaction_id.slice(0, 16) + "…" : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* PLANS */}
          {activeTab === "plans" && (
            <div className="space-y-4">
              <div>
                <h2 className="font-semibold text-foreground">Pricing Plans</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Edit plan pricing, session limits, and features</p>
              </div>
              {dataLoading ? (
                <div className="space-y-4">{[1, 2, 3].map(i => <div key={i} className="glass rounded-2xl h-24 animate-pulse bg-muted/30" />)}</div>
              ) : plans.length === 0 ? (
                <div className="glass-strong rounded-2xl p-12 text-center">
                  <Package className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No plans in database.</p>
                </div>
              ) : (
                <div className="space-y-4">{plans.map(plan => <PlanEditor key={plan.id} plan={plan} onSave={fetchAllData} />)}</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
