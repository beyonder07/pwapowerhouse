# PowerHouse Gym Monolith

Cloud-first Gym Management System built as a single Next.js fullstack app with Supabase.

## Stack
- Next.js App Router
- Route handlers under `src/app/api/*`
- Supabase Auth
- Supabase Postgres
- Supabase Storage
- Role-based UI for owner, trainer, and client

## Product Direction
- One codebase
- One owner account only
- No public signup into real accounts
- Client and trainer onboarding go through request -> approval
- Backend enforces role access; frontend is only a view layer
- Built for non-technical users with mobile-first flows and upload/camera-driven profile photo handling

## Current Capabilities
- Landing page and login flow
- Client, trainer, and owner dashboards
- Installable PWA with manifest, service worker, offline fallback, and update prompt
- Request-based onboarding for clients and trainers
- Owner direct member creation
- Forgot password with OTP scaffolding
- Profile photo upload to Supabase Storage via API routes
- Owner bootstrap flow at `/setup/owner`
- Supabase schema with single-owner constraint and practical RLS policies

## Project Structure
```txt
src/
  app/
    api/
    client/
    trainer/
    owner/
    login/
    signup/
    forgot-password/
    setup/
  components/
  lib/
public/
scripts/
supabase/
```

## Environment Variables
Create `.env.local` from `.env.example`.

