import { Link } from "react-router-dom";
import { Brain, Cpu, MessageSquare, Zap } from "lucide-react";

export interface Agent {
  id: string;
  name: string;
  era: string;
  domain: string;
  tagline: string;
  image: string;
  accentColor: string;
  cognitiveOS: {
    coreValues: string;
    mentalModel: string;
    emotionalStance: string;
  };
  conversationStarters: string[];
}

interface AgentCardProps {
  agent: Agent;
  featured?: boolean;
}

const AgentCard = ({ agent, featured = false }: AgentCardProps) => {
  return (
    <div
      className={`group relative rounded-2xl overflow-hidden card-shadow transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_16px_48px_hsl(240_18%_3%/0.8),0_1px_0_hsl(42_80%_52%/0.2)_inset] ${
        featured ? "col-span-2 row-span-2" : ""
      }`}
      style={{ background: "var(--gradient-card)" }}
    >
      {/* Gold border on hover */}
      <div className="absolute inset-0 rounded-2xl border border-gold/10 group-hover:border-gold/30 transition-colors duration-500 z-10 pointer-events-none" />

      {/* Agent image */}
      <div className={`relative overflow-hidden ${featured ? "h-72" : "h-52"}`}>
        <img
          src={agent.image}
          alt={agent.name}
          className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-105"
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-obsidian-light via-obsidian-light/60 to-transparent" />

        {/* Domain tag */}
        <div className="absolute top-4 left-4 os-tag">{agent.domain}</div>

        {/* Live indicator */}
        <div className="absolute top-4 right-4 flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
          <span className="font-mono text-gold text-xs">LIVE</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        <div className="mb-1">
          <span className="font-mono text-cream-dim text-xs">{agent.era}</span>
        </div>
        <h3 className="font-display text-xl text-cream font-semibold mb-1 group-hover:text-gradient-gold transition-all duration-300">
          {agent.name}
        </h3>
        <p className="text-cream-dim text-sm leading-relaxed mb-4">{agent.tagline}</p>

        {/* Cognitive OS preview */}
        <div className="space-y-2 mb-5">
          {[
            { icon: Brain, label: "Values", value: agent.cognitiveOS.coreValues },
            { icon: Cpu, label: "Mental Model", value: agent.cognitiveOS.mentalModel },
            { icon: Zap, label: "Stance", value: agent.cognitiveOS.emotionalStance },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-start gap-2">
              <Icon className="w-3.5 h-3.5 text-gold mt-0.5 flex-shrink-0" />
              <div className="flex gap-1.5 items-center min-w-0">
                <span className="font-mono text-gold/60 text-xs flex-shrink-0">{label}:</span>
                <span className="text-cream-dim text-xs truncate">{value}</span>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <Link
          to={`/session/${agent.id}`}
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-gold/25 text-gold text-sm font-medium hover:bg-gold/10 hover:border-gold/50 transition-all duration-200 group/btn"
        >
          <MessageSquare className="w-4 h-4 transition-transform group-hover/btn:scale-110" />
          Begin Session
        </Link>
      </div>
    </div>
  );
};

export default AgentCard;
