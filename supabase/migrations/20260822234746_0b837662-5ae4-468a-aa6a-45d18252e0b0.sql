alter table public.subscriptions add column if not exists price_id text;
alter table public.subscriptions add column if not exists product_id text;
alter table public.subscriptions add column if not exists current_period_start timestamptz;
alter table public.subscriptions add column if not exists cancel_at_period_end boolean default false;
alter table public.subscriptions add column if not exists environment text not null default 'sandbox';

create index if not exists idx_subscriptions_stripe_id on public.subscriptions(stripe_subscription_id);

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'set_updated_at_subscriptions'
  ) then
    create trigger set_updated_at_subscriptions
      before update on public.subscriptions
      for each row execute function public.set_updated_at();
  end if;
end $$;