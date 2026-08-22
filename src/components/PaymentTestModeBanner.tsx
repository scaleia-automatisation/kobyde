const clientToken = import.meta.env['VITE_PAYMENTS_CLIENT_TOKEN'];

export function PaymentTestModeBanner() {
  if (!clientToken) {
    return (
      <div className="w-full border-b border-destructive/30 bg-destructive/10 px-4 py-2 text-center text-sm text-destructive">
        Le paiement en production n'est pas encore configuré. Finalisez la mise en ligne Stripe dans l'onglet Paiements pour accepter de vrais paiements.
      </div>
    );
  }
  if (clientToken.startsWith('pk_test_')) {
    return (
      <div className="w-full border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-center text-sm text-amber-700 dark:text-amber-400">
        Les paiements affichés sont en mode test. Aucun prélèvement réel n'aura lieu.
      </div>
    );
  }
  return null;
}
