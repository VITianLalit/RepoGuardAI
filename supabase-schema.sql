create table if not exists public.audit_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  repo_name text not null,
  security_score integer not null,
  risk_level text not null,
  report jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.audit_reports enable row level security;

create policy "Users can read their own audit reports"
  on public.audit_reports
  for select
  using (auth.uid() = user_id);

create policy "Users can insert their own audit reports"
  on public.audit_reports
  for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own audit reports"
  on public.audit_reports
  for delete
  using (auth.uid() = user_id);

create index if not exists audit_reports_user_created_idx
  on public.audit_reports (user_id, created_at desc);
