import type { ReactNode } from "react";

export function DashboardSection({ title, description, children, className = "" }: {
  title: string; description?: string; children: ReactNode; className?: string;
}) {
  return <section className={`min-w-0 ${className}`}>
    <header className="mb-5">
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
    </header>
    {children}
  </section>;
}