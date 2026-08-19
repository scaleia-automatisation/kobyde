ALTER TABLE public.credit_transactions
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS action_key text,
  ADD COLUMN IF NOT EXISTS action_label text,
  ADD COLUMN IF NOT EXISTS balance_before integer,
  ADD COLUMN IF NOT EXISTS balance_after integer,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'completed',
  ADD COLUMN IF NOT EXISTS task_id uuid,
  ADD COLUMN IF NOT EXISTS result text,
  ADD COLUMN IF NOT EXISTS error text,
  ADD COLUMN IF NOT EXISTS idempotency_key text;

CREATE UNIQUE INDEX IF NOT EXISTS credit_transactions_idem_key
  ON public.credit_transactions (org_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS credits_total integer NOT NULL DEFAULT 1000;

CREATE OR REPLACE FUNCTION public.reserve_credits(
  _org uuid, _action_key text, _action_label text, _credits integer,
  _idempotency_key text, _agent_id uuid DEFAULT NULL, _task_id uuid DEFAULT NULL
) RETURNS public.credit_transactions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare existing public.credit_transactions; before_bal integer; tx public.credit_transactions;
begin
  if not public.is_org_member(_org) then raise exception 'Accès refusé'; end if;
  if _credits < 0 then raise exception 'Montant invalide'; end if;

  select * into existing from public.credit_transactions
   where org_id = _org and idempotency_key = _idempotency_key;
  if found then return existing; end if;

  select credits into before_bal from public.organizations where id = _org for update;
  if before_bal is null then raise exception 'Entreprise introuvable'; end if;
  if before_bal < _credits then raise exception 'Crédits insuffisants'; end if;

  update public.organizations set credits = credits - _credits where id = _org;

  insert into public.credit_transactions
    (org_id, agent_id, user_id, amount, reason, action_key, action_label,
     balance_before, balance_after, status, task_id, idempotency_key)
  values (_org, _agent_id, auth.uid(), -_credits, _action_label, _action_key, _action_label,
     before_bal, before_bal - _credits, 'reserved', _task_id, _idempotency_key)
  returning * into tx;
  return tx;
end $$;

CREATE OR REPLACE FUNCTION public.complete_credits(_tx uuid, _result text DEFAULT NULL, _task_id uuid DEFAULT NULL)
RETURNS public.credit_transactions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare tx public.credit_transactions;
begin
  select * into tx from public.credit_transactions where id = _tx;
  if not found then raise exception 'Transaction introuvable'; end if;
  if not public.is_org_member(tx.org_id) then raise exception 'Accès refusé'; end if;
  if tx.status <> 'reserved' then return tx; end if;
  update public.credit_transactions
     set status = 'completed', result = coalesce(_result, result), task_id = coalesce(_task_id, task_id)
   where id = _tx returning * into tx;
  return tx;
end $$;

CREATE OR REPLACE FUNCTION public.refund_credits(_tx uuid, _error text DEFAULT NULL)
RETURNS public.credit_transactions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare tx public.credit_transactions;
begin
  select * into tx from public.credit_transactions where id = _tx for update;
  if not found then raise exception 'Transaction introuvable'; end if;
  if not public.is_org_member(tx.org_id) then raise exception 'Accès refusé'; end if;
  if tx.status <> 'reserved' then return tx; end if;
  update public.organizations set credits = credits + abs(tx.amount) where id = tx.org_id;
  update public.credit_transactions
     set status = 'refunded', error = _error, balance_after = tx.balance_before
   where id = _tx returning * into tx;
  return tx;
end $$;

REVOKE ALL ON FUNCTION public.reserve_credits(uuid, text, text, integer, text, uuid, uuid) FROM public, anon;
REVOKE ALL ON FUNCTION public.complete_credits(uuid, text, uuid) FROM public, anon;
REVOKE ALL ON FUNCTION public.refund_credits(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.reserve_credits(uuid, text, text, integer, text, uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.complete_credits(uuid, text, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.refund_credits(uuid, text) TO authenticated, service_role;