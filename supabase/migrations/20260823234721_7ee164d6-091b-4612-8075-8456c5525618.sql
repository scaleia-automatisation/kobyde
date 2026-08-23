DELETE FROM public.oauth_connections a
USING public.oauth_connections b
WHERE a.user_id = b.user_id AND a.provider = b.provider AND a.ctid < b.ctid;

CREATE UNIQUE INDEX IF NOT EXISTS oauth_connections_user_provider_key
  ON public.oauth_connections (user_id, provider);