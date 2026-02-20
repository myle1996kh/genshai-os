import { Link } from "react-router-dom";
import { ArrowRight, Brain, Cpu, Library, MessageSquare, Sparkles, Zap } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";
import { agents } from "@/data/agents";
import AgentCard from "@/components/AgentCard";

const osLayers = [
  { label: "Core Values", desc: "Fundamental beliefs encoded from their life's work" },
  { label: "Mental Models", desc: "How they process information and reach decisions" },
  { label: "Reasoning Patterns", desc: "Step-by-step thinking process under pressure" },
  { label: "Emotional Stance", desc: "How they relate to failure, joy, and suffering" },
  { label: "Language DNA", desc: "Their rhythm, metaphors, and communication style" },
  { label: "Decision History", desc: "Real choices they made — and why they made them" },
];

const Index = () => {
  const featuredAgents = agents.slice(0, 3);

  return (
    <div className="min-h-screen bg-background">
      {/* ── HERO ── */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background image */}
        <div className="absolute inset-0">
          <img
            src={heroBg}
            alt="GenShai neural background"
            className="w-full h-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/30 to-background" />
        </div>

        {/* Radial gold glow center */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 60% 50% at 50% 40%, hsl(42 80% 52% / 0.08) 0%, transparent 70%)" }}
        />

        <div className="relative z-10 container mx-auto px-6 text-center pt-24">
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2 os-tag mb-8 fade-up">
            <Sparkles className="w-3 h-3" />
            Cognitive Simulation Engine
          </div>

          {/* Headline */}
          <h1 className="font-display text-5xl md:text-7xl lg:text-8xl text-cream leading-[1.05] tracking-tight mb-6 fade-up fade-up-delay-1">
            Don't chat with <br />
            <span className="text-gradient-gold italic">great minds.</span>
            <br />
            <span className="text-cream/70">Think with them.</span>
          </h1>

          {/* Sub */}
          <p className="text-cream-dim text-lg md:text-xl max-w-2xl mx-auto leading-relaxed mb-10 fade-up fade-up-delay-2">
            GenShai reverse-engineers the cognitive operating system of history's greatest thinkers —
            their values, mental models, reasoning patterns — and lets you run it on your problems.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20 fade-up fade-up-delay-3">
            <Link
              to="/library"
              className="flex items-center gap-2 px-7 py-3.5 rounded-xl gradient-gold text-obsidian font-semibold text-base hover:opacity-90 transition-all duration-200 glow-sm"
            >
              Explore the Library
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/library"
              className="flex items-center gap-2 px-7 py-3.5 rounded-xl border border-gold/25 text-cream text-base font-medium hover:border-gold/50 hover:bg-gold/5 transition-all duration-200"
            >
              <Brain className="w-4 h-4 text-gold" />
              What is a Cognitive OS?
            </Link>
          </div>

          {/* Stats row */}
          <div className="flex items-center justify-center gap-12 fade-up fade-up-delay-4">
            {[
              { value: "6", label: "Cognitive Agents" },
              { value: "∞", label: "Mental Models" },
              { value: "100%", label: "Authentic Reasoning" },
            ].map(({ value, label }) => (
              <div key={label} className="text-center">
                <div className="font-display text-3xl text-gold font-semibold">{value}</div>
                <div className="text-cream-dim text-xs mt-1 font-mono uppercase tracking-widest">{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce">
          <div className="w-px h-10 bg-gradient-to-b from-gold/0 via-gold/50 to-gold/0" />
        </div>
      </section>

      {/* ── WHAT IS A COGNITIVE OS ── */}
      <section className="py-28 container mx-auto px-6">
        <div className="text-center mb-16">
          <div className="os-tag inline-block mb-6">Architecture</div>
          <h2 className="font-display text-4xl md:text-5xl text-cream mb-4">
            What is a <span className="text-gradient-gold italic">Cognitive OS?</span>
          </h2>
          <p className="text-cream-dim text-lg max-w-xl mx-auto">
            Every great mind left an encoded operating system in their work. We reverse-engineer it layer by layer.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {osLayers.map(({ label, desc }, i) => (
            <div
              key={label}
              className="glass rounded-2xl p-6 hover:border-gold/30 transition-all duration-300 group"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-7 h-7 rounded-lg bg-gold/15 flex items-center justify-center">
                  <span className="font-mono text-gold text-xs font-medium">{String(i + 1).padStart(2, "0")}</span>
                </div>
                <h3 className="font-display text-cream font-medium">{label}</h3>
              </div>
              <p className="text-cream-dim text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURED AGENTS ── */}
      <section className="py-20 container mx-auto px-6">
        <div className="flex items-end justify-between mb-12">
          <div>
            <div className="os-tag inline-block mb-4">Agent Library</div>
            <h2 className="font-display text-4xl md:text-5xl text-cream">
              Meet the <span className="text-gradient-gold italic">Minds</span>
            </h2>
          </div>
          <Link
            to="/library"
            className="hidden md:flex items-center gap-2 text-gold text-sm font-medium hover:text-gold/80 transition-colors"
          >
            View all agents <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {featuredAgents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>

        <div className="flex md:hidden justify-center mt-8">
          <Link
            to="/library"
            className="flex items-center gap-2 text-gold text-sm font-medium"
          >
            View all agents <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="py-28 relative overflow-hidden">
        {/* Background glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 80% 60% at 50% 50%, hsl(42 80% 52% / 0.04) 0%, transparent 70%)" }}
        />

        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <div className="os-tag inline-block mb-6">How It Works</div>
            <h2 className="font-display text-4xl md:text-5xl text-cream mb-4">
              Not a chatbot. A <span className="text-gradient-gold italic">simulation.</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                icon: Library,
                step: "01",
                title: "Select a Mind",
                desc: "Browse cognitive agents built from books, interviews, decisions, and life patterns of history's greatest thinkers.",
              },
              {
                icon: Cpu,
                step: "02",
                title: "Bring Your Problem",
                desc: "Come with a real challenge — career, relationships, decisions, creativity. The agent applies their actual reasoning process.",
              },
              {
                icon: MessageSquare,
                step: "03",
                title: "Think Together",
                desc: "The agent remembers your history, challenges your assumptions, and follows up. Every session deepens the simulation.",
              },
            ].map(({ icon: Icon, step, title, desc }) => (
              <div key={step} className="relative text-center">
                {/* Step number background */}
                <div className="font-display text-8xl font-bold text-gold/5 absolute -top-4 left-1/2 -translate-x-1/2 select-none pointer-events-none">
                  {step}
                </div>
                <div className="relative">
                  <div className="w-16 h-16 rounded-2xl glass flex items-center justify-center mx-auto mb-6 border border-gold/20">
                    <Icon className="w-7 h-7 text-gold" />
                  </div>
                  <h3 className="font-display text-xl text-cream font-semibold mb-3">{title}</h3>
                  <p className="text-cream-dim text-sm leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FOOTER ── */}
      <section className="py-24 container mx-auto px-6">
        <div className="glass-strong rounded-3xl p-12 text-center relative overflow-hidden">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: "radial-gradient(ellipse 70% 80% at 50% 100%, hsl(42 80% 52% / 0.08) 0%, transparent 60%)" }}
          />
          <div className="relative">
            <Zap className="w-10 h-10 text-gold mx-auto mb-6" />
            <h2 className="font-display text-4xl md:text-5xl text-cream mb-4">
              Ready to think at a higher level?
            </h2>
            <p className="text-cream-dim text-lg max-w-lg mx-auto mb-8">
              Every great mind that ever lived left a cognitive blueprint. It's time to run it.
            </p>
            <Link
              to="/library"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl gradient-gold text-obsidian font-semibold text-base hover:opacity-90 transition-all duration-200 glow-sm"
            >
              Enter the Library <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
