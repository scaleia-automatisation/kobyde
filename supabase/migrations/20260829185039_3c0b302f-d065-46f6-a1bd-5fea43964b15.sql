CREATE TABLE public.org_stripe_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
  stripe_account_id text NOT NULL,
  livemode boolean NOT NULL DEFAULT false,
  scope text,
  business_name text,
  country text,
  default_currency text,
  charges_enabled boolean NOT NULL DEFAULT false,
  payouts_enabled boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'connected',
  connected_by uuid,
  connected_at timestamptz NOT NULL DEFAULT now(),
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.org_stripe_accounts TO authenticated;
GRANT ALL ON public.org_stripe_accounts TO service_role;
ALTER TABLE public.org_stripe_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view their org stripe account"
  ON public.org_stripe_accounts FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));

CREATE TABLE public.org_stripe_oauth_states (
  state text PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 minutes')
);

GRANT ALL ON public.org_stripe_oauth_states TO service_role;
ALTER TABLE public.org_stripe_oauth_states ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_org_stripe_accounts_account ON public.org_stripe_accounts(stripe_account_id);