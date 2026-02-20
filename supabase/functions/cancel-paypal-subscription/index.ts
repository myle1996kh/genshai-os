import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PAYPAL_BASE = "https://api-m.paypal.com";

async function getPayPalAccessToken(): Promise<string> {
  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${btoa(`${Deno.env.get("PAYPAL_CLIENT_ID")}:${Deno.env.get("PAYPAL_CLIENT_SECRET")}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`PayPal auth failed: ${JSON.stringify(data)}`);
  return data.access_token;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const authHeader = req.headers.get("Authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    // Get subscription
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("paypal_subscription_id, status")
      .eq("user_id", user.id)
      .single();

    if (!sub?.paypal_subscription_id) {
      return new Response(JSON.stringify({ error: "No active subscription" }), { status: 404, headers: corsHeaders });
    }

    const accessToken = await getPayPalAccessToken();

    // Cancel in PayPal
    const res = await fetch(`${PAYPAL_BASE}/v1/billing/subscriptions/${sub.paypal_subscription_id}/cancel`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ reason: "User requested cancellation" }),
    });

    if (!res.ok && res.status !== 204) {
      const body = await res.text();
      throw new Error(`PayPal cancel failed [${res.status}]: ${body}`);
    }

    // Update DB
    const adminSupabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    await adminSupabase
      .from("subscriptions")
      .update({ cancel_at_period_end: true, canceled_at: new Date().toISOString() })
      .eq("paypal_subscription_id", sub.paypal_subscription_id);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("cancel-paypal-subscription error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
