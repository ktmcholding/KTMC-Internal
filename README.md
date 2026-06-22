# KTMC-Internal

Internal program used by KTMC to manage day-to-day operations.

A web application that lets KTMC manage all its business activities in one place —
sales, invoices, leads, clients, tasks, scheduling — with at-a-glance visuals for
current and potential revenue.

## Tech stack

- **React 18 + TypeScript** (Vite)
- **Tailwind CSS** for styling
- **React Router** for navigation
- **Recharts** for revenue visuals
- **Supabase** for authentication, the Postgres database, and document storage

## Two run modes

The app detects whether Supabase credentials are present and runs accordingly:

| Mode | When | Auth | Data | Documents |
|---|---|---|---|---|
| **Backend** | `VITE_SUPABASE_*` env vars set | Real accounts (Supabase Auth) | Postgres (shared workspace) | Files in Supabase Storage |
| **Demo** | No env vars | Any email/password | Browser `localStorage` (seeded) | Metadata only |

Demo mode lets the app run instantly with no setup. Backend mode is what you
deploy for real, multi-user use with durable data.

## Getting started

```bash
npm install
npm run dev      # start the dev server (http://localhost:5173)
npm run build    # type-check + production build
npm run preview  # preview the production build
```

Without a `.env` file the app runs in **demo mode** — sign in with any email and
password.

## Connecting Supabase (real auth, database & document storage)

1. **Create a project** at [supabase.com](https://supabase.com) (free tier is fine).
2. **Run the schema**: in the Supabase dashboard open **SQL Editor**, paste the
   contents of [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql),
   and click **Run**. This creates all tables, security policies, and the
   `client-documents` storage bucket.
3. **Add credentials**: copy `.env.example` to `.env` and fill in the values from
   **Project Settings → API**:
   ```env
   VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```
4. **Restart** `npm run dev`. The login screen now offers **Create account** —
   make the first account, then invite teammates (they each sign up; everyone
   shares the same workspace data).

### Security model

This is a **shared internal workspace**: any authenticated KTMC user can read and
write all records (clients, leads, invoices, etc.), which matches a single
company managing its own data. Row-level-security policies enforce that you must
be signed in. Documents live in a **private** storage bucket and are served via
short-lived signed URLs. If you later need per-user or per-role restrictions,
tighten the policies in the migration.

## What's included

### Overview (dashboard)
Aggregates everything inputted across KTMC: total sales, total lead potential,
current client count, and recurring revenue — plus current-vs-potential revenue
charts and a per-category breakdown.

### Categories
Each business category has four tabs:

| Category | Sales | Invoices | Leads | Clients |
|---|:---:|:---:|:---:|:---:|
| Formulation | ✓ | ✓ | ✓ | ✓ |
| Co-packing | ✓ | ✓ | ✓ | ✓ |
| Private & White Label Products | ✓ | ✓ | ✓ | ✓ |
| Our Brands | ✓ | ✓ | ✓ | ✓ |
| Software | ✓ | ✓ | ✓ | ✓ |

- **Sales** — current, recurring and potential revenue with a monthly chart; record new sales.
- **Invoices** — create invoices (multi-line-item) and track status (draft / sent / paid / overdue).
- **Leads** — pipeline with potential revenue, status tracking, and QUO source tagging.
- **Clients** — manage existing clients; each client has a **drag-and-drop document area** for uploading multiple files.

### Duties & Tasks
A simple kanban board (To do / In progress / Done) for internal duties. Per the
spec, this category has no sales/invoices/leads sections.

### Calendar
Monthly calendar for scheduling meetings, site visits and deadlines.

### Integrations
- **QUO (Lead Capture)** — connect your QUO business phone number and website so
  inbound calls and form submissions create leads automatically. Includes a
  "simulate inbound leads" action to demonstrate the flow.
- **Curator** — connect KTMC Internal to your external Curator software workspace.

## QUO lead webhook

Inbound QUO calls/form submissions create leads automatically via a Supabase
**Edge Function** ([`supabase/functions/quo-webhook`](supabase/functions/quo-webhook/index.ts)).
The flow: QUO → webhook → insert into `leads` → the app shows it **live**
(Supabase Realtime), filed under your configured default category.

### Deploy it

Requires the [Supabase CLI](https://supabase.com/docs/guides/cli) (`supabase login`
and `supabase link --project-ref <ref>` once):

```bash
# 1. Enable realtime on the leads table (run 0002 in the SQL Editor, or:)
supabase db push

# 2. Set a shared secret (use a long random string)
supabase secrets set QUO_WEBHOOK_SECRET=$(openssl rand -hex 24)

# 3. Deploy the function (no JWT — it authenticates with the shared secret)
supabase functions deploy quo-webhook --no-verify-jwt
```

### Point QUO at it

In your QUO account's webhook settings, use:

```
https://<project-ref>.supabase.co/functions/v1/quo-webhook?secret=<your-secret>
```

(The exact URL is shown with a copy button on the **QUO** screen in the app.) The
secret can be sent as the `?secret=` query param or an `x-quo-secret` header.

### Payload

The function accepts JSON or form-encoded POST bodies and maps common field names
(`name`, `company`, `email`, `phone`, `message`, `value`, `category`, `channel`).
A `channel` containing "call"/"phone" is tagged as a phone lead, otherwise web.
Example:

```bash
curl -X POST "https://<ref>.supabase.co/functions/v1/quo-webhook?secret=<secret>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Jane Doe","company":"Acme","email":"jane@acme.com",
       "phone":"+1 555 0100","message":"Wants co-packing","value":15000,
       "category":"co-packing","channel":"website"}'
```

If your QUO payload uses different field names, adjust `LEAD_FIELDS` at the top of
the function. The **Simulate inbound leads** button on the QUO screen demonstrates
the end result without QUO connected.

## Curator integration

The Curator screen captures the workspace URL + API key to enable linking / data
sync once you wire up the Curator API.

## Project structure

```
src/
  components/     Reusable UI (layout, charts, modal, dropzone, badges)
  pages/          Top-level screens
    sections/     Category tab sections (Sales, Invoices, Leads, Clients)
  store/          App + auth state
    AuthStore.tsx   Supabase Auth (or demo) sessions
    AppStore.tsx    Data state: hydrate from backend + write-through, or demo
    actions.ts      Shared action types
  lib/
    supabase.ts     Supabase client + config detection
    api.ts          Backend data access, persistence & document storage
    format.ts       Categories + formatting helpers
  data/seed.ts    Sample seed data (demo) + empty workspace shape
  types.ts        Domain types
supabase/
  migrations/
    0001_init.sql            Database schema, RLS policies, storage bucket
    0002_realtime_leads.sql  Enable realtime on the leads table
  functions/
    quo-webhook/index.ts     Edge Function: QUO → leads
```
