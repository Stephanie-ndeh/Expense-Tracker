# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

"Reckon" — a single-user expense/lending/savings tracker built as an installable PWA, backed by Supabase (Postgres + email/password auth). Wallets and transactions live in Supabase, scoped per-user via Row Level Security (`supabase/schema.sql`); the `currency` display setting is the only thing still kept in the browser's `localStorage` (`useSettings.ts`), since it's non-sensitive and has no reason to sync. See `README.md` for the product description.

## Commands

```bash
npm install
npm run dev       # vite dev server
npm run build     # vue-tsc -b (typecheck, project-references build) then vite build
npm run preview   # serve the production build locally
```

There is no test suite and no lint script configured — `npm run build` (via `vue-tsc -b`) is the only correctness check available, and it's strict: `noUnusedLocals`, `noUnusedParameters`, and `noFallthroughCasesInSwitch` are all enabled in `tsconfig.app.json`, so unused variables/params fail the build, not just warn.

## Architecture

**State: module-level reactive singletons, not Pinia.** Despite `pinia` being a dependency, it's unused. `useLedger.ts`, `useWallets.ts`, `useAuth.ts` and `useSettings.ts` all follow the same shape: a `reactive()` object created once at module scope, and the exported `use*()` function just returns computed/methods closing over that shared state. Every component that calls `useLedger()` shares the *same* transactions array — there is no per-instance state and no store plugin. `useSettings.ts` still persists via `watch(..., { deep: true }) → localStorage`, but `useLedger.ts`/`useWallets.ts` do not: their state is a pure in-memory mirror of Supabase (see below), not something written to `localStorage` at all.

**Data lives in Supabase, not `localStorage`.** `wallets` and `transactions` tables (`supabase/schema.sql`) are the sole source of truth, scoped per-user via Row Level Security. Every mutation in `useLedger.ts`/`useWallets.ts` (`addTransaction`, `removeTransaction`, `markSettled`, `addWallet`, `removeWallet`) is `async`: it awaits the Supabase call first and only updates local reactive state on success, then throws on failure so the calling component can surface an error (see `AddEntry.vue`, `WalletTabs.vue` for the try/catch + inline-error-text pattern). `useSync.ts` owns the login/logout lifecycle: `loadAll()` fetches everything fresh from Supabase and **replaces** local state outright (no merge — the server is authoritative), called on sign-in and then periodically/on focus/online; `clearAll()` empties local state on sign-out. That sign-out clear is what prevents one account's data from bleeding into the next account signed into the same browser. The only thing still in `localStorage` is the `currency` label (`ledger.settings.v1`, via `useSettings.ts`) — it's non-sensitive and has no reason to sync.

**Domain model** (`src/types/transaction.ts`): a single `Transaction` shape covers six transaction types (`expense`, `income`, `lend`, `repay`, `save`, `withdraw`). `TYPE_META` is the lookup table that drives everything derived from a type: display verb, sign (+1/-1) for balance math, the placeholder hint for the `label` field, and which `group` (`cash` | `lending` | `savings`) it belongs to. Adding a new transaction type means extending this union and `TYPE_META`, not branching on the type string elsewhere — most of `useLedger.ts` is written generically against `TYPE_META[t.type].sign/group`.

**Wallets** (`src/types/wallet.ts`): every transaction has a `walletId`; `WalletTabs.vue` is the horizontal-scroll tab bar ('All' + one pill per wallet) that drives the shared `activeWalletId` ref, which every `useLedger()` consumer filters against. Exactly one wallet per user has `isDefault: true` (auto-created as "Personal" by `useSync.ts`'s `loadAll()` the first time a user's wallet list comes back empty) — it can't be deleted. `addWallet`/`removeWallet` in `useWallets.ts` enforce, respectively: no duplicate names per user (case-insensitive, backed by a unique index in `supabase/schema.sql` as well as a client-side check) and no deleting a wallet that still has transactions in it (blocked, not cascaded — the user has to empty it first).

**`planned` is the "hasn't happened yet" flag**, not a separate list — a transaction is either `settled` (`!planned && date <= today`) or `upcoming` (`planned || date > today`). Balance, savings, and monthly aggregates are all computed only from `settled`; `upcoming` feeds the "coming up" UI. Keep this filter (not a boolean split into two arrays) when adding new derived views.

**`useLedger()` is the single source of derived data** — balance, savings, per-person owed amounts, monthly trends, category breakdowns, month-over-month comparisons, and JSON export/import all live here as computed properties or functions over the one `state.transactions` array. Components (`BalanceHero`, `SummaryCards`, `TrendChart`, `PeopleView`, `TrendsView`, `AllActivityView`, `RecentActivity`, etc.) are thin — they call into this composable rather than recomputing aggregates themselves. When adding a new summary/view, prefer adding a computed/function here over duplicating filter/reduce logic in a component.

**`App.vue` is a hand-rolled router**: a single `view` ref (`'home' | 'activity' | 'trends'`) switches between full-screen views; modals (`AddEntry`, `PeopleView`, the inline settings panel) are boolean-flag overlays rather than routes. There's no vue-router. Ahead of the router, `App.vue` also gates the whole app behind `AuthGate.vue` whenever `useAuth().isAuthenticated` is false — signing out routes back there via `useSync.ts`'s `clearAll()`.

**Styling**: Tailwind v4 (via `@tailwindcss/postcss`, configured in `postcss.config.js` — there is no `tailwind.config.js`, v4 is CSS-first) for layout/spacing utilities, combined with inline `style` bindings referencing CSS custom properties defined in `src/style.css` (`--ink`, `--paper`, `--accent`, `--money-in`, `--money-out`, etc.) for the dark color scheme. Follow this mix rather than adding Tailwind color classes or a `tailwind.config.js` theme — colors are meant to stay centralized in the `:root` variables.

**PWA**: configured via `vite-plugin-pwa` in `vite.config.ts` (`registerType: 'autoUpdate'`). Manifest name/icons/theme colors are defined there, not in `index.html` or `public/manifest.json`.

**Backup/restore**: `exportData()`/`importData()` in `useLedger.ts` round-trip transactions *and* wallets as JSON (`{ exportedAt, transactions, wallets }`); `App.vue` wires these to a download-blob button and a hidden file input. `importData(json)` is always additive against Supabase — it inserts anything not already present locally (by id for transactions, by id-or-name for wallets, via `useWallets.ts`'s `importWallets`) and throws if any row failed to insert, so partial success still surfaces as an error in `App.vue`'s `importMessage`.
