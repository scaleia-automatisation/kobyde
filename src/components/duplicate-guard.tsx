import { AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { DuplicateMatch } from "@/lib/context-engine";

/* eslint-disable @typescript-eslint/no-explicit-any */

export type DuplicateOption = {
  label: string;
  onSelect: (row: any) => void;
  /** Action recommandée par défaut (mise en avant). */
  recommended?: boolean;
  variant?: "default" | "outline" | "secondary" | "ghost";
};

/**
 * Alerte de non-duplication : affiche l'élément similaire existant
 * et propose de le reprendre plutôt que d'en créer un nouveau.
 */
export function DuplicateGuardDialog({
  open,
  onOpenChange,
  title,
  description,
  matches,
  render,
  options,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description?: string;
  matches: DuplicateMatch[];
  render: (row: any) => { primary: string; details: string[]; status?: string };
  options: DuplicateOption[];
}) {
  const top = matches[0]?.row;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-amber-500" />
            {title}
          </DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>

        <div className="space-y-3">
          {matches.slice(0, 3).map((m, i) => {
            const info = render(m.row);
            return (
              <div key={i} className="rounded-lg border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">{info.primary}</p>
                  {info.status ? <Badge variant="secondary">{info.status}</Badge> : null}
                </div>
                <ul className="mt-1 space-y-0.5 text-sm text-muted-foreground">
                  {info.details.filter(Boolean).map((d, j) => (
                    <li key={j}>{d}</li>
                  ))}
                </ul>
                <p className="mt-1 text-xs text-muted-foreground">
                  Correspondance {Math.round(m.score * 100)} % · critères : {m.reasons.join(", ") || "similarité"}
                </p>
              </div>
            );
          })}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          {options.map((o) => (
            <Button
              key={o.label}
              className="w-full"
              variant={o.recommended ? "default" : (o.variant ?? "outline")}
              onClick={() => {
                onOpenChange(false);
                o.onSelect(top);
              }}
            >
              {o.label}
              {o.recommended ? " (recommandé)" : ""}
            </Button>
          ))}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
