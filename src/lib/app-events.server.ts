import type { SupabaseClient } from "@supabase/supabase-js";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Moteur d'écoute des événements externes (emails, SMS, WhatsApp, portail client…).
 * Chaque événement reçu est journalisé, peut faire évoluer un devis et crée une notification.
 */

export type IncomingEvent = {
  /** Entreprise concernée. */
  orgId: string;
  /** Fournisseur / origine : resend, lovable-email, twilio, whatsapp, portail… */
  source?: string;
  /** Canal : email, sms, whatsapp, portail, autre. */
  channel?: string;
  /** Type normalisé, ex. quote.accepted, email.opened, sms.received. */
  type: string;
  /** Devis concerné (id ou numéro). */
  quoteId?: string | null;
  quoteNumber?: string | null;
  /** Adresse email / numéro de l'interlocuteur. */
  contact?: string | null;
  message?: string | null;
  occurredAt?: string | null;
  payload?: Record<string, unknown>;
};

const CHANNEL_LABEL: Record<string, string> = {
  email: "Email",
  sms: "SMS",
  whatsapp: "WhatsApp",
  portail: "Portail client",
  autre: "Événement",
};

/** Types d'événements écoutés et leur effet sur le devis. */
const QUOTE_EFFECT: Record<string, { status?: string; stamp?: string; title: string; kind: string }> = {
  "quote.sent": { status: "envoye", stamp: "sent_at", title: "Devis envoyé au client", kind: "devis" },
  "quote.viewed": { stamp: "viewed_at", title: "Devis ouvert par le client", kind: "devis" },
  "quote.accepted": { status: "accepte", stamp: "accepted_at", title: "Devis accepté", kind: "devis" },
  "quote.refused": { status: "refuse", stamp: "refused_at", title: "Devis refusé", kind: "devis" },
  "quote.expired": { status: "expire", title: "Devis expiré", kind: "devis" },
};

const GENERIC_LABEL: Record<string, string> = {
  "email.sent": "Email envoyé",
  "email.delivered": "Email délivré",
  "email.opened": "Email ouvert",
  "email.clicked": "Lien cliqué dans un email",
  "email.replied": "Réponse reçue par email",
  "email.received": "Nouvel email reçu",
  "email.bounced": "Email non délivré (adresse invalide)",
  "email.complaint": "Email signalé comme indésirable",
  "email.unsubscribed": "Désinscription des emails",
  "sms.received": "SMS reçu",
  "sms.delivered": "SMS délivré",
  "sms.failed": "SMS non délivré",
  "whatsapp.received": "Message WhatsApp reçu",
  "facebook.message_received": "Message Messenger reçu",
  "facebook.postback": "Action cliquée sur Messenger",
  "facebook.comment": "Nouveau commentaire Facebook",
  "facebook.mention": "Mention Facebook",
  "facebook.lead": "Nouveau prospect Facebook",
  "instagram.message_received": "Message Instagram reçu",
  "instagram.comment": "Nouveau commentaire Instagram",
  "instagram.mention": "Mention Instagram",
  "whatsapp.delivered": "Message WhatsApp délivré",
  "payment.received": "Paiement reçu",
  "invoice.paid": "Facture réglée",
};

/** Traduit les noms d'événements des fournisseurs vers nos types internes. */
export function normalizeEventType(raw: string): string {
  const t = String(raw ?? "").toLowerCase().trim().replace(/\s+/g, "_");
  const map: Record<string, string> = {
    "email.bounce": "email.bounced",
    "email.complained": "email.complaint",
    "email.unsubscribe": "email.unsubscribed",
    "email.delivery_delayed": "email.bounced",
    "email.opened": "email.opened",
    "email.open": "email.opened",
    "email.click": "email.clicked",
    "message.received": "whatsapp.received",
    "devis.accepte": "quote.accepted",
    "devis.refuse": "quote.refused",
    "devis.envoye": "quote.sent",
    "devis.ouvert": "quote.viewed",
    accepted: "quote.accepted",
    refused: "quote.refused",
    declined: "quote.refused",
  };
  return map[t] ?? t;
}

async function findQuote(supabase: SupabaseClient<any>, orgId: string, ev: IncomingEvent) {
  if (ev.quoteId) {
    const { data } = await (supabase.from("quotes") as any)
      .select("id,number,title,status,client_id")
      .eq("org_id", orgId)
      .eq("id", ev.quoteId)
      .maybeSingle();
    if (data) return data;
  }
  if (ev.quoteNumber) {
    const { data } = await (supabase.from("quotes") as any)
      .select("id,number,title,status,client_id")
      .eq("org_id", orgId)
      .eq("number", ev.quoteNumber)
      .maybeSingle();
    if (data) return data;
  }
  return null;
}

/**
 * Enregistre un événement entrant : journal, mise à jour du devis concerné, notification,
 * et tâche de suivi pour l'agent responsable lorsque l'événement demande une action.
 */
