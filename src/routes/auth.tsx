import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSession } from "@/lib/db";
import { lovable } from "@/integrations/lovable/index";
import { PasswordInput } from "@/components/password-input";

const TITLE = "Connexion — Kobyde";
const DESC = "Connectez-vous à Kobyde et retrouvez vos 10 agents IA d'entreprise.";

export const Route = createFileRoute("/auth")({
  validateSearch: z.object({ mode: z.enum(["login", "signup"]).optional() }),
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { mode } = Route.useSearch();
  const [isSignup, setIsSignup] = useState(mode === "signup");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [forgotPassword, setForgotPassword] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const navigate = useNavigate();
  const { session } = useSession();

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("organizations:current_org_id(onboarding_completed)")
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (cancelled) return;
      const done = (data?.organizations as { onboarding_completed?: boolean } | null)?.onboarding_completed;
      navigate({ to: done ? "/eric" : "/bienvenue", replace: true });
    })();
    return () => {
      cancelled = true;
    };
  }, [session, navigate]);


  const onGoogle = async () => {
    setGoogleLoading(true);
    try {
      window.sessionStorage.setItem("kobyde:auth-redirect", "1");
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error("Connexion Google impossible pour le moment.");
        return;
      }
      if (result.redirected) return;
    } catch {
      toast.error("Connexion Google impossible pour le moment.");
    } finally {
      setGoogleLoading(false);
    }
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email"));
    const password = String(fd.get("password"));
    setLoading(true);
    try {
      if (forgotPassword) {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setResetSent(true);
        return;
      }
      if (isSignup) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: {
              full_name: String(fd.get("full_name") ?? ""),
              company_name: String(fd.get("company_name") ?? ""),
            },
          },
        });
        if (error) throw error;
        toast.success("Bienvenue ! Votre équipe de 10 agents IA est prête.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="aurora-bg flex min-h-screen items-center justify-center px-5 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2">
          <span className="grid size-9 place-items-center rounded-xl bg-primary font-display text-lg text-primary-foreground">
            K
          </span>
          <span className="font-display text-xl">Kobyde</span>
        </Link>
        <div className="surface p-7">
          <h1 className="text-2xl">{forgotPassword ? "Mot de passe oublié" : isSignup ? "Créer mon équipe IA" : "Bon retour parmi nous"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {forgotPassword ? "Recevez un lien pour choisir un nouveau mot de passe." : isSignup
              ? "2 minutes suffisent. Vos 10 agents seront prêts juste après."
              : "Connectez-vous pour retrouver votre tableau de bord."}
          </p>
          {!forgotPassword && <><Button
            type="button"
            variant="outline"
            className="mt-6 w-full gap-2"
            onClick={onGoogle}
            disabled={googleLoading}
          >
            <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
              <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.7v3h3.9c2.3-2.1 3.5-5.2 3.5-8.9Z" />
              <path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1A12 12 0 0 0 12 24Z" />
              <path fill="#FBBC05" d="M5.4 14.4a7.2 7.2 0 0 1 0-4.6V6.7H1.4a12 12 0 0 0 0 10.8l4-3.1Z" />
              <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.5 1.8l3.4-3.4A12 12 0 0 0 1.4 6.7l4 3.1C6.3 6.9 8.9 4.8 12 4.8Z" />
            </svg>
            {googleLoading ? "Un instant…" : "Continuer avec Google"}
          </Button>
          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            ou par email
            <span className="h-px flex-1 bg-border" />
          </div>
          </>}
          {resetSent ? <p role="status" className="my-5 text-sm">Si un compte existe avec cette adresse, vous recevrez un lien de réinitialisation. Vérifiez aussi vos courriers indésirables.</p> :
          <form onSubmit={onSubmit} className="space-y-4">
            {isSignup && !forgotPassword && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="full_name">Votre prénom et nom</Label>
                  <Input id="full_name" name="full_name" placeholder="Marie Dupont" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="company_name">Nom de votre entreprise</Label>
                  <Input id="company_name" name="company_name" placeholder="Dupont & Fils" required />
                </div>
              </>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" placeholder="vous@entreprise.fr" required />
            </div>
            {!forgotPassword && <div className="space-y-1.5">
              <Label htmlFor="password">Mot de passe</Label>
              <PasswordInput id="password" name="password" autoComplete={isSignup ? "new-password" : "current-password"} minLength={6} required />
            </div>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Un instant…" : forgotPassword ? "Envoyer le lien de réinitialisation" : isSignup ? "Créer mon compte" : "Se connecter"}
            </Button>
          </form>}
          {!isSignup && !forgotPassword && <Button type="button" variant="link" className="mt-2 w-full" onClick={() => { setForgotPassword(true); setResetSent(false); }}>Mot de passe oublié ?</Button>}
          <Button type="button" variant="link"
            className="mt-5 w-full text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
            onClick={() => { if (forgotPassword) { setForgotPassword(false); setResetSent(false); } else setIsSignup((v) => !v); }}
          >
            {forgotPassword ? "Retour à la connexion" : isSignup ? "J'ai déjà un compte — me connecter" : "Je n'ai pas encore de compte — m'inscrire"}
          </Button>
        </div>
      </div>
    </div>
  );
}
