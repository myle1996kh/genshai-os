import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, Send, User, ChevronDown, Clock, Brain, LogOut, History, MessageSquare } from "lucide-react";
import { agents } from "@/data/agents";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface Message {
  id: string;
  role: "user" | "agent";
  content: string;
  timestamp: Date;
}

interface SessionHistory {
  id: string;
  agent_id: string;
  created_at: string;
  updated_at: string;
  lastMessage?: string;
  agentName?: string;
}

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

// ─── Profile Sidebar ──────────────────────────────────────────────────────────
function ProfileSidebar({ open, onClose, currentAgentId }: {
  open: boolean; onClose: () => void; currentAgentId: string;
}) {
  const { user, profile, signOut } = useAuth();
  const [sessions, setSessions] = useState<SessionHistory[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    setLoading(true);
    // Load recent conversations
    supabase
      .from("conversations")
      .select("id, agent_id, created_at, updated_at")
      .order("updated_at", { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (!data) { setLoading(false); return; }
        // Enrich with agent names
        const enriched = data.map(conv => {
          const staticAgent = agents.find(a => a.id === conv.agent_id);
          return {
            ...conv,
            agentName: staticAgent?.name || conv.agent_id,
          };
        });
        setSessions(enriched as SessionHistory[]);
        setLoading(false);
      });
  }, [open, user]);

  const allStaticAgents = agents;

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm" onClick={onClose} />
      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-80 glass-strong border-l border-gold/15 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gold/10">
          <span className="font-display text-sm text-cream">Account</span>
          <button onClick={onClose} className="w-7 h-7 rounded-lg glass flex items-center justify-center hover:border-gold/30 border border-transparent transition-colors">
            <ChevronDown className="w-4 h-4 text-cream-dim rotate-[-90deg]" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Profile info */}
          <div className="px-5 py-4 border-b border-gold/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center text-gold font-bold">
                {(profile?.full_name || user?.email || "U")[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-cream text-sm font-medium truncate">{profile?.full_name || "Anonymous"}</div>
                <div className="text-cream-dim/60 text-xs truncate">{user?.email}</div>
              </div>
            </div>
          </div>

          {/* Switch Agent */}
          <div className="px-5 py-4 border-b border-gold/10">
            <div className="text-xs text-cream-dim/50 font-mono uppercase tracking-wider mb-3">Switch Agent</div>
            <div className="space-y-1.5">
              {allStaticAgents.map(agent => (
                <Link
                  key={agent.id}
                  to={`/session/${agent.id}`}
                  onClick={onClose}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                    agent.id === currentAgentId
                      ? "bg-gold/15 border border-gold/30"
                      : "hover:bg-gold/8 border border-transparent"
                  }`}
                >
                  <img src={agent.image} alt={agent.name} className="w-8 h-8 rounded-full object-cover object-top border border-gold/20 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-cream text-xs font-medium truncate">{agent.name}</div>
                    <div className="text-cream-dim/50 text-xs truncate">{agent.domain}</div>
                  </div>
                  {agent.id === currentAgentId && <div className="w-1.5 h-1.5 rounded-full bg-gold flex-shrink-0" />}
                </Link>
              ))}
            </div>
          </div>

          {/* Session History */}
          <div className="px-5 py-4">
            <div className="text-xs text-cream-dim/50 font-mono uppercase tracking-wider mb-3">Recent Sessions</div>
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <div key={i} className="h-12 glass rounded-xl animate-pulse" />)}
              </div>
            ) : sessions.length === 0 ? (
              <div className="text-center py-6">
                <History className="w-8 h-8 text-cream-dim/30 mx-auto mb-2" />
                <p className="text-cream-dim/50 text-xs">No sessions yet</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {sessions.map(session => (
                  <Link
                    key={session.id}
                    to={`/session/${session.agent_id}`}
                    onClick={onClose}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gold/8 border border-transparent hover:border-gold/15 transition-all"
                  >
                    <div className="w-7 h-7 rounded-lg bg-gold/15 flex items-center justify-center flex-shrink-0">
                      <Brain className="w-3.5 h-3.5 text-gold" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-cream text-xs font-medium truncate">{session.agentName}</div>
                      <div className="text-cream-dim/50 text-xs">
                        {new Date(session.updated_at).toLocaleDateString("vi-VN")}
                      </div>
                    </div>
                    <MessageSquare className="w-3 h-3 text-cream-dim/30 flex-shrink-0" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sign out */}
        <div className="px-5 py-4 border-t border-gold/10">
          <button
            onClick={() => { signOut(); onClose(); }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl glass border border-gold/15 text-cream-dim hover:text-cream hover:border-gold/30 transition-colors text-sm"
          >
            <LogOut className="w-4 h-4" />
            Đăng xuất
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Message Content Renderer ─────────────────────────────────────────────────
const renderContent = (content: string) => {
  if (!content) return null;
  return content.split(/(\*[^*]+\*)/).map((part, i) =>
    part.startsWith("*") && part.endsWith("*") ? (
      <em key={i} className="text-gold not-italic font-medium">{part.slice(1, -1)}</em>
    ) : part
  );
};

// ─── Main Session ─────────────────────────────────────────────────────────────
const Session = () => {
  const { agentId } = useParams<{ agentId: string }>();
  const [searchParams] = useSearchParams();
  const { user, profile } = useAuth();

  const agent = agents.find((a) => a.id === agentId);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const userSession = getSessionId();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  useEffect(() => {
    if (!agentId || !agent) return;
    const loadHistory = async () => {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/functions/v1/get-conversation?agentId=${agentId}&userSession=${userSession}`,
          { headers: { Authorization: `Bearer ${SUPABASE_KEY}` } }
        );
        const data = await res.json();
        if (data.conversationId) setConversationId(data.conversationId);

        const opener: Message = {
          id: "opener",
          role: "agent",
          content: data.messages?.length > 0
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
      } catch {
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

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: userContent, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setIsStreaming(true);

    const agentMsgId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, { id: agentMsgId, role: "agent", content: "", timestamp: new Date() }]);

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/agent-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_KEY}` },
        body: JSON.stringify({ agentId, messages: [{ role: "user", content: userContent }], conversationId, userSession }),
        signal: ctrl.signal,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: "Unknown error" }));
        if (res.status === 429) toast.error("Rate limit reached. Please wait a moment.");
        else if (res.status === 402) toast.error("AI credits exhausted. Add credits in settings.");
        else toast.error(errData.error || "Failed to reach the agent.");
        setMessages(prev => prev.filter(m => m.id !== agentMsgId));
        setIsStreaming(false);
        return;
      }

      const convId = res.headers.get("X-Conversation-Id");
      if (convId && !conversationId) setConversationId(convId);

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
              setMessages(prev => prev.map(m => m.id === agentMsgId ? { ...m, content: fullContent } : m));
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
        setMessages(prev => prev.filter(m => m.id !== agentMsgId));
      }
    } finally {
      setIsStreaming(false);
    }
  }, [input, agentId, isStreaming, conversationId, userSession]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleStarterClick = (starter: string) => { setInput(starter); inputRef.current?.focus(); };

  if (!agent) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-cream-dim text-lg mb-4">Agent not found.</p>
          <Link to="/library" className="text-gold hover:underline">Return to Library</Link>
        </div>
      </div>
    );
  }

  const userMessages = messages.filter(m => m.role === "user");

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Profile Sidebar */}
      <ProfileSidebar open={profileOpen} onClose={() => setProfileOpen(false)} currentAgentId={agentId!} />

      {/* Session header */}
      <div className="glass-strong border-b border-gold/10 px-6 py-4 flex items-center gap-4">
        <Link to={`/agent/${agent.id}`}
          className="flex items-center gap-1.5 text-cream-dim hover:text-cream transition-colors text-sm">
          <ArrowLeft className="w-4 h-4" />
          Profile
        </Link>
        <div className="w-px h-5 bg-border" />
        <div className="flex items-center gap-3 flex-1">
          <div className="relative">
            <img src={agent.image} alt={agent.name}
              className="w-9 h-9 rounded-full object-cover object-top border border-gold/30" />
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

        {/* User avatar button */}
        {user && (
          <button
            onClick={() => setProfileOpen(true)}
            className="flex items-center gap-2 ml-2 px-2.5 py-1.5 rounded-xl glass border border-gold/15 hover:border-gold/35 transition-colors"
          >
            <div className="w-6 h-6 rounded-full bg-gold/20 flex items-center justify-center text-gold text-xs font-bold">
              {(profile?.full_name || user.email || "U")[0].toUpperCase()}
            </div>
            <span className="text-cream-dim text-xs hidden md:block max-w-[80px] truncate">
              {profile?.full_name || user.email?.split("@")[0]}
            </span>
          </button>
        )}
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
          {/* Conversation starters */}
          {userMessages.length === 0 && historyLoaded && (
            <div className="space-y-3">
              <p className="text-cream-dim text-xs font-mono uppercase tracking-widest text-center">
                — Or begin with one of these —
              </p>
              <div className="grid grid-cols-1 gap-2">
                {agent.conversationStarters.map(starter => (
                  <button key={starter} onClick={() => handleStarterClick(starter)}
                    className="glass text-left px-4 py-3 rounded-xl text-cream-dim text-sm hover:text-cream hover:border-gold/30 transition-all duration-200 border border-transparent">
                    "{starter}"
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map(msg => (
            <div key={msg.id} className={`flex gap-4 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
              {msg.role === "agent" ? (
                <div className="flex-shrink-0">
                  <img src={agent.image} alt={agent.name}
                    className="w-9 h-9 rounded-full object-cover object-top border border-gold/30" />
                </div>
              ) : (
                <div className="flex-shrink-0 w-9 h-9 rounded-full bg-muted flex items-center justify-center border border-border">
                  <User className="w-4 h-4 text-cream-dim" />
                </div>
              )}
              <div className={`max-w-xl px-5 py-4 rounded-2xl text-sm leading-relaxed ${
                msg.role === "agent"
                  ? "glass border border-gold/12 text-cream"
                  : "bg-secondary text-cream border border-border"
              }`}>
                {msg.content ? renderContent(msg.content) : (
                  <span className="text-cream-dim/40 animate-pulse">▋</span>
                )}
              </div>
            </div>
          ))}

          {isStreaming && messages[messages.length - 1]?.content === "" && (
            <div className="flex gap-4">
              <img src={agent.image} alt={agent.name}
                className="w-9 h-9 rounded-full object-cover object-top border border-gold/30 flex-shrink-0" />
              <div className="glass border border-gold/12 px-5 py-4 rounded-2xl flex items-center gap-1.5">
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-2 h-2 rounded-full bg-gold animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }} />
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
              <textarea ref={inputRef} value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Speak your mind to ${agent.name}...`}
                rows={1}
                className="w-full bg-transparent px-5 py-3.5 text-cream placeholder:text-cream-dim/40 text-sm resize-none outline-none max-h-40 leading-relaxed"
                style={{ fieldSizing: "content" } as React.CSSProperties}
              />
            </div>
            <button onClick={handleSend} disabled={!input.trim() || isStreaming}
              className="flex-shrink-0 w-11 h-11 rounded-xl gradient-gold flex items-center justify-center text-obsidian hover:opacity-90 transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed">
              <Send className="w-4 h-4" />
            </button>
          </div>
          <p className="text-cream-dim/40 text-xs text-center mt-2 font-mono">
            Enter to send · Shift+Enter for new line · Memory across sessions
          </p>
        </div>
      </div>
    </div>
  );
};

export default Session;
