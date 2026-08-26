ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS whatsapp_country_code text,
  ADD COLUMN IF NOT EXISTS telegram_country_code text;