import { useState } from "react";
import { Search } from "lucide-react";
import { agents } from "@/data/agents";
import AgentCard from "@/components/AgentCard";

const domains = ["All", "Mindfulness & Peace", "First Principles & Scale", "Mental Models & Investing", "Wealth & Happiness", "Stoicism & Leadership", "Invention & Visualization"];

const Library = () => {
  const [search, setSearch] = useState("");
  const [activeDomain, setActiveDomain] = useState("All");

  const filtered = agents.filter((a) => {
    const matchSearch =
      !search ||
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.domain.toLowerCase().includes(search.toLowerCase()) ||
      a.tagline.toLowerCase().includes(search.toLowerCase());
    const matchDomain = activeDomain === "All" || a.domain === activeDomain;
    return matchSearch && matchDomain;
  });

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
          {domains.map((domain) => (
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
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </div>
        )}

        {/* Coming soon teaser */}
        <div className="mt-10 glass rounded-2xl p-8 text-center border border-gold/10">
          <div className="os-tag inline-block mb-4">Coming Soon</div>
          <h3 className="font-display text-2xl text-cream mb-2">More minds on the way</h3>
          <p className="text-cream-dim text-sm max-w-md mx-auto">
            Richard Feynman, Simone de Beauvoir, Nikola Tesla, Alan Watts, Carl Jung, and more.
            Each requires months of deep cognitive modeling.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Library;
