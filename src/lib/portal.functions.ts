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
    const { resolvePortal, admin, maybeCreateProject } = await import("./portal.server");
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

    if (data.action === "accepte") await maybeCreateProject(data.quoteId);
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
    const { resolvePortal, admin } = await import("./portal.server");
    const access = await resolvePortal(data.token);
    const db = await admin();
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
