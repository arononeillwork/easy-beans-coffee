import 'server-only';
import { WebhooksHelper } from 'square';
import { getWebhookEnv } from '../env';

/**
 * Verifies Square's HMAC webhook signature. The signature covers the exact
 * notification URL string configured in Square plus the raw request body —
 * never a re-serialized JSON body.
 */
export async function verifySquareSignature(
  rawBody: string,
  signatureHeader: string | null,
): Promise<boolean> {
  if (!signatureHeader) {
    console.warn('[webhook] rejected: no signature header');
    return false;
  }
  // Missing or malformed settings used to throw here and turn every delivery
  // into a 500 with nothing recorded; now it is a logged, clean rejection.
  if (!isWebhookConfigured()) {
    console.warn('[webhook] rejected: SQUARE_WEBHOOK_SIGNATURE_KEY / SQUARE_WEBHOOK_NOTIFICATION_URL not set');
    return false;
  }
  try {
    const env = getWebhookEnv();
    const ok = await WebhooksHelper.verifySignature({
      requestBody: rawBody,
      signatureHeader,
      signatureKey: env.signatureKey,
      notificationUrl: env.notificationUrl,
    });
    if (!ok) {
      console.warn('[webhook] rejected: signature mismatch — check the signature key, and that the notification URL matches Square exactly');
    }
    return ok;
  } catch (err) {
    console.warn('[webhook] rejected: verification error', (err as Error).message);
    return false;
  }
}

/** Both settings present and the URL parses — says nothing about whether they are right. */
export function isWebhookConfigured(): boolean {
  try {
    getWebhookEnv();
    return true;
  } catch {
    return false;
  }
}
