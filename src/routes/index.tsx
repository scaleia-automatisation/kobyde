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
import { PAID_PLANS } from "@/lib/plans";
import { Button } from "@/components/ui/button";

const TITLE = "Kobyde — 10 agents IA pour piloter votre entreprise, dès 0 €/mois";
const DESC =
  "Kobyde met 10 agents IA spécialisés au service de votre entreprise : prospection, ventes, devis, factures, projets, marketing, RH et analyse. Gratuit pour tester, formules dès 49 €/mois.";

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
          <Button asChild size="cta" variant="cta">
            <Link to="/auth" search={{ mode: "signup" }}>
              Essayer
            </Link>
          </Button>
        </div>
      </header>

      <section className="aurora-bg">
        <div className="mx-auto max-w-7xl px-5 pb-20 pt-14 text-center">
          <span className="inline-flex items-center gap-2 glow-chip rounded-full border border-border bg-card/80 px-4 py-1.5 text-sm text-muted-foreground backdrop-blur">
            <BadgeCheck className="size-4 text-accent" />
            10 agents IA à votre service 24h/24 et 7j/7 — testez gratuitement, dès 49 €/mois
          </span>
          <h1 className="hero-title mx-auto mt-6 max-w-full text-[clamp(1.75rem,5.2vw,4.25rem)] leading-[1.08] font-black italic tracking-tight whitespace-nowrap">
            <span className="block">Une équipe complète</span>
            <span className="block">d'agents IA pour votre entreprise,</span>
            <span className="block">pour moins de 1,30 € par jour.</span>
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
            Ils trouvent des clients, écrivent vos devis, relancent vos factures, suivent vos projets et
            analysent vos chiffres. Vous, vous décidez.
          </p>

          <div className="mx-auto mt-8 flex max-w-3xl flex-wrap justify-center gap-3">
            {[
              { icon: Clock4, text: "Travaille 24h/24 et 7j/7" },
              { icon: Moon, text: "Zéro pause Zéro congés" },
              { icon: HeartPulse, text: "Zéro arrêt maladie" },
              { icon: Wallet, text: "Zéro charge salariale" },
            ].map((b) => (
              <div
                key={b.text}
                className="aurora-chip glow-chip flex items-center gap-2 rounded-full border border-white/20 px-5 py-2.5 text-base font-medium text-white shadow-soft backdrop-blur"
              >
                <b.icon className="size-5 text-white" />
                {b.text}
              </div>
            ))}
          </div>

          <div className="mt-9 flex justify-center">
            <Button asChild size="cta" variant="cta" className="gap-2">
              <Link to="/auth" search={{ mode: "signup" }}>
                Créer mon équipe IA <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16">
        <h2 className="text-center text-3xl">Voici votre équipe</h2>
        <p className="mx-auto mt-4 max-w-2xl text-center font-display text-xl font-medium italic leading-relaxed md:text-2xl bg-gradient-to-r from-aurora-1 via-aurora-2 to-aurora-3 bg-clip-text text-transparent">
          Une équipe d'employés IA interconnectés qui travaille 24h/24 et 7j/7 en parfaite collaboration.
        </p>
        {(() => {
          const lead = AGENTS.find((a) => a.key === "directeur") ?? AGENTS[0]!;
          const rest = AGENTS.filter((a) => a.key !== lead.key);
          const row1 = rest.slice(0, 5);
          const row2 = rest.slice(5);
          const Card = ({ a, big = false }: { a: (typeof AGENTS)[number]; big?: boolean }) => (
            <article
              className={`surface text-center transition-shadow hover:shadow-lift ${big ? "p-7" : "p-5"}`}
            >
              <div
                className={`mx-auto grid place-items-center rounded-2xl ring-4 ${a.ring} ${
                  big ? "size-20 rounded-3xl text-4xl" : "size-14 text-2xl"
                }`}
                aria-hidden
              >
                {a.emoji}
              </div>
              <h3 className={`mt-3 ${big ? "text-2xl font-bold" : "text-lg"}`}>{a.name}</h3>
              <p className="text-sm font-medium text-muted-foreground">{a.role}</p>
              <p className={`mt-2 text-sm text-muted-foreground ${big ? "mx-auto max-w-md" : ""}`}>
                {a.description}
              </p>
            </article>
          );
          return (
            <div className="mt-10 space-y-6">
              <div className="mx-auto max-w-xl">
                <Card a={lead} big />
              </div>
              <div className="mx-auto h-8 w-px border-l-2 border-dashed border-border" aria-hidden />
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                {row1.map((a) => (
                  <Card key={a.key} a={a} />
                ))}
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {row2.map((a) => (
                  <Card key={a.key} a={a} />
                ))}
              </div>
            </div>
          );
        })()}

      </section>

      <section id="tarifs" className="aurora-bg py-24">
        <div className="mx-auto max-w-6xl px-5">
          <h2 className="text-center text-3xl">Des formules simples, sans engagement</h2>
          <p className="mt-3 text-center text-muted-foreground">
            Abonnement mensuel renouvelé automatiquement. Vos crédits non utilisés sont reportés au mois
            suivant.
          </p>
          <div className="mt-10 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {PAID_PLANS.map((p) => (
              <article
                key={p.key}
                className={`surface flex flex-col p-7 ${p.highlight ? "ring-2 ring-primary" : ""}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-display text-xl font-bold">{p.name}</h3>
                  {p.highlight && (
                    <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs text-primary-foreground">
                      Recommandé
                    </span>
                  )}
                </div>
                <p className="mt-3 font-display text-3xl">
                  {p.price} €<span className="text-base text-muted-foreground"> / mois</span>
                </p>
                <p className="mt-1 text-sm font-bold text-accent">{p.credits} crédits IA / mois</p>
                <p className="mt-2 text-sm text-muted-foreground">{p.tagline}</p>
                <ul className="mt-5 flex-1 space-y-2.5 text-left text-sm">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <ShieldCheck className="mt-0.5 size-4 shrink-0 text-accent" />
                      <span className="font-semibold text-foreground">{f}</span>
                    </li>
                  ))}
                </ul>
                <Button asChild size="cta" variant="cta" className="mt-7">
                  <Link to="/auth" search={{ mode: "signup" }}>
                    {`Choisir ${p.name}`}
                  </Link>
                </Button>
              </article>
            ))}
          </div>
          <p className="mt-8 text-center text-sm text-muted-foreground">
            Chaque nouvelle inscription démarre avec 10 crédits offerts pour tester Kobyde.
          </p>
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Kobyde — Votre équipe IA d'entreprise.
      </footer>
    </div>
  );
}
