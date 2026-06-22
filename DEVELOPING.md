# Developing & extending KTMC Internal

This guide is for adding features to the site. It assumes the app from the
[README](README.md) (React + TypeScript + Vite + Tailwind, with an optional
Supabase backend).

## Run it locally

```bash
npm install
npm run dev        # http://localhost:5173 — hot-reloads as you edit
```

- With **no `.env`** the app runs in **demo mode** (any login, data in your
  browser). Perfect for building UI features quickly.
- Add a `.env` (see README → "Connecting Supabase") to develop against the real
  backend.

Before pushing, always run:

```bash
npm run build      # type-checks (tsc) AND builds — catches most mistakes
```

CI (`.github/workflows/ci.yml`) runs this on every push/PR, so a broken build is
flagged automatically.

## Where things live

```
src/
  pages/            One file per screen (Dashboard, Category, Calendar…)
    sections/       The Sales / Invoices / Leads / Clients tabs
  components/       Reusable UI (Layout/sidebar, charts, Modal, Tabs, badges…)
  store/
    AppStore.tsx    All app data + the dispatch() you call to change it
    AuthStore.tsx   Login/session
    actions.ts      The list of every change the app can make
  lib/
    api.ts          Backend reads/writes (Supabase)
    supabase.ts     Backend client + isSupabaseConfigured flag
    format.ts       Categories list + currency/date helpers
  types.ts          The shape of every record (Client, Lead, Invoice…)
supabase/
  migrations/       Database schema (SQL)
  functions/        Edge Functions (the QUO webhook)
```

**How data flows:** components read data from `useStore().state` and make changes
by calling `dispatch({ type: "...", ... })`. In demo mode that change is saved to
the browser; in backend mode the same change is written to Supabase
automatically. You rarely touch `api.ts` unless you add a brand-new record type.

## Recipe 1 — Add a field to an existing record

Example: give each **client** an "Industry" field.

1. **Type** — add it in `src/types.ts`:
   ```ts
   export interface Client {
     // …existing fields…
     industry: string;
   }
   ```
2. **Form** — add an input in `src/pages/sections/ClientsSection.tsx` (the
   `AddClientModal`) and include `industry` when building the new client object.
3. **Display** — show it in the client details (`<Row label="Industry" …>`).
4. **Backend (only if using Supabase):**
   - Add a column: in the Supabase SQL Editor run
     `alter table clients add column industry text not null default '';`
   - Map it in `src/lib/api.ts` — add `industry: str(r.industry)` to `toClient`
     and `industry: c.industry` to `clientRow`.
5. `npm run build` to confirm types are happy.

> Demo-mode data is cached in your browser. After changing a record's shape,
> clear it via DevTools → Application → Local Storage, or just use new records.

## Recipe 2 — Add a new page + sidebar link

Example: a "Reports" page.

1. Create `src/pages/Reports.tsx`:
   ```tsx
   import { PageHeader } from "../components/PageHeader";
   export function Reports() {
     return <div><PageHeader title="Reports" subtitle="Custom reports." /></div>;
   }
   ```
2. Add the route in `src/App.tsx` (copy an existing `<Route>` block):
   ```tsx
   <Route path="/reports" element={<RequireAuth><Reports /></RequireAuth>} />
   ```
3. Add the sidebar link in `src/components/Layout.tsx` `navItems`:
   ```ts
   { to: "/reports", label: "Reports", icon: BarChart3 },
   ```
   (Import an icon from `lucide-react`.)

## Recipe 3 — Add a new business category

Edit `CATEGORIES` in `src/lib/format.ts` and add the id to the `CategoryId` union
in `src/types.ts`. It automatically gets Sales/Invoices/Leads/Clients tabs, a
sidebar entry pattern, and dashboard rollups. (Add a matching sidebar link in
`Layout.tsx` if you want it pinned in the nav.)

## Recipe 4 — Add a new kind of record

For a whole new entity (say "Suppliers"): add the type in `types.ts`, an action
in `store/actions.ts`, reducer cases in `AppStore.tsx`, and — for the backend — a
table in a new `supabase/migrations/000X_*.sql` plus mapper + persist cases in
`api.ts`. Use Leads as a working template (it has the full create/update/delete
path end to end).

## Deploy the site

The app is a static site (plus the optional Supabase backend). Easiest path:

### Vercel (recommended, zero-config)
1. Push to GitHub (already done).
2. On [vercel.com](https://vercel.com) → **Add New → Project** → import this repo.
3. Vercel auto-detects Vite. Under **Environment Variables** add (if using the
   backend) `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
4. **Deploy.** Every push to the branch now redeploys automatically.

`vercel.json` is included so client-side routes (e.g. `/category/software`) resolve
correctly.

### Netlify
Same idea — import the repo; `netlify.toml` sets the build command, publish dir
and SPA routing. Add the same two env vars under **Site settings → Environment**.

> The QUO webhook is a Supabase Edge Function, deployed separately with the
> Supabase CLI — see README → "QUO lead webhook". The hosted site and the webhook
> are independent.

## Tips

- **Styling** uses Tailwind utility classes; shared button/input styles live in
  `src/index.css` (`.btn-primary`, `.input`, `.card`, …).
- **Charts** are Recharts; see `src/components/RevenueCharts.tsx` for patterns.
- **Money & dates**: use `formatCurrency` / `formatDate` from `src/lib/format.ts`.
- Keep changes small and run `npm run build` often.
