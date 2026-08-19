import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CalendarClock, CheckCircle2, Loader2, Shield } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getInterviewInvite, respondInterviewInvite } from "@/lib/hr.functions";

/* eslint-disable @typescript-eslint/no-explicit-any */

export const Route = createFileRoute("/entretien/$token")({
  head: () => ({
    meta: [
      { title: "Votre entretien — Kobyde" },
      { name: "description", content: "Choisissez le créneau d'entretien qui vous convient, sans créer de compte." },
      { property: "og:title", content: "Votre entretien — Kobyde" },
      { property: "og:description", content: "Confirmez votre rendez-vous de recrutement en un clic." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: InterviewInvitePage,
});

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });

function InterviewInvitePage() {
  const { token } = Route.useParams();
  const [proposal, setProposal] = useState("");

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["interview-invite", token],
    queryFn: () => getInterviewInvite({ data: { token } }),
    retry: false,
  });

  const respond = useMutation({
    mutationFn: (vars: { action: "choisir" | "autre" | "refus"; slot?: string }) =>
      respondInterviewInvite({ data: { token, slot: vars.slot ?? "", proposal, action: vars.action } }),
    onSuccess: () => {
      toast.success("Merci, votre réponse a bien été transmise.");
      setProposal("");
      void refetch();
    },
    onError: (e: any) => toast.error(e?.message ?? "Erreur"),
  });

  if (isLoading) {
    return (
      <main className="grid min-h-screen place-items-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="grid min-h-screen place-items-center p-6">
        <Card className="max-w-md p-6 text-center">
          <h1 className="text-lg font-semibold">Lien invalide</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Ce lien d'entretien n'est plus valable. Contactez votre interlocuteur pour en recevoir un nouveau.
          </p>
        </Card>
      </main>
    );
  }

  const { invite, prenom, entreprise, poste, rgpd } = data as any;
  const done = invite.status !== "envoye";

  return (
    <main className="mx-auto w-full max-w-2xl space-y-6 p-6">
      <header className="space-y-1">
        <p className="text-sm text-muted-foreground">{entreprise.nom}</p>
        <h1 className="text-2xl font-semibold">
          Bonjour {prenom || ""}, choisissez votre créneau d'entretien
        </h1>
        {poste ? <p className="text-muted-foreground">Poste : {poste}</p> : null}
      </header>

      {invite.message ? (
        <Card className="p-5 text-sm whitespace-pre-line">{invite.message}</Card>
      ) : null}

      {done ? (
        <Card className="flex items-start gap-3 p-5">
          <CheckCircle2 className="mt-0.5 size-5 text-emerald-500" />
          <div className="text-sm">
            <p className="font-medium">Votre réponse a bien été enregistrée.</p>
            <p className="text-muted-foreground">
              {invite.status === "choisi" && invite.chosen_slot
                ? `Rendez-vous confirmé : ${fmt(invite.chosen_slot)}.`
                : invite.status === "autre"
                  ? "Nous revenons vers vous avec une nouvelle proposition de date."
                  : "Nous avons bien noté que vous ne recherchez plus d'emploi."}
            </p>
          </div>
        </Card>
      ) : (
        <>
          <Card className="space-y-3 p-5">
            <h2 className="flex items-center gap-2 font-semibold">
              <CalendarClock className="size-4" /> Créneaux proposés
            </h2>
            <div className="grid gap-2">
              {(invite.slots as string[]).map((slot, i) => (
                <Button
                  key={slot}
                  variant="outline"
                  className="justify-start"
                  disabled={respond.isPending}
                  onClick={() => respond.mutate({ action: "choisir", slot })}
                >
                  Créneau {i + 1} — {fmt(slot)}
                </Button>
              ))}
            </div>
          </Card>

          <Card className="space-y-3 p-5">
            <Label>Proposer un autre rendez-vous</Label>
            <Textarea
              rows={3}
              value={proposal}
              onChange={(e) => setProposal(e.target.value)}
              placeholder="Indiquez vos disponibilités (jours et horaires)."
            />
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                disabled={respond.isPending || !proposal.trim()}
                onClick={() => respond.mutate({ action: "autre" })}
              >
                Proposer un autre rendez-vous
              </Button>
              <Button variant="ghost" disabled={respond.isPending} onClick={() => respond.mutate({ action: "refus" })}>
                Je ne recherche plus d'emploi
              </Button>
            </div>
          </Card>
        </>
      )}

      <Card className="flex gap-3 p-5 text-xs text-muted-foreground">
        <Shield className="mt-0.5 size-4 shrink-0" />
        <p className="whitespace-pre-line">{rgpd}</p>
      </Card>
    </main>
  );
}
