import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { findProspectsAI, generatePersonaAI, loadMemory, NOT_FOUND } from "./prospection.server";
import { searchActionKey } from "./prospection";
import { completeCredits, refundCredits, reserveCredits } from "./credits.server";

const paramsSchema = z.object({
  target: z.string().max(200).default(""),
  continent: z.string().max(80).default(""),
  country: z.string().max(80).default(""),
  region: z.string().max(80).default(""),
  department: z.string().max(80).default(""),
  city: z.string().max(80).default(""),
  district: z.string().max(80).default(""),
  count: z.number().int().min(0).max(100).default(20),
  offer: z.string().max(300).default(""),
  channel: z.string().max(40).default("Google Search"),
  tool: z.string().max(40).default("Automatique"),
});

export const generatePersona = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        orgId: z.string().uuid(),
        idempotencyKey: z.string().min(8).max(64),
        params: paramsSchema,
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;

    const { data: membership } = await supabase
      .from("memberships")
      .select("id")
      .eq("org_id", data.orgId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!membership) throw new Error("Accès refusé à cette organisation.");

    const tx = await reserveCredits(supabase, {
      orgId: data.orgId,
      actionKey: "prospect.persona",
      idempotencyKey: data.idempotencyKey,
    });

    try {
      const memory = await loadMemory(supabase, data.orgId);
      const persona = await generatePersonaAI(data.params, memory);
      const content = [
        persona.resume,
        persona.profil.length ? `Profil : ${persona.profil.join(" · ")}` : "",
        persona.problemes.length ? `Problèmes : ${persona.problemes.join(" · ")}` : "",
        persona.objectifs.length ? `Objectifs : ${persona.objectifs.join(" · ")}` : "",
        persona.objections.length ? `Objections : ${persona.objections.join(" · ")}` : "",
        persona.ou_les_trouver.length ? `Où les trouver : ${persona.ou_les_trouver.join(" · ")}` : "",
        persona.messages_cles.length ? `Messages clés : ${persona.messages_cles.join(" · ")}` : "",
      ]
        .filter(Boolean)
        .join("\n\n");

      const { data: row, error } = await supabase
        .from("personas")
        .insert({
          org_id: data.orgId,
          title: persona.titre,
          content,
          data: persona,
          params: data.params,
          status: "brouillon",
          created_by: context.userId,
        })
        .select("id,title,content,status")
        .single();
      if (error) throw new Error(error.message);

      await completeCredits(supabase, tx, persona.titre);
      return {
        persona: row as { id: string; title: string; content: string; status: string },
        credits_used: tx ? Math.abs(tx.amount) : 0,
        credits_left: tx ? tx.balance_after : null,
      };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Échec de la génération du persona";
      await refundCredits(supabase, tx, message);
      throw new Error(message);
    }
  });

