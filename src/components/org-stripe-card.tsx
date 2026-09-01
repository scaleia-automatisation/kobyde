import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { CreditCard, PlugZap } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  deleteOrgStripeKeysFn,
  myOrgStripeKeys,
  saveOrgStripeKeysFn,
  testOrgStripeKeysFn,
} from "@/lib/stripe-connect.functions";

/** Stripe Connect : l'entreprise saisit sa clé secrète et sa clé publiable. */
export function OrgStripeCard() {
  const statusFn = useServerFn(myOrgStripeKeys);
  const saveFn = useServerFn(saveOrgStripeKeysFn);
  const removeFn = useServerFn(deleteOrgStripeKeysFn);
  const testFn = useServerFn(testOrgStripeKeysFn);
  const qc = useQueryClient();

  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [secretKey, setSecretKey] = useState("");
  const [publishableKey, setPublishableKey] = useState("");
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const q = useQuery({
    queryKey: ["org-stripe-keys"],
    queryFn: () => statusFn({ data: undefined }),
  });
  const data = q.data;

  const save = async () => {
    setBusy(true);
    try {
      await saveFn({ data: { secretKey, publishableKey } });
      setSecretKey("");
      setPublishableKey("");
      setOpen(false);
      toast.success("Clés Stripe enregistrées et vérifiées.");
      void qc.invalidateQueries({ queryKey: ["org-stripe-keys"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Enregistrement impossible.");
    } finally {
      setBusy(false);
    }
  };

  const test = async () => {
    setBusy(true);
    try {
      const res = await testFn({ data: undefined });
      setResult(res);
      if (res.ok) toast.success(res.message);
      else toast.error(res.message);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Test impossible.";
      setResult({ ok: false, message });
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm("Supprimer vos clés Stripe ? Vos agents ne pourront plus encaisser vos clients.")) return;
    setBusy(true);
    try {
      await removeFn({ data: undefined });
      toast.success("Clés Stripe supprimées.");
      void qc.invalidateQueries({ queryKey: ["org-stripe-keys"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Suppression impossible.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="space-y-4 p-5">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <CreditCard className="size-4 shrink-0 text-muted-foreground" />
        <h3 className="font-medium">Stripe Connect</h3>
        {data?.configured ? (
          <Badge className="bg-emerald-500/15 text-emerald-600">● Configuré</Badge>
        ) : (
          <Badge variant="secondary">À configurer</Badge>
        )}
      </div>

      <p className="max-w-3xl text-sm text-muted-foreground">
        Renseignez la clé secrète et la clé publiable de votre compte Stripe pour permettre à vos agents d'encaisser
        vos clients, créer des demandes de paiement et suivre les transactions. Vos clés sont chiffrées et jamais
        visibles depuis le navigateur.
      </p>

      {data?.configured && (
        <div className="rounded-lg border bg-muted/40 p-3 text-sm">
          <p>
            Compte : <span className="font-medium">{data.businessName ?? data.accountId ?? "—"}</span>
          </p>
          <p className="text-muted-foreground">
            {data.livemode ? "Mode réel" : "Mode test"} · Clé publiable : {data.publishableKey ?? "—"}
          </p>
        </div>
      )}

      {result && (
        <p className={`text-sm ${result.ok ? "text-emerald-600" : "text-destructive"}`}>
          {result.ok ? "✓ " : "✕ "}
          {result.message}
        </p>
      )}

      {open && (
        <div className="grid gap-3 rounded-lg border p-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-xs">Clé secrète (sk_live_… ou sk_test_…)</Label>
            <Input
              type="password"
              autoComplete="off"
              placeholder="sk_live_..."
              value={secretKey}
              onChange={(e) => setSecretKey(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Clé publiable (pk_live_… ou pk_test_…)</Label>
            <Input
              autoComplete="off"
              placeholder="pk_live_..."
              value={publishableKey}
              onChange={(e) => setPublishableKey(e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <Button disabled={busy || !secretKey || !publishableKey} onClick={() => void save()}>
              {busy ? "Vérification…" : "Enregistrer les clés"}
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button variant={data?.configured ? "outline" : "default"} onClick={() => setOpen((v) => !v)}>
          {open ? "Annuler" : data?.configured ? "Modifier les clés" : "Configurer"}
        </Button>
        {data?.configured && (
          <Button variant="outline" disabled={busy} onClick={() => void test()}>
            <PlugZap className="mr-1 size-4" />
            {busy ? "Test en cours…" : "Tester la connexion"}
          </Button>
        )}
        {data?.configured && (
          <Button variant="ghost" className="text-destructive" disabled={busy} onClick={() => void remove()}>
            Supprimer
          </Button>
        )}
      </div>
    </Card>
  );
}
