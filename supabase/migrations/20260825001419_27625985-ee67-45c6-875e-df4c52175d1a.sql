CREATE TABLE public.content_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  provider text NOT NULL,
  label text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('image','video')),
  engine text,
  speed text NOT NULL DEFAULT 'Standard',
  quality text NOT NULL DEFAULT 'Standard',
  credits integer NOT NULL DEFAULT 2,
  formats text[] NOT NULL DEFAULT '{}',
  params jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  is_active boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.content_models TO authenticated;
GRANT ALL ON public.content_models TO service_role;
ALTER TABLE public.content_models ENABLE ROW LEVEL SECURITY;
CREATE POLICY "content_models_read" ON public.content_models FOR SELECT TO authenticated USING (true);
CREATE POLICY "content_models_admin" ON public.content_models FOR ALL TO authenticated
  USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

CREATE TABLE public.content_creations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by uuid,
  kind text NOT NULL,
  slides integer NOT NULL DEFAULT 1,
  product_ids uuid[] NOT NULL DEFAULT '{}',
  objective text NOT NULL DEFAULT '',
  platforms text[] NOT NULL DEFAULT '{}',
  tone text NOT NULL DEFAULT '',
  instructions text NOT NULL DEFAULT '',
  model_key text NOT NULL DEFAULT '',
  model_label text NOT NULL DEFAULT '',
  params jsonb NOT NULL DEFAULT '{}'::jsonb,
  strategy jsonb NOT NULL DEFAULT '{}'::jsonb,
  assets jsonb NOT NULL DEFAULT '[]'::jsonb,
  captions jsonb NOT NULL DEFAULT '{}'::jsonb,
  credits_used integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'genere',
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_creations TO authenticated;
GRANT ALL ON public.content_creations TO service_role;
ALTER TABLE public.content_creations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "content_creations_members" ON public.content_creations FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.memberships m WHERE m.org_id = content_creations.org_id AND m.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.memberships m WHERE m.org_id = content_creations.org_id AND m.user_id = auth.uid()));

CREATE TABLE public.content_publications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  creation_id uuid NOT NULL REFERENCES public.content_creations(id) ON DELETE CASCADE,
  platform text NOT NULL,
  account_label text,
  caption text NOT NULL DEFAULT '',
  scheduled_at timestamptz,
  published_at timestamptz,
  external_id text,
  status text NOT NULL DEFAULT 'programmee',
  error text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_publications TO authenticated;
GRANT ALL ON public.content_publications TO service_role;
ALTER TABLE public.content_publications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "content_publications_members" ON public.content_publications FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.memberships m WHERE m.org_id = content_publications.org_id AND m.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.memberships m WHERE m.org_id = content_publications.org_id AND m.user_id = auth.uid()));

CREATE TRIGGER content_models_updated BEFORE UPDATE ON public.content_models
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER content_creations_updated BEFORE UPDATE ON public.content_creations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER content_publications_updated BEFORE UPDATE ON public.content_publications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "content_bucket_members_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'content' AND EXISTS (
    SELECT 1 FROM public.memberships m WHERE m.user_id = auth.uid() AND m.org_id::text = (storage.foldername(name))[1]
  ));

