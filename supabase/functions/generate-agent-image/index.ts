import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { agentName, domain, era, tagline, agentId } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Build an evocative portrait prompt
    const eraText = era ? `from ${era}` : "";
    const domainText = domain || "philosophy and wisdom";
    const taglineText = tagline ? `Known for: "${tagline}".` : "";

    const prompt = `A dramatic, cinematic portrait of ${agentName} ${eraText}, a master of ${domainText}. ${taglineText} 
    Style: Renaissance oil painting meets modern digital art. Deep chiaroscuro lighting. Dark obsidian background with subtle golden highlights.
    The subject gazes directly at viewer with intelligence and depth. Highly detailed face, painterly texture, dramatic shadows.
    Color palette: rich dark tones, gold accents, deep shadows. Professional portrait, square format, centered composition.
    Ultra high resolution, museum quality.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [{ role: "user", content: prompt }],
        modalities: ["image", "text"],
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please wait a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${status}`);
    }

    const data = await aiResponse.json();
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageUrl || !imageUrl.startsWith("data:image")) {
      throw new Error("No image returned from AI");
    }

    // Convert base64 to binary
    const base64Data = imageUrl.split(",")[1];
    const binaryStr = atob(base64Data);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    // Upload to storage
    const fileName = `${agentId || Date.now()}-${Date.now()}.png`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("agent-images")
      .upload(fileName, bytes, {
        contentType: "image/png",
        upsert: true,
      });

    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

    // Get public URL
    const { data: urlData } = supabase.storage.from("agent-images").getPublicUrl(fileName);
    const publicUrl = urlData.publicUrl;

    // If agentId provided, update the agent record
    if (agentId) {
      await supabase.from("custom_agents").update({ image_url: publicUrl }).eq("id", agentId);
    }

    return new Response(JSON.stringify({ imageUrl: publicUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-agent-image error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
