import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Fetch plain text from a URL (for web pages, Gutenberg, etc.)
async function fetchUrlContent(url: string): Promise<string> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; CognitiveOS/1.0)" } });
    const html = await res.text();
    // Strip HTML tags and collapse whitespace
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
      .replace(/&nbsp;/g, " ").replace(/&#\d+;/g, " ")
      .replace(/\s{2,}/g, " ")
      .trim();
    return text.slice(0, 10000);
  } catch {
    return "";
  }
}

// Fetch YouTube transcript via Invidious API (no API key required)
async function fetchYoutubeTranscript(videoId: string): Promise<string> {
  const instances = [
    "https://inv.tux.pizza",
    "https://invidious.fdn.fr",
    "https://invidious.privacydev.net",
  ];
  for (const base of instances) {
    try {
      const res = await fetch(`${base}/api/v1/captions/${videoId}`, {
        headers: { "User-Agent": "Mozilla/5.0" },
      });
      if (!res.ok) continue;
      const data = await res.json();
      // Find English captions
      const cap = data.captions?.find((c: any) =>
        c.languageCode?.startsWith("en") || c.label?.toLowerCase().includes("english")
      ) || data.captions?.[0];
      if (!cap) continue;

      // Fetch the VTT/SRT
      const captionRes = await fetch(`${base}${cap.url}`, { headers: { "User-Agent": "Mozilla/5.0" } });
      if (!captionRes.ok) continue;
      const captionText = await captionRes.text();

      // Strip VTT/SRT timestamps and tags
      const transcript = captionText
        .replace(/WEBVTT\n*/i, "")
        .replace(/\d+:\d+:\d+\.\d+ --> .+/g, "")
        .replace(/<[^>]+>/g, "")
        .replace(/^\d+\s*$/gm, "")
        .replace(/\n{2,}/g, "\n")
        .trim();

      if (transcript.length > 100) return transcript.slice(0, 10000);
    } catch {
      continue;
    }
  }

  // Fallback: fetch video info as context
  try {
    const infoRes = await fetch(`https://inv.tux.pizza/api/v1/videos/${videoId}`);
    if (infoRes.ok) {
      const info = await infoRes.json();
      return `Title: ${info.title}\nAuthor: ${info.author}\nDescription: ${info.description?.slice(0, 3000) || ""}`;
    }
  } catch {}

  return "";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { agentId, sourceType, title, url, textContent, sourceId } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    let contentToProcess = textContent || "";

    // ── Wikipedia ─────────────────────────────────────────────────────────────
    if (sourceType === "wikipedia" && url) {
      try {
        const wikiTitle = url.split("/wiki/")[1];
        if (wikiTitle) {
          const fullRes = await fetch(
            `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(wikiTitle)}&prop=extracts&explaintext=1&format=json`
          );
          const fullData = await fullRes.json();
          const pages = fullData.query?.pages;
          if (pages) {
            const pageId = Object.keys(pages)[0];
            contentToProcess = pages[pageId]?.extract?.slice(0, 10000) || contentToProcess;
          }
        }
      } catch (e) {
        console.error("Wikipedia fetch error:", e);
      }
    }

    // ── YouTube ───────────────────────────────────────────────────────────────
    if (sourceType === "youtube" && url) {
      const ytMatch = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
      if (ytMatch) {
        contentToProcess = await fetchYoutubeTranscript(ytMatch[1]);
        if (!contentToProcess) {
          return new Response(JSON.stringify({ error: "Could not fetch transcript. The video may not have captions." }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    // ── Generic URL ───────────────────────────────────────────────────────────
    if (sourceType === "url" && url) {
      contentToProcess = await fetchUrlContent(url);
      if (!contentToProcess || contentToProcess.length < 100) {
        return new Response(JSON.stringify({ error: "Could not extract meaningful text from URL. Try pasting the text directly." }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (!contentToProcess) {
      return new Response(
        JSON.stringify({ error: "No content to process" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── AI Extraction ─────────────────────────────────────────────────────────
    const extractionPrompt = `You are analyzing a text source to extract cognitive knowledge for a Cognitive OS agent profile.

The text is about or related to: "${title}"
Agent context: ${agentId}
Source type: ${sourceType}

Text content:
${contentToProcess.slice(0, 7000)}

Extract from this text:
1. KEY MENTAL MODELS: Specific frameworks, thinking tools, or decision-making patterns (5-10 items)
2. REASONING PATTERNS: Step-by-step thinking processes shown in the text (3-7 items)
3. CORE PRINCIPLES: Fundamental beliefs or values expressed (5-10 items)
4. A 2-3 sentence summary of the key cognitive contributions of this source

Return as JSON:
{
  "mentalModels": ["model 1", "model 2", ...],
  "reasoningPatterns": ["pattern 1", "pattern 2", ...],
  "corePrinciples": ["principle 1", ...],
  "summary": "2-3 sentence summary"
}`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a precise cognitive knowledge extractor. Always return valid JSON." },
          { role: "user", content: extractionPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiRes.ok) {
      const status = aiRes.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI error: ${status}`);
    }

    const aiData = await aiRes.json();
    let rawContent = aiData.choices[0].message.content;
    rawContent = rawContent.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
    const extracted = JSON.parse(rawContent);

    // Update the knowledge source record
    if (sourceId) {
      await supabase
        .from("knowledge_sources")
        .update({
          extracted_content: extracted.summary || contentToProcess.slice(0, 500),
          mental_models: extracted.mentalModels || [],
          reasoning_patterns: extracted.reasoningPatterns || [],
          status: "completed",
        })
        .eq("id", sourceId);
    }

    return new Response(
      JSON.stringify({ success: true, extracted }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("ingest-knowledge error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
