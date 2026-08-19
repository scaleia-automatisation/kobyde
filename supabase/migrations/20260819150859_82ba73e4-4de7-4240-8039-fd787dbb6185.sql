
-- ENUMS
create type public.app_role as enum ('owner','admin','member','viewer');

-- HELPER: updated_at
create or replace function public.set_updated_at() returns trigger
language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end $$;

-- ORGANIZATIONS
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  industry text,
  logo_url text,
  credits integer not null default 1000,
  plan text not null default 'starter',
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.organizations to authenticated;
grant all on public.organizations to service_role;
alter table public.organizations enable row level security;

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null,
  role public.app_role not null default 'member',
  created_at timestamptz not null default now(),
  unique (org_id, user_id)
);
grant select, insert, update, delete on public.memberships to authenticated;
grant all on public.memberships to service_role;
alter table public.memberships enable row level security;

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  full_name text,
  email text,
  avatar_url text,
  current_org_id uuid references public.organizations(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

-- SECURITY DEFINER HELPERS
create or replace function public.is_org_member(_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.memberships m where m.org_id = _org and m.user_id = auth.uid())
$$;

create or replace function public.has_org_role(_org uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.memberships m where m.org_id = _org and m.user_id = auth.uid() and m.role = _role)
$$;

create policy "org members read" on public.organizations for select to authenticated using (public.is_org_member(id));
create policy "org owners update" on public.organizations for update to authenticated using (public.has_org_role(id,'owner') or public.has_org_role(id,'admin'));
create policy "auth users create org" on public.organizations for insert to authenticated with check (created_by = auth.uid());

create policy "members read memberships" on public.memberships for select to authenticated using (public.is_org_member(org_id));
create policy "admins manage memberships" on public.memberships for all to authenticated
  using (public.has_org_role(org_id,'owner') or public.has_org_role(org_id,'admin'))
  with check (public.has_org_role(org_id,'owner') or public.has_org_role(org_id,'admin'));

create policy "own profile read" on public.profiles for select to authenticated using (user_id = auth.uid());
create policy "own profile write" on public.profiles for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- GENERIC ORG-SCOPED TABLES
create table public.agents (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  key text not null,
  name text not null,
  role_title text not null,
  description text,
  color text not null default 'amber',
  emoji text default '🤖',
  is_active boolean not null default true,
  credits_used integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, key)
);

