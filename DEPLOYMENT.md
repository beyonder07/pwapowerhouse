# Vercel Deployment Guide

This app is a single Next.js monolith. Frontend pages and backend route handlers deploy together to Vercel.
It includes a full PWA layer: manifest, install flow, service worker caching, offline fallback, and update prompts.

## 1. Before You Deploy

Make sure these Supabase SQL files have been applied in this order:

1. `supabase/schema.sql`
2. `supabase/query-layer.sql`

The second file adds indexes, analytics helpers, and query-layer RPC functions used by the optimized owner and reporting paths.

## 2. Vercel Project Setup

Create a new Vercel project and import this repository.

Framework preset:
- `Next.js`

Root directory:
- repository root

Build command:
- leave default: `next build`

Install command:
- leave default: `npm install`

Output directory:
- leave empty

## 3. Required Environment Variables

Set these in Vercel for `Production`, `Preview`, and `Development` as needed.

### Required

```bash
NEXT_PUBLIC_APP_URL=https://your-vercel-domain.vercel.app
NEXT_PUBLIC_API_URL=
NEXT_PUBLIC_GYM_ID=powerhouse-default
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
OWNER_BOOTSTRAP_TOKEN=choose-a-strong-one-time-setup-code
NEXT_PUBLIC_GYM_BRANCH_1_LABEL=Power House Gym Indira Chowk Branch
NEXT_PUBLIC_GYM_BRANCH_1_LATITUDE=28.0320613
NEXT_PUBLIC_GYM_BRANCH_1_LONGITUDE=79.1316603
NEXT_PUBLIC_GYM_BRANCH_1_RADIUS_METERS=200
NEXT_PUBLIC_GYM_BRANCH_1_MAPS_URL=https://www.google.com/maps/place/Power+House+Gym/@28.0320613,79.1316603,17z/data=!3m1!4b1!4m6!3m5!1s0x397545eae4106853:0xd8f6742e12db8be2!8m2!3d28.0320613!4d79.1316603!16s%2Fg%2F11fxzs7lbs
NEXT_PUBLIC_GYM_BRANCH_2_LABEL=Power House Gym Pathik Chowk Branch (Rajendra Complex)
NEXT_PUBLIC_GYM_BRANCH_2_LATITUDE=28.0429756
NEXT_PUBLIC_GYM_BRANCH_2_LONGITUDE=79.1271526
NEXT_PUBLIC_GYM_BRANCH_2_RADIUS_METERS=200
NEXT_PUBLIC_GYM_BRANCH_2_MAPS_URL=https://www.google.com/maps/place/Power+House+Gym/data=!4m7!3m6!1s0x397545862e915073:0x7af65aec0e6bc596!8m2!3d28.0429756!4d79.1271526!16s%2Fg%2F11j337_6qn
```

### OTP Delivery

For local development only:

```bash
OTP_DELIVERY_PROVIDER=dev-log
OTP_WEBHOOK_URL=
OTP_WEBHOOK_AUTH_HEADER=
```

For production:

```bash
OTP_DELIVERY_PROVIDER=webhook
OTP_WEBHOOK_URL=https://your-otp-bridge.example.com/send
OTP_WEBHOOK_AUTH_HEADER=Bearer your-secret-token
```

Notes:
- Keep `NEXT_PUBLIC_API_URL` empty unless you intentionally split frontend and API across different domains.
- `SUPABASE_SERVICE_ROLE_KEY` must stay server-side only. Never expose it in client code.
- `OWNER_BOOTSTRAP_TOKEN` should be removed or rotated after the first owner is created.
- Two branch defaults already exist in the app. Use the `NEXT_PUBLIC_GYM_BRANCH_*` overrides only if you want to replace those values in a deployment.

## 4. Supabase Requirements

Your Supabase project must have:

- Auth enabled
- Storage bucket: `profile-images`
- Storage bucket: `govt-docs`
- All tables from `supabase/schema.sql`
- Query-layer functions and indexes from `supabase/query-layer.sql`

Recommended:
- turn on email templates or your OTP bridge before public use
- keep RLS enabled
- rotate keys if they were ever shared insecurely

## 5. First Production Launch Checklist

1. Deploy to Vercel
2. Open `https://your-domain/setup/owner`
3. Use the `OWNER_BOOTSTRAP_TOKEN`
4. Create the one and only owner account
5. Verify login with phone number
6. Test:
   - `/signup/client`
   - `/signup/trainer`
   - owner approval flow
   - forgot-password OTP flow
   - profile image upload
   - directions and attendance validation at both branches
7. Remove or rotate the bootstrap token after owner setup is complete

## 6. Production Validation

After deployment, verify:

- `/api/health`
- `/manifest.webmanifest`
- `/sw.js`
- install prompt appears on supported browsers
- app can be installed from Chrome / Edge mobile or desktop
- offline revisit opens cached routes and `/offline`
- unauthenticated `/owner` redirects to `/login`
- authenticated owner lands on `/owner`
- trainer cannot open `/owner`
- client cannot open `/trainer`
- request approval creates live users
- image uploads appear in Supabase Storage
- client and trainer attendance work at both branch locations

## 7. Operational Notes

- This app is optimized for roughly 400-500 members today.
- For larger scale, keep the RPC/query layer applied and watch request and payment growth.
- Old replaced profile photos are cleaned up during successful profile, member, and trainer image replacement.
- OTPs are stored hashed, not in plain text.
- Auth routes are rate-limited in-memory. For multi-instance scale, move rate limits to Redis.

## 8. Recommended Post-Deploy Hardening

1. Replace `dev-log` OTP with a real provider
2. Rotate the Supabase service role key if it was shared outside a secure secret manager
3. Add Vercel monitoring or log drains
4. Add Supabase backups and alerting
5. Add Redis-backed rate limiting if you expect multiple Vercel instances