Required:
```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=
NEXT_PUBLIC_GYM_ID=powerhouse-default
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Optional but recommended:
```bash
OWNER_BOOTSTRAP_TOKEN=one-time-setup-code
OTP_DELIVERY_PROVIDER=dev-log
OTP_WEBHOOK_URL=
OTP_WEBHOOK_AUTH_HEADER=
NEXT_PUBLIC_GYM_BRANCH_1_LABEL=Power House Gym Indira Chowk Branch
NEXT_PUBLIC_GYM_BRANCH_1_LATITUDE=28.0320613
NEXT_PUBLIC_GYM_BRANCH_1_LONGITUDE=79.1316603
NEXT_PUBLIC_GYM_BRANCH_1_RADIUS_METERS=150
NEXT_PUBLIC_GYM_BRANCH_1_MAPS_URL=https://www.google.com/maps/place/Power+House+Gym/@28.0320613,79.1316603,17z/data=!3m1!4b1!4m6!3m5!1s0x397545eae4106853:0xd8f6742e12db8be2!8m2!3d28.0320613!4d79.1316603!16s%2Fg%2F11fxzs7lbs
NEXT_PUBLIC_GYM_BRANCH_2_LABEL=Power House Gym Pathik Chowk Branch (Rajendra Complex)
NEXT_PUBLIC_GYM_BRANCH_2_LATITUDE=28.0429756
NEXT_PUBLIC_GYM_BRANCH_2_LONGITUDE=79.1271526
NEXT_PUBLIC_GYM_BRANCH_2_RADIUS_METERS=150
NEXT_PUBLIC_GYM_BRANCH_2_MAPS_URL=https://www.google.com/maps/place/Power+House+Gym/data=!4m7!3m6!1s0x397545862e915073:0x7af65aec0e6bc596!8m2!3d28.0429756!4d79.1271526!16s%2Fg%2F11j337_6qn
```

Notes:
- Leave `NEXT_PUBLIC_API_URL` empty for same-origin local API calls.
- `OWNER_BOOTSTRAP_TOKEN` protects the first-owner setup route in production.
- `OTP_DELIVERY_PROVIDER=dev-log` is safe for local development only.
- For production OTP delivery, use `OTP_DELIVERY_PROVIDER=webhook` and point `OTP_WEBHOOK_URL` at your SMS/email service bridge.
- Two branch defaults are already built into the app. Use the `NEXT_PUBLIC_GYM_BRANCH_*` values only if you want to override the labels, coordinates, radius, or map links.

## Supabase Setup
Apply these files in order inside the Supabase SQL editor:

1. `supabase/schema.sql`
2. `supabase/query-layer.sql`

`schema.sql` creates:
- `public.users`
- `public.members`
- `public.trainers`
- `public.attendance`
- `public.payments`
- `public.requests`
- `public.password_reset_requests`
- `public.trainer_attendance`
- `public.attendance_audits`
- storage buckets:
  - `profile-images` (public)
  - `govt-docs` (private)

`query-layer.sql` adds:
- performance indexes
- analytics helper functions
- notification-ready queries
- search and aggregation helpers for owner/reporting flows

## Owner Bootstrap
You have two ways to create the one and only owner.

### Option 1: Setup Page
Open:
- [http://localhost:3000/setup/owner](http://localhost:3000/setup/owner)

This route only works while no owner exists.

### Option 2: Script
```bash
npm run bootstrap:owner -- --name "PowerHouse Owner" --phone "9876543210" --email "owner@example.com" --password "StrongPass123" --setup-code "optional-code"
```

If `OWNER_BOOTSTRAP_TOKEN` is not set, omit `--setup-code`.

## Local Development
Install dependencies:
```bash
npm install
```

Run dev server:
```bash
npm run dev
```

Open:
- [http://localhost:3000](http://localhost:3000)
- [http://localhost:3000/api/health](http://localhost:3000/api/health)

## Role Routes
- `/client`
- `/trainer`
- `/owner`
- `/login`
- `/signup/client`
- `/signup/trainer`
- `/forgot-password`
- `/setup/owner`

## API Surface
- `/api/auth/*`
- `/api/data/client/*`
- `/api/data/trainer/*`
- `/api/data/owner/*`
- `/api/requests/*`
- `/api/attendance/owner/*`
- `/api/storage/profile-image`
- `/api/setup/bootstrap-owner`

## Storage Behavior
Profile photo flows now upload images to the `profile-images` Supabase bucket through the backend route:
- `POST /api/storage/profile-image`

Current behavior:
- accepts JPG, PNG, WEBP, HEIC, HEIF
- max size 2MB
- returns a public image URL
- supports public signup uploads and authenticated profile/member uploads
- removes replaced profile photos after successful profile/member/trainer updates

## PWA Behavior
- install prompt is available on supported browsers
- service worker caches the app shell and visited screens
- offline fallback page is available at `/offline`
- cached pages still open offline after first visit
- update banner appears when a new version is ready
- landing page advertises both active branches
- client and trainer attendance can validate against either configured branch

## Security Model
- Only one owner is allowed by a partial unique index.
- Non-owner writes are intended to go through Next.js API routes using the service role key.
- RLS provides a second safety layer for direct access attempts.
- Trainer/client read access is limited to their own or assigned records.
- Owner has full access.

## OTP Delivery
Forgot-password now uses a pluggable delivery layer.

Supported providers:
- `dev-log`
  - logs OTPs to the server console
  - returns `otpPreview` for local development
- `webhook`
  - POSTs `{ role, channel, destination, code }` to `OTP_WEBHOOK_URL`
  - optional auth header via `OTP_WEBHOOK_AUTH_HEADER`

Recommended production shape:
1. Use SMS for owner resets.
2. Use SMS or email for trainer/client resets.
3. Keep OTP validity short and rate-limit the route.

## Operational Checklist
Before using this in production:
1. Set all real Supabase environment variables.
2. Apply `supabase/schema.sql` to a fresh project.
3. Set `OWNER_BOOTSTRAP_TOKEN` in production.
4. Create the owner with `/setup/owner` or `npm run bootstrap:owner`.
5. Verify profile image upload works in signup and profile pages.
6. Test request approval flow end to end.
7. Replace OTP dev delivery with your real SMS/email provider.
8. Add monitoring and backups for Supabase.
9. Review storage retention for replaced images if you want automatic cleanup.
10. Deploy the Next.js app only after step 3 is complete so the first owner cannot be claimed by an unexpected visitor.

## Vercel Deployment
Deployment guide:
- [DEPLOYMENT.md](./DEPLOYMENT.md)

At minimum, set these variables on Vercel:
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_GYM_ID`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OWNER_BOOTSTRAP_TOKEN`
- `OTP_DELIVERY_PROVIDER`
- `OTP_WEBHOOK_URL`
- `OTP_WEBHOOK_AUTH_HEADER`

## Remaining Work
Still recommended before calling this fully production-complete:
- real SMS/email delivery for OTPs
- tighter audit/event logging
- background notifications and scheduled jobs
- Redis-backed rate limiting for multi-instance deployments
- deeper analytics optimization for larger gyms

## Verification Commands
```bash
npm run build
npm run lint
```

## Architecture Summary
- Frontend: role-based Next.js pages
- Backend: route handlers in the same app
- Data: Supabase Postgres
- Files: Supabase Storage
- Auth: Supabase Auth with app-level role checks
- Setup: one-time owner bootstrap
