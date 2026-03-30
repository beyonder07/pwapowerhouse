# Vercel Deployment Guide

This app is a single Next.js monolith. Frontend pages and backend route handlers deploy together to Vercel.

## 1. Before You Deploy

Make sure these Supabase SQL files have been applied in this order:

1. `supabase/schema.sql`
2. `supabase/query-layer.sql`

The second file adds indexes, analytics helpers, and query-layer RPC functions used by the optimized owner/reporting paths.

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
7. Remove or rotate the bootstrap token after owner setup is complete

## 6. Production Validation

After deployment, verify:

- `/api/health`
- unauthenticated `/owner` redirects to `/login`
- authenticated owner lands on `/owner`
- trainer cannot open `/owner`
- client cannot open `/trainer`
- request approval creates live users
- image uploads appear in Supabase Storage

## 7. Operational Notes

- This app is optimized for roughly 400–500 members today.
- For larger scale, keep the RPC/query layer applied and watch request/payment growth.
- Old replaced profile photos are now cleaned up during successful profile/member/trainer image replacement.
- OTPs are stored hashed, not in plain text.
- Auth routes are rate-limited in-memory. For multi-instance scale, move rate limits to Redis.

## 8. Recommended Post-Deploy Hardening

1. Replace `dev-log` OTP with a real provider
2. Rotate the Supabase service role key if it was shared outside a secure secret manager
3. Add Vercel monitoring/log drains
4. Add Supabase backups and alerting
5. Add Redis-backed rate limiting if you expect multiple Vercel instances

