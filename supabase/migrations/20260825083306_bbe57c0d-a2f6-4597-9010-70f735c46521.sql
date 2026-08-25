CREATE TABLE public.agent_actions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid,
  agent_key text,
  action_type text not null,
  entity_type text not null,
  entity_id uuid,
  entity_label text,
  fingerprint text not null,
  status text not null default 'termine',
  result text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_actions TO authenticated;
GRANT ALL ON public.agent_actions TO service_role;

ALTER TABLE public.agent_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Membres gèrent la mémoire d'actions de leur entreprise"
ON public.agent_actions FOR ALL TO authenticated
USING (public.is_org_member(org_id))
WITH CHECK (public.is_org_member(org_id));

CREATE INDEX agent_actions_org_created_idx ON public.agent_actions (org_id, created_at DESC);
CREATE INDEX agent_actions_fingerprint_idx ON public.agent_actions (org_id, fingerprint);
CREATE INDEX agent_actions_entity_idx ON public.agent_actions (org_id, entity_type, entity_id);