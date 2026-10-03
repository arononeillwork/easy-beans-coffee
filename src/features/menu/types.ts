/**
 * The shape of the counter menu as the café describes it, independent of the
 * till.
 *
 * Square used to be the single source of truth for the whole menu, photography
 * included. It is a good POS and a poor art director: half the catalog had no
 * photograph, the ones that existed were whatever fitted a 1:1 tile, and every
 * page view paid a round trip to fetch URLs that then had to be re-fetched from
 * Square's CDN. So the menu's *identity* moved here — what we serve, how it is
 * described, how it is photographed, which choices it takes — and Square kept
 * the one thing it is authoritative about: the price. See ./priceBook.
 *
 * The join between the two is the item name, normalized. Rename a drink in
 * Square without renaming it here and the drink shows with its price withheld,
 * which is a visible, harmless failure rather than a silent wrong number.
 */

export type Lang = 'en' | 'es';

/** Copy that exists in both languages the café trades in. */
export interface Bilingual {
  en: string;
  es: string;
}

/** Hot or iced. A drink may offer one, both, or neither (a bottle is neither). */
export type Temp = 'hot' | 'iced';

/**
 * How the drink is handed over. This is the axis the photography is built
 * around — every shot in the Drive library is one drink in one of these three
 * vessels — and it is the choice customers actually make at the counter.
 */
export type Serve = 'sitIn' | 'takeaway' | 'can';

export const SERVES: Serve[] = ['sitIn', 'takeaway', 'can'];
export const TEMPS: Temp[] = ['hot', 'iced'];

/**
 * Colour families. Each one sets the wash behind the stage and the glow behind
 * the cup, so moving along the drinks rail reads as moving through the brand
 * palette rather than through a slideshow. Only the five brand colours appear
 * here — see theme/brand.ts.
 */
export type Family = 'coffee' | 'matcha' | 'ube' | 'chai' | 'chocolate' | 'fruit' | 'leaf' | 'bottle';

/**
 * What a stage can be washed in: any family's tint, plus the one blend the
 * palette allows itself — ube matcha, whose drink is genuinely two colours,
 * gets the lilac wash under the matcha glow.
 */
export type StageHue = Family | 'ubeMatcha';

/** Which half of the board an entry belongs under. */
export type Section = 'coffee' | 'speciality' | 'smoothies' | 'cold' | 'bakery' | 'food';

/** The first choice on the board: what kind of thing you are after. */
export type MenuGroup = 'drinks' | 'food';

/**
 * How this item's Square variations are named, and therefore what the studio's
 * primary switch controls.
 *
 * Square models "the same drink, priced differently" as variations, but it does
 * not say what the axis *means* — "Hot"/"Iced" and "Sit In"/"Takeaway" are both
 * just lists of strings. This is where that meaning is declared, once, per item.
 */
export type VariationMap =
  /** Hot/Iced, priced apart. Serve style is then a free choice on top. */
  | { by: 'temp'; hot?: string; iced?: string }
  /** Sit In/Takeaway are the priced variations; there is no temperature switch. */
  | { by: 'serve'; sitIn: string; takeaway: string; temp?: Temp }
  /** One price, one variation — an espresso is an espresso. */
  | { by: 'none'; name: string; temp?: Temp }
  /** A shelf of things under one Square item, e.g. Soft Drinks. */
  | { by: 'pick'; label: Bilingual; picks: Pick[] };

/** One entry in a `by: 'pick'` shelf: a Square variation with its own artwork. */
export interface Pick {
  id: string;
  /** Square variation name, e.g. "Coca Cola Zero". */
  square: string;
  name: Bilingual;
  /** Art folder for this pick; falls back to the parent item's. */
  art?: string;
}

/**
 * A modifier list to surface, named as Square names it.
 *
 * Order here is the order on screen, which is the order a barista builds the
 * drink in: milk first, then what goes in it, then what goes on top.
 */
export interface OptionRef {
  /** Square MODIFIER_LIST name — the join key, same contract as item names. */
  square: string;
  label: Bilingual;
  /**
   * A list long enough to fold on a phone: the first few rows show and the
   * rest sit behind "show more". Wider screens always show everything.
   */
  longList?: boolean;
  /**
   * On the menu but not yet served: the rail renders with a "coming soon" tag
   * and nothing selectable, and the composer refuses to price or order it even
   * if Square still carries the list.
   */
  comingSoon?: boolean;
}

/**
 * A photographed variant of the drink that a *choice* unlocks.
 *
 * The café shoots its menu the way it sells it: there is no "Caramel Latte" in
 * Square — there is a Latte and a caramel syrup — but there is very much a
 * caramel latte in the Drive library, and it looks nothing like a plain one.
 * This is what makes the studio feel alive: pick caramel and the cup on screen
 * becomes the caramel one. Purely visual; the order is still a latte plus
 * syrup, priced exactly as Square prices it.
 */
export interface FlavourArt {
  /** Square modifier list this listens to, e.g. "Syrup". */
  group: string;
  /** Square modifier name that triggers it, e.g. "Caramel". */
  modifier: string;
  /** Art folder to switch to. */
  art: string;
  /** What the drink is called once this choice is made. */
  name?: Bilingual;
}

export interface Drink {
  /** Stable slug. Also the default art folder and the URL fragment. */
  id: string;
  /** Square ITEM name, verbatim. The join key. */
  square: string;
  section: Section;
  family: Family;
  name: Bilingual;
  /** Three or four words, the way a barista would sell it. */
  tagline: Bilingual;
  description: Bilingual;
  variations: VariationMap;
  /** Serve styles offered, in switch order. Filtered to what has artwork. */
  serves: Serve[];
  options: OptionRef[];
  flavours?: FlavourArt[];
  /** Art folder when it differs from {@link id}. */
  art?: string;
  /**
   * Which brand tint the stage takes, when not the family's own. Presentation
   * only. The Café section is nine coffee-family drinks in a row; on one shared
   * wash, swiping through them reads as nothing changing. Hues are assigned so
   * no two neighbours share a colour and the palette rotates as you go —
   * still one colour at a time, per the brand rules.
   */
  hue?: StageHue;
  /**
   * Made to order at the counter, so the collection buffer applies. False for
   * anything taken off a shelf.
   */
  madeToOrder: boolean;
}

/** A drink plus every choice made about it — what the stage renders. */
export interface DrinkChoice {
  drinkId: string;
  temp: Temp | null;
  serve: Serve;
  /** Square variation id for a `by: 'pick'` shelf, e.g. which soft drink. */
  pickId: string | null;
  /** Chosen modifier ids, per Square modifier-list name. */
  options: Record<string, string[]>;
  quantity: number;
}
