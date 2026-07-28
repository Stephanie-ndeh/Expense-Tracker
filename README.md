# Reckon

A tiny, honest expense tracker for yourself: what you have, what you're owed, what you've saved, and what's coming up — so money never quietly disappears on you.

## What it does

- **Add entry** — log money spent, received, lent to someone, paid back, saved, or withdrawn from savings.
- **Wallets** — split money across more than one wallet (e.g. Personal, Business); everything can also be viewed combined.
- **Balance** — always shown up top, updates the moment you log something.
- **Owed to you** — running total of what people owe you from money you've lent.
- **Savings** — money you've set aside, tracked separately from spendable balance.
- **Coming up** — expenses/loans you know are coming but haven't happened yet (mark "Just planned" or pick a future date), so you can see what you'll be down to.
- Sign in with email/password and your data syncs to your account via Supabase — available on any device you sign into, gone from the app the moment you sign out of a browser.

## Run it locally

```bash
npm install
npm run dev
```

## Build for production

```bash
npm run build
npm run preview   # test the production build locally
```

## Install it as an app (PWA)

1. Run `npm run build`, then deploy the `dist/` folder anywhere that serves static files over HTTPS (Netlify, Vercel, GitHub Pages, Cloudflare Pages all work with a free tier and take about 2 minutes).
2. Open the deployed URL on your phone.
3. Android (Chrome): tap the menu → "Add to Home screen" / "Install app".
   iPhone (Safari): tap Share → "Add to Home Screen".
4. It now opens full-screen like a native app. The shell loads offline once cached, but reading/saving entries needs a network connection to Supabase.

## Notes

- Currency is just a label (defaults to FCFA) — tap it top-right to change it to whatever you use.
- Deleting an entry asks for confirmation first — it can't be undone.
- Data lives in Supabase (Postgres), scoped to your account by Row Level Security — see `supabase/schema.sql` for the schema to run once in a new project, and set `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` in `.env.local` (copy `.env.local.example`). Export/import a JSON backup any time from Settings.
