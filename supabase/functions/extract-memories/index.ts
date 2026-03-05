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

    // ─── Phase 0: Fetch conversation summary + recent messages ─────────
    const { data: existingSummary } = await supabase
      .from("conversation_summaries")
      .select("summary, message_count")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: messages } = await supabase
      .from("messages")
      .select("role, content, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(50);

    if (!messages || messages.length < 2) {
      return new Response(JSON.stringify({ extracted: 0, reason: "not enough messages" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use last N messages since last summary
    const summarizedCount = existingSummary?.message_count || 0;
    const newMessages = messages.slice(summarizedCount);
    if (newMessages.length < 2 && existingSummary) {
      return new Response(JSON.stringify({ extracted: 0, reason: "no new messages since last summary" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const messagesToProcess = newMessages.length >= 2 ? newMessages : messages;

    // ─── Phase 1: Summarize conversation ───────────────────────────────
    const conversationText = messagesToProcess
      .map((m: any) => `${m.role === "user" ? "User" : "Agent"}: ${m.content}`)
      .join("\n\n");

    const summaryInput = existingSummary?.summary
      ? `Previous summary:\n${existingSummary.summary}\n\nNew messages:\n${conversationText}`
      : conversationText;

    const summaryResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: `Summarize this conversation concisely (max 300 words). Focus on: key topics discussed, user's situation, decisions made, emotional tone. ${existingSummary?.summary ? "Integrate with the previous summary." : ""}`,
          },
          { role: "user", content: summaryInput },
        ],
      }),
    });

    if (summaryResponse.ok) {
      const summaryData = await summaryResponse.json();
      const summary = summaryData.choices?.[0]?.message?.content?.trim();
      if (summary) {
        await supabase.from("conversation_summaries").upsert(
          {
            conversation_id: conversationId,
            summary,
            message_count: messages.length,
            last_summarized_at: new Date().toISOString(),
          },
          { onConflict: "conversation_id" }
        );
      }
    }

    // ─── Phase 2: Extract new memories ─────────────────────────────────
    const memoryFilter = userId
      ? { agent_id: agentId, user_id: userId }
      : { agent_id: agentId, user_session: userSession };

    const { data: existingMemories } = await supabase
      .from("agent_memories")
      .select("id, content, memory_type, importance_score")
      .match(memoryFilter)
      .order("created_at", { ascending: false })
      .limit(30);

    const existingMemoriesList = (existingMemories || [])
      .map((m, i) => `[${i}] (${m.memory_type}, score:${m.importance_score}) ${m.content}`)
      .join("\n");

    // ─── Phase 3: Update Phase — ADD/UPDATE/DELETE/NOOP via tool calling ───
    const updatePrompt = `You are a memory management system for an AI agent. Analyze this conversation and manage the user's memory entries.

EXISTING MEMORIES:
${existingMemoriesList || "None yet"}

RECENT CONVERSATION:
${conversationText}

Your job: Decide what memory operations to perform. You MUST use the manage_memories tool to execute operations.

Rules:
- ADD: New facts, preferences, insights about the USER (not general knowledge)
- UPDATE: If existing memory is outdated or needs refinement (reference by index)
- DELETE: If a memory is contradicted or no longer true (reference by index)
- NOOP: If nothing meaningful to change
- Max 5 operations per call
- Each memory content should be a single clear sentence
- Score importance 0.0-1.0 (name=1.0, casual mention=0.3)
- Categories: fact, preference, topic, insight, personal`;

    const toolCallResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: updatePrompt },
          { role: "user", content: "Analyze the conversation and manage memories using the tool." },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "manage_memories",
              description: "Execute memory operations: ADD new memories, UPDATE existing ones, DELETE outdated ones, or NOOP.",
              parameters: {
                type: "object",
                properties: {
                  operations: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        action: { type: "string", enum: ["ADD", "UPDATE", "DELETE", "NOOP"] },
                        index: { type: "integer", description: "Index of existing memory (for UPDATE/DELETE)" },
                        content: { type: "string", description: "Memory content (for ADD/UPDATE)" },
                        memory_type: { type: "string", enum: ["fact", "preference", "topic", "insight", "personal"] },
                        importance_score: { type: "number", minimum: 0, maximum: 1 },
                      },
                      required: ["action"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["operations"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "manage_memories" } },
      }),
    });

    if (!toolCallResponse.ok) {
      console.error("Memory update tool call failed:", toolCallResponse.status);
      return new Response(JSON.stringify({ extracted: 0, error: "tool_call_failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const toolData = await toolCallResponse.json();
    const toolCall = toolData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ extracted: 0, reason: "no_tool_call" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let operations: any[] = [];
    try {
      const args = JSON.parse(toolCall.function.arguments);
      operations = args.operations || [];
    } catch {
      console.error("Failed to parse tool call arguments");
      return new Response(JSON.stringify({ extracted: 0, error: "parse_failed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Execute operations
    let added = 0, updated = 0, deleted = 0;
    const existingArr = existingMemories || [];

    for (const op of operations.slice(0, 5)) {
      try {
        switch (op.action) {
          case "ADD":
            if (op.content) {
              await supabase.from("agent_memories").insert({
                agent_id: agentId,
                user_id: userId || null,
                user_session: userSession || null,
                memory_type: op.memory_type || "fact",
                content: op.content,
                importance_score: Math.min(1, Math.max(0, op.importance_score || 0.5)),
                source_conversation_id: conversationId,
              });
              added++;
            }
            break;

          case "UPDATE":
            if (typeof op.index === "number" && op.index < existingArr.length && op.content) {
              const target = existingArr[op.index];
              await supabase
                .from("agent_memories")
                .update({
                  content: op.content,
                  memory_type: op.memory_type || target.memory_type,
                  importance_score: op.importance_score ?? target.importance_score,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", target.id);
              updated++;
            }
            break;

          case "DELETE":
            if (typeof op.index === "number" && op.index < existingArr.length) {
              const target = existingArr[op.index];
              await supabase.from("agent_memories").delete().eq("id", target.id);
              deleted++;
            }
            break;

          case "NOOP":
          default:
            break;
        }
      } catch (e) {
        console.error(`Memory operation ${op.action} failed:`, e);
      }
    }

    console.log(`Memory update: +${added} ~${updated} -${deleted} for agent ${agentId}`);

    return new Response(
      JSON.stringify({ added, updated, deleted, total_ops: operations.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("extract-memories error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
