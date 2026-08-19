import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  BadgeEuro,
  Bell,
  BarChart3,
  Bot,
  Briefcase,
  Building2,
  CircleHelp,
  Coins,
  CreditCard,
  FileText,
  FolderKanban,
  Home,
  LogOut,
  Mail,
  Megaphone,
  Menu,
  Package,
  Search,
  Settings,
  Sparkles,
  Target,
  Users,
  UsersRound,
  Zap,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile, useRows } from "@/lib/db";
import { useMonthlyRenewal, usePlan } from "@/lib/plans";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export const NAV = [
  { to: "/eric", label: "Éric — Directeur IA", icon: Sparkles },
  { to: "/tableau-de-bord", label: "Accueil", icon: Home },
  { to: "/equipe", label: "Mon équipe IA", icon: Bot },
  { to: "/jason", label: "Jason — Prospection", icon: Search },
  { to: "/prospects", label: "Prospects", icon: Target },
  { to: "/clients", label: "Clients", icon: Users },
  { to: "/devis", label: "Devis", icon: FileText },
  { to: "/paiements", label: "Paiements", icon: CreditCard },
  { to: "/projets", label: "Projets", icon: FolderKanban },
  { to: "/catalogue", label: "Catalogue", icon: Package },
  { to: "/marketing", label: "Marketing", icon: Megaphone },
  { to: "/rh", label: "RH", icon: UsersRound },
  { to: "/emails", label: "Emails", icon: Mail },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/automatisations", label: "Automatisations", icon: Zap },
  { to: "/documents", label: "Documents", icon: Briefcase },
  { to: "/credits", label: "Crédits IA", icon: Coins },
  { to: "/plans", label: "Formules", icon: BadgeEuro },
  { to: "/entreprise", label: "Fiche entreprise", icon: Building2 },
  { to: "/parametres", label: "Paramètres", icon: Settings },
] as const;

const MOBILE_NAV = NAV.filter((n) =>
  ["/eric", "/tableau-de-bord", "/equipe", "/prospects"].includes(n.to),
);

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="space-y-1">
      {NAV.map((item) => {
        const active = pathname === item.to;
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
            )}
          >
            <item.icon className="size-[18px] shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarFooter() {
  const navigate = useNavigate();
  const { data: profile } = useProfile();
  const { data: notifications } = useRows("notifications", { limit: 20 });
  const unread = (notifications ?? []).filter((n: { is_read: boolean }) => !n.is_read).length;
  const org = profile?.organizations as { name?: string; credits?: number } | null;
  const { plan } = usePlan();

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  };

  return (
    <div className="space-y-3 border-t border-sidebar-border pt-4">
      <div className="rounded-xl bg-sidebar-accent/70 p-3">
        <div className="flex items-center gap-2 text-xs text-sidebar-foreground/70">
          <Sparkles className="size-4 text-sidebar-primary" />
          Crédits IA restants
        </div>
        <p className="mt-1 font-display text-xl text-sidebar-accent-foreground">{org?.credits ?? 0}</p>
        <p className="text-xs text-sidebar-foreground/60">Formule {plan.name}</p>
        <div className="mt-1 flex gap-3 text-xs">
          <Link to="/credits" className="text-sidebar-foreground/70 underline-offset-2 hover:underline">
            Historique
          </Link>
          <Link to="/plans" className="text-sidebar-foreground/70 underline-offset-2 hover:underline">
            Changer de formule
          </Link>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <Link
          to="/parametres"
          className="flex items-center gap-2 rounded-lg px-2 py-2 text-sidebar-foreground/75 hover:bg-sidebar-accent/60"
        >
          <Bell className="size-4" /> Alertes {unread > 0 && `(${unread})`}
        </Link>
        <Link
          to="/aide"
          className="flex items-center gap-2 rounded-lg px-2 py-2 text-sidebar-foreground/75 hover:bg-sidebar-accent/60"
        >
          <CircleHelp className="size-4" /> Aide
        </Link>
      </div>
      <div className="flex items-center justify-between gap-2 rounded-xl bg-sidebar-accent/40 px-3 py-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-sidebar-accent-foreground">
            {profile?.full_name ?? "Mon profil"}
          </p>
          <p className="truncate text-xs text-sidebar-foreground/60">{org?.name ?? ""}</p>
        </div>
        <button
          onClick={signOut}
          aria-label="Se déconnecter"
          className="rounded-lg p-2 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <LogOut className="size-4" />
        </button>
      </div>
    </div>
  );
}

export function AppShell({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  useMonthlyRenewal();

  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside className="sticky top-0 hidden h-screen w-[264px] shrink-0 flex-col justify-between bg-sidebar p-4 lg:flex">
        <div className="min-h-0 flex-1 overflow-y-auto">
          <Link to="/tableau-de-bord" className="mb-6 flex items-center gap-2 px-2">
            <span className="grid size-9 place-items-center rounded-xl bg-sidebar-primary font-display text-lg text-sidebar-primary-foreground">
              K
            </span>
            <span className="font-display text-lg text-sidebar-accent-foreground">Kobyde</span>
          </Link>
          <NavLinks />
        </div>
        <SidebarFooter />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col pb-20 lg:pb-0">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-border bg-background/85 px-4 py-3 backdrop-blur lg:px-8 lg:py-5">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Ouvrir le menu">
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] bg-sidebar p-4">
              <SheetTitle className="mb-4 font-display text-lg text-sidebar-accent-foreground">
                Kobyde
              </SheetTitle>
              <div className="flex h-full flex-col justify-between overflow-y-auto pb-8">
                <NavLinks onNavigate={() => setOpen(false)} />
                <SidebarFooter />
              </div>
            </SheetContent>
          </Sheet>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-semibold lg:text-2xl">{title}</h1>
            {subtitle && <p className="truncate text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          {action}
        </header>
        <main className="flex-1 px-4 py-6 lg:px-8">{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border bg-card/95 backdrop-blur lg:hidden">
        {MOBILE_NAV.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="flex flex-col items-center gap-1 py-2.5 text-[11px] text-muted-foreground"
            activeProps={{ className: "text-accent-foreground" }}
          >
            <item.icon className="size-5" />
            {item.label}
          </Link>
        ))}
        <button
          onClick={() => setOpen(true)}
          className="flex flex-col items-center gap-1 py-2.5 text-[11px] text-muted-foreground"
        >
          <Menu className="size-5" />
          Plus
        </button>
      </nav>
    </div>
  );
}