export async function ingestEvent(supabase: SupabaseClient<any>, ev: IncomingEvent) {
  const type = normalizeEventType(ev.type);
  const channel = ev.channel ?? (type.startsWith("sms") ? "sms" : type.startsWith("whatsapp") ? "whatsapp" : type.startsWith("quote") ? "portail" : "email");
  const occurredAt = ev.occurredAt ? new Date(ev.occurredAt).toISOString() : new Date().toISOString();

  const quote = await findQuote(supabase, ev.orgId, ev);
  const effect = QUOTE_EFFECT[type];

  const title = effect
    ? `${effect.title}${quote ? ` — ${quote.number}` : ""}`
    : `${GENERIC_LABEL[type] ?? CHANNEL_LABEL[channel] ?? "Événement"}${ev.contact ? ` — ${ev.contact}` : ""}`;

  // Journal d'événements (source de vérité de tout ce qui est écouté).
  await (supabase.from("app_events") as any).insert({
    org_id: ev.orgId,
    source: ev.source ?? "webhook",
    channel,
    event_type: type,
    entity_type: quote ? "quote" : null,
    entity_id: quote?.id ?? null,
    title,
    detail: ev.message ?? null,
    contact: ev.contact ?? null,
    payload: (ev.payload ?? {}) as any,
    occurred_at: occurredAt,
  });

  // Effet sur le devis.
  if (quote && effect) {
    const patch: Record<string, unknown> = { last_event_at: occurredAt };
    if (effect.status) patch["status"] = effect.status;
    if (effect.stamp) patch[effect.stamp] = occurredAt;

    if (ev.message && (type === "quote.refused" || type === "quote.accepted")) patch["client_comment"] = ev.message;
    await (supabase.from("quotes") as any).update(patch).eq("id", quote.id).eq("org_id", ev.orgId);
  } else if (quote) {
    await (supabase.from("quotes") as any)
      .update({ last_event_at: occurredAt })
      .eq("id", quote.id)
      .eq("org_id", ev.orgId);
  }

  // Notification interne.
  await (supabase.from("notifications") as any).insert({
    org_id: ev.orgId,
    title,
    body: ev.message ?? (quote ? `Devis « ${quote.title} »` : CHANNEL_LABEL[channel] ?? "Nouvel événement reçu."),
    kind: effect?.kind ?? (channel === "email" ? "email" : channel),
  });

  // Tâche de suivi pour l'agent concerné.
  const TASK: Record<string, { agentKey: string; title: string; detail: string }> = {
    "quote.accepted": {
      agentKey: "devis",
      title: `Préparer la demande de paiement${quote ? ` du devis ${quote.number}` : ""}`,
      detail: "Le client a accepté le devis : envoyer la demande de paiement puis démarrer le projet.",
    },
    "quote.refused": {
      agentKey: "commercial",
      title: `Comprendre le refus${quote ? ` du devis ${quote.number}` : ""}`,
      detail: ev.message ?? "Préparer un message de suivi et proposer une alternative.",
    },
    "quote.viewed": {
      agentKey: "relances",
      title: `Relancer après ouverture${quote ? ` du devis ${quote.number}` : ""}`,
      detail: "Le client a ouvert le devis sans répondre : préparer une relance à valider.",
    },
    "email.replied": {
      agentKey: "relances",
      title: "Traiter la réponse reçue par email",
      detail: ev.message ?? "Une réponse client attend un traitement.",
    },
    "email.received": {
      agentKey: "relances",
      title: "Traiter un nouvel email reçu",
      detail: ev.message ?? "Analyser l'email et préparer une réponse.",
    },
    "sms.received": {
      agentKey: "clients",
      title: "Répondre à un SMS client",
      detail: ev.message ?? "Un SMS attend une réponse.",
    },
    "whatsapp.received": {
      agentKey: "clients",
      title: "Répondre à un message WhatsApp",
      detail: ev.message ?? "Un message WhatsApp attend une réponse.",
    },
    "email.bounced": {
      agentKey: "clients",
      title: `Corriger une adresse email invalide${ev.contact ? ` (${ev.contact})` : ""}`,
      detail: "L'email n'a pas pu être délivré : vérifier la fiche client.",
    },
  };

  const task = TASK[type];
  if (task) {
    const { data: agent } = await (supabase.from("agents") as any)
      .select("id")
      .eq("org_id", ev.orgId)
      .eq("key", task.agentKey)
      .maybeSingle();
    if (agent?.id) {
      await (supabase.from("agent_tasks") as any).insert({
        org_id: ev.orgId,
        agent_id: agent.id,
        title: task.title,
        detail: task.detail,
        status: "todo",
        priority: type === "quote.accepted" ? "haute" : "normale",
        credits_used: 0,
      });
    }
  }

  return { ok: true, type, quoteId: quote?.id ?? null };
}
