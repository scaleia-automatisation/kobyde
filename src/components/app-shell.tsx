import { Link, useNavigate, useRouter, useRouterState } from "@tanstack/react-router";
import {
  ArrowLeft,
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
  Filter,
  FolderKanban,
  Home,
  LineChart,
  ListChecks,
  LogOut,
  Mail,
  Megaphone,
  Menu,
  Package,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  UsersRound,
  Zap,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { amIPlatformAdmin } from "@/lib/admin.functions";
import { useSessionTracking } from "@/lib/user-events";
import { supabase } from "@/integrations/supabase/client";
import { useProfile, useRows } from "@/lib/db";
import { useMonthlyRenewal, usePlan } from "@/lib/plans";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/notification-bell";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export const NAV_GROUPS = [
  {
    label: "Pilotage",
    items: [
      { to: "/eric", label: "Éric — Directeur IA", icon: Sparkles },
      { to: "/tableau-de-bord", label: "Accueil", icon: Home },
      { to: "/equipe", label: "Mon équipe IA", icon: Bot },
      { to: "/taches", label: "Tâches des agents", icon: ListChecks },
    ],
  },
  {
    label: "Commercial",
    items: [
      { to: "/jason", label: "Jason — Prospection", icon: Search },
      { to: "/prospects", label: "Prospects", icon: Target },
      { to: "/clients", label: "Clients", icon: Users },
      { to: "/devis", label: "Devis", icon: FileText },
      { to: "/paiements", label: "Paiements", icon: CreditCard },
      { to: "/projets", label: "Projets", icon: FolderKanban },
      { to: "/catalogue", label: "Catalogue", icon: Package },
    ],
  },
  {
    label: "Croissance",
    items: [
      { to: "/lamine", label: "Lamine — Marketing", icon: Megaphone },
      { to: "/funnel", label: "Funnel", icon: Filter },
      { to: "/ethan", label: "Ethan — Analyse & veille", icon: LineChart },
      { to: "/marketing", label: "Campagnes", icon: Megaphone },
      { to: "/emails", label: "Emails", icon: Mail },
      { to: "/analytics", label: "Analytics", icon: BarChart3 },
    ],
  },
  {
    label: "Organisation",
    items: [
      { to: "/rh", label: "RH", icon: UsersRound },
      { to: "/automatisations", label: "Automatisations", icon: Zap },
      { to: "/notifications", label: "Notifications", icon: Bell },
      { to: "/documents", label: "Documents", icon: Briefcase },
    ],
  },
  {
    label: "Compte",
    items: [
      { to: "/credits", label: "Crédits IA", icon: Coins },
      { to: "/plans", label: "Formules", icon: BadgeEuro },
      { to: "/entreprise", label: "Fiche entreprise", icon: Building2 },
      { to: "/parametres", label: "Paramètres", icon: Settings },
    ],
  },
  {
    label: "Plateforme",
    adminOnly: true,
    items: [{ to: "/super-admin", label: "Super Admin", icon: ShieldCheck }],
  },
] as const;

export const NAV = NAV_GROUPS.flatMap((g) => g.items.map((i) => ({ to: i.to, label: i.label })));

const MOBILE_NAV = [
  { to: "/eric", label: "Éric", icon: Sparkles },
  { to: "/tableau-de-bord", label: "Accueil", icon: Home },
  { to: "/equipe", label: "Équipe", icon: Bot },
  { to: "/prospects", label: "Prospects", icon: Target },
] as const;

