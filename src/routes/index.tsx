import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useSession } from "@/lib/db";
import {
  ArrowRight,
  BadgeCheck,
  FileText,
  MessageSquare,
  Rocket,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
} from "lucide-react";
import { AGENTS } from "@/lib/agents";
import { PAID_PLANS } from "@/lib/plans";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const TITLE = "Kobyde — 10 agents IA autonomes au service de votre entreprise";
const DESC =
  "Kobyde met 10 agents IA spécialisés au service de votre entreprise : prospection, ventes, devis, factures, projets, marketing, RH et analyse. Formules dès 49 €/mois.";

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

const OUTILS = [
  {
    name: "Gmail",
    color: "from-red-500 to-red-600",
    shadow: "shadow-red-500/25",
    ring: "ring-red-500/30",
    logoSrc: "/logos/gmail.png",
  },
  {
    name: "Outlook",
    color: "from-sky-500 to-blue-600",
    shadow: "shadow-sky-500/25",
    ring: "ring-sky-500/30",
    logoSrc: "/logos/outlook.png",
  },
  {
    name: "Stripe",
    color: "from-indigo-500 to-violet-600",
    shadow: "shadow-indigo-500/25",
    ring: "ring-indigo-500/30",
    logoSrc: "/logos/stripe.png",
  },
  {
    name: "Notion",
    color: "from-slate-700 to-slate-900",
    shadow: "shadow-slate-500/25",
    ring: "ring-slate-500/30",
    logoSrc: "/logos/notion.png",
  },
  {
    name: "Google Agenda",
    color: "from-blue-500 via-green-500 to-yellow-500",
    shadow: "shadow-blue-500/25",
    ring: "ring-green-500/30",
    logoSrc: "/logos/google-agenda.png",
  },
  {
    name: "Slack",
    color: "from-red-400 via-green-400 to-purple-500",
    shadow: "shadow-purple-500/25",
    ring: "ring-purple-500/30",
    logoSrc: "/logos/slack.png",
  },
  {
    name: "WhatsApp",
    color: "from-green-500 to-emerald-600",
    shadow: "shadow-green-500/25",
    ring: "ring-green-500/30",
    logoSrc: "/logos/whatsapp.png",
  },
  {
    name: "LinkedIn",
    color: "from-blue-600 to-blue-700",
    shadow: "shadow-blue-600/25",
    ring: "ring-blue-600/30",
    logoSrc: "/logos/linkedin.png",
  },
];

const TEMOIGNAGES = [
  {
    name: "Sarah M.",
    role: "Agence web · 6 personnes",
    text: "Michael sort un devis complet en 2 minutes, Clara relance toute seule. On a divisé par trois le temps passé sur l'administratif.",
  },
  {
    name: "Karim B.",
    role: "Artisan · Rénovation",
    text: "Jason m'apporte des prospects qualifiés chaque semaine, avec la source. Je ne cherche plus mes chantiers, ils arrivent.",
  },
  {
    name: "Élodie R.",
    role: "Cabinet de conseil",
    text: "Éric comprend ma demande et distribue le travail aux bons agents. C'est comme avoir une équipe de dix personnes.",
  },
  {
    name: "Thomas L.",
    role: "E-commerce",
    text: "Lamine a réécrit toutes mes pages et ma promesse. Mon taux de conversion a bougé dès le premier mois.",
  },
  {
    name: "Nadia F.",
    role: "Startup SaaS",
    text: "Mariéme trie les CV, note les candidats et prépare les entretiens. Le recrutement n'est plus un gouffre de temps.",
  },
  {
    name: "Pierre D.",
    role: "Bureau d'études",
    text: "Audrey suit les factures et la TVA, Ethan surveille le marché. Je pilote enfin avec des chiffres à jour.",
  },
];

const ETAPES = [
  {
    icon: Sparkles,
    title: "Créez votre compte",
    text: "7 étapes simples pour décrire votre entreprise : activité, TVA, offres, client idéal.",
  },
  {
    icon: MessageSquare,
    title: "Parlez à Éric",
    text: "Écrivez ce dont vous avez besoin. Éric analyse, choisit les agents et distribue les tâches.",
  },
  {
    icon: Rocket,
    title: "Laissez l'équipe travailler",
    text: "Prospects, devis, relances, contenus, analyses : vous validez, ils exécutent 24h/24.",
  },
];

