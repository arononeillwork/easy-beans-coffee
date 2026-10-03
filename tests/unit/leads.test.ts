import test from 'node:test';
import assert from 'node:assert/strict';
import { generateOfferCode, normaliseOfferCode } from '@/server/leads/offerCode';
import { matchesAdminToken } from '@/server/leads/adminAuth';

/**
 * The lead list's pure seams. The consent-merge rules live in Postgres
 * (`capture_lead`, migration 0007) and are covered by the launch checklist
 * rather than here — there is no local database in this test run.
 *
 * Run with `npm run test:unit`.
 */

test('offer codes avoid characters people misread', () => {
  const forbidden = /[OI01L5S2]/;
  for (let i = 0; i < 500; i += 1) {
    const body = generateOfferCode().slice(3);
    assert.ok(!forbidden.test(body), `generated an ambiguous code: ${body}`);
  }
});

test('offer codes are prefixed and fixed length', () => {
  const code = generateOfferCode();
  assert.match(code, /^EB-[A-Z0-9]{6}$/);
});

test('offer codes do not repeat in any practical batch', () => {
  const codes = new Set(Array.from({ length: 2000 }, generateOfferCode));
  assert.equal(codes.size, 2000);
});

test('normalise accepts what a customer actually types', () => {
  const stored = 'EB-ABC468';
  for (const typed of ['EB-ABC468', 'eb-abc468', ' EB ABC 468 ', 'ABC468', 'abc468', 'ebabc468']) {
    assert.equal(normaliseOfferCode(typed), stored, `failed on: "${typed}"`);
  }
});

test('admin token comparison rejects wrong values and refuses when unset', () => {
  const original = process.env.ADMIN_LEADS_TOKEN;

  process.env.ADMIN_LEADS_TOKEN = 'correct-horse-battery';
  assert.equal(matchesAdminToken('correct-horse-battery'), true);
  assert.equal(matchesAdminToken('correct-horse-batter'), false, 'prefix must not pass');
  assert.equal(matchesAdminToken('correct-horse-batteryy'), false, 'longer must not pass');
  assert.equal(matchesAdminToken(''), false);

  // Fail closed: no configured token means nothing opens the page.
  delete process.env.ADMIN_LEADS_TOKEN;
  assert.equal(matchesAdminToken(''), false);
  assert.equal(matchesAdminToken('anything'), false);

  process.env.ADMIN_LEADS_TOKEN = original;
});
