ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS knowledge_json jsonb,
  ADD COLUMN IF NOT EXISTS knowledge_updated_at timestamptz;