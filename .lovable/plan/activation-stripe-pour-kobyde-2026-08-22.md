# Activation Stripe pour Kobyde

## Objectif
Passer Kobyde du système de crédits/plans interne à un paiement Stripe intégré Lovable (test immédiat, go-live dans l'onglet Payments).

## Ce qui existe déjà
- Plans internes : Starter 49 €, Business 79 €, Pro 149 € (mensuels).
- Packs de crédits : 50/100/150/200 crédits (15/30/45/60 €) à la carte.
- Table `public.subscriptions` existante (scope `org_id`).
- Webhook Stripe custom legacy (`/api/public/stripe/webhook`) et portail de paiement `payer/$token`.

## Plan technique

### 1. Catalogue Stripe
Créer via `batch_create_product` :
- 3 abonnements mensuels (Starter, Business, Pro) avec tax code SaaS.
- 4 packs de crédits one-time avec tax code digital goods.

### 2. Infrastructure code
- Installer `stripe`, `@stripe/stripe-js`, `@stripe/react-stripe-js`.
- Créer `src/lib/stripe.server.ts` (utilitaire gateway `createStripeClient`).
- Créer `src/lib/stripe.ts` (client navigateur `getStripe`, détection env).
- Créer le handler webhook obligatoire `src/routes/api/public/payments/webhook.ts`.
- Adapter la migration `subscriptions` si besoin (ajouter colonnes manquantes : `price_id`, `product_id`, `user_id`, `environment`, `cancel_at_period_end`).

### 3. Checkout
- Créer `src/lib/payments.functions.ts` (si pas existant) avec `createCheckoutSession` utilisant `managed_payments: { enabled: true }` pour la France (éligible).
- Créer `src/components/StripeEmbeddedCheckout.tsx`.
- Créer `src/hooks/useStripeCheckout.tsx`.
- Remplacer les boutons "Choisir" / "Acheter" de la page `/formules` par un checkout Stripe intégré.

### 4. Test et validation
- Vérifier le build.
- Vérifier que le webhook répond correctement.
- S'assurer qu'aucun conflit n'existe avec l'ancien webhook legacy.

## Sortie attendue
Les utilisateurs peuvent souscrire aux plans Kobyde et acheter des crédits via Stripe en mode test, et le statut de leur abonnement est synchronisé dans la base.
