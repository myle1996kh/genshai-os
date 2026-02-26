import { useState, useRef, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Users, Send, Play, Pause, SkipForward, MessageSquare, Loader2 } from "lucide-react";
import { agents } from "@/data/agents";
import { AgentMarkdown } from "@/components/chat/AgentMarkdown";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const getSessionId = () => {
  let session = localStorage.getItem("genshai-session");
  if (!session) {
    session = `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem("genshai-session", session);
  }
  return session;
};

interface DebateMessage {
  id: string;
  agentId: string | null;
  agentName: string | null;
  role: "user" | "assistant" | "system";
  content: string;
  turnNumber: number;
}

export default function GroupDebate() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<"setup" | "debate">("setup");
  const [topic, setTopic] = useState("");
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<DebateMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [userInput, setUserInput] = useState("");
  const [customAgents, setCustomAgents] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pauseRef = useRef(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Fetch custom agents
  useEffect(() => {
    const fetchCustom = async () => {
      const { data } = await supabase
        .from("custom_agents")
        .select("id, name, slug, image_url, accent_color")
        .eq("is_active", true);
      setCustomAgents(data || []);
    };
    fetchCustom();
  }, []);

  const allAgents = [
    ...agents.map(a => ({ id: a.id, name: a.name, image: a.image, accentColor: a.accentColor })),
    ...customAgents.map(a => ({
      id: a.slug || a.id,
      name: a.name,
      image: a.image_url,
      accentColor: a.accent_color || "42 80% 52%",
    })),
  ];

  const toggleAgent = (id: string) => {
    setSelectedAgents(prev =>
      prev.includes(id)
        ? prev.filter(a => a !== id)
        : prev.length < 4
          ? [...prev, id]
          : prev
    );
  };

  const startDebate = async () => {
    if (!topic.trim() || selectedAgents.length < 2) {
      toast.error("Enter a topic and select at least 2 agents");
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${SUPABASE_URL}/functions/v1/group-debate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token || SUPABASE_KEY}`,
        },
        body: JSON.stringify({
          action: "create",
          topic: topic.trim(),
          agentIds: selectedAgents,
          userId: user?.id || null,
          userSession: getSessionId(),
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setSessionId(data.sessionId);
      setMessages([{
        id: "system-0",
        agentId: null,
        agentName: null,
        role: "system",
        content: `**Debate Topic:** ${topic.trim()}`,
        turnNumber: 0,
      }]);
      setStep("debate");

      // Auto-start first turn
      setTimeout(() => runNextTurn(data.sessionId), 500);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const runNextTurn = async (sid?: string, userMsg?: string) => {
    const id = sid || sessionId;
    if (!id || isStreaming) return;

    setIsStreaming(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${SUPABASE_URL}/functions/v1/group-debate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token || SUPABASE_KEY}`,
        },
        body: JSON.stringify({
          action: "next_turn",
          sessionId: id,
          userMessage: userMsg || null,
        }),
      });

      const contentType = res.headers.get("content-type") || "";

      if (contentType.includes("application/json")) {
        const data = await res.json();
        if (data.done) {
          setIsComplete(true);
          setIsStreaming(false);
          toast.info("Debate complete!");
          return;
        }
        if (data.error) throw new Error(data.error);
      }

      // Streaming response
      const agentId = res.headers.get("x-agent-id") || "";
      const agentName = res.headers.get("x-agent-name") || "Agent";
      const turnNumber = parseInt(res.headers.get("x-turn-number") || "0");

      const msgId = `msg-${Date.now()}`;
      setMessages(prev => [...prev, {
        id: msgId,
        agentId,
        agentName,
        role: "assistant",
        content: "",
        turnNumber,
      }]);

      // Parse SSE stream
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIdx;
        while ((newlineIdx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIdx);
          buffer = buffer.slice(newlineIdx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullContent += content;
              setMessages(prev =>
                prev.map(m => m.id === msgId ? { ...m, content: fullContent } : m)
              );
            }
          } catch {}
        }
      }

      setIsStreaming(false);

      // Auto-advance if not paused — with 3s delay to avoid rate limits
      if (!pauseRef.current && !isComplete) {
        setTimeout(() => runNextTurn(id), 3000);
      }
    } catch (e: any) {
      setIsStreaming(false);
      // On rate limit, pause and notify
      if (e.message?.includes("Rate limit") || e.message?.includes("429")) {
        pauseRef.current = true;
        setIsPaused(true);
        toast.error("Rate limited — debate paused. Click Resume to continue.");
      } else {
        toast.error(e.message);
      }
    }
  };

  const handleUserInterject = () => {
    if (!userInput.trim() || isStreaming) return;
    const msg = userInput.trim();
    setUserInput("");
    setMessages(prev => [...prev, {
      id: `user-${Date.now()}`,
      agentId: null,
      agentName: "You",
      role: "user",
      content: msg,
      turnNumber: 0,
    }]);
    pauseRef.current = false;
    setIsPaused(false);
    runNextTurn(undefined, msg);
  };

  const handlePause = () => {
    pauseRef.current = !pauseRef.current;
    setIsPaused(!isPaused);
    if (!pauseRef.current && !isStreaming) {
      runNextTurn();
    }
  };

  const getAgentInfo = (agentId: string) =>
    allAgents.find(a => a.id === agentId);

  // ─── SETUP SCREEN ──────────────────────────────────────────────────────
  if (step === "setup") {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 pt-24">
          <div className="flex items-center gap-3 mb-8">
            <Link to="/library" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold text-foreground">Group Debate</h1>
              <p className="text-sm text-muted-foreground">Put great thinkers in conversation together</p>
            </div>
          </div>

          {/* Topic */}
          <div className="mb-6">
            <label className="text-sm font-medium text-foreground mb-2 block">Debate Topic</label>
            <textarea
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder="e.g. Is the pursuit of wealth compatible with inner peace?"
              className="w-full glass rounded-xl px-4 py-3 text-sm text-foreground border border-border focus:border-primary/50 outline-none resize-none h-24"
            />
          </div>

          {/* Agent Selection */}
          <div className="mb-6">
            <label className="text-sm font-medium text-foreground mb-2 block">
              Select Agents (2-4)
              <span className="text-muted-foreground ml-2">{selectedAgents.length}/4 selected</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {allAgents.map(agent => {
                const selected = selectedAgents.includes(agent.id);
                return (
                  <button
                    key={agent.id}
                    onClick={() => toggleAgent(agent.id)}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                      selected
                        ? "border-primary bg-primary/10 shadow-sm"
                        : "border-border glass hover:border-primary/30"
                    }`}
                  >
                    {agent.image ? (
                      <img src={agent.image} alt={agent.name}
                        className="w-10 h-10 rounded-full object-cover object-top border border-border" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                        {agent.name[0]}
                      </div>
                    )}
                    <span className="text-sm font-medium text-foreground text-left">{agent.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <button
            onClick={startDebate}
            disabled={!topic.trim() || selectedAgents.length < 2}
            className="w-full py-3 rounded-xl gradient-gold text-obsidian font-semibold text-sm disabled:opacity-40 flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4" /> Start Debate
          </button>
        </div>
      </div>
    );
  }

  // ─── DEBATE SCREEN ──────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="glass-strong border-b border-border px-6 py-3 flex items-center gap-4 relative z-[9990]">
        <Link to="/library" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Users className="w-4 h-4 text-primary" />
          <span className="font-semibold text-foreground text-sm truncate">Group Debate</span>
          <span className="text-xs text-muted-foreground truncate hidden sm:block">— {topic}</span>
        </div>
        <div className="flex items-center gap-2">
          {!isComplete && (
            <>
              <button
                onClick={handlePause}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  isPaused
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                {isPaused ? "Resume" : "Pause"}
              </button>
              {isPaused && !isStreaming && (
                <button
                  onClick={() => runNextTurn()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary/10 text-primary"
                >
                  <SkipForward className="w-3 h-3" /> Next Turn
                </button>
              )}
            </>
          )}
          {isComplete && (
            <span className="text-xs text-primary bg-primary/10 px-3 py-1.5 rounded-lg font-medium">
              Debate Complete
            </span>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-6 space-y-4">
          {messages.map(msg => {
            if (msg.role === "system") {
              return (
                <div key={msg.id} className="text-center py-4">
                  <div className="inline-block glass-strong rounded-xl px-5 py-3 border border-border">
                    <AgentMarkdown content={msg.content} />
                  </div>
                </div>
              );
            }

            if (msg.role === "user") {
              return (
                <div key={msg.id} className="flex justify-end">
                  <div className="max-w-[80%] bg-primary/10 rounded-2xl rounded-br-md px-4 py-3">
                    <div className="text-xs text-primary font-medium mb-1">You (Moderator)</div>
                    <p className="text-sm text-foreground">{msg.content}</p>
                  </div>
                </div>
              );
            }

            const agentInfo = getAgentInfo(msg.agentId || "");
            return (
              <div key={msg.id} className="flex gap-3">
                <div className="flex-shrink-0 mt-1">
                  {agentInfo?.image ? (
                    <img src={agentInfo.image} alt={msg.agentName || ""}
                      className="w-9 h-9 rounded-full object-cover object-top border border-border" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                      {(msg.agentName || "A")[0]}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-foreground">{msg.agentName}</span>
                    <span className="text-xs text-muted-foreground">Turn {msg.turnNumber}</span>
                  </div>
                  <div className="glass-strong rounded-2xl rounded-tl-md px-4 py-3 border border-border/50">
                    <AgentMarkdown content={msg.content || "..."} />
                  </div>
                </div>
              </div>
            );
          })}

          {isStreaming && (
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Agent is thinking...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* User input (interject) */}
      <div className="glass-strong border-t border-border px-6 py-3">
        <div className="max-w-3xl mx-auto flex gap-3">
          <input
            value={userInput}
            onChange={e => setUserInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleUserInterject()}
            placeholder={isComplete ? "Debate is complete" : isPaused ? "Type to interject..." : "Pause the debate to interject..."}
            disabled={isComplete || (!isPaused && isStreaming)}
            className="flex-1 glass rounded-xl px-4 py-2.5 text-sm text-foreground border border-border focus:border-primary/50 outline-none disabled:opacity-50"
          />
          <button
            onClick={handleUserInterject}
            disabled={!userInput.trim() || isComplete || isStreaming}
            className="px-4 py-2.5 rounded-xl gradient-gold text-obsidian font-medium text-sm disabled:opacity-40"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
