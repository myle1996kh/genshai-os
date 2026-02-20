import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PAYPAL_BASE = "https://api-m.paypal.com"; // change to sandbox for testing: https://api-m.sandbox.paypal.com

async function getPayPalAccessToken(): Promise<string> {
  const clientId = Deno.env.get("PAYPAL_CLIENT_ID")!;
  const clientSecret = Deno.env.get("PAYPAL_CLIENT_SECRET")!;

  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
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
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const { plan_slug } = await req.json();

    // Get plan from DB
    const { data: plan, error: planError } = await supabase
      .from("plans")
      .select("*")
      .eq("slug", plan_slug)
      .single();

    if (planError || !plan) {
      return new Response(JSON.stringify({ error: "Plan not found" }), { status: 404, headers: corsHeaders });
    }

    const accessToken = await getPayPalAccessToken();

    const isYearly = plan_slug === "pro_yearly";
    const amount = isYearly ? plan.price_yearly : plan.price_monthly;
    const intervalUnit = isYearly ? "YEAR" : "MONTH";

    // If plan already has a PayPal plan ID stored, use it; otherwise create one on the fly
    let paypalPlanId = isYearly ? plan.paypal_plan_id_yearly : plan.paypal_plan_id_monthly;

    if (!paypalPlanId) {
      // Create PayPal product + billing plan dynamically
      const productRes = await fetch(`${PAYPAL_BASE}/v1/catalogs/products`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: plan.name,
          type: "SERVICE",
          category: "SOFTWARE",
        }),
      });
      const product = await productRes.json();
      if (!productRes.ok) throw new Error(`PayPal product creation failed: ${JSON.stringify(product)}`);

      const planRes = await fetch(`${PAYPAL_BASE}/v1/billing/plans`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          product_id: product.id,
          name: `${plan.name} - ${intervalUnit}`,
          status: "ACTIVE",
          billing_cycles: [
            {
              frequency: { interval_unit: intervalUnit, interval_count: 1 },
              tenure_type: "REGULAR",
              sequence: 1,
              total_cycles: 0,
              pricing_scheme: {
                fixed_price: { value: amount.toString(), currency_code: "USD" },
              },
            },
          ],
          payment_preferences: {
            auto_bill_outstanding: true,
            setup_fee_failure_action: "CONTINUE",
            payment_failure_threshold: 3,
          },
        }),
      });
      const billingPlan = await planRes.json();
      if (!planRes.ok) throw new Error(`PayPal billing plan failed: ${JSON.stringify(billingPlan)}`);
      paypalPlanId = billingPlan.id;

      // Save PayPal plan ID back to DB for reuse
      const adminSupabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      await adminSupabase
        .from("plans")
        .update(isYearly ? { paypal_plan_id_yearly: paypalPlanId } : { paypal_plan_id_monthly: paypalPlanId })
        .eq("slug", plan_slug);
    }

    // Create subscription
    const appUrl = req.headers.get("origin") || "https://localhost:5173";
    const subRes = await fetch(`${PAYPAL_BASE}/v1/billing/subscriptions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        plan_id: paypalPlanId,
        subscriber: { email_address: user.email },
        application_context: {
          brand_name: "GenShai",
          locale: "vi-VN",
          shipping_preference: "NO_SHIPPING",
          user_action: "SUBSCRIBE_NOW",
          payment_method: { payer_selected: "PAYPAL", payee_preferred: "IMMEDIATE_PAYMENT_REQUIRED" },
          return_url: `${appUrl}/billing?success=true`,
          cancel_url: `${appUrl}/pricing?canceled=true`,
        },
        custom_id: user.id, // Store user ID for webhook linking
      }),
    });
    const subscription = await subRes.json();
    if (!subRes.ok) throw new Error(`PayPal subscription failed: ${JSON.stringify(subscription)}`);

    const approvalLink = subscription.links?.find((l: any) => l.rel === "approve");
    if (!approvalLink) throw new Error("No approval URL returned from PayPal");

    return new Response(
      JSON.stringify({
        approval_url: approvalLink.href,
        subscription_id: subscription.id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("create-paypal-subscription error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
