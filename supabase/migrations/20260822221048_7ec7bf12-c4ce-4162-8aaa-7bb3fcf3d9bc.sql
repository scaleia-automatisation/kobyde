CREATE TABLE public.oauth_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'meta',
  provider_user_id text NOT NULL,
  provider_email text,
  access_token text,
  refresh_token text,
  expires_at timestamptz,
  revoked boolean NOT NULL DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX oauth_connections_provider_user_id_idx ON public.oauth_connections (provider, provider_user_id);
CREATE INDEX oauth_connections_user_id_idx ON public.oauth_connections (user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.oauth_connections TO authenticated;
GRANT ALL ON public.oauth_connections TO service_role;

ALTER TABLE public.oauth_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own OAuth connections"
  ON public.oauth_connections
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage OAuth connections"
  ON public.oauth_connections
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);