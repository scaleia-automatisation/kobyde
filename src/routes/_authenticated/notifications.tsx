import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { NOTIFICATION_KINDS } from "@/lib/automations";
import { X } from "lucide-react";
import { toast } from "sonner";
import {
  timeAgo,
  useDeleteNotifications,
  useMarkNotifications,
  useNotifications,
} from "@/lib/notifications";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — Kobyde" },
      { name: "description", content: "Toutes les alertes de vos agents IA : devis, paiements, projets, emails." },
      { property: "og:title", content: "Notifications — Kobyde" },
      { property: "og:description", content: "Vos agents vous préviennent quand quelque chose compte." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const { data, isLoading } = useNotifications(200);
  const mark = useMarkNotifications();
  const drop = useDeleteNotifications();
  const [filter, setFilter] = useState<string>("tout");

  const list = (data ?? []).filter((n) => filter === "tout" || n.kind === filter);
  const kinds = ["tout", ...Object.keys(NOTIFICATION_KINDS)];
  const unread = (data ?? []).filter((n) => !n.is_read).length;

  return (
    <AppShell
      title="Notifications"
      subtitle="Ce que vos agents ont repéré pour vous."
      action={
        (data ?? []).length > 0 ? (
          <div className="flex items-center gap-2">
            {unread > 0 && (
              <Button variant="outline" onClick={() => mark.mutate("all")} disabled={mark.isPending}>
                Tout marquer comme lu
              </Button>
            )}
            <Button
              variant="destructive"
              disabled={drop.isPending}
              onClick={() => {
                if (!window.confirm("Supprimer définitivement toutes les notifications ?")) return;
                drop.mutate("all", { onSuccess: () => toast.success("Notifications supprimées") });
              }}
            >
              Tout supprimer
            </Button>
          </div>
        ) : null
      }
    >
      <div className="mb-4 flex flex-wrap gap-2">
        {kinds.map((k) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={`rounded-full px-3 py-1.5 text-sm ${
              filter === k ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}
          >
            {k === "tout" ? "Tout" : NOTIFICATION_KINDS[k]!.label}
          </button>
        ))}
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Chargement…</p>}
      {!isLoading && list.length === 0 && (
        <div className="surface p-8 text-center">
          <p className="font-medium">Aucune alerte ici.</p>
          <p className="text-sm text-muted-foreground">
            Activez des automatisations pour que vos agents vous préviennent automatiquement.
          </p>
        </div>
      )}

      <div className="space-y-2">
        {list.map((n) => {
          const kind = NOTIFICATION_KINDS[n.kind] ?? NOTIFICATION_KINDS["systeme"]!;
          return (
            <article
              key={n.id}
              className={`surface flex items-start gap-4 p-4 ${n.is_read ? "opacity-70" : ""}`}
            >
              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${kind.tone}`}>{kind.label}</span>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{n.title}</p>
                {n.body && <p className="text-sm text-muted-foreground">{n.body}</p>}
                <p className="mt-1 text-xs text-muted-foreground">{timeAgo(n.created_at)}</p>
              </div>
              <div className="flex items-center gap-1">
                {!n.is_read && (
                  <Button variant="ghost" size="sm" onClick={() => mark.mutate([n.id])}>
                    Marquer lu
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Supprimer la notification"
                  onClick={() => drop.mutate([n.id])}
                >
                  <X className="size-4 text-muted-foreground" />
                </Button>
              </div>
            </article>
          );
        })}
      </div>
    </AppShell>
  );
}
