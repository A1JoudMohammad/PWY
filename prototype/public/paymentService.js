/* paymentService: the only place the app deals with payments.
   - Mock by default: works with no network and no API.
   - If the Supabase function "pay" reports a Tap key is configured, it uses the real Tap API through that function.
   - If the real API is unreachable, it falls back to the mock so the demo still works.
   Only the amount, currency and shop name are sent. No biometric data, no card or account numbers.
   The Tap secret key is NOT in this file: it lives in the Supabase Edge Function secret PAY_API_KEY.
   The key below is Supabase's public "anon" key, which is designed to be visible in a web page. */
(function (global) {
  const CONFIG = {
    functionUrl: "https://ukjfhcpfdhczjezxyiaj.supabase.co/functions/v1/pay",
    anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVramZoY3BmZGhjemplenh5aWFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ4NDE5ODYsImV4cCI6MjExMDQxNzk4Nn0.-rZjG042sH7OJA2L0zuGAHXuOn4hDTSBRPonBT74NBY"
  };
  const headers = { Authorization: "Bearer " + CONFIG.anonKey, apikey: CONFIG.anonKey };

  const wait = ms => new Promise(r => setTimeout(r, ms));
  const makeRef = () => "TX-" + crypto.getRandomValues(new Uint32Array(1))[0].toString(16).toUpperCase().padStart(8, "0");

  function fetchWithTimeout(url, options, ms) {
    const ctrl = new AbortController(), timer = setTimeout(() => ctrl.abort(), ms);
    return fetch(url, { ...options, signal: ctrl.signal }).finally(() => clearTimeout(timer));
  }

  /* Mock payment: always approves after a short pause. Mock references start with "TX-". */
  async function mockPay({ amount }) {
    await wait(900);
    return { ok: true, amount, ref: makeRef(), mode: "mock" };
  }

  /* Asks the function once whether a Tap key is configured. It never reveals the key. */
  let live = null;
  async function isLive() {
    if (live !== null) return live;
    try {
      const r = await fetchWithTimeout(CONFIG.functionUrl, { headers }, 3000);
      live = r.ok && (await r.json()).live === true;
    } catch { live = false; }
    return live;
  }

  /* Real payment through the Supabase function. Throws if the API is unavailable. Real references are Tap charge ids ("chg_..."). */
  async function realPay({ amount, shop }) {
    const r = await fetchWithTimeout(CONFIG.functionUrl, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ amount, currency: "KWD", description: shop })
    }, 10000);
    if (!r.ok) throw new Error("unavailable");
    const d = await r.json();
    if (!d.ok) return { ok: false, amount, mode: "live" };       // Tap declined it
    return { ok: true, amount, ref: d.ref, mode: "live" };
  }

  global.paymentService = {
    get mode() { return live ? "live" : "mock"; },
    async pay(order) {
      if (await isLive()) {
        try { return await realPay(order); } catch { /* API unavailable: use the mock below */ }
      }
      return mockPay(order);
    }
  };
})(window);
