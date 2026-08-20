import type { LucideIcon } from "lucide-react";
import { AlertTriangle, Check, Inbox, Loader2 } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** État vide : icône + titre + explication + action principale. */
export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("surface animate-rise px-6 py-14 text-center", className)}>
      <span className="mx-auto mb-4 grid size-12 place-items-center rounded-2xl bg-secondary text-muted-foreground">
        <Icon className="size-5" aria-hidden />
      </span>
      <p className="text-h2">{title}</p>
      {description && (
        <p className="mx-auto mt-2 max-w-md text-body text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-6 flex justify-center gap-2">{action}</div>}
    </div>
  );
}

/** Chargement : squelettes, jamais un simple « Loading… ». */
export function LoadingState({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("grid gap-3", className)} role="status" aria-label="Chargement en cours">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="surface flex items-center gap-4 p-4">
          <Skeleton className="size-10 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-8 w-20 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

/** Erreur explicite avec action de reprise. */
export function ErrorState({
  title = "Une erreur est survenue",
  description,
  onRetry,
  className,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div className={cn("surface animate-rise px-6 py-12 text-center", className)} role="alert">
      <span className="mx-auto mb-4 grid size-12 place-items-center rounded-2xl bg-destructive/10 text-destructive">
        <AlertTriangle className="size-5" aria-hidden />
      </span>
      <p className="text-h2">{title}</p>
      {description && (
        <p className="mx-auto mt-2 max-w-md text-body text-muted-foreground">{description}</p>
      )}
      {onRetry && (
        <Button variant="outline" className="mt-6" onClick={onRetry}>
          Réessayer
        </Button>
      )}
    </div>
  );
}

/** Carte statistique sobre : label, valeur, tendance. */
export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  trend,
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: LucideIcon;
  trend?: { value: string; positive?: boolean };
  className?: string;
}) {
  return (
    <div className={cn("surface interactive p-4", className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-label">{label}</p>
        {Icon && <Icon className="size-4 text-muted-foreground" aria-hidden />}
      </div>
      <p className="mt-2 font-display text-2xl tracking-tight">{value}</p>
      <div className="mt-1 flex items-center gap-2">
        {trend && (
          <span
            className={cn(
              "rounded-full px-1.5 py-0.5 text-[11px] font-medium",
              trend.positive === false
                ? "bg-destructive/10 text-destructive"
                : "bg-success/10 text-success",
            )}
          >
            {trend.value}
          </span>
        )}
        {hint && <span className="text-caption">{hint}</span>}
      </div>
    </div>
  );
}

/** Bloc de section homogène : titre, description, action. */
export function SectionCard({
  title,
  description,
  action,
  children,
  className,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("surface p-5", className)}>
      {(title || action) && (
        <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            {title && <h2 className="text-h2">{title}</h2>}
            {description && <p className="mt-1 text-caption">{description}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export type AiStepStatus = "pending" | "active" | "done" | "error";

/** Progression IA lisible : Analyse → Génération → Vérification. */
export function AiProgress({
  steps,
  className,
}: {
  steps: { label: string; status: AiStepStatus }[];
  className?: string;
}) {
  return (
    <ul className={cn("space-y-2", className)} aria-live="polite">
      {steps.map((s) => (
        <li key={s.label} className="flex items-center gap-2.5 text-body">
          {s.status === "done" ? (
            <Check className="size-4 text-success" aria-hidden />
          ) : s.status === "active" ? (
            <Loader2 className="size-4 animate-spin text-accent" aria-hidden />
          ) : s.status === "error" ? (
            <AlertTriangle className="size-4 text-destructive" aria-hidden />
          ) : (
            <span className="size-4 rounded-full border border-border" aria-hidden />
          )}
          <span
            className={cn(
              s.status === "pending" && "text-muted-foreground",
              s.status === "active" && "font-medium",
            )}
          >
            {s.label}
          </span>
        </li>
      ))}
    </ul>
  );
}
