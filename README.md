# ⚡ Powerhouse — Gym Operations SaaS Platform

> **An offline-first, multi-role SaaS PWA** built on Next.js 16 and Supabase — automating gym revenue workflows, GPS-verified attendance, and real-time operational intelligence for modern fitness businesses.

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase)](https://supabase.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)](https://www.typescriptlang.org/)
[![PWA](https://img.shields.io/badge/PWA-Offline--First-5A0FC8?logo=pwa)](https://web.dev/progressive-web-apps/)
[![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?logo=vercel)](https://vercel.com/)

---

## 🧭 Product Overview

Powerhouse solves a real operational problem faced by independent gyms and fitness chains: **fragmented, manual, and leaky revenue management**. Trainers collect cash, owners can't verify receipts in real time, memberships expire silently, and attendance is tracked on paper.

This platform replaces all of that with a unified, role-partitioned digital operating system — deployable as a PWA from a single URL with no native app installation required.

**Target Users:**
| Persona | Pain Point Solved |
|---|---|
| Gym Owners | Blind spots in revenue, manual payroll, no real-time alerts |
| Personal Trainers | No digital client CRM, no attendance proof, manual billing |
| Members | No self-service portal, no digital payment receipts |

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Next.js 16 (App Router)                  │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │  /owner/**   │  │ /trainer/**  │  │      /client/**        │ │
│  │  Dashboard   │  │  Client CRM  │  │   Self-Service Portal  │ │
│  │  Analytics   │  │  GPS Check-in│  │   Payment Tracking     │ │
│  │  Payroll     │  │  Billing     │  │   Workout Plans        │ │
│  └──────────────┘  └──────────────┘  └────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────▼────────────────┐
              │         Supabase Platform       │
              │  ┌──────────┐  ┌─────────────┐ │
              │  │PostgreSQL│  │  Auth (JWT)  │ │
              │  │ + RLS    │  │  + GoTrue    │ │
              │  └──────────┘  └─────────────┘ │
              │  ┌──────────┐  ┌─────────────┐ │
              │  │ Storage  │  │  PostgREST  │ │
              │  │(profiles │  │  (typed API)│ │
              │  │ & docs)  │  └─────────────┘ │
              │  └──────────┘                  │
              └────────────────────────────────┘
```

**Key Architectural Decisions:**

- **App Router (Next.js 16)** — Nested layouts per role enforce session isolation and reduce shared-state bugs
- **Security Definer RPCs** — All sensitive mutations (approve payment, check-in, salary) are executed inside PostgreSQL functions with `SECURITY DEFINER` + `SET search_path = ''`, eliminating SQL injection vectors and bypassing broken RLS edge cases
- **Row Level Security** — Every table is protected by role-aware policies (`current_app_role()`) that dynamically resolve identity via `auth.uid()` — no static role mapping tables
- **Atomic Transactions** — Payment approval, membership extension, and salary disbursement are wrapped in single PL/pgSQL blocks with `SELECT ... FOR UPDATE` pessimistic locking to prevent race conditions
- **Offline-First PWA** — Service Worker with versioned cache invalidation via `/version.json` polling; cache is auto-cleaned on each app deploy

---

## 🔐 Security Engineering

### Multi-Layer Defense Model

```sql
-- Layer 1: Role helper (immutable, security definer)
CREATE OR REPLACE FUNCTION public.current_app_role()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT role FROM public.users WHERE id = auth.uid() LIMIT 1;
$$;

-- Layer 2: Policy using role helper (no table joins needed at policy level)
CREATE POLICY members_trainer_assigned_read ON public.members
  FOR SELECT TO authenticated
  USING (trainer_id = public.current_trainer_id());

-- Layer 3: Atomic RPC with pessimistic lock (prevents double-spend)
SELECT * FROM public.payment_requests
WHERE id = p_request_id AND status = 'pending'
FOR UPDATE; -- Row locked for entire transaction
```

**Implemented Controls:**
- Database-level rate limiting via `consume_rate_limit()` sliding window buckets — prevents OTP brute force
- Unique partial indexes on `payment_requests (member_id, month) WHERE status = 'pending'` — eliminates duplicate pending requests
- `idx_memberships_one_active_per_user` unique partial index — enforces one active membership per member at DB level
- Trainer-member gym co-location verified inside RLS INSERT policy — trainer cannot bill a member from a different gym branch
- Govt ID documents stored in private bucket (`govt-docs`) with owner-only RLS — zero public exposure

---

## 💰 Revenue Workflow Engine

The core business value of Powerhouse is its **two-phase payment approval pipeline**, which prevents both trainer fraud and member non-payment simultaneously.

### Trainer-Initiated Payment Flow

```
Trainer submits payment request
        │
        ▼
payment_requests table (status: pending)
│  member_id, trainer_id, amount, month, mode, screenshot_url
│  + plan_start_date, plan_end_date, payment_date (trainer-specified)
        │
        ▼
Owner receives push notification
        │
        ├── APPROVE ──▶ review_trainer_payment_request() RPC
        │                   ├── Lock request row (FOR UPDATE)
        │                   ├── Validate no duplicate payment for month
        │                   ├── INSERT into payments (with approved_by, approved_at)
        │                   ├── UPSERT memberships (extend end_date safely)
        │                   └── Return { success, requestId, status }
        │
        └── REJECT ──▶ Update status = 'rejected', add review_note
```

**Race Condition Prevention:**
```sql
-- Double-spend guard at DB layer (not just application layer)
CREATE UNIQUE INDEX unique_member_month_payment
ON public.payments (user_id, month)
WHERE status IN ('approved', 'paid', 'pending')
  AND created_at >= '2026-06-03 00:00:00+00';
```

### Membership Extension Logic

```sql
-- Smart date calculation: extends from last known active date, not always today
v_base_end := GREATEST(v_membership.end_date, current_date);
v_new_end  := v_base_end + v_plan_duration_days;
```
This single line of business logic ensures backdated renewals don't create gaps, and future renewals don't reset unfairly — a detail most gym software gets wrong.

---

## 📍 GPS Attendance Verification

Trainers and members are geofenced to their assigned gym branch using the **Haversine formula** implemented as a PostgreSQL function — not client-side JavaScript.

```sql
CREATE OR REPLACE FUNCTION public.haversine_meters(
  lat1 double precision, lon1 double precision,
  lat2 double precision, lon2 double precision
) RETURNS double precision ...

-- Used inside check_in_trainer_attendance() RPC:
v_distance := public.haversine_meters(
  p_latitude, p_longitude,
  v_branch.latitude, v_branch.longitude
);

IF v_distance > LEAST(v_branch.radius_meters, 150) THEN
  RAISE EXCEPTION 'Trainer not within gym radius';
END IF;
```

**Why server-side?** Client-side geofence checks can be spoofed via browser DevTools. By computing distance inside a `SECURITY DEFINER` function, the result is cryptographically tied to the authenticated session.

---

## 📊 Database Schema (Condensed)

```
users          → gyms (via gym_id)
  └─ trainers  → trainer_salary_records
  └─ members   → memberships
               → attendance (+ GPS coords, distance)
               → payments   (+ month, source, approved_by)
               → trainer_workout_plans (JSONB split definitions)

payment_requests → (approval pipeline) → payments + memberships
requests         → (legacy approval: trainer-attendance, member-signup)
rate_limit_buckets → (sliding window, keyed by user+action)
gym_branches    → (multi-branch GPS radii)
```

**JSONB Usage:**
- `trainer_workout_plans.split` stores the full weekly workout split (exercises, sets, reps) as a typed JSONB array — enabling flexible schema evolution without table migrations for plan content changes

---

## 🎛️ Feature Matrix

| Feature | Owner | Trainer | Member |
|---|:---:|:---:|:---:|
| Live Analytics Dashboard | ✅ | — | — |
| Revenue & Expense Tracking | ✅ | — | — |
| Payroll Management | ✅ | 👁 (view own) | — |
| Payment Request Approval | ✅ | — | — |
| Member Management | ✅ | 👁 (assigned) | — |
| Attendance Monitoring | ✅ | ✅ (self) | ✅ (self) |
| GPS-Verified Check-In | — | ✅ | ✅ |
| Client Billing Submission | — | ✅ | ✅ |
| Workout Plan Management | — | ✅ | 👁 (view) |
| Push Notifications | ✅ | — | — |
| PWA Offline Mode | ✅ | ✅ | ✅ |
| Profile & Govt ID Upload | ✅ | ✅ | ✅ |

---

## 🛠️ Technology Stack

| Layer | Technology | Version | Rationale |
|---|---|---|---|
| Framework | Next.js App Router | 16.2.0 | Nested layouts for role isolation, SSR for auth-gated pages |
| Language | TypeScript | 5.7.3 | Strict types across Supabase responses and RPC return shapes |
| Database | PostgreSQL (Supabase) | Latest | RLS, partial indexes, PL/pgSQL for atomic business logic |
| Auth | Supabase GoTrue | — | JWT + Row Level Security, OTP-based password reset |
| UI Components | Radix UI + shadcn/ui | — | Headless, accessible primitives with custom styling |
| Charts | Recharts | 2.15.0 | Revenue trend, attendance analytics |
| Animations | Framer Motion | 12.x | Page transitions, micro-interactions |
| 3D Graphics | React Three Fiber | 9.x | Landing page hero visuals |
| Smooth Scroll | Lenis | 1.1.x | Native-feel scroll on mobile PWA |
| Forms | React Hook Form + Zod | — | Type-safe form validation |
| State | SWR | 2.x | Stale-while-revalidate data fetching |
| Offline | Service Worker | — | Versioned cache with auto-cleanup |
| Analytics | Vercel Analytics | — | Real-world usage telemetry |
| Deployment | Vercel | — | Edge functions, global CDN |

---

## 🗂️ Project Structure

```
app/
├── owner/             # Owner-only routes (analytics, payroll, approvals)
│   ├── page.tsx       # Live dashboard (metrics, alerts, expiring memberships)
│   ├── analytics/     # Revenue trend charts
│   ├── payments/      # Payment history
│   ├── requests/      # Payment approval queue
│   ├── salary/        # Trainer payroll
│   ├── profit-center/ # Expense tracking
│   ├── trainers/      # Trainer management
│   └── members/       # Member CRM
├── trainer/           # Trainer-only routes
│   ├── dashboard/     # Trainer home (stats, GPS check-in)
│   ├── clients/       # Assigned member drawer
│   ├── workouts/      # Workout plan builder
│   ├── salary/        # Salary history view
│   └── attendance/    # Attendance log
├── client/            # Member self-service portal
│   ├── page.tsx       # Member home (membership status, attendance)
│   ├── payments/      # Payment history & request submission
│   └── workouts/      # View assigned workout plans
├── api/               # Next.js API routes (server-side helpers)
├── login/ signup/     # Auth flows
└── layout.tsx         # Root layout (PWA metadata, manifest, theme)

components/
├── powerhouse/        # Domain-specific components (MetricCard, PageIntro)
├── shell/             # Navigation shells per role
├── analytics/         # Chart components
├── attendance/        # Check-in UI
└── ui/                # shadcn/ui base components

supabase/migrations/
├── 202604300001_powerhouse_existing_schema.sql   # Core tables + RLS
├── 202604300002_powerhouse_runtime_rpcs.sql      # Haversine, rate limiter, GPS check-in
├── 202605020001_powerhouse_mvp_core.sql          # Gyms, memberships, multi-branch
├── 202605160001_trainer_panel_operational_scope.sql # Workout plans, salary records
├── 202605180001_trainer_daily_attendance.sql     # Daily attendance tracking
├── 202605180002_trainer_operating_hours.sql      # Operating hours config
├── 202606030002_payment_requests.sql             # Payment request pipeline + approval RPC
└── 202606030003_payment_requests_trainer_dates.sql # Trainer date override fields
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 20+, pnpm
- Supabase project (or local Supabase CLI)

### Environment Variables

```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Development

```bash
pnpm install
pnpm dev
```

### Database Setup

Apply migrations in order against your Supabase project:

```bash
# Via Supabase CLI
supabase db push

# Or manually via Supabase SQL Editor — apply files in
# supabase/migrations/ in chronological order
```

---

## 🎓 Engineering Highlights

### 1. Atomic Financial Transactions
Payment approval is not a REST endpoint — it's a single PostgreSQL stored procedure (`review_trainer_payment_request`) that atomically: (a) locks the request row, (b) validates no duplicate payment, (c) inserts the payment record with full audit trail, and (d) extends the membership. No application-layer orchestration means no partial failures.

### 2. Server-Side Rate Limiting Without Redis
`consume_rate_limit()` implements a sliding window rate limiter entirely in PostgreSQL using `INSERT ... ON CONFLICT DO UPDATE` on a `rate_limit_buckets` table. No Redis, no external infrastructure — the same database that stores data also enforces security rules.

### 3. Zero-Trust RLS Architecture
RLS policies never trust application-layer claims. Every policy calls `auth.uid()` and `current_app_role()` (a `SECURITY DEFINER` function) which reads role from the database — not from a JWT claim that could be forged.

### 4. Smart Membership Extension
The `GREATEST(end_date, current_date)` pattern handles three scenarios correctly: (a) renewing before expiry (stacks onto current end), (b) renewing after expiry (starts from today), (c) backdated renewal (doesn't reset future dates). One SQL expression replaces what would otherwise be multiple conditional branches in application code.

### 5. Versioned PWA Cache Strategy
The service worker fetches `/version.json` on every install event — built by a prebuild script — allowing instant cache invalidation on each deploy without requiring users to manually clear storage. Old caches are cleaned on activate.

---

## 📈 Scalability Considerations

- **Multi-Gym Ready**: Schema already has `gyms` table with `gym_id` FK on `users` — multi-tenant expansion requires only auth-level gym scoping in RLS policies
- **Branch Scalability**: `gym_branches` table supports unlimited branches per gym with independent GPS radii
- **Payment Audit Trail**: Every payment records `source`, `created_by`, `approved_by`, `approved_at` — full chain of custody for financial compliance
- **Index Strategy**: Partial unique indexes (e.g., one active membership per user, one pending request per member per month) enforce business invariants at the DB layer without application-level locking

---

## 📋 Resume Bullet Points

> **For recruiters reviewing this project:**

**3-Line Summary:**
- Engineered a full-stack SaaS Gym Management PWA (Next.js 16 + Supabase) with atomic payment approval workflows, GPS-verified attendance, and real-time owner notifications — serving owner, trainer, and member roles from a single codebase.
- Implemented a PostgreSQL-native rate limiter and Haversine geofencing inside `SECURITY DEFINER` RPCs, ensuring server-side enforcement of business rules without any Redis or external infrastructure dependency.
- Designed a zero-trust RLS architecture where every data access policy resolves identity dynamically via `auth.uid()` — preventing cross-tenant data leakage even if JWT claims were manipulated.

---

## 📄 License

Private — All rights reserved. Contact the repository owner for licensing inquiries.

---

<div align="center">
  Built with ⚡ by the Powerhouse team
</div>
