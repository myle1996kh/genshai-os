import { useState, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  Globe,
  Upload,
  CheckCircle,
  AlertCircle,
  Loader2,
  ChevronRight,
  FileText,
} from "lucide-react";
import { agents } from "@/data/agents";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type SourceType = "wikipedia" | "text";

const KnowledgeIngestion = () => {
  const { agentId } = useParams<{ agentId: string }>();
  const agent = agents.find((a) => a.id === agentId);
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<SourceType>("wikipedia");
  const [wikiUrl, setWikiUrl] = useState("");
  const [textTitle, setTextTitle] = useState("");
  const [textContent, setTextContent] = useState("");
  const [status, setStatus] = useState<"idle" | "processing" | "success" | "error">("idle");
  const [extractedData, setExtractedData] = useState<any>(null);

  const handleWikipediaIngest = async () => {
    if (!wikiUrl.trim() || !agentId) return;

    const isWiki = wikiUrl.includes("wikipedia.org/wiki/");
    if (!isWiki) {
      toast.error("Please enter a valid Wikipedia URL (e.g. https://en.wikipedia.org/wiki/...)");
      return;
    }

    setStatus("processing");

    // Extract title from URL
    const titleFromUrl = wikiUrl.split("/wiki/")[1]?.replace(/_/g, " ") || "Wikipedia Source";

    // Create a placeholder record first
    const { data: sourceRecord, error: insertError } = await supabase
      .from("knowledge_sources")
      .insert({
        agent_id: agentId,
        source_type: "wikipedia",
        title: titleFromUrl,
        url: wikiUrl,
        status: "processing",
      })
      .select("id")
      .single();

    if (insertError) {
      toast.error("Failed to create knowledge source");
      setStatus("error");
      return;
    }

    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ingest-knowledge`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            agentId,
            sourceType: "wikipedia",
            title: titleFromUrl,
            url: wikiUrl,
            sourceId: sourceRecord.id,
          }),
        }
      );

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Processing failed");
      }

      const data = await res.json();
      setExtractedData(data.extracted);
      setStatus("success");
      toast.success("Knowledge source ingested successfully!");
    } catch (e: any) {
      await supabase
        .from("knowledge_sources")
        .update({ status: "error" })
        .eq("id", sourceRecord.id);
      setStatus("error");
      toast.error(e.message || "Failed to process source");
    }
  };

  const handleTextIngest = async () => {
    if (!textTitle.trim() || !textContent.trim() || !agentId) return;
    setStatus("processing");

    const { data: sourceRecord, error: insertError } = await supabase
      .from("knowledge_sources")
      .insert({
        agent_id: agentId,
        source_type: "text",
        title: textTitle,
        status: "processing",
      })
      .select("id")
      .single();

    if (insertError) {
      toast.error("Failed to create knowledge source");
      setStatus("error");
      return;
    }

    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ingest-knowledge`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            agentId,
            sourceType: "text",
            title: textTitle,
            textContent,
            sourceId: sourceRecord.id,
          }),
        }
      );

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Processing failed");
      }

      const data = await res.json();
      setExtractedData(data.extracted);
      setStatus("success");
      toast.success("Knowledge source ingested successfully!");
    } catch (e: any) {
      await supabase
        .from("knowledge_sources")
        .update({ status: "error" })
        .eq("id", sourceRecord.id);
      setStatus("error");
      toast.error(e.message || "Failed to process source");
    }
  };

  const handleSubmit = () => {
    if (activeTab === "wikipedia") handleWikipediaIngest();
    else handleTextIngest();
  };

  const handleReset = () => {
    setStatus("idle");
    setExtractedData(null);
    setWikiUrl("");
    setTextTitle("");
    setTextContent("");
  };

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

  return (
    <div className="min-h-screen bg-background pt-24 pb-20">
      <div className="max-w-3xl mx-auto px-6">
        {/* Back nav */}
        <Link
          to={`/agent/${agent.id}`}
          className="inline-flex items-center gap-1.5 text-cream-dim hover:text-cream transition-colors text-sm mb-10"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to {agent.name}
        </Link>

        {/* Header */}
        <div className="mb-10">
          <div className="os-tag inline-block mb-5">Knowledge Ingestion</div>
          <h1 className="font-display text-4xl text-cream mb-3">
            Enrich <span className="text-gradient-gold italic">{agent.name}'s</span> Cognitive OS
          </h1>
          <p className="text-cream-dim text-base leading-relaxed">
            Add source materials — Wikipedia articles, books, essays, or any text — and our AI will
            extract the mental models and reasoning patterns embedded within them, deepening the
            agent's cognitive blueprint.
          </p>
        </div>

        {/* Success state */}
        {status === "success" && extractedData ? (
          <div className="space-y-5">
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
                    Mental Models Extracted ({extractedData.mentalModels.length})
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {extractedData.mentalModels.map((m: string, i: number) => (
                      <span key={i} className="px-3 py-1.5 rounded-full border border-gold/20 text-cream-dim text-xs bg-gold/5">
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {extractedData.reasoningPatterns?.length > 0 && (
                <div className="mb-6">
                  <div className="font-mono text-gold/60 text-xs uppercase tracking-widest mb-3">
                    Reasoning Patterns ({extractedData.reasoningPatterns.length})
                  </div>
                  <div className="space-y-2">
                    {extractedData.reasoningPatterns.map((p: string, i: number) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="font-mono text-gold/40 text-xs mt-0.5">{String(i + 1).padStart(2, "0")}</span>
                        <p className="text-cream-dim text-sm">{p}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleReset}
                className="flex-1 py-3 rounded-xl border border-gold/25 text-gold text-sm font-medium hover:bg-gold/10 transition-all duration-200"
              >
                Add Another Source
              </button>
              <Link
                to={`/agent/${agent.id}`}
                className="flex-1 py-3 rounded-xl gradient-gold text-obsidian text-sm font-semibold text-center hover:opacity-90 transition-all duration-200"
              >
                View Agent Profile
              </Link>
            </div>
          </div>
        ) : (
          <div className="glass-strong rounded-2xl border border-gold/10 overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-gold/10">
              {[
                { id: "wikipedia" as SourceType, label: "Wikipedia URL", icon: Globe },
                { id: "text" as SourceType, label: "Paste Text", icon: FileText },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-all duration-200 flex-1 justify-center ${
                    activeTab === id
                      ? "text-gold border-b-2 border-gold bg-gold/5"
                      : "text-cream-dim hover:text-cream"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>

            <div className="p-8">
              {activeTab === "wikipedia" ? (
                <div className="space-y-5">
                  <div>
                    <label className="font-mono text-gold/60 text-xs uppercase tracking-widest block mb-3">
                      Wikipedia URL
                    </label>
                    <input
                      type="url"
                      value={wikiUrl}
                      onChange={(e) => setWikiUrl(e.target.value)}
                      placeholder="https://en.wikipedia.org/wiki/Thich_Nhat_Hanh"
                      className="w-full glass rounded-xl px-4 py-3 text-cream placeholder:text-cream-dim/40 text-sm outline-none focus:border-gold/40 transition-colors duration-200 border border-gold/15"
                    />
                    <p className="text-cream-dim/50 text-xs mt-2">
                      Paste any English Wikipedia article URL. Our AI will fetch and extract the cognitive knowledge within.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  <div>
                    <label className="font-mono text-gold/60 text-xs uppercase tracking-widest block mb-3">
                      Source Title
                    </label>
                    <input
                      type="text"
                      value={textTitle}
                      onChange={(e) => setTextTitle(e.target.value)}
                      placeholder="e.g. 'The Art of War - Sun Tzu' or 'Meditation Chapter 2'"
                      className="w-full glass rounded-xl px-4 py-3 text-cream placeholder:text-cream-dim/40 text-sm outline-none focus:border-gold/40 transition-colors duration-200 border border-gold/15"
                    />
                  </div>
                  <div>
                    <label className="font-mono text-gold/60 text-xs uppercase tracking-widest block mb-3">
                      Content
                    </label>
                    <textarea
                      value={textContent}
                      onChange={(e) => setTextContent(e.target.value)}
                      placeholder="Paste book excerpts, essays, interview transcripts, or any text that reveals the thinker's reasoning patterns and mental models..."
                      rows={10}
                      className="w-full glass rounded-xl px-4 py-3 text-cream placeholder:text-cream-dim/40 text-sm outline-none focus:border-gold/40 transition-colors duration-200 border border-gold/15 resize-none leading-relaxed"
                    />
                    <p className="text-cream-dim/50 text-xs mt-2">
                      {textContent.length} characters · Ideal: 500–8000 characters for best extraction
                    </p>
                  </div>
                </div>
              )}

              {/* Error state */}
              {status === "error" && (
                <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 rounded-xl p-4 mt-5">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                  <p className="text-red-300 text-sm">Processing failed. Please try again.</p>
                </div>
              )}

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={
                  status === "processing" ||
                  (activeTab === "wikipedia" ? !wikiUrl.trim() : !textTitle.trim() || !textContent.trim())
                }
                className="mt-6 w-full flex items-center justify-center gap-2 py-3.5 rounded-xl gradient-gold text-obsidian font-semibold text-sm hover:opacity-90 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {status === "processing" ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Extracting knowledge...
                  </>
                ) : (
                  <>
                    <ChevronRight className="w-4 h-4" />
                    Extract & Ingest
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Info section */}
        <div className="mt-8 glass rounded-xl p-6 border border-gold/10">
          <h3 className="font-mono text-gold/60 text-xs uppercase tracking-widest mb-4">
            What gets extracted
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: "Mental Models", desc: "Frameworks and decision-making tools" },
              { label: "Reasoning Patterns", desc: "Step-by-step thinking processes" },
              { label: "Core Principles", desc: "Fundamental beliefs and values" },
            ].map(({ label, desc }) => (
              <div key={label}>
                <div className="text-cream text-sm font-medium mb-1">{label}</div>
                <div className="text-cream-dim text-xs">{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default KnowledgeIngestion;
