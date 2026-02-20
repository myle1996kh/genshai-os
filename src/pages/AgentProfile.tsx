import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft, Brain, Cpu, Zap, Globe, BookOpen, MessageSquare,
  Upload, Heart, Target, Lightbulb, Quote, Plus, Loader2,
} from "lucide-react";
import { agents } from "@/data/agents";
import { supabase } from "@/integrations/supabase/client";
import AgentAvatar from "@/components/AgentAvatar";

const cognitiveOSLayers = [
  { id: "coreValues",     label: "Core Values",     icon: Heart, desc: "Fundamental beliefs encoded from their life's work" },
  { id: "mentalModel",    label: "Mental Model",     icon: Brain, desc: "How they process information and reach decisions" },
  { id: "emotionalStance",label: "Emotional Stance", icon: Zap,   desc: "How they relate to failure, joy, and suffering" },
];

const additionalLayers = [
  { label: "Reasoning Patterns", icon: Cpu,       desc: "Step-by-step thinking process under pressure — the actual decision algorithms" },
  { label: "Language DNA",        icon: Quote,     desc: "Their rhythm, metaphors, tone — reconstructed from thousands of written and spoken words" },
  { label: "Decision History",    icon: Target,    desc: "Real choices they made and why — including failures, reversals, and moments of doubt" },
];

interface CustomAgent {
  id: string; slug: string; name: string; era: string | null; domain: string;
  tagline: string | null; image_url: string | null; accent_color: string | null;
  conversation_starters: string[] | null;
  layer_core_values: string | null; layer_mental_models: string | null;
  layer_reasoning_patterns: string | null; layer_emotional_stance: string | null;
  layer_language_dna: string | null; layer_decision_history: string | null;
  layer_knowledge_base: string | null;
}

