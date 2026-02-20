import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { useToast } from "@/hooks/use-toast";
import {
  Users, CreditCard, TrendingUp, DollarSign,
  Shield, BarChart3, Clock, CheckCircle2, XCircle,
  Edit2, Save, X, Plus, Trash2, Package, AlertTriangle,
  ChevronDown, RefreshCw, Crown
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────
interface Stats {
  totalUsers: number;
  activeSubscriptions: number;
  monthlyRevenue: number;
  totalRevenue: number;
  proMonthly: number;
  proYearly: number;
  freeUsers: number;
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
  subscription_id: string | null;
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

// ─── Stat Card ───────────────────────────────────────────────────────────────
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

// ─── Plan Editor ─────────────────────────────────────────────────────────────
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
      const { error } = await supabase
        .from("plans")
        .update({
          name: form.name,
          description: form.description,
          price_monthly: form.price_monthly,
          price_yearly: form.price_yearly,
          features: featuresArr,
          max_sessions_per_month: form.max_sessions_per_month,
          max_knowledge_sources: form.max_knowledge_sources,
          is_active: form.is_active,
          paypal_plan_id_monthly: form.paypal_plan_id_monthly,
          paypal_plan_id_yearly: form.paypal_plan_id_yearly,
        })
        .eq("id", plan.id);
      if (error) throw error;
      toast({ title: "Plan saved", description: `${form.name} updated successfully` });
      setEditing(false);
      onSave();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="glass rounded-2xl border border-border overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-border/50">
        <div className="flex items-center gap-3">
          <Package className="w-4 h-4 text-primary" />
          <span className="font-semibold text-foreground">{plan.name}</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-mono">{plan.slug}</span>
          {!plan.is_active && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/20 text-destructive">Inactive</span>
          )}
        </div>
        {!editing ? (
          <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 text-xs text-primary hover:underline">
            <Edit2 className="w-3 h-3" /> Edit
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg gradient-gold text-primary-foreground font-medium"
            >
              {saving ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
              Save
            </button>
            <button onClick={() => { setEditing(false); setForm(plan); }} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-muted text-muted-foreground">
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
            { key: "max_knowledge_sources", label: "Max Knowledge Sources (null = unlimited)", type: "number" },
            { key: "paypal_plan_id_monthly", label: "PayPal Plan ID Monthly", type: "text" },
            { key: "paypal_plan_id_yearly", label: "PayPal Plan ID Yearly", type: "text" },
          ].map(({ key, label, type }) => (
            <div key={key}>
              <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
              <input
                type={type}
                value={(form as any)[key] ?? ""}
                onChange={e => setForm(prev => ({
                  ...prev,
                  [key]: type === "number" ? (e.target.value === "" ? null : Number(e.target.value)) : e.target.value
                }))}
                className="w-full glass rounded-lg px-3 py-2 text-sm text-foreground border border-border focus:border-primary/50 outline-none"
              />
            </div>
          ))}
          <div className="md:col-span-2">
            <label className="text-xs text-muted-foreground mb-1 block">Features (one per line)</label>
            <textarea
              value={featuresText}
              onChange={e => setFeaturesText(e.target.value)}
              rows={5}
              className="w-full glass rounded-lg px-3 py-2 text-sm text-foreground border border-border focus:border-primary/50 outline-none resize-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id={`active-${plan.id}`} checked={form.is_active}
              onChange={e => setForm(prev => ({ ...prev, is_active: e.target.checked }))}
              className="accent-primary" />
            <label htmlFor={`active-${plan.id}`} className="text-sm text-foreground">Active</label>
          </div>
        </div>
      ) : (
        <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-xs text-muted-foreground mb-1">Monthly</div>
            <div className="text-foreground font-semibold">${plan.price_monthly}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">Yearly</div>
            <div className="text-foreground font-semibold">${plan.price_yearly}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">Sessions/mo</div>
            <div className="text-foreground font-semibold">{plan.max_sessions_per_month ?? "∞"}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">Knowledge sources</div>
            <div className="text-foreground font-semibold">{plan.max_knowledge_sources ?? "∞"}</div>
          </div>
          {Array.isArray(plan.features) && plan.features.length > 0 && (
            <div className="col-span-2 md:col-span-4">
              <div className="text-xs text-muted-foreground mb-2">Features</div>
              <div className="flex flex-wrap gap-1.5">
                {plan.features.map((f: string, i: number) => (
                  <span key={i} className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">{f}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Admin Dashboard ─────────────────────────────────────────────────────
export default function Admin() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "payments" | "plans">("overview");
  const [stats, setStats] = useState<Stats | null>(null);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // Check admin role
  useEffect(() => {
    if (!loading && !user) { navigate("/login"); return; }
    if (!user) return;
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single()
      .then(({ data }) => {
        if (!data) { navigate("/"); return; }
        setIsAdmin(true);
      });
  }, [user, loading]);

  // Fetch admin data
  useEffect(() => {
    if (!isAdmin) return;
    fetchAllData();
  }, [isAdmin]);

  const fetchAllData = async () => {
    setDataLoading(true);
    try {
      const [subsRes, paymentsRes, plansRes] = await Promise.all([
        supabase.from("subscriptions").select("*"),
        supabase.from("payments").select("*").order("created_at", { ascending: false }).limit(100),
        supabase.from("plans").select("*").order("sort_order"),
      ]);

      const subs = subsRes.data || [];
      const pays = paymentsRes.data || [];
      const plansData = plansRes.data || [];

      const activeSubs = subs.filter(s => ["active", "trialing"].includes(s.status));
      const proMonthly = activeSubs.filter(s => s.plan_slug === "pro_monthly").length;
      const proYearly = activeSubs.filter(s => s.plan_slug === "pro_yearly").length;
      const freeUsers = subs.filter(s => s.plan_slug === "free").length;

      const totalRevenue = pays.filter(p => p.status === "completed").reduce((a, p) => a + Number(p.amount), 0);
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthlyRevenue = pays
        .filter(p => p.status === "completed" && p.paid_at && new Date(p.paid_at) >= startOfMonth)
        .reduce((a, p) => a + Number(p.amount), 0);

      // Total unique users from subscriptions
      const uniqueUsers = new Set(subs.map(s => s.user_id)).size;

      setStats({
        totalUsers: uniqueUsers,
        activeSubscriptions: activeSubs.length,
        monthlyRevenue,
        totalRevenue,
        proMonthly,
        proYearly,
        freeUsers,
      });
      setPayments(pays as PaymentRow[]);
      setPlans(plansData as PlanRow[]);
    } catch (e: any) {
      toast({ title: "Error loading data", description: e.message, variant: "destructive" });
    } finally {
      setDataLoading(false);
    }
  };

  if (loading || isAdmin === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const tabs = [
    { id: "overview" as const, label: "Overview", icon: BarChart3 },
    { id: "payments" as const, label: "Payment History", icon: CreditCard },
    { id: "plans" as const, label: "Pricing Plans", icon: Package },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="pt-24 pb-20 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl gradient-gold flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-3xl text-foreground">Admin Dashboard</h1>
              <p className="text-muted-foreground text-sm">Platform overview & management</p>
            </div>
            <button onClick={fetchAllData} className="ml-auto flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <RefreshCw className={`w-4 h-4 ${dataLoading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 p-1 glass rounded-xl mb-8 w-fit">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* ── OVERVIEW TAB ── */}
          {activeTab === "overview" && (
            <div className="space-y-8">
              {dataLoading ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Array.from({ length: 7 }).map((_, i) => (
                    <div key={i} className="glass-strong rounded-2xl p-5 h-28 animate-pulse bg-muted/30" />
                  ))}
                </div>
              ) : stats ? (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard icon={Users} label="Total Users" value={stats.totalUsers} />
                    <StatCard icon={Crown} label="Active Subscriptions" value={stats.activeSubscriptions} color="text-primary" />
                    <StatCard icon={DollarSign} label="Revenue This Month" value={`$${stats.monthlyRevenue.toFixed(2)}`} color="text-green-400" />
                    <StatCard icon={TrendingUp} label="Total Revenue" value={`$${stats.totalRevenue.toFixed(2)}`} color="text-accent" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="glass-strong rounded-2xl p-5">
                      <h3 className="text-xs text-muted-foreground uppercase tracking-wider mb-4">Subscription Breakdown</h3>
                      <div className="space-y-3">
                        {[
                          { label: "Free Users", value: stats.freeUsers, color: "bg-muted" },
                          { label: "Pro Monthly", value: stats.proMonthly, color: "bg-primary/60" },
                          { label: "Pro Yearly", value: stats.proYearly, color: "bg-accent/60" },
                        ].map(({ label, value, color }) => {
                          const total = stats.freeUsers + stats.proMonthly + stats.proYearly || 1;
                          const pct = Math.round((value / total) * 100);
                          return (
                            <div key={label}>
                              <div className="flex justify-between text-sm mb-1">
                                <span className="text-muted-foreground">{label}</span>
                                <span className="text-foreground font-medium">{value} <span className="text-muted-foreground text-xs">({pct}%)</span></span>
                              </div>
                              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div className="md:col-span-2 glass-strong rounded-2xl p-5">
                      <h3 className="text-xs text-muted-foreground uppercase tracking-wider mb-4">Recent Payments</h3>
                      <div className="space-y-2">
                        {payments.slice(0, 5).map(p => (
                          <div key={p.id} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                            <div className="flex items-center gap-2">
                              {p.status === "completed"
                                ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                                : <Clock className="w-3.5 h-3.5 text-yellow-400" />}
                              <span className="text-sm text-muted-foreground font-mono">
                                {p.user_id.slice(0, 8)}…
                              </span>
                            </div>
                            <span className="text-sm font-semibold text-foreground">${Number(p.amount).toFixed(2)}</span>
                            <span className="text-xs text-muted-foreground">
                              {p.paid_at ? new Date(p.paid_at).toLocaleDateString("vi-VN") : new Date(p.created_at).toLocaleDateString("vi-VN")}
                            </span>
                          </div>
                        ))}
                        {payments.length === 0 && (
                          <p className="text-muted-foreground text-sm text-center py-4">No payments yet</p>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          )}

          {/* ── PAYMENTS TAB ── */}
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
                            p.status === "pending" ? "bg-yellow-500/15 text-yellow-400" :
                            "bg-destructive/15 text-destructive"
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

          {/* ── PLANS TAB ── */}
          {activeTab === "plans" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-foreground">Pricing Plans</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Edit plan pricing, features, and PayPal IDs</p>
                </div>
              </div>
              {dataLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => <div key={i} className="glass rounded-2xl h-24 animate-pulse bg-muted/30" />)}
                </div>
              ) : plans.length === 0 ? (
                <div className="glass-strong rounded-2xl p-12 text-center">
                  <Package className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No plans in database. Seed plans first.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {plans.map(plan => (
                    <PlanEditor key={plan.id} plan={plan} onSave={fetchAllData} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
