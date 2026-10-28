# StackStorm admin console

[![Frontend CI](https://github.com/stackstormproject/stackstorm-frontend-admin/actions/workflows/ci.yml/badge.svg?branch=develop)](https://github.com/stackstormproject/stackstorm-frontend-admin/actions/workflows/ci.yml)
[![Coverage](https://codecov.io/gh/stackstormproject/stackstorm-frontend-admin/branch/develop/graph/badge.svg)](https://codecov.io/gh/stackstormproject/stackstorm-frontend-admin)

The operations console for **Dickwella Fashion Corner** staff: orders, returns, products,
stock, customers and live support. Part of the StackStorm project (SENG 34213, University of
Kelaniya):
[GitHub organisation](https://github.com/stackstormproject) ·
[backend](https://github.com/stackstormproject/backend) ·
[customer storefront](https://github.com/stackstormproject/stackstorm-frontend-customer) ·
[infra](https://github.com/stackstormproject/infra) ·
[documents](https://github.com/stackstormproject/documents)

**Live staging:** _add the staging URL here after the first deploy_

## What it does

| Area      | Pages                                                                              | Who                 | SRS                 |
| --------- | ---------------------------------------------------------------------------------- | ------------------- | ------------------- |
| Dashboard | `/dashboard`: paid revenue, average order, alerts, daily revenue (7/30/90 days)    | Managers            | FR028, FR029 (part) |
| Orders    | `/orders`, `/orders/:id`: search, filters, ship with tracking, deliver, cancel     | Managers            | FR021, FR022        |
| Returns   | `/returns`, `/returns/:id`: approve, reject, inspect parcel, refund or exchange    | Managers            | FR023               |
| Products  | `/products`, `/products/new`, `/products/:id`: sizes, archive, delete if unsold    | Managers            | FR017               |
| Stock     | `/inventory`: on hand, held, available, low-stock filter, logged adjustments       | Managers            | FR017, FR018        |
| Customers | `/customers`, `/customers/:id`: spend, tier, orders, addresses, points adjustments | Managers            | FR024, FR027        |
| Support   | `/support`: live chat queue, take, reply, resolve                                  | Managers and agents | FR032, FR033        |

**Roles** (enforced by the API, mirrored in the menu): `super_admin` and `admin` see
everything; `support_agent` sees only Live support. Opening another page shows "not
available for your role".

## Prerequisites

- Node.js 20 or newer (CI uses 24) and npm
- The [backend](https://github.com/stackstormproject/backend) running with PostgreSQL and
  Redis (the [infra](https://github.com/stackstormproject/infra) `docker-compose.yml` starts
  both), with the seed loaded

## Run it on a fresh machine

```bash
# 1. Backend (in another terminal) - see the backend README for details
git clone https://github.com/stackstormproject/infra.git && cd infra && docker compose up -d && cd ..
git clone https://github.com/stackstormproject/backend.git && cd backend
cp .env.example .env            # set JWT_SECRET, SEED_ADMIN_PASSWORD, SEED_CUSTOMER_PASSWORD
npm ci && npx sequelize-cli db:migrate && npm run db:seed && npm run dev

# 2. Admin console
git clone https://github.com/stackstormproject/stackstorm-frontend-admin.git
cd stackstorm-frontend-admin
cp .env.example .env.local      # defaults work locally
npm ci
npm run dev                     # http://localhost:5174 (proxies /api and /socket.io to :5000)
```

Sign in with a seeded staff account. The password is the `SEED_ADMIN_PASSWORD` you set in
the backend `.env`; no password is stored in this repository.

| Account                 | Role          |
| ----------------------- | ------------- |
| `admin@stackstorm.lk`   | super_admin   |
| `support@stackstorm.lk` | support_agent |

Locally the storefront (`:5173`) and the console (`:5174`) share `localhost`, so they share
the refresh cookie: signing in to one signs the other out. Deployed on separate hosts
(`admin.` subdomain) they do not interfere.

## Environment variables

| Variable              | Default                 | Purpose                                                    |
| --------------------- | ----------------------- | ---------------------------------------------------------- |
| `VITE_API_BASE_URL`   | `/api/v1`               | API path; nginx and the dev server proxy it to the backend |
| `VITE_SOCKET_URL`     | page origin             | Socket.IO origin for live support                          |
| `VITE_DEV_API_TARGET` | `http://localhost:5000` | Dev proxy target (dev server only)                         |

Vite inlines these at **build** time. Never put secrets in them; `.env*` files are
git-ignored.

E2E only: `E2E_ADMIN_PASSWORD` (required), `E2E_BASE_URL`, `E2E_API_URL`,
`E2E_ADMIN_EMAIL`, `E2E_AGENT_EMAIL`, `E2E_AGENT_PASSWORD`.

## Scripts

| Command                 | Does                                                               |
| ----------------------- | ------------------------------------------------------------------ |
| `npm run dev`           | Dev server with API and socket proxy                               |
| `npm run lint`          | ESLint (Airbnb + hooks + jsx-a11y), zero warnings allowed          |
| `npm run format:check`  | Prettier check                                                     |
| `npm run test:coverage` | Vitest unit, integration and accessibility tests; fails under 80%  |
| `npm run test:e2e`      | Playwright critical flows (needs the API and `E2E_ADMIN_PASSWORD`) |
| `npm run verify`        | Everything CI runs: lint, format, tests with coverage, build       |
| `npm run build`         | Production bundle in `dist/`                                       |

## How it is built

- React 19, React Router 7 data router: every page and every list filter has a URL
- `src/lib/http.js`: one Axios client; unwraps `{ success, data }`, turns every backend error
  shape into `ApiError { status, code, message, details }`, refreshes an expired session once
  (single-flight, because refresh tokens rotate)
- `src/lib/session.js`: the access token lives **in memory only**; the session is restored
  from the backend's httpOnly refresh cookie. There is no default user and no credential in
  the bundle
- `src/lib/roles.js`, `src/navigation.js`: the backend role matrix and the menu built from it
- `src/api/*`: one module per backend area; contract tests in `src/tests/api`
- `src/services/supportSocket.js`: the support socket. The server decides who is an agent
  from the JWT alone; the client sends no role flags
- Every state change is confirmed by the server and the screen re-reads the record:
  transitions come from the order's `allowed_statuses`, refunds are reported as the server
  made them
- Plain CSS on the team's dark palette (`src/styles/tokens.css`); text contrast 4.8:1 or more
- See `documents/adr/ADR-006-admin-console-architecture.md` for the decisions

## Tests

- `src/tests/**`: 178 Vitest + Testing Library tests, 99% line coverage, including axe-core
  checks of all 12 screens and 5 dialogs
- `e2e/**`: Playwright: sign-in and roles (desktop and phone), ship and deliver, cancel with
  refund, product and stock, return with refund, live chat with a real shopper socket.
  Runs nightly against staging (`.github/workflows/e2e.yml`)

```bash
E2E_ADMIN_PASSWORD='<SEED_ADMIN_PASSWORD>' npm run test:e2e
```

The order flows pay through the backend's mock payment provider, so run them against an API
without a live Stripe key.

## Docker

```bash
docker build -t stackstorm-admin .
docker run --rm stackstorm-admin nginx -t     # validate the nginx config
```

nginx serves the bundle, proxies `/api` and `/socket.io` to the `backend` service, sends
security headers (CSP with no third-party scripts, `frame-ancestors 'none'`, `noindex`) and
never caches `index.html`.
