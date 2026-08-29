/* eslint-disable @typescript-eslint/no-explicit-any */
import { round2 } from "./sales";

export async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

/** Journalise un évènement de comportement client. */
export async function logEvent(
  orgId: string,
  name: string,
  opts: {
    clientId?: string | null;
    entityType?: string | null;
    entityId?: string | null;
    payload?: Record<string, unknown>;
  } = {},
) {
  const db = await admin();
  await db.from("analytics_events").insert({
    org_id: orgId,
    client_id: opts.clientId ?? null,
    name,
    entity_type: opts.entityType ?? null,
    entity_id: opts.entityId ?? null,
    payload: opts.payload ?? {},
  });
}

/** Résout un accès espace client à partir de son lien secret. */
export async function resolvePortal(token: string) {
  const db = await admin();
  const { data } = await db
    .from("client_portal_access")
    .select("id,org_id,client_id,is_active")
    .eq("token", token)
    .maybeSingle();
  if (!data || !data.is_active) throw new Error("Lien invalide ou désactivé.");
  await db.from("client_portal_access").update({ last_seen_at: new Date().toISOString() }).eq("id", data.id);
  return data as { id: string; org_id: string; client_id: string };
}

export async function loadPortalData(token: string) {
  const db = await admin();
  const access = await resolvePortal(token);
  const { org_id: orgId, client_id: clientId } = access;

  const [client, org, quotes, projects, payments, invoices, documents, requests, meetings] =
    await Promise.all([
      db.from("clients").select("id,full_name,company_name,email,phone").eq("id", clientId).maybeSingle(),
      db.from("organizations").select("name,logo_url,email,phone").eq("id", orgId).maybeSingle(),
      db
        .from("quotes")
        .select("id,number,title,status,total_ht,total_ttc,valid_until,sent_at,client_comment,version")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false }),
      db
        .from("projects")
        .select("id,name,status,progress,start_date,end_date,budget")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false }),
      db
        .from("payment_requests")
        .select("id,label,amount_ttc,due_date,status,token,method,message")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false }),
      db
        .from("invoices")
        .select("id,number,label,status,amount_ht,amount_ttc,due_date,paid_at")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false }),
      db
        .from("documents")
        .select("id,name,kind,file_url,from_client,created_at")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false }),
      db
        .from("client_requests")
        .select("id,kind,title,detail,status,response,created_at")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false }),
      db
        .from("meetings")
        .select("id,title,starts_at,summary")
        .eq("client_id", clientId)
        .order("starts_at", { ascending: false })
        .limit(20),
    ]);

  return {
    orgId,
    clientId,
    client: client.data,
    org: org.data,
    quotes: quotes.data ?? [],
    projects: projects.data ?? [],
    payments: payments.data ?? [],
    invoices: invoices.data ?? [],
    documents: documents.data ?? [],
    requests: requests.data ?? [],
    meetings: meetings.data ?? [],
  };
}

export async function loadPaymentRequest(token: string) {
  const db = await admin();
  const { data } = await db
    .from("payment_requests")
    .select("id,org_id,client_id,label,amount_ht,vat_rate,discount_amount,amount_ttc,due_date,message,status,method,paid_at")
    .eq("token", token)
    .maybeSingle();
  if (!data) throw new Error("Demande de paiement introuvable.");
  const { data: org } = await db.from("organizations").select("name,email").eq("id", data.org_id).maybeSingle();
  return { request: data, org };
}

/** Confirmation d'un paiement : paiement + facture + notification + historique. */
export async function confirmPayment(
  requestId: string,
  opts: { method?: string; stripeIntent?: string | null; stripeEvent?: string | null } = {},
) {
  const db = await admin();
  const { data: pr } = await db.from("payment_requests").select("*").eq("id", requestId).maybeSingle();
  if (!pr) throw new Error("Demande de paiement introuvable.");
  if (pr.status === "payee") return { alreadyPaid: true, paymentId: null as string | null };

  const paidAt = new Date().toISOString();
  const method = opts.method ?? pr.method ?? "stripe";
  await logEvent(pr.org_id, "payment_completed", {
    clientId: pr.client_id,
    entityType: "payment_request",
    entityId: pr.id,
    payload: { amount_ttc: Number(pr.amount_ttc ?? 0), method },
  });

  const { data: payment } = await db
    .from("payments")
    .insert({
      org_id: pr.org_id,
      client_id: pr.client_id,
      payment_request_id: pr.id,
      amount: round2(Number(pr.amount_ttc ?? 0)),
      currency: "EUR",
      method,
      status: "paye",
      stripe_payment_intent_id: opts.stripeIntent ?? null,
      stripe_event_id: opts.stripeEvent ?? null,
      paid_at: paidAt,
    })
    .select("id")
    .single();

  const { count } = await db
    .from("invoices")
    .select("id", { count: "exact", head: true })
    .eq("org_id", pr.org_id);
  const number = `FAC-${String((count ?? 0) + 1).padStart(3, "0")}`;
  const ht = round2(Number(pr.amount_ttc ?? 0) / (1 + Number(pr.vat_rate ?? 20) / 100));

  await db.from("invoices").insert({
    org_id: pr.org_id,
    client_id: pr.client_id,
    quote_id: pr.quote_id,
    payment_id: payment?.id ?? null,
    number,
    label: pr.label,
    status: "payee",
    amount_ht: ht,
    amount_ttc: round2(Number(pr.amount_ttc ?? 0)),
    paid_at: paidAt,
  });

  await db.from("payment_requests").update({ status: "payee", paid_at: paidAt, method }).eq("id", pr.id);
  await db
    .from("quote_installments")
    .update({ status: "payee", paid_at: paidAt })
    .eq("payment_request_id", pr.id);

  await db.from("notifications").insert({
    org_id: pr.org_id,
    title: "Paiement reçu 🎉",
    body: `${pr.label} — ${Number(pr.amount_ttc ?? 0).toFixed(2)} € encaissés. Facture ${number} générée.`,
    kind: "success",
  });

  if (pr.quote_id) {
    await createProjectFromQuote(pr.quote_id);
    await startProjectOnFirstPayment(pr.quote_id);
  }

  return { alreadyPaid: false, paymentId: payment?.id ?? null, invoice: number };
}