export const savePersona = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        orgId: z.string().uuid(),
        personaId: z.string().uuid(),
        title: z.string().max(160).optional(),
        content: z.string().max(8000).optional(),
        status: z.enum(["brouillon", "valide"]).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const patch = {
      updated_at: new Date().toISOString(),
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.content !== undefined ? { content: data.content } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
    };

    const { error } = await context.supabase
      .from("personas")
      .update(patch)
      .eq("id", data.personaId)
      .eq("org_id", data.orgId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const findProspects = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        orgId: z.string().uuid(),
        idempotencyKey: z.string().min(8).max(64),
        params: paramsSchema,
        personaId: z.string().uuid().nullable().optional(),
        personaText: z.string().max(8000).default(""),
        /** Par défaut, les entreprises déjà présentes en base sont exclues. */
        includeExisting: z.boolean().default(false),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;

    const { data: membership } = await supabase
      .from("memberships")
      .select("id")
      .eq("org_id", data.orgId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!membership) throw new Error("Accès refusé à cette organisation.");

    const tx = await reserveCredits(supabase, {
      orgId: data.orgId,
      actionKey: searchActionKey(data.params.count),
      idempotencyKey: data.idempotencyKey,
    });

    const { data: search, error: searchError } = await supabase
      .from("prospect_searches")
      .insert({
        org_id: data.orgId,
        persona_id: data.personaId ?? null,
        params: data.params,
        status: "en_cours",
        created_by: context.userId,
      })
      .select("id")
      .single();
    if (searchError) {
      await refundCredits(supabase, tx, searchError.message);
      throw new Error(searchError.message);
    }

    try {
      const { detectDuplicates, enrichPatch } = await import("./context-engine");
      const { loadEntityRows, recordAction } = await import("./context-engine.server");
      const { ALREADY_ENGAGED } = await import("./context-engine");

      const memory = await loadMemory(supabase, data.orgId);
      const result = await findProspectsAI(data.params, data.personaText, memory);

      // Base existante : on vérifie AVANT de créer quoi que ce soit.
      const existing = await loadEntityRows(supabase, data.orgId, "prospect", 2000);
      const clean = (v: string) => (v === NOT_FOUND ? null : v);

      const fresh: typeof result.prospects = [];
      let enriched = 0;
      let ignores = 0;

      for (const p of result.prospects) {
        const candidate = {
          company_name: p.company_name === NOT_FOUND ? "" : p.company_name,
          full_name: p.full_name === NOT_FOUND ? "" : p.full_name,
          email: clean(p.email),
          phone: clean(p.phone),
          website: clean(p.website),
        };
        const matches = detectDuplicates("prospect", candidate, existing);
        const match = matches[0];

        if (!match) {
          fresh.push(p);
          continue;
        }

        const statut = String(match.row.status ?? "").toLowerCase();
        const etape = String(match.row.followup_step ?? "").toLowerCase();
        const engage = ALREADY_ENGAGED.has(statut) || ALREADY_ENGAGED.has(etape);

        // Prospect déjà connu : on enrichit uniquement les champs manquants, jamais de doublon.
        const patch = enrichPatch(match.row, {
          email: clean(p.email),
          phone: clean(p.phone),
          website: clean(p.website),
          city: clean(p.city),
          source_url: clean(p.source_url),
          qualification: clean(p.qualification),
          angle: clean(p.angle),
        });
        if (Object.keys(patch).length) {
          await supabase.from("prospects").update(patch).eq("id", match.row.id);
          enriched += 1;
          await recordAction(supabase, {
            orgId: data.orgId,
            userId: context.userId,
            agentKey: "commercial",
            actionType: "prospect_enrichi",
            entityType: "prospect",
            entityId: match.row.id,
            entityLabel: match.row.company_name || match.row.full_name,
            result: `Champs enrichis : ${Object.keys(patch).join(", ")}`,
            metadata: { source: data.params.tool, champs: Object.keys(patch) },
          });
        } else if (engage) {
          ignores += 1;
        }
      }

      // Sans l'option explicite, on ne renvoie pas les entreprises déjà présentes.
      const visibles = data.includeExisting ? result.prospects : result.prospects.filter((p) => fresh.includes(p));

      let inserted: { id: string; company_name: string | null }[] = [];
      if (fresh.length) {
        const { data: rows, error } = await supabase
          .from("prospects")
          .insert(
            fresh.map((p) => ({
              org_id: data.orgId,
              search_id: search.id,
              company_name: clean(p.company_name),
              full_name: p.full_name === NOT_FOUND ? p.company_name : p.full_name,
              email: clean(p.email),
              phone: clean(p.phone),
              website: clean(p.website),
              city: clean(p.city),
              channel: p.channel,
              source: data.params.tool,
              source_url: clean(p.source_url),
              sources: p.sources,
              qualification: clean(p.qualification),
              angle: clean(p.angle),
              personalized_message: clean(p.personalized_message),
              followup_step: "À contacter",
              score: p.score,
              status: "nouveau",
              notes: clean(p.notes),
            })),
          )
          .select("id,company_name");
        if (error) throw new Error(error.message);
        inserted = (rows ?? []) as { id: string; company_name: string | null }[];
      }

      for (const row of inserted) {
        await recordAction(supabase, {
          orgId: data.orgId,
          userId: context.userId,
          agentKey: "commercial",
          actionType: "prospect_recherche",
          entityType: "prospect",
          entityId: row.id,
          entityLabel: row.company_name,
          result: "Prospect trouvé et enregistré",
          metadata: { canal: data.params.channel, outil: data.params.tool },
          fingerprintParts: ["prospect_recherche", row.company_name ?? row.id],
        });
      }

      await supabase
        .from("prospect_searches")
        .update({
          status: "termine",
          steps: result.etapes,
          results_count: inserted.length,
          updated_at: new Date().toISOString(),
        })
        .eq("id", search.id);

      await completeCredits(supabase, tx, result.rapport);

      return {
        searchId: search.id as string,
        rapport: result.rapport,
        etapes: result.etapes,
        prospects: visibles,
        inserted: inserted.length,
        enrichis: enriched,
        deja_engages: ignores,
        doublons: result.prospects.length - fresh.length,
        credits_used: tx ? Math.abs(tx.amount) : 0,
        credits_left: tx ? tx.balance_after : null,
      };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Échec de la recherche de prospects";
      await refundCredits(supabase, tx, message);
      await supabase.from("prospect_searches").update({ status: "echec" }).eq("id", search.id);
      throw new Error(message);
    }
  });
