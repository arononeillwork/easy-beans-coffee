import test from 'node:test';
import assert from 'node:assert/strict';
import { code128Bars, code128Encodable, code128Modules } from '@/shared/lib/code128';

/**
 * The coffee club member's barcode (src/shared/lib/code128.ts). What must hold:
 * the modules are Code 128 B as scanners read it (start B, the characters, the
 * checksum, stop), checked against JsBarcode's encoder for this code when it was
 * written, and only printable ASCII is drawn.
 *
 * Run with `npm run test:unit`.
 */

test('a member code is Code 128 B: start, characters, checksum, stop', () => {
  assert.equal(
    code128Modules('7Q2K9XMB'),
    '110100100001110110111011010001110110011100101011000111011100101100111000101101011101100010001011000111011010001100011101011',
  );
  // 11 modules a symbol, 13 for the stop: start + 8 characters + checksum + stop.
  assert.equal(code128Modules('7Q2K9XMB').length, 11 * 10 + 13);
  assert.ok(code128Modules('A').startsWith('11010010000')); // start B
  assert.ok(code128Modules('A').endsWith('1100011101011')); // stop
});

test('the bars are the runs of dark modules, for drawing', () => {
  const modules = code128Modules('7Q2K9XMB');
  const bars = code128Bars('7Q2K9XMB');
  const redrawn = Array.from({ length: modules.length }, () => '0');
  for (const [x, w] of bars) for (let i = x; i < x + w; i++) redrawn[i] = '1';
  assert.equal(redrawn.join(''), modules);
  assert.deepEqual(bars[0], [0, 2]);
});

test('only printable ASCII is drawn', () => {
  assert.ok(code128Encodable('7Q2K9XMB'));
  assert.ok(!code128Encodable(''));
  assert.ok(!code128Encodable('café'));
  assert.throws(() => code128Modules('café'));
});
