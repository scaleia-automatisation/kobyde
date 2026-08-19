ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS vat_regime text,
  ADD COLUMN IF NOT EXISTS ideal_client_type text,
  ADD COLUMN IF NOT EXISTS ideal_client_sector text,
  ADD COLUMN IF NOT EXISTS ideal_client_location text,
  ADD COLUMN IF NOT EXISTS ideal_client_size text,
  ADD COLUMN IF NOT EXISTS ideal_client_needs text,
  ADD COLUMN IF NOT EXISTS integrations jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;