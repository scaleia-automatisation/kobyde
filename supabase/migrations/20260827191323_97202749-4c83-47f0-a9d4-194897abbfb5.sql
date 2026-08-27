create table if not exists public.app_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  source text not null default 'webhook',
  channel text not null default 'email',
  event_type text not null,
  entity_type text,
  entity_id uuid,
  title text not null,
  detail text,
  contact text,
  payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists app_events_org_idx on public.app_events (org_id, occurred_at desc);
create unique index if not exists app_events_dedupe_idx on public.app_events (org_id, event_type, coalesce(entity_id, '00000000-0000-0000-0000-000000000000'::uuid), occurred_at);

grant select, insert, delete on public.app_events to authenticated;
grant all on public.app_events to service_role;

alter table public.app_events enable row level security;

create policy "Members manage org events" on public.app_events
  for all to authenticated
  using (public.is_org_member(org_id))
  with check (public.is_org_member(org_id));

alter table public.quotes add column if not exists viewed_at timestamptz;
alter table public.quotes add column if not exists last_event_at timestamptz;