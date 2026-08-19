/* eslint-disable @typescript-eslint/no-explicit-any */
import { RGPD_NOTICE } from "./hr";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

/** Charge une invitation d'entretien à partir de son lien secret (aucun compte requis). */
export async function loadInvite(token: string) {
  const db = await admin();
  const { data: invite } = await db
    .from("hr_interview_invites")
    .select("id,org_id,candidate_id,interview_id,slots,status,chosen_slot,proposal,message")
    .eq("token", token)
    .maybeSingle();
  if (!invite) throw new Error("Lien invalide ou expiré.");

  const [{ data: candidate }, { data: org }] = await Promise.all([
    db.from("candidates").select("first_name,full_name,job_offer_id").eq("id", invite.candidate_id).maybeSingle(),
    db.from("organizations").select("name,logo_url,email,phone").eq("id", invite.org_id).maybeSingle(),
  ]);

  let poste = "";
  if (candidate?.job_offer_id) {
    const { data: offer } = await db.from("job_offers").select("title").eq("id", candidate.job_offer_id).maybeSingle();
    poste = offer?.title ?? "";
  }

  return {
    invite: {
      slots: Array.isArray(invite.slots) ? invite.slots : [],
      status: invite.status,
      chosen_slot: invite.chosen_slot,
      message: invite.message ?? "",
    },
    prenom: candidate?.first_name || candidate?.full_name || "",
    entreprise: { nom: org?.name ?? "", logo: org?.logo_url ?? "", email: org?.email ?? "", tel: org?.phone ?? "" },
    poste,
    rgpd: RGPD_NOTICE,
  };
}

/** Enregistre la réponse du candidat : créneau choisi, autre date, ou retrait. */
export async function respondInvite(args: {
  token: string;
  action: "choisir" | "autre" | "refus";
  slot: string;
  proposal: string;
}) {
  const db = await admin();
  const { data: invite } = await db
    .from("hr_interview_invites")
    .select("id,org_id,candidate_id,interview_id,slots,status")
    .eq("token", args.token)
    .maybeSingle();
  if (!invite) throw new Error("Lien invalide ou expiré.");

  const now = new Date().toISOString();
  const patch: Record<string, unknown> = { responded_at: now };

  if (args.action === "choisir") {
    const slots: string[] = Array.isArray(invite.slots) ? invite.slots : [];
    if (!slots.includes(args.slot)) throw new Error("Ce créneau n'est pas proposé.");
    patch["status"] = "choisi";
    patch["chosen_slot"] = args.slot;
    if (invite.interview_id) {
      await db
        .from("hr_interviews")
        .update({ scheduled_at: args.slot, status: "planifie" })
        .eq("id", invite.interview_id);
    }
  } else if (args.action === "autre") {
    if (!args.proposal.trim()) throw new Error("Indiquez vos disponibilités.");
    patch["status"] = "autre";
    patch["proposal"] = args.proposal.slice(0, 600);
  } else {
    patch["status"] = "refuse";
    if (invite.interview_id) await db.from("hr_interviews").update({ status: "annule" }).eq("id", invite.interview_id);
    await db.from("candidates").update({ status: "retire" }).eq("id", invite.candidate_id);
  }

  await db.from("hr_interview_invites").update(patch).eq("id", invite.id);
  await db.from("hr_audit_log").insert({
    org_id: invite.org_id,
    candidate_id: invite.candidate_id,
    action: `reponse_candidat_${args.action}`,
    detail: args.action === "choisir" ? args.slot : args.proposal.slice(0, 200),
  });

  return { status: patch["status"] as string };
}
