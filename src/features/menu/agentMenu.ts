/**
 * What the Business Agent decides about the menu here.
 *
 * The café keeps its menu once, in the Business Agent (its back office), and
 * the agent sends it everywhere: Google Maps, the screens, the printed menus —
 * and this site. So the agent is what says which items are on the menu:
 *
 * - An item taken off the menu in the agent leaves the board, the home page
 *   and the in-café board, the same minute it leaves Google Maps.
 * - An item the agent lists that this site has no copy or photography for
 *   still appears, in the section its category maps to, with the agent's
 *   name and description and the "photo soon" plate, and can be ordered.
 * - Items the site does know keep everything that makes them look right:
 *   the bilingual copy, the photography, the option rails (`drinks.ts`).
 *
 * Square still takes the money, so ordering still needs Square's ids: the
 * agent's items are joined to the Square catalog by Square item id (the agent
 * reads its menu from Square) and then by name. The price shown is the one
 * Square will charge. For Easy Beans that is the agent's price too, because the
 * agent reads its prices from Square; when the two ever differ (the hour before
 * the agent next reads Square) the site shows what the customer will pay and
 * the server logs the difference.
 *
 * Without the agent (not configured, or never reached) nothing here applies
 * and the board is `drinks.ts`, as before.
 *
 * Plain data, no server imports: the studio runs this in the browser too.
 */

import { normalizeName } from '@/features/shop/retail';
import { DRINKS, KNOWN_OPTIONS, SECTIONS } from './drinks';
import { indexPriceBook, type Listing, type PriceBook, type PricedItem } from './priceBook';
import type { Bilingual, Drink, Family, OptionRef, Section, Serve, VariationMap } from './types';

// ── The feed (business-agent: shared/websiteFeed.ts, version 1) ──────────────

export interface AgentMenuItem {
  id: string;
  name: string;
  description: string | null;
  photo_url: string | null;
  featured: boolean;
  /** Tax included; null when not priced yet. */
  price: number | null;
  /** What `price` is for when the item is sold more than one way, e.g. "Hot". */
  price_label: string | null;
  /** The other ways it is sold, each at its whole price. */
  variants: Array<{ name: string; price: number | null }>;
  square_id: string | null;
}

export interface AgentMenuSection {
  name: string | null;
  /** Square's modifier lists (Milk, Syrup…): options on items, not items. */
  extras: boolean;
  items: AgentMenuItem[];
}

export interface AgentMenu {
  version: 1;
  business: { id: number; name: string; currency: string };
  source: 'custom' | 'square';
  generated_at: string;
  sections: AgentMenuSection[];
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const text = (value: unknown) => (typeof value === 'string' ? value : null);
const amount = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : null);

/**
 * The feed, checked: version 1, with every item named. Anything else is null,
 * and the site keeps the menu it already had rather than an empty one.
 */
export function parseAgentMenu(raw: unknown): AgentMenu | null {
  if (!isObject(raw) || raw.version !== 1 || !Array.isArray(raw.sections) || !isObject(raw.business)) return null;
  const sections: AgentMenuSection[] = [];
  for (const section of raw.sections) {
    if (!isObject(section) || !Array.isArray(section.items)) return null;
    const items: AgentMenuItem[] = [];
    for (const item of section.items) {
      if (!isObject(item) || !text(item.name)?.trim()) return null;
      items.push({
        id: text(item.id) ?? text(item.name)!,
        name: text(item.name)!.trim(),
        description: text(item.description),
        photo_url: text(item.photo_url),
        featured: item.featured === true,
        price: amount(item.price),
        price_label: text(item.price_label),
        variants: Array.isArray(item.variants)
          ? item.variants.filter(isObject).flatMap((v) => (text(v.name) ? [{ name: text(v.name)!, price: amount(v.price) }] : []))
          : [],
        square_id: text(item.square_id),
      });
    }
    sections.push({ name: text(section.name), extras: section.extras === true, items });
  }
  return {
    version: 1,
    business: {
      id: amount(raw.business.id) ?? 0,
      name: text(raw.business.name) ?? '',
      currency: text(raw.business.currency) ?? 'EUR',
    },
    source: raw.source === 'square' ? 'square' : 'custom',
    generated_at: text(raw.generated_at) ?? new Date(0).toISOString(),
    sections,
  };
}

