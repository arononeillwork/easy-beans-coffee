import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import type { SiteSnapshot } from './siteSnapshot';

/**
 * Writes an example website as one self-contained HTML file. Two starts:
 * a redesign of an existing site (its snapshot is the content to keep), or a
 * new site from a short brief. Regenerating either sends the same brief again,
 * with the previous draft and the owner's notes when they asked for changes.
 */

export const WEBSITE_MODEL = 'claude-opus-5-5';

export interface NewSiteBrief {
  businessName: string;
  businessType: string;
  location: string;
  description: string;
  style: string;
  contact: string;
}

export interface RedesignBrief {
  url: string;
  goals: string;
  style: string;
}

export type GenerationInput =
  | { mode: 'new'; brief: NewSiteBrief }
  | { mode: 'redesign'; brief: RedesignBrief; snapshot: SiteSnapshot };

export interface Revision {
  previousHtml: string;
  feedback: string;
}

export class GenerationError extends Error {}

// Frozen, so repeat generations share a cached prefix.
const SYSTEM = `You are a senior web designer producing an example website for a small business owner to preview before they buy the build-out.

Return exactly one complete HTML document, starting with <!doctype html> and ending with </html>, and nothing else: no commentary, no Markdown fences.

Requirements for the document:
- Self-contained: all CSS in one <style> element. No JavaScript at all — the preview runs with scripts disabled, so anything interactive must work with HTML and CSS alone (for example <details> for a menu or FAQ).
- Fonts only from Google Fonts via <link>. No other external CSS.
- Images: use only image URLs you were given. Where none fit, use CSS (gradients, shapes, colour blocks) or tasteful inline SVG — never invent image URLs or use placeholder services.
- Responsive and comfortable from a 360px phone up to a wide desktop, with no horizontal scrolling.
- Accessible: semantic landmarks, one <h1>, sufficient colour contrast, alt text on every image, visible focus styles.
- Real, specific copy in the business's own voice, in the language of the content you were given (default to English for a new site unless the brief is written in another language). Never use lorem ipsum. Do not invent prices, awards, reviews, or contact details; where the brief lacks them, leave a clearly marked placeholder such as "[phone number]".
- A distinctive visual direction that fits the business — not a generic template. Typical sections: hero, what they offer, about, visit/contact, footer; adapt to the business.`;

function describeInput(input: GenerationInput): string {
  if (input.mode === 'new') {
    const b = input.brief;
    return [
      'Create a brand-new website for a business that does not have one yet.',
      `Business name: ${b.businessName}`,
      `What kind of business: ${b.businessType}`,
      `Location: ${b.location || '(not given)'}`,
      `About the business: ${b.description}`,
      `Look and feel they want: ${b.style || '(designer’s choice)'}`,
      `Contact details to show: ${b.contact || '(none given — use placeholders)'}`,
    ].join('\n');
  }

  const { brief, snapshot } = input;
  return [
    'Redesign this existing website. Keep its real content — business name, offer, facts, contact details and the useful pages its navigation points to — and give it a fresh, better design and clearer structure. You may tighten the wording, but do not change facts.',
    `Site address: ${snapshot.url}`,
    `What the owner wants from the redesign: ${brief.goals || '(not given — make it clearer, more modern and easier to act on)'}`,
    `Look and feel they want: ${brief.style || '(designer’s choice, informed by the current brand)'}`,
    '',
    'Content read from the current site (JSON):',
    JSON.stringify(snapshot, null, 1),
  ].join('\n');
}

function extractHtml(text: string): string | null {
  const start = text.search(/<!doctype html/i);
  const end = text.toLowerCase().lastIndexOf('</html>');
  if (start === -1 || end === -1 || end < start) return null;
  return text.slice(start, end + '</html>'.length);
}

let client: Anthropic | null = null;

export async function generateWebsite(input: GenerationInput, revision?: Revision): Promise<string> {
  client ??= new Anthropic();

  const content: string[] = [describeInput(input)];
  if (revision?.feedback) {
    content.push(
      'Here is the previous draft. Keep what works and apply the owner’s requested changes:',
      revision.feedback,
      '',
      'Previous draft:',
      revision.previousHtml,
    );
  } else if (revision) {
    content.push('The owner asked for a different take: produce a clearly different design direction from any earlier draft.');
  }

  let message;
  try {
    // Streamed: a whole site is a long answer, and streaming keeps the request
    // clear of HTTP timeouts. Refusal fallbacks are on, so a classifier false
    // positive is retried on another model rather than failing the draft.
    message = await client.beta.messages
      .stream({
        model: WEBSITE_MODEL,
        max_tokens: 64_000,
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        output_config: { effort: 'medium' },
        system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
        messages: [{ role: 'user', content: content.join('\n') }],
      })
      .finalMessage();
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) throw new GenerationError('The Claude API key was rejected. Check ANTHROPIC_API_KEY.');
    if (err instanceof Anthropic.RateLimitError) throw new GenerationError('Claude is busy right now. Try again in a minute.');
    if (err instanceof Anthropic.APIError) throw new GenerationError(`Claude API error ${err.status ?? ''}: ${err.message}`);
    throw err;
  }

  if (message.stop_reason === 'refusal') throw new GenerationError('Claude declined to generate this site. Try rewording the brief.');
  if (message.stop_reason === 'max_tokens') throw new GenerationError('The draft came out too long and was cut off. Try again.');

  const text = message.content.map((block) => (block.type === 'text' ? block.text : '')).join('');
  const html = extractHtml(text);
  if (!html) throw new GenerationError('Claude did not return a complete web page. Try again.');
  return html;
}
