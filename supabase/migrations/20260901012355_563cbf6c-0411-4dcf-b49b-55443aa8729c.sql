CREATE TABLE IF NOT EXISTS public.org_stripe_keys (
  org_id uuid PRIMARY KEY,
  secret_key_encrypted text NOT NULL,
  publishable_key text,
  account_id text,
  business_name text,
  livemode boolean NOT NULL DEFAULT false,
  configured_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.org_stripe_keys TO service_role;
ALTER TABLE public.org_stripe_keys ENABLE ROW LEVEL SECURITY;