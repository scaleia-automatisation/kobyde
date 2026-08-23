-- 1. Connecteurs plateforme (Super Admin uniquement, secrets côté backend)
CREATE TABLE public.platform_connectors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'autre',
  description text,
  auth_type text NOT NULL DEFAULT 'api_key',
  is_enabled boolean NOT NULL DEFAULT false,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  secrets jsonb NOT NULL DEFAULT '{}'::jsonb,
  services jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'non_configure',
  last_test_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.platform_connectors TO service_role;
ALTER TABLE public.platform_connectors ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER set_updated_at_platform_connectors BEFORE UPDATE ON public.platform_connectors
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. Tarifs API (historisés)
CREATE TABLE public.api_pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connector_key text NOT NULL,
  model text,
  unit text NOT NULL DEFAULT 'request',
  unit_price numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'EUR',
  effective_from timestamptz NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.api_pricing TO service_role;
ALTER TABLE public.api_pricing ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER set_updated_at_api_pricing BEFORE UPDATE ON public.api_pricing
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. Evénements d'utilisation / coûts
CREATE TABLE public.api_usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid,
  agent_key text,
  feature text,
  connector_key text,
  model text,
  action_type text,
  quantity numeric NOT NULL DEFAULT 1,
  unit text NOT NULL DEFAULT 'request',
  estimated_cost_eur numeric NOT NULL DEFAULT 0,
  real_cost_eur numeric,
  credits integer NOT NULL DEFAULT 0,
  duration_ms integer,
  status text NOT NULL DEFAULT 'success',
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX api_usage_events_org_idx ON public.api_usage_events (org_id, created_at DESC);
CREATE INDEX api_usage_events_connector_idx ON public.api_usage_events (connector_key, created_at DESC);
GRANT SELECT ON public.api_usage_events TO authenticated;
GRANT ALL ON public.api_usage_events TO service_role;
ALTER TABLE public.api_usage_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read own org usage" ON public.api_usage_events
  FOR SELECT TO authenticated USING (public.is_org_member(org_id));

-- 4. Budgets / alertes de coûts
CREATE TABLE public.cost_budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL DEFAULT 'global',
  scope_ref text,
  connector_key text,
  period text NOT NULL DEFAULT 'monthly',
  amount_eur numeric NOT NULL DEFAULT 0,
  action_on_limit text NOT NULL DEFAULT 'notify',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.cost_budgets TO service_role;
ALTER TABLE public.cost_budgets ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER set_updated_at_cost_budgets BEFORE UPDATE ON public.cost_budgets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5. Etats OAuth temporaires (anti-CSRF)
CREATE TABLE public.oauth_states (
  state text PRIMARY KEY,
  user_id uuid NOT NULL,
  org_id uuid,
  connector_key text NOT NULL,
  redirect_to text,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '15 minutes'
);
GRANT ALL ON public.oauth_states TO service_role;
ALTER TABLE public.oauth_states ENABLE ROW LEVEL SECURITY;

-- 6. Comptes connectés par utilisateur : enrichissement
ALTER TABLE public.oauth_connections
  ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS connector_key text,
  ADD COLUMN IF NOT EXISTS scopes text,
  ADD COLUMN IF NOT EXISTS account_label text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS last_used_at timestamptz;