function useIsAdmin() {
  const checkAdmin = useServerFn(amIPlatformAdmin);
  const { data } = useQuery({
    queryKey: ["is-platform-admin"],
    queryFn: () => checkAdmin({ data: undefined }),
    staleTime: 5 * 60 * 1000,
  });
  return Boolean(data?.isAdmin);
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isAdmin = useIsAdmin();
  const groups = NAV_GROUPS.filter((g) => isAdmin || !("adminOnly" in g && g.adminOnly));

  return (
    <nav className="space-y-5">
      {groups.map((group) => (
        <div key={group.label}>
          <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-sidebar-foreground/45">
            {group.label}
          </p>
          <div className="space-y-0.5">
            {group.items.map((item) => {
              const active = pathname === item.to || pathname.startsWith(item.to + "/");
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group flex items-center gap-2.5 rounded-lg px-3 py-2 text-[0.8125rem] font-medium transition-colors duration-150",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
                  )}
                >
                  <item.icon
                    className={cn(
                      "size-[17px] shrink-0 transition-colors",
                      active ? "text-sidebar-primary" : "text-sidebar-foreground/55",
                    )}
                  />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
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
    <div className="mt-4 space-y-2.5 border-t border-sidebar-border pt-4">
      <div className="rounded-xl bg-sidebar-accent/60 p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-sidebar-foreground/55">
            Crédits IA
          </span>
          <span className="rounded-full bg-sidebar-primary/15 px-2 py-0.5 text-[10px] font-medium text-sidebar-primary">
            {plan.name}
          </span>
        </div>
        <p className="mt-1 font-display text-xl text-sidebar-accent-foreground">
          {org?.credits ?? 0}
        </p>
        <div className="mt-1.5 flex gap-3 text-[11px]">
          <Link
            to="/credits"
            className="text-sidebar-foreground/70 underline-offset-2 hover:underline"
          >
            Historique
          </Link>
          <Link
            to="/plans"
            className="text-sidebar-foreground/70 underline-offset-2 hover:underline"
          >
            Changer de formule
          </Link>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-1.5 text-xs">
        <Link
          to="/notifications"
          className="flex items-center gap-2 rounded-lg px-2 py-2 text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/50"
        >
          <Bell className="size-4" /> Alertes {unread > 0 && `(${unread})`}
        </Link>
        <Link
          to="/aide"
          className="flex items-center gap-2 rounded-lg px-2 py-2 text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/50"
        >
          <CircleHelp className="size-4" /> Aide
        </Link>
      </div>
      <div className="flex items-center justify-between gap-2 rounded-xl bg-sidebar-accent/40 px-3 py-2">
        <div className="min-w-0">
          <p className="truncate text-[0.8125rem] font-medium text-sidebar-accent-foreground">
            {profile?.full_name ?? "Mon profil"}
          </p>
          <p className="truncate text-[11px] text-sidebar-foreground/55">{org?.name ?? ""}</p>
        </div>
        <button
          onClick={signOut}
          aria-label="Se déconnecter"
          className="rounded-lg p-2 text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
        >
          <LogOut className="size-4" />
        </button>
      </div>
    </div>
  );
}

function CommandMenu({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const navigate = useNavigate();
  const isAdmin = useIsAdmin();
  const groups = NAV_GROUPS.filter((g) => isAdmin || !("adminOnly" in g && g.adminOnly));

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Rechercher une page, un agent, une action…" />
      <CommandList>
        <CommandEmpty>Aucun résultat.</CommandEmpty>
        {groups.map((group) => (
          <CommandGroup key={group.label} heading={group.label}>
            {group.items.map((item) => (
              <CommandItem
                key={item.to}
                value={`${group.label} ${item.label}`}
                onSelect={() => {
                  onOpenChange(false);
                  navigate({ to: item.to });
                }}
              >
                <item.icon className="mr-2 size-4 text-muted-foreground" />
                {item.label}
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
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
  const [cmdOpen, setCmdOpen] = useState(false);
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isDashboard = pathname === "/tableau-de-bord";
  useMonthlyRenewal();
  useSessionTracking();


  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCmdOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside className="sticky top-0 hidden h-screen w-[256px] shrink-0 flex-col justify-between border-r border-sidebar-border bg-sidebar p-3.5 lg:flex">
        <div className="min-h-0 flex-1 overflow-y-auto">
          <Link
            to="/tableau-de-bord"
            className="mb-4 flex items-center gap-2 rounded-lg px-2 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
          >
            <span className="grid size-8 place-items-center rounded-lg bg-sidebar-primary font-display text-base text-sidebar-primary-foreground">
              K
            </span>
            <span className="font-display text-[1.0625rem] text-sidebar-accent-foreground">
              Kobyde
            </span>
          </Link>
          <button
            onClick={() => setCmdOpen(true)}
            className="mb-5 flex w-full items-center gap-2 rounded-lg border border-sidebar-border bg-sidebar-accent/30 px-3 py-2 text-[0.8125rem] text-sidebar-foreground/55 transition-colors hover:bg-sidebar-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
          >
            <Search className="size-4" />
            Rechercher
            <kbd className="ml-auto rounded border border-sidebar-border px-1.5 py-0.5 text-[10px]">
              ⌘K
            </kbd>
          </button>
          <NavLinks />
        </div>
        <SidebarFooter />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col pb-20 lg:pb-0">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-border bg-background/80 px-4 py-3 backdrop-blur-md lg:px-8 lg:py-4">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Ouvrir le menu">
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[288px] bg-sidebar p-4">
              <SheetTitle className="mb-4 font-display text-lg text-sidebar-accent-foreground">
                Kobyde
              </SheetTitle>
              <div className="flex h-full flex-col justify-between overflow-y-auto pb-10">
                <NavLinks onNavigate={() => setOpen(false)} />
                <SidebarFooter />
              </div>
            </SheetContent>
          </Sheet>
          {!isDashboard && (
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="icon"
                aria-label="Retour"
                onClick={() => router.history.back()}
              >
                <ArrowLeft />
              </Button>
              <Button
                asChild
                variant="outline"
                className="gap-2 text-[0.8125rem] font-medium"
              >
                <Link to="/tableau-de-bord" aria-label="Retour au tableau de bord">
                  <Home className="size-4" aria-hidden />
                  <span className="hidden sm:inline">Tableau de bord</span>
                </Link>
              </Button>
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-h1">{title}</h1>
            {subtitle && <p className="truncate text-caption">{subtitle}</p>}
          </div>

          <Button
            variant="ghost"
            size="icon"
            aria-label="Recherche rapide"
            className="hidden lg:inline-flex"
            onClick={() => setCmdOpen(true)}
          >
            <Search />
          </Button>
          <NotificationBell />
          {action}
        </header>
        <main className="flex-1 px-4 py-6 lg:px-8 lg:py-7">{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border bg-card/95 backdrop-blur lg:hidden">
        {MOBILE_NAV.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="flex flex-col items-center gap-1 py-2.5 text-[10px] text-muted-foreground transition-colors"
            activeProps={{ className: "text-foreground" }}
          >
            <item.icon className="size-5" />
            <span className="max-w-full truncate px-1">{item.label.split(" — ")[0]}</span>
          </Link>
        ))}
        <button
          onClick={() => setOpen(true)}
          className="flex flex-col items-center gap-1 py-2.5 text-[10px] text-muted-foreground"
        >
          <Menu className="size-5" />
          Plus
        </button>
      </nav>

      <CommandMenu open={cmdOpen} onOpenChange={setCmdOpen} />
    </div>
  );
}