const AgentProfile = () => {
  const { agentId } = useParams<{ agentId: string }>();

  // 1. Try static agents first
  const staticAgent = agents.find((a) => a.id === agentId);

  const [customAgent, setCustomAgent] = useState<CustomAgent | null>(null);
  const [agentLoading, setAgentLoading] = useState(!staticAgent);
  const [knowledgeSources, setKnowledgeSources] = useState<any[]>([]);
  const [sourcesLoading, setSourcesLoading] = useState(true);

  // 2. If not static, fetch from DB
  useEffect(() => {
    if (staticAgent || !agentId) {
      setAgentLoading(false);
      return;
    }
    setAgentLoading(true);
    // Query by slug first; fall back to id only if it looks like a UUID
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(agentId);
    const query = supabase.from("custom_agents").select("*").eq("is_active", true).limit(1);
    const finalQuery = isUUID
      ? query.or(`slug.eq.${agentId},id.eq.${agentId}`)
      : query.eq("slug", agentId);
    finalQuery.maybeSingle().then(({ data }) => {
      if (data) setCustomAgent(data as CustomAgent);
      setAgentLoading(false);
    });
  }, [agentId, staticAgent]);

  // 3. Merge into a unified shape
  const agent = staticAgent
    ? {
        id: staticAgent.id,
        name: staticAgent.name,
        era: staticAgent.era,
        domain: staticAgent.domain,
        tagline: staticAgent.tagline,
        image: staticAgent.image as string | null,
        accentColor: staticAgent.accentColor,
        conversationStarters: staticAgent.conversationStarters,
        cognitiveOS: staticAgent.cognitiveOS,
        isCustom: false,
        layers: null as null,
      }
    : customAgent
    ? {
        id: customAgent.slug,
        name: customAgent.name,
        era: customAgent.era || "",
        domain: customAgent.domain,
        tagline: customAgent.tagline || `${customAgent.name} — Custom Cognitive Agent`,
        image: customAgent.image_url || null,
        accentColor: customAgent.accent_color || "42 80% 52%",
        conversationStarters: customAgent.conversation_starters || [],
        cognitiveOS: {
          coreValues: customAgent.layer_core_values || "—",
          mentalModel: customAgent.layer_mental_models || "—",
          emotionalStance: customAgent.layer_emotional_stance || "—",
        },
        isCustom: true,
        layers: customAgent,
      }
    : null;

  // 4. Knowledge sources
  useEffect(() => {
    if (!agentId || agentLoading) return;
    supabase
      .from("knowledge_sources")
      .select("*")
      .eq("agent_id", agentId)
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setKnowledgeSources(data || []);
        setSourcesLoading(false);
      });
  }, [agentId, agentLoading]);

  // Loading state
  if (agentLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-gold animate-spin" />
      </div>
    );
  }

  // Not found
  if (!agent) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Brain className="w-12 h-12 text-cream-dim/30 mx-auto mb-4" />
          <p className="text-cream-dim text-lg mb-4">Agent not found.</p>
          <Link to="/library" className="text-gold hover:underline">Return to Library</Link>
        </div>
      </div>
    );
  }

  const allMentalModels = knowledgeSources.flatMap((s) => s.mental_models || []);
  const allReasoningPatterns = knowledgeSources.flatMap((s) => s.reasoning_patterns || []);

  return (
    <div className="min-h-screen bg-background pt-24 pb-20">
      <div className="max-w-5xl mx-auto px-6">
        <Link to="/library" className="inline-flex items-center gap-1.5 text-cream-dim hover:text-cream transition-colors text-sm mb-10">
          <ArrowLeft className="w-4 h-4" />
          Back to Library
        </Link>

        {/* Hero */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-14">
          <div className="lg:col-span-1">
            <div className="relative rounded-2xl overflow-hidden aspect-[3/4] max-h-80">
              {agent.image ? (
                <img src={agent.image} alt={agent.name} className="w-full h-full object-cover object-top" />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center"
                  style={{
                    background: `linear-gradient(135deg, hsl(${agent.accentColor?.split(" ")[0] || "42"} 30% 10%), hsl(${agent.accentColor?.split(" ")[0] || "42"} 60% 25%))`,
                  }}
                >
                  <span className="text-white font-display text-6xl font-bold opacity-40 select-none">
                    {agent.name.split(" ").map(w => w[0]).join("").slice(0, 2)}
                  </span>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-obsidian/40 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4">
                <div className="os-tag mb-2 inline-block">{agent.domain}</div>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
                  <span className="font-mono text-gold text-xs">LIVE SIMULATION</span>
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <Link to={`/session/${agent.id}`}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl gradient-gold text-obsidian font-semibold text-sm hover:opacity-90 transition-all duration-200">
                <MessageSquare className="w-4 h-4" />
                Begin Session
              </Link>
              <Link to={`/knowledge/${agent.id}`}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-gold/25 text-gold text-sm font-medium hover:bg-gold/10 hover:border-gold/50 transition-all duration-200">
                <Upload className="w-4 h-4" />
                Add Knowledge Source
              </Link>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="font-mono text-cream-dim text-xs mb-2">{agent.era}</div>
            <h1 className="font-display text-4xl md:text-5xl text-cream font-bold mb-3">{agent.name}</h1>
            <p className="text-cream-dim text-lg leading-relaxed mb-8">{agent.tagline}</p>

            <div className="space-y-4">
              {cognitiveOSLayers.map(({ id, label, icon: Icon, desc }) => (
                <div key={id} className="glass rounded-xl p-5 border border-gold/10">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gold/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Icon className="w-4 h-4 text-gold" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-gold/60 text-xs uppercase tracking-widest">{label}</span>
                      </div>
                      <p className="text-cream text-sm leading-relaxed">
                        {agent.cognitiveOS[id as keyof typeof agent.cognitiveOS]}
                      </p>
                      <p className="text-cream-dim/50 text-xs mt-1">{desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Full Cognitive OS */}
        <section className="mb-14">
          <div className="flex items-center gap-3 mb-6">
            <div className="os-tag">Cognitive Architecture</div>
            <div className="h-px flex-1 bg-border" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {additionalLayers.map(({ label, icon: Icon, desc }) => (
              <div key={label} className="glass rounded-xl p-5 border border-gold/10">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg bg-gold/15 flex items-center justify-center">
                    <Icon className="w-3.5 h-3.5 text-gold" />
                  </div>
                  <span className="font-mono text-gold/60 text-xs uppercase tracking-widest">{label}</span>
                </div>
                <p className="text-cream-dim text-xs leading-relaxed">{desc}</p>
                <div className="mt-3 text-xs text-cream-dim/40 font-mono">Enriched by knowledge sources →</div>
              </div>
            ))}
          </div>

          {allMentalModels.length > 0 && (
            <div className="glass rounded-xl p-6 border border-gold/10 mb-4">
              <div className="flex items-center gap-2 mb-4">
                <Lightbulb className="w-4 h-4 text-gold" />
                <h3 className="font-mono text-gold/70 text-xs uppercase tracking-widest">Extracted Mental Models</h3>
                <span className="ml-auto font-mono text-cream-dim/40 text-xs">From {knowledgeSources.length} source{knowledgeSources.length !== 1 ? "s" : ""}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {allMentalModels.slice(0, 20).map((model, i) => (
                  <span key={i} className="px-3 py-1.5 rounded-full border border-gold/20 text-cream-dim text-xs bg-gold/5">{model}</span>
                ))}
              </div>
            </div>
          )}

          {allReasoningPatterns.length > 0 && (
            <div className="glass rounded-xl p-6 border border-gold/10">
              <div className="flex items-center gap-2 mb-4">
                <Cpu className="w-4 h-4 text-gold" />
                <h3 className="font-mono text-gold/70 text-xs uppercase tracking-widest">Reasoning Patterns</h3>
              </div>
              <div className="space-y-2">
                {allReasoningPatterns.slice(0, 8).map((pattern, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="font-mono text-gold/40 text-xs mt-1">{String(i + 1).padStart(2, "0")}</span>
                    <p className="text-cream-dim text-sm">{pattern}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Conversation starters */}
        <section className="mb-14">
          <div className="flex items-center gap-3 mb-6">
            <div className="os-tag">Conversation Starters</div>
            <div className="h-px flex-1 bg-border" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {agent.conversationStarters.map((starter, i) => (
              <Link key={i} to={`/session/${agent.id}?starter=${encodeURIComponent(starter)}`}
                className="glass rounded-xl p-5 border border-transparent hover:border-gold/30 transition-all duration-200 group">
                <p className="text-cream-dim text-sm italic group-hover:text-cream transition-colors">"{starter}"</p>
                <div className="flex items-center gap-1 mt-3 text-gold/60 text-xs font-mono">
                  <MessageSquare className="w-3 h-3" />
                  Begin with this
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Knowledge Sources */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="os-tag">Knowledge Sources</div>
            <div className="h-px flex-1 bg-border" />
            <Link to={`/knowledge/${agent.id}`}
              className="flex items-center gap-1.5 text-gold text-xs font-mono hover:text-gold/80 transition-colors">
              <Plus className="w-3 h-3" />
              Add Source
            </Link>
          </div>

          {sourcesLoading ? (
            <div className="glass rounded-xl p-8 text-center">
              <p className="text-cream-dim text-sm animate-pulse">Loading sources...</p>
            </div>
          ) : knowledgeSources.length === 0 ? (
            <div className="glass rounded-xl p-10 text-center border border-gold/10">
              <BookOpen className="w-10 h-10 text-gold/30 mx-auto mb-4" />
              <h3 className="font-display text-cream text-lg mb-2">No knowledge sources yet</h3>
              <p className="text-cream-dim text-sm max-w-sm mx-auto mb-6">
                Enrich this agent's Cognitive OS by uploading books, Wikipedia articles, or written sources.
              </p>
              <Link to={`/knowledge/${agent.id}`}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gold/25 text-gold text-sm font-medium hover:bg-gold/10 transition-all duration-200">
                <Upload className="w-4 h-4" />
                Add First Source
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {knowledgeSources.map((source) => (
                <div key={source.id} className="glass rounded-xl p-5 border border-gold/10 flex items-start gap-4">
                  <div className="w-9 h-9 rounded-lg bg-gold/10 flex items-center justify-center flex-shrink-0">
                    {source.source_type === "wikipedia" ? <Globe className="w-4 h-4 text-gold" /> : <BookOpen className="w-4 h-4 text-gold" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-cream text-sm font-medium truncate">{source.title}</h4>
                      <span className="font-mono text-gold/50 text-xs uppercase flex-shrink-0">{source.source_type}</span>
                    </div>
                    {source.extracted_content && (
                      <p className="text-cream-dim text-xs leading-relaxed line-clamp-2">{source.extracted_content}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2">
                      {source.mental_models?.length > 0 && (
                        <span className="text-gold/60 text-xs font-mono">{source.mental_models.length} mental models</span>
                      )}
                      {source.reasoning_patterns?.length > 0 && (
                        <span className="text-gold/60 text-xs font-mono">{source.reasoning_patterns.length} patterns</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default AgentProfile;
