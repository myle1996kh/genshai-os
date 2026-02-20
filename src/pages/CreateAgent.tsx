import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { useToast } from "@/hooks/use-toast";
import {
  Brain, Heart, Cpu, Zap, MessageSquare, BookOpen, History,
  ChevronRight, ChevronLeft, Save, ArrowLeft, Eye, EyeOff, Loader2,
  Sparkles, Wand2, X, ImagePlus, RefreshCw
} from "lucide-react";

const LAYERS = [
  { key: "layer_core_values", icon: Heart, title: "Core Values", subtitle: "Layer 1 — The ethical & philosophical foundation", placeholder: "What does this mind fundamentally believe in?\n\nExample: 'Interbeing, compassion, present-moment awareness, non-violence as ultimate strength'", color: "text-rose-400" },
  { key: "layer_mental_models", icon: Brain, title: "Mental Models", subtitle: "Layer 2 — Frameworks and decision-making lenses", placeholder: "What thinking frameworks does this person use?\n\nExample: 'First Principles: Break any problem to its fundamentals. Inversion: What causes failure? Avoid that.'", color: "text-primary" },
  { key: "layer_reasoning_patterns", icon: Cpu, title: "Reasoning Patterns", subtitle: "Layer 3 — Step-by-step thinking processes", placeholder: "How do they reason through decisions?\n\nExample: '1) Observe without judgment 2) Identify root cause 3) Apply compassionate action 4) Accept impermanence'", color: "text-blue-400" },
  { key: "layer_emotional_stance", icon: Zap, title: "Emotional Stance", subtitle: "Layer 4 — Emotional temperament and response patterns", placeholder: "How does this person relate to emotions?\n\nExample: 'Radical equanimity — neither suppressing nor indulging. Suffering is a teacher.'", color: "text-yellow-400" },
  { key: "layer_language_dna", icon: MessageSquare, title: "Language DNA", subtitle: "Layer 5 — Voice, tone, vocabulary, and expression style", placeholder: "How do they speak and write?\n\nExample: 'Uses metaphors from nature. Asks Socratic questions. Speaks in paradoxes. Short, precise sentences.'", color: "text-purple-400" },
  { key: "layer_decision_history", icon: History, title: "Decision History", subtitle: "Layer 6 — Key life decisions and their reasoning", placeholder: "What defining decisions reveal this person?\n\nExample: 'Refused Vietnam draft despite exile. Left academia to found Plum Village. Community over fame.'", color: "text-orange-400" },
  { key: "layer_knowledge_base", icon: BookOpen, title: "Knowledge Base", subtitle: "Layer 7 — Core domains and expertise areas", placeholder: "What do they know deeply?\n\nExample: 'Buddhist philosophy, Western phenomenology, conflict resolution, community building, poetry'", color: "text-teal-400" },
];

interface AgentForm {
  name: string; slug: string; era: string; domain: string; tagline: string;
  image_url: string; accent_color: string; is_public: boolean;
  conversation_starters: string[];
  layer_core_values: string; layer_mental_models: string; layer_reasoning_patterns: string;
  layer_emotional_stance: string; layer_language_dna: string; layer_decision_history: string; layer_knowledge_base: string;
}

