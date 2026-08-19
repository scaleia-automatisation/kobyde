import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSession } from "@/lib/db";

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
  const navigate = useNavigate();
  const { session } = useSession();

  useEffect(() => {
    if (session) navigate({ to: "/tableau-de-bord", replace: true });
  }, [session, navigate]);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email"));
    const password = String(fd.get("password"));
    setLoading(true);
    try {
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
        toast.success("Compte créé ! Vérifiez votre email pour confirmer.");
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
    <div className="hero-gradient flex min-h-screen items-center justify-center px-5 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2">
          <span className="grid size-9 place-items-center rounded-xl bg-primary font-display text-lg text-primary-foreground">
            K
          </span>
          <span className="font-display text-xl">Kobyde</span>
        </Link>
        <div className="surface p-7">
          <h1 className="text-2xl">{isSignup ? "Créer mon équipe IA" : "Bon retour parmi nous"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isSignup
              ? "2 minutes suffisent. Vos 10 agents seront prêts juste après."
              : "Connectez-vous pour retrouver votre tableau de bord."}
          </p>
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            {isSignup && (
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
            <div className="space-y-1.5">
              <Label htmlFor="password">Mot de passe</Label>
              <Input id="password" name="password" type="password" minLength={6} required />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Un instant…" : isSignup ? "Créer mon compte" : "Se connecter"}
            </Button>
          </form>
          <button
            className="mt-5 w-full text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
            onClick={() => setIsSignup((v) => !v)}
          >
            {isSignup ? "J'ai déjà un compte — me connecter" : "Je n'ai pas encore de compte — m'inscrire"}
          </button>
        </div>
      </div>
    </div>
  );
}
