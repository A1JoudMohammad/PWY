// Supabase Edge Function "pay": creates a Tap Payments charge for the Pay With You demo.
// The Tap secret key is read from the Edge Function secret PAY_API_KEY. It is never returned or logged.
// GET  -> { live: boolean }   (is a key configured? never reveals the key)
// POST -> { ok, ref, status } (only amount, currency and description are accepted from the page)

const TAP_URL = "https://api.tap.company/v2/charges/";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const key = Deno.env.get("PAY_API_KEY");
  if (req.method === "GET") return json({ live: Boolean(key) });
  if (req.method !== "POST") return json({ ok: false }, 405);
  if (!key) return json({ ok: false }, 503);

  let body: { amount?: unknown; currency?: unknown; description?: unknown };
  try { body = await req.json(); } catch { return json({ ok: false }, 400); }

  // Demo limits: small KWD amounts only.
  const { amount, currency } = body;
  if (typeof amount !== "number" || !(amount >= 0.1 && amount <= 50) || currency !== "KWD") return json({ ok: false }, 400);
  const description = String(body.description ?? "Pay With You demo").slice(0, 60);

  // Tap requires a redirect URL for hosted payment methods. Use the caller's https origin, else this project.
  const origin = req.headers.get("origin") ?? "";
  const redirectUrl = origin.startsWith("https://") ? origin : (Deno.env.get("SUPABASE_URL") ?? "https://supabase.com");

  try {
    const r = await fetch(TAP_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        amount,
        currency: "KWD",
        customer_initiated: true,
        description,
        metadata: { app: "pay-with-you-demo" },
        customer: { first_name: "Demo", last_name: "Customer", email: "demo@example.com" },
        source: { id: "src_all" },
        redirect: { url: redirectUrl },
      }),
      signal: AbortSignal.timeout(8000),
    });
    const d = await r.json().catch(() => ({}));

    if (!r.ok) {
      // Log only Tap's error text (no key, no request body) so setup problems can be found in the function logs.
      console.error("tap error", r.status, d?.errors?.[0]?.description ?? "");
      return json({ ok: false, error: "provider_error" }, 502);   // the page falls back to the mock payment
    }

    const status = String(d.status ?? "UNKNOWN");
    const isTest = !key.startsWith("sk_live");
    // CAPTURED = paid. With a test key, INITIATED (hosted page not opened) also counts so the demo can show "Paid".
    const ok = status === "CAPTURED" || (isTest && status === "INITIATED");
    return json({ ok, ref: String(d.id ?? ""), status });
  } catch {
    return json({ ok: false, error: "unavailable" }, 502);
  }
});