const FAQ = [
  {
    q: "Qu'est-ce que Kobyde exactement ?",
    a: "Kobyde est une équipe de 10 agents IA spécialisés, coordonnés par Éric, votre directeur IA. Chacun a un métier : commercial, devis, clients, relances, marketing, RH, gestion, analyse, projets.",
  },
  {
    q: "Faut-il des compétences techniques ?",
    a: "Non. Vous écrivez en français ce dont vous avez besoin, comme à un collègue. Aucune configuration ni prompt à apprendre.",
  },
  {
    q: "Comment fonctionnent les crédits IA ?",
    a: "Naviguer, créer un client ou consulter vos données ne coûte rien. Seules les actions qui déclenchent une génération ou une analyse consomment des crédits, toujours affichés avant l'exécution.",
  },
  {
    q: "Mes données sont-elles protégées ?",
    a: "Vos données sont isolées par entreprise, chiffrées et jamais utilisées pour entraîner des modèles. Vous pouvez exporter ou supprimer vos données à tout moment (RGPD).",
  },
  {
    q: "Les agents envoient-ils des emails sans mon accord ?",
    a: "Jamais. Chaque email, devis ou publication est proposé en brouillon et attend votre validation explicite.",
  },
  {
    q: "Puis-je changer de formule ou arrêter ?",
    a: "Oui, sans engagement. Vous changez de formule ou achetez des crédits à la carte quand vous voulez, et vos crédits non utilisés sont reportés.",
  },
];

function IntegrationButtons() {
  return (
    <>
      {OUTILS.map((tool) => (
        <div key={tool.name} className="flex flex-col items-center gap-2">
          <img
            src={tool.logoSrc}
            alt={`Logo ${tool.name}`}
            width={48}
            height={48}
            loading="lazy"
            className="size-12 object-contain opacity-90"
          />
          <span className="text-sm font-medium text-foreground">{tool.name}</span>
        </div>
      ))}
    </>
  );
}


const TEMOIGNAGE_BACKGROUNDS = [
  "bg-sky-50 border-sky-100",
  "bg-emerald-50 border-emerald-100",
  "bg-violet-50 border-violet-100",
  "bg-rose-50 border-rose-100",
  "bg-amber-50 border-amber-100",
  "bg-teal-50 border-teal-100",
];

function TestimonialCard({
  t,
  index,
}: {
  t: (typeof TEMOIGNAGES)[number];
  index: number;
}) {
  const bg = TEMOIGNAGE_BACKGROUNDS[index % TEMOIGNAGE_BACKGROUNDS.length];
  return (
    <figure
      className={`shrink-0 w-[340px] md:w-[420px] rounded-3xl border p-6 shadow-sm ${bg}`}
    >
      <div className="flex gap-0.5 text-amber-500">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} className="size-4 fill-current" />
        ))}
      </div>
      <blockquote className="mt-3 text-sm text-foreground leading-relaxed">
        « {t.text} »
      </blockquote>
      <figcaption className="mt-4 text-sm">
        <span className="font-semibold text-foreground">{t.name}</span>
        <span className="block text-xs text-muted-foreground">{t.role}</span>
      </figcaption>
    </figure>
  );
}