INSERT INTO public.content_models (key, provider, label, kind, engine, speed, quality, credits, formats, params, is_active, sort_order, notes) VALUES
('nano-banana','Google','Nano Banana','image','google/gemini-2.5-flash-image','Rapide','Très bonne',2,'{"1:1","4:5","16:9","9:16"}','{"ratio":true,"style":true,"realism":true,"count":true,"prompt":true}',true,10,'Génération et édition d''images rapides.'),
('nano-banana-2','Google','Nano Banana 2','image','google/gemini-3.1-flash-image','Rapide','Excellente',3,'{"1:1","4:5","16:9","9:16"}','{"ratio":true,"style":true,"realism":true,"count":true,"prompt":true}',true,15,'Rapide avec une qualité pro.'),
('nano-banana-pro','Google','Nano Banana Pro','image','google/gemini-3-pro-image','Standard','Excellente',3,'{"1:1","4:5","16:9","9:16"}','{"ratio":true,"style":true,"realism":true,"count":true,"prompt":true}',true,20,'Qualité maximale Gemini.'),
('gpt-image-1-mini','OpenAI','GPT Image 1 Mini','image','openai/gpt-image-1-mini','Très rapide','Bonne',2,'{"1024x1024","1536x1024","1024x1536"}','{"resolution":true,"quality":true,"style":true,"count":true,"prompt":true}',true,25,'Option économique OpenAI.'),
('gpt-image-2','OpenAI','GPT Image 2','image','openai/gpt-image-2','Standard','Excellente',3,'{"1024x1024","1536x1024","1024x1536"}','{"resolution":true,"quality":true,"style":true,"count":true,"prompt":true}',true,30,'Modèle image OpenAI haute fidélité.'),
('imagen-4-fast','Google','Imagen 4 Fast','image',NULL,'Très rapide','Bonne',2,'{"1:1","4:5","16:9","9:16"}','{"ratio":true,"style":true,"prompt":true}',false,40,'À activer après configuration de la clé Google Imagen.'),
('imagen-4','Google','Imagen 4','image',NULL,'Standard','Très bonne',3,'{"1:1","4:5","16:9","9:16"}','{"ratio":true,"style":true,"prompt":true}',false,41,'À activer après configuration de la clé Google Imagen.'),
('imagen-4-ultra','Google','Imagen 4 Ultra','image',NULL,'Lente','Excellente',5,'{"1:1","4:5","16:9","9:16"}','{"ratio":true,"style":true,"prompt":true}',false,42,'À activer après configuration de la clé Google Imagen.'),
('grok-imagine-fast','xAI','Grok Imagine Fast','image',NULL,'Très rapide','Bonne',2,'{"1:1","16:9","9:16"}','{"ratio":true,"style":true,"prompt":true}',false,50,'À activer après configuration de la clé xAI.'),
('grok-imagine-quality','xAI','Grok Imagine Quality','image',NULL,'Standard','Très bonne',3,'{"1:1","16:9","9:16"}','{"ratio":true,"style":true,"prompt":true}',false,51,'À activer après configuration de la clé xAI.'),
('veo-3-1-lite','Google','Veo 3.1 Lite','video','google/veo-3.1-lite','Très rapide','Bonne',5,'{"16:9","9:16"}','{"ratio":true,"duration":true,"resolution":true,"audio":true,"camera":true,"style":true,"prompt":true}',true,5,'Option vidéo la plus économique.'),
('veo-3-1-fast','Google','Veo 3.1 Fast','video','google/veo-3.1-fast','Rapide','Très bonne',8,'{"16:9","9:16"}','{"ratio":true,"duration":true,"resolution":true,"audio":true,"camera":true,"style":true,"prompt":true}',true,10,'Vidéo 4 à 8 secondes avec audio.'),
('veo-3-1','Google','Veo 3.1','video','google/veo-3.1','Lente','Excellente',15,'{"16:9","9:16"}','{"ratio":true,"duration":true,"resolution":true,"audio":true,"camera":true,"style":true,"prompt":true}',true,20,'Qualité vidéo maximale.'),
('grok-imagine-video','xAI','Grok Imagine Video','video',NULL,'Rapide','Bonne',8,'{"16:9","9:16"}','{"ratio":true,"duration":true,"prompt":true}',false,50,'À activer après configuration de la clé xAI.'),
('kling-standard','Kling','Kling Standard','video',NULL,'Standard','Bonne',8,'{"16:9","9:16","1:1"}','{"ratio":true,"duration":true,"prompt":true}',false,60,'À activer après configuration de la clé Kling.'),
('kling-hq','Kling','Kling High Quality','video',NULL,'Lente','Excellente',15,'{"16:9","9:16","1:1"}','{"ratio":true,"duration":true,"prompt":true}',false,61,'À activer après configuration de la clé Kling.'),
('seedance-fast','Seedance','Seedance Fast','video',NULL,'Rapide','Bonne',8,'{"16:9","9:16"}','{"ratio":true,"duration":true,"prompt":true}',false,70,'À activer après configuration de la clé Seedance.'),
('seedance-premium','Seedance','Seedance Premium','video',NULL,'Standard','Très bonne',12,'{"16:9","9:16"}','{"ratio":true,"duration":true,"prompt":true}',false,71,'À activer après configuration de la clé Seedance.');
