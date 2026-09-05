# RAID AI : Revenue Recovery Control Plane

RAID is a hackathon prototype for the Razorpay AI Revenue Recovery track. It demonstrates an agentic loop that detects revenue at risk, reconstructs ambiguous payment states, diagnoses root cause, selects a bounded intervention, verifies the outcome, and records an audit trail.

## Demo positioning
- **AI reasons, policy controls money.**
- Synthetic batch metrics demonstrate measured recovery instead of a single cherry-picked transaction.
- **Razorpay webhook adapter is implemented:** `payment.failed`, `payment.authorized`, and `payment.captured` are accepted at `/api/razorpay/webhook`. The server validates `x-razorpay-signature` with HMAC-SHA256 over the raw request body and uses `x-razorpay-event-id` for idempotent processing when Supabase is configured.
- The browser never receives Razorpay secrets; live webhook validation is enabled only when `RAZORPAY_WEBHOOK_SECRET` is configured server-side. The demo itself remains test-mode/synthetic.

## Run
```bash
npm install
npm run dev
```

## Build
```bash
npm run build
npm start
```

## Important
The UI's recovery numbers are synthetic evaluation/demo values. Do not present them as production Razorpay results. The prototype does not contain real payment credentials or production payment execution.


## Backend upgrade

RAID now includes a server-side API/control layer under `app/api` and reusable services under `lib`. The browser never receives Razorpay secrets or the Supabase service-role key.

### Server endpoints
- `GET /api/health`
- `POST /api/analyze` — diagnosis + deterministic policy gate + audit
- `POST /api/recover` — policy-gated execution adapter
- `POST /api/verify` — Razorpay payment status verification
- `POST /api/razorpay/webhook` — HMAC validation + webhook idempotency

### Database
Run `supabase/schema.sql` in Supabase. Tables: `transactions`, `webhook_events`, `recovery_attempts`, `audit_logs`.

### Environment
Copy `.env.example` to your deployment settings. Use Razorpay **Test Mode** credentials only for the buildathon demo.

### Recovery safety
RAID does not let the AI directly move money. `lib/policy.js` is the final authority. For an authorized Razorpay payment, the adapter can capture after policy approval. For a failed payment, the adapter creates a bounded retry Order rather than silently charging the customer; a customer/payment flow must still complete that new order. Razorpay's capture API only changes an authorized payment to captured.


## Deploy to Vercel — shortlist/demo checklist

1. Push this folder to GitHub.
2. Import the repository into Vercel as a **Next.js** project.
3. Keep the build command as `next build`.
4. For the no-credential demo, deploy with no environment variables: the UI and deterministic safety fallback still work.
5. For the full test-mode integration, add these Vercel environment variables under **Settings → Environment Variables**:
   - `RAZORPAY_KEY_ID`
   - `RAZORPAY_KEY_SECRET`
   - `RAZORPAY_WEBHOOK_SECRET`
   - `OPENAI_API_KEY` (optional; without it RAID uses the deterministic fallback)
   - `OPENAI_MODEL` (optional, defaults to `gpt-5-mini`)
   - `SUPABASE_URL` (optional)
   - `SUPABASE_SERVICE_ROLE_KEY` (optional)
   - `MAX_RETRY_AMOUNT_INR=10000`
   - `MIN_RECOVERY_CONFIDENCE=0.85`
   - `MAX_DUPLICATE_RISK=0.20`
6. Redeploy after changing environment variables.

### Jury demo path

**Hero → Run recovery batch → Decision Simulator → Run reconstruction → Why did RAID choose this? → Failure Lab → Razorpay Integration → Audit Trail.**

The product intentionally labels synthetic evaluation values as synthetic. Never claim synthetic metrics are live Razorpay production metrics.

### Razorpay Test-mode webhook integration

Configure a Razorpay **Test Mode** webhook to POST events to:

`/api/razorpay/webhook`

Supported payment lifecycle events:
- `payment.failed` — records the failed payment state for diagnosis/recovery decisions.
- `payment.authorized` — preserves authorization evidence so RAID can block an unsafe retry.
- `payment.captured` — records successful settlement evidence for verification.

**Security:** RAID verifies the `x-razorpay-signature` header using HMAC-SHA256 over the exact raw webhook body and `RAZORPAY_WEBHOOK_SECRET`. **Idempotency:** `x-razorpay-event-id` is checked against the `webhook_events` table before processing a duplicate event. This keeps repeated delivery from creating duplicate transaction records.

The UI may show `IMPLEMENTED · SECRET REQUIRED` when no secret is configured. That is a configuration state, not a missing integration: the adapter and verification logic are already in the repository.

## Decision optimization
RAID now includes a counterfactual endpoint (`POST /api/counterfactual`) that compares RECOVER NOW, VERIFY FIRST and ESCALATE using expected value and duplicate-risk cost. It is decision support only; it never moves money.

## Benchmark
`POST /api/evaluate` generates a reproducible 10,000-event synthetic universe (seed 42), runs an explainable risk model + deterministic policy engine on every record, and compares RAID against a naive recovery baseline. The UI loads with a precomputed seed-42 result for judge visibility, and the button reruns the same benchmark server-side. Benchmark recovery is simulated and safe; it never represents production Razorpay performance.

## Architecture upgrade (v3)
The decision path is now Observe → Reconstruct → Diagnose → Predict → Policy Gate → Verify. The counterfactual endpoint estimates expected value for Recover Now, Verify First and Escalate so the system can explain not only what it recommends, but why alternative actions are worse.