// ── Following it ─────────────────────────────────────────────────────────────

const cents = (price: number) => Math.round(price * 100);

/** Where the agent's price and Square's differ, as lines for the server log. */
function disagreementsFor(entry: AgentMenuItem, item: PricedItem): string[] {
  if (entry.price === null) return [];
  const agent = new Map<string, number | null>();
  if (entry.price_label) agent.set(normalizeName(entry.price_label), entry.price);
  for (const variant of entry.variants) agent.set(normalizeName(variant.name), variant.price);
  // One price with no label covers every way Square sells it (sit in and
  // takeaway at the same price, or a lone "Regular").
  const single = !entry.price_label && entry.variants.length === 0;
  return item.variations.flatMap((variation) => {
    const price = single ? entry.price : agent.get(variation.key);
    if (price === null || price === undefined || cents(price) === variation.cents) return [];
    return [`${item.name} (${variation.name}): agent ${price.toFixed(2)}, Square ${(variation.cents / 100).toFixed(2)}`];
  });
}

/**
 * The price book, cut to what the agent lists: Square items the agent does not
 * list are dropped (so their drinks leave the board), the rest carry where they
 * sit on the agent's menu. `listed` keeps the listed names even when Square
 * could not be read, so the board still follows the agent without prices.
 */
export function applyAgentMenu(
  book: PriceBook,
  menu: AgentMenu | null,
): { book: PriceBook; disagreements: string[] } {
  if (!menu) return { book, disagreements: [] };
  const entries = menu.sections
    .filter((section) => !section.extras)
    .flatMap((section) => section.items.map((item) => ({ item, section: section.name })));

  const byId = new Map(book.items.map((item) => [item.id, item]));
  const byKey = indexPriceBook(book);
  const claimed = new Map<string, Listing>();
  const listed = new Set<string>();
  const disagreements: string[] = [];

  entries.forEach(({ item: entry, section }, order) => {
    listed.add(normalizeName(entry.name));
    const item = (entry.square_id ? byId.get(entry.square_id) : undefined) ?? byKey.get(normalizeName(entry.name));
    if (!item || claimed.has(item.id)) return;
    listed.add(item.key);
    claimed.set(item.id, {
      order,
      section,
      name: entry.name,
      description: entry.description?.trim() || null,
      featured: entry.featured,
    });
    disagreements.push(...disagreementsFor(entry, item));
  });

  return {
    book: {
      ...book,
      items: book.items.flatMap((item) => {
        const listing = claimed.get(item.id);
        return listing ? [{ ...item, listing }] : [];
      }),
      listed: [...listed],
    },
    disagreements,
  };
}

// ── The board ────────────────────────────────────────────────────────────────

/** The agent's section names, as this site's sections. Anything else is food. */
const SECTION_OF: Array<[RegExp, Section]> = [
  [/^(classics?|coffees?|cafes?|hot drinks?|bebidas calientes)$/, 'coffee'],
  [/^(speciality|specialty|specials?|especialidad(es)?)$/, 'speciality'],
  [/^(smoothies?|batidos?|juices?|zumos?)$/, 'smoothies'],
  [/^(cold drinks?|soft drinks?|drinks|bebidas( frias)?|refrescos|the fridge|la nevera|alcohol|beers?|cervezas?|wines?|water)$/, 'cold'],
  [/^(bakery|pastr(y|ies)|cakes?|sweet things|bolleria|pasteleria|tartas?|dulces)$/, 'bakery'],
];

function sectionFor(name: string | null): Section {
  const key = normalizeName(name ?? '');
  return SECTION_OF.find(([pattern]) => pattern.test(key))?.[1] ?? 'food';
}

