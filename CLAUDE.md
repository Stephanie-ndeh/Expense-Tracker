# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

"Ledger" (app title "Big Steph") — a single-user, local-only expense/lending/savings tracker built as an installable PWA. No backend, no auth, no network calls: all data lives in the browser's `localStorage`. See `README.md` for the product description.

## Commands

```bash
npm install
npm run dev       # vite dev server
npm run build     # vue-tsc -b (typecheck, project-references build) then vite build
npm run preview   # serve the production build locally
```

There is no test suite and no lint script configured — `npm run build` (via `vue-tsc -b`) is the only correctness check available, and it's strict: `noUnusedLocals`, `noUnusedParameters`, and `noFallthroughCasesInSwitch` are all enabled in `tsconfig.app.json`, so unused variables/params fail the build, not just warn.

## Architecture

**State: module-level reactive singletons, not Pinia.** Despite `pinia` being a dependency, it's unused. Both composables (`src/composables/useLedger.ts`, `src/composables/useSettings.ts`) follow the same pattern: a `reactive()` object is created once at module scope, a `watch(..., { deep: true })` persists it to `localStorage` on every change, and the exported `use*()` function just returns computed/methods closing over that shared state. Every component that calls `useLedger()` shares the *same* transactions array — there is no per-instance state and no store plugin. When adding new persisted state, follow this same load/reactive/watch/export shape rather than introducing Pinia.

**Storage keys** (plain JSON, no schema versioning beyond the key suffix):
- `ledger.transactions.v1` — the `Transaction[]` array (`useLedger.ts`)
- `ledger.settings.v1` — `{ currency: string }` (`useSettings.ts`)

**Domain model** (`src/types/transaction.ts`): a single `Transaction` shape covers six transaction types (`expense`, `income`, `lend`, `repay`, `save`, `withdraw`). `TYPE_META` is the lookup table that drives everything derived from a type: display verb, sign (+1/-1) for balance math, the placeholder hint for the `label` field, and which `group` (`cash` | `lending` | `savings`) it belongs to. Adding a new transaction type means extending this union and `TYPE_META`, not branching on the type string elsewhere — most of `useLedger.ts` is written generically against `TYPE_META[t.type].sign/group`.

**`planned` is the "hasn't happened yet" flag**, not a separate list — a transaction is either `settled` (`!planned && date <= today`) or `upcoming` (`planned || date > today`). Balance, savings, and monthly aggregates are all computed only from `settled`; `upcoming` feeds the "coming up" UI. Keep this filter (not a boolean split into two arrays) when adding new derived views.

**`useLedger()` is the single source of derived data** — balance, savings, per-person owed amounts, monthly trends, category breakdowns, month-over-month comparisons, and JSON export/import all live here as computed properties or functions over the one `state.transactions` array. Components (`BalanceHero`, `SummaryCards`, `TrendChart`, `PeopleView`, `TrendsView`, `ExpensesView`, etc.) are thin — they call into this composable rather than recomputing aggregates themselves. When adding a new summary/view, prefer adding a computed/function here over duplicating filter/reduce logic in a component.

**`App.vue` is a hand-rolled router**: a single `view` ref (`'home' | 'expenses' | 'trends'`) switches between full-screen views; modals (`AddEntry`, `PeopleView`, the inline settings panel) are boolean-flag overlays rather than routes. There's no vue-router.

**Styling**: Tailwind v4 (via `@tailwindcss/postcss`, configured in `postcss.config.js` — there is no `tailwind.config.js`, v4 is CSS-first) for layout/spacing utilities, combined with inline `style` bindings referencing CSS custom properties defined in `src/style.css` (`--ink`, `--paper`, `--accent`, `--money-in`, `--money-out`, etc.) for the dark color scheme. Follow this mix rather than adding Tailwind color classes or a `tailwind.config.js` theme — colors are meant to stay centralized in the `:root` variables.

**PWA**: configured via `vite-plugin-pwa` in `vite.config.ts` (`registerType: 'autoUpdate'`). Manifest name/icons/theme colors are defined there, not in `index.html` or `public/manifest.json`.

**Backup/restore**: `exportData()`/`importData()` in `useLedger.ts` round-trip the whole transactions array as JSON (`{ exportedAt, transactions }`); `App.vue` wires these to a download-blob button and a hidden file input. `importData` supports `merge` (skip ids already present) and `replace` modes — `App.vue` currently only uses `merge`.
