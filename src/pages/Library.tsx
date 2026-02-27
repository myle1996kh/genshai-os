import { useState, useEffect, useMemo } from "react";
import { Search, Plus, Filter, X, SlidersHorizontal } from "lucide-react";
import { Link } from "react-router-dom";
import { agents } from "@/data/agents";
import AgentCard from "@/components/AgentCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

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

// Extract era century/period for filtering
function getEraPeriod(era: string): string {
  if (!era) return "Unknown";
  const match = era.match(/(\d{1,4})/);
  if (!match) return "Unknown";
  const year = parseInt(match[1]);
  if (year < 0 || era.toLowerCase().includes("bc") || era.toLowerCase().includes("ad")) return "Ancient";
  if (year < 500) return "Ancient";
  if (year < 1500) return "Medieval";
  if (year < 1800) return "Early Modern";
  if (year < 1900) return "19th Century";
  if (year < 2000) return "20th Century";
  return "Contemporary";
}

const ERA_PERIODS = ["All Eras", "Ancient", "Medieval", "Early Modern", "19th Century", "20th Century", "Contemporary"];

const Library = () => {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [activeDomain, setActiveDomain] = useState("All");
  const [activeEra, setActiveEra] = useState("All Eras");
  const [showFilters, setShowFilters] = useState(false);
  const [customAgents, setCustomAgents] = useState<CustomAgent[]>([]);

  useEffect(() => {
    supabase
      .from("custom_agents")
      .select("*")
      .eq("is_active", true)
      .eq("is_public", true)
      .then(({ data }) => setCustomAgents((data || []) as CustomAgent[]));

    if (user) {
      supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle()
        .then(({ data }) => {
          if (data) {
            supabase.from("custom_agents").select("*").eq("is_active", true)
              .then(({ data: allData }) => setCustomAgents((allData || []) as CustomAgent[]));
          } else {
            supabase.from("custom_agents").select("*").eq("is_active", true)
              .or(`is_public.eq.true,created_by.eq.${user.id}`)
              .then(({ data: ownData }) => setCustomAgents((ownData || []) as CustomAgent[]));
          }
        });
    }
  }, [user]);

  const allAgentsRaw = useMemo(() => [
    ...agents.map(a => ({ ...a, isCustom: false })),
    ...customAgents.map(customToAgent),
  ], [customAgents]);

  const allDomains = useMemo(() =>
    ["All", ...Array.from(new Set(allAgentsRaw.map(a => a.domain)))],
    [allAgentsRaw]
  );

  // Search suggestions
  const searchSuggestions = useMemo(() => {
    if (!search || search.length < 2) return [];
    const q = search.toLowerCase();
    return allAgentsRaw
      .filter(a =>
        a.name.toLowerCase().includes(q) ||
        a.domain.toLowerCase().includes(q) ||
        a.tagline.toLowerCase().includes(q)
      )
      .slice(0, 5)
      .map(a => ({ name: a.name, domain: a.domain }));
  }, [search, allAgentsRaw]);

  const filtered = useMemo(() => allAgentsRaw.filter((a) => {
    const q = search.toLowerCase();
    const matchSearch = !search ||
      a.name.toLowerCase().includes(q) ||
      a.domain.toLowerCase().includes(q) ||
      a.tagline.toLowerCase().includes(q) ||
      a.era?.toLowerCase().includes(q);
    const matchDomain = activeDomain === "All" || a.domain === activeDomain;
    const matchEra = activeEra === "All Eras" || getEraPeriod(a.era || "") === activeEra;
    return matchSearch && matchDomain && matchEra;
  }), [search, activeDomain, activeEra, allAgentsRaw]);

  const activeFiltersCount = (activeDomain !== "All" ? 1 : 0) + (activeEra !== "All Eras" ? 1 : 0);
  const canCreateAgent = !!user;

  return (
    <div className="min-h-screen bg-background pt-24 pb-20">
      {/* Header */}
      <div className="container mx-auto px-6 mb-12">
        <div className="text-center mb-10">
          <div className="os-tag inline-block mb-5">Agent Library</div>
          <h1 className="font-display text-5xl md:text-6xl text-foreground mb-4">
            The <span className="text-gradient-gold italic">Cognitive</span> Archive
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            History's greatest minds, reverse-engineered into living cognitive simulations.
          </p>
          {canCreateAgent && (
            <div className="mt-6">
              <Link to="/create-agent"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl gradient-gold text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity">
                <Plus className="w-4 h-4" />
                Create New Agent
              </Link>
            </div>
          )}
          {!canCreateAgent && !user && (
            <div className="mt-6">
              <Link to="/signup"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-primary/25 text-primary text-sm font-medium hover:bg-primary/10 transition-colors">
                Sign up to create agents
              </Link>
            </div>
          )}
        </div>

        {/* Search bar with autocomplete */}
        <div className="max-w-xl mx-auto relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name, domain, era, or keywords..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full glass rounded-xl pl-11 pr-10 py-3 text-foreground placeholder:text-muted-foreground/50 text-sm outline-none focus:border-primary/40 transition-colors duration-200 border border-border"
          />
          {search && (
            <button onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80">
              <X className="w-3 h-3 text-muted-foreground" />
            </button>
          )}
          {/* Autocomplete dropdown */}
          {searchSuggestions.length > 0 && search.length >= 2 && (
            <div className="absolute top-full left-0 right-0 mt-1 rounded-xl border border-border bg-background shadow-xl z-50 overflow-hidden">
              {searchSuggestions.map((s, i) => (
                <button key={i} onClick={() => setSearch(s.name)}
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted/30 transition-colors flex items-center justify-between border-b border-border/30 last:border-0">
                  <span className="text-foreground font-medium">{s.name}</span>
                  <span className="text-xs text-muted-foreground">{s.domain}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Filter toggle */}
        <div className="flex justify-center mb-4">
          <button onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
              showFilters || activeFiltersCount > 0
                ? "bg-primary/10 text-primary border-primary/25"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}>
            <SlidersHorizontal className="w-4 h-4" />
            Filters
            {activeFiltersCount > 0 && (
              <span className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>

        {/* Filters panel */}
        {showFilters && (
          <div className="max-w-3xl mx-auto space-y-4 mb-8 glass rounded-2xl p-5 border border-border/50">
            {/* Domain filters */}
            <div>
              <label className="text-xs text-muted-foreground font-medium mb-2 block uppercase tracking-wider">Domain</label>
              <div className="flex flex-wrap gap-2">
                {allDomains.map((domain) => (
                  <button key={domain} onClick={() => setActiveDomain(domain)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                      activeDomain === domain
                        ? "bg-primary text-primary-foreground"
                        : "border border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    }`}>
                    {domain}
                  </button>
                ))}
              </div>
            </div>

            {/* Era filters */}
            <div>
              <label className="text-xs text-muted-foreground font-medium mb-2 block uppercase tracking-wider">Era</label>
              <div className="flex flex-wrap gap-2">
                {ERA_PERIODS.map((era) => (
                  <button key={era} onClick={() => setActiveEra(era)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                      activeEra === era
                        ? "bg-primary text-primary-foreground"
                        : "border border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    }`}>
                    {era}
                  </button>
                ))}
              </div>
            </div>

            {/* Clear filters */}
            {activeFiltersCount > 0 && (
              <button onClick={() => { setActiveDomain("All"); setActiveEra("All Eras"); }}
                className="text-xs text-primary hover:underline">
                Clear all filters
              </button>
            )}
          </div>
        )}

        {/* Results count */}
        <div className="text-center text-sm text-muted-foreground mb-6">
          {filtered.length} agent{filtered.length !== 1 ? "s" : ""} found
          {(activeDomain !== "All" || activeEra !== "All Eras" || search) && " matching your criteria"}
        </div>
      </div>

      {/* Agent grid */}
      <div className="container mx-auto px-6">
        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground text-lg mb-3">No agents found</p>
            <button onClick={() => { setSearch(""); setActiveDomain("All"); setActiveEra("All Eras"); }}
              className="text-sm text-primary hover:underline">
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((agent) => (
              <AgentCard key={`${agent.isCustom ? "c-" : ""}${agent.id}`} agent={agent as any} />
            ))}
          </div>
        )}

        {/* Create agent CTA */}
        {canCreateAgent ? (
          <div className="mt-10 glass rounded-2xl p-8 text-center border border-border/30">
            <div className="os-tag inline-block mb-4">Create Agent</div>
            <h3 className="font-display text-2xl text-foreground mb-2">Build your own cognitive agent</h3>
            <p className="text-muted-foreground text-sm max-w-md mx-auto mb-5">
              Use the 7-layer blueprint builder or auto-generate from any person or book with AI.
            </p>
            <Link to="/create-agent"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl gradient-gold text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity">
              <Plus className="w-4 h-4" />
              Create New Agent
            </Link>
          </div>
        ) : (
          <div className="mt-10 glass rounded-2xl p-8 text-center border border-border/30">
            <div className="os-tag inline-block mb-4">Coming Soon</div>
            <h3 className="font-display text-2xl text-foreground mb-2">More minds on the way</h3>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              Richard Feynman, Simone de Beauvoir, Alan Watts, Carl Jung, and more.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Library;
