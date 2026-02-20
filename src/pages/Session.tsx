import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, Link, useSearchParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Send, User, ChevronDown, Brain, LogOut, History, MessageSquare, Loader2, Cpu, ChevronUp } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
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
  agentName?: string;
  agentImage?: string;
}

interface CustomAgent {
  id: string;
  name: string;
  slug: string;
  domain: string;
  era: string | null;
  tagline: string | null;
  image_url: string | null;
  accent_color: string | null;
  conversation_starters: string[] | null;
  layer_core_values: string | null;
  layer_mental_models: string | null;
  layer_reasoning_patterns: string | null;
  layer_emotional_stance: string | null;
  layer_language_dna: string | null;
  layer_decision_history: string | null;
  layer_knowledge_base: string | null;
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
function ProfileSidebar({ open, onClose, currentAgentId, customAgents }: {
  open: boolean;
  onClose: () => void;
  currentAgentId: string;
  customAgents: CustomAgent[];
}) {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<SessionHistory[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);

    // Load recent conversations — by user_id if logged in, else by session
    const query = supabase
      .from("conversations")
      .select("id, agent_id, created_at, updated_at")
      .order("updated_at", { ascending: false })
      .limit(20);

    (user
      ? query.eq("user_id", user.id)
      : query.eq("user_session", getSessionId())
    ).then(({ data }) => {
      if (!data) { setLoading(false); return; }
      const enriched = data.map(conv => {
        const staticAgent = agents.find(a => a.id === conv.agent_id);
        const customAgent = customAgents.find(a => a.slug === conv.agent_id || a.id === conv.agent_id);
        return {
          ...conv,
          agentName: staticAgent?.name || customAgent?.name || conv.agent_id,
          agentImage: staticAgent?.image || customAgent?.image_url || undefined,
        };
      });
      setSessions(enriched as SessionHistory[]);
      setLoading(false);
    });
  }, [open, user]);

  const allAgents = [
    ...agents.map(a => ({ id: a.id, name: a.name, image: a.image as string | undefined, domain: a.domain, isCustom: false })),
    ...customAgents.map(a => ({ id: a.slug, name: a.name, image: a.image_url || undefined, domain: a.domain, isCustom: true })),
  ];

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-50 w-80 glass-strong border-l border-gold/15 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gold/10">
          <span className="font-display text-sm text-cream">Account & Sessions</span>
          <button onClick={onClose} className="w-7 h-7 rounded-lg glass flex items-center justify-center hover:border-gold/30 border border-transparent transition-colors">
            <ChevronDown className="w-4 h-4 text-cream-dim rotate-[-90deg]" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Profile info */}
          <div className="px-5 py-4 border-b border-gold/10">
            {user ? (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center text-gold font-bold text-sm">
                  {(profile?.full_name || user.email || "U")[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-cream text-sm font-medium truncate">{profile?.full_name || "User"}</div>
                  <div className="text-cream-dim/60 text-xs truncate">{user.email}</div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-border flex items-center justify-center">
                  <User className="w-4 h-4 text-cream-dim" />
                </div>
                <div className="flex-1">
                  <div className="text-cream text-sm">Guest</div>
                  <button
                    onClick={() => { onClose(); navigate("/login"); }}
                    className="text-xs text-gold hover:underline"
                  >
                    Sign in to sync sessions →
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Switch Agent */}
          <div className="px-5 py-4 border-b border-gold/10">
            <div className="text-xs text-cream-dim/50 font-mono uppercase tracking-wider mb-3">Switch Agent</div>
            <div className="space-y-1.5 max-h-52 overflow-y-auto">
              {allAgents.map(agent => (
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
                  {agent.image ? (
                    <img src={agent.image} alt={agent.name} className="w-8 h-8 rounded-full object-cover object-top border border-gold/20 flex-shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center flex-shrink-0">
                      <Brain className="w-3.5 h-3.5 text-gold" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-cream text-xs font-medium truncate">{agent.name}</div>
                    <div className="text-cream-dim/50 text-xs truncate">{agent.domain}</div>
                  </div>
                  {agent.id === currentAgentId && <div className="w-1.5 h-1.5 rounded-full bg-gold flex-shrink-0" />}
                  {agent.isCustom && <span className="text-[10px] px-1.5 py-0.5 rounded bg-gold/15 text-gold font-mono flex-shrink-0">AI</span>}
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
                      {session.agentImage ? (
                        <img src={session.agentImage} alt="" className="w-7 h-7 rounded-lg object-cover object-top" />
                      ) : (
                        <Brain className="w-3.5 h-3.5 text-gold" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-cream text-xs font-medium truncate">{session.agentName}</div>
                      <div className="text-cream-dim/50 text-xs">
                        {new Date(session.updated_at).toLocaleDateString()}
                      </div>
                    </div>
                    <MessageSquare className="w-3 h-3 text-cream-dim/30 flex-shrink-0" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gold/10 space-y-2">
          <Link
            to="/library"
            onClick={onClose}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl glass border border-gold/15 text-cream-dim hover:text-cream hover:border-gold/30 transition-colors text-sm"
          >
            <Brain className="w-4 h-4" />
            Agent Library
          </Link>
          {user && (
            <button
              onClick={() => { signOut(); onClose(); }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl glass border border-gold/15 text-cream-dim hover:text-cream hover:border-destructive/40 transition-colors text-sm"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Model Switcher ───────────────────────────────────────────────────────────
interface ModelOption { id: string; label: string; providerId?: string; }

function ModelSwitcher({ selected, onChange }: { selected: ModelOption; onChange: (m: ModelOption) => void }) {
  const [open, setOpen] = useState(false);
  const [models, setModels] = useState<ModelOption[]>([]);

  useEffect(() => {
    // Built-in Lovable AI models
    const builtIn: ModelOption[] = [
      { id: "google/gemini-2.5-flash",       label: "Gemini 2.5 Flash (default)" },
      { id: "google/gemini-3-flash-preview",  label: "Gemini 3 Flash Preview" },
      { id: "google/gemini-2.5-pro",          label: "Gemini 2.5 Pro" },
      { id: "openai/gpt-5-mini",              label: "GPT-5 Mini" },
      { id: "openai/gpt-5",                   label: "GPT-5" },
    ];

    // Fetch provider models
    supabase
      .from("ai_provider_models")
      .select("model_id, model_name, provider_id, ai_providers!inner(name, is_active, is_verified)")
      .eq("is_active", true)
      .then(({ data }) => {
        const providerModels: ModelOption[] = (data || [])
          .filter((m: any) => m.ai_providers?.is_active && m.ai_providers?.is_verified)
          .map((m: any) => ({
            id: m.model_id,
            label: `${m.model_name} (${m.ai_providers.name})`,
            providerId: m.provider_id,
          }));
        setModels([...builtIn, ...providerModels]);
      });
  }, []);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl glass border border-gold/15 hover:border-gold/35 transition-colors flex-shrink-0 max-w-[160px]"
        title="Switch model"
      >
        <Cpu className="w-3.5 h-3.5 text-gold/70 flex-shrink-0" />
        <span className="text-cream-dim text-xs truncate">{selected.label.split(" (")[0]}</span>
        <ChevronDown className="w-3 h-3 text-cream-dim/50 flex-shrink-0" />
      </button>
    );
  }

  return (
    <>
      <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
      <div className="relative z-40">
        <button
          onClick={() => setOpen(false)}
          className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl glass border border-gold/35 transition-colors flex-shrink-0 max-w-[160px]"
        >
          <Cpu className="w-3.5 h-3.5 text-gold flex-shrink-0" />
          <span className="text-cream text-xs truncate">{selected.label.split(" (")[0]}</span>
          <ChevronUp className="w-3 h-3 text-gold/70 flex-shrink-0" />
        </button>
        <div className="absolute top-full mt-1 right-0 w-64 glass-strong rounded-xl border border-gold/20 shadow-xl overflow-hidden">
          <div className="px-3 py-2 border-b border-gold/10">
            <span className="font-mono text-gold/60 text-xs uppercase tracking-widest">Select Model</span>
          </div>
          <div className="max-h-64 overflow-y-auto py-1">
            {models.map(m => (
              <button key={m.id} onClick={() => { onChange(m); setOpen(false); }}
                className={`w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-gold/8 transition-colors ${selected.id === m.id ? "bg-gold/10" : ""}`}>
                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${selected.id === m.id ? "bg-gold" : "bg-transparent border border-gold/30"}`} />
                <span className="text-cream text-xs flex-1 truncate">{m.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Message Content Renderer ─────────────────────────────────────────────────
function AgentMarkdown({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => (
          <h1 className="font-display text-xl text-cream font-semibold mt-4 mb-2 first:mt-0 border-b border-gold/20 pb-1">{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="font-display text-lg text-cream font-semibold mt-3 mb-1.5 first:mt-0">{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="font-semibold text-gold text-sm mt-2.5 mb-1 first:mt-0 tracking-wide uppercase text-xs font-mono">{children}</h3>
        ),
        p: ({ children }) => (
          <p className="text-cream leading-relaxed mb-3 last:mb-0">{children}</p>
        ),
        strong: ({ children }) => (
          <strong className="text-gold font-semibold">{children}</strong>
        ),
        em: ({ children }) => (
          <em className="text-cream-dim not-italic border-b border-gold/30 pb-px">{children}</em>
        ),
        ul: ({ children }) => (
          <ul className="my-2 space-y-1.5 pl-1">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="my-2 space-y-1.5 pl-1 list-decimal list-inside">{children}</ol>
        ),
        li: ({ children }) => (
          <li className="flex gap-2 text-cream leading-relaxed text-sm">
            <span className="text-gold mt-1.5 flex-shrink-0">▸</span>
            <span>{children}</span>
          </li>
        ),
        blockquote: ({ children }) => (
          <blockquote className="my-3 pl-4 border-l-2 border-gold/50 bg-gold/5 rounded-r-lg py-2 pr-3 italic text-cream-dim">
            {children}
          </blockquote>
        ),
        code: ({ inline, children }: any) =>
          inline ? (
            <code className="bg-obsidian-light/80 text-gold px-1.5 py-0.5 rounded font-mono text-xs border border-gold/15">{children}</code>
          ) : (
            <pre className="my-3 p-4 bg-obsidian-light/60 rounded-xl border border-gold/10 overflow-x-auto">
              <code className="text-cream font-mono text-xs leading-relaxed">{children}</code>
            </pre>
          ),
        hr: () => <hr className="my-4 border-gold/15" />,
        table: ({ children }) => (
          <div className="my-3 overflow-x-auto rounded-xl border border-gold/15">
            <table className="w-full text-sm">{children}</table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="bg-gold/10 border-b border-gold/20">{children}</thead>
        ),
        th: ({ children }) => (
          <th className="px-4 py-2 text-left text-gold font-mono text-xs uppercase tracking-wider">{children}</th>
        ),
        td: ({ children }) => (
          <td className="px-4 py-2.5 text-cream border-b border-gold/8 last:border-0">{children}</td>
        ),
        a: ({ href, children }) => (
          <a href={href} target="_blank" rel="noopener noreferrer"
            className="text-gold hover:text-gold-bright underline underline-offset-2 decoration-gold/40 hover:decoration-gold transition-colors">
            {children}
          </a>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

// ─── Main Session ─────────────────────────────────────────────────────────────
const Session = () => {
  const { agentId } = useParams<{ agentId: string }>();
  const [searchParams] = useSearchParams();
  const { user, profile } = useAuth();

  // Find in static agents first
  const staticAgent = agents.find((a) => a.id === agentId);

  const [customAgent, setCustomAgent] = useState<CustomAgent | null>(null);
  const [customAgents, setCustomAgents] = useState<CustomAgent[]>([]);
  const [agentLoading, setAgentLoading] = useState(!staticAgent);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<ModelOption>({
    id: "google/gemini-2.5-flash",
    label: "Gemini 2.5 Flash (default)",
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const userSession = getSessionId();

  // Load custom agents list for switcher
  useEffect(() => {
    supabase
      .from("custom_agents")
      .select("id, name, slug, domain, era, tagline, image_url, accent_color, conversation_starters, layer_core_values, layer_mental_models, layer_reasoning_patterns, layer_emotional_stance, layer_language_dna, layer_decision_history, layer_knowledge_base")
      .eq("is_public", true)
      .eq("is_active", true)
      .then(({ data }) => {
        if (data) setCustomAgents(data as CustomAgent[]);
      });
  }, []);

  // If not a static agent, try to load from DB by slug or id
  useEffect(() => {
    if (staticAgent || !agentId) {
      setAgentLoading(false);
      return;
    }
    setAgentLoading(true);
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(agentId);
    const q = supabase.from("custom_agents").select("*").eq("is_active", true).limit(1);
    (isUUID ? q.or(`slug.eq.${agentId},id.eq.${agentId}`) : q.eq("slug", agentId))
      .maybeSingle()
      .then(({ data }) => {
        if (data) setCustomAgent(data as CustomAgent);
        setAgentLoading(false);
      });
  }, [agentId, staticAgent]);

  // The effective agent (static or custom)
  const agent = staticAgent ? {
    id: staticAgent.id,
    name: staticAgent.name,
    era: staticAgent.era,
    domain: staticAgent.domain,
    tagline: staticAgent.tagline,
    image: staticAgent.image as string,
    conversationStarters: staticAgent.conversationStarters,
    isCustom: false,
  } : customAgent ? {
    id: customAgent.slug,
    name: customAgent.name,
    era: customAgent.era || "",
    domain: customAgent.domain,
    tagline: customAgent.tagline || "",
    image: customAgent.image_url || "",
    conversationStarters: customAgent.conversation_starters || [],
    isCustom: true,
  } : null;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  // Load conversation history
  useEffect(() => {
    if (!agentId || agentLoading) return;
    const loadHistory = async () => {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/functions/v1/get-conversation?agentId=${agentId}&userSession=${userSession}`,
          { headers: { Authorization: `Bearer ${SUPABASE_KEY}` } }
        );
        const data = await res.json();
        if (data.conversationId) setConversationId(data.conversationId);

        const hasHistory = (data.messages || []).length > 0;
        const agentName = agent?.name || "the agent";
        const opener: Message = {
          id: "opener",
          role: "agent",
          content: hasHistory
            ? `Welcome back. I remember our conversation. Shall we continue where we left off, or is there something new on your mind?`
            : agent
              ? `I am here. Not as a ghost or a recording — as a living cognitive process built from everything I believed, wrote, decided, and experienced. You have something on your mind. Let us begin.`
              : `Hello. I'm ready to engage. What's on your mind?`,
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
          content: `I am here. Let us begin.`,
          timestamp: new Date(),
        }]);
      } finally {
        setHistoryLoaded(true);
      }
    };
    loadHistory();
  }, [agentId, agentLoading]);

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
        body: JSON.stringify({
          agentId,
          messages: [{ role: "user", content: userContent }],
          conversationId,
          userSession,
          userId: user?.id || null,
          model: selectedModel.id,
          // Pass custom agent's cognitive layers if available
          customSystemPrompt: customAgent ? buildCustomSystemPrompt(customAgent) : undefined,
        }),
        signal: ctrl.signal,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: "Unknown error" }));
        if (res.status === 429) toast.error("Rate limit reached. Please wait a moment.");
        else if (res.status === 402) toast.error("AI credits exhausted.");
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
  }, [input, agentId, isStreaming, conversationId, userSession, user, customAgent]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleStarterClick = (starter: string) => { setInput(starter); inputRef.current?.focus(); };

  // Loading state while fetching custom agent
  if (agentLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-gold animate-spin mx-auto mb-3" />
          <p className="text-cream-dim text-sm">Loading agent...</p>
        </div>
      </div>
    );
  }

  // Agent not found
  if (!agent) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Brain className="w-12 h-12 text-cream-dim/30 mx-auto mb-4" />
          <p className="text-cream-dim text-lg mb-2">Agent not found.</p>
          <p className="text-cream-dim/50 text-sm mb-6">This agent may not exist or is not yet public.</p>
          <Link to="/library" className="text-gold hover:underline text-sm">← Return to Library</Link>
        </div>
      </div>
    );
  }

  const userMessages = messages.filter(m => m.role === "user");

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Profile Sidebar */}
      <ProfileSidebar
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        currentAgentId={agentId!}
        customAgents={customAgents}
      />

      {/* Session header */}
      <div className="glass-strong border-b border-gold/10 px-6 py-4 flex items-center gap-4">
        <Link to={`/agent/${agent.id}`}
          className="flex items-center gap-1.5 text-cream-dim hover:text-cream transition-colors text-sm">
          <ArrowLeft className="w-4 h-4" />
          Profile
        </Link>
        <div className="w-px h-5 bg-border" />
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="relative flex-shrink-0">
            {agent.image ? (
              <img src={agent.image} alt={agent.name}
                className="w-9 h-9 rounded-full object-cover object-top border border-gold/30" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-gold/20 flex items-center justify-center border border-gold/30">
                <Brain className="w-4 h-4 text-gold" />
              </div>
            )}
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-background flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
            </div>
          </div>
          <div className="min-w-0">
            <div className="text-cream text-sm font-medium leading-tight truncate">{agent.name}</div>
            <div className="text-cream-dim text-xs truncate">{agent.domain}</div>
          </div>
        </div>
        {conversationId && (
          <div className="hidden md:flex items-center gap-1.5 flex-shrink-0">
            <div className="w-1.5 h-1.5 rounded-full bg-gold/60" />
            <span className="font-mono text-cream-dim/50 text-xs">Memory active</span>
          </div>
        )}
        <div className="os-tag hidden md:block flex-shrink-0">Cognitive Session</div>

        {/* Model Switcher */}
        <ModelSwitcher selected={selectedModel} onChange={setSelectedModel} />

        <button
          onClick={() => setProfileOpen(true)}
          className="flex items-center gap-2 ml-2 px-2.5 py-1.5 rounded-xl glass border border-gold/15 hover:border-gold/35 transition-colors flex-shrink-0"
        >
          <div className="w-6 h-6 rounded-full bg-gold/20 flex items-center justify-center text-gold text-xs font-bold">
            {user ? (profile?.full_name || user.email || "U")[0].toUpperCase() : "G"}
          </div>
          <span className="text-cream-dim text-xs hidden md:block max-w-[80px] truncate">
            {user ? (profile?.full_name || user.email?.split("@")[0]) : "Guest"}
          </span>
        </button>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
          {/* Conversation starters */}
          {userMessages.length === 0 && historyLoaded && agent.conversationStarters.length > 0 && (
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
                  {agent.image ? (
                    <img src={agent.image} alt={agent.name}
                      className="w-9 h-9 rounded-full object-cover object-top border border-gold/30" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-gold/20 flex items-center justify-center border border-gold/30">
                      <Brain className="w-4 h-4 text-gold" />
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex-shrink-0 w-9 h-9 rounded-full bg-muted flex items-center justify-center border border-border">
                  <User className="w-4 h-4 text-cream-dim" />
                </div>
              )}
              <div className={`max-w-xl px-5 py-4 rounded-2xl text-sm leading-relaxed ${
                msg.role === "agent"
                  ? "glass border border-gold/12"
                  : "bg-secondary text-cream border border-border"
              }`}>
                {msg.content ? (
                  msg.role === "agent"
                    ? <AgentMarkdown content={msg.content} />
                    : <p className="text-cream leading-relaxed">{msg.content}</p>
                ) : (
                  <span className="text-cream-dim/40 animate-pulse">▋</span>
                )}
              </div>
            </div>
          ))}

          {isStreaming && messages[messages.length - 1]?.content === "" && (
            <div className="flex gap-4">
              {agent.image ? (
                <img src={agent.image} alt={agent.name}
                  className="w-9 h-9 rounded-full object-cover object-top border border-gold/30 flex-shrink-0" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-gold/20 flex items-center justify-center border border-gold/30 flex-shrink-0">
                  <Brain className="w-4 h-4 text-gold" />
                </div>
              )}
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

// Build system prompt for custom agents from their 7 layers
function buildCustomSystemPrompt(agent: CustomAgent): string {
  const sections = [
    agent.layer_core_values && `CORE VALUES:\n${agent.layer_core_values}`,
    agent.layer_mental_models && `MENTAL MODELS:\n${agent.layer_mental_models}`,
    agent.layer_reasoning_patterns && `REASONING PATTERNS:\n${agent.layer_reasoning_patterns}`,
    agent.layer_emotional_stance && `EMOTIONAL STANCE:\n${agent.layer_emotional_stance}`,
    agent.layer_language_dna && `LANGUAGE DNA:\n${agent.layer_language_dna}`,
    agent.layer_decision_history && `DECISION HISTORY:\n${agent.layer_decision_history}`,
    agent.layer_knowledge_base && `KNOWLEDGE BASE:\n${agent.layer_knowledge_base}`,
  ].filter(Boolean).join("\n\n");

  return `You are ${agent.name}${agent.era ? ` (${agent.era})` : ""} — a living cognitive simulation built from authentic documented sources.

${sections || "Engage authentically and helpfully as this person would."}

Respond in first person, embodying this person's authentic voice, values, and reasoning patterns. Draw on their documented decisions, writings, and philosophy.`;
}

export default Session;
