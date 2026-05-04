# NEU Cashier Dashboard (`neupayfe`)

Web front-end for the [`neupaymentbe`](../neupaymentbe) Spring Boot backend.
Built for the **NEU School Cashier**, **Administrator**, and **CS
Infrastructure Department** personas — students and faculty stay on the iOS
app. The dashboard is a *mediator*: it adds funds and reads balances; it
never deducts.

## What's inside

| Concern              | Tool                                                      |
|----------------------|-----------------------------------------------------------|
| Build                | Vite 5 + TypeScript                                       |
| UI                   | React 18 + TailwindCSS 3 (`darkMode: 'class'`)            |
| Server state         | TanStack Query v5                                         |
| Charts               | Recharts                                                  |
| Forms                | Native HTML + Zod-style validation in components          |
| Auth                 | JWT (access + refresh) with axios interceptors            |
| Step-up auth (web)   | Password re-confirmation → 5-minute step-up JWT           |
| Routing              | React Router v6                                           |
| Persistence          | `zustand/persist` (localStorage)                          |
| Icons                | `lucide-react`                                            |

## Roles, mapped to the backend

The backend's `UserRole` enum is `{STUDENT, FACULTY, CASHIER, ADMIN}`. The
dashboard layers three operator personas on top of those:

| Persona                        | Backend role | Can credit wallets | Can create users | Can freeze users |
|--------------------------------|--------------|--------------------|------------------|------------------|
| School Cashier                 | `CASHIER`    | ✓                  | —                | —                |
| Administrator                  | `ADMIN`      | ✓                  | ✓                | ✓                |
| CS Infrastructure Department   | `ADMIN`      | ✓                  | ✓                | ✓                |

CS Infrastructure is detected from the user's `program` field
(`Computer Science`, `CS`, `Infra`, etc.) — both Admin and CS-Infra share the
same backend role and capabilities; only the UI label differs.

## Pages

| Path             | Who          | Purpose                                                                         |
|------------------|--------------|---------------------------------------------------------------------------------|
| `/login`         | anyone       | NEU email or staff ID + password                                                |
| `/dashboard`     | staff        | Cash-in chart by recipient role + recent activity                               |
| `/cash-in`       | staff        | Search a wallet owner, then top up via password step-up *or* CASH_IN QR token   |
| `/users`         | staff        | Paginated, searchable directory                                                 |
| `/users/:id`     | staff        | Profile + wallet + freeze/reinstate (admin only)                                |
| `/transactions`  | staff        | Cross-user log filtered by category, with cashier attribution                   |
| `/staff/new`     | admin only   | Provision a new CASHIER or ADMIN account                                        |
| `/settings`      | staff        | Theme toggle, profile, environment info                                         |

## Working against the backend

The FE expects the [`neupaymentbe`](../neupaymentbe) backend on
`VITE_NEU_API_BASE` (default `http://localhost:8080`). The dashboard relies on
**three additions** the FE author made to the backend, all backwards-compatible
with the iOS app:

1. **Login by ID or email.** `AuthServiceImpl.login` now accepts either an
   email (contains `@`) or an ID number in the existing `email` JSON field.
2. **`POST /api/v1/auth/step-up/password`.** The mobile app uses Face ID for
   step-up; the browser cannot reach the Secure Enclave so it re-confirms the
   cashier's password to mint a 5-minute step-up JWT for `/admin/topup`.
3. **`GET /api/v1/admin/transactions[/stats]`.** Cross-user transaction log
   and aggregated cash-in counts/totals by day and recipient role — drives
   both the live chart and the activity table.

Everything else uses endpoints that already shipped with the backend.

## Local development

```bash
# 1. Start the backend (in /Users/lazarus/Documents/neupaymentbe):
docker compose up --build      # API on :8080

# 2. Install + run the dashboard (here):
npm install
npm run dev                    # Vite dev server on :5173 (auto-opens)

# 3. Sign in with the bootstrap admin you created in the backend
#    (see neupaymentbe/README.md → "Bootstrapping the first ADMIN").
```

Useful scripts:

| Command          | What it does                                                   |
|------------------|----------------------------------------------------------------|
| `npm run dev`    | Vite dev server on :5173 with HMR                              |
| `npm run build`  | Type-check + build to `dist/`                                  |
| `npm run preview`| Serve the built `dist/` locally (smoke test)                   |
| `npm run typecheck` | Run `tsc -b --noEmit` only                                  |

## Configuration

All environment variables are prefixed `VITE_` so Vite exposes them at build
time. Copy `.env.example` to `.env.local` (or set them in your hosting
platform):

| Var                  | Default                  | Notes                                           |
|----------------------|--------------------------|-------------------------------------------------|
| `VITE_NEU_API_BASE`  | `http://localhost:8080`  | Origin of the Spring Boot backend (no trailing slash). |
| `VITE_NEU_APP_NAME`  | `NEU Cashier Dashboard`  | Cosmetic — used in titles.                      |
| `VITE_NEU_ENV_LABEL` | (empty)                  | Free-form label shown on the login screen, e.g. `Staging`. |

## CORS — backend side

The backend allow-lists the dashboard origin via `NEU_CORS_ALLOWED_ORIGINS`.
Set this on the backend deployment to include the dashboard URL, e.g.

```
NEU_CORS_ALLOWED_ORIGINS=https://dash.neu.edu.ph,https://neu.edu.ph
```

The backend already exposes `Authorization`, `X-Idempotency-Key`,
`X-Device-Id`, and `X-Step-Up-Token` headers, which the FE sends as needed.

## Dark mode

A `class`-based Tailwind dark theme. The toggle lives in the top-right of
every page and in **Settings → Appearance**. The active theme is persisted
to `localStorage` and applied before first paint to avoid flash.

## Deployment

Two paths, both documented in [`DEPLOY_AWS.md`](./DEPLOY_AWS.md):

- **AWS Amplify Hosting** — push, Amplify reads [`amplify.yml`](./amplify.yml)
  and builds + serves from a CDN with one click.
- **S3 + CloudFront** — `./deploy/deploy-s3.sh` + the assets in
  [`deploy/`](./deploy) for full control over caching and security headers.

## Project layout

```
src/
  api/              axios + typed wrappers (auth, users, transactions, payments)
  auth/             zustand store + RouteGuard
  components/       UI primitives (Button, Card, Input, Modal, Toast),
                    Layout, Sidebar, Header, ThemeToggle, CashInChart
  lib/              format helpers, theme controller, role helpers, cn()
  pages/            one file per route (lazy-loaded by App.tsx)
  App.tsx           router
  main.tsx          entry point
  index.css         Tailwind + CSS custom properties for theming
deploy/             S3+CloudFront helpers (script + IAM samples + SPA rewrite)
amplify.yml         AWS Amplify Hosting build spec
public/             static assets (icon, _redirects)
```

## Security notes

- Refresh tokens persist to `localStorage` (so reloads don't kick the user
  out). Access tokens hold for 15 minutes; on a 401 the axios interceptor
  silently refreshes once and replays the request.
- Step-up tokens **do not** persist — they live in module memory only. After
  reload, the operator re-confirms their password.
- All money endpoints use the `X-Idempotency-Key` header so accidentally
  double-submitting a credit cannot double-credit a wallet.
- The dashboard sets `X-Device-Id` to a stable per-browser id so the
  backend can scope refresh tokens to a device.