/**
 * Chloé crée le projet dès que le devis est accepté.
 * Le projet reste « en attente du 1er paiement » tant qu'aucun règlement n'est reçu.
 */
export async function createProjectFromQuote(quoteId: string) {
  const db = await admin();
  const { data: quote } = await db.from("quotes").select("*").eq("id", quoteId).maybeSingle();
  if (!quote || quote.status !== "accepte") return null;

  const { data: existing } = await db.from("projects").select("id").eq("quote_id", quoteId).maybeSingle();
  if (existing) return existing.id as string;

  const { data: items } = await db.from("quote_items").select("label,quantity,subservices").eq("quote_id", quoteId);
  const { data: project } = await db
    .from("projects")
    .insert({
      org_id: quote.org_id,
      client_id: quote.client_id,
      quote_id: quoteId,
      name: quote.title,
      description: (items ?? [])
        .map((i: any) => `• ${i.label} (x${i.quantity})`)
        .join("\n"),
      status: "en_attente",
      payment_plan: quote.payment_plan ?? "unique",
      progress: 0,
      budget: Number(quote.total_ttc ?? 0),
      start_date: null,
    })
    .select("id")
    .single();

  if (project) {
    const steps = ["Analyse", "Maquette", "Développement", "Tests", "Mise en ligne"];
    await db.from("project_steps").insert(
      steps.map((name, i) => ({
        org_id: quote.org_id,
        project_id: project.id,
        name,
        status: "a_faire",
        position: i,
      })),
    );
    await db.from("notifications").insert({
      org_id: quote.org_id,
      title: "Projet créé par Chloé",
      body: `Le devis ${quote.number} est accepté : le projet « ${quote.title} » est créé. Il démarrera dès le 1er paiement reçu.`,
      kind: "info",
    });
  }
  return project?.id ?? null;
}

/** Démarre le projet lorsque le premier paiement du devis est encaissé. */
export async function startProjectOnFirstPayment(quoteId: string) {
  const db = await admin();
  const { data: paid } = await db
    .from("payment_requests")
    .select("id")
    .eq("quote_id", quoteId)
    .eq("status", "payee")
    .limit(1);
  if (!paid || paid.length === 0) return null;

  const { data: project } = await db
    .from("projects")
    .select("id,org_id,name,status")
    .eq("quote_id", quoteId)
    .maybeSingle();
  if (!project || project.status !== "en_attente") return project?.id ?? null;

  await db
    .from("projects")
    .update({ status: "en_cours", start_date: new Date().toISOString().slice(0, 10) })
    .eq("id", project.id);
  await db
    .from("project_steps")
    .update({ status: "en_cours" })
    .eq("project_id", project.id)
    .eq("position", 0);
  await db.from("notifications").insert({
    org_id: project.org_id,
    title: "Projet démarré 🚀",
    body: `Premier paiement reçu : le projet « ${project.name} » passe en cours.`,
    kind: "success",
  });
  return project.id as string;
}

/** @deprecated conservé pour compatibilité : crée puis démarre si un paiement existe. */
export async function maybeCreateProject(quoteId: string) {
  const id = await createProjectFromQuote(quoteId);
  await startProjectOnFirstPayment(quoteId);
  return id;
}


/**
 * Lien de paiement pour un client d'une entreprise.
 * Utilise EXCLUSIVEMENT le compte Stripe connecté de l'entreprise (Stripe Connect).
 * Jamais le Stripe du SaaS (réservé aux abonnements Kobyde).
 */
export async function createStripeCheckout(requestId: string, origin: string) {
  const db = await admin();
  const { data: pr } = await db.from("payment_requests").select("*").eq("id", requestId).maybeSingle();
  if (!pr) throw new Error("Demande de paiement introuvable.");

  const { createOrgCheckoutSession } = await import("./stripe-connect.server");
  const { data: client } = await db
    .from("clients")
    .select("email")
    .eq("id", pr.client_id)
    .maybeSingle();

  const session = await createOrgCheckoutSession({
    orgId: pr.org_id,
    amountTtc: Number(pr.amount_ttc ?? 0),
    label: String(pr.label ?? "Paiement"),
    successUrl: `${origin}/payer/${pr.token}?ok=1`,
    cancelUrl: `${origin}/payer/${pr.token}`,
    clientReferenceId: pr.id,
    customerEmail: client?.email ?? null,
    metadata: {
      payment_request_id: pr.id,
      client_id: pr.client_id ?? "",
      quote_id: pr.quote_id ?? "",
      invoice_id: pr.invoice_id ?? "",
    },
  });
  if (!session) return null;

  await db.from("payment_requests").update({ payment_url: session.url }).eq("id", pr.id);
  return session.url;
}
