ALTER TABLE public.oauth_connections
  ADD COLUMN IF NOT EXISTS scopes_requested text,
  ADD COLUMN IF NOT EXISTS scopes_granted text,
  ADD COLUMN IF NOT EXISTS token_type text,
  ADD COLUMN IF NOT EXISTS refresh_token_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_refresh_at timestamptz,
  ADD COLUMN IF NOT EXISTS connected_at timestamptz,
  ADD COLUMN IF NOT EXISTS revoked_at timestamptz,
  ADD COLUMN IF NOT EXISTS provider_account_id text;

UPDATE public.oauth_connections SET scopes_granted = COALESCE(scopes_granted, scopes), scopes_requested = COALESCE(scopes_requested, scopes), connected_at = COALESCE(connected_at, created_at);

DELETE FROM public.oauth_connections WHERE provider IN ('microsoft','outlook','google_business');
DELETE FROM public.platform_connectors WHERE key IN ('microsoft','outlook','google_business');

CREATE TABLE IF NOT EXISTS public.connector_call_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid,
  user_id uuid,
  agent_key text,
  provider text NOT NULL,
  account_id text,
  action text,
  endpoint text,
  status text NOT NULL DEFAULT 'ok',
  duration_ms integer,
  cost_eur numeric(12,6),
  credits integer,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.connector_call_logs TO service_role;
ALTER TABLE public.connector_call_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS connector_call_logs_created_idx ON public.connector_call_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS connector_call_logs_provider_idx ON public.connector_call_logs (provider);

CREATE TABLE IF NOT EXISTS public.connector_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key text NOT NULL UNIQUE,
  user_id uuid,
  org_id uuid,
  provider text,
  action text,
  result jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.connector_executions TO service_role;
ALTER TABLE public.connector_executions ENABLE ROW LEVEL SECURITY;