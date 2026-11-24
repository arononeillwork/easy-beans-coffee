/**
 * Code 128 (code set B), for the coffee club member's barcode on their account
 * page: the till's barcode scanners all read it, and code set B covers the
 * member code's letters and digits. Pure, so the server or the browser can draw
 * it as an SVG with nothing to load.
 *
 * A symbol is: start B, one symbol per character, the checksum (start value
 * plus each value times its position, modulo 103), and stop. Each symbol is 11
 * modules, the stop 13: '1' a bar module, '0' a space. Draw it with a quiet
 * zone of at least 10 modules each side.
 */

/** The 107 symbols of Code 128 (ISO/IEC 15417), by value; 106 is the stop. */
const SYMBOLS = [
  '11011001100', '11001101100', '11001100110', '10010011000', '10010001100', '10001001100', '10011001000', '10011000100',
  '10001100100', '11001001000', '11001000100', '11000100100', '10110011100', '10011011100', '10011001110', '10111001100',
  '10011101100', '10011100110', '11001110010', '11001011100', '11001001110', '11011100100', '11001110100', '11101101110',
  '11101001100', '11100101100', '11100100110', '11101100100', '11100110100', '11100110010', '11011011000', '11011000110',
  '11000110110', '10100011000', '10001011000', '10001000110', '10110001000', '10001101000', '10001100010', '11010001000',
  '11000101000', '11000100010', '10110111000', '10110001110', '10001101110', '10111011000', '10111000110', '10001110110',
  '11101110110', '11010001110', '11000101110', '11011101000', '11011100010', '11011101110', '11101011000', '11101000110',
  '11100010110', '11101101000', '11101100010', '11100011010', '11101111010', '11001000010', '11110001010', '10100110000',
  '10100001100', '10010110000', '10010000110', '10000101100', '10000100110', '10110010000', '10110000100', '10011010000',
  '10011000010', '10000110100', '10000110010', '11000010010', '11001010000', '11110111010', '11000010100', '10001111010',
  '10100111100', '10010111100', '10010011110', '10111100100', '10011110100', '10011110010', '11110100100', '11110010100',
  '11110010010', '11011011110', '11011110110', '11110110110', '10101111000', '10100011110', '10001011110', '10111101000',
  '10111100010', '11110101000', '11110100010', '10111011110', '10111101110', '11101011110', '11110101110', '11010000100',
  '11010010000', '11010011100', '1100011101011',
] as const;

const START_B = 104;
const STOP = 106;

/** Whether code set B can carry the text: printable ASCII only, at least one character. */
export const code128Encodable = (text: string) => text.length > 0 && /^[\x20-\x7e]+$/.test(text);

/** The symbol's modules, '1' bar and '0' space, without the quiet zones. Throws for text code set B can't carry. */
export function code128Modules(text: string): string {
  if (!code128Encodable(text)) throw new Error('Code 128 B carries printable ASCII only');
  const values = [...text].map((ch) => ch.charCodeAt(0) - 32);
  const checksum = values.reduce((sum, v, i) => sum + v * (i + 1), START_B) % 103;
  return [START_B, ...values, checksum, STOP].map((v) => SYMBOLS[v]).join('');
}

/** The bars as [start, width] runs of modules, for drawing. */
export function code128Bars(text: string): Array<[number, number]> {
  const modules = code128Modules(text);
  const bars: Array<[number, number]> = [];
  for (let i = 0; i < modules.length; i++) {
    if (modules[i] !== '1') continue;
    let end = i;
    while (modules[end + 1] === '1') end++;
    bars.push([i, end - i + 1]);
    i = end;
  }
  return bars;
}
