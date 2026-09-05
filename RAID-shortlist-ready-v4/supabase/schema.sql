create extension if not exists pgcrypto;

create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  payment_id text not null,
  amount numeric(14,2),
  currency text default 'INR',
  status text,
  method text,
  ai_state text,
  ai_confidence numeric,
  duplicate_risk numeric,
  recommended_action text,
  final_action text,
  raw_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists transactions_payment_id_idx on transactions(payment_id);

create table if not exists webhook_events (
  id uuid primary key default gen_random_uuid(),
  event_id text unique,
  event_name text not null,
  payload jsonb not null,
  received_at timestamptz not null default now()
);

create table if not exists recovery_attempts (
  id uuid primary key default gen_random_uuid(),
  payment_id text,
  action text not null,
  status text not null,
  amount numeric(14,2),
  provider_reference text,
  audit_id text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  payment_id text,
  event_type text not null,
  actor text,
  payload jsonb,
  created_at timestamptz not null default now()
);

alter table transactions enable row level security;
alter table webhook_events enable row level security;
alter table recovery_attempts enable row level security;
alter table audit_logs enable row level security;

-- Server-side service-role access is used by RAID API routes. Do not expose the service role key to the browser.
