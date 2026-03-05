import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { agentId, agentName, domain, cognitiveOS } = await req.json();
    if (!agentId || !domain) throw new Error("agentId and domain required");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch existing skills to avoid duplicates
    const { data: existingSkills } = await supabase
      .from("agent_skills")
      .select("name")
      .eq("is_active", true);

    const existingNames = (existingSkills || []).map((s: any) => s.name);

    const prompt = `Given an AI agent with the following profile, suggest 3-5 specialized skills/tools that would enhance their capabilities.

Agent: ${agentName || "Unknown"}
Domain: ${domain}
${cognitiveOS ? `Cognitive OS: ${JSON.stringify(cognitiveOS)}` : ""}

Existing skills in system: ${existingNames.join(", ") || "none"}

For each skill, provide:
- name: short tool name (snake_case)
- description: what the tool does (1-2 sentences)
- skill_type: one of "builtin", "web_search", "calculator", "code_exec", "data_analysis", "custom"
- tool_schema: JSON schema for the tool parameters

Return ONLY the skills that would be uniquely valuable for this agent's domain. Don't duplicate existing skills.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: prompt },
          { role: "user", content: "Generate skills for this agent." },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "create_skills",
              description: "Create skills for the agent",
              parameters: {
                type: "object",
                properties: {
                  skills: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        description: { type: "string" },
                        skill_type: { type: "string", enum: ["builtin", "web_search", "calculator", "code_exec", "data_analysis", "custom"] },
                        tool_schema: { type: "object" },
                      },
                      required: ["name", "description", "skill_type"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["skills"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "create_skills" } },
      }),
    });

    if (!aiResponse.ok) {
      throw new Error(`AI call failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call returned");

    const { skills } = JSON.parse(toolCall.function.arguments);
    if (!skills || !Array.isArray(skills)) throw new Error("Invalid skills format");

    // Insert skills and assignments
    const createdSkills: any[] = [];
    for (const skill of skills.slice(0, 5)) {
      // Check if skill already exists
      if (existingNames.includes(skill.name)) continue;

      const { data: newSkill, error } = await supabase
        .from("agent_skills")
        .insert({
          name: skill.name,
          description: skill.description,
          skill_type: skill.skill_type || "custom",
          tool_schema: skill.tool_schema || {},
        })
        .select("id, name")
        .single();

      if (newSkill && !error) {
        // Assign to agent
        await supabase.from("agent_skill_assignments").insert({
          agent_id: agentId,
          skill_id: newSkill.id,
        });
        createdSkills.push(newSkill);
      }
    }

    return new Response(
      JSON.stringify({ created: createdSkills.length, skills: createdSkills }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("auto-generate-skills error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
