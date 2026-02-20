import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { name, type = "person", extra = "" } = await req.json();

    if (!name) {
      return new Response(JSON.stringify({ error: "name is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Step 1: Gather Wikipedia context
    let wikiContext = "";
    try {
      const searchRes = await fetch(
        `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(name)}&srlimit=1&format=json`
      );
      const searchData = await searchRes.json();
      const title = searchData?.query?.search?.[0]?.title;
      if (title) {
        const fullRes = await fetch(
          `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=extracts&explaintext=1&exintro=1&format=json`
        );
        const fullData = await fullRes.json();
        const pages = fullData?.query?.pages;
        const pageId = Object.keys(pages || {})[0];
        wikiContext = pages?.[pageId]?.extract?.slice(0, 6000) || "";
      }
    } catch (e) {
      console.error("Wikipedia fetch failed:", e);
    }

    // Step 2: Generate the full 7-layer Cognitive OS blueprint using AI
    const prompt = `You are building a "Cognitive OS" — a deep psychological and philosophical profile of a real person or book's author.

${type === "book"
  ? `Build this for the key thinker/author behind: "${name}"${extra ? `\nAdditional context: ${extra}` : ""}`
  : `Build this for: "${name}"${extra ? `\nAdditional context: ${extra}` : ""}`
}

${wikiContext ? `Wikipedia Context:\n${wikiContext.slice(0, 4000)}` : ""}

Generate a complete 7-layer Cognitive OS blueprint. Be specific, accurate, and deep — draw from their actual documented beliefs, writings, and decisions.

Return valid JSON with EXACTLY these fields:
{
  "name": "Full Name",
  "era": "birth year – death year or 'present'",
  "domain": "Primary Domain & Specialty (max 4 words)",
  "tagline": "One vivid sentence capturing their essence and what makes them unique (max 20 words)",
  "accentColor": "HSL values only e.g. '200 80% 52%'",
  "conversationStarters": ["Question 1", "Question 2", "Question 3"],
  "layer_core_values": "Deep description of their core values and ethical foundation (200-400 words)",
  "layer_mental_models": "Their key mental frameworks and decision-making lenses with examples (200-400 words)",
  "layer_reasoning_patterns": "Step-by-step how they think through problems (200-400 words)",
  "layer_emotional_stance": "How they relate to emotions, adversity, joy, failure (200-400 words)",
  "layer_language_dna": "Their voice, tone, vocabulary, rhetorical style, key phrases they use (200-400 words)",
  "layer_decision_history": "Key life decisions that reveal their values and reasoning in action (200-400 words)",
  "layer_knowledge_base": "Core domains of expertise, key works, key collaborators, key influences (200-400 words)"
}`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: "You are an expert in psychology, philosophy, and intellectual biography. Return only valid JSON." },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (aiRes.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit reached. Please wait a moment." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (aiRes.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!aiRes.ok) throw new Error(`AI error: ${aiRes.status}`);

    const aiData = await aiRes.json();
    const blueprint = JSON.parse(aiData.choices[0].message.content);

    return new Response(
      JSON.stringify({ success: true, blueprint }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("auto-create-agent error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
