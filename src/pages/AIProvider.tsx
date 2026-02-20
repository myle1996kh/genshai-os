import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

import { useToast } from "@/hooks/use-toast";
import {
  Plus, Trash2, RefreshCw, CheckCircle2, XCircle, Eye, EyeOff,
  Zap, Globe, Key, ChevronDown, Save, AlertCircle, Cpu,
  ArrowRight, Settings2, FlaskConical, Link2
} from "lucide-react";

interface Provider {
  id: string;
  name: string;
  base_url: string;
  api_key: string;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
}

interface ProviderModel {
  id: string;
  provider_id: string;
  model_id: string;
  model_name: string;
  fetched_at: string;
}

interface ModelMapping {
  id: string;
  module_name: string;
  module_label: string;
  provider_id: string | null;
  model_id: string | null;
  is_default_fallback: boolean;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

function ProviderCard({
  provider,
  onDelete,
  onFetchModels,
  fetching,
  modelCount,
}: {
  provider: Provider;
  onDelete: (id: string) => void;
  onFetchModels: (id: string) => void;
  fetching: boolean;
  modelCount: number;
}) {
  const [showKey, setShowKey] = useState(false);

  return (
    <div className="glass-strong rounded-2xl border border-border overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <Globe className="w-4 h-4 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground">{provider.name}</span>
              {provider.is_verified ? (
                <span className="flex items-center gap-1 text-xs text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3 h-3" /> Verified
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  <AlertCircle className="w-3 h-3" /> Not verified
                </span>
              )}
              {!provider.is_active && (
                <span className="text-xs text-destructive bg-destructive/10 px-2 py-0.5 rounded-full">Inactive</span>
              )}
            </div>
            <div className="text-xs text-muted-foreground font-mono mt-0.5">{provider.base_url}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {modelCount > 0 && (
            <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full">
              {modelCount} models
            </span>
          )}
        </div>
      </div>
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm">
          <Key className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <span className="font-mono text-xs text-muted-foreground flex-1 truncate">
            {showKey ? provider.api_key : "•".repeat(Math.min(provider.api_key.length, 32))}
          </span>
          <button onClick={() => setShowKey(v => !v)} className="text-muted-foreground hover:text-foreground">
            {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onFetchModels(provider.id)}
            disabled={fetching}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg gradient-gold text-obsidian font-medium disabled:opacity-40"
          >
            {fetching ? <RefreshCw className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            {fetching ? "Fetching..." : "Fetch Models"}
          </button>
          <button
            onClick={() => onDelete(provider.id)}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20"
          >
            <Trash2 className="w-3 h-3" /> Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function AddProviderForm({ onAdd }: { onAdd: () => void }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const handleTest = async () => {
    if (!baseUrl || !apiKey) {
      toast({ title: "Required", description: "Enter Base URL and API Key first", variant: "destructive" }); return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${SUPABASE_URL}/functions/v1/manage-provider`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token || SUPABASE_KEY}`,
        },
        body: JSON.stringify({ action: "test_connection", base_url: baseUrl, api_key: apiKey }),
      });
      const data = await res.json();
      if (data.success) {
        setTestResult({ success: true, message: `Connected! ${data.model_count} models available.` });
      } else {
        setTestResult({ success: false, message: data.error || "Connection failed" });
      }
    } catch (e: any) {
      setTestResult({ success: false, message: e.message });
    } finally { setTesting(false); }
  };

  const handleSave = async () => {
    if (!name || !baseUrl || !apiKey) {
      toast({ title: "Required", description: "Fill in all fields", variant: "destructive" }); return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("ai_providers").insert({
        name: name.trim(),
        base_url: baseUrl.trim().replace(/\/+$/, ""),
        api_key: apiKey.trim(),
      });
      if (error) throw error;
      toast({ title: "Provider added", description: `${name} connected successfully` });
      setOpen(false);
      setName(""); setBaseUrl(""); setApiKey(""); setTestResult(null);
      onAdd();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 rounded-xl gradient-gold text-obsidian font-semibold text-sm"
      >
        <Plus className="w-4 h-4" /> Add Provider
      </button>
    );
  }

  return (
    <div className="glass-strong rounded-2xl border border-border p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">New AI Provider</h3>
        <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">✕</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">Provider Name</label>
          <input
            value={name} onChange={e => setName(e.target.value)}
            placeholder="e.g. 9Router, My Proxy..."
            className="w-full glass rounded-lg px-3 py-2.5 text-sm text-foreground border border-border focus:border-primary/50 outline-none"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">Base URL (OpenAI-compatible)</label>
          <input
            value={baseUrl} onChange={e => setBaseUrl(e.target.value)}
            placeholder="https://api.example.com/v1"
            className="w-full glass rounded-lg px-3 py-2.5 text-sm text-foreground border border-border focus:border-primary/50 outline-none"
          />
        </div>
      </div>

      <div>
        <label className="text-xs text-muted-foreground mb-1.5 block">API Key</label>
        <input
          type="password" value={apiKey} onChange={e => setApiKey(e.target.value)}
          placeholder="sk-..."
          className="w-full glass rounded-lg px-3 py-2.5 text-sm text-foreground border border-border focus:border-primary/50 outline-none"
        />
      </div>

      {testResult && (
        <div className={`flex items-center gap-2 text-sm p-3 rounded-xl ${testResult.success ? "bg-green-500/10 text-green-400" : "bg-destructive/10 text-destructive"}`}>
          {testResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
          {testResult.message}
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={handleTest} disabled={testing}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-muted text-foreground text-sm font-medium hover:bg-muted/80 disabled:opacity-40"
        >
          {testing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <FlaskConical className="w-3.5 h-3.5" />}
          {testing ? "Testing..." : "Test Connection"}
        </button>
        <button
          onClick={handleSave} disabled={saving}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl gradient-gold text-obsidian font-semibold text-sm disabled:opacity-40"
        >
          {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          {saving ? "Saving..." : "Save Provider"}
        </button>
      </div>
    </div>
  );
}

function ModelMapper({
  mappings,
  providers,
  models,
  onSave,
}: {
  mappings: ModelMapping[];
  providers: Provider[];
  models: ProviderModel[];
  onSave: () => void;
}) {
  const { toast } = useToast();
  const [edits, setEdits] = useState<Record<string, { provider_id: string; model_id: string }>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const getModelsForProvider = (providerId: string) =>
    models.filter(m => m.provider_id === providerId);

  const getEdit = (m: ModelMapping) => edits[m.id] ?? { provider_id: m.provider_id || "", model_id: m.model_id || "" };

  const handleSaveMapping = async (mapping: ModelMapping) => {
    const edit = getEdit(mapping);
    setSaving(mapping.id);
    try {
      const { error } = await supabase
        .from("model_mappings")
        .update({
          provider_id: edit.provider_id || null,
          model_id: edit.model_id || null,
        })
        .eq("id", mapping.id);
      if (error) throw error;
      toast({ title: "Saved", description: `${mapping.module_label} mapping updated` });
      onSave();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setSaving(null); }
  };

  return (
    <div className="space-y-3">
      {mappings.map(m => {
        const edit = getEdit(m);
        const availableModels = edit.provider_id ? getModelsForProvider(edit.provider_id) : [];
        const isSaving = saving === m.id;

        return (
          <div key={m.id} className="glass-strong rounded-2xl border border-border p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-2 h-2 rounded-full ${m.is_default_fallback ? "bg-amber-400" : "bg-primary"}`} />
              <span className="font-semibold text-foreground text-sm">{m.module_label}</span>
              <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">{m.module_name}</span>
              {m.is_default_fallback && (
                <span className="text-xs text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full">Fallback</span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="text-xs text-muted-foreground mb-1 block">Provider</label>
                <select
                  value={edit.provider_id}
                  onChange={e => setEdits(prev => ({
                    ...prev,
                    [m.id]: { provider_id: e.target.value, model_id: "" }
                  }))}
                  className="w-full glass rounded-lg px-3 py-2 text-sm text-foreground border border-border focus:border-primary/50 outline-none"
                >
                  <option value="">— Use Lovable AI (default) —</option>
                  {providers.filter(p => p.is_active).map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0 mt-5" />
              <div className="flex-1">
                <label className="text-xs text-muted-foreground mb-1 block">Model</label>
                <select
                  value={edit.model_id}
                  onChange={e => setEdits(prev => ({
                    ...prev,
                    [m.id]: { ...getEdit(m), model_id: e.target.value }
                  }))}
                  disabled={!edit.provider_id || availableModels.length === 0}
                  className="w-full glass rounded-lg px-3 py-2 text-sm text-foreground border border-border focus:border-primary/50 outline-none disabled:opacity-50"
                >
                  <option value="">
                    {!edit.provider_id
                      ? "Select provider first"
                      : availableModels.length === 0
                        ? "No models — click Fetch Models"
                        : "Select model..."}
                  </option>
                  {availableModels.map(model => (
                    <option key={model.model_id} value={model.model_id}>{model.model_name}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => handleSaveMapping(m)}
                disabled={isSaving}
                className="flex items-center gap-1.5 mt-5 px-3 py-2 rounded-lg gradient-gold text-obsidian font-medium text-xs disabled:opacity-40 shrink-0"
              >
                {isSaving ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                Save
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function AIProvider() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tab, setTab] = useState<"providers" | "routing">("providers");
  const [providers, setProviders] = useState<Provider[]>([]);
  const [models, setModels] = useState<ProviderModel[]>([]);
  const [mappings, setMappings] = useState<ModelMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchingModels, setFetchingModels] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [provRes, modelRes, mapRes] = await Promise.all([
      supabase.from("ai_providers").select("*").order("created_at"),
      supabase.from("ai_provider_models").select("*").order("model_name"),
      supabase.from("model_mappings").select("*").order("is_default_fallback").order("module_label"),
    ]);
    setProviders((provRes.data as Provider[]) || []);
    setModels((modelRes.data as ProviderModel[]) || []);
    setMappings((mapRes.data as ModelMapping[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/login"); return; }
    if (!isAdmin) { navigate("/"); return; }
    load();
  }, [authLoading, user, isAdmin, load, navigate]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this provider and all its models?")) return;
    const { error } = await supabase.from("ai_providers").delete().eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Deleted" });
    load();
  };

  const handleFetchModels = async (providerId: string) => {
    setFetchingModels(providerId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${SUPABASE_URL}/functions/v1/manage-provider`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token || SUPABASE_KEY}`,
        },
        body: JSON.stringify({ action: "fetch_models", provider_id: providerId }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      toast({ title: "Models fetched!", description: `${data.model_count} models loaded` });
      load();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setFetchingModels(null); }
  };

  const getModelCount = (providerId: string) => models.filter(m => m.provider_id === providerId).length;

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <RefreshCw className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 pt-24">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Cpu className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold text-foreground">AI Provider Manager</h1>
              <p className="text-sm text-muted-foreground">Connect external OpenAI-compatible providers and route modules to models</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 p-1 glass rounded-xl w-fit">
          {[
            { key: "providers", label: "Providers", icon: Link2 },
            { key: "routing", label: "Model Routing", icon: Settings2 },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === key
                  ? "gradient-gold text-obsidian shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>

        {/* Providers Tab */}
        {tab === "providers" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-foreground">Connected Providers</h2>
                <p className="text-xs text-muted-foreground">Any OpenAI-compatible endpoint (9Router, proxies, etc.)</p>
              </div>
              <AddProviderForm onAdd={load} />
            </div>

            {providers.length === 0 ? (
              <div className="glass-strong rounded-2xl border border-border border-dashed p-12 text-center">
                <Globe className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground font-medium">No providers yet</p>
                <p className="text-xs text-muted-foreground mt-1">Add an OpenAI-compatible provider to get started</p>
              </div>
            ) : (
              <div className="space-y-3">
                {providers.map(p => (
                  <ProviderCard
                    key={p.id}
                    provider={p}
                    onDelete={handleDelete}
                    onFetchModels={handleFetchModels}
                    fetching={fetchingModels === p.id}
                    modelCount={getModelCount(p.id)}
                  />
                ))}
              </div>
            )}

            {/* Model Library preview */}
            {models.length > 0 && (
              <div className="mt-6">
                <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary" /> Model Library ({models.length} models)
                </h3>
                <div className="glass-strong rounded-2xl border border-border overflow-hidden">
                  <div className="max-h-64 overflow-y-auto divide-y divide-border/30">
                    {models.map(m => {
                      const prov = providers.find(p => p.id === m.provider_id);
                      return (
                        <div key={m.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/20">
                          <div className="flex items-center gap-2.5">
                            <Cpu className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <span className="text-sm font-mono text-foreground">{m.model_name}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">{prov?.name}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Routing Tab */}
        {tab === "routing" && (
          <div className="space-y-4">
            <div>
              <h2 className="font-semibold text-foreground">Module → Model Routing</h2>
              <p className="text-xs text-muted-foreground">
                Map each app module to a specific provider & model. Leave blank to use Lovable AI (default).
              </p>
            </div>

            {providers.length === 0 ? (
              <div className="glass-strong rounded-2xl border border-amber-500/20 p-5 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground">No providers connected</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Go to the Providers tab to add an OpenAI-compatible provider before setting up routing.
                  </p>
                  <button onClick={() => setTab("providers")} className="mt-2 text-xs text-primary hover:underline">
                    → Add a provider
                  </button>
                </div>
              </div>
            ) : (
              <ModelMapper
                mappings={mappings}
                providers={providers}
                models={models}
                onSave={load}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
