import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { CheckCircle2, Link2, Loader2, MessageCircle, Trash2, XCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  deleteMyOrgConnector,
  listMyOrgConnectors,
  saveMyOrgConnector,
  testMyOrgConnector,
} from "@/lib/org-connectors.functions";

const WHATSAPP_SCOPES = [
  "Envoyer des messages WhatsApp à vos clients",
  "Envoyer des modèles de messages (templates)",
  "Recevoir les réponses et notifications de vos clients",
  "Consulter les informations du numéro professionnel",
];

/**
 * WhatsApp Business : chaque utilisateur connecte SON propre compte
 * (Access Token + Phone Number ID). Aucun identifiant de l'administrateur n'est utilisé.
 */
export function OrgWhatsappCard() {
  const listFn = useServerFn(listMyOrgConnectors);
  const saveFn = useServerFn(saveMyOrgConnector);
  const testFn = useServerFn(testMyOrgConnector);
  const deleteFn = useServerFn(deleteMyOrgConnector);
  const qc = useQueryClient();

  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);

  const q = useQuery({
    queryKey: ["org-connectors", origin],
    queryFn: () => listFn({ data: { origin } }),
    enabled: Boolean(origin),
  });

  const item = useMemo(() => (q.data?.items ?? []).find((c) => c.key === "whatsapp"), [q.data]);
  // WhatsApp Business est géré par chaque utilisateur (aucun rôle admin requis).
  const canManage = true;

  const [open, setOpen] = useState(false);
  const [token, setToken] = useState("");
  const [phoneId, setPhoneId] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    if (item) setPhoneId(((item.values as Record<string, string>)["phone_number_id"] ?? ""));
  }, [item]);

  if (!item) return null;

  const connected = item.complete;
  const tokenSaved = item.configuredSecrets.includes("access_token");

  const save = async () => {
    setBusy("save");
    try {
      await saveFn({ data: { provider: "whatsapp", values: { access_token: token, phone_number_id: phoneId } } });
      setToken("");
      toast.success("Compte WhatsApp Business enregistré en sécurité.");
      await qc.invalidateQueries({ queryKey: ["org-connectors"] });
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Enregistrement impossible.");
    } finally {
      setBusy(null);
    }
  };

  const test = async () => {
    setBusy("test");
    setResult(null);
    try {
      const res = await testFn({ data: { provider: "whatsapp", origin } });
      setResult(res as { ok: boolean; message: string });
      if (res.ok) toast.success("Connexion WhatsApp réussie.");
      else toast.error("Connexion WhatsApp échouée.");
      await qc.invalidateQueries({ queryKey: ["org-connectors"] });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Test impossible.";
      setResult({ ok: false, message });
      toast.error(message);
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    if (!window.confirm("Déconnecter WhatsApp Business ? Vos agents ne pourront plus envoyer de messages.")) return;
    setBusy("del");
    try {
      await deleteFn({ data: { provider: "whatsapp" } });
      toast.success("WhatsApp Business déconnecté.");
      await qc.invalidateQueries({ queryKey: ["org-connectors"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Déconnexion impossible.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card className="space-y-4 p-5">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 sm:flex sm:flex-wrap sm:justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <MessageCircle className="size-4 shrink-0 text-muted-foreground" />
          <h3 className="truncate font-medium">WhatsApp Business</h3>
          {connected ? (
            <Badge className="shrink-0 bg-emerald-500/15 text-emerald-600">Connecté</Badge>
          ) : (
            <Badge className="shrink-0" variant="secondary">
              Disponible
            </Badge>
          )}
        </div>
        {connected && canManage && (
          <Button size="sm" variant="ghost" className="text-destructive" disabled={busy === "del"} onClick={() => void remove()}>
            <Trash2 className="mr-1 size-4" />
            Déconnecter
          </Button>
        )}
      </div>

      <p className="text-sm text-muted-foreground">
        Messages WhatsApp envoyés depuis <strong>votre propre numéro professionnel</strong>. Connectez votre compte
        WhatsApp Business avec votre Access Token et votre Phone Number ID : les identifiants de l'administrateur ne
        sont jamais utilisés.
      </p>

      <div className="space-y-2 rounded-lg border p-4">
        <p className="text-sm font-medium">Autorisations demandées — toutes activées automatiquement</p>
        <ul className="space-y-1 text-sm">
          {WHATSAPP_SCOPES.map((s) => (
            <li key={s} className="flex items-center gap-2 text-emerald-700">
              <CheckCircle2 className="size-3.5" /> {s}
            </li>
          ))}
        </ul>
      </div>

      {result && (
        <p
          className={`flex items-start gap-2 rounded-md p-3 text-sm ${
            result.ok ? "bg-emerald-500/10 text-emerald-700" : "bg-destructive/10 text-destructive"
          }`}
        >
          {result.ok ? <CheckCircle2 className="mt-0.5 size-4 shrink-0" /> : <XCircle className="mt-0.5 size-4 shrink-0" />}
          <span>{result.message}</span>
        </p>
      )}

      {open && (
        <div className="grid gap-3 rounded-lg border bg-muted/30 p-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="wa-token" className="text-xs font-medium">
              Access Token *
            </Label>
            <Input
              id="wa-token"
              type="password"
              autoComplete="off"
              disabled={!canManage}
              value={token}
              placeholder={tokenSaved ? "•••••••• (enregistré)" : ""}
              onChange={(e) => setToken(e.target.value)}
              className="mt-1 text-sm"
            />
            {tokenSaved && (
              <p className="mt-1 text-[11px] text-muted-foreground">Enregistré et chiffré. Laissez vide pour le conserver.</p>
            )}
          </div>
          <div>
            <Label htmlFor="wa-phone" className="text-xs font-medium">
              Phone Number ID *
            </Label>
            <Input
              id="wa-phone"
              autoComplete="off"
              disabled={!canManage}
              value={phoneId}
              onChange={(e) => setPhoneId(e.target.value)}
              className="mt-1 text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <Button size="sm" disabled={!canManage || busy === "save"} onClick={() => void save()}>
              {busy === "save" ? <Loader2 className="mr-1 size-4 animate-spin" /> : null}
              Enregistrer et connecter
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button disabled={!canManage} onClick={() => setOpen((v) => !v)}>
          <Link2 className="mr-1 size-4" />
          {connected ? "Reconnecter WhatsApp Business" : "Se connecter à WhatsApp Business"}
        </Button>
        <Button variant="outline" disabled={!connected || busy === "test"} onClick={() => void test()}>
          {busy === "test" ? <Loader2 className="mr-1 size-4 animate-spin" /> : null}
          Tester la connexion
        </Button>
      </div>
    </Card>
  );
}
