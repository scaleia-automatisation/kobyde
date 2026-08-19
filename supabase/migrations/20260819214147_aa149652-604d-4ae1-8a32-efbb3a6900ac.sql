
ALTER TABLE public.job_offers
  ADD COLUMN IF NOT EXISTS content text,
  ADD COLUMN IF NOT EXISTS source_url text,
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS contract text,
  ADD COLUMN IF NOT EXISTS analysis jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.candidates
  ADD COLUMN IF NOT EXISTS job_offer_id uuid REFERENCES public.job_offers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS stage text NOT NULL DEFAULT 'candidature',
  ADD COLUMN IF NOT EXISTS cv_path text,
  ADD COLUMN IF NOT EXISTS cv_text text,
  ADD COLUMN IF NOT EXISTS letter_path text,
  ADD COLUMN IF NOT EXISTS letter_text text,
  ADD COLUMN IF NOT EXISTS extraction jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS scoring jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS consent_at timestamptz,
  ADD COLUMN IF NOT EXISTS retention_until date,
  ADD COLUMN IF NOT EXISTS anonymized_at timestamptz,
  ADD COLUMN IF NOT EXISTS created_by uuid;

CREATE TABLE IF NOT EXISTS public.hr_interviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  candidate_id uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  round integer NOT NULL DEFAULT 1,
  scheduled_at timestamptz,
  status text NOT NULL DEFAULT 'propose',
  rating integer,
  comment text,
  audio_path text,
  analysis jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hr_interviews TO authenticated;
GRANT ALL ON public.hr_interviews TO service_role;
ALTER TABLE public.hr_interviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "hr_interviews_members" ON public.hr_interviews;
CREATE POLICY "hr_interviews_members" ON public.hr_interviews FOR ALL TO authenticated
  USING (public.is_org_member(org_id)) WITH CHECK (public.is_org_member(org_id));
DROP TRIGGER IF EXISTS set_hr_interviews_updated_at ON public.hr_interviews;
CREATE TRIGGER set_hr_interviews_updated_at BEFORE UPDATE ON public.hr_interviews
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.hr_interview_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  candidate_id uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  interview_id uuid REFERENCES public.hr_interviews(id) ON DELETE SET NULL,
  token text NOT NULL UNIQUE,
  slots jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'envoye',
  chosen_slot timestamptz,
  proposal text,
  message text,
  responded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hr_interview_invites TO authenticated;
GRANT ALL ON public.hr_interview_invites TO service_role;
ALTER TABLE public.hr_interview_invites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "hr_invites_members" ON public.hr_interview_invites;
CREATE POLICY "hr_invites_members" ON public.hr_interview_invites FOR ALL TO authenticated
  USING (public.is_org_member(org_id)) WITH CHECK (public.is_org_member(org_id));
DROP TRIGGER IF EXISTS set_hr_invites_updated_at ON public.hr_interview_invites;
CREATE TRIGGER set_hr_invites_updated_at BEFORE UPDATE ON public.hr_interview_invites
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.hr_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  candidate_id uuid,
  action text NOT NULL,
  detail text,
  actor uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.hr_audit_log TO authenticated;
GRANT ALL ON public.hr_audit_log TO service_role;
ALTER TABLE public.hr_audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "hr_audit_read" ON public.hr_audit_log;
CREATE POLICY "hr_audit_read" ON public.hr_audit_log FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));
DROP POLICY IF EXISTS "hr_audit_insert" ON public.hr_audit_log;
CREATE POLICY "hr_audit_insert" ON public.hr_audit_log FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(org_id));

CREATE INDEX IF NOT EXISTS hr_interviews_candidate_idx ON public.hr_interviews(candidate_id);
CREATE INDEX IF NOT EXISTS hr_invites_candidate_idx ON public.hr_interview_invites(candidate_id);
CREATE INDEX IF NOT EXISTS hr_audit_org_idx ON public.hr_audit_log(org_id, created_at DESC);

DROP POLICY IF EXISTS "hr_files_members" ON storage.objects;
CREATE POLICY "hr_files_members" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'hr-files' AND public.is_org_member(((storage.foldername(name))[1])::uuid))
  WITH CHECK (bucket_id = 'hr-files' AND public.is_org_member(((storage.foldername(name))[1])::uuid));
