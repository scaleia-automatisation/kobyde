import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PasswordInput } from "@/components/password-input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [
    { title: "Nouveau mot de passe — Kobyde" },
    { name: "description", content: "Réinitialisez votre mot de passe Kobyde en toute sécurité." },
    { property: "og:title", content: "Nouveau mot de passe — Kobyde" },
    { property: "og:description", content: "Choisissez un nouveau mot de passe pour votre compte Kobyde." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    const recoveryHash = new URLSearchParams(window.location.hash.slice(1)).get("type") === "recovery";
    const checkRecovery = async () => {
      const { data, error: authError } = await supabase.auth.getUser();
      if (active) { setReady(Boolean(data.user) && !authError); setChecking(false); }
    };
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        window.sessionStorage.setItem("kobyde:password-recovery", "1");
        // Avoid calling Auth methods inside the synchronous Auth callback.
        setTimeout(() => { if (active) void checkRecovery(); }, 0);
      }
    });
    if (recoveryHash || window.sessionStorage.getItem("kobyde:password-recovery") === "1") {
      void checkRecovery();
    } else {
      setChecking(false);
    }
    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!ready) return;
    const values = new FormData(event.currentTarget);
    const password = String(values.get("password") ?? "");
    if (password !== values.get("confirm")) { setError("Les deux mots de passe doivent être identiques."); return; }
    setSaving(true); setError("");
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      window.sessionStorage.removeItem("kobyde:password-recovery");
      await supabase.auth.signOut();
      setDone(true);
    } catch { setError("Le mot de passe n’a pas pu être modifié. Réessayez ou demandez un nouveau lien."); }
    finally { setSaving(false); }
  };
  return <main className="aurora-bg flex min-h-screen items-center justify-center px-5 py-12">
    <div className="w-full max-w-md">
      <Link to="/" className="mb-6 block text-center font-display text-xl">Kobyde</Link>
      <section className="surface p-7">
        <h1 className="text-2xl">Nouveau mot de passe</h1>
        {checking ? <p role="status" className="mt-4">Vérification du lien…</p> : done ?
          <><p role="status" className="mt-4">Votre mot de passe a été modifié.</p><Link to="/auth" className="mt-5 block text-primary underline">Se connecter</Link></> : !ready ?
          <><p role="alert" className="mt-4">Ce lien est invalide ou a expiré. Demandez un nouveau lien depuis la page de connexion.</p><Link to="/auth" className="mt-5 block text-primary underline">Retour à la connexion</Link></> :
          <form className="mt-5 space-y-4" onSubmit={submit}>
            <div className="space-y-1.5"><Label htmlFor="password">Nouveau mot de passe</Label><PasswordInput id="password" name="password" minLength={6} autoComplete="new-password" required /></div>
            <div className="space-y-1.5"><Label htmlFor="confirm">Confirmer le mot de passe</Label><PasswordInput id="confirm" name="confirm" minLength={6} autoComplete="new-password" required /></div>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={saving}>{saving ? "Enregistrement…" : "Enregistrer le nouveau mot de passe"}</Button>
          </form>}
      </section>
    </div>
  </main>;
}