import test from 'node:test';
import assert from 'node:assert/strict';
import { isWebhookConfigured, verifySquareSignature } from '@/server/square/webhookVerify';

/**
 * A missing webhook setting must be a clean "no", never a crash — a crash
 * turned every Square delivery into a 500 with nothing recorded.
 */
test('unconfigured webhook rejects cleanly instead of throwing', async () => {
  const saved = { ...process.env };
  delete process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
  delete process.env.SQUARE_WEBHOOK_NOTIFICATION_URL;
  try {
    assert.equal(isWebhookConfigured(), false);
    assert.equal(await verifySquareSignature('{}', 'sig'), false);
  } finally {
    process.env = saved;
  }
});

test('a wrong signature is rejected', async () => {
  const saved = { ...process.env };
  process.env.SQUARE_WEBHOOK_SIGNATURE_KEY = 'unit-key';
  process.env.SQUARE_WEBHOOK_NOTIFICATION_URL = 'https://www.easybeanscoffee.com/api/webhooks/square';
  try {
    assert.equal(isWebhookConfigured(), true);
    assert.equal(await verifySquareSignature('{"event_id":"x"}', 'not-the-signature'), false);
  } finally {
    process.env = saved;
  }
});
