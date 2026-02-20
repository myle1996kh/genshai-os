import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    // If Wikipedia URL, fetch the content
    if (sourceType === "wikipedia" && url) {
      try {
        const wikiTitle = url.split("/wiki/")[1];
        if (wikiTitle) {
          const wikiRes = await fetch(
            `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(wikiTitle)}`
          );
          const wikiData = await wikiRes.json();
          contentToProcess = wikiData.extract || "";
          
          // Also get full content
          const fullRes = await fetch(
            `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(wikiTitle)}&prop=extracts&explaintext=1&format=json`
          );
          const fullData = await fullRes.json();
          const pages = fullData.query?.pages;
          if (pages) {
            const pageId = Object.keys(pages)[0];
            contentToProcess = pages[pageId]?.extract?.slice(0, 8000) || contentToProcess;
          }
        }
      } catch (e) {
        console.error("Wikipedia fetch error:", e);
      }
    }

    if (!contentToProcess) {
      return new Response(
        JSON.stringify({ error: "No content to process" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use AI to extract mental models and reasoning patterns
    const extractionPrompt = `You are analyzing a text source to extract cognitive knowledge for a Cognitive OS agent profile.

The text is about or related to: "${title}"
Agent context: ${agentId}

Text content:
${contentToProcess.slice(0, 6000)}

Extract from this text:
1. KEY MENTAL MODELS: Specific frameworks, thinking tools, or decision-making patterns described or demonstrated (5-10 items)
2. REASONING PATTERNS: Step-by-step thinking processes shown in the text (3-7 items)
3. CORE PRINCIPLES: Fundamental beliefs or values expressed (5-10 items)
4. A 2-3 sentence summary of the key cognitive contributions of this source

Return as JSON with this structure:
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
        model: "google/gemini-3-flash-preview",
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
    const extracted = JSON.parse(aiData.choices[0].message.content);

    // Update the knowledge source record
    const updateData: any = {
      extracted_content: extracted.summary || contentToProcess.slice(0, 500),
      mental_models: extracted.mentalModels || [],
      reasoning_patterns: extracted.reasoningPatterns || [],
      status: "completed",
    };

    if (sourceId) {
      await supabase
        .from("knowledge_sources")
        .update(updateData)
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