create table public.agent_tasks (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  agent_id uuid references public.agents(id) on delete set null,
  title text not null,
  detail text,
  status text not null default 'pending',
  priority text not null default 'normal',
  result text,
  credits_used integer not null default 0,
  due_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  agent_id uuid references public.agents(id) on delete set null,
  title text not null default 'Nouvelle conversation',
  messages jsonb not null default '[]'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  kind text not null default 'product',
  category text,
  description text,
  price numeric(12,2) not null default 0,
  unit text default 'unité',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.prospects (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  company_name text,
  full_name text not null,
  email text,
  phone text,
  city text,
  source text default 'manuel',
  status text not null default 'nouveau',
  score integer not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  company_name text,
  full_name text not null,
  email text,
  phone text,
  address text,
  status text not null default 'actif',
  total_revenue numeric(12,2) not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.opportunities (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  prospect_id uuid references public.prospects(id) on delete set null,
  title text not null,
  amount numeric(12,2) not null default 0,
  stage text not null default 'decouverte',
  probability integer not null default 50,
  expected_close date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  number text not null,
  title text not null,
  status text not null default 'brouillon',
  total_ht numeric(12,2) not null default 0,
  vat_rate numeric(5,2) not null default 20,
  total_ttc numeric(12,2) not null default 0,
  valid_until date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.quote_items (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  quote_id uuid not null references public.quotes(id) on delete cascade,
  label text not null,
  quantity numeric(12,2) not null default 1,
  unit_price numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  quote_id uuid references public.quotes(id) on delete set null,
  number text not null,
  status text not null default 'brouillon',
  amount_ht numeric(12,2) not null default 0,
  amount_ttc numeric(12,2) not null default 0,
  due_date date,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  invoice_id uuid references public.invoices(id) on delete set null,
  client_id uuid references public.clients(id) on delete set null,
  amount numeric(12,2) not null default 0,
  currency text not null default 'EUR',
  method text not null default 'stripe',
  status text not null default 'en_attente',
  stripe_payment_intent_id text,
  stripe_event_id text unique,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  name text not null,
  description text,
  status text not null default 'en_cours',
  progress integer not null default 0,
  budget numeric(12,2) not null default 0,
  start_date date,
  end_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.project_steps (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  status text not null default 'a_faire',
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  title text not null,
  status text not null default 'a_faire',
  priority text not null default 'normal',
  assignee uuid,
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  channel text not null default 'email',
  status text not null default 'brouillon',
  audience text,
  sent_count integer not null default 0,
  open_rate numeric(5,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.emails (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete set null,
  to_email text not null,
  subject text not null,
  body text,
  status text not null default 'brouillon',
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.candidates (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  full_name text not null,
  email text,
  position text,
  status text not null default 'nouveau',
  score integer not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.job_offers (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'ouverte',
  created_at timestamptz not null default now()
);

create table public.competitors (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  website text,
  notes text,
  last_analysis jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  kind text default 'autre',
  file_url text,
  size_kb integer,
  created_by uuid,
  created_at timestamptz not null default now()
);

create table public.meetings (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  client_id uuid references public.clients(id) on delete set null,
  starts_at timestamptz not null default now(),
  duration_min integer not null default 30,
  notes text,
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid,
  title text not null,
  body text,
  kind text not null default 'info',
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.credit_transactions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  agent_id uuid references public.agents(id) on delete set null,
  amount integer not null,
  reason text,
  created_at timestamptz not null default now()
);

create table public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  payload jsonb,
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid,
  action text not null,
  entity text,
  entity_id uuid,
  created_at timestamptz not null default now()
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  plan text not null default 'kobyde_39',
  status text not null default 'trialing',
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- GRANTS + RLS for all org-scoped tables
do $$
declare t text;
begin
  foreach t in array array['agents','agent_tasks','conversations','products','prospects','clients','opportunities','quotes','quote_items','invoices','payments','projects','project_steps','tasks','campaigns','emails','candidates','job_offers','competitors','documents','meetings','notifications','credit_transactions','analytics_events','audit_logs','subscriptions']
  loop
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "org members full access" on public.%I for all to authenticated using (public.is_org_member(org_id)) with check (public.is_org_member(org_id))', t);
    execute format('create index %I on public.%I (org_id)', 'idx_'||t||'_org', t);
  end loop;
end $$;

-- updated_at triggers
do $$
declare t text;
begin
  foreach t in array array['organizations','profiles','agents','agent_tasks','conversations','products','prospects','clients','opportunities','quotes','invoices','payments','projects','tasks','campaigns','candidates','competitors','subscriptions']
  loop
    execute format('create trigger set_updated_at_%I before update on public.%I for each row execute function public.set_updated_at()', t, t);
  end loop;
end $$;

-- NEW USER BOOTSTRAP
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare new_org uuid;
begin
  insert into public.organizations (name, created_by)
  values (coalesce(new.raw_user_meta_data->>'company_name', 'Mon entreprise'), new.id)
  returning id into new_org;

  insert into public.memberships (org_id, user_id, role) values (new_org, new.id, 'owner');

  insert into public.profiles (user_id, full_name, email, current_org_id)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)), new.email, new_org);

  insert into public.agents (org_id, key, name, role_title, description, color, emoji) values
    (new_org,'chef','Alex','Chef d''équipe IA','Il coordonne les 9 autres agents et vous dit quoi faire chaque jour.','amber','🧭'),
    (new_org,'prospection','Nina','Chasseuse de clients','Elle trouve de nouveaux prospects et les qualifie pour vous.','sky','🔎'),
    (new_org,'vente','Marco','Commercial','Il relance les prospects et prépare vos devis.','emerald','🤝'),
    (new_org,'devis','Léa','Devis & factures','Elle rédige les devis, les factures et suit les paiements.','violet','🧾'),
    (new_org,'marketing','Sam','Marketing','Il écrit vos publications, emails et campagnes.','rose','📣'),
    (new_org,'support','Ines','Service client','Elle répond aux clients rapidement et poliment.','teal','💬'),
    (new_org,'projet','Tom','Chef de projet','Il organise les projets, les étapes et les délais.','indigo','🗂️'),
    (new_org,'rh','Clara','Ressources humaines','Elle trie les candidatures et prépare les entretiens.','orange','👥'),
    (new_org,'veille','Yanis','Veille & concurrence','Il surveille vos concurrents et votre réputation.','cyan','🛰️'),
    (new_org,'analyste','Zoé','Analyste','Elle analyse vos chiffres et repère ce qui rapporte.','lime','📊');

  insert into public.notifications (org_id, user_id, title, body, kind)
  values (new_org, new.id, 'Bienvenue chez Kobyde 👋', 'Votre équipe de 10 agents IA est prête. Commencez par ajouter un prospect.', 'info');

  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
