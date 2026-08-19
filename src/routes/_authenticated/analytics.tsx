import { createFileRoute } from "@tanstack/react-router";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AppShell } from "@/components/app-shell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { euros, frDate, useRows } from "@/lib/db";
import { averageDelayDays, eventLabel, pct, RGPD_PORTAL_NOTICE } from "@/lib/analytics";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — Kobyde" },
      {
        name: "description",
        content:
          "Analytics entreprise (commercial, devis, paiements, projets) et comportement client dans l'espace sécurisé.",
      },
      { property: "og:title", content: "Analytics — Kobyde" },
      { property: "og:description", content: "Vos chiffres et le comportement de vos clients, expliqués simplement." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Analytics,
});

/* eslint-disable @typescript-eslint/no-explicit-any */

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="surface p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-3xl tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6 first:mt-0">
      <h2 className="font-display text-lg">{title}</h2>
      <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{children}</div>
    </section>
  );
}

function Analytics() {
  const { data: prospects } = useRows<any>("prospects", { limit: 1000 });
  const { data: clients } = useRows<any>("clients", { limit: 1000 });
  const { data: quotes } = useRows<any>("quotes", { limit: 1000 });
  const { data: opportunities } = useRows<any>("opportunities", { limit: 1000 });
  const { data: meetings } = useRows<any>("meetings", { limit: 1000 });
  const { data: payments } = useRows<any>("payments", { limit: 1000 });
  const { data: paymentRequests } = useRows<any>("payment_requests", { limit: 1000 });
  const { data: projects } = useRows<any>("projects", { limit: 1000 });
  const { data: events } = useRows<any>("analytics_events", { limit: 1000 });

  const PR = prospects ?? [];
  const C = clients ?? [];
  const Q = quotes ?? [];
  const O = opportunities ?? [];
  const M = meetings ?? [];
  const PAY = payments ?? [];
  const REQ = paymentRequests ?? [];
  const PJ = projects ?? [];
  const EV = events ?? [];
  const now = Date.now();

  /* ---------- Commercial ---------- */
  const qualifies = PR.filter((p) => ["qualifie", "interesse", "client"].includes(p.status)).length;
  const contactes = PR.filter((p) => p.status !== "nouveau").length;
  const repondu = PR.filter((p) => ["interesse", "qualifie", "client", "repondu"].includes(p.status)).length;
  const caEncaisse = PAY.filter((p) => p.status === "paye" || p.status === "paid").reduce(
    (s, p) => s + Number(p.amount ?? 0),
    0,
  );

  /* ---------- Devis ---------- */
  const envoyes = Q.filter((q) => q.status !== "brouillon" || q.sent_at).length;
  const acceptes = Q.filter((q) => q.status === "accepte").length;
  const refuses = Q.filter((q) => q.status === "refuse").length;
  const expires = Q.filter(
    (q) => q.status === "envoye" && q.valid_until && new Date(q.valid_until).getTime() < now,
  ).length;
  const consultes = new Set(
    EV.filter((e) => e.name === "quote_viewed" && e.entity_id).map((e) => e.entity_id as string),
  ).size;

  /* ---------- Paiements ---------- */
  const enAttente = REQ.filter((r) => r.status !== "payee").reduce((s, r) => s + Number(r.amount_ttc ?? 0), 0);
  const enRetard = REQ.filter(
    (r) => r.status !== "payee" && r.due_date && new Date(r.due_date).getTime() < now,
  );
  const paidPayments = PAY.filter((p) => p.status === "paye" || p.status === "paid");
  const panier = paidPayments.length ? caEncaisse / paidPayments.length : 0;
  const delai = averageDelayDays(
    REQ.filter((r) => r.status === "payee").map((r) => ({ from: r.created_at, to: r.paid_at })),
  );

  /* ---------- Projets ---------- */
  const actifs = PJ.filter((p) => p.status !== "termine" && p.status !== "annule").length;
  const termines = PJ.filter((p) => p.status === "termine").length;
  const retardProjets = PJ.filter(
    (p) => p.status !== "termine" && p.end_date && new Date(p.end_date).getTime() < now,
  ).length;
  const avancement = PJ.length
    ? Math.round(PJ.reduce((s, p) => s + Number(p.progress ?? 0), 0) / PJ.length)
    : 0;

  const chart = [
    { name: "Prospects", valeur: PR.length },
    { name: "RDV", valeur: M.length },
    { name: "Devis", valeur: Q.length },
    { name: "Clients", valeur: C.length },
    { name: "Paiements", valeur: paidPayments.length },
  ];

  /* ---------- Comportement client ---------- */
  const byName = new Map<string, number>();
  for (const e of EV) byName.set(e.name, (byName.get(e.name) ?? 0) + 1);
  const eventRows = [...byName.entries()].sort((a, b) => b[1] - a[1]);
  const sessions = new Set(EV.filter((e) => e.session_id).map((e) => e.session_id as string)).size;
  const durations = EV.filter((e) => e.name === "time_spent" && e.duration_ms).map((e) =>
    Number(e.duration_ms),
  );
  const tempsMoyen = durations.length
    ? Math.round(durations.reduce((s, v) => s + v, 0) / durations.length / 1000)
    : 0;
  const clientName = (id: string | null) =>
    C.find((c) => c.id === id)?.full_name ?? (id ? "Client" : "Visiteur");
  const perClient = new Map<string, { events: number; last: string }>();
  for (const e of EV) {
    const key = clientName(e.client_id ?? null);
    const prev = perClient.get(key);
    perClient.set(key, {
      events: (prev?.events ?? 0) + 1,
      last: prev?.last && prev.last > e.created_at ? prev.last : e.created_at,
    });
  }
  const parcours = [...EV]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 25);

  return (
    <AppShell title="Analytics" subtitle="Vos chiffres d'entreprise et le comportement de vos clients.">
      <Tabs defaultValue="entreprise">
        <TabsList>
          <TabsTrigger value="entreprise">Analytics entreprise</TabsTrigger>
          <TabsTrigger value="comportement">Comportement client</TabsTrigger>
        </TabsList>

        <TabsContent value="entreprise" className="mt-6">
          <Section title="Commercial">
            <Metric label="Prospects" value={String(PR.length)} hint="Clients potentiels identifiés" />
            <Metric
              label="Taux de qualification"
              value={`${pct(qualifies, PR.length)} %`}
              hint={`${qualifies} prospects qualifiés`}
            />
            <Metric
              label="Taux de réponse"
              value={`${pct(repondu, contactes)} %`}
              hint={`${repondu} réponses sur ${contactes} contactés`}
            />
            <Metric label="Rendez-vous" value={String(M.length)} hint="Réunions enregistrées" />
            <Metric label="Opportunités" value={String(O.length)} hint="Affaires en cours" />
            <Metric label="Devis" value={String(Q.length)} hint={`${envoyes} envoyés`} />
            <Metric
              label="Conversion"
              value={`${pct(C.length, PR.length)} %`}
              hint="Prospects devenus clients"
            />
            <Metric label="Chiffre d'affaires" value={euros(caEncaisse)} hint="Paiements encaissés" />
          </Section>

          <Section title="Devis">
            <Metric label="Créés" value={String(Q.length)} />
            <Metric label="Envoyés" value={String(envoyes)} />
            <Metric label="Consultés" value={String(consultes)} hint="Ouverts dans l'espace client" />
            <Metric label="Acceptés" value={String(acceptes)} />
            <Metric label="Refusés" value={String(refuses)} />
            <Metric label="Expirés" value={String(expires)} hint="Date de validité dépassée" />
            <Metric
              label="Taux de conversion"
              value={`${pct(acceptes, envoyes)} %`}
              hint="Acceptés / envoyés"
            />
            <Metric label="Montant accepté" value={euros(
              Q.filter((q) => q.status === "accepte").reduce((s, q) => s + Number(q.total_ttc ?? 0), 0),
            )} />
          </Section>

          <Section title="Paiements">
            <Metric label="Encaissés" value={euros(caEncaisse)} hint={`${paidPayments.length} paiements`} />
            <Metric label="En attente" value={euros(enAttente)} hint={`${REQ.filter((r) => r.status !== "payee").length} demandes`} />
            <Metric
              label="En retard"
              value={euros(enRetard.reduce((s, r) => s + Number(r.amount_ttc ?? 0), 0))}
              hint={`${enRetard.length} échéances dépassées`}
            />
            <Metric label="Panier moyen" value={euros(panier)} />
            <Metric
              label="Délai de paiement"
              value={delai === null ? "—" : `${delai} j`}
              hint="Entre la demande et l'encaissement"
            />
          </Section>

          <Section title="Projets">
            <Metric label="Actifs" value={String(actifs)} />
            <Metric label="Terminés" value={String(termines)} />
            <Metric label="En retard" value={String(retardProjets)} hint="Date de fin dépassée" />
            <Metric label="Avancement moyen" value={`${avancement} %`} />
          </Section>

          <section className="surface mt-6 p-6">
            <h2 className="font-display text-lg">Votre activité en un coup d'œil</h2>
            <div className="mt-6 h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--color-muted-foreground)" fontSize={12} />
                  <YAxis allowDecimals={false} stroke="var(--color-muted-foreground)" fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="valeur" fill="var(--color-chart-1)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Conseil d'Ethan : si vous avez beaucoup de prospects mais peu de clients, envoyez plus de devis.
            </p>
          </section>
        </TabsContent>

        <TabsContent value="comportement" className="mt-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="Évènements suivis" value={String(EV.length)} hint="Dans l'espace client" />
            <Metric label="Sessions" value={String(sessions)} hint="Visites anonymes distinctes" />
            <Metric
              label="Temps moyen"
              value={tempsMoyen ? `${tempsMoyen} s` : "—"}
              hint="Durée de consultation par visite"
            />
            <Metric label="Devis ouverts" value={String(consultes)} hint="Devis réellement consultés" />
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <section className="surface p-6">
              <h2 className="font-display text-lg">Ce que font vos clients</h2>
              <ul className="mt-4 space-y-2">
                {eventRows.length === 0 && (
                  <li className="text-sm text-muted-foreground">
                    Aucun évènement pour l'instant. Partagez un lien d'espace client pour commencer à mesurer.
                  </li>
                )}
                {eventRows.map(([name, count]) => (
                  <li key={name} className="flex items-center justify-between rounded-xl border border-border p-3 text-sm">
                    <span>{eventLabel(name)}</span>
                    <Badge variant="outline" className="tabular-nums">{count}</Badge>
                  </li>
                ))}
              </ul>
            </section>

            <section className="surface p-6">
              <h2 className="font-display text-lg">Par client</h2>
              <ul className="mt-4 space-y-2">
                {perClient.size === 0 && (
                  <li className="text-sm text-muted-foreground">Aucune activité client mesurée.</li>
                )}
                {[...perClient.entries()]
                  .sort((a, b) => b[1].events - a[1].events)
                  .map(([name, v]) => (
                    <li key={name} className="flex items-center justify-between rounded-xl border border-border p-3 text-sm">
                      <span className="min-w-0 flex-1 truncate">{name}</span>
                      <span className="text-xs text-muted-foreground">{frDate(v.last)}</span>
                      <Badge variant="outline" className="ml-3 tabular-nums">{v.events}</Badge>
                    </li>
                  ))}
              </ul>
            </section>
          </div>

          <section className="surface mt-6 p-6">
            <h2 className="font-display text-lg">Parcours récent</h2>
            <ul className="mt-4 space-y-2">
              {parcours.length === 0 && (
                <li className="text-sm text-muted-foreground">Aucun parcours enregistré.</li>
              )}
              {parcours.map((e) => (
                <li key={e.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border p-3 text-sm">
                  <Badge variant="secondary">{eventLabel(e.name)}</Badge>
                  <span className="min-w-0 flex-1 truncate text-muted-foreground">
                    {clientName(e.client_id ?? null)}
                    {e.duration_ms ? ` · ${Math.round(Number(e.duration_ms) / 1000)} s` : ""}
                    {e.path ? ` · ${e.path}` : ""}
                  </span>
                  <span className="text-xs text-muted-foreground">{frDate(e.created_at)}</span>
                </li>
              ))}
            </ul>
          </section>

          <p className="mt-4 text-xs text-muted-foreground">{RGPD_PORTAL_NOTICE}</p>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
