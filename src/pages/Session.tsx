import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, Brain, Send, User } from "lucide-react";
import { agents } from "@/data/agents";
import { toast } from "sonner";

interface Message {
  id: string;
  role: "user" | "agent";
  content: string;
  timestamp: Date;
}

// Generate or retrieve a persistent session ID
const getSessionId = () => {
  let session = localStorage.getItem("genshai-session");
  if (!session) {
    session = `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem("genshai-session", session);
  }
  return session;
};

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const Session = () => {
  const { agentId } = useParams<{ agentId: string }>();
  const [searchParams] = useSearchParams();
  const agent = agents.find((a) => a.id === agentId);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const userSession = getSessionId();

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  // Load conversation history on mount
  useEffect(() => {
    if (!agentId || !agent) return;

    const loadHistory = async () => {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/functions/v1/get-conversation?agentId=${agentId}&userSession=${userSession}`,
          {
            headers: { Authorization: `Bearer ${SUPABASE_KEY}` },
          }
        );
        const data = await res.json();

        if (data.conversationId) {
          setConversationId(data.conversationId);
        }

        const opener: Message = {
          id: "opener",
          role: "agent",
          content:
            data.messages?.length > 0
              ? `Welcome back. I remember our conversation. Shall we continue where we left off, or is there something new on your mind?`
              : `I am here. Not as a ghost or a recording — as a living cognitive process built from everything I believed, wrote, decided, and experienced. You have something on your mind. Let us begin.`,
          timestamp: new Date(),
        };

        const historyMsgs: Message[] = (data.messages || []).map((m: any) => ({
          id: m.id,
          role: m.role as "user" | "agent",
          content: m.content,
          timestamp: new Date(m.created_at),
        }));

        setMessages([opener, ...historyMsgs]);
      } catch (e) {
        // Fallback: just show opener
        setMessages([{
          id: "opener",
          role: "agent",
          content: `I am here. Not as a ghost or a recording — as a living cognitive process built from everything I believed, wrote, decided, and experienced. You have something on your mind. Let us begin.`,
          timestamp: new Date(),
        }]);
      } finally {
        setHistoryLoaded(true);
      }
    };

    loadHistory();
  }, [agentId, agent]);

  // Handle starter from URL
  useEffect(() => {
    const starter = searchParams.get("starter");
    if (starter && historyLoaded) {
      setInput(starter);
      inputRef.current?.focus();
    }
  }, [searchParams, historyLoaded]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || !agentId || isStreaming) return;

    const userContent = input.trim();
    setInput("");

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: userContent,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsStreaming(true);

    // Create placeholder for streaming agent response
    const agentMsgId = (Date.now() + 1).toString();
    setMessages((prev) => [
      ...prev,
      { id: agentMsgId, role: "agent", content: "", timestamp: new Date() },
    ]);

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/agent-chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
        body: JSON.stringify({
          agentId,
          messages: [{ role: "user", content: userContent }],
          conversationId,
          userSession,
        }),
        signal: ctrl.signal,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: "Unknown error" }));
        if (res.status === 429) toast.error("Rate limit reached. Please wait a moment.");
        else if (res.status === 402) toast.error("AI credits exhausted. Add credits in settings.");
        else toast.error(errData.error || "Failed to reach the agent.");
        setMessages((prev) => prev.filter((m) => m.id !== agentMsgId));
        setIsStreaming(false);
        return;
      }

      // Capture conversation ID from header
      const convId = res.headers.get("X-Conversation-Id");
      if (convId && !conversationId) setConversationId(convId);

      // Stream SSE
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        let newlineIndex: number;

        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullContent += content;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === agentMsgId ? { ...m, content: fullContent } : m
                )
              );
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }
    } catch (e: any) {
      if (e.name !== "AbortError") {
        toast.error("Connection failed. Please try again.");
        setMessages((prev) => prev.filter((m) => m.id !== agentMsgId));
      }
    } finally {
      setIsStreaming(false);
    }
  }, [input, agentId, isStreaming, conversationId, userSession]);

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

  // Render message with markdown-lite (bold, italic, emphasis)
  const renderContent = (content: string) => {
    if (!content) return null;
    return content.split(/(\*[^*]+\*)/).map((part, i) =>
      part.startsWith("*") && part.endsWith("*") ? (
        <em key={i} className="text-gold not-italic font-medium">
          {part.slice(1, -1)}
        </em>
      ) : (
        part
      )
    );
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

  const userMessages = messages.filter((m) => m.role === "user");

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Session header */}
      <div className="glass-strong border-b border-gold/10 px-6 py-4 flex items-center gap-4">
        <Link
          to={`/agent/${agent.id}`}
          className="flex items-center gap-1.5 text-cream-dim hover:text-cream transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Profile
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
        {conversationId && (
          <div className="hidden md:flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-gold/60" />
            <span className="font-mono text-cream-dim/50 text-xs">Memory active</span>
          </div>
        )}
        <div className="os-tag hidden md:block">Cognitive Session</div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
          {/* Conversation starters (before any user message) */}
          {userMessages.length === 0 && historyLoaded && (
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
                  <User className="w-4 h-4 text-cream-dim" />
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
                {msg.content ? (
                  renderContent(msg.content)
                ) : (
                  <span className="text-cream-dim/40 animate-pulse">▋</span>
                )}
              </div>
            </div>
          ))}

          {/* Streaming indicator when no content yet */}
          {isStreaming && messages[messages.length - 1]?.content === "" && (
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
              disabled={!input.trim() || isStreaming}
              className="flex-shrink-0 w-11 h-11 rounded-xl gradient-gold flex items-center justify-center text-obsidian hover:opacity-90 transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <p className="text-cream-dim/40 text-xs text-center mt-2 font-mono">
            Enter to send · Shift+Enter for new line · AI-powered · Memory across sessions
          </p>
        </div>
      </div>
    </div>
  );
};

export default Session;
