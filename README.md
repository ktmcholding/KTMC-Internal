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
- **localStorage** as the data store (seeded with sample data)

> This is the foundation/MVP build. All data currently lives in the browser
> (`localStorage`) so the app runs with no backend. The data layer is isolated in
> `src/store/AppStore.tsx`, so swapping in a real API/database later is contained.

## Getting started

```bash
npm install
npm run dev      # start the dev server (http://localhost:5173)
npm run build    # type-check + production build
npm run preview  # preview the production build
```

Sign in with **any** email and password (placeholder auth for the demo).

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

## Integration notes (next steps for production)

The two external integrations are wired with real settings forms but need
credentials/endpoints to go live:

- **QUO**: receive inbound leads via webhook from your QUO account. The handler
  should create a `Lead` (see `src/types.ts`) under the configured default category.
- **Curator**: supply the Curator workspace URL + API key to enable data sync /
  embedding.

Authentication, file storage (currently metadata-only), and persistence should be
moved server-side before production use.

## Project structure

```
src/
  components/     Reusable UI (layout, charts, modal, dropzone, badges)
  pages/          Top-level screens
    sections/     Category tab sections (Sales, Invoices, Leads, Clients)
  store/          App + auth state (localStorage-backed)
  data/seed.ts    Sample seed data
  lib/format.ts   Categories + formatting helpers
  types.ts        Domain types
```
