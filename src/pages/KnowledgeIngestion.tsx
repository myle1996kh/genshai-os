import { useState, useEffect, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft, BookOpen, Globe, Upload, CheckCircle, AlertCircle,
  Loader2, ChevronRight, FileText, Sparkles, Search, Youtube,
  Link2, Paperclip, X, Brain,
} from "lucide-react";
import { agents } from "@/data/agents";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import AgentAvatar from "@/components/AgentAvatar";

type SourceType = "wikipedia" | "text" | "auto" | "youtube" | "url" | "file";

interface CustomAgent {
  id: string; slug: string; name: string; domain: string; image_url: string | null; accent_color: string | null;
}

const KnowledgeIngestion = () => {
  const { agentId } = useParams<{ agentId: string }>();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Resolve agent (static or custom)
  const staticAgent = agents.find((a) => a.id === agentId);
  const [customAgent, setCustomAgent] = useState<CustomAgent | null>(null);
  const [agentLoading, setAgentLoading] = useState(!staticAgent);

  useEffect(() => {
    if (staticAgent || !agentId) { setAgentLoading(false); return; }
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(agentId);
    const q = supabase.from("custom_agents").select("id,slug,name,domain,image_url,accent_color").eq("is_active", true).limit(1);
    (isUUID ? q.or(`slug.eq.${agentId},id.eq.${agentId}`) : q.eq("slug", agentId))
      .maybeSingle().then(({ data }) => { if (data) setCustomAgent(data as CustomAgent); setAgentLoading(false); });
  }, [agentId, staticAgent]);

  const agent = staticAgent
    ? { id: staticAgent.id, name: staticAgent.name, domain: staticAgent.domain, image: staticAgent.image as string | null, accentColor: staticAgent.accentColor }
    : customAgent
    ? { id: customAgent.slug, name: customAgent.name, domain: customAgent.domain, image: customAgent.image_url, accentColor: customAgent.accent_color || "42 80% 52%" }
    : null;

  const [activeTab, setActiveTab] = useState<SourceType>("auto");
  const [wikiUrl, setWikiUrl] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [webUrl, setWebUrl] = useState("");
  const [textTitle, setTextTitle] = useState("");
  const [textContent, setTextContent] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [status, setStatus] = useState<"idle" | "processing" | "success" | "error">("idle");
  const [extractedData, setExtractedData] = useState<any>(null);
  const [autoTopic, setAutoTopic] = useState("");
  const [autoSources, setAutoSources] = useState<string[]>(["wikipedia"]);
  const [autoResults, setAutoResults] = useState<any[]>([]);

  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  const ingest = async (opts: {
    sourceType: string; title: string; url?: string; textContent?: string;
  }) => {
    const { data: sourceRecord, error } = await supabase
      .from("knowledge_sources")
      .insert({ agent_id: agentId!, source_type: opts.sourceType, title: opts.title, url: opts.url || null, status: "processing" })
      .select("id").single();
    if (error) throw new Error("Failed to create knowledge source record");

    const res = await fetch(`${SUPABASE_URL}/functions/v1/ingest-knowledge`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_KEY}` },
      body: JSON.stringify({ agentId, sourceType: opts.sourceType, title: opts.title, url: opts.url, textContent: opts.textContent, sourceId: sourceRecord.id }),
    });

    if (!res.ok) {
      await supabase.from("knowledge_sources").update({ status: "error" }).eq("id", sourceRecord.id);
      const err = await res.json().catch(() => ({ error: "Processing failed" }));
      throw new Error(err.error || "Processing failed");
    }
    return res.json();
  };

  const handleWikipediaIngest = async () => {
    if (!wikiUrl.trim() || !agentId) return;
    if (!wikiUrl.includes("wikipedia.org/wiki/")) {
      toast.error("Please enter a valid Wikipedia URL"); return;
    }
    setStatus("processing");
    try {
      const title = wikiUrl.split("/wiki/")[1]?.replace(/_/g, " ") || "Wikipedia Source";
      const data = await ingest({ sourceType: "wikipedia", title, url: wikiUrl });
      setExtractedData(data.extracted);
      setStatus("success");
      toast.success("Wikipedia article ingested!");
    } catch (e: any) { setStatus("error"); toast.error(e.message); }
  };

  const handleYoutubeIngest = async () => {
    if (!youtubeUrl.trim() || !agentId) return;
    const ytMatch = youtubeUrl.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (!ytMatch) { toast.error("Enter a valid YouTube URL"); return; }
    setStatus("processing");
    try {
      const data = await ingest({ sourceType: "youtube", title: `YouTube: ${ytMatch[1]}`, url: youtubeUrl });
      setExtractedData(data.extracted);
      setStatus("success");
      toast.success("YouTube transcript extracted and ingested!");
    } catch (e: any) { setStatus("error"); toast.error(e.message); }
  };

  const handleUrlIngest = async () => {
    if (!webUrl.trim() || !agentId) return;
    setStatus("processing");
    try {
      const title = new URL(webUrl).hostname.replace("www.", "");
      const data = await ingest({ sourceType: "url", title: `Web: ${title}`, url: webUrl });
      setExtractedData(data.extracted);
      setStatus("success");
      toast.success("Web page content extracted!");
    } catch (e: any) { setStatus("error"); toast.error(e.message); }
  };

  const handleFileIngest = async () => {
    if (uploadedFiles.length === 0 || !agentId) return;
    setStatus("processing");
    try {
      for (const file of uploadedFiles) {
        const text = await file.text();
        await ingest({ sourceType: "file", title: file.name, textContent: text.slice(0, 12000) });
      }
      setStatus("success");
      toast.success(`${uploadedFiles.length} file(s) ingested!`);
    } catch (e: any) { setStatus("error"); toast.error(e.message); }
  };

  const handleTextIngest = async () => {
    if (!textTitle.trim() || !textContent.trim() || !agentId) return;
    setStatus("processing");
    try {
      const data = await ingest({ sourceType: "text", title: textTitle, textContent });
      setExtractedData(data.extracted);
      setStatus("success");
      toast.success("Text ingested successfully!");
    } catch (e: any) { setStatus("error"); toast.error(e.message); }
  };

  const handleAutoResearch = async () => {
    if (!autoTopic.trim() || !agentId) return;
    setStatus("processing"); setAutoResults([]);
    try {
      const { data, error } = await supabase.functions.invoke("auto-research", {
        body: { agentId, topic: autoTopic, sources: autoSources },
      });
      if (error) throw error;
      if (!data.sourcesProcessed) { toast.error("No sources processed. Try a different topic."); setStatus("idle"); return; }
      setAutoResults(data.results || []);
      setStatus("success");
      toast.success(`Researched ${data.sourcesProcessed} source(s)!`);
    } catch (e: any) { setStatus("error"); toast.error(e.message || "Auto-research failed"); }
  };

  const handleSubmit = () => {
    if (activeTab === "auto") handleAutoResearch();
    else if (activeTab === "wikipedia") handleWikipediaIngest();
    else if (activeTab === "youtube") handleYoutubeIngest();
    else if (activeTab === "url") handleUrlIngest();
    else if (activeTab === "file") handleFileIngest();
    else handleTextIngest();
  };

  const handleReset = () => {
    setStatus("idle"); setExtractedData(null); setAutoResults([]);
    setWikiUrl(""); setTextTitle(""); setTextContent("");
    setYoutubeUrl(""); setWebUrl(""); setUploadedFiles([]);
  };

  const isSubmitDisabled = status === "processing" || (
    activeTab === "auto" ? !autoTopic.trim() || autoSources.length === 0 :
    activeTab === "wikipedia" ? !wikiUrl.trim() :
    activeTab === "youtube" ? !youtubeUrl.trim() :
    activeTab === "url" ? !webUrl.trim() :
    activeTab === "file" ? uploadedFiles.length === 0 :
    !textTitle.trim() || !textContent.trim()
  );

  if (agentLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 text-gold animate-spin" /></div>;
  }

  if (!agent) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Brain className="w-12 h-12 text-cream-dim/30 mx-auto mb-4" />
          <p className="text-cream-dim text-lg mb-4">Agent not found.</p>
          <Link to="/library" className="text-gold hover:underline">Return to Library</Link>
        </div>
      </div>
    );
  }

  const TABS = [
    { id: "auto" as SourceType,      label: "Auto Research", icon: Sparkles },
    { id: "wikipedia" as SourceType, label: "Wikipedia",     icon: Globe },
    { id: "youtube" as SourceType,   label: "YouTube",       icon: Youtube },
    { id: "url" as SourceType,       label: "Web URL",       icon: Link2 },
    { id: "file" as SourceType,      label: "File Upload",   icon: Paperclip },
    { id: "text" as SourceType,      label: "Paste Text",    icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-background pt-24 pb-20">
      <div className="max-w-3xl mx-auto px-6">
        <Link to={`/agent/${agent.id}`}
          className="inline-flex items-center gap-1.5 text-cream-dim hover:text-cream transition-colors text-sm mb-10">
          <ArrowLeft className="w-4 h-4" />
          Back to {agent.name}
        </Link>

        {/* Header */}
        <div className="mb-10 flex items-start gap-5">
          <AgentAvatar name={agent.name} imageUrl={agent.image} accentColor={agent.accentColor} size="lg"
            className="rounded-2xl flex-shrink-0 w-16 h-16 border border-gold/20" />
          <div>
            <div className="os-tag inline-block mb-3">Knowledge Ingestion</div>
            <h1 className="font-display text-3xl text-cream mb-2">
              Enrich <span className="text-gradient-gold italic">{agent.name}'s</span> Cognitive OS
            </h1>
            <p className="text-cream-dim text-sm leading-relaxed">
              Add source materials — Wikipedia, YouTube videos, web pages, books, or raw text — and AI
              will extract mental models and reasoning patterns to deepen the agent's cognitive blueprint.
            </p>
          </div>
        </div>

        {/* Success state */}
        {status === "success" && extractedData && (
          <div className="space-y-5 mb-6">
            <div className="glass rounded-2xl p-8 border border-gold/20">
              <div className="flex items-center gap-3 mb-6">
                <CheckCircle className="w-6 h-6 text-gold" />
                <h2 className="font-display text-cream text-xl">Extraction Complete</h2>
              </div>
              {extractedData.summary && (
                <div className="mb-6">
                  <div className="font-mono text-gold/60 text-xs uppercase tracking-widest mb-2">Summary</div>
                  <p className="text-cream-dim text-sm leading-relaxed">{extractedData.summary}</p>
                </div>
              )}
              {extractedData.mentalModels?.length > 0 && (
                <div className="mb-6">
                  <div className="font-mono text-gold/60 text-xs uppercase tracking-widest mb-3">
                    Mental Models ({extractedData.mentalModels.length})
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {extractedData.mentalModels.map((m: string, i: number) => (
                      <span key={i} className="px-3 py-1.5 rounded-full border border-gold/20 text-cream-dim text-xs bg-gold/5">{m}</span>
                    ))}
                  </div>
                </div>
              )}
              {extractedData.reasoningPatterns?.length > 0 && (
                <div>
                  <div className="font-mono text-gold/60 text-xs uppercase tracking-widest mb-3">
                    Reasoning Patterns ({extractedData.reasoningPatterns.length})
                  </div>
                  <div className="space-y-2">
                    {extractedData.reasoningPatterns.map((p: string, i: number) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="font-mono text-gold/40 text-xs mt-0.5">{String(i+1).padStart(2,"0")}</span>
                        <p className="text-cream-dim text-sm">{p}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <button onClick={handleReset}
                className="flex-1 py-3 rounded-xl border border-gold/25 text-gold text-sm font-medium hover:bg-gold/10 transition-all">
                Add Another Source
              </button>
              <Link to={`/agent/${agent.id}`}
                className="flex-1 py-3 rounded-xl gradient-gold text-obsidian text-sm font-semibold text-center hover:opacity-90 transition-all">
                View Agent Profile
              </Link>
            </div>
          </div>
        )}

        <div className="glass-strong rounded-2xl border border-gold/10 overflow-hidden">
          {/* Tabs — scroll on mobile */}
          <div className="flex overflow-x-auto border-b border-gold/10 scrollbar-none">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => { setActiveTab(id); setStatus("idle"); }}
                className={`flex items-center gap-1.5 px-4 py-3.5 text-xs font-medium transition-all whitespace-nowrap flex-shrink-0 ${
                  activeTab === id ? "text-gold border-b-2 border-gold bg-gold/5" : "text-cream-dim hover:text-cream"
                }`}>
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>

          <div className="p-6">
            {/* AUTO RESEARCH */}
            {activeTab === "auto" && (
              <div className="space-y-5">
                <div>
                  <label className="font-mono text-gold/60 text-xs uppercase tracking-widest block mb-2">Research Topic</label>
                  <input type="text" value={autoTopic} onChange={e => setAutoTopic(e.target.value)}
                    placeholder="e.g. 'Stoicism', 'First principles thinking', 'Mindfulness meditation'"
                    className="w-full glass rounded-xl px-4 py-3 text-cream placeholder:text-cream-dim/40 text-sm outline-none focus:border-gold/40 border border-gold/15" />
                  <p className="text-cream-dim/50 text-xs mt-2">AI will search Wikipedia and Open Library, extract multiple sources automatically.</p>
                </div>
                <div>
                  <label className="font-mono text-gold/60 text-xs uppercase tracking-widest block mb-2">Source Pools</label>
                  <div className="flex gap-4">
                    {[{ id: "wikipedia", label: "Wikipedia" }, { id: "books", label: "Open Library Books" }].map(({ id, label }) => (
                      <label key={id} className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={autoSources.includes(id)}
                          onChange={e => setAutoSources(prev => e.target.checked ? [...prev, id] : prev.filter(s => s !== id))}
                          className="accent-gold w-4 h-4" />
                        <span className="text-cream-dim text-sm">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>
                {status === "success" && autoResults.length > 0 && (
                  <div className="space-y-3">
                    <div className="font-mono text-gold/60 text-xs uppercase tracking-widest">{autoResults.length} sources ingested</div>
                    {autoResults.map((r, i) => (
                      <div key={i} className="glass rounded-xl p-4 border border-gold/15">
                        <div className="flex items-center gap-2 mb-1">
                          {r.source === "wikipedia" ? <Globe className="w-3.5 h-3.5 text-gold/60" /> : <BookOpen className="w-3.5 h-3.5 text-gold/60" />}
                          <span className="text-cream text-sm font-medium">{r.title}</span>
                          {r.author && <span className="text-cream-dim text-xs">by {r.author}</span>}
                        </div>
                        <p className="text-cream-dim text-xs">{r.extracted?.summary}</p>
                        {r.extracted?.mentalModels?.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {r.extracted.mentalModels.slice(0, 3).map((m: string, j: number) => (
                              <span key={j} className="text-xs px-2 py-0.5 rounded-full border border-gold/20 text-cream-dim bg-gold/5">{m}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* WIKIPEDIA */}
            {activeTab === "wikipedia" && (
              <div className="space-y-4">
                <label className="font-mono text-gold/60 text-xs uppercase tracking-widest block mb-2">Wikipedia URL</label>
                <input type="url" value={wikiUrl} onChange={e => setWikiUrl(e.target.value)}
                  placeholder="https://en.wikipedia.org/wiki/Thich_Nhat_Hanh"
                  className="w-full glass rounded-xl px-4 py-3 text-cream placeholder:text-cream-dim/40 text-sm outline-none focus:border-gold/40 border border-gold/15" />
                <p className="text-cream-dim/50 text-xs">Paste any English Wikipedia article URL. AI will extract cognitive knowledge from it.</p>
              </div>
            )}

            {/* YOUTUBE */}
            {activeTab === "youtube" && (
              <div className="space-y-4">
                <label className="font-mono text-gold/60 text-xs uppercase tracking-widest block mb-2">YouTube Video URL</label>
                <input type="url" value={youtubeUrl} onChange={e => setYoutubeUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full glass rounded-xl px-4 py-3 text-cream placeholder:text-cream-dim/40 text-sm outline-none focus:border-gold/40 border border-gold/15" />
                <div className="glass rounded-xl p-4 border border-gold/10 text-cream-dim text-xs space-y-1">
                  <div className="text-gold/70 font-mono uppercase text-xs tracking-widest mb-2">How it works</div>
                  <p>• AI fetches the video's transcript via YouTube's API</p>
                  <p>• Lectures, interviews, talks, debates are ideal sources</p>
                  <p>• Works best with videos that have auto-generated or uploaded captions</p>
                </div>
              </div>
            )}

            {/* WEB URL */}
            {activeTab === "url" && (
              <div className="space-y-4">
                <label className="font-mono text-gold/60 text-xs uppercase tracking-widest block mb-2">Web Page URL</label>
                <input type="url" value={webUrl} onChange={e => setWebUrl(e.target.value)}
                  placeholder="https://www.gutenberg.org/... or any article URL"
                  className="w-full glass rounded-xl px-4 py-3 text-cream placeholder:text-cream-dim/40 text-sm outline-none focus:border-gold/40 border border-gold/15" />
                <div className="glass rounded-xl p-4 border border-gold/10 text-cream-dim text-xs space-y-1">
                  <div className="text-gold/70 font-mono uppercase text-xs tracking-widest mb-2">Good sources</div>
                  <p>• <span className="text-gold/60">Project Gutenberg</span> — free public domain books (gutenberg.org)</p>
                  <p>• <span className="text-gold/60">Internet Archive</span> — archive.org/details/...</p>
                  <p>• <span className="text-gold/60">Stanford Encyclopedia of Philosophy</span> — plato.stanford.edu</p>
                  <p>• Blog posts, essays, academic articles</p>
                </div>
              </div>
            )}

            {/* FILE UPLOAD */}
            {activeTab === "file" && (
              <div className="space-y-4">
                <label className="font-mono text-gold/60 text-xs uppercase tracking-widest block mb-2">Upload Files</label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="glass rounded-xl border-2 border-dashed border-gold/20 hover:border-gold/40 transition-colors p-8 text-center cursor-pointer group"
                >
                  <Paperclip className="w-8 h-8 text-gold/30 mx-auto mb-3 group-hover:text-gold/60 transition-colors" />
                  <p className="text-cream-dim text-sm mb-1">Click to upload or drag files here</p>
                  <p className="text-cream-dim/40 text-xs">TXT, MD, PDF text layers · Max 5MB per file</p>
                </div>
                <input ref={fileInputRef} type="file" multiple accept=".txt,.md,.csv,.json" className="hidden"
                  onChange={e => setUploadedFiles(Array.from(e.target.files || []))} />
                {uploadedFiles.length > 0 && (
                  <div className="space-y-2">
                    {uploadedFiles.map((file, i) => (
                      <div key={i} className="flex items-center gap-3 glass rounded-xl px-4 py-3 border border-gold/15">
                        <FileText className="w-4 h-4 text-gold/60 flex-shrink-0" />
                        <span className="text-cream text-sm flex-1 truncate">{file.name}</span>
                        <span className="text-cream-dim/50 text-xs flex-shrink-0">{(file.size / 1024).toFixed(0)} KB</span>
                        <button onClick={() => setUploadedFiles(prev => prev.filter((_, j) => j !== i))}
                          className="text-cream-dim/40 hover:text-red-400 transition-colors flex-shrink-0">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* PASTE TEXT */}
            {activeTab === "text" && (
              <div className="space-y-4">
                <div>
                  <label className="font-mono text-gold/60 text-xs uppercase tracking-widest block mb-2">Source Title</label>
                  <input type="text" value={textTitle} onChange={e => setTextTitle(e.target.value)}
                    placeholder="e.g. 'Meditations — Marcus Aurelius Ch.5'"
                    className="w-full glass rounded-xl px-4 py-3 text-cream placeholder:text-cream-dim/40 text-sm outline-none focus:border-gold/40 border border-gold/15" />
                </div>
                <div>
                  <label className="font-mono text-gold/60 text-xs uppercase tracking-widest block mb-2">Content</label>
                  <textarea value={textContent} onChange={e => setTextContent(e.target.value)}
                    placeholder="Paste book excerpts, essays, interview transcripts, or any text that reveals the thinker's reasoning patterns and mental models..."
                    rows={10}
                    className="w-full glass rounded-xl px-4 py-3 text-cream placeholder:text-cream-dim/40 text-sm outline-none focus:border-gold/40 border border-gold/15 resize-none" />
                  <p className="text-cream-dim/50 text-xs mt-1">{textContent.length} chars · Ideal: 500–8000</p>
                </div>
              </div>
            )}

            {/* Error */}
            {status === "error" && (
              <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 rounded-xl p-4 mt-4">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                <p className="text-red-300 text-sm">Processing failed. Please try again.</p>
              </div>
            )}

            {/* Submit */}
            {status !== "success" && (
              <button onClick={handleSubmit} disabled={isSubmitDisabled}
                className="mt-5 w-full flex items-center justify-center gap-2 py-3.5 rounded-xl gradient-gold text-obsidian font-semibold text-sm hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                {status === "processing" ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />{activeTab === "auto" ? "Researching sources..." : "Extracting knowledge..."}</>
                ) : activeTab === "auto" ? (
                  <><Sparkles className="w-4 h-4" />Auto-Research Topic</>
                ) : (
                  <><ChevronRight className="w-4 h-4" />Extract &amp; Ingest</>
                )}
              </button>
            )}
            {status === "success" && activeTab === "auto" && (
              <button onClick={handleReset}
                className="mt-5 w-full py-3 rounded-xl border border-gold/25 text-gold text-sm font-medium hover:bg-gold/10 transition-all">
                Research Another Topic
              </button>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="mt-6 glass rounded-xl p-5 border border-gold/10">
          <h3 className="font-mono text-gold/60 text-xs uppercase tracking-widest mb-3">What gets extracted</h3>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Mental Models", desc: "Frameworks and decision tools" },
              { label: "Reasoning Patterns", desc: "Step-by-step thinking processes" },
              { label: "Core Principles", desc: "Fundamental beliefs and values" },
            ].map(({ label, desc }) => (
              <div key={label}>
                <div className="text-cream text-xs font-medium mb-1">{label}</div>
                <div className="text-cream-dim/60 text-xs">{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default KnowledgeIngestion;
