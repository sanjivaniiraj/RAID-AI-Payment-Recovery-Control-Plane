# RAID Backend / API / Database Upgrade

This upgrade adds a server-side control plane without exposing payment secrets to the browser.

## Endpoints
- `GET /api/health` — configuration health check.
- `POST /api/analyze` — AI/deterministic diagnosis + policy gate + audit write.
- `POST /api/recover` — policy-gated execution adapter. For an authorized payment it can capture; for a failed payment it creates a bounded retry order rather than charging automatically.
- `POST /api/verify` — fetches the Razorpay payment status for verification.
- `POST /api/razorpay/webhook` — validates Razorpay's HMAC signature and deduplicates webhook events.

## Database
Run `supabase/schema.sql` in a Supabase SQL editor, then add the values from `.env.example` to Vercel Environment Variables.

## Razorpay setup
Use Test Mode keys. Configure a public HTTPS webhook URL:
`https://YOUR-DOMAIN/api/razorpay/webhook`

Subscribe to payment events such as `payment.authorized`, `payment.captured`, and `payment.failed`.

## AI
If `OPENAI_API_KEY` is present, `/api/analyze` uses the configured Responses API model. If it is absent, RAID falls back to a deterministic diagnosis so the demo remains functional.

## Safety
The model never gets direct money-moving authority. `lib/policy.js` is the final gate. The recovery endpoint refuses actions outside the policy.

## Razorpay webhook readiness

The webhook adapter is implemented at `/api/razorpay/webhook` for `payment.failed`, `payment.authorized`, and `payment.captured`. It verifies `x-razorpay-signature` with HMAC-SHA256 over the raw body and uses `x-razorpay-event-id` with the `webhook_events` table for idempotency when Supabase is configured. No Razorpay secret is exposed to the browser.
