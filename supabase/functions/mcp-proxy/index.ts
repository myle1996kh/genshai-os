import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { connectionId, method, params } = await req.json();
    if (!connectionId) throw new Error("connectionId required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch MCP connection config
    const { data: connection, error } = await supabase
      .from("mcp_connections")
      .select("*")
      .eq("id", connectionId)
      .eq("is_active", true)
      .single();

    if (error || !connection) {
      return new Response(JSON.stringify({ error: "MCP connection not found or inactive" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build auth headers
    const authHeaders: Record<string, string> = {};
    if (connection.auth_type === "bearer") {
      authHeaders["Authorization"] = `Bearer ${connection.auth_config?.token || ""}`;
    } else if (connection.auth_type === "api_key") {
      const headerName = connection.auth_config?.header_name || "X-API-Key";
      authHeaders[headerName] = connection.auth_config?.api_key || "";
    }

    // Build JSON-RPC request
    const rpcBody = {
      jsonrpc: "2.0",
      id: crypto.randomUUID(),
      method: method || "tools/list",
      params: params || {},
    };

    const mcpResponse = await fetch(connection.server_url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json, text/event-stream",
        ...authHeaders,
      },
      body: JSON.stringify(rpcBody),
    });

    if (!mcpResponse.ok) {
      const errorText = await mcpResponse.text();
      console.error(`MCP server error (${mcpResponse.status}):`, errorText.slice(0, 500));
      return new Response(
        JSON.stringify({ error: `MCP server error: ${mcpResponse.status}`, details: errorText.slice(0, 200) }),
        { status: mcpResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const contentType = mcpResponse.headers.get("content-type") ?? "";
    if (contentType.includes("text/event-stream")) {
      return new Response(mcpResponse.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    const data = await mcpResponse.json();
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("mcp-proxy error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
