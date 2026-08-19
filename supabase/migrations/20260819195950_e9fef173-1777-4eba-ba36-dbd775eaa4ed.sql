-- CATALOGUE
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS price_ht numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vat_rate numeric NOT NULL DEFAULT 20,
  ADD COLUMN IF NOT EXISTS sku text,
  ADD COLUMN IF NOT EXISTS default_quantity numeric NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS subservices jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS terms text;

UPDATE public.products SET price_ht = price WHERE price_ht = 0 AND price > 0;

-- DEVIS
ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS subtotal_ht numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_type text NOT NULL DEFAULT 'aucune',
  ADD COLUMN IF NOT EXISTS discount_value numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS validity_days integer NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS refused_at timestamptz,
  ADD COLUMN IF NOT EXISTS client_comment text,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'catalogue',
  ADD COLUMN IF NOT EXISTS meeting_id uuid REFERENCES public.meetings(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS analysis jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.quote_items
  ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS vat_rate numeric NOT NULL DEFAULT 20,
  ADD COLUMN IF NOT EXISTS subservices jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS position integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.quote_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  quote_id uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  version integer NOT NULL,
  author text,
  change text NOT NULL,
  reason text,
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quote_versions TO authenticated;
GRANT ALL ON public.quote_versions TO service_role;
ALTER TABLE public.quote_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members manage quote_versions" ON public.quote_versions
  FOR ALL TO authenticated USING (public.is_org_member(org_id)) WITH CHECK (public.is_org_member(org_id));

CREATE TABLE IF NOT EXISTS public.quote_followups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  quote_id uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'j3',
  scheduled_at timestamptz NOT NULL DEFAULT now(),
  subject text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'planifiee',
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quote_followups TO authenticated;
GRANT ALL ON public.quote_followups TO service_role;
ALTER TABLE public.quote_followups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members manage quote_followups" ON public.quote_followups
  FOR ALL TO authenticated USING (public.is_org_member(org_id)) WITH CHECK (public.is_org_member(org_id));
CREATE TRIGGER set_updated_at_quote_followups BEFORE UPDATE ON public.quote_followups
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- REUNIONS
ALTER TABLE public.meetings
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'texte',
  ADD COLUMN IF NOT EXISTS transcript text,
  ADD COLUMN IF NOT EXISTS summary text,
  ADD COLUMN IF NOT EXISTS report text,
  ADD COLUMN IF NOT EXISTS analysis jsonb NOT NULL DEFAULT '[]'::jsonb;

-- DEMANDES DE PAIEMENT
CREATE TABLE IF NOT EXISTS public.payment_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  quote_id uuid REFERENCES public.quotes(id) ON DELETE SET NULL,
  label text NOT NULL,
  amount_ht numeric NOT NULL DEFAULT 0,
  vat_rate numeric NOT NULL DEFAULT 20,
  discount_amount numeric NOT NULL DEFAULT 0,
  amount_ttc numeric NOT NULL DEFAULT 0,
  due_date date,
  message text,
  method text NOT NULL DEFAULT 'stripe',
  status text NOT NULL DEFAULT 'envoyee',
  payment_url text,
  token text NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  paid_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_requests TO authenticated;
GRANT ALL ON public.payment_requests TO service_role;
ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members manage payment_requests" ON public.payment_requests
  FOR ALL TO authenticated USING (public.is_org_member(org_id)) WITH CHECK (public.is_org_member(org_id));
CREATE TRIGGER set_updated_at_payment_requests BEFORE UPDATE ON public.payment_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ECHEANCES / ACOMPTES
CREATE TABLE IF NOT EXISTS public.quote_installments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  quote_id uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  label text NOT NULL,
  percentage numeric NOT NULL DEFAULT 0,
  amount_ttc numeric NOT NULL DEFAULT 0,
  position integer NOT NULL DEFAULT 0,
  due_date date,
  status text NOT NULL DEFAULT 'a_payer',
  payment_request_id uuid REFERENCES public.payment_requests(id) ON DELETE SET NULL,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quote_installments TO authenticated;
GRANT ALL ON public.quote_installments TO service_role;
ALTER TABLE public.quote_installments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members manage quote_installments" ON public.quote_installments
  FOR ALL TO authenticated USING (public.is_org_member(org_id)) WITH CHECK (public.is_org_member(org_id));
CREATE TRIGGER set_updated_at_quote_installments BEFORE UPDATE ON public.quote_installments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- FACTURES
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS label text,
  ADD COLUMN IF NOT EXISTS installment_id uuid REFERENCES public.quote_installments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS payment_id uuid REFERENCES public.payments(id) ON DELETE SET NULL;

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS payment_request_id uuid REFERENCES public.payment_requests(id) ON DELETE SET NULL;

-- PROJETS
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS quote_id uuid REFERENCES public.quotes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS manager text,
  ADD COLUMN IF NOT EXISTS deliverables text,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

ALTER TABLE public.project_steps
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS due_date date;

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS step_id uuid REFERENCES public.project_steps(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS assignee_name text,
  ADD COLUMN IF NOT EXISTS comments jsonb NOT NULL DEFAULT '[]'::jsonb;

-- DEMANDES CLIENT
CREATE TABLE IF NOT EXISTS public.client_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  kind text NOT NULL DEFAULT 'document',
  title text NOT NULL,
  detail text,
  status text NOT NULL DEFAULT 'en_attente',
  response text,
  responded_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_requests TO authenticated;
GRANT ALL ON public.client_requests TO service_role;
ALTER TABLE public.client_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members manage client_requests" ON public.client_requests
  FOR ALL TO authenticated USING (public.is_org_member(org_id)) WITH CHECK (public.is_org_member(org_id));
CREATE TRIGGER set_updated_at_client_requests BEFORE UPDATE ON public.client_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- DOCUMENTS
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS from_client boolean NOT NULL DEFAULT false;

-- ESPACE CLIENT
CREATE TABLE IF NOT EXISTS public.client_portal_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  is_active boolean NOT NULL DEFAULT true,
  last_seen_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_portal_access TO authenticated;
GRANT ALL ON public.client_portal_access TO service_role;
ALTER TABLE public.client_portal_access ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members manage client_portal_access" ON public.client_portal_access
  FOR ALL TO authenticated USING (public.is_org_member(org_id)) WITH CHECK (public.is_org_member(org_id));
CREATE TRIGGER set_updated_at_client_portal_access BEFORE UPDATE ON public.client_portal_access
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();