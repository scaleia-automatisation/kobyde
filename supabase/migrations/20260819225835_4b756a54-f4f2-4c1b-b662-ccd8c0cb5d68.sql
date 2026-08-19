CREATE TABLE public.platform_admins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  email text,
  created_at timestamptz not null default now()
);
GRANT SELECT ON public.platform_admins TO authenticated;
GRANT ALL ON public.platform_admins TO service_role;
ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  select exists (select 1 from public.platform_admins pa where pa.user_id = auth.uid())
$$;

CREATE POLICY "Platform admins can view admins" ON public.platform_admins
FOR SELECT TO authenticated USING (public.is_platform_admin());

CREATE TABLE public.user_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  org_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  name text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
CREATE INDEX user_events_name_idx ON public.user_events (name, created_at desc);
CREATE INDEX user_events_user_idx ON public.user_events (user_id, created_at desc);
GRANT SELECT, INSERT ON public.user_events TO authenticated;
GRANT ALL ON public.user_events TO service_role;
ALTER TABLE public.user_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users insert own events" ON public.user_events
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users read own events" ON public.user_events
FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_platform_admin());

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS is_suspended boolean not null default false,
  ADD COLUMN IF NOT EXISTS suspended_at timestamptz,
  ADD COLUMN IF NOT EXISTS suspended_reason text;

INSERT INTO public.platform_admins (user_id, email)
SELECT u.id, u.email FROM auth.users u ORDER BY u.created_at ASC LIMIT 1
ON CONFLICT (user_id) DO NOTHING;