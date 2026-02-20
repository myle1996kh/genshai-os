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
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Auth check — must be admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    // Check admin role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden: Admin only" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action } = body;

    // ── TEST CONNECTION ──────────────────────────────────────────────────
    if (action === "test_connection") {
      const { base_url, api_key } = body;
      if (!base_url || !api_key) {
        return new Response(JSON.stringify({ error: "base_url and api_key required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const normalizedUrl = base_url.replace(/\/+$/, "");
      const testRes = await fetch(`${normalizedUrl}/models`, {
        headers: { Authorization: `Bearer ${api_key}` },
        signal: AbortSignal.timeout(10000),
      });

      if (!testRes.ok) {
        const txt = await testRes.text();
        return new Response(JSON.stringify({ success: false, error: `Provider returned ${testRes.status}: ${txt.slice(0, 200)}` }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await testRes.json();
      const models: { id: string; object?: string }[] = data?.data || data?.models || [];
      return new Response(JSON.stringify({ success: true, model_count: models.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── FETCH MODELS ─────────────────────────────────────────────────────
    if (action === "fetch_models") {
      const { provider_id } = body;
      if (!provider_id) {
        return new Response(JSON.stringify({ error: "provider_id required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: provider, error: provErr } = await supabase
        .from("ai_providers")
        .select("*")
        .eq("id", provider_id)
        .single();
      if (provErr || !provider) {
        return new Response(JSON.stringify({ error: "Provider not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const normalizedUrl = provider.base_url.replace(/\/+$/, "");
      const modelsRes = await fetch(`${normalizedUrl}/models`, {
        headers: { Authorization: `Bearer ${provider.api_key}` },
        signal: AbortSignal.timeout(15000),
      });

      if (!modelsRes.ok) {
        const txt = await modelsRes.text();
        return new Response(JSON.stringify({ error: `Failed to fetch models: ${modelsRes.status}: ${txt.slice(0, 200)}` }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await modelsRes.json();
      const models: any[] = data?.data || data?.models || [];

      // Upsert models into DB
      if (models.length > 0) {
        const rows = models.map((m: any) => ({
          provider_id,
          model_id: m.id || m.name || String(m),
          model_name: m.id || m.name || String(m),
          fetched_at: new Date().toISOString(),
        }));

        // Delete old models for this provider then re-insert fresh list
        await supabase.from("ai_provider_models").delete().eq("provider_id", provider_id);
        const { error: insertErr } = await supabase.from("ai_provider_models").insert(rows);
        if (insertErr) throw insertErr;

        // Mark provider as verified
        await supabase.from("ai_providers").update({ is_verified: true }).eq("id", provider_id);
      }

      return new Response(JSON.stringify({ success: true, model_count: models.length, models: models.map((m: any) => ({ id: m.id || m.name, name: m.id || m.name })) }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("manage-provider error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
