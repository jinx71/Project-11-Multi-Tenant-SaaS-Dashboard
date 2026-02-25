# Quorum — Multi-Tenant SaaS Dashboard

A subscription-based, multi-workspace dashboard demonstrating the architecture patterns behind products like Slack, Notion, and Linear: **tenant isolation, role-based access control, and Stripe subscription billing** — built as Project 11 of a 12-project full-stack portfolio.

> **Live demo:** _coming soon_
>
> ![Screenshot placeholder](./docs/screenshot.png)

## What it demonstrates

- **Multi-tenancy (shared schema)** — every record is scoped by `workspaceId`; a single membership lookup enforces isolation on every request
- **RBAC** — users hold a different role (`ADMIN` / `USER` / `VIEWER`) in each workspace they belong to
- **Stripe subscription lifecycle** — Checkout sessions, signature-verified webhooks, customer portal, and automatic downgrade on cancellation
- **Plan gating** — project and member limits enforced server-side per plan tier
- **Production hygiene** — JWT auth, bcrypt hashing, zod request validation, helmet, consistent `{ success, data, message }` API envelope

## Tech stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, React Router, Axios |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL + Prisma ORM |
| Auth | JWT + bcrypt, per-workspace RBAC middleware |
| Billing | Stripe Checkout, Webhooks, Customer Portal |

## Architecture

```
client (React SPA)
   │  Bearer JWT
   ▼
Express API ──► requireAuth ──► requireRole(:workspaceId) ──► controller
   │                                   │
   │                          single Membership lookup =
   │                          tenant isolation + RBAC
   ▼
PostgreSQL (Prisma)          Stripe ──► POST /api/billing/webhook (raw body)
```

**Key model:** `Membership` joins `User` ↔ `Workspace` with a `role`, so one user can be an admin in one workspace and a viewer in another. Billing state lives on `Workspace` — the workspace, not the user, is the paying entity.

## API overview

| Method | Route | Access |
|--------|-------|--------|
| POST | `/api/auth/register` · `/login` | Public |
| GET | `/api/auth/me` | Authenticated |
| GET / POST | `/api/workspaces` | Authenticated |
| GET / PATCH / DELETE | `/api/workspaces/:workspaceId` | Member / Admin / Admin |
| GET / POST | `/api/workspaces/:workspaceId/members` | Member / Admin |
| PATCH / DELETE | `/api/workspaces/:workspaceId/members/:memberId` | Admin |
| GET / POST | `/api/workspaces/:workspaceId/projects` | Member / Admin+User |
| PATCH / DELETE | `/api/workspaces/:workspaceId/projects/:projectId` | Admin+User / Admin |
| POST | `/api/workspaces/:workspaceId/billing/checkout` · `/portal` | Admin |
| POST | `/api/billing/webhook` | Stripe (signature-verified) |

## Local setup

### Prerequisites
- Node.js 20+
- PostgreSQL 15+ running locally (or a free [Railway](https://railway.app) / [Neon](https://neon.tech) instance)
- A [Stripe](https://stripe.com) account in test mode

### 1. Backend

```bash
cd server
cp .env.example .env        # fill in DATABASE_URL, JWT_SECRET, Stripe keys
npm install
npx prisma migrate dev      # creates tables
npm run dev                 # http://localhost:4000
```

### 2. Stripe products

In the Stripe dashboard (test mode):
1. Create two recurring products — e.g. **Pro $12/mo** and **Enterprise $49/mo**
2. Copy each price ID into `STRIPE_PRICE_PRO` and `STRIPE_PRICE_ENTERPRISE`
3. Forward webhooks locally:

```bash
stripe listen --forward-to localhost:4000/api/billing/webhook
# copy the printed whsec_... into STRIPE_WEBHOOK_SECRET
```

### 3. Frontend

```bash
cd client
cp .env.example .env
npm install
npm run dev                 # http://localhost:5173
```

### Try the multi-tenant flow
1. Register two accounts (use two browsers or an incognito window)
2. As account A, add account B's email as a **Viewer** on the Members page
3. Sign in as B — same workspace, but create/delete controls are hidden and the API rejects writes
4. Upgrade the workspace on the Billing page with Stripe test card `4242 4242 4242 4242`
5. Watch the plan badge flip to PRO once the webhook lands

## Deployment

- **Frontend** → Vercel (set `VITE_API_URL` to the deployed API URL)
- **Backend + PostgreSQL** → Railway or Render (set all server env vars; point a Stripe webhook endpoint at `https://<api>/api/billing/webhook`)

## Project structure

```
server/
  prisma/schema.prisma      # User, Workspace, Membership, Project
  src/
    middleware/             # requireAuth (JWT), requireRole (tenant + RBAC)
    controllers/            # auth, workspace, member, project, billing
    routes/                 # REST routes, mergeParams for nested resources
    services/stripe.service.ts
client/
  src/
    context/                # AuthContext, WorkspaceContext
    components/             # Layout, WorkspaceSwitcher, RoleGate, PlanBadge
    pages/                  # Login, Register, Dashboard, Members, Billing, Settings
```

---

Built by [Md. Sazed Ul Karim](https://github.com/jinx71) — bridging 8+ years of pharmaceutical GMP engineering with modern full-stack development. Part of a [12-project portfolio roadmap](https://github.com/jinx71).
