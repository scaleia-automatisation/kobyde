CREATE TABLE public.intel_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  kind text NOT NULL,
  title text NOT NULL,
  summary text,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  sources jsonb NOT NULL DEFAULT '[]'::jsonb,
  params jsonb NOT NULL DEFAULT '{}'::jsonb,
  topic_id uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.intel_assets TO authenticated;
GRANT ALL ON public.intel_assets TO service_role;
ALTER TABLE public.intel_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members manage intel assets" ON public.intel_assets FOR ALL TO authenticated
USING (public.is_org_member(org_id)) WITH CHECK (public.is_org_member(org_id));
CREATE INDEX intel_assets_org_kind_idx ON public.intel_assets (org_id, kind, created_at DESC);
CREATE TRIGGER set_updated_at_intel_assets BEFORE UPDATE ON public.intel_assets
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.watch_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'concurrentielle',
  subject text NOT NULL,
  competitors text,
  frequency text NOT NULL DEFAULT 'hebdomadaire',
  active boolean NOT NULL DEFAULT true,
  last_run_at timestamptz,
  next_run_at timestamptz,
  last_asset_id uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.watch_topics TO authenticated;
GRANT ALL ON public.watch_topics TO service_role;
ALTER TABLE public.watch_topics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members manage watch topics" ON public.watch_topics FOR ALL TO authenticated
USING (public.is_org_member(org_id)) WITH CHECK (public.is_org_member(org_id));
CREATE INDEX watch_topics_org_idx ON public.watch_topics (org_id, created_at DESC);
CREATE TRIGGER set_updated_at_watch_topics BEFORE UPDATE ON public.watch_topics
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  source text NOT NULL DEFAULT 'Google',
  author text,
  rating numeric,
  content text,
  url text,
  page text,
  section text,
  topic text,
  sentiment text NOT NULL DEFAULT 'neutre',
  importance text NOT NULL DEFAULT 'normale',
  summary text,
  reply_draft text,
  reply_status text NOT NULL DEFAULT 'aucune',
  published_at timestamptz,
  replied_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members manage reviews" ON public.reviews FOR ALL TO authenticated
USING (public.is_org_member(org_id)) WITH CHECK (public.is_org_member(org_id));
CREATE INDEX reviews_org_idx ON public.reviews (org_id, created_at DESC);
CREATE TRIGGER set_updated_at_reviews BEFORE UPDATE ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();