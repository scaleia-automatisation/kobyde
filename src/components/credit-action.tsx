import { useState, type ReactNode } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { creditAction, creditLabel } from "@/lib/credit-catalog";
import { newIdempotencyKey, useCredits } from "@/lib/credits";

/** Étiquette de coût affichée sous un bouton payant. Rien si l'action est gratuite. */
export function CreditCost({ actionKey, className }: { actionKey: string; className?: string }) {
  const { cost } = creditAction(actionKey);
  if (cost <= 0) return null;
  return (
    <span className={`mt-1 block text-[11px] text-muted-foreground ${className ?? ""}`}>
      Coût : {creditLabel(cost)}
    </span>
  );
}

/**
 * Bouton d'action IA : affiche le coût, demande une confirmation avec le solde
 * avant/après, empêche les doubles clics et ne lance l'action qu'après « Continuer ».
 */
export function CreditActionButton({
  actionKey,
  onConfirm,
  children,
  pending,
  disabled,
  className,
  variant,
  size,
}: {
  actionKey: string;
  onConfirm: (idempotencyKey: string) => void | Promise<unknown>;
  children: ReactNode;
  pending?: boolean;
  disabled?: boolean;
  className?: string;
  variant?: "default" | "secondary" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
}) {
  const { cost } = creditAction(actionKey);
  const { balance } = useCredits();
  const [open, setOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const busy = !!pending || running;
  const notEnough = cost > balance;

  const run = async () => {
    if (busy) return;
    setRunning(true);
    try {
      await onConfirm(newIdempotencyKey());
    } finally {
      setRunning(false);
      setOpen(false);
    }
  };

  return (
    <div className={className}>
      <Button
        type="button"
        variant={variant}
        size={size}
        className="w-full gap-2"
        disabled={busy || disabled}
        onClick={() => (cost > 0 ? setOpen(true) : run())}
      >
        {children}
        {cost > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-background/20 px-2 py-0.5 text-[11px]">
            <Sparkles className="size-3" /> {creditLabel(cost)}
          </span>
        )}
      </Button>
      <CreditCost actionKey={actionKey} />

      <AlertDialog open={open} onOpenChange={(o) => !busy && setOpen(o)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer l'action</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-1 text-sm">
                <p>Cette action utilisera {creditLabel(cost)}.</p>
                <p>Votre solde actuel : {creditLabel(balance)}</p>
                <p>Solde après l'action : {creditLabel(Math.max(0, balance - cost))}</p>
                {notEnough && (
                  <p className="font-medium text-destructive">
                    Crédits insuffisants pour lancer cette action.
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy || notEnough}
              onClick={(e) => {
                e.preventDefault();
                void run();
              }}
            >
              {busy ? "En cours…" : "Continuer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
