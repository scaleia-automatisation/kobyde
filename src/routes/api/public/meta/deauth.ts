import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

/* Meta/Facebook Data Deauthorization Callback
 * https://developers.facebook.com/docs/facebook-login/permissions/overview/#deauth-callback
 */

function base64UrlDecode(input: string): Buffer {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  return Buffer.from(normalized + pad, "base64");
}

function parseSignedRequest(signedRequest: string, secret: string): { user_id: string; issued_at?: number } | null {
  const [encodedSig, encodedPayload] = signedRequest.split(".");
  if (!encodedSig || !encodedPayload) return null;

  const sig = base64UrlDecode(encodedSig);
  const expectedSig = createHmac("sha256", secret).update(encodedPayload).digest();
  if (sig.length !== expectedSig.length || !timingSafeEqual(sig, expectedSig)) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload).toString("utf8")) as {
      user_id?: string;
      issued_at?: number;
      algorithm?: string;
    };
    if (payload.algorithm?.toUpperCase() !== "HMAC-SHA256") return null;
    if (!payload.user_id) return null;
    return { user_id: payload.user_id, issued_at: payload.issued_at };
  } catch {
    return null;
  }
}

export const Route = createFileRoute("/api/public/meta/deauth")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["META_APP_SECRET"];
        if (!secret) {
          console.error("[meta/deauth] META_APP_SECRET missing");
          return new Response("Configuration incomplete", { status: 503 });
        }

        const form = await request.formData();
        const signedRequest = form.get("signed_request");
        if (typeof signedRequest !== "string" || !signedRequest) {
          return new Response("Missing signed_request", { status: 400 });
        }

        const payload = parseSignedRequest(signedRequest, secret);
        if (!payload) {
          return new Response("Invalid signed_request", { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Mark any matching Meta connection as revoked
        const { error } = await supabaseAdmin
          .from("oauth_connections")
          .update({ revoked: true, updated_at: new Date().toISOString() })
          .eq("provider", "meta")
          .eq("provider_user_id", payload.user_id);

        if (error) {
          console.error("[meta/deauth] revoke error", error);
          return new Response("Failed to revoke connection", { status: 500 });
        }

        console.log(`[meta/deauth] revoked connection for meta user ${payload.user_id}`);
        return new Response("ok");
      },
    },
  },
});
