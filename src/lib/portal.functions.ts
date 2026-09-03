import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/** Espace client : accessible via un lien secret, sans compte. */
export const getPortal = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ token: z.string().min(16).max(80) }).parse(data))
  .handler(async ({ data }) => {
    const { loadPortalData } = await import("./portal.server");
    return loadPortalData(data.token);
  });

export const portalRespondQuote = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        token: z.string().min(16).max(80),
        quoteId: z.string().uuid(),
        action: z.enum(["accepte", "refuse", "commente"]),
        comment: z.string().max(2000).default(""),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { resolvePortal, admin, createProjectFromQuote, logEvent } = await import("./portal.server");
    const access = await resolvePortal(data.token);
    const db = await admin();

    const now = new Date().toISOString();
    const patch: Record<string, unknown> = { client_comment: data.comment || null };
    if (data.action === "accepte") Object.assign(patch, { status: "accepte", accepted_at: now });
    if (data.action === "refuse") Object.assign(patch, { status: "refuse", refused_at: now });

    const { error } = await db
      .from("quotes")
      .update(patch)
      .eq("id", data.quoteId)
      .eq("client_id", access.client_id);
    if (error) throw new Error(error.message);

    await db.from("notifications").insert({
      org_id: access.org_id,
      title:
        data.action === "accepte"
          ? "Devis accepté ✅"
          : data.action === "refuse"
            ? "Devis refusé"
            : "Nouveau commentaire client",
      body: data.comment || "Réponse reçue depuis l'espace client.",
      kind: data.action === "accepte" ? "success" : "info",
    });

    await logEvent(
      access.org_id,
      data.action === "accepte" ? "quote_accepted" : data.action === "refuse" ? "quote_rejected" : "section_clicked",
      { clientId: access.client_id, entityType: "quote", entityId: data.quoteId },
    );

    if (data.action === "accepte") await createProjectFromQuote(data.quoteId);
    return { ok: true };
  });

export const portalRespondRequest = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        token: z.string().min(16).max(80),
        requestId: z.string().uuid(),
        response: z.string().trim().min(1).max(4000),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { resolvePortal, admin, logEvent } = await import("./portal.server");
    const access = await resolvePortal(data.token);
    const db = await admin();
    await logEvent(access.org_id, "client_request_created", {
      clientId: access.client_id,
      entityType: "client_request",
      entityId: data.requestId,
    });
    const { error } = await db
      .from("client_requests")
      .update({ response: data.response, status: "repondu", responded_at: new Date().toISOString() })
      .eq("id", data.requestId)
      .eq("client_id", access.client_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const portalUploadDocument = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        token: z.string().min(16).max(80),
        name: z.string().trim().min(1).max(160),
        kind: z.string().max(60).default("document"),
        fileUrl: z.string().trim().url().max(2000).nullable().optional(),
        projectId: z.string().uuid().nullable().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { resolvePortal, admin } = await import("./portal.server");
    const access = await resolvePortal(data.token);
    const db = await admin();
    const { error } = await db.from("documents").insert({
      org_id: access.org_id,
      client_id: access.client_id,
      project_id: data.projectId ?? null,
      name: data.name,
      kind: data.kind,
      file_url: data.fileUrl ?? null,
      from_client: true,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Page de paiement publique. */
export const getPaymentRequest = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ token: z.string().min(16).max(80) }).parse(data))
  .handler(async ({ data }) => {
    const { loadPaymentRequest } = await import("./portal.server");
    return loadPaymentRequest(data.token);
  });

export const startStripeCheckout = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ token: z.string().min(16).max(80), origin: z.string().url().max(300) }).parse(data),
  )
  .handler(async ({ data }) => {
    const { loadPaymentRequest, createStripeCheckout } = await import("./portal.server");
    const { request } = await loadPaymentRequest(data.token);
    if (request.status === "payee") return { url: null, alreadyPaid: true };
    const url = await createStripeCheckout(request.id, data.origin);
    return { url, alreadyPaid: false };
  });

/** Réconciliation au retour de Stripe (sans webhook Connect). */
export const confirmStripeCheckout = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({ token: z.string().min(16).max(80), sessionId: z.string().min(5).max(200) })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { reconcileStripeCheckout } = await import("./portal.server");
    try {
      return await reconcileStripeCheckout(data.token, data.sessionId);
    } catch {
      return { paid: false };
    }
  });

/** BLOC 17 — suivi comportement client (RGPD : anonyme, sans cookie tiers). */
export const trackPortalEvent = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        token: z.string().min(16).max(80),
        kind: z.enum(["portal", "payment"]).default("portal"),
        name: z.string().trim().min(2).max(60),
        entityType: z.string().trim().max(40).nullable().optional(),
        entityId: z.string().uuid().nullable().optional(),
        sessionId: z.string().trim().max(80).nullable().optional(),
        path: z.string().trim().max(300).nullable().optional(),
        durationMs: z.number().int().min(0).max(86_400_000).nullable().optional(),
        payload: z.record(z.string(), z.unknown()).default({}),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { resolvePortal, admin, loadPaymentRequest } = await import("./portal.server");
    let orgId: string;
    let clientId: string | null;
    if (data.kind === "payment") {
      const { request } = await loadPaymentRequest(data.token);
      orgId = request.org_id;
      clientId = request.client_id ?? null;
    } else {
      const access = await resolvePortal(data.token);
      orgId = access.org_id;
      clientId = access.client_id;
    }
    const db = await admin();
    await db.from("analytics_events").insert({
      org_id: orgId,
      client_id: clientId,
      name: data.name,
      entity_type: data.entityType ?? null,
      entity_id: data.entityId ?? null,
      session_id: data.sessionId ?? null,
      path: data.path ?? null,
      duration_ms: data.durationMs ?? null,
      payload: data.payload,
    });
    return { ok: true };
  });
