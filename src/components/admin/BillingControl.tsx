import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CreditCard, UserCheck, Search, CheckCircle2, Clock, Package, DollarSign, Save, RefreshCw } from "lucide-react";

interface UserProfile {
  user_id: string;
  email: string | null;
  full_name: string | null;
  session_limit_override: number | null;
}

interface Subscription {
  id: string;
  user_id: string;
  plan_slug: string;
  status: string;
  billing_cycle: string | null;
  current_period_end: string | null;
}

interface PlanOption {
  id: string;
  name: string;
  slug: string;
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

export default function BillingControl() {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [assigningUser, setAssigningUser] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState("");
  const [selectedCycle, setSelectedCycle] = useState("monthly");
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"assign" | "payments">("assign");

  const fetchData = async () => {
    setLoading(true);
    const [usersRes, subsRes, plansRes, paymentsRes] = await Promise.all([
      supabase.from("profiles").select("user_id, email, full_name, session_limit_override").order("created_at", { ascending: false }),
      supabase.from("subscriptions").select("*").order("created_at", { ascending: false }),
      supabase.from("plans").select("id, name, slug").eq("is_active", true).order("sort_order"),
      supabase.from("payments").select("*").order("created_at", { ascending: false }).limit(100),
    ]);
    setUsers((usersRes.data || []) as UserProfile[]);
    setSubscriptions((subsRes.data || []) as Subscription[]);
    setPlans((plansRes.data || []) as PlanOption[]);
    setPayments((paymentsRes.data || []) as PaymentRow[]);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const getUserSub = (userId: string) => subscriptions.find(s => s.user_id === userId && s.status === "active");

  const assignPlan = async (userId: string) => {
    if (!selectedPlan) return;
    setSaving(true);
    try {
      const plan = plans.find(p => p.slug === selectedPlan);
      const existingSub = getUserSub(userId);

      if (existingSub) {
        // Update existing subscription
        const { error } = await supabase.from("subscriptions").update({
          plan_slug: selectedPlan,
          plan_id: plan?.id || null,
          billing_cycle: selectedCycle,
          status: "active",
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + (selectedCycle === "yearly" ? 365 : 30) * 86400000).toISOString(),
        }).eq("id", existingSub.id);
        if (error) throw error;
      } else {
        // Create new subscription
        const { error } = await supabase.from("subscriptions").insert({
          user_id: userId,
          plan_slug: selectedPlan,
          plan_id: plan?.id || null,
          billing_cycle: selectedCycle,
          status: "active",
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + (selectedCycle === "yearly" ? 365 : 30) * 86400000).toISOString(),
        });
        if (error) throw error;
      }

      toast({ title: "Plan assigned", description: `${selectedPlan} assigned to user` });
      setAssigningUser(null);
      fetchData();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const markPaymentCompleted = async (paymentId: string) => {
    const { error } = await supabase.from("payments").update({
      status: "completed",
      paid_at: new Date().toISOString(),
    }).eq("id", paymentId);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Payment marked as completed" });
      fetchData();
    }
  };

  const filteredUsers = users.filter(u =>
    !search || (u.email || "").toLowerCase().includes(search.toLowerCase()) || (u.full_name || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-1 p-1 glass rounded-lg w-fit">
        {(["assign", "payments"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all capitalize ${tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            {t === "assign" ? <UserCheck className="w-3 h-3 inline mr-1" /> : <DollarSign className="w-3 h-3 inline mr-1" />}
            {t === "assign" ? "Assign Plans" : "Payments"}
          </button>
        ))}
      </div>

      {tab === "assign" ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input type="text" placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)}
                className="w-full glass rounded-xl pl-10 pr-4 py-2.5 text-sm text-foreground border border-border focus:border-primary/50 outline-none" />
            </div>
          </div>

          {loading ? (
            <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="glass rounded-2xl h-16 animate-pulse bg-muted/30" />)}</div>
          ) : (
            <div className="glass-strong rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50">
                    {["User", "Current Plan", "Period End", "Actions"].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs text-muted-foreground uppercase tracking-wider font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(u => {
                    const sub = getUserSub(u.user_id);
                    return (
                      <tr key={u.user_id} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3">
                          <div className="text-foreground text-xs font-medium">{u.full_name || "—"}</div>
                          <div className="text-muted-foreground text-[10px]">{u.email || u.user_id.slice(0, 12) + "…"}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            sub ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                          }`}>
                            {sub?.plan_slug || "free"}
                          </span>
                          {sub?.billing_cycle && <span className="text-[10px] text-muted-foreground ml-1">({sub.billing_cycle})</span>}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {sub?.current_period_end ? new Date(sub.current_period_end).toLocaleDateString("vi-VN") : "—"}
                        </td>
                        <td className="px-4 py-3">
                          {assigningUser === u.user_id ? (
                            <div className="flex items-center gap-2 flex-wrap">
                              <select value={selectedPlan} onChange={e => setSelectedPlan(e.target.value)}
                                className="glass rounded-lg px-2 py-1 text-xs text-foreground border border-border outline-none">
                                <option value="">Select plan...</option>
                                {plans.map(p => <option key={p.slug} value={p.slug}>{p.name}</option>)}
                              </select>
                              <select value={selectedCycle} onChange={e => setSelectedCycle(e.target.value)}
                                className="glass rounded-lg px-2 py-1 text-xs text-foreground border border-border outline-none">
                                <option value="monthly">Monthly</option>
                                <option value="yearly">Yearly</option>
                              </select>
                              <button onClick={() => assignPlan(u.user_id)} disabled={saving || !selectedPlan}
                                className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg gradient-gold text-primary-foreground font-medium disabled:opacity-40">
                                {saving ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Assign
                              </button>
                              <button onClick={() => setAssigningUser(null)} className="text-xs text-muted-foreground">✕</button>
                            </div>
                          ) : (
                            <button onClick={() => { setAssigningUser(u.user_id); setSelectedPlan(sub?.plan_slug || ""); }}
                              className="flex items-center gap-1 text-xs text-primary hover:underline">
                              <Package className="w-3 h-3" /> Assign Plan
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="glass-strong rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-border/50">
            <h3 className="font-semibold text-foreground">Payment History</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Mark pending payments as completed</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  {["User ID", "Amount", "Status", "Method", "Date", "Actions"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs text-muted-foreground uppercase tracking-wider font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payments.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">No payments</td></tr>
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
                    <td className="px-4 py-3 text-muted-foreground capitalize text-xs">{p.payment_method || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {p.paid_at ? new Date(p.paid_at).toLocaleDateString("vi-VN") : new Date(p.created_at).toLocaleDateString("vi-VN")}
                    </td>
                    <td className="px-4 py-3">
                      {p.status === "pending" && (
                        <button onClick={() => markPaymentCompleted(p.id)}
                          className="flex items-center gap-1 text-xs text-green-400 hover:underline">
                          <CheckCircle2 className="w-3 h-3" /> Mark Paid
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
