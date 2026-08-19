ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS plan_credits integer NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS plan_price_eur numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS plan_renews_at timestamptz NOT NULL DEFAULT (now() + interval '1 month');

ALTER TABLE public.organizations ALTER COLUMN plan SET DEFAULT 'gratuit';
ALTER TABLE public.organizations ALTER COLUMN credits SET DEFAULT 10;
ALTER TABLE public.organizations ALTER COLUMN credits_total SET DEFAULT 10;

CREATE OR REPLACE FUNCTION public.apply_monthly_renewal(_org uuid)
RETURNS public.organizations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare org public.organizations; guard int := 0;
begin
  if not public.is_org_member(_org) then raise exception 'Accès refusé'; end if;
  select * into org from public.organizations where id = _org for update;
  if not found then raise exception 'Entreprise introuvable'; end if;

  while org.plan_renews_at <= now() and guard < 24 loop
    guard := guard + 1;
    -- Report des crédits non utilisés : on ajoute simplement les crédits du mois au solde existant.
    update public.organizations
       set credits = credits + org.plan_credits,
           credits_total = credits_total + org.plan_credits,
           plan_renews_at = plan_renews_at + interval '1 month'
     where id = _org
     returning * into org;

    insert into public.credit_transactions
      (org_id, amount, reason, action_key, action_label, balance_before, balance_after, status, idempotency_key)
    values (_org, org.plan_credits, 'Renouvellement mensuel', 'plan.renewal',
      'Crédits mensuels — formule ' || org.plan, org.credits - org.plan_credits, org.credits, 'completed',
      'renewal-' || _org::text || '-' || to_char(org.plan_renews_at, 'YYYY-MM'));
  end loop;

  return org;
end $$;

CREATE OR REPLACE FUNCTION public.change_plan(_org uuid, _plan text)
RETURNS public.organizations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare org public.organizations; new_credits int; new_price numeric;
begin
  if not (public.has_org_role(_org, 'owner') or public.has_org_role(_org, 'admin')) then
    raise exception 'Seul le propriétaire ou un administrateur peut changer de formule';
  end if;

  select case _plan when 'gratuit' then 10 when 'starter' then 100 when 'business' then 200 when 'pro' then 300 end,
         case _plan when 'gratuit' then 0 when 'starter' then 49 when 'business' then 79 when 'pro' then 149 end
    into new_credits, new_price;
  if new_credits is null then raise exception 'Formule inconnue'; end if;

  select * into org from public.organizations where id = _org for update;
  if not found then raise exception 'Entreprise introuvable'; end if;

  update public.organizations
     set plan = _plan,
         plan_credits = new_credits,
         plan_price_eur = new_price,
         credits = credits + new_credits,
         credits_total = credits_total + new_credits,
         plan_renews_at = now() + interval '1 month'
   where id = _org
   returning * into org;

  insert into public.credit_transactions
    (org_id, user_id, amount, reason, action_key, action_label, balance_before, balance_after, status, idempotency_key)
  values (_org, auth.uid(), new_credits, 'Changement de formule', 'plan.change',
    'Crédits de la formule ' || _plan, org.credits - new_credits, org.credits, 'completed',
    'plan-' || _org::text || '-' || extract(epoch from now())::bigint::text);

  return org;
end $$;

REVOKE ALL ON FUNCTION public.apply_monthly_renewal(uuid) FROM public, anon;
REVOKE ALL ON FUNCTION public.change_plan(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.apply_monthly_renewal(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.change_plan(uuid, text) TO authenticated, service_role;