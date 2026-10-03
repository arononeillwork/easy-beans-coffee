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
  if (!signatureHeader) return false;
  const env = getWebhookEnv();
  try {
    return await WebhooksHelper.verifySignature({
      requestBody: rawBody,
      signatureHeader,
      signatureKey: env.signatureKey,
      notificationUrl: env.notificationUrl,
    });
  } catch {
    return false;
  }
}
