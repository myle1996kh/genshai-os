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
    const { agentId, topic, sources = ["wikipedia"] } = await req.json();

    if (!agentId || !topic) {
      return new Response(JSON.stringify({ error: "agentId and topic are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const results: any[] = [];

    // 1. Wikipedia research
    if (sources.includes("wikipedia")) {
      try {
        const searchRes = await fetch(
          `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(topic)}&srlimit=3&format=json`
        );
        const searchData = await searchRes.json();
        const articles = searchData?.query?.search || [];

        for (const article of articles.slice(0, 2)) {
          const title = article.title;
          const fullRes = await fetch(
            `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=extracts&explaintext=1&format=json`
          );
          const fullData = await fullRes.json();
          const pages = fullData?.query?.pages;
          const pageId = Object.keys(pages || {})[0];
          const content = pages?.[pageId]?.extract?.slice(0, 7000) || "";

          if (content.length < 200) continue;

          const { data: sourceRecord } = await supabase
            .from("knowledge_sources")
            .insert({
              agent_id: agentId,
              source_type: "wikipedia",
              title: `[Auto] ${title}`,
              url: `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`,
              status: "processing",
            })
            .select("id")
            .single();

          const extracted = await extractKnowledge(content, title, agentId, LOVABLE_API_KEY);

          if (sourceRecord && extracted) {
            await supabase.from("knowledge_sources").update({
              extracted_content: extracted.summary,
              mental_models: extracted.mentalModels,
              reasoning_patterns: extracted.reasoningPatterns,
              status: "completed",
            }).eq("id", sourceRecord.id);

            results.push({ source: "wikipedia", title, extracted });
          }
        }
      } catch (e) {
        console.error("Wikipedia research error:", e);
      }
    }

    // 2. Open Library book search
    if (sources.includes("books")) {
      try {
        const bookSearch = await fetch(
          `https://openlibrary.org/search.json?q=${encodeURIComponent(topic)}&fields=title,author_name,key,first_sentence&limit=3`
        );
        const bookData = await bookSearch.json();
        const books = bookData?.docs || [];

        for (const book of books.slice(0, 2)) {
          const title = book.title;
          const author = book.author_name?.[0] || "Unknown";
          const firstSentence = book.first_sentence?.value || "";
          const bookKey = book.key;
          let description = firstSentence;

          if (bookKey) {
            try {
              const descRes = await fetch(`https://openlibrary.org${bookKey}.json`);
              const descData = await descRes.json();
              const desc = descData?.description;
              if (typeof desc === "string") description = desc.slice(0, 3000);
              else if (desc?.value) description = desc.value.slice(0, 3000);
            } catch (_) { /* ignore */ }
          }

          if (!description || description.length < 100) continue;

          const content = `Book: "${title}" by ${author}\n\n${description}`;

          const { data: sourceRecord } = await supabase
            .from("knowledge_sources")
            .insert({
              agent_id: agentId,
              source_type: "book",
              title: `[Auto] ${title} — ${author}`,
              status: "processing",
            })
            .select("id")
            .single();

          const extracted = await extractKnowledge(content, `${title} by ${author}`, agentId, LOVABLE_API_KEY);

          if (sourceRecord && extracted) {
            await supabase.from("knowledge_sources").update({
              extracted_content: extracted.summary,
              mental_models: extracted.mentalModels,
              reasoning_patterns: extracted.reasoningPatterns,
              status: "completed",
            }).eq("id", sourceRecord.id);

            results.push({ source: "books", title, author, extracted });
          }
        }
      } catch (e) {
        console.error("Book research error:", e);
      }
    }

    return new Response(
      JSON.stringify({ success: true, sourcesProcessed: results.length, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("auto-research error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function extractKnowledge(content: string, title: string, agentId: string, apiKey: string) {
  try {
    const prompt = `Analyze this text to extract cognitive knowledge for a Cognitive OS agent.
Context: "${title}" | Agent: ${agentId}

Text:
${content.slice(0, 5000)}

Extract:
1. KEY MENTAL MODELS (5-8 items)
2. REASONING PATTERNS (3-5 items)
3. CORE PRINCIPLES (4-8 items)
4. A 2-sentence summary

Return JSON: { "mentalModels": [], "reasoningPatterns": [], "corePrinciples": [], "summary": "" }`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a cognitive knowledge extractor. Return valid JSON only." },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (res.status === 429) { console.warn("Rate limit:", title); return null; }
    if (!res.ok) return null;

    const data = await res.json();
    return JSON.parse(data.choices[0].message.content);
  } catch {
    return null;
  }
}
