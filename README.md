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
| Gym Owners | Revenue blind spots, manual payroll, no real-time operational alerts |
| Personal Trainers | No digital client CRM, no attendance proof, manual billing |
| Members | No self-service portal, no digital payment receipts |

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Next.js 16 (App Router)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │  /owner/**   │  │ /trainer/**  │  │      /client/**        │ │
│  │  Command     │  │  Client CRM  │  │   Self-Service Portal  │ │
│  │  Center      │  │  GPS Check-in│  │   Payment Tracking     │ │
│  │  Payroll &   │  │  Billing &   │  │   Workout Plans        │ │
│  │  Analytics   │  │  Workouts    │  │   Attendance Log       │ │
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

- **App Router (Next.js 16)** — Nested layouts per role enforce session isolation and eliminate shared-state bugs at the routing level
- **Database-Native Business Logic** — All sensitive mutations (payment approval, attendance, salary) execute inside PostgreSQL stored procedures, keeping business rules close to the data
- **Row Level Security** — Every table is protected by role-aware policies that dynamically resolve identity at the database layer — no application-level role enforcement that can be bypassed
- **Atomic Transactions** — Payment approval, membership extension, and payroll are single transactional units — no partial failures or race conditions possible
- **Offline-First PWA** — Service Worker with versioned cache invalidation ensures the app works through spotty gym Wi-Fi and auto-updates on each deployment

---

## 🏢 Owner Command Center

The owner dashboard is the operational heart of Powerhouse. It surfaces real-time business intelligence and automates tasks that would otherwise require manual tracking across spreadsheets, WhatsApp groups, and paper registers.

### 📊 Live Analytics & Revenue Intelligence
- **Real-time Pulse Metrics** — Today's check-ins, active membership count, monthly revenue, and trainer headcount at a glance
- **Revenue Trend Charts** — Daily check-in and revenue overlays to identify high-performing days and seasonal patterns
- **Expiring Membership Alerts** — Automatic flagging of members whose plans expire within a configurable window, enabling proactive outreach before churn
- **Inactive Member Detection** — Surfaces members who haven't checked in recently so trainers can follow up

### 💰 Profit Center & Expense Management
- **Revenue Tracking** — Full payment history with source attribution (trainer-assisted, self-paid, owner-entered)
- **Expense Logging** — Operational cost entries with category tags for utilities, equipment, and salaries
- **Net Profitability View** — Real revenue minus logged expenses in a unified finance panel

### 👥 Trainer Payroll Automation
- **Salary Records** — Monthly payroll entries per trainer with base salary and bonus components
- **Payment Status Tracking** — Pending / processing / paid status per cycle with timestamps
- **Trainer Performance Context** — Attendance records and assigned member counts surfaced alongside salary data

### ✅ Revenue Approval Workflow
- **Payment Request Queue** — All trainer-submitted and member-submitted payment requests appear in a structured approval panel
- **Contextual Verification** — Request details include trainer name, member details, plan dates, payment mode, and optional screenshot proof
- **One-Click Approve / Reject** — Approval atomically creates the payment record and extends the membership in a single database operation
- **Push Notifications** — Owner receives an instant browser notification whenever a new payment request is submitted

### 🏋️ Member & Trainer Management
- **Member CRM** — Full member roster with membership status, plan dates, assigned trainer, and government ID on file
- **Trainer Directory** — Trainer profiles with attendance history, salary records, and assigned member lists
- **Multi-Branch Support** — Manage members and trainers across multiple gym locations from a single dashboard

---

## 🏋️ Trainer Operational Suite

### Client Portfolio Management
- **Assigned Member Drawer** — Full client cards showing membership status, attendance history, fitness goals, and billing history
- **Billing Assistant** — Submit payment renewals on behalf of clients — supporting cash, card, UPI, and screenshot upload — with configurable plan start and end date overrides
- **Workout Plan Builder** — Create and assign structured weekly split routines with per-exercise sets, reps, and notes stored as flexible structured data

### GPS-Verified Attendance
- Trainers check in via mobile browser; location is validated server-side against their assigned branch radius
- Attendance is only recorded if the trainer is physically within the gym premises — cannot be faked from a remote location
- Late arrival is automatically flagged based on configured operating hours

---

## 📱 Member Self-Service Portal

- **Membership Status Dashboard** — Active plan, expiry date, days remaining, and gym branch info
- **One-Tap Check-In** — Geolocation-verified attendance directly from the member's mobile browser
- **Payment History** — Full record of approved payments with dates and amounts
- **Workout Plans** — View trainer-assigned split routines and progress notes
- **Profile Management** — Update profile photo, contact details, and view government ID on file

---

## 🔐 Security Architecture

Powerhouse uses a layered security model where protection is enforced at the database layer — not just the application layer.

- **Role-Based Access Control** — Three distinct roles (owner, trainer, client) with policies enforced at the database level; no role elevation possible from the client side
- **Row Level Security** — Every table in the system has RLS enabled; queries automatically filter to only the data each role is permitted to see
- **Atomic Financial Operations** — Payment approval uses pessimistic locking at the database level, preventing double-payment races even under concurrent requests
- **Duplicate Prevention** — Database-level unique constraints prevent duplicate pending payment requests per member per billing cycle
- **Rate-Limited Authentication** — OTP and authentication flows are protected by a server-side rate limiter implemented at the database layer — no external infrastructure required
- **Private Document Storage** — Government-issued identity documents are stored in a private storage bucket accessible only to the owner role
- **Server-Side GPS Validation** — Geofence checks are computed server-side inside stored procedures, not client-side — cannot be bypassed via browser DevTools

---

## 📊 Feature Matrix

| Feature | Owner | Trainer | Member |
|---|:---:|:---:|:---:|
| Live Analytics Dashboard | ✅ | — | — |
| Revenue & Expense Tracking | ✅ | — | — |
| Payroll Automation | ✅ | 👁 view own | — |
| Payment Request Approval | ✅ | — | — |
| Push Notifications | ✅ | — | — |
| Member Management CRM | ✅ | 👁 assigned | — |
| Attendance Monitoring | ✅ | ✅ | ✅ |
| GPS-Verified Check-In | — | ✅ | ✅ |
| Client Billing Submission | — | ✅ | ✅ |
| Workout Plan Management | — | ✅ | 👁 view |
| Profit Center | ✅ | — | — |
| Expiry & Inactivity Alerts | ✅ | — | — |
| Profile & Document Upload | ✅ | ✅ | ✅ |
| PWA Offline Mode | ✅ | ✅ | ✅ |

---

## 🛠️ Technology Stack

| Layer | Technology | Version | Rationale |
|---|---|---|---|
| Framework | Next.js App Router | 16.2.0 | Nested layouts for role isolation, SSR for auth-gated pages |
| Language | TypeScript | 5.7.3 | End-to-end type safety across API responses and database calls |
| Database | PostgreSQL (Supabase) | Latest | RLS, partial indexes, stored procedures for atomic business logic |
| Auth | Supabase GoTrue | — | JWT + Row Level Security, OTP-based password reset |
| UI Components | Radix UI + shadcn/ui | — | Headless, accessible primitives |
| Charts | Recharts | 2.15.0 | Revenue trend and attendance analytics |
| Animations | Framer Motion | 12.x | Page transitions, micro-interactions |
| 3D Graphics | React Three Fiber | 9.x | Landing page hero visuals |
| Smooth Scroll | Lenis | 1.1.x | Native-feel scroll on mobile PWA |
| Forms | React Hook Form + Zod | — | Type-safe form validation |
| Data Fetching | SWR | 2.x | Stale-while-revalidate with automatic revalidation |
| Offline | Service Worker | — | Versioned cache with automatic cleanup on deploy |
| Analytics | Vercel Analytics | — | Real-world usage telemetry |
| Deployment | Vercel | — | Edge network, global CDN |

---

## 🗂️ Project Structure

```
app/
├── owner/             # Owner-only routes (analytics, payroll, approvals)
│   ├── page.tsx       # Live dashboard (metrics, alerts, expiring memberships)
│   ├── analytics/     # Revenue trend charts
│   ├── payments/      # Full payment history
│   ├── requests/      # Payment approval queue
│   ├── salary/        # Trainer payroll management
│   ├── profit-center/ # Expense and profitability tracking
│   ├── trainers/      # Trainer directory and management
│   └── members/       # Member CRM
├── trainer/           # Trainer-only routes
│   ├── dashboard/     # Trainer home (stats, GPS check-in)
│   ├── clients/       # Assigned member portfolio
│   ├── workouts/      # Workout plan builder
│   ├── salary/        # Salary history view
│   └── attendance/    # Personal attendance log
├── client/            # Member self-service portal
│   ├── page.tsx       # Membership status and attendance
│   ├── payments/      # Payment history and request submission
│   └── workouts/      # Assigned workout plans
├── api/               # Server-side API routes
├── login/ signup/     # Auth flows with OTP password reset
└── layout.tsx         # Root layout (PWA manifest, theme, offline guard)

components/
├── powerhouse/        # Domain-specific components (MetricCard, PageIntro)
├── shell/             # Role-specific navigation shells
├── analytics/         # Chart components
├── attendance/        # Check-in UI components
└── ui/                # shadcn/ui base component library

supabase/
├── Core Schema        # Users, roles, gym branches, multi-tenant structure
├── Attendance Engine  # GPS check-in, Haversine validation, audit trail
├── Payment Workflow   # Approval pipeline, atomic membership extension
├── Payroll Module     # Salary records, bonus tracking, payment cycles
└── Multi-Branch       # Gym location management, radius configuration
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 20+, pnpm
- Supabase project

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

```bash
# Apply migrations via Supabase CLI
supabase db push
```

---

## 🎓 Engineering Highlights

### 1. Atomic Financial Transactions
Payment approval is not a REST endpoint — it is a single database stored procedure that atomically locks the request, validates no duplicate payment exists for the billing cycle, creates the payment record with a full audit trail, and extends the membership. No application-layer orchestration means no partial failure states.

### 2. Smart Membership Extension Logic
The system handles three renewal scenarios correctly without conditional branches in application code: renewing before expiry stacks onto the current end date, renewing after expiry starts from today, and backdated renewals never reset future dates. A single database expression handles all three cases.

### 3. Server-Side Geofencing
GPS attendance validation happens inside a database stored procedure — not in client JavaScript. This means the geofence cannot be bypassed by modifying browser state, spoofing coordinates in DevTools, or replaying API requests. The distance calculation is tied to the authenticated database session.

### 4. Database-Native Rate Limiting
Authentication rate limiting is implemented entirely in PostgreSQL using atomic upsert operations on a sliding window structure. No Redis, no external cache, no additional infrastructure — the same database that stores application data also enforces security policies.

### 5. Versioned PWA Cache Strategy
A prebuild script generates a `version.json` on every deployment. The Service Worker fetches this on install and uses it to namespace the cache — old caches are automatically purged on activate. Users always receive fresh assets without needing to clear browser storage manually.

---

## 📈 Scalability & Multi-Branch Architecture

Powerhouse is designed to serve both independent gyms and growing fitness brands operating multiple locations — from day one.

### Current Operational Scale

This platform is actively managing **2 gym branches** with **200+ members** across both locations:

| Metric | Status |
|---|---|
| Active Members | 200+ |
| Gym Branches | 2 (Indira Chowk & Pathik Chowk) |
| Roles Served | Owner, Trainers, Members |
| Attendance Method | GPS-verified per branch |
| Revenue Management | Approval-based, fully digital |

### Multi-Branch Architecture

The platform's data model is built branch-aware from the ground up:

- **Branch-specific GPS geofencing** — each branch has its own location coordinates and attendance radius; members and trainers can only check in from their assigned location
- **Branch-level user assignment** — trainers and members are routed to their branch at the database level, not the application layer
- **Centralized owner dashboard** — the owner sees analytics, approvals, payroll, and attendance across all branches from a single view, with no branch-switching required
- **Independent revenue tracking per branch** — payments, expenses, and membership data are branch-scoped, enabling per-location profitability analysis

### Traffic Characteristics

Gym workloads are operational rather than high-throughput — the platform is optimized for reliability and data integrity at low-to-moderate request volume:

- **Peak load** — Attendance check-ins cluster during morning and evening gym hours
- **Steady load** — Dashboard queries, membership status checks, and payment approvals throughout the day
- **Batch operations** — Monthly payroll calculations and membership expiry scans

At 200+ active members across 2 branches, production traffic remains well within low single-digit requests per second — making the Next.js + Supabase stack highly cost-efficient with no overprovisioning required.

### Future Growth Path

The architecture is designed to scale without rewrites:

- **Franchise expansion** — Add new gym brands as separate tenants with isolated data boundaries
- **More branches** — New locations are a database record, not a deployment
- **Centralized cross-branch analytics** — Revenue, attendance, and payroll reporting aggregated across all locations
- **Background job processing** — Membership expiry reminders, automated salary disbursement triggers
- **Real-time notification pipelines** — Expand beyond owner push notifications to trainer and member alerts
- **Enterprise reporting** — Export-ready financial and operational reports for franchise-level oversight

---

## 📋 Resume Bullet Points

> **For recruiters reviewing this project:**

- Engineered a full-stack multi-role SaaS PWA (Next.js 16 + Supabase) serving gym owners, trainers, and members from a single codebase — featuring live analytics, payroll automation, GPS attendance, and a two-phase revenue approval workflow
- Implemented atomic financial operations using PostgreSQL stored procedures with pessimistic locking, ensuring payment approval and membership extension never produce partial or inconsistent state under concurrent load
- Designed a zero-trust Row Level Security architecture where all data access is enforced at the database layer, with server-side GPS geofencing and database-native rate limiting that cannot be bypassed from the client

---

## 📄 License

Private — All rights reserved.

---

<div align="center">
  Built with ⚡ by <a href="https://github.com/beyonder07">Rajul Mishra</a>
</div>
