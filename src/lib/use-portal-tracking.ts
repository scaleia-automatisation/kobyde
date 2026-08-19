import { useCallback, useEffect, useRef } from "react";
import { trackPortalEvent } from "@/lib/portal.functions";
import { portalSessionId } from "@/lib/analytics";

type TrackOpts = {
  entityType?: string | null;
  entityId?: string | null;
  durationMs?: number | null;
  payload?: Record<string, unknown>;
};

/** Suivi anonyme du comportement dans l'espace client / la page de paiement. */
export function usePortalTracking(token: string, kind: "portal" | "payment" = "portal") {
  const seen = useRef(new Set<string>());
  const startedAt = useRef(Date.now());

  const track = useCallback(
    (name: string, opts: TrackOpts = {}) => {
      void trackPortalEvent({
        data: {
          token,
          kind,
          name,
          entityType: opts.entityType ?? null,
          entityId: opts.entityId ?? null,
          sessionId: portalSessionId(),
          path: typeof window === "undefined" ? null : window.location.pathname,
          durationMs: opts.durationMs ?? null,
          payload: opts.payload ?? {},
        },
      }).catch(() => undefined);
    },
    [token, kind],
  );

  /** N'envoie l'évènement qu'une fois par session pour un même élément. */
  const trackOnce = useCallback(
    (name: string, opts: TrackOpts = {}) => {
      const key = `${name}:${opts.entityId ?? ""}`;
      if (seen.current.has(key)) return;
      seen.current.add(key);
      track(name, opts);
    },
    [track],
  );

  useEffect(() => {
    const started = startedAt.current;
    track(kind === "payment" ? "payment_page_viewed" : "portal_viewed");
    return () => {
      const durationMs = Date.now() - started;
      if (durationMs > 1500) track("time_spent", { durationMs });
    };
  }, [track, kind]);

  return { track, trackOnce };
}
