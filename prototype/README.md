# Pay With You (capstone demo)

Front-end prototype of a payment app that pays with your face, fingerprint or palm. Everything is simulated by default: no real banking, no real biometric data. A "Demo only" note shows on every screen.

## Open it

`public/index.html` is a static page. Open it in a browser, or put the `public` folder on any static host. Camera and fingerprint prompts need HTTPS, which any host provides.

## Files

- `public/index.html`: the whole app (themes, sign up, bank link, biometric, activate, payment demo).
- `public/paymentService.js`: the only payment code in the page. Mock by default; uses Tap through the Supabase function when it is available; falls back to the mock if not.
- `supabase/functions/pay/index.ts`: the Supabase Edge Function that calls Tap. Already deployed to the `pay-with-you` project.

## Real payments with Tap

The Tap secret key lives only in the Supabase Edge Function secret `PAY_API_KEY`. It is never in the page, the code or git. Use a Tap **test** key first.

A mock payment reference starts with `TX-`. A real Tap charge reference starts with `chg_`.
