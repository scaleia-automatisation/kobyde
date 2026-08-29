CREATE TABLE public.org_connector_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  provider text NOT NULL,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  secrets_encrypted text,
  configured_fields text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'non_configure',
  last_test_at timestamptz,
  last_test_ok boolean,
  last_error text,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, provider)
);

GRANT ALL ON public.org_connector_credentials TO service_role;
ALTER TABLE public.org_connector_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role manages org connector credentials"
  ON public.org_connector_credentials FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE TRIGGER set_updated_at_org_connector_credentials
  BEFORE UPDATE ON public.org_connector_credentials
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();