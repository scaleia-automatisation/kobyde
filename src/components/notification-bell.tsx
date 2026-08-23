import { Link } from "@tanstack/react-router";
import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { NOTIFICATION_KINDS } from "@/lib/automations";
import {
  timeAgo,
  useDeleteNotifications,
  useMarkNotifications,
  useNotifications,
} from "@/lib/notifications";

export function NotificationBell() {
  const { data: items } = useNotifications(20);
  const mark = useMarkNotifications();
  const drop = useDeleteNotifications();
  const list = items ?? [];
  const unread = list.filter((n) => !n.is_read).length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={`Notifications (${unread} non lues)`}
        >
          <Bell />
          {unread > 0 && (
            <span className="absolute right-1 top-1 grid min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-4 text-destructive-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[360px] p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="text-sm font-semibold">Notifications</p>
          <div className="flex items-center gap-3">
            {unread > 0 && (
              <button
                onClick={() => mark.mutate("all")}
                className="text-xs text-muted-foreground underline-offset-2 hover:underline"
              >
                Tout marquer comme lu
              </button>
            )}
            {list.length > 0 && (
              <button
                onClick={() => {
                  if (window.confirm("Supprimer toutes les notifications ?")) drop.mutate("all");
                }}
                className="text-xs text-destructive underline-offset-2 hover:underline"
              >
                Tout supprimer
              </button>
            )}
          </div>
        </div>
        <div className="max-h-[340px] overflow-y-auto">
          {list.length === 0 && (
            <p className="px-4 py-6 text-sm text-muted-foreground">
              Aucune alerte pour l'instant. Vos agents vous préviendront ici.
            </p>
          )}
          {list.map((n) => {
            const kind = NOTIFICATION_KINDS[n.kind] ?? NOTIFICATION_KINDS["systeme"]!;
            return (
              <div key={n.id} className="relative">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  drop.mutate([n.id]);
                }}
                aria-label="Supprimer la notification"
                className="absolute right-2 top-2 rounded-md p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="size-3.5" />
              </button>
              <button
                onClick={() => !n.is_read && mark.mutate([n.id])}
                className={`block w-full border-b border-border/60 px-4 py-3 text-left last:border-0 hover:bg-muted/60 ${
                  n.is_read ? "opacity-70" : ""
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${kind.tone}`}>
                    {kind.label}
                  </span>
                  <span className="text-[11px] text-muted-foreground">{timeAgo(n.created_at)}</span>
                </div>
                <p className="mt-1 text-sm font-medium">{n.title}</p>
                {n.body && <p className="text-xs text-muted-foreground">{n.body}</p>}
              </button>
              </div>
            );
          })}
        </div>
        <div className="border-t border-border px-4 py-2">
          <Link
            to="/notifications"
            className="text-sm font-medium text-primary underline-offset-2 hover:underline"
          >
            Voir toutes les notifications
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
