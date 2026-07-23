# Ledger

A tiny, honest expense tracker for yourself: what you have, what you're owed, what you've saved, and what's coming up — so money never quietly disappears on you.

## What it does

- **Add entry** — log money spent, received, lent to someone, paid back, saved, or withdrawn from savings.
- **Balance** — always shown up top, updates the moment you log something.
- **Owed to you** — running total of what people owe you from money you've lent.
- **Savings** — money you've set aside, tracked separately from spendable balance.
- **Coming up** — expenses/loans you know are coming but haven't happened yet (mark "Just planned" or pick a future date), so you can see what you'll be down to.
- Everything is saved to your device (localStorage) — no account, no server, no data leaving your phone.

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
4. It now opens full-screen like a native app, and still works offline once loaded once.

## Notes

- Currency is just a label (defaults to FCFA) — tap it top-right to change it to whatever you use.
- Deleting an entry can't be undone — there's no confirmation dialog on purpose, to keep logging fast.
- Data lives only in your browser's localStorage. Clearing site data/cache will erase it — there's no backup/export yet, but transactions are stored as plain JSON under the key `ledger.transactions.v1`, so exporting is easy to add later if you want it.
