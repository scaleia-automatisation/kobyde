ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS payment_plan text NOT NULL DEFAULT 'unique';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS payment_plan text NOT NULL DEFAULT 'unique';