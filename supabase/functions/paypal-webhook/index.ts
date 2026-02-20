import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// PayPal webhook handler — syncs subscription events to Supabase
// Webhook events handled:
// - BILLING.SUBSCRIPTION.ACTIVATED
// - BILLING.SUBSCRIPTION.UPDATED
// - BILLING.SUBSCRIPTION.CANCELLED
// - BILLING.SUBSCRIPTION.SUSPENDED (past_due)
// - PAYMENT.SALE.COMPLETED

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
  return data.access_token;
}

async function verifyWebhookSignature(req: Request, body: string): Promise<boolean> {
  const webhookId = Deno.env.get("PAYPAL_WEBHOOK_ID");
  if (!webhookId) {
    console.warn("PAYPAL_WEBHOOK_ID not set — skipping verification");
    return true;
  }

  const accessToken = await getPayPalAccessToken();
  const verifyRes = await fetch(`${PAYPAL_BASE}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      transmission_id: req.headers.get("paypal-transmission-id"),
      transmission_time: req.headers.get("paypal-transmission-time"),
      cert_url: req.headers.get("paypal-cert-url"),
      auth_algo: req.headers.get("paypal-auth-algo"),
      transmission_sig: req.headers.get("paypal-transmission-sig"),
      webhook_id: webhookId,
      webhook_event: JSON.parse(body),
    }),
  });
  const result = await verifyRes.json();
  return result.verification_status === "SUCCESS";
}

function planSlugFromPayPalPlanId(planId: string, db: any): string {
  // Will be resolved via plans table lookup
  return "pro_monthly";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const body = await req.text();

  try {
    const isValid = await verifyWebhookSignature(req, body);
    if (!isValid) {
      console.error("PayPal webhook signature verification failed");
      return new Response("Forbidden", { status: 403 });
    }

    const event = JSON.parse(body);
    const eventType: string = event.event_type;
    const resource = event.resource;

    console.log(`PayPal webhook: ${eventType}`, resource?.id);

    const adminSupabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (eventType === "BILLING.SUBSCRIPTION.ACTIVATED" || eventType === "BILLING.SUBSCRIPTION.UPDATED") {
      const subscriptionId: string = resource.id;
      const paypalPlanId: string = resource.plan_id;
      const status = resource.status?.toLowerCase() === "active" ? "active" : "trialing";
      const userId: string = resource.custom_id; // We passed user.id as custom_id

      // Resolve plan slug from plan_id
      const { data: plan } = await adminSupabase
        .from("plans")
        .select("slug, id")
        .or(`paypal_plan_id_monthly.eq.${paypalPlanId},paypal_plan_id_yearly.eq.${paypalPlanId}`)
        .single();

      const planSlug = plan?.slug || "pro_monthly";
      const billingCycle = planSlug === "pro_yearly" ? "yearly" : "monthly";

      // Parse period dates
      const periodStart = resource.billing_info?.last_payment?.time
        ? new Date(resource.billing_info.last_payment.time).toISOString()
        : new Date().toISOString();

      const nextBillingTime = resource.billing_info?.next_billing_time;
      const periodEnd = nextBillingTime ? new Date(nextBillingTime).toISOString() : null;

      // Upsert subscription
      const { data: existing } = await adminSupabase
        .from("subscriptions")
        .select("id")
        .eq("paypal_subscription_id", subscriptionId)
        .single();

      if (existing) {
        await adminSupabase
          .from("subscriptions")
          .update({
            status,
            plan_slug: planSlug,
            billing_cycle: billingCycle,
            paypal_plan_id: paypalPlanId,
            current_period_start: periodStart,
            current_period_end: periodEnd,
            cancel_at_period_end: false,
            updated_at: new Date().toISOString(),
          })
          .eq("paypal_subscription_id", subscriptionId);
      } else {
        await adminSupabase.from("subscriptions").insert({
          user_id: userId,
          plan_id: plan?.id || null,
          plan_slug: planSlug,
          billing_cycle: billingCycle,
          status,
          paypal_subscription_id: subscriptionId,
          paypal_plan_id: paypalPlanId,
          current_period_start: periodStart,
          current_period_end: periodEnd,
          cancel_at_period_end: false,
        });
      }
    } else if (eventType === "BILLING.SUBSCRIPTION.CANCELLED") {
      const subscriptionId = resource.id;
      await adminSupabase
        .from("subscriptions")
        .update({
          status: "canceled",
          canceled_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("paypal_subscription_id", subscriptionId);
    } else if (eventType === "BILLING.SUBSCRIPTION.SUSPENDED") {
      const subscriptionId = resource.id;
      await adminSupabase
        .from("subscriptions")
        .update({ status: "past_due", updated_at: new Date().toISOString() })
        .eq("paypal_subscription_id", subscriptionId);
    } else if (eventType === "PAYMENT.SALE.COMPLETED") {
      // Record payment
      const billingAgreementId = resource.billing_agreement_id;
      if (billingAgreementId) {
        const { data: sub } = await adminSupabase
          .from("subscriptions")
          .select("id, user_id")
          .eq("paypal_subscription_id", billingAgreementId)
          .single();

        if (sub) {
          await adminSupabase.from("payments").insert({
            user_id: sub.user_id,
            subscription_id: sub.id,
            paypal_transaction_id: resource.id,
            amount: parseFloat(resource.amount?.total || "0"),
            currency: resource.amount?.currency || "USD",
            status: "paid",
            payment_method: "paypal",
            paid_at: new Date(resource.create_time || Date.now()).toISOString(),
            metadata: resource,
          });
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("paypal-webhook error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
