create table if not exists public.personas (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  title text not null default 'Persona',
  content text not null default '',
  data jsonb not null default '{}'::jsonb,
  params jsonb not null default '{}'::jsonb,
  status text not null default 'brouillon',
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.prospect_searches (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  persona_id uuid references public.personas(id) on delete set null,
  params jsonb not null default '{}'::jsonb,
  steps jsonb not null default '[]'::jsonb,
  results_count integer not null default 0,
  status text not null default 'en_cours',
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.prospects add column if not exists website text;
alter table public.prospects add column if not exists source_url text;
alter table public.prospects add column if not exists channel text;
alter table public.prospects add column if not exists sources jsonb not null default '[]'::jsonb;
alter table public.prospects add column if not exists qualification text;
alter table public.prospects add column if not exists angle text;
alter table public.prospects add column if not exists personalized_message text;
alter table public.prospects add column if not exists followup_step text;
alter table public.prospects add column if not exists search_id uuid references public.prospect_searches(id) on delete set null;

grant select, insert, update, delete on public.personas to authenticated;
grant all on public.personas to service_role;
grant select, insert, update, delete on public.prospect_searches to authenticated;
grant all on public.prospect_searches to service_role;

alter table public.personas enable row level security;
alter table public.prospect_searches enable row level security;

drop policy if exists "org members full access" on public.personas;
create policy "org members full access" on public.personas for all to authenticated
  using (public.is_org_member(org_id)) with check (public.is_org_member(org_id));

drop policy if exists "org members full access" on public.prospect_searches;
create policy "org members full access" on public.prospect_searches for all to authenticated
  using (public.is_org_member(org_id)) with check (public.is_org_member(org_id));

create index if not exists prospects_search_id_idx on public.prospects(search_id);
create index if not exists personas_org_idx on public.personas(org_id);
create index if not exists prospect_searches_org_idx on public.prospect_searches(org_id);