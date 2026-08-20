CREATE TABLE public.automation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  rule_key text NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  last_run_at timestamptz,
  runs_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, rule_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.automation_rules TO authenticated;
GRANT ALL ON public.automation_rules TO service_role;
ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members manage automation rules" ON public.automation_rules FOR ALL TO authenticated
  USING (public.is_org_member(org_id)) WITH CHECK (public.is_org_member(org_id));
CREATE TRIGGER automation_rules_updated_at BEFORE UPDATE ON public.automation_rules
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  excerpt text,
  content text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'Général',
  tags text[] NOT NULL DEFAULT '{}',
  author text,
  cover_url text,
  meta_description text,
  status text NOT NULL DEFAULT 'brouillon',
  published_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.blog_posts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blog_posts TO authenticated;
GRANT ALL ON public.blog_posts TO service_role;
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "published posts are public" ON public.blog_posts FOR SELECT TO anon, authenticated
  USING (status = 'publie');
CREATE POLICY "org members read own posts" ON public.blog_posts FOR SELECT TO authenticated
  USING (org_id IS NOT NULL AND public.is_org_member(org_id));
CREATE POLICY "org members write own posts" ON public.blog_posts FOR INSERT TO authenticated
  WITH CHECK (org_id IS NOT NULL AND public.is_org_member(org_id));
CREATE POLICY "org members update own posts" ON public.blog_posts FOR UPDATE TO authenticated
  USING (org_id IS NOT NULL AND public.is_org_member(org_id)) WITH CHECK (org_id IS NOT NULL AND public.is_org_member(org_id));
CREATE POLICY "org members delete own posts" ON public.blog_posts FOR DELETE TO authenticated
  USING (org_id IS NOT NULL AND public.is_org_member(org_id));
CREATE TRIGGER blog_posts_updated_at BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX blog_posts_status_idx ON public.blog_posts (status, published_at DESC);