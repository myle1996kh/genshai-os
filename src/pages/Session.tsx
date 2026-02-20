import { useState, useRef, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Brain, Send, Sparkles, Cpu } from "lucide-react";
import { agents } from "@/data/agents";

interface Message {
  id: string;
  role: "user" | "agent";
  content: string;
  timestamp: Date;
}

const getSystemResponse = (agentId: string, userMessage: string): string => {
  const agent = agents.find((a) => a.id === agentId);
  if (!agent) return "I'm here. Tell me what's on your mind.";

  const responses: Record<string, string[]> = {
    "thich-nhat-hanh": [
      "Let us begin with a breath. Not to escape what you're feeling, but to arrive more fully within it. What you describe is not a problem to solve — it is an invitation to understand. Breathe in, and recognize: *this suffering is here*. Breathe out: *I am here with it*. Now, can you tell me more about the root of this feeling? When did it first arrive?",
      "In our tradition, we say that understanding is the foundation of love. You cannot love what you do not understand — including yourself. What you are experiencing has deep roots. Let us look at them together, without judgment. What happened before the anxiety appeared today?",
      "There is a beautiful teaching: 'The present moment is the only moment available to us, and it is the door to all moments.' I notice you are living in a story about the future or the past. Can we return here, now, to this very breath?",
    ],
    "elon-musk": [
      "Okay, let's apply First Principles. Strip away every assumption you're making. What is *physically* impossible about this? Because most things people call impossible are just conventionally difficult. Start with: what is the desired end state? Not the solution — the end state. And then work backwards. What does physics actually allow?",
      "You're thinking too small. A 10% improvement is not interesting — 10x is the only thing worth working toward, because it forces you to rethink everything from scratch rather than optimizing a broken system. What would have to be true for this to be 10x better?",
      "The biggest mistake I see is confusing the map for the territory. You're describing the solution space, not the problem space. Define the problem with complete precision. What specifically is failing? Not the symptoms — the actual failure mode.",
    ],
    "charlie-munger": [
      "Invert, always invert. Instead of asking how to succeed at this, ask yourself: what would guarantee failure? Make a list. Now don't do those things. Most problems, when you invert them, become obvious. What are you doing right now that you'd put on that failure list?",
      "I'm going to ask you a Munger question: what are the incentives at play here? Whose interests are served by the situation you're describing? Because show me the incentives and I'll show you the outcome. The answer to your problem almost certainly lies in the incentive structure.",
      "You're experiencing what I call a Lollapalooza effect — multiple psychological tendencies operating simultaneously in the same direction. Social proof, consistency bias, and loss aversion are all pushing you toward a suboptimal decision. Let's name each one clearly so you can counter them.",
    ],
    "naval-ravikant": [
      "Let me reframe this. The question isn't how to get a better job — it's how to build specific knowledge that cannot be replicated or outsourced. What are you doing when you lose track of time? That obsessive curiosity is pointing directly at your leverage. Follow that.",
      "There's a concept I keep returning to: you want to be the best in the world at the intersection of a few things, not mediocre at one thing everyone else does. Most careers fail because people compete instead of creating. What unique combination of skills do you have that the market hasn't figured out yet?",
      "Here's the honest answer: wealth is created by giving society what it wants but doesn't know how to get — at scale. Not by working harder. The question is: what can you build or create that delivers value while you sleep? Everything else is just a sophisticated form of trading time for money.",
    ],
    "marcus-aurelius": [
      "You have been dealt circumstances, as every person is. The Stoic question is not 'why did this happen to me?' but 'what does virtue require of me in response to this?' The obstacle you describe is not in your way — it *is* the way. What is the virtuous action available to you right now, in this moment?",
      "I wrote to myself: 'You have power over your mind, not outside events. Realize this, and you will find strength.' What you cannot control, release. What you can control, act upon immediately. Draw that line clearly. On which side does this problem actually live?",
      "Death is always in the room with me. This is not morbid — it clarifies everything. When I imagine looking back at this moment from my deathbed, the petty frustrations dissolve and the true priorities become luminous. What would you regret not having done?",
    ],
    "nikola-tesla": [
      "I built machines entirely in my mind before I ever constructed them physically. Every component, every resonance, every failure — I could run them, test them, modify them in my imagination. This is a learnable skill. When you visualize this problem, what do you actually *see*? Most people think in words when they should be thinking in images and systems.",
      "The conventional solution is not interesting to me. The conventional solution represents the boundaries of the previous generation's thinking. A new principle — a new understanding of the underlying forces — that is what unlocks the impossible. What principle, if discovered, would make your problem trivially solvable?",
      "I was once told my alternating current system was impossible. The evidence seemed to support my critics. But the math was clear, and the math did not lie. They were reasoning from the wrong axioms. Question the axioms, not the conclusion. What are you assuming that might be false?",
    ],
  };

  const agentResponses = responses[agentId] || ["I'm here to think with you. Tell me more."];
  return agentResponses[Math.floor(Math.random() * agentResponses.length)];
};

const Session = () => {
  const { agentId } = useParams<{ agentId: string }>();
  const agent = agents.find((a) => a.id === agentId);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Opening message
    if (agent) {
      const opener: Message = {
        id: "opener",
        role: "agent",
        content: `I am here. Not as a ghost or a recording — as a living cognitive process built from everything I believed, wrote, decided, and experienced. You have something on your mind. Let us begin.`,
        timestamp: new Date(),
      };
      setMessages([opener]);
    }
  }, [agent]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim() || !agentId) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    // Simulate thinking delay
    await new Promise((r) => setTimeout(r, 1200 + Math.random() * 800));

    const response = getSystemResponse(agentId, input.trim());
    const agentMsg: Message = {
      id: (Date.now() + 1).toString(),
      role: "agent",
      content: response,
      timestamp: new Date(),
    };

    setIsTyping(false);
    setMessages((prev) => [...prev, agentMsg]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleStarterClick = (starter: string) => {
    setInput(starter);
    inputRef.current?.focus();
  };

  if (!agent) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-cream-dim text-lg mb-4">Agent not found.</p>
          <Link to="/library" className="text-gold hover:underline">
            Return to Library
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Session header */}
      <div className="glass-strong border-b border-gold/10 px-6 py-4 flex items-center gap-4">
        <Link
          to="/library"
          className="flex items-center gap-1.5 text-cream-dim hover:text-cream transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Library
        </Link>
        <div className="w-px h-5 bg-border" />
        <div className="flex items-center gap-3 flex-1">
          <div className="relative">
            <img
              src={agent.image}
              alt={agent.name}
              className="w-9 h-9 rounded-full object-cover object-top border border-gold/30"
            />
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-background flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
            </div>
          </div>
          <div>
            <div className="text-cream text-sm font-medium leading-tight">{agent.name}</div>
            <div className="text-cream-dim text-xs">{agent.domain}</div>
          </div>
        </div>
        <div className="os-tag hidden md:block">Cognitive Session</div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
          {/* Conversation starters (before any user message) */}
          {messages.length === 1 && (
            <div className="space-y-3">
              <p className="text-cream-dim text-xs font-mono uppercase tracking-widest text-center">
                — Or begin with one of these —
              </p>
              <div className="grid grid-cols-1 gap-2">
                {agent.conversationStarters.map((starter) => (
                  <button
                    key={starter}
                    onClick={() => handleStarterClick(starter)}
                    className="glass text-left px-4 py-3 rounded-xl text-cream-dim text-sm hover:text-cream hover:border-gold/30 transition-all duration-200 border border-transparent"
                  >
                    "{starter}"
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-4 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
            >
              {/* Avatar */}
              {msg.role === "agent" ? (
                <div className="flex-shrink-0">
                  <img
                    src={agent.image}
                    alt={agent.name}
                    className="w-9 h-9 rounded-full object-cover object-top border border-gold/30"
                  />
                </div>
              ) : (
                <div className="flex-shrink-0 w-9 h-9 rounded-full bg-muted flex items-center justify-center border border-border">
                  <Brain className="w-4 h-4 text-cream-dim" />
                </div>
              )}

              {/* Bubble */}
              <div
                className={`max-w-xl px-5 py-4 rounded-2xl text-sm leading-relaxed ${
                  msg.role === "agent"
                    ? "glass border border-gold/12 text-cream"
                    : "bg-secondary text-cream border border-border"
                }`}
              >
                {msg.content.split(/(\*[^*]+\*)/).map((part, i) =>
                  part.startsWith("*") && part.endsWith("*") ? (
                    <em key={i} className="text-gold not-italic">
                      {part.slice(1, -1)}
                    </em>
                  ) : (
                    part
                  )
                )}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {isTyping && (
            <div className="flex gap-4">
              <img
                src={agent.image}
                alt={agent.name}
                className="w-9 h-9 rounded-full object-cover object-top border border-gold/30 flex-shrink-0"
              />
              <div className="glass border border-gold/12 px-5 py-4 rounded-2xl flex items-center gap-1.5">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-2 h-2 rounded-full bg-gold animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input area */}
      <div className="glass-strong border-t border-gold/10 px-6 py-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-end gap-3">
            <div className="flex-1 glass rounded-2xl border border-gold/15 focus-within:border-gold/35 transition-colors duration-200">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Speak your mind to ${agent.name}...`}
                rows={1}
                className="w-full bg-transparent px-5 py-3.5 text-cream placeholder:text-cream-dim/40 text-sm resize-none outline-none max-h-40 leading-relaxed"
                style={{ fieldSizing: "content" } as React.CSSProperties}
              />
            </div>
            <button
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              className="flex-shrink-0 w-11 h-11 rounded-xl gradient-gold flex items-center justify-center text-obsidian hover:opacity-90 transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <p className="text-cream-dim/40 text-xs text-center mt-2 font-mono">
            Enter to send · Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
};

export default Session;