const FAMILY: Record<Section, Family> = {
  coffee: 'coffee',
  speciality: 'chai',
  smoothies: 'fruit',
  cold: 'bottle',
  bakery: 'coffee',
  food: 'fruit',
};

const SERVES: Record<Section, Serve[]> = {
  coffee: ['takeaway', 'sitIn'],
  speciality: ['takeaway', 'sitIn'],
  smoothies: ['takeaway', 'sitIn'],
  cold: ['takeaway'],
  bakery: ['sitIn'],
  food: ['sitIn'],
};

const same = (value: string): Bilingual => ({ en: value, es: value });
const HOT = /^hot$/i;
const ICED = /^iced$/i;
const SIT_IN = /^(sit[ -]?in|eat[ -]?in|para aqui)$/i;
const TAKEAWAY = /^(take[ -]?away|to go|para llevar)$/i;

/** What the item's Square variations mean, read off their names. */
function variationsOf(item: PricedItem): VariationMap {
  const names = item.variations.map((variation) => variation.name);
  const hot = names.find((name) => HOT.test(name));
  const iced = names.find((name) => ICED.test(name));
  if ((hot || iced) && names.every((name) => HOT.test(name) || ICED.test(name))) return { by: 'temp', hot, iced };
  const sitIn = names.find((name) => SIT_IN.test(name));
  const takeaway = names.find((name) => TAKEAWAY.test(name));
  if (sitIn && takeaway && names.length === 2) return { by: 'serve', sitIn, takeaway };
  if (names.length <= 1) return { by: 'none', name: names[0] ?? '' };
  return {
    by: 'pick',
    label: { en: 'Pick one', es: 'Elige uno' },
    picks: names.map((name, index) => ({ id: `${index}-${slug(name)}`, square: name, name: same(name) })),
  };
}

function slug(value: string): string {
  return normalizeName(value).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'item';
}

const KNOWN = new Map(KNOWN_OPTIONS.map((ref) => [normalizeName(ref.square), ref]));

/** An item the site has no copy for, dressed from the agent and Square. */
function drinkFromAgent(item: PricedItem & { listing: Listing }, id: string): Drink {
  const section = sectionFor(item.listing.section);
  const variations = variationsOf(item);
  const blurb = SECTIONS.find((entry) => entry.id === section)?.blurb;
  const options: OptionRef[] = item.groups.map((group) => KNOWN.get(group.key) ?? { square: group.name, label: same(group.name) });
  return {
    id,
    square: item.name,
    section,
    family: FAMILY[section],
    name: same(item.listing.name),
    tagline: blurb ?? same(''),
    description: same(item.listing.description ?? ''),
    variations,
    serves: variations.by === 'serve' ? ['takeaway', 'sitIn'] : SERVES[section],
    options,
    madeToOrder: section !== 'bakery' && section !== 'cold',
  };
}

/**
 * Every entry on the board, in board order: the site's own drinks the agent
 * lists (all of them when the site is not following the agent), then the
 * agent's other items in the agent's order. The studio, the home page board
 * and the in-café board all read this rather than `DRINKS`.
 */
export function boardDrinks(book: PriceBook): Drink[] {
  if (!book.listed) return DRINKS;
  const listed = new Set(book.listed);
  const curated = DRINKS.filter((drink) => listed.has(normalizeName(drink.square)));
  const known = new Set(curated.map((drink) => normalizeName(drink.square)));
  const ids = new Set(DRINKS.map((drink) => drink.id));

  const extra = book.items
    .filter((item): item is PricedItem & { listing: Listing } =>
      Boolean(item.listing) && !known.has(item.key) && item.variations.length > 0,
    )
    .sort((a, b) => a.listing.order - b.listing.order)
    .map((item) => {
      let id = `menu-${slug(item.listing.name)}`;
      for (let n = 2; ids.has(id); n += 1) id = `menu-${slug(item.listing.name)}-${n}`;
      ids.add(id);
      return drinkFromAgent(item, id);
    });

  return [...curated, ...extra];
}
