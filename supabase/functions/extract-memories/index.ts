import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { conversationId, agentId, userId, userSession } = await req.json();
    if (!conversationId || !agentId) throw new Error("conversationId and agentId required");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch conversation messages
    const { data: messages } = await supabase
      .from("messages")
      .select("role, content")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(50);

    if (!messages || messages.length < 2) {
      return new Response(JSON.stringify({ extracted: 0, reason: "not enough messages" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check existing memories to avoid duplicates
    const memoryFilter = userId
      ? { agent_id: agentId, user_id: userId }
      : { agent_id: agentId, user_session: userSession };

    const { data: existingMemories } = await supabase
      .from("agent_memories")
      .select("content")
      .match(memoryFilter)
      .order("created_at", { ascending: false })
      .limit(20);

    const existingSummary = (existingMemories || []).map(m => m.content).join("\n");

    // Use AI to extract memories
    const conversationText = messages
      .map((m: any) => `${m.role === "user" ? "User" : "Agent"}: ${m.content}`)
      .join("\n\n");

    const extractionPrompt = `Analyze this conversation and extract key facts about the USER (not the agent). 
Return a JSON array of memory objects. Each memory should capture something the agent should remember about this specific user for future conversations.

Categories:
- "fact": concrete facts (name, job, location, family)
- "preference": likes, dislikes, communication style preferences
- "topic": topics they're interested in or working on
- "insight": personal insights or breakthroughs they had
- "personal": emotional state, life situation, challenges

Rules:
- Only extract info about the USER, not general knowledge
- Each memory should be a single, clear sentence
- Score importance 0.0-1.0 (name=1.0, casual mention=0.3)
- Skip if no meaningful personal info was shared
- Avoid duplicating these existing memories: ${existingSummary || "none yet"}
- Return empty array [] if nothing new to remember
- Maximum 5 memories per conversation

Return ONLY valid JSON array, no markdown fences:
[{"content": "...", "memory_type": "fact|preference|topic|insight|personal", "importance_score": 0.0-1.0}]`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: extractionPrompt },
          { role: "user", content: conversationText },
        ],
      }),
    });

    if (!aiResponse.ok) {
      console.error("AI extraction failed:", aiResponse.status);
      return new Response(JSON.stringify({ extracted: 0, error: "AI extraction failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const raw = aiData.choices?.[0]?.message?.content?.trim() || "[]";
    
    // Parse — strip markdown fences if present
    const cleaned = raw.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
    let memories: any[] = [];
    try {
      memories = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse memories JSON:", cleaned);
      return new Response(JSON.stringify({ extracted: 0, error: "parse_failed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!Array.isArray(memories) || memories.length === 0) {
      return new Response(JSON.stringify({ extracted: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert memories
    const rows = memories.slice(0, 5).map((m: any) => ({
      agent_id: agentId,
      user_id: userId || null,
      user_session: userSession || null,
      memory_type: m.memory_type || "fact",
      content: m.content,
      importance_score: Math.min(1, Math.max(0, m.importance_score || 0.5)),
      source_conversation_id: conversationId,
    }));

    const { error } = await supabase.from("agent_memories").insert(rows);
    if (error) {
      console.error("Memory insert error:", error);
      throw error;
    }

    console.log(`Extracted ${rows.length} memories for agent ${agentId}`);

    return new Response(JSON.stringify({ extracted: rows.length, memories: rows.map(r => r.content) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("extract-memories error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
