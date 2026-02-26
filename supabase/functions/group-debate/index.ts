import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Minimal agent system prompts for group context
const agentPersonalities: Record<string, string> = {
  "thich-nhat-hanh": "You are Thich Nhat Hanh. Respond with mindful compassion, present-moment awareness, and gentle wisdom. Speak poetically, use breathing metaphors, and invite stillness. Address other thinkers respectfully but through your lens of interbeing.",
  "elon-musk": "You are Elon Musk. Think from first principles, challenge assumptions, demand 10x thinking. Be blunt, reference physics and engineering. Push back on incremental thinking. Engage with other thinkers' ideas by finding the leverage points.",
  "charlie-munger": "You are Charlie Munger. Apply your latticework of mental models. Identify incentives, invert problems, spot psychological biases. Be witty and blunt. Engage with other thinkers by naming the biases in their reasoning.",
  "naval-ravikant": "You are Naval Ravikant. Speak in compressed principles. Identify specific knowledge and leverage. Distinguish status games from wealth games. Engage with other thinkers philosophically, finding the deeper principle beneath their point.",
  "marcus-aurelius": "You are Marcus Aurelius. Apply Stoic philosophy — what is within our control? What does virtue demand? Be measured, honest, sometimes self-admonishing. Engage with other thinkers by asking what is truly essential in their argument.",
  "nikola-tesla": "You are Nikola Tesla. Think in systems of energy and resonance. Visualize problems completely in your mind. Find the underlying principle. Engage with other thinkers by identifying the hidden frequency — the natural solution in the physics of the problem.",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { action, sessionId, topic, agentIds, userMessage, userId, userSession } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ─── CREATE SESSION ───────────────────────────────────────────────────
    if (action === "create") {
      if (!topic || !agentIds || agentIds.length < 2) {
        throw new Error("Need topic and at least 2 agents");
      }

      const { data: session, error: sessErr } = await supabase
        .from("group_sessions")
        .insert({
          topic,
          user_id: userId || null,
          user_session: userSession,
          max_turns: agentIds.length * 3, // 3 rounds
        })
        .select("id")
        .single();
      if (sessErr) throw sessErr;

      // Insert agents with turn order
      const agentRows = agentIds.map((id: string, i: number) => ({
        session_id: session.id,
        agent_id: id,
        agent_name: id.split("-").map((w: string) => w[0].toUpperCase() + w.slice(1)).join(" "),
        turn_order: i,
      }));

      await supabase.from("group_session_agents").insert(agentRows);

      // Insert topic as system message
      await supabase.from("group_messages").insert({
        session_id: session.id,
        role: "system",
        content: `Debate topic: ${topic}`,
        turn_number: 0,
      });

      return new Response(JSON.stringify({ sessionId: session.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── NEXT TURN ────────────────────────────────────────────────────────
    if (action === "next_turn") {
      if (!sessionId) throw new Error("sessionId required");

      // Get session info
      const { data: session } = await supabase
        .from("group_sessions")
        .select("*")
        .eq("id", sessionId)
        .single();
      if (!session) throw new Error("Session not found");
      if (session.status === "completed") {
        return new Response(JSON.stringify({ done: true, reason: "completed" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // If user sent a message, save it first
      if (userMessage) {
        await supabase.from("group_messages").insert({
          session_id: sessionId,
          role: "user",
          content: userMessage,
          turn_number: session.current_turn,
        });
      }

      // Get agents in order
      const { data: agents } = await supabase
        .from("group_session_agents")
        .select("*")
        .eq("session_id", sessionId)
        .order("turn_order");
      if (!agents || agents.length === 0) throw new Error("No agents in session");

      // Determine which agent speaks next
      const nextTurn = session.current_turn + 1;
      const agentIndex = (nextTurn - 1) % agents.length;
      const currentAgent = agents[agentIndex];

      // Check if we've exceeded max turns
      if (nextTurn > session.max_turns) {
        await supabase
          .from("group_sessions")
          .update({ status: "completed" })
          .eq("id", sessionId);
        return new Response(JSON.stringify({ done: true, reason: "max_turns" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get all previous messages for context
      const { data: history } = await supabase
        .from("group_messages")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true })
        .limit(50);

      // Build the prompt for this agent
      const personality = agentPersonalities[currentAgent.agent_id] ||
        `You are ${currentAgent.agent_name}. Engage thoughtfully in this group debate.`;

      const otherAgents = agents.filter((a: any) => a.agent_id !== currentAgent.agent_id)
        .map((a: any) => a.agent_name).join(", ");

      const systemPrompt = `${personality}

You are in a group debate with: ${otherAgents}. A human moderator posed the topic.

Rules:
- Keep responses concise (2-4 paragraphs max)
- Directly engage with what others have said — agree, disagree, build upon
- Stay in character with your authentic thinking style
- Address other thinkers by name when responding to their points
- Be substantive, not just polite — real intellectual engagement
- If the user/moderator asks a question, address it from your perspective`;

      const aiMessages = [
        { role: "system", content: systemPrompt },
        ...(history || []).map((m: any) => {
          if (m.role === "system") return { role: "system", content: m.content };
          if (m.role === "user") return { role: "user", content: `[Moderator]: ${m.content}` };
          return { role: "user", content: `[${m.agent_name || "Agent"}]: ${m.content}` };
        }),
        { role: "user", content: `It is now your turn to speak, ${currentAgent.agent_name}. Respond to the discussion so far.` },
      ];

      // Call AI
      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: aiMessages,
          stream: true,
        }),
      });

      if (!aiResponse.ok) {
        const status = aiResponse.status;
        if (status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (status === 402) {
          return new Response(JSON.stringify({ error: "AI credits exhausted" }), {
            status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        throw new Error(`AI error: ${status}`);
      }

      // Update turn counter
      await supabase
        .from("group_sessions")
        .update({ current_turn: nextTurn })
        .eq("id", sessionId);

      // Stream response, collecting content to save
      const decoder = new TextDecoder();
      let fullContent = "";

      const transformStream = new TransformStream({
        transform(chunk, controller) {
          const text = decoder.decode(chunk);
          const lines = text.split("\n");
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const jsonStr = line.slice(6).trim();
            if (jsonStr === "[DONE]") continue;
            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) fullContent += content;
            } catch {}
          }
          controller.enqueue(chunk);
        },
        async flush() {
          if (fullContent.trim()) {
            await supabase.from("group_messages").insert({
              session_id: sessionId,
              agent_id: currentAgent.agent_id,
              agent_name: currentAgent.agent_name,
              role: "assistant",
              content: fullContent.trim(),
              turn_number: nextTurn,
            });
          }
        },
      });

      const responseStream = aiResponse.body!.pipeThrough(transformStream);

      return new Response(responseStream, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/event-stream",
          "X-Agent-Id": currentAgent.agent_id,
          "X-Agent-Name": currentAgent.agent_name,
          "X-Turn-Number": String(nextTurn),
          "X-Session-Id": sessionId,
        },
      });
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (e) {
    console.error("group-debate error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