const DEFAULT_FORM: AgentForm = {
  name: "", slug: "", era: "", domain: "", tagline: "", image_url: "",
  accent_color: "42 80% 52%", is_public: false,
  conversation_starters: ["", "", ""],
  layer_core_values: "", layer_mental_models: "", layer_reasoning_patterns: "",
  layer_emotional_stance: "", layer_language_dna: "", layer_decision_history: "", layer_knowledge_base: "",
};

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// ─── Auto-Generate Modal ──────────────────────────────────────────────────────
function AutoGenerateModal({ onClose, onApply }: {
  onClose: () => void;
  onApply: (blueprint: any) => void;
}) {
  const [inputName, setInputName] = useState("");
  const [inputType, setInputType] = useState<"person" | "book">("person");
  const [extra, setExtra] = useState("");
  const [generating, setGenerating] = useState(false);
  const [preview, setPreview] = useState<any>(null);
  const { toast } = useToast();

  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  const generate = async () => {
    if (!inputName.trim()) { toast({ title: "Enter a name", variant: "destructive" }); return; }
    setGenerating(true);
    setPreview(null);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/auto-create-agent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_KEY}` },
        body: JSON.stringify({ name: inputName.trim(), type: inputType, extra }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");
      setPreview(data.blueprint);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setGenerating(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="glass-strong rounded-2xl border border-gold/20 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-border/50">
          <div className="flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-primary" />
            <h2 className="font-display text-lg text-foreground">Auto-Generate Agent</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg glass flex items-center justify-center hover:border-border transition-colors border border-transparent">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">What kind?</label>
            <div className="flex gap-2">
              {[{ val: "person", label: "Person / Thinker" }, { val: "book", label: "Book / Author" }].map(opt => (
                <button key={opt.val} onClick={() => setInputType(opt.val as any)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
                    inputType === opt.val ? "gradient-gold text-obsidian border-transparent" : "glass border-border text-muted-foreground hover:text-foreground"
                  }`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">
              {inputType === "person" ? "Name of person / thinker" : "Book title or author name"}
            </label>
            <input type="text" value={inputName} onChange={e => setInputName(e.target.value)}
              placeholder={inputType === "person" ? "e.g. Richard Feynman, Simone de Beauvoir..." : "e.g. Thinking, Fast and Slow — Daniel Kahneman"}
              className="w-full glass rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 border border-border focus:border-primary/50 outline-none" />
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Extra context (optional)</label>
            <input type="text" value={extra} onChange={e => setExtra(e.target.value)}
              placeholder="e.g. Focus on their philosophy, their failures, their key writings..."
              className="w-full glass rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 border border-border focus:border-primary/50 outline-none" />
          </div>

          <button onClick={generate} disabled={generating || !inputName.trim()}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl gradient-gold text-obsidian font-semibold text-sm disabled:opacity-40">
            {generating ? <><Loader2 className="w-4 h-4 animate-spin" />Generating blueprint with AI...</> : <><Sparkles className="w-4 h-4" />Generate 7-Layer Cognitive OS</>}
          </button>

          {generating && (
            <div className="text-center text-xs text-muted-foreground animate-pulse">
              Researching Wikipedia + generating all 7 layers with AI... This takes ~15 seconds
            </div>
          )}

          {preview && (
            <div className="space-y-3 pt-2">
              <div className="glass rounded-xl p-4 border border-green-500/20">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full bg-green-400" />
                  <span className="text-sm font-semibold text-foreground">Blueprint Ready</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                  <div><span className="text-muted-foreground">Name:</span> <span className="text-foreground font-medium">{preview.name}</span></div>
                  <div><span className="text-muted-foreground">Era:</span> <span className="text-foreground">{preview.era}</span></div>
                  <div><span className="text-muted-foreground">Domain:</span> <span className="text-foreground">{preview.domain}</span></div>
                  <div><span className="text-muted-foreground">Layers:</span> <span className="text-green-400 font-semibold">7 / 7 generated</span></div>
                </div>
                <div className="text-xs text-muted-foreground italic">"{preview.tagline}"</div>
              </div>
              <button onClick={() => onApply(preview)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl gradient-gold text-obsidian font-semibold text-sm">
                <ChevronRight className="w-4 h-4" />
                Apply This Blueprint
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CreateAgent() {
  const { user, isPro, loading } = useAuth();
  const navigate = useNavigate();
  const { agentId } = useParams<{ agentId?: string }>();
  const { toast } = useToast();

  const [isAdmin, setIsAdmin] = useState(false);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [showBasic, setShowBasic] = useState(true);
  const [currentLayer, setCurrentLayer] = useState(0);
  const [form, setForm] = useState<AgentForm>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [showAutoGenerate, setShowAutoGenerate] = useState(false);
  const isEditing = !!agentId;

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate("/login"); return; }
    // All logged-in users can create agents; no subscription required
    setHasAccess(true);
    supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin")
      .then(({ data }) => setIsAdmin(!!(data && data.length > 0)));
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!agentId || !hasAccess) return;
    supabase.from("custom_agents").select("*").eq("id", agentId).single()
      .then(({ data, error }) => {
        if (error || !data) { navigate("/library"); return; }
        setForm({
          name: data.name, slug: data.slug, era: data.era || "", domain: data.domain || "",
          tagline: data.tagline || "", image_url: data.image_url || "",
          accent_color: data.accent_color || "42 80% 52%", is_public: data.is_public,
          conversation_starters: data.conversation_starters?.length
            ? [...data.conversation_starters, ...Array(3).fill("")].slice(0, 3) : ["", "", ""],
          layer_core_values: data.layer_core_values || "", layer_mental_models: data.layer_mental_models || "",
          layer_reasoning_patterns: data.layer_reasoning_patterns || "", layer_emotional_stance: data.layer_emotional_stance || "",
          layer_language_dna: data.layer_language_dna || "", layer_decision_history: data.layer_decision_history || "",
          layer_knowledge_base: data.layer_knowledge_base || "",
        });
        setShowBasic(false);
      });
  }, [agentId, hasAccess]);

  const setField = (key: keyof AgentForm, value: any) => {
    setForm(prev => {
      const updated = { ...prev, [key]: value };
      if (key === "name" && !isEditing) updated.slug = slugify(value);
      return updated;
    });
  };

  const setStarter = (i: number, val: string) => {
    setForm(prev => { const s = [...prev.conversation_starters]; s[i] = val; return { ...prev, conversation_starters: s }; });
  };

  const applyBlueprint = (blueprint: any) => {
    setForm({
      name: blueprint.name || "",
      slug: slugify(blueprint.name || ""),
      era: blueprint.era || "",
      domain: blueprint.domain || "",
      tagline: blueprint.tagline || "",
      image_url: "",
      accent_color: blueprint.accentColor || "42 80% 52%",
      is_public: false,
      conversation_starters: (blueprint.conversationStarters || ["", "", ""]).slice(0, 3),
      layer_core_values: blueprint.layer_core_values || "",
      layer_mental_models: blueprint.layer_mental_models || "",
      layer_reasoning_patterns: blueprint.layer_reasoning_patterns || "",
      layer_emotional_stance: blueprint.layer_emotional_stance || "",
      layer_language_dna: blueprint.layer_language_dna || "",
      layer_decision_history: blueprint.layer_decision_history || "",
      layer_knowledge_base: blueprint.layer_knowledge_base || "",
    });
    setShowAutoGenerate(false);
    setShowBasic(false);
    toast({ title: "Blueprint applied!", description: `${blueprint.name} — review and publish when ready` });
  };

  const handleSave = async (publish: boolean) => {
    if (!form.name.trim() || !form.slug.trim() || !form.domain.trim()) {
      toast({ title: "Required fields missing", description: "Name, slug, and domain are required.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name, slug: form.slug, era: form.era || null, domain: form.domain,
        tagline: form.tagline || null, image_url: form.image_url || null,
        accent_color: form.accent_color, is_public: publish ? true : form.is_public, is_active: true,
        conversation_starters: form.conversation_starters.filter(s => s.trim()),
        layer_core_values: form.layer_core_values || null, layer_mental_models: form.layer_mental_models || null,
        layer_reasoning_patterns: form.layer_reasoning_patterns || null, layer_emotional_stance: form.layer_emotional_stance || null,
        layer_language_dna: form.layer_language_dna || null, layer_decision_history: form.layer_decision_history || null,
        layer_knowledge_base: form.layer_knowledge_base || null, created_by: user!.id,
      };
      if (isEditing) {
        const { error } = await supabase.from("custom_agents").update(payload).eq("id", agentId!);
        if (error) throw error;
        toast({ title: "Agent updated", description: `${form.name} saved.` });
      } else {
        const { error } = await supabase.from("custom_agents").insert(payload);
        if (error) throw error;
        toast({ title: "Agent created!", description: `${form.name} is now in the library.` });
      }
      navigate("/library");
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  // Show spinner only while auth is still resolving (hasAccess set almost immediately after)
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const layer = LAYERS[currentLayer];
  const LayerIcon = layer.icon;
  const completedLayers = LAYERS.filter(l => (form as any)[l.key]?.trim()).length;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      {showAutoGenerate && (
        <AutoGenerateModal onClose={() => setShowAutoGenerate(false)} onApply={applyBlueprint} />
      )}
      <div className="pt-24 pb-20 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <button onClick={() => navigate("/library")} className="w-9 h-9 rounded-xl glass flex items-center justify-center hover:border-primary/50 border border-border transition-colors">
              <ArrowLeft className="w-4 h-4 text-muted-foreground" />
            </button>
            <div>
              <span className="os-tag inline-block mb-1">Cognitive OS Builder</span>
              <h1 className="font-display text-2xl text-foreground">{isEditing ? `Edit: ${form.name || "Agent"}` : "Create New Agent"}</h1>
            </div>
            {!isEditing && (
              <button onClick={() => setShowAutoGenerate(true)}
                className="ml-auto flex items-center gap-2 px-4 py-2.5 rounded-xl border border-primary/30 text-primary hover:bg-primary/10 transition-colors text-sm font-medium">
                <Wand2 className="w-4 h-4" />
                Auto-Generate with AI
              </button>
            )}
          </div>

          {showBasic ? (
            <BasicInfoStep form={form} setField={setField} setStarter={setStarter} onNext={() => setShowBasic(false)} />
          ) : (
            <>
              <div className="glass rounded-2xl p-4 mb-6 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl gradient-gold flex items-center justify-center flex-shrink-0">
                  <Brain className="w-5 h-5 text-primary-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-foreground">{form.name}</div>
                  <div className="text-xs text-muted-foreground">{form.domain} · {form.era || "Era not set"}</div>
                </div>
                <div className="text-sm text-muted-foreground">{completedLayers}/{LAYERS.length} layers</div>
                <button onClick={() => setShowBasic(true)} className="text-xs text-primary hover:underline">Edit basics</button>
              </div>

              <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
                {LAYERS.map((l, i) => {
                  const LIcon = l.icon;
                  const done = (form as any)[l.key]?.trim();
                  return (
                    <button key={l.key} onClick={() => setCurrentLayer(i)}
                      className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                        currentLayer === i ? "bg-primary text-primary-foreground"
                        : done ? "bg-muted text-foreground"
                        : "glass text-muted-foreground hover:text-foreground border border-border"
                      }`}>
                      <LIcon className={`w-3 h-3 ${currentLayer !== i ? l.color : ""}`} />{i + 1}
                    </button>
                  );
                })}
              </div>

              <div className="glass-strong rounded-2xl border border-border/50 overflow-hidden mb-6">
                <div className="p-6 border-b border-border/50">
                  <div className="flex items-center gap-3 mb-1">
                    <LayerIcon className={`w-5 h-5 ${layer.color}`} />
                    <h2 className="font-display text-xl text-foreground">{layer.title}</h2>
                  </div>
                  <p className="text-sm text-muted-foreground">{layer.subtitle}</p>
                </div>
                <div className="p-6">
                  <textarea
                    value={(form as any)[layer.key]}
                    onChange={e => setField(layer.key as keyof AgentForm, e.target.value)}
                    placeholder={layer.placeholder} rows={10}
                    className="w-full glass rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground/50 text-sm outline-none focus:border-primary/40 transition-colors duration-200 border border-border resize-none leading-relaxed"
                  />
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-xs text-muted-foreground">{(form as any)[layer.key]?.length || 0} chars</span>
                    {(form as any)[layer.key]?.trim() && (
                      <span className="text-xs text-green-400 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400" /> Layer complete
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <button onClick={() => setCurrentLayer(prev => Math.max(0, prev - 1))} disabled={currentLayer === 0}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl glass border border-border text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30">
                  <ChevronLeft className="w-4 h-4" /> Previous
                </button>
                {currentLayer < LAYERS.length - 1 ? (
                  <button onClick={() => setCurrentLayer(prev => prev + 1)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl gradient-gold text-primary-foreground font-semibold text-sm">
                    Next Layer <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <div className="flex gap-2 flex-1">
                    <button onClick={() => handleSave(false)} disabled={saving}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border glass text-sm text-foreground hover:border-primary/50 transition-colors">
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <EyeOff className="w-4 h-4" />}
                      Save (Private)
                    </button>
                    <button onClick={() => handleSave(true)} disabled={saving}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl gradient-gold text-primary-foreground font-semibold text-sm">
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                      Publish to Library
                    </button>
                  </div>
                )}
                <button onClick={() => handleSave(false)} disabled={saving || !form.name}
                  className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30">
                  <Save className="w-3.5 h-3.5" /> Save draft
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function BasicInfoStep({ form, setField, setStarter, onNext }: {
  form: AgentForm;
  setField: (k: keyof AgentForm, v: any) => void;
  setStarter: (i: number, v: string) => void;
  onNext: () => void;
}) {
  const canNext = form.name.trim() && form.domain.trim();
  const [generatingImage, setGeneratingImage] = useState(false);
  const { toast } = useToast();

  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  const generateImage = async () => {
    if (!form.name.trim()) {
      toast({ title: "Enter an agent name first", variant: "destructive" });
      return;
    }
    setGeneratingImage(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/generate-agent-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_KEY}` },
        body: JSON.stringify({
          agentName: form.name,
          domain: form.domain,
          era: form.era,
          tagline: form.tagline,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");
      setField("image_url", data.imageUrl);
      toast({ title: "Portrait generated!", description: "AI-painted portrait ready. You can regenerate or enter a URL manually." });
    } catch (e: any) {
      toast({ title: "Generation failed", description: e.message, variant: "destructive" });
    } finally {
      setGeneratingImage(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="glass-strong rounded-2xl border border-border/50 p-6">
        <h2 className="font-display text-xl text-foreground mb-5">Basic Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[
            { key: "name", label: "Agent Name *", placeholder: "e.g. Richard Feynman" },
            { key: "slug", label: "URL Slug *", placeholder: "e.g. richard-feynman" },
            { key: "era", label: "Era / Birth–Death", placeholder: "e.g. 1918 – 1988" },
            { key: "domain", label: "Domain *", placeholder: "e.g. Physics & Curiosity" },
          ].map(({ key, label, placeholder }) => (
            <div key={key}>
              <label className="text-xs text-muted-foreground mb-1.5 block">{label}</label>
              <input type="text" value={(form as any)[key]} onChange={e => setField(key as keyof AgentForm, e.target.value)} placeholder={placeholder}
                className="w-full glass rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 border border-border focus:border-primary/50 outline-none transition-colors" />
            </div>
          ))}
          <div className="md:col-span-2">
            <label className="text-xs text-muted-foreground mb-1.5 block">Tagline</label>
            <input type="text" value={form.tagline} onChange={e => setField("tagline", e.target.value)} placeholder="One compelling sentence..."
              className="w-full glass rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 border border-border focus:border-primary/50 outline-none transition-colors" />
          </div>

          {/* Profile Image — with AI generation */}
          <div className="md:col-span-2 space-y-3">
            <label className="text-xs text-muted-foreground mb-1.5 block">Profile Image</label>
            <div className="flex gap-3 items-start">
              {/* Preview */}
              <div className="flex-shrink-0 w-20 h-20 rounded-xl border border-border overflow-hidden bg-muted flex items-center justify-center">
                {form.image_url ? (
                  <img src={form.image_url} alt="Preview" className="w-full h-full object-cover object-top" />
                ) : (
                  <Brain className="w-7 h-7 text-muted-foreground/40" />
                )}
              </div>
              <div className="flex-1 space-y-2">
                <input type="url" value={form.image_url} onChange={e => setField("image_url", e.target.value)} placeholder="https://... (or generate below)"
                  className="w-full glass rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 border border-border focus:border-primary/50 outline-none transition-colors" />
                <button
                  type="button"
                  onClick={generateImage}
                  disabled={generatingImage || !form.name.trim()}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border border-primary/30 text-primary hover:bg-primary/10 transition-colors text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {generatingImage ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" />Painting portrait with AI...</>
                  ) : form.image_url ? (
                    <><RefreshCw className="w-3.5 h-3.5" />Regenerate Portrait</>
                  ) : (
                    <><ImagePlus className="w-3.5 h-3.5" />Generate AI Portrait</>
                  )}
                </button>
                {generatingImage && (
                  <p className="text-xs text-muted-foreground animate-pulse">Creating a dramatic oil-painting style portrait... ~10 seconds</p>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end pb-1">
            <input type="checkbox" id="is_public" checked={form.is_public} onChange={e => setField("is_public", e.target.checked)} className="accent-primary w-4 h-4" />
            <label htmlFor="is_public" className="text-sm text-foreground">Publicly visible in library</label>
          </div>
        </div>
      </div>

      <div className="glass-strong rounded-2xl border border-border/50 p-6">
        <h2 className="font-display text-xl text-foreground mb-2">Conversation Starters</h2>
        <p className="text-sm text-muted-foreground mb-5">3 questions users will see to start a chat</p>
        <div className="space-y-3">
          {form.conversation_starters.map((s, i) => (
            <div key={i}>
              <label className="text-xs text-muted-foreground mb-1 block">Starter {i + 1}</label>
              <input type="text" value={s} onChange={e => setStarter(i, e.target.value)} placeholder={`"How would you approach..."`}
                className="w-full glass rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 border border-border focus:border-primary/50 outline-none transition-colors" />
            </div>
          ))}
        </div>
      </div>

      <button onClick={onNext} disabled={!canNext}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl gradient-gold text-obsidian font-semibold text-sm disabled:opacity-40">
        Continue to Cognitive Layers <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
