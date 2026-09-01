-- WhatsApp Business Cloud API (Meta Embedded Signup) : journal des webhooks
-- (déduplication + audit) et boîte de réception minimale des messages.
-- Aucun secret n'est stocké ici : les identifiants applicatifs Meta restent
-- dans public.platform_connectors (table déjà chiffrée/protégée service_role),
-- et les jetons utilisateur restent dans public.oauth_connections (chiffrés
-- par src/lib/token-crypto.server.ts avant écriture).

-- 1. Journal générique des webhooks entrants des connecteurs (Meta/WhatsApp
--    aujourd'hui, réutilisable pour d'autres fournisseurs à webhook plus tard).
CREATE TABLE IF NOT EXISTS public.connector_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  event_id text NOT NULL,
  waba_id text,
  org_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  processed boolean NOT NULL DEFAULT false,
  error text,
  received_at timestamptz NOT NULL DEFAULT now()
);

-- Un événement Meta (message ou statut) ne doit jamais être traité deux fois :
-- Meta réémet le même webhook en cas de non-réponse rapide (retry policy).
CREATE UNIQUE INDEX IF NOT EXISTS connector_webhook_events_provider_event_idx
  ON public.connector_webhook_events (provider, event_id);
CREATE INDEX IF NOT EXISTS connector_webhook_events_org_idx
  ON public.connector_webhook_events (org_id, received_at DESC);
CREATE INDEX IF NOT EXISTS connector_webhook_events_waba_idx
  ON public.connector_webhook_events (waba_id);

GRANT ALL ON public.connector_webhook_events TO service_role;
ALTER TABLE public.connector_webhook_events ENABLE ROW LEVEL SECURITY;
-- Aucune policy authenticated : ce journal ne contient que des payloads bruts
-- de webhook (peuvent inclure du texte de message) et n'est lisible que par
-- le backend (service_role), jamais directement par le client.

-- 2. Boîte de réception / envoi WhatsApp (une ligne par message Cloud API).
CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  waba_id text NOT NULL,
  phone_number_id text NOT NULL,
  wa_message_id text,
  direction text NOT NULL DEFAULT 'inbound' CHECK (direction IN ('inbound', 'outbound')),
  contact_phone text,
  contact_name text,
  message_type text,
  body text,
  status text NOT NULL DEFAULT 'received',
  raw jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_messages_wa_message_id_idx
  ON public.whatsapp_messages (wa_message_id) WHERE wa_message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS whatsapp_messages_org_idx
  ON public.whatsapp_messages (org_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_messages TO authenticated;
GRANT ALL ON public.whatsapp_messages TO service_role;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- Isolation stricte par entreprise, comme toutes les autres tables métier.
CREATE POLICY "Org members read own whatsapp messages" ON public.whatsapp_messages
  FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));

CREATE POLICY "Service role manages whatsapp messages" ON public.whatsapp_messages
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
