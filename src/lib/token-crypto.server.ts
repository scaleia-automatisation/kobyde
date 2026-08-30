/**
 * Chiffrement des jetons OAuth utilisateur (AES-GCM), serveur uniquement.
 * Les jetons ne sont jamais renvoyés au frontend ; ils sont aussi chiffrés au repos.
 * Les valeurs déjà stockées en clair restent lisibles (migration transparente).
 */

const PREFIX = "encv1:";

let cachedKey: CryptoKey | null | undefined;

async function cryptoKey(): Promise<CryptoKey | null> {
  if (cachedKey !== undefined) return cachedKey;
  const raw =
    process.env["ORG_CONNECTOR_ENCRYPTION_KEY"] ??
    process.env["APP_USER_CONNECTION_KEY_SECRET"] ??
    process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!raw) {
    cachedKey = null;
    return null;
  }
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  cachedKey = await crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
  return cachedKey;
}

const toB64 = (bytes: Uint8Array) => {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
};
const fromB64 = (v: string) => Uint8Array.from(atob(v), (c) => c.charCodeAt(0));

/** Chiffre un jeton avant stockage. Retourne la valeur telle quelle si le chiffrement est indisponible. */
export async function encryptToken(value?: string | null): Promise<string | null> {
  if (!value) return value ?? null;
  if (value.startsWith(PREFIX)) return value;
  const key = await cryptoKey();
  if (!key) return value;
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(value)),
  );
  const out = new Uint8Array(iv.length + ct.length);
  out.set(iv);
  out.set(ct, iv.length);
  return PREFIX + toB64(out);
}

/** Déchiffre un jeton stocké (accepte les anciennes valeurs en clair). */
export async function decryptToken(stored?: string | null): Promise<string | null> {
  if (!stored) return null;
  if (!stored.startsWith(PREFIX)) return stored;
  const key = await cryptoKey();
  if (!key) return null;
  try {
    const buf = fromB64(stored.slice(PREFIX.length));
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: buf.subarray(0, 12) },
      key,
      buf.subarray(12),
    );
    return new TextDecoder().decode(plain);
  } catch {
    return null;
  }
}

/** Déchiffre les jetons d'une ligne `oauth_connections`. */
export async function decryptConnectionRow<T extends { access_token?: string | null; refresh_token?: string | null }>(
  row: T | null,
): Promise<T | null> {
  if (!row) return row;
  return {
    ...row,
    access_token: await decryptToken(row.access_token ?? null),
    refresh_token: await decryptToken(row.refresh_token ?? null),
  };
}
