# Kobyde AI Team

BLOC 19 — TECHNIQUE, BACKEND ET SÉCURITÉ

Utiliser une architecture moderne et scalable.

Stack recommandée

Frontend

 React ;

 TypeScript ;

 Tailwind CSS ;

 composants UI cohérents ;

 responsive.

Backend

 Supabase ;

 PostgreSQL ;

 Auth ;

 Storage ;

 Edge Functions ;

 Realtime.

Paiements

Stripe.

Emails

Resend ou service email équivalent.

IA

Architecture permettant de connecter plusieurs modèles.

Gemini notamment pour :

 recherche ;

 Grounding ;

 analyse web.

API

Architecture API-first.

Préparer :

 web app ;

 mobile futur ;

 API ;

 intégrations.

Base de données

Tables principales :

 users ;

 organizations ;

 memberships ;

 roles ;

 agents ;

 agent_tasks ;

 conversations ;

 memories ;

 products ;

 services ;

 categories ;

 prospects ;

 leads ;

 clients ;

 opportunities ;

 quotes ;

 quote_versions ;

 quote_items ;

 payments ;

 payment_schedules ;

 invoices ;

 projects ;

 project_steps ;

 tasks ;

 documents ;

 emails ;

 email_sequences ;

 email_events ;

 campaigns ;

 meetings ;

 candidates ;

 job_offers ;

 interviews ;

 evaluations ;

 competitors ;

 competitor_analyses ;

 monitoring ;

 reputation_mentions ;

 analytics_events ;

 subscriptions ;

 credit_transactions ;

 notifications ;

 audit_logs.

Isolation des données

Chaque entreprise doit être isolée.

Utiliser des politiques de sécurité au niveau base de données.

Un utilisateur ne doit jamais pouvoir accéder aux données d'une autre entreprise.

Secrets

Toutes les clés :

 Gemini ;

 Stripe ;

 Resend ;

 Apify ;

 PhantomBuster ;

 Google ;

doivent être stockées côté serveur dans des secrets/env variables.

Jamais dans le frontend.

Stripe webhook

Créer une fonction sécurisée :

/stripe/webhook

Elle doit :

 vérifier la signature ;

 identifier l'événement ;

 empêcher les doublons ;

 mettre à jour le paiement ;

 mettre à jour la facture ;

 mettre à jour le client ;

 déclencher les workflows concernés ;

 créer les notifications. Construis un SaaS complet nommé Kobyde , premium, professionnel, responsive et production-ready permettant à une entreprise de piloter son activité avec une équipe de 10 agents IA spécialisés, coordonnés par un agent principal.

L’application doit être extrêmement simple à comprendre : un jeune de 15 ans doit pouvoir comprendre quoi faire, et un chef d’entreprise de 70 ans doit pouvoir l’utiliser sans formation technique.

Ne demande pas de précisions si une décision peut être prise à partir de ce cahier des charges. Utilise les règles ci-dessous comme spécification fonctionnelle de référence.

Principe stratégique : 20/80. Ne pas multiplier les fonctionnalités inutiles. Chaque fonctionnalité doit avoir une utilité business claire : vendre, trouver des clients, servir les clients, produire, encaisser, gérer, analyser ou gagner du temps.





BLOC 1 — ARCHITECTURE ET DESIGN DE L’APP

1.1 Positionnement

Créer un SaaS présenté comme :

10 agents IA au service de votre entreprise, 24h/24 et 7j/7, pour 39 €/mois.

Titre :

Une équipe complète d’agents IA pour votre entreprise, pour moins de 1,30 € par jour.

centré : 

mettre icône représentative  : “ travaille 24H/24 et 7J/7 “

mettre icône représentative : “ ne prends jamais de pauses , ni de congés “

Alternative marketing : “ Zéro arrêts maladies , Zéro charges salariales “ 

L’interface doit donner immédiatement la sensation d’avoir une équipe virtuelle complète, et non simplement accès à un chatbot.





1.2 Design général

Créer une interface :

premium ;

moderne ;

épurée ;

professionnelle ;

très lisible ;

responsive ;

rapide ;

accessible ;

avec beaucoup d’espace ;

sans surcharge visuelle.

Inspirer l’expérience visuelle des SaaS modernes de référence et reprendre le style visuel fourni dans les images de référence de la conversation, notamment :

cartes arrondies ;

dashboard clair ;

hiérarchie forte ;

avatars IA en cartoon ;

illustrations premium ;

micro-interactions ;

boutons modernes ;

navigation simple.

Style des agents

Chaque agent possède :

un prénom ;

une fonction ;

un avatar cartoon cohérent ;

une couleur ;

une description très simple ;

ses tâches ;

ses notifications ;

ses crédits utilisés ;

son historique.

Les avatars doivent conserver exactement le même langage graphique entre eux.





1.3 Navigation principale

Sidebar desktop :

Accueil

Mon équipe IA

Prospects

Clients

Devis

Paiements

Projets

Catalogue

Marketing

RH

Emails

Analytics

Automatisations

Documents

Paramètres

En bas :

crédits ;

notifications ;

aide ;

profil ;

déconnexion.

Sur mobile :

navigation simplifiée ;

menu inférieur avec les actions principales ;

menu secondaire accessible par bouton. , quand tu as finis : teste ce que tu viens d'implémenter pour voir si tout est bien build et que sa marche , si ça ne marche pas auto corrige toi jusqu'à ce que ça marche

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://smart-biz-co.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/1f0f3646-176b-433e-8815-4b26339c0061).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
