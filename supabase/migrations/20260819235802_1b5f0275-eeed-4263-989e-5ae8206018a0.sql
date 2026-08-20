CREATE OR REPLACE FUNCTION public.purchase_credits(_org uuid, _credits integer)
RETURNS public.organizations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare org public.organizations; price numeric;
begin
  if not (public.has_org_role(_org, 'owner') or public.has_org_role(_org, 'admin')) then
    raise exception 'Seul le propriétaire ou un administrateur peut acheter des crédits';
  end if;

  select case _credits when 50 then 15 when 100 then 30 when 150 then 45 when 200 then 60 end into price;
  if price is null then raise exception 'Pack de crédits inconnu'; end if;

  select * into org from public.organizations where id = _org for update;
  if not found then raise exception 'Entreprise introuvable'; end if;

  update public.organizations
     set credits = credits + _credits,
         credits_total = credits_total + _credits
   where id = _org
   returning * into org;

  insert into public.credit_transactions
    (org_id, user_id, amount, reason, action_key, action_label, balance_before, balance_after, status, idempotency_key)
  values (_org, auth.uid(), _credits, 'Achat de crédits à la carte', 'credits.purchase',
    'Pack ' || _credits::text || ' crédits (' || price::text || ' €)', org.credits - _credits, org.credits, 'completed',
    'pack-' || _org::text || '-' || extract(epoch from now())::bigint::text);

  return org;
end $$;

REVOKE ALL ON FUNCTION public.purchase_credits(uuid, integer) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.purchase_credits(uuid, integer) TO authenticated, service_role;