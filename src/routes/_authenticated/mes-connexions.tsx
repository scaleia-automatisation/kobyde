import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Check, Copy, Link2, PlugZap, RefreshCw, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { OrgStripeCard } from "@/components/org-stripe-card";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

import {
  completeWhatsappSignup,
  disconnectConnection,
  myConnections,
  startConnection,
  testMyConnection,
  toggleMyConnection,
  whatsappEmbeddedConfig,
} from "@/lib/connectors.functions";
import { CONNECTOR_MAP } from "@/lib/connectors.catalog";

/** Charge (une seule fois) le SDK Facebook nécessaire à l'Embedded Signup WhatsApp. */
function loadFacebookSdk(appId: string): Promise<any> {
  const w = window as any;
  if (w.FB) return Promise.resolve(w.FB);
  return new Promise((resolve, reject) => {
    w.fbAsyncInit = () => {
      w.FB.init({ appId, cookie: true, xfbml: true, version: "v20.0" });
      resolve(w.FB);
    };
    const existing = document.getElementById("facebook-jssdk");
    if (existing) return;
    const script = document.createElement("script");
    script.id = "facebook-jssdk";
    script.async = true;
    script.defer = true;
    script.src = "https://connect.facebook.net/fr_FR/sdk.js";
    script.onerror = () => reject(new Error("Impossible de charger le SDK Meta."));
    document.body.appendChild(script);
  });
}

type Search = { connexion?: string | undefined; message?: string | undefined; whatsapp?: string | undefined };

const TITLE = "Mes connexions — Kobyde";
const DESCRIPTION =
  "Connectez vos comptes Google, YouTube, Meta, LinkedIn, TikTok, Notion, Slack et WhatsApp Business en un clic, et configurez Stripe pour encaisser vos clients.";

export const Route = createFileRoute("/_authenticated/mes-connexions")({
  component: MesConnexionsPage,
  validateSearch: (search: Record<string, unknown>): Search => ({
    connexion: typeof search["connexion"] === "string" ? (search["connexion"] as string) : undefined,
    message: typeof search["message"] === "string" ? (search["message"] as string) : undefined,
    whatsapp: typeof search["whatsapp"] === "string" ? (search["whatsapp"] as string) : undefined,
  }),
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function MesConnexionsPage() {
  const search = useSearch({ from: "/_authenticated/mes-connexions" });
  const listFn = useServerFn(myConnections);
  const startFn = useServerFn(startConnection);
  const stopFn = useServerFn(disconnectConnection);
  const toggleFn = useServerFn(toggleMyConnection);
  const testFn = useServerFn(testMyConnection);
  const waConfigFn = useServerFn(whatsappEmbeddedConfig);
  const completeWaFn = useServerFn(completeWhatsappSignup);
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: ["my-connections"],
    queryFn: async () => {
      const res = await listFn({ data: undefined });
      if (res == null) throw new Error("Votre session a expiré : rechargez la page ou reconnectez-vous.");
      return res;
    },
  });
  const items = useMemo(() => list.data ?? [], [list.data]);
  const [busy, setBusy] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, { ok: boolean; message: string }>>({});
  const [copied, setCopied] = useState<string | null>(null);

  const getRedirectUri = (key: string) => {
    const prod = "https://kobyde.com";
    return key === "google" ? `${prod}/auth/callback` : `${prod}/api/public/connectors/${key}/callback`;
  };

  const copy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      toast.success("URI copiée dans le presse-papiers");
      setTimeout(() => setCopied(null), 2000);
    } catch {
      toast.error("Impossible de copier l'URI");
    }
  };

  // Retour depuis la page d'autorisation (ou restauration de la page en cache
  // navigateur via le bouton « retour ») : on défige le bouton « Redirection… »
  // et on recharge l'état des connexions pour afficher « Connecté ».
  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        setBusy(null);
        void qc.invalidateQueries({ queryKey: ["my-connections"] });
      }
    };
    const onFocus = () => {
      setBusy(null);
      void qc.invalidateQueries({ queryKey: ["my-connections"] });
    };
    window.addEventListener("pageshow", onPageShow);
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener("focus", onFocus);
    };
  }, [qc]);

  useEffect(() => {
    if (search.connexion === "ok") {
      toast.success("Connexion réussie : votre compte est autorisé.");
      void qc.invalidateQueries({ queryKey: ["my-connections"] });
    }
    if (search.connexion === "error") toast.error(search.message ?? "Connexion impossible.");
  }, [search.connexion, search.message, search.whatsapp, qc]);

  // Uniquement les plateformes OAuth que l'utilisateur autorise avec son propre compte.
  const oauthItems = useMemo(
    () =>
      items.filter((c) => {
        if (c.key === "stripe") return false;
        if ((c as { platformManaged?: boolean }).platformManaged) return false;
        const def = CONNECTOR_MAP.get(c.key);
        return def?.authType === "oauth" && def?.userConnect === true;
      }),
    [items],
  );

  /**
   * WhatsApp Business : Meta impose l'Embedded Signup via le SDK Facebook
   * (FB.login avec config_id). Une redirection OAuth classique renvoie
   * « Sorry, something went wrong ». Après l'échange du code côté serveur,
   * on force le retour sur la page et le connecteur s'affiche « Connecté ».
   */
  const connectWhatsapp = async () => {
    // Meta n'autorise l'Embedded Signup que depuis le domaine déclaré dans
    // l'application. L'aperçu Lovable est dans une iframe et produit
    // `status: unknown`, interprété à tort comme une annulation.
    if (window.location.hostname !== "kobyde.com") {
      const canonicalUrl = "https://kobyde.com/mes-connexions?whatsapp=ready";
      try {
        if (window.top && window.top !== window.self) {
          window.top.location.href = canonicalUrl;
        } else {
          window.location.href = canonicalUrl;
        }
      } catch {
        window.open(canonicalUrl, "_blank", "noopener,noreferrer");
      }
      return;
    }

    setBusy("whatsapp");
    try {
      const conf = await waConfigFn({ data: undefined });
      if (!conf?.appId || !conf?.configId) {
        toast.error("WhatsApp Business n'est pas encore configuré par votre administrateur.");
        return;
      }
      const FB = await loadFacebookSdk(conf.appId);
      const authorization = await new Promise<{ code: string | null; accessToken: string | null; status: string | null }>(
        (resolve) => {
        FB.login(
          (response: any) =>
            resolve({
              code: response?.authResponse?.code ?? null,
              accessToken: response?.authResponse?.accessToken ?? null,
              status: response?.status ?? null,
            }),
          {
            config_id: conf.configId,
            response_type: "code",
            override_default_response_type: true,
            extras: { setup: {}, featureType: "", sessionInfoVersion: "3" },
          },
        );
        },
      );
      if (!authorization.code && !authorization.accessToken) {
        toast.error(
          authorization.status === "unknown"
            ? "Meta n'a pas pu vérifier la session. Rechargez cette page sur kobyde.com puis réessayez."
            : "Connexion WhatsApp interrompue avant la fin de l'autorisation Meta.",
        );
        return;
      }
      await completeWaFn({
        data: {
          ...(authorization.code ? { code: authorization.code } : {}),
          ...(authorization.accessToken ? { accessToken: authorization.accessToken } : {}),
        },
      });
      toast.success("WhatsApp Business connecté.");
      await qc.invalidateQueries({ queryKey: ["my-connections"] });
      // Redirection directe pour repartir sur un état propre.
      window.location.replace("https://kobyde.com/mes-connexions?connexion=ok");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Connexion WhatsApp impossible.");
    } finally {
      setBusy(null);
    }
  };

  /**
   * Les pages d'autorisation (Google, TikTok, LinkedIn, Meta…) refusent d'être
   * affichées dans une iframe (X-Frame-Options → ERR_BLOCKED_BY_RESPONSE).
   * On ouvre donc l'onglet IMMÉDIATEMENT dans le gestionnaire de clic
   * (sinon le navigateur bloque le popup ouvert après l'appel serveur), puis
   * on le dirige vers la route relais qui redirige hors iframe.
   */
  const connect = async (key: string) => {
    if (key === "whatsapp") {
      await connectWhatsapp();
      return;
    }

    setBusy(key);

    const inIframe = (() => {
      try {
        return window.top !== window.self;
      } catch {
        return true;
      }
    })();
    // Onglet ouvert de façon synchrone : jamais bloqué par le navigateur.
    const tab = inIframe ? window.open("about:blank", "_blank") : null;

    try {
      const res = await startFn({
        data: { connectorKey: key, origin: window.location.origin },
      });
      if (res?.url) {
        // Toujours utiliser le domaine public vérifié pour le relais OAuth.
        // Les URL d'aperçu éphémères peuvent être signalées par Safe Browsing,
        // alors que le fournisseur doit s'ouvrir hors de l'iframe de l'éditeur.
        const relay = `https://kobyde.com/oauth/launch?url=${encodeURIComponent(res.url)}`;
        if (tab) {
          tab.location.href = relay;
        } else {
          // Hors iframe (site publié) : navigation directe dans l'onglet courant.
          window.location.href = res.url;
        }
        return;
      }
      tab?.close();
      toast.error(res?.error ?? "Ce service n'est pas encore disponible. Contactez votre administrateur.");
    } catch (e) {
      tab?.close();
      toast.error(e instanceof Error ? e.message : "Connexion impossible.");
    } finally {
      setBusy(null);
    }
  };

  const test = async (key: string) => {
    setBusy(key);
    try {
      const res = await testFn({ data: { connectorKey: key } });
      setResults((p) => ({ ...p, [key]: res }));
      if (res.ok) toast.success(res.message);
      else toast.error(res.message);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Test impossible.";
      setResults((p) => ({ ...p, [key]: { ok: false, message } }));
      toast.error(message);
    } finally {
      setBusy(null);
    }
  };

  const disconnect = async (key: string, name: string) => {
    if (!window.confirm(`Déconnecter ${name} ? Vos agents ne pourront plus utiliser ce compte.`)) return;
    try {
      await stopFn({ data: { connectorKey: key } });
      toast.success(`${name} déconnecté.`);
      void qc.invalidateQueries({ queryKey: ["my-connections"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Déconnexion impossible.");
    }
  };

  const setActive = async (key: string, active: boolean) => {
    try {
      await toggleFn({ data: { connectorKey: key, active } });
      void qc.invalidateQueries({ queryKey: ["my-connections"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Modification impossible.");
    }
  };

  return (
    <AppShell title="Mes connexions" subtitle="Connectez vos comptes en un clic, sans clé ni code technique">
      <div className="flex flex-col gap-4">
        <Card className="flex items-start gap-3 border-primary/20 bg-primary/5 p-4">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" />
          <p className="text-sm text-muted-foreground">
            Cliquez sur « Se connecter » : la plateforme vous demande d'approuver l'accès, puis vous revenez ici
            automatiquement. Vos accès sont renouvelés en continu, aucune clé à saisir. Seul Stripe se configure avec
            vos clés.
          </p>
        </Card>

        {oauthItems.map((c) => (
          <Card key={c.key} className="space-y-4 p-5">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 sm:flex sm:flex-wrap sm:justify-between">
              <div className="flex min-w-0 items-center gap-2">
                <Link2 className="size-4 shrink-0 text-muted-foreground" />
                <h3 className="truncate font-medium">{c.name}</h3>
                {c.needsReconnect ? (
                  <Badge className="shrink-0 bg-amber-500/15 text-amber-600">Reconnexion nécessaire</Badge>
                ) : c.connected ? (
                  <Badge className="shrink-0 bg-emerald-500/15 text-emerald-600">● Connecté</Badge>
                ) : c.available ? (
                  <Badge className="shrink-0" variant="secondary">
                    Disponible
                  </Badge>
                ) : (
                  <Badge className="shrink-0" variant="outline">
                    Bientôt disponible
                  </Badge>
                )}
              </div>
              {c.connected && (
                <div className="flex shrink-0 items-center gap-2">
                  <Label htmlFor={`act-${c.key}`} className="text-xs text-muted-foreground">
                    {c.isActive ? "Actif" : "En pause"}
                  </Label>
                  <Switch id={`act-${c.key}`} checked={c.isActive} onCheckedChange={(v) => void setActive(c.key, v)} />
                </div>
              )}
            </div>

            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">{c.description}</p>
              {c.account && <p className="text-xs text-muted-foreground">Compte : {c.account}</p>}
              {results[c.key] && (
                <p className={`text-sm ${results[c.key]!.ok ? "text-emerald-600" : "text-destructive"}`}>
                  {results[c.key]!.ok ? "✓ " : "✕ "}
                  {results[c.key]!.message}
                </p>
              )}
            </div>

            <div className="rounded-md border border-dashed border-border bg-muted/40 p-3">
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">URI de redirection à renseigner sur {c.name}</p>
              <div className="flex items-center gap-2">
                <code className="min-w-0 flex-1 truncate text-xs text-foreground">{getRedirectUri(c.key)}</code>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7 shrink-0"
                  onClick={() => void copy(getRedirectUri(c.key), c.key)}
                  aria-label="Copier l'URI de redirection"
                >
                  {copied === c.key ? <Check className="size-4 text-emerald-500" /> : <Copy className="size-4" />}
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {!c.connected ? (
                <Button disabled={!c.available || busy === c.key} onClick={() => void connect(c.key)}>
                  {busy === c.key ? "Redirection…" : `Se connecter à ${c.name}`}
                </Button>
              ) : (
                <>
                  <Button variant="outline" disabled={busy === c.key} onClick={() => void test(c.key)}>
                    <PlugZap className="mr-1 size-4" />
                    {busy === c.key ? "Test en cours…" : "Tester la connexion"}
                  </Button>
                  <Button variant="outline" disabled={busy === c.key} onClick={() => void connect(c.key)}>
                    <RefreshCw className="mr-1 size-4" /> Reconnecter
                  </Button>
                  <Button variant="ghost" className="text-destructive" onClick={() => void disconnect(c.key, c.name)}>
                    Déconnecter
                  </Button>
                </>
              )}
            </div>
          </Card>
        ))}

        <OrgStripeCard />

        {!oauthItems.length && !list.isLoading && (
          <Card className="p-6 text-sm text-muted-foreground">
            Aucune plateforme à connecter pour le moment. Votre administrateur doit d'abord activer les connecteurs.
          </Card>
        )}
      </div>
    </AppShell>
  );
}
