# KTMC-Internal

Internal program used by KTMC to manage day-to-day operations.

A web application that lets KTMC manage all its business activities in one place —
sales, invoices, leads, clients, tasks, scheduling — with at-a-glance visuals for
current and potential revenue.

## Quickstart

```bash
npm install
npm run dev      # run the site at http://localhost:5173
```

It runs immediately in **demo mode** (any login). To go live with real accounts
and data, see [Connecting Supabase](#connecting-supabase-real-auth-database--document-storage).

- **Adding features?** Start with [DEVELOPING.md](DEVELOPING.md) — it has the
  project map and copy-paste recipes (new field, new page, new category…).
- **Putting it online?** See [Deploy the site](DEVELOPING.md#deploy-the-site)
  (one-click via Vercel or Netlify).

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
- **Clients** — manage existing clients; each client has a **drag-and-drop document area**, a
  **call-history timeline** (QUO call summaries), and a **"Draft email"** action.

### Duties & Tasks
A simple kanban board (To do / In progress / Done) for internal duties. Per the
spec, this category has no sales/invoices/leads sections.

### Calendar
Monthly calendar for scheduling meetings, site visits and deadlines.

### Internal Documents
A company-wide document vault (separate from per-client files), organised into
folders (General, HR, Legal, Finance, Operations, Compliance) with drag-and-drop
upload and download.

### Team & Monitoring (admin only)
- **Members** — add team members, assign a role (admin / employee) and grant
  **per-person access** to specific sections of the site.
- **Monitoring** — silent, admin-only activity tracking: active time, time per
  section, and recent actions per employee (today / last 7 days). Tracking runs
  in the background and is not shown to the tracked user.

### Integrations
- **QUO (Lead Capture)** — connect your QUO business phone number and website so
  inbound calls and form submissions create leads automatically, **routed to the
  right category by keyword**. Phone-call summaries are attached to the matching
  client's profile. Includes a "simulate inbound leads" action to demo the flow.
- **AI email drafting** — on a client profile, **Draft email** writes a follow-up
  email in KTMC's voice (Claude Haiku 4.5), using your uploaded past emails /
  chats as the style basis.
- **Curator** — connect KTMC Internal to your external Curator software workspace.

> **Heads-up on employee monitoring:** activity tracking records work *within this
> tool only* (active time, sections, actions) and is visible only to admins.
> Monitoring staff without their knowledge has legal disclosure requirements in
> many regions (US states, the EU/UK) — confirm your obligations before relying
> on it.

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

If your QUO payload uses different field names, adjust `LEAD_FIELDS` / `CALL_FIELDS`
or the `KEYWORDS` map at the top of the function. The **Simulate inbound leads**
button on the QUO screen demonstrates the end result without QUO connected.

### Call summaries

The same webhook also accepts QUO **call-summary** events (a payload with a
`summary`/`transcript`/`recording_url`, or `type` containing "call"). It matches
the caller to a client by phone number and stores the summary on that client's
**call history** timeline. Example:

```bash
curl -X POST "https://<ref>.supabase.co/functions/v1/quo-webhook?secret=<secret>" \
  -H "Content-Type: application/json" \
  -d '{"type":"call","phone":"+1 (415) 555-0142","direction":"inbound",
       "summary":"Discussed timeline and next steps.","duration":372}'
```

## Employee management (manage-employee function)

Admins add team members from **Team → Members**. Creating a login requires the
service role, so it runs through an Edge Function:

```bash
supabase functions deploy manage-employee   # JWT verification ON (signed-in admins only)
```

The function verifies the caller is an admin, creates the auth user with a
temporary password (shown once to the admin to share), and writes their profile.
The **first** person to sign in becomes the admin automatically.

## AI email drafting (draft-email function)

The **Draft email** button on a client profile calls Claude Haiku 4.5 to write a
follow-up in KTMC's voice, using the writing samples you add in the modal.

```bash
supabase functions deploy draft-email                  # JWT verification ON
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...       # from console.anthropic.com
```

Without the key the app falls back to a simple template in demo mode.

## Curator integration

The Curator screen captures the workspace URL + API key to enable linking / data
sync once you wire up the Curator API.

## Project structure

```
src/
  components/     Reusable UI (layout, charts, modal, dropzone, draft-email…)
  pages/          Top-level screens (Dashboard, Category, Team, Documents…)
    sections/     Category tab sections (Sales, Invoices, Leads, Clients)
  store/          App + auth state
    AuthStore.tsx   Supabase Auth + employee profile (role/permissions)
    AppStore.tsx    Data state: hydrate + write-through + realtime + activity log
    actions.ts      Shared action types
  lib/
    supabase.ts     Supabase client + config detection
    api.ts          Backend data access, persistence, storage, AI calls
    sections.ts     Section keys + per-person access helpers
    format.ts       Categories + formatting helpers
  data/seed.ts    Sample seed data (demo) + empty workspace shape
  types.ts        Domain types
supabase/
  migrations/
    0001_init.sql               Schema, RLS, client-documents bucket
    0002_realtime_leads.sql     Realtime on leads
    0003_internal_documents.sql Internal vault table + bucket
    0004_employees_activity.sql Employees + activity tracking + RLS
    0005_calls.sql              Call records + realtime
  functions/
    quo-webhook/index.ts        QUO → leads (keyword-routed) + call summaries
    manage-employee/index.ts    Admin-only employee creation
    draft-email/index.ts        AI email drafting (Claude Haiku 4.5)
```

> **Run all migrations** `0001`–`0005` in order in the Supabase SQL Editor (or
> `supabase db push`) before using the backend.