function Landing() {
  const lead = AGENTS.find((a) => a.key === "directeur") ?? AGENTS[0]!;
  const rest = AGENTS.filter((a) => a.key !== lead.key);
  const { session } = useSession();
  const navigate = useNavigate();

  // Retour d'une connexion (Google ou email) : on renvoie vers le tableau de bord.
  useEffect(() => {
    if (!session || typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const hash = window.location.hash;
    const fromAuth =
      params.has("code") ||
      params.has("access_token") ||
      hash.includes("access_token") ||
      window.sessionStorage.getItem("kobyde:auth-redirect") === "1";
    if (fromAuth) {
      window.sessionStorage.removeItem("kobyde:auth-redirect");
      navigate({ to: "/tableau-de-bord", replace: true });
    }
  }, [session, navigate]);

  return (
    <div className="min-h-screen bg-background">
      {/* Barre d'annonce */}
      <div className="aurora-chip w-full px-5 py-2 text-center text-sm font-medium text-white">
        Offre de lancement — 10 crédits IA offerts à l'inscription, sans carte bancaire.
      </div>

      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <div className="flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-xl bg-primary font-display text-lg text-primary-foreground">
            K
          </span>
          <span className="font-display text-xl">Kobyde</span>
        </div>
        <nav className="hidden items-center gap-3 md:flex">
          {[
            { href: "#agents", label: "Agents" },
            { href: "#outils", label: "Intégrations" },
            { href: "#tarifs", label: "Tarifs" },
            { href: "#faq", label: "FAQ" },
          ].map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="rounded-xl border border-border bg-card px-4 py-2 text-lg font-semibold text-foreground shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md active:translate-y-0"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {session ? (
            <Button asChild size="cta" variant="cta">
              <Link to="/tableau-de-bord">Mon tableau de bord</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost">
                <Link to="/auth">Se connecter</Link>
              </Button>
              <Button asChild size="cta" variant="cta">
                <Link to="/auth" search={{ mode: "signup" }}>
                  Essayer
                </Link>
              </Button>
            </>
          )}
        </div>
      </header>

      {/* HERO */}
      <section>
        <div className="mx-auto max-w-7xl px-5 pb-20 pt-14 text-center">
          <span className="inline-flex items-center gap-2 glow-chip rounded-full border border-border bg-card px-4 py-1.5 text-sm text-muted-foreground">
            <span className="flex items-center gap-0.5 text-accent">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="size-3.5 fill-current" />
              ))}
            </span>
            Noté 4,9/5 par les entrepreneurs qui pilotent avec Kobyde
          </span>
          <h1 className="mx-auto mt-6 max-w-full text-[clamp(1.75rem,5.2vw,4.25rem)] leading-[1.08] font-bold tracking-tight whitespace-nowrap text-foreground">
            <span className="block">Une équipe complète</span>
            <span className="block">d'<span className="bg-linear-to-r from-pink-500 via-violet-500 to-orange-500 bg-clip-text text-transparent">agents IA</span> pour votre entreprise,</span>
            <span className="block">pour moins de <span className="bg-linear-to-r from-pink-500 via-violet-500 to-orange-500 bg-clip-text text-transparent">1,30 €</span> par jour.</span>
          </h1>

          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Button asChild size="cta" variant="default" className="gap-2">
              <Link to="/auth" search={{ mode: "signup" }}>
                Créer mon équipe IA <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild size="cta" variant="outline">
              <a href="#agents">Découvrir les agents</a>
            </Button>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Sans engagement · 10 crédits offerts · Prêt en 3 minutes
          </p>
        </div>
      </section>

      {/* BANDEAU OUTILS */}
      <section id="outils" className="w-full border-y border-border py-12">
        <p className="text-center text-lg font-bold text-foreground">
          Connecté à vos outils du quotidien
        </p>
        <div className="relative mt-8 w-full overflow-hidden">
          <div className="marquee-track">
            <div className="flex items-center gap-16 px-8">
              <IntegrationButtons />
            </div>
            <div className="flex items-center gap-16 px-8" aria-hidden="true">
              <IntegrationButtons />
            </div>
          </div>
        </div>
      </section>


      {/* AGENTS */}
      <section id="agents" className="mx-auto max-w-6xl px-5 py-16">
        <p className="text-center text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Votre équipe
        </p>
        <h2 className="mt-3 text-center text-3xl">Des agents IA à votre entière disposition</h2>
        <p className="mx-auto mt-4 max-w-2xl text-center font-display text-xl font-medium leading-relaxed md:text-2xl text-foreground">
          Une équipe d'employés IA interconnectés qui travaille 24h/24 et 7j/7 en parfaite collaboration.
        </p>
        {(() => {
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

      {/* PILOTEZ AVEC ÉRIC */}
      <section className="mx-auto max-w-6xl px-5 py-16">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div className="surface p-6">
            <div className="flex items-center gap-3 border-b border-border pb-4">
              <span className="grid size-10 place-items-center rounded-xl bg-amber-100 text-xl ring-4 ring-amber-200">
                🧭
              </span>
              <div>
                <p className="font-semibold">Éric — Directeur IA</p>
                <p className="text-xs text-accent">En ligne · répond en quelques secondes</p>
              </div>
            </div>
            <div className="space-y-3 pt-4 text-sm">
              <p className="ml-auto max-w-[80%] rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-primary-foreground">
                Trouve-moi 20 prospects dans le bâtiment à Lyon et prépare un devis type.
              </p>
              <p className="max-w-[85%] rounded-2xl rounded-bl-sm bg-muted px-4 py-2.5 text-foreground">
                C'est noté. Je confie la recherche à Jason et le devis à Michael. Je vous préviens dès
                que c'est prêt.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <span className="rounded-full bg-sky-50 px-3 py-1 text-xs text-sky-800">
                  Jason · 20 prospects qualifiés
                </span>
                <span className="rounded-full bg-violet-50 px-3 py-1 text-xs text-violet-800">
                  Michael · devis prêt à envoyer
                </span>
              </div>
            </div>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Un seul point d'entrée
            </p>
            <h2 className="mt-3 text-3xl">Pilotez votre entreprise en écrivant à Éric</h2>
            <p className="mt-4 text-muted-foreground">
              Vous n'avez pas à choisir le bon agent ni le bon outil. Éric comprend votre demande,
              consulte la mémoire de votre entreprise, distribue les tâches, suit l'avancement et vous
              présente le résultat avec l'action suivante à valider.
            </p>
            <ul className="mt-6 space-y-3 text-sm">
              {[
                "Il connaît votre fiche entreprise, vos offres et vos prix",
                "Il ne redemande jamais une information déjà connue",
                "Rien n'est envoyé sans votre validation",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2">
                  <BadgeCheck className="mt-0.5 size-4 shrink-0 text-accent" />
                  <span className="font-medium">{t}</span>
                </li>
              ))}
            </ul>
            <Button asChild size="cta" variant="cta" className="mt-7 gap-2">
              <Link to="/auth" search={{ mode: "signup" }}>
                Parler à Éric <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* CE QUE FAIT KOBYDE */}
      <section className="mx-auto max-w-6xl px-5 pb-4">
        <h2 className="mb-6 text-center text-3xl">Ce que Kobyde fait pour votre entreprise</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              icon: Search,
              title: "Trouver des clients",
              text: "Prospects qualifiés, scoring, séquences d'emails personnalisées et suivi commercial.",
            },
            {
              icon: FileText,
              title: "Vendre et encaisser",
              text: "Devis, offres, TVA, relances, paiement en ligne et facture automatique.",
            },
            {
              icon: ShieldCheck,
              title: "Piloter sans stress",
              text: "Projets, tâches, analyses de marché, reporting financier et recommandations IA.",
            },
          ].map((c) => (
            <article key={c.title} className="surface p-6">
              <c.icon className="size-6 text-accent" />
              <h3 className="mt-4 text-lg">{c.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{c.text}</p>
            </article>
          ))}
        </div>
      </section>

      {/* TÉMOIGNAGES */}
      <section className="w-full py-16 overflow-hidden">
        <div className="mx-auto max-w-6xl px-5">
          <div className="flex items-center justify-center gap-1 text-amber-500">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="size-4 fill-current" />
            ))}
          </div>
          <h2 className="mt-4 text-center text-3xl">
            Des centaines d'entreprises ont déjà recruté leur équipe IA
          </h2>
        </div>

        <div className="mt-10 space-y-5">
          {/* Ligne 1 : défile vers la droite */}
          <div className="relative w-full overflow-hidden">
            <div className="marquee-track-right">
              <div className="flex items-stretch gap-5 px-5">
                {TEMOIGNAGES.slice(0, 3).map((t, i) => (
                  <TestimonialCard key={`r1-${t.name}`} t={t} index={i} />
                ))}
              </div>
              <div className="flex items-stretch gap-5 px-5" aria-hidden="true">
                {TEMOIGNAGES.slice(0, 3).map((t, i) => (
                  <TestimonialCard key={`r1-dup-${t.name}`} t={t} index={i} />
                ))}
              </div>
            </div>
          </div>

          {/* Ligne 2 : défile vers la gauche */}
          <div className="relative w-full overflow-hidden">
            <div className="marquee-track-left">
              <div className="flex items-stretch gap-5 px-5">
                {TEMOIGNAGES.slice(3, 6).map((t, i) => (
                  <TestimonialCard key={`r2-${t.name}`} t={t} index={i + 3} />
                ))}
              </div>
              <div className="flex items-stretch gap-5 px-5" aria-hidden="true">
                {TEMOIGNAGES.slice(3, 6).map((t, i) => (
                  <TestimonialCard key={`r2-dup-${t.name}`} t={t} index={i + 3} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3 ÉTAPES */}
      <section className="mx-auto max-w-6xl px-5 py-16">
        <h2 className="text-center text-3xl">Commencez à utiliser Kobyde en 3 étapes</h2>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {ETAPES.map((e, i) => (
            <article key={e.title} className="surface p-6">
              <span className="font-display text-sm font-bold text-accent">0{i + 1}</span>
              <e.icon className="mt-3 size-6 text-primary" />
              <h3 className="mt-3 text-lg">{e.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{e.text}</p>
            </article>
          ))}
        </div>
      </section>

      {/* TARIFS */}
      <section id="tarifs" className="py-24">
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
                <p className="mt-1 text-sm font-bold text-primary">{p.credits} crédits IA / mois</p>
                <p className="mt-2 text-sm text-muted-foreground">{p.tagline}</p>
                <ul className="mt-5 flex-1 space-y-2.5 text-left text-sm">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
                      <span className="font-semibold text-foreground">{f}</span>
                    </li>
                  ))}
                </ul>
                <Button asChild size="cta" variant="default" className="mt-7">
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

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-6xl px-5 py-16">
        <h2 className="text-center text-3xl">Les questions fréquentes</h2>
        <Accordion type="single" collapsible className="mt-8">
          {FAQ.map((f) => (
            <AccordionItem key={f.q} value={f.q}>
              <AccordionTrigger className="text-left text-xl">{f.q}</AccordionTrigger>
              <AccordionContent className="text-lg text-muted-foreground">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        <div className="surface mt-8 bg-muted/60 p-8 text-center">
          <p className="font-semibold">Vous avez encore besoin d'aide ?</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Écrivez-nous, nous répondons sous 24 h ouvrées.
          </p>
          <Button asChild variant="default" className="mt-5">
            <a href="mailto:contact@kobyde.com">Contacter l'équipe</a>
          </Button>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="py-20">
        <div className="mx-auto max-w-3xl px-5 text-center">
          <h2 className="text-[clamp(1.75rem,4vw,3rem)] font-bold leading-tight text-foreground">
            Recrutez vos <span className="bg-linear-to-r from-pink-500 via-violet-500 to-orange-500 bg-clip-text text-transparent">10 agents IA</span> dès aujourd'hui
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Moins de 1,30 € par jour pour une équipe qui prospecte, vend, relance, analyse et livre —
            sans jamais s'arrêter.
          </p>
          <Button asChild size="cta" variant="default" className="mt-8 gap-2">
            <Link to="/auth" search={{ mode: "signup" }}>
              Créer mon équipe IA <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        <nav className="mb-3 flex flex-wrap justify-center gap-x-5 gap-y-2">
          <Link to="/blog" className="hover:underline">Blog</Link>
          <Link to="/mentions-legales" className="hover:underline">Mentions légales</Link>
          <Link to="/confidentialite" className="hover:underline">Confidentialité</Link>
          <Link to="/cgv" className="hover:underline">CGV</Link>
          <Link to="/data-deletion" className="hover:underline">Suppression des données</Link>
          <Link to="/data-deletion-request" className="hover:underline">Demande de suppression</Link>
        </nav>
        © {new Date().getFullYear()} Kobyde — Votre équipe IA d'entreprise.
      </footer>
    </div>
  );
}
