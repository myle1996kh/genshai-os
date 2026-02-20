import { useState, useEffect } from "react";
import { Search, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { agents } from "@/data/agents";
import AgentCard from "@/components/AgentCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const STATIC_DOMAINS = ["All", "Mindfulness & Peace", "First Principles & Scale", "Mental Models & Investing", "Wealth & Happiness", "Stoicism & Leadership", "Invention & Visualization"];

interface CustomAgent {
  id: string;
  slug: string;
  name: string;
  era: string | null;
  domain: string;
  tagline: string | null;
  image_url: string | null;
  accent_color: string | null;
  conversation_starters: string[];
  layer_core_values: string | null;
  layer_mental_models: string | null;
  layer_emotional_stance: string | null;
  created_by: string;
  is_public: boolean;
}

function customToAgent(c: CustomAgent) {
  return {
    id: c.slug,
    name: c.name,
    era: c.era || "",
    domain: c.domain,
    tagline: c.tagline || `${c.name} — Custom Cognitive Agent`,
    image: c.image_url || "/placeholder.svg",
    accentColor: c.accent_color || "42 80% 52%",
    cognitiveOS: {
      coreValues: c.layer_core_values || "—",
      mentalModel: c.layer_mental_models || "—",
      emotionalStance: c.layer_emotional_stance || "—",
    },
    conversationStarters: c.conversation_starters || [],
    isCustom: true,
    customId: c.id,
    createdBy: c.created_by,
  };
}

const Library = () => {
  const { user, isPro } = useAuth();
  const [search, setSearch] = useState("");
  const [activeDomain, setActiveDomain] = useState("All");
  const [customAgents, setCustomAgents] = useState<CustomAgent[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Load public custom agents
    supabase
      .from("custom_agents")
      .select("*")
      .eq("is_active", true)
      .eq("is_public", true)
      .then(({ data }) => setCustomAgents((data || []) as CustomAgent[]));

    // Load user's own agents if logged in
    if (user) {
      supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle()
        .then(({ data }) => {
          if (data) {
            setIsAdmin(true);
            // Admin sees all custom agents
            supabase.from("custom_agents").select("*").eq("is_active", true)
              .then(({ data: allData }) => setCustomAgents((allData || []) as CustomAgent[]));
          } else {
            // Regular users see their own + public
            supabase.from("custom_agents").select("*").eq("is_active", true)
              .or(`is_public.eq.true,created_by.eq.${user.id}`)
              .then(({ data: ownData }) => setCustomAgents((ownData || []) as CustomAgent[]));
          }
        });
    }
  }, [user]);

  const allAgentsRaw = [
    ...agents.map(a => ({ ...a, isCustom: false })),
    ...customAgents.map(customToAgent),
  ];

  const allDomains = ["All", ...Array.from(new Set(allAgentsRaw.map(a => a.domain)))];

  const filtered = allAgentsRaw.filter((a) => {
    const matchSearch =
      !search ||
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.domain.toLowerCase().includes(search.toLowerCase()) ||
      a.tagline.toLowerCase().includes(search.toLowerCase());
    const matchDomain = activeDomain === "All" || a.domain === activeDomain;
    return matchSearch && matchDomain;
  });

  const canCreateAgent = !!user; // All logged-in users can create agents

  return (
    <div className="min-h-screen bg-background pt-24 pb-20">
      {/* Header */}
      <div className="container mx-auto px-6 mb-12">
        <div className="text-center mb-10">
          <div className="os-tag inline-block mb-5">Agent Library</div>
          <h1 className="font-display text-5xl md:text-6xl text-cream mb-4">
            The <span className="text-gradient-gold italic">Cognitive</span> Archive
          </h1>
          <p className="text-cream-dim text-lg max-w-2xl mx-auto">
            History's greatest minds, reverse-engineered into living cognitive simulations.
            Each agent carries the full mental architecture of its subject.
          </p>
          {canCreateAgent && (
            <div className="mt-6">
              <Link
                to="/create-agent"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl gradient-gold text-obsidian font-semibold text-sm hover:opacity-90 transition-opacity"
              >
                <Plus className="w-4 h-4" />
                Create New Agent
              </Link>
            </div>
          )}
          {!canCreateAgent && !user && (
            <div className="mt-6">
              <Link
                to="/signup"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gold/25 text-gold text-sm font-medium hover:bg-gold/10 transition-colors"
              >
                Đăng ký để tạo agent
              </Link>
            </div>
          )}
        </div>

        {/* Search bar */}
        <div className="max-w-xl mx-auto relative mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-cream-dim" />
          <input
            type="text"
            placeholder="Search thinkers, domains, or approaches..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full glass rounded-xl pl-11 pr-4 py-3 text-cream placeholder:text-cream-dim/50 text-sm outline-none focus:border-gold/40 transition-colors duration-200 border border-gold/15"
          />
        </div>

        {/* Domain filters */}
        <div className="flex flex-wrap gap-2 justify-center">
          {allDomains.map((domain) => (
            <button
              key={domain}
              onClick={() => setActiveDomain(domain)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                activeDomain === domain
                  ? "bg-gold text-obsidian"
                  : "border border-gold/20 text-cream-dim hover:border-gold/40 hover:text-cream"
              }`}
            >
              {domain}
            </button>
          ))}
        </div>
      </div>

      {/* Agent grid */}
      <div className="container mx-auto px-6">
        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-cream-dim text-lg">No agents found. Try a different search.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((agent) => (
              <AgentCard key={`${agent.isCustom ? "c-" : ""}${agent.id}`} agent={agent as any} />
            ))}
          </div>
        )}

        {/* Create agent CTA or coming soon */}
        {canCreateAgent ? (
          <div className="mt-10 glass rounded-2xl p-8 text-center border border-gold/10">
            <div className="os-tag inline-block mb-4">Create Agent</div>
            <h3 className="font-display text-2xl text-cream mb-2">Build your own cognitive agent</h3>
            <p className="text-cream-dim text-sm max-w-md mx-auto mb-5">
              Use the 7-layer blueprint builder or auto-generate from any person or book with AI.
            </p>
            <Link
              to="/create-agent"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl gradient-gold text-obsidian font-semibold text-sm hover:opacity-90 transition-opacity"
            >
              <Plus className="w-4 h-4" />
              Create New Agent
            </Link>
          </div>
        ) : (
          <div className="mt-10 glass rounded-2xl p-8 text-center border border-gold/10">
            <div className="os-tag inline-block mb-4">Coming Soon</div>
            <h3 className="font-display text-2xl text-cream mb-2">More minds on the way</h3>
            <p className="text-cream-dim text-sm max-w-md mx-auto">
              Richard Feynman, Simone de Beauvoir, Alan Watts, Carl Jung, and more.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Library;
