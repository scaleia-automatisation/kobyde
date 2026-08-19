import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BadgeCheck,
  Clock4,
  HeartPulse,
  Moon,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { AGENTS } from "@/lib/agents";
import { Button } from "@/components/ui/button";

const TITLE = "Kobyde — 10 agents IA pour piloter votre entreprise, 39 €/mois";
const DESC =
  "Kobyde met 10 agents IA spécialisés au service de votre entreprise : prospection, ventes, devis, factures, projets, marketing, RH et analyse. 39 €/mois.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <div className="flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-xl bg-primary font-display text-lg text-primary-foreground">
            K
          </span>
          <span className="font-display text-xl">Kobyde</span>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost">
            <Link to="/auth">Se connecter</Link>
          </Button>
          <Button asChild>
            <Link to="/auth" search={{ mode: "signup" }}>
              Essayer
            </Link>
          </Button>
        </div>
      </header>

      <section className="aurora-bg">
        <div className="mx-auto max-w-4xl px-5 pb-20 pt-14 text-center">
          <span className="inline-flex items-center gap-2 glow-chip rounded-full border border-border bg-card/80 px-4 py-1.5 text-sm text-muted-foreground backdrop-blur">
            <BadgeCheck className="size-4 text-accent" />
            10 agents IA au service de votre entreprise, 24h/24 et 7j/7 — 39 €/mois
          </span>
          <h1 className="hero-title mx-auto mt-6 max-w-3xl text-4xl leading-[1.18] sm:text-6xl">
            Une équipe complète d'agents IA pour votre entreprise, pour moins de 1,30 € par jour.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
            Ils trouvent des clients, écrivent vos devis, relancent vos factures, suivent vos projets et
            analysent vos chiffres. Vous, vous décidez.
          </p>

          <div className="mx-auto mt-8 flex max-w-3xl flex-wrap justify-center gap-3">
            {[
              { icon: Clock4, text: "Travaille 24h/24 et 7j/7" },
              { icon: Moon, text: "Ne prend jamais de pauses, ni de congés" },
              { icon: HeartPulse, text: "Zéro arrêt maladie" },
              { icon: Wallet, text: "Zéro charge salariale" },
            ].map((b) => (
              <div
                key={b.text}
                className="glow-chip flex items-center gap-2 rounded-full border border-border bg-card/80 px-4 py-2 text-sm shadow-soft backdrop-blur"
              >
                <b.icon className="size-4 text-accent" />
                {b.text}
              </div>
            ))}
          </div>

          <div className="mt-9 flex justify-center">
            <Button asChild size="lg" className="gap-2">
              <Link to="/auth" search={{ mode: "signup" }}>
                Créer mon équipe IA <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16">
        <h2 className="text-center text-3xl">Voici votre équipe</h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">
          Chaque agent a un prénom, un métier et une mission claire. Vous lui parlez comme à un collègue.
        </p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {AGENTS.map((a) => (
            <article key={a.key} className="surface p-5 text-center transition-shadow hover:shadow-lift">
              <div
                className={`mx-auto grid size-14 place-items-center rounded-2xl text-2xl ring-4 ${a.ring}`}
                aria-hidden
              >
                {a.emoji}
              </div>
              <h3 className="mt-3 text-lg">{a.name}</h3>
              <p className="text-sm font-medium text-muted-foreground">{a.role}</p>
              <p className="mt-2 text-sm text-muted-foreground">{a.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-5 pb-24">
        <div className="surface p-8 text-center">
          <p className="text-sm uppercase tracking-wide text-muted-foreground">Un seul prix, tout compris</p>
          <p className="mt-2 font-display text-5xl">39 € / mois</p>
          <ul className="mx-auto mt-6 grid max-w-md gap-2 text-left text-sm">
            {[
              "Les 10 agents IA inclus",
              "Prospects, clients, devis, factures et paiements",
              "Projets, marketing, RH, emails et analytics",
              "Vos données restent privées et isolées",
            ].map((l) => (
              <li key={l} className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-accent" />
                {l}
              </li>
            ))}
          </ul>
          <Button asChild size="lg" className="mt-8">
            <Link to="/auth" search={{ mode: "signup" }}>
              Commencer maintenant
            </Link>
          </Button>
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Kobyde — Votre équipe IA d'entreprise.
      </footer>
    </div>
  );
}
