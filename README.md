# Pay With You

Next.js (App Router, TypeScript) front end, Supabase back end, hosted on Vercel.

**Demo status:** bank linking, the bank one-time code and the biometric scan are simulated. No real bank or biometric data is collected; enrolment stores only a random mock ID. Payments are real rows in Supabase, but move no real money.

## Run locally

Requires Node 20+.

```bash
npm install
cp .env.example .env.local   # fill in your Supabase URL + anon key
npm run dev
```

## Supabase setup

1. Create a project at supabase.com.
2. Run `supabase/migrations/0001_init.sql` in the SQL editor (or `supabase db push`).
3. Auth > Providers > Email: for the demo, turn off "Confirm email" so sign-up signs you straight in. Otherwise users must confirm by email first.
4. Auth > URL Configuration: add your Vercel URL as the Site URL.
5. Copy Project URL and anon key from Project Settings > API into `.env.local`.

Security model: every table has Row Level Security and is read-only to the browser (own rows only). Balances and payments change only through the `link_bank`, `enroll_biometric`, `activate_biometric` and `make_payment` functions, which run as the signed-in user.

## Deploy to Vercel

1. Import the GitHub repo at vercel.com/new (framework is detected as Next.js).
2. Add the two environment variables from `.env.example` for Production and Preview.
3. Deploy. Every push to `main` redeploys.

`legacy/mvp-design.html` is the original single-file design, kept for reference.
# PWY
# PWY
