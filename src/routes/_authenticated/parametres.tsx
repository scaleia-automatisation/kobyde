import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { X } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/lib/db";
import { useDeleteNotifications, useNotifications } from "@/lib/notifications";
import { usePlan } from "@/lib/plans";


export const Route = createFileRoute("/_authenticated/parametres")({
  head: () => ({
    meta: [
      { title: "Paramètres — Kobyde" },
      { name: "description", content: "Votre profil, votre entreprise, vos crédits et vos notifications." },
      { property: "og:title", content: "Paramètres — Kobyde" },
      { property: "og:description", content: "Réglages de votre espace Kobyde." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Settings,
});

function Settings() {
  const { data: profile, refetch } = useProfile();
  const { data: notifications } = useNotifications(50);
  const dropNotifications = useDeleteNotifications();

  const navigate = useNavigate();
  const { plan } = usePlan();
  const org = profile?.organizations as { name?: string; credits?: number; plan?: string } | null;

  const saveProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: String(fd.get("full_name") ?? "") })
      .eq("user_id", profile!.user_id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Profil enregistré");
    refetch();
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  };

  return (
    <AppShell title="Paramètres" subtitle="Votre profil, votre entreprise et vos alertes.">
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="surface p-6">
          <h2 className="text-lg">Mon profil</h2>
          <form onSubmit={saveProfile} className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="full_name">Nom complet</Label>
              <Input id="full_name" name="full_name" defaultValue={profile?.full_name ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input value={profile?.email ?? ""} disabled />
            </div>
            <Button type="submit">Enregistrer</Button>
          </form>
        </section>

        <section className="surface p-6">
          <h2 className="text-lg">Mon entreprise</h2>
          <p className="mt-3 text-sm text-muted-foreground">Nom</p>
          <p className="font-medium">{org?.name ?? "—"}</p>
          <p className="mt-4 text-sm text-muted-foreground">Formule</p>
          <p className="font-medium">
            Kobyde {plan.name} — {plan.price} € / mois · {plan.credits} crédits/mois
          </p>
          <p className="mt-4 text-sm text-muted-foreground">Crédits IA restants</p>
          <p className="font-display text-3xl">{org?.credits ?? 0}</p>
          <p className="mt-4 text-xs text-muted-foreground">
            Vos données sont isolées : personne d'une autre entreprise ne peut y accéder.
          </p>
          <Button asChild className="mt-5 mr-2">
            <Link to="/entreprise">Compléter la fiche entreprise</Link>
          </Button>
          <Button asChild variant="secondary" className="mt-5 mr-2">
            <Link to="/plans">Changer de formule</Link>
          </Button>
          <Button variant="outline" className="mt-5" onClick={signOut}>
            Se déconnecter
          </Button>
        </section>

        <section className="surface p-6 lg:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg">Notifications</h2>
            {(notifications ?? []).length > 0 && (
              <Button
                variant="destructive"
                size="sm"
                disabled={dropNotifications.isPending}
                onClick={() => {
                  if (!window.confirm("Supprimer définitivement toutes les notifications ?")) return;
                  dropNotifications.mutate("all", {
                    onSuccess: () => toast.success("Notifications supprimées"),
                    onError: (e: unknown) => toast.error((e as Error).message),
                  });
                }}
              >
                Tout supprimer
              </Button>
            )}
          </div>
          <ul className="mt-4 space-y-2">
            {(notifications ?? []).length === 0 && (
              <li className="text-sm text-muted-foreground">Aucune notification.</li>
            )}
            {(notifications ?? []).map((n) => (
              <li key={n.id} className="flex items-start gap-3 rounded-xl border border-border p-4">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{n.title}</p>
                  <p className="text-sm text-muted-foreground">{n.body}</p>
                </div>
                {!n.is_read && <Badge>Nouveau</Badge>}
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Supprimer la notification"
                  disabled={dropNotifications.isPending}
                  onClick={() => dropNotifications.mutate([n.id])}
                >
                  <X className="size-4 text-muted-foreground" />
                </Button>
              </li>
            ))}
          </ul>
        </section>

      </div>
    </AppShell>
  );
}
