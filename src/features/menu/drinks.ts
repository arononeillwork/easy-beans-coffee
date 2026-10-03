import type { Drink, MenuGroup, OptionRef, Section, Bilingual } from './types';

/**
 * Everything the counter pours, as the café describes it.
 *
 * This file is the menu. Square is consulted for what each line costs and
 * nothing else — see ./priceBook for that split and why it exists.
 *
 * The `square` field on every entry is the item name in the POS, verbatim.
 * Those names are load-bearing: they are how a price finds its drink. Renaming
 * one in Square without renaming it here shows the drink with no price, which
 * is the failure we want (visible, harmless) rather than the one we don't
 * (silently priced as something else).
 */

// ── The option rails, shared ─────────────────────────────────────────────────
//
// Named as Square names the modifier lists. Order is the order a barista builds
// the drink in: the milk it is made with, then what goes in it, then what goes
// on top, then the shot on the side.

const MILK: OptionRef = { square: 'Milk', label: { en: 'Milk', es: 'Leche' } };
const SYRUP: OptionRef = {
  square: 'Syrup',
  label: { en: 'Syrup', es: 'Sirope' },
  longList: true,
};
const PUREE: OptionRef = { square: 'Puree', label: { en: 'Purée', es: 'Puré' } };
// Not yet served at the counter — listed so the menu shows what is coming.
const FOAM: OptionRef = {
  square: 'Cold Foam',
  label: { en: 'Cold foam', es: 'Espuma fría' },
  comingSoon: true,
};
const SHOT: OptionRef = { square: 'Extra Shot', label: { en: 'Extra shot', es: 'Café extra' } };

/** A milk drink: everything, in build order — and the not-yet last. */
const FULL: OptionRef[] = [MILK, SYRUP, PUREE, SHOT, FOAM];
/** A black coffee: no milk list in Square, so no milk rail. */
const BLACK: OptionRef[] = [SYRUP, PUREE, SHOT, FOAM];

// ── Coffee ───────────────────────────────────────────────────────────────────

const COFFEE: Drink[] = [
  {
    id: 'flat-white',
    square: 'Flat White',
    section: 'coffee',
    family: 'coffee',
    name: { en: 'Flat White', es: 'Flat White' },
    tagline: { en: 'Small, strong, silky', es: 'Pequeño, fuerte, sedoso' },
    description: {
      en: 'Two ristretto shots under a thin, glossy layer of steamed milk. The one to order if you want to taste the coffee.',
      es: 'Dos ristrettos bajo una capa fina y brillante de leche vaporizada. El que pides si quieres saborear el café.',
    },
    variations: { by: 'temp', hot: 'Hot', iced: 'Iced' },
    serves: ['sitIn', 'takeaway'],
    options: FULL,
    madeToOrder: true,
  },
  {
    id: 'latte',
    square: 'Latte',
    hue: 'chai',
    section: 'coffee',
    family: 'coffee',
    name: { en: 'Latte', es: 'Latte' },
    tagline: { en: 'Long, mild, comforting', es: 'Largo, suave, reconfortante' },
    description: {
      en: 'Espresso stretched out with steamed milk. The most forgiving cup on the board and the best canvas for a syrup.',
      es: 'Espresso alargado con leche vaporizada. La taza más agradecida de la carta y el mejor lienzo para un sirope.',
    },
    variations: { by: 'temp', hot: 'Hot', iced: 'Iced' },
    serves: ['sitIn', 'takeaway', 'can'],
    options: FULL,
    // Caramel is shot as its own drink in the library, and it should be — a
    // caramel latte looks nothing like a plain one.
    flavours: [
      {
        group: 'Syrup',
        modifier: 'Caramel',
        art: 'caramel-latte',
        name: { en: 'Caramel Latte', es: 'Latte de Caramelo' },
      },
      {
        group: 'Syrup',
        modifier: 'Salted Caramel',
        art: 'caramel-latte',
        name: { en: 'Salted Caramel Latte', es: 'Latte de Caramelo Salado' },
      },
    ],
    madeToOrder: true,
  },
  {
    id: 'cappuccino',
    hue: 'chocolate',
    square: 'Cappuccino',
    section: 'coffee',
    family: 'coffee',
    name: { en: 'Cappuccino', es: 'Cappuccino' },
    tagline: { en: 'Foam on top', es: 'Con espuma' },
    description: {
      en: 'Espresso, steamed milk and a proper cap of foam. Iced, it comes over ice with the foam poured last.',
      es: 'Espresso, leche vaporizada y una buena capa de espuma. Con hielo, la espuma se vierte al final.',
    },
    variations: { by: 'temp', hot: 'Hot', iced: 'Iced' },
    serves: ['sitIn', 'takeaway'],
    options: FULL,
    madeToOrder: true,
  },
  {
    id: 'cortado',
    hue: 'ube',
    square: 'Cortado',
    section: 'coffee',
    family: 'coffee',
    name: { en: 'Cortado', es: 'Cortado' },
    tagline: { en: 'Cut with milk', es: 'Cortado con leche' },
    description: {
      en: 'Espresso cut with just enough warm milk to take the edge off. The local order, and the fastest one to make.',
      es: 'Espresso cortado con la leche justa para suavizarlo. El pedido de aquí, y el más rápido de preparar.',
    },
    variations: { by: 'temp', hot: 'Hot', iced: 'Iced' },
    serves: ['sitIn', 'takeaway'],
    options: FULL,
    madeToOrder: true,
  },
  {
    id: 'double-cortado',
    hue: 'matcha',
    square: 'Double Cortado',
    section: 'coffee',
    family: 'coffee',
    name: { en: 'Double Cortado', es: 'Cortado Doble' },
    tagline: { en: 'Twice the coffee', es: 'El doble de café' },
    description: {
      en: 'The same cut, built on two shots. Same amount of milk, twice the coffee behind it.',
      es: 'El mismo corte, sobre dos cafés. La misma leche, el doble de café detrás.',
    },
    variations: { by: 'temp', hot: 'Hot', iced: 'Iced' },
    serves: ['sitIn', 'takeaway'],
    options: FULL,
    art: 'cortado',
    madeToOrder: true,
  },
  {
    id: 'americano',
    square: 'Americano',
    section: 'coffee',
    family: 'coffee',
    name: { en: 'Americano', es: 'Americano' },
    tagline: { en: 'Long and black', es: 'Largo y solo' },
    description: {
      en: 'Espresso lengthened with hot water, or poured straight over ice. Black, unless you ask otherwise.',
      es: 'Espresso alargado con agua caliente, o servido sobre hielo. Solo, salvo que pidas otra cosa.',
    },
    variations: { by: 'temp', hot: 'Hot', iced: 'Iced' },
    serves: ['sitIn', 'takeaway', 'can'],
    options: BLACK,
    madeToOrder: true,
  },
  {
    id: 'espresso',
    hue: 'chocolate',
    square: 'Espresso',
    section: 'coffee',
    family: 'coffee',
    name: { en: 'Espresso', es: 'Espresso' },
    tagline: { en: 'Straight, no chaser', es: 'Solo, sin más' },
    description: {
      en: 'One shot, pulled short. Everything else on this board starts here.',
      es: 'Un café, corto. Todo lo demás en esta carta empieza aquí.',
    },
    variations: { by: 'none', name: 'Regular', temp: 'hot' },
    serves: ['sitIn', 'takeaway'],
    options: BLACK,
    madeToOrder: true,
  },
  {
    id: 'double-espresso',
    hue: 'ube',
    square: 'Double Espresso',
    section: 'coffee',
    family: 'coffee',
    name: { en: 'Double Espresso', es: 'Espresso Doble' },
    tagline: { en: 'Two of them', es: 'Dos de ellos' },
    description: {
      en: 'Two shots in one cup, for when one was never going to be enough.',
      es: 'Dos cafés en una taza, para cuando uno no iba a ser suficiente.',
    },
    variations: { by: 'none', name: 'Regular', temp: 'hot' },
    serves: ['sitIn', 'takeaway'],
    options: BLACK,
    art: 'espresso',
    madeToOrder: true,
  },
  {
    id: 'bumble-coffee',
    hue: 'fruit',
    square: 'Bumble Coffee',
    section: 'coffee',
    family: 'coffee',
    name: { en: 'Bumble Coffee', es: 'Bumble Coffee' },
    tagline: { en: 'Orange, honey, espresso', es: 'Naranja, miel, espresso' },
    description: {
      en: 'Fresh orange juice, honey and a shot poured over ice, in that order, so it arrives striped and you stir it yourself.',
      es: 'Zumo de naranja, miel y un espresso sobre hielo, en ese orden, para que llegue a capas y lo mezcles tú.',
    },
    variations: { by: 'temp', iced: 'Iced' },
    serves: ['sitIn', 'takeaway', 'can'],
    options: BLACK,
    madeToOrder: true,
  },
  {
    id: 'mocha',
    square: 'Mocha',
    section: 'coffee',
    family: 'chocolate',
    name: { en: 'Mocha', es: 'Mocha' },
    tagline: { en: 'Coffee meets chocolate', es: 'Café con chocolate' },
    description: {
      en: 'Espresso and chocolate under steamed milk. Somewhere between a coffee and a pudding, on purpose.',
      es: 'Espresso y chocolate bajo leche vaporizada. Entre un café y un postre, a propósito.',
    },
    variations: { by: 'temp', hot: 'Hot' },
    serves: ['sitIn', 'takeaway'],
    options: FULL,
    madeToOrder: true,
  },
  {
    id: 'hot-chocolate',
    hue: 'chai',
    square: 'Hot Chocolate',
    section: 'coffee',
    family: 'chocolate',
    name: { en: 'Hot Chocolate', es: 'Chocolate Caliente' },
    tagline: { en: 'Thick and dark', es: 'Espeso y oscuro' },
    description: {
      en: 'Dark chocolate melted into steamed milk. No coffee in it at all, and none needed.',
      es: 'Chocolate negro fundido en leche vaporizada. Sin nada de café, y sin hacer falta.',
    },
    variations: { by: 'temp', hot: 'Hot' },
    serves: ['sitIn', 'takeaway'],
    options: FULL,
    madeToOrder: true,
  },
  {
    id: 'tea',
    square: 'Tea',
    section: 'coffee',
    family: 'leaf',
    name: { en: 'Tea', es: 'Té' },
    tagline: { en: 'Properly brewed', es: 'Bien hecho' },
    description: {
      en: 'Loose leaf, brewed in the pot and poured at the table. Ask at the counter for what is open today.',
      es: 'En hebra, hecho en tetera y servido en mesa. Pregunta en barra por lo que hay hoy.',
    },
    variations: { by: 'temp', hot: 'Hot' },
    serves: ['sitIn', 'takeaway'],
    options: BLACK,
    madeToOrder: true,
  },
];

// ── Speciality ───────────────────────────────────────────────────────────────

const SPECIALITY: Drink[] = [
  {
    id: 'matcha-latte',
    square: 'Matcha Latte',
    section: 'speciality',
    family: 'matcha',
    name: { en: 'Matcha Latte', es: 'Matcha Latte' },
    tagline: { en: 'Whisked, grassy, green', es: 'Batido, herbal, verde' },
    description: {
      en: 'Ceremonial matcha whisked by hand and poured over milk. Iced, it separates into two greens before you stir it.',
      es: 'Matcha ceremonial batido a mano y vertido sobre leche. Con hielo, se separa en dos verdes antes de removerlo.',
    },
    variations: { by: 'temp', hot: 'Hot', iced: 'Iced' },
    serves: ['sitIn', 'takeaway'],
    options: FULL,
    // The purée and vanilla versions are each shot as their own drink, because
    // that is what they look like in the cup.
    flavours: [
      {
        group: 'Puree',
        modifier: 'Strawberry',
        art: 'strawberry-matcha',
        name: { en: 'Strawberry Matcha', es: 'Matcha con Fresa' },
      },
      {
        group: 'Puree',
        modifier: 'Mango',
        art: 'mango-matcha',
        name: { en: 'Mango Matcha', es: 'Matcha con Mango' },
      },
      {
        group: 'Syrup',
        modifier: 'Vanilla',
        art: 'vanilla-matcha',
        name: { en: 'Vanilla Matcha', es: 'Matcha con Vainilla' },
      },
      {
        group: 'Syrup',
        modifier: 'Vanilla - Sugar Free',
        art: 'vanilla-matcha',
        name: { en: 'Vanilla Matcha', es: 'Matcha con Vainilla' },
      },
    ],
    madeToOrder: true,
  },
  {
    id: 'ube-latte',
    square: 'Ube Latte',
    section: 'speciality',
    family: 'ube',
    name: { en: 'Ube Latte', es: 'Ube Latte' },
    tagline: { en: 'Purple yam, vanilla, milk', es: 'Ñame morado, vainilla, leche' },
    description: {
      en: 'Purple yam with vanilla and coconut behind it, poured over milk. The one people photograph.',
      es: 'Ñame morado con vainilla y coco detrás, sobre leche. El que todo el mundo fotografía.',
    },
    variations: { by: 'temp', hot: 'Hot', iced: 'Iced' },
    serves: ['sitIn', 'takeaway', 'can'],
    options: FULL,
    flavours: [
      {
        group: 'Puree',
        modifier: 'Strawberry',
        art: 'strawberry-ube',
        name: { en: 'Strawberry Ube', es: 'Ube con Fresa' },
      },
    ],
    madeToOrder: true,
  },
  {
    id: 'ube-matcha-latte',
    hue: 'ubeMatcha',
    square: 'Ube Matcha Latte',
    section: 'speciality',
    family: 'ube',
    name: { en: 'Ube Matcha', es: 'Ube Matcha' },
    tagline: { en: 'Purple over green', es: 'Morado sobre verde' },
    description: {
      en: 'Ube poured over whisked matcha so the two sit in layers. Stir it or drink it as it comes.',
      es: 'Ube sobre matcha batido, en capas. Remuévelo o bébelo tal cual.',
    },
    variations: { by: 'temp', hot: 'Hot', iced: 'Iced' },
    serves: ['sitIn', 'takeaway', 'can'],
    options: FULL,
    madeToOrder: true,
  },
  {
    id: 'chai-latte',
    square: 'Chai Latte',
    section: 'speciality',
    family: 'chai',
    name: { en: 'Chai Latte', es: 'Chai Latte' },
    tagline: { en: 'Spiced and warm', es: 'Especiado y cálido' },
    description: {
      en: 'Black tea steeped with cardamom, cinnamon and ginger, then milk. Warming hot, and surprisingly good iced.',
      es: 'Té negro con cardamomo, canela y jengibre, y leche. Reconfortante caliente, y sorprendente con hielo.',
    },
    variations: { by: 'temp', hot: 'Hot', iced: 'Iced' },
    serves: ['sitIn', 'takeaway', 'can'],
    options: FULL,
    madeToOrder: true,
  },
  {
    id: 'pink-chai-latte',
    hue: 'ube',
    square: 'Pink Chai Latte',
    section: 'speciality',
    family: 'chai',
    name: { en: 'Pink Chai', es: 'Chai Rosa' },
    tagline: { en: 'Rose, cardamom, pistachio', es: 'Rosa, cardamomo, pistacho' },
    description: {
      en: 'Kashmiri-style chai that turns pink in the pan, finished with rose and crushed pistachio. Our colour, by coincidence.',
      es: 'Chai al estilo de Cachemira que se vuelve rosa en el cazo, con rosa y pistacho picado. Nuestro color, por casualidad.',
    },
    variations: { by: 'temp', hot: 'Hot', iced: 'Iced' },
    serves: ['sitIn', 'takeaway', 'can'],
    options: FULL,
    madeToOrder: true,
  },
  {
    id: 'cold-brew',
    square: 'Cold Brew',
    section: 'speciality',
    family: 'coffee',
    name: { en: 'Cold Brew', es: 'Cold Brew' },
    tagline: { en: 'Eighteen hours, no heat', es: 'Dieciocho horas, sin calor' },
    description: {
      en: 'Steeped cold overnight and never heated, so it comes out sweet and low in acid. Served black over ice.',
      es: 'En frío toda la noche y nunca calentado: dulce y poco ácido. Servido solo con hielo.',
    },
    variations: { by: 'temp', iced: 'Iced' },
    serves: ['sitIn', 'takeaway'],
    options: BLACK,
    // Any cold foam turns it into the layered version, which is exactly what it
    // looks like in the glass.
    flavours: [
      {
        group: 'Cold Foam',
        modifier: 'Vanilla',
        art: 'cold-brew-latte',
        name: { en: 'Cold Brew, Vanilla Foam', es: 'Cold Brew con Espuma de Vainilla' },
      },
      {
        group: 'Cold Foam',
        modifier: 'Strawberry',
        art: 'cold-brew-latte',
        name: { en: 'Cold Brew, Strawberry Foam', es: 'Cold Brew con Espuma de Fresa' },
      },
      {
        group: 'Cold Foam',
        modifier: 'Matcha',
        art: 'cold-brew-latte',
        name: { en: 'Cold Brew, Matcha Foam', es: 'Cold Brew con Espuma de Matcha' },
      },
      {
        group: 'Cold Foam',
        modifier: 'Ube',
        art: 'cold-brew-latte',
        name: { en: 'Cold Brew, Ube Foam', es: 'Cold Brew con Espuma de Ube' },
      },
    ],
    madeToOrder: true,
  },
];

// ── Smoothies ────────────────────────────────────────────────────────────────
//
// Priced by serve rather than by temperature: Square carries "Sit In" and
// "Takeaway" as the variations, at the same price, so the serve switch drives
// the variation directly here.

const SMOOTHIES: Drink[] = [
  {
    id: 'strawberry-sunrise',
    square: 'Strawberry Sunrise',
    section: 'smoothies',
    family: 'fruit',
    name: { en: 'Strawberry Sunrise', es: 'Strawberry Sunrise' },
    tagline: { en: 'Strawberry, banana, yogurt', es: 'Fresa, plátano, yogur' },
    description: {
      en: 'Strawberries, banana, fresh orange juice and Greek yogurt. Thick enough to need the spoon.',
      es: 'Fresas, plátano, zumo de naranja natural y yogur griego. Lo bastante espeso para la cuchara.',
    },
    variations: { by: 'serve', sitIn: 'Sit In', takeaway: 'Takeaway', temp: 'iced' },
    serves: ['sitIn', 'takeaway', 'can'],
    options: [],
    madeToOrder: true,
  },
  {
    id: 'berry-blast',
    hue: 'ube',
    square: 'Berry Blast',
    section: 'smoothies',
    family: 'fruit',
    name: { en: 'Berry Blast', es: 'Berry Blast' },
    tagline: { en: 'Three berries, one glass', es: 'Tres frutos, un vaso' },
    description: {
      en: 'Strawberries, raspberries and blueberries blended with fresh orange juice. Sharp rather than sweet.',
      es: 'Fresas, frambuesas y arándanos con zumo de naranja natural. Más ácido que dulce.',
    },
    variations: { by: 'serve', sitIn: 'Sit In', takeaway: 'Takeaway', temp: 'iced' },
    serves: ['sitIn', 'takeaway', 'can'],
    options: [],
    madeToOrder: true,
  },
  {
    id: 'tropical',
    hue: 'matcha',
    square: 'Tropical',
    section: 'smoothies',
    family: 'fruit',
    name: { en: 'Tropical', es: 'Tropical' },
    tagline: { en: 'Mango, pineapple, orange', es: 'Mango, piña, naranja' },
    description: {
      en: 'Mango and pineapple blended with fresh orange juice. The brightest thing on the board.',
      es: 'Mango y piña con zumo de naranja natural. Lo más luminoso de la carta.',
    },
    variations: { by: 'serve', sitIn: 'Sit In', takeaway: 'Takeaway', temp: 'iced' },
    serves: ['sitIn', 'takeaway', 'can'],
    options: [],
    madeToOrder: true,
  },
  {
    id: 'gym-nut',
    hue: 'chocolate',
    square: 'Gym Nut',
    section: 'smoothies',
    family: 'fruit',
    name: { en: 'Gym Nut', es: 'Gym Nut' },
    tagline: { en: 'Banana, oats, peanut butter', es: 'Plátano, avena, cacahuete' },
    description: {
      en: 'Banana, oats, peanut butter and almond milk. Closer to breakfast than to a drink.',
      es: 'Plátano, avena, crema de cacahuete y leche de almendra. Más desayuno que bebida.',
    },
    variations: { by: 'serve', sitIn: 'Sit In', takeaway: 'Takeaway', temp: 'iced' },
    serves: ['sitIn', 'takeaway', 'can'],
    options: [],
    madeToOrder: true,
  },
];

// ── Cold drinks ──────────────────────────────────────────────────────────────

const COLD: Drink[] = [
  {
    id: 'fresh-orange-juice',
    square: 'Fresh Orange Juice',
    section: 'cold',
    family: 'fruit',
    name: { en: 'Fresh Orange Juice', es: 'Zumo de Naranja Natural' },
    tagline: { en: 'Squeezed to order', es: 'Exprimido al momento' },
    description: {
      en: 'Oranges into the press when you order, and nothing else in the glass.',
      es: 'Naranjas a la prensa cuando lo pides, y nada más en el vaso.',
    },
    variations: { by: 'serve', sitIn: 'Sit In', takeaway: 'Takeaway', temp: 'iced' },
    serves: ['sitIn', 'takeaway', 'can'],
    options: [],
    madeToOrder: true,
  },
  {
    id: 'soft-drinks',
    square: 'Soft Drinks',
    section: 'cold',
    family: 'bottle',
    name: { en: 'Soft Drinks', es: 'Refrescos' },
    tagline: { en: 'Cold from the fridge', es: 'Fríos de la nevera' },
    description: {
      en: 'Whatever is in the fridge, straight out of it.',
      es: 'Lo que haya en la nevera, tal cual.',
    },
    variations: {
      by: 'pick',
      label: { en: 'Pick one', es: 'Elige uno' },
      picks: [
        { id: 'coca-cola', square: 'Coca Cola', name: { en: 'Coca-Cola', es: 'Coca-Cola' } },
        {
          id: 'coca-cola-zero',
          square: 'Coca Cola Zero',
          name: { en: 'Coca-Cola Zero', es: 'Coca-Cola Zero' },
        },
        { id: 'fanta-orange', square: 'Fanta', name: { en: 'Fanta Orange', es: 'Fanta Naranja' } },
        {
          id: 'fanta-lemon',
          square: 'Fanta Lemon',
          name: { en: 'Fanta Lemon', es: 'Fanta Limón' },
        },
        { id: 'sprite', square: 'Sprite', name: { en: 'Sprite', es: 'Sprite' } },
        {
          id: 'aquarius',
          square: 'Aquarius (Plain)',
          name: { en: 'Aquarius', es: 'Aquarius' },
        },
        {
          id: 'aquarius-orange',
          square: 'Aquarius (Orange)',
          name: { en: 'Aquarius Orange', es: 'Aquarius Naranja' },
          art: 'aquarius',
        },
        // No bottle shot for this one yet; it falls back to the shelf's own
        // stand-in rather than borrowing another drink's label.
        { id: 'apple-juice', square: 'Apple Juice', name: { en: 'Apple Juice', es: 'Zumo de Manzana' } },
        { id: 'iced-tea', square: 'Iced Tea', name: { en: 'Iced Tea', es: 'Té Frío' } },
      ],
    },
    serves: ['takeaway'],
    options: [],
    madeToOrder: false,
  },
  {
    id: 'water',
    square: 'Water',
    section: 'cold',
    family: 'bottle',
    name: { en: 'Water', es: 'Agua' },
    tagline: { en: 'Still or sparkling', es: 'Sin gas o con gas' },
    description: {
      en: 'Bottled, cold. Tap water is free — just ask.',
      es: 'Embotellada, fría. El agua del grifo es gratis: solo tienes que pedirla.',
    },
    variations: {
      by: 'pick',
      label: { en: 'Still or sparkling', es: 'Sin gas o con gas' },
      picks: [
        { id: 'water', square: 'Still', name: { en: 'Still', es: 'Sin gas' } },
        {
          id: 'sparkling-water',
          square: 'Sparkling',
          name: { en: 'Sparkling', es: 'Con gas' },
        },
      ],
    },
    serves: ['takeaway'],
    options: [],
    madeToOrder: false,
  },
  {
    id: 'powerade',
    square: 'Powerade',
    section: 'cold',
    family: 'bottle',
    name: { en: 'Powerade', es: 'Powerade' },
    tagline: { en: 'After the run', es: 'Después de correr' },
    description: {
      en: 'Cold from the fridge, for whatever you have just finished doing.',
      es: 'Frío de la nevera, para lo que sea que acabes de terminar.',
    },
    variations: { by: 'none', name: 'Regular' },
    serves: ['takeaway'],
    options: [],
    madeToOrder: false,
  },
  {
    id: 'corona',
    square: 'Corona',
    section: 'cold',
    family: 'bottle',
    name: { en: 'Corona', es: 'Corona' },
    tagline: { en: 'With a wedge', es: 'Con lima' },
    description: {
      en: 'Cold, with a wedge of lime if you want one.',
      es: 'Fría, con una rodaja de lima si quieres.',
    },
    variations: { by: 'none', name: 'Regular' },
    serves: ['takeaway'],
    options: [],
    madeToOrder: false,
  },
  {
    id: 'estrella-galicia',
    square: 'Estrella Galicia',
    section: 'cold',
    family: 'bottle',
    name: { en: 'Estrella Galicia', es: 'Estrella Galicia' },
    tagline: { en: 'The local one', es: 'La de aquí' },
    description: {
      en: 'From A Coruña, and the one most people ask for.',
      es: 'De A Coruña, y la que más se pide.',
    },
    variations: { by: 'none', name: 'Regular' },
    serves: ['takeaway'],
    options: [],
    madeToOrder: false,
  },
];

// ── The kitchen ──────────────────────────────────────────────────────────────
//
// No temperature and no serve switch — a croissant is a croissant. They are
// modelled as drinks anyway so the whole board is one list with one renderer,
// and the studio simply shows fewer controls.

const KITCHEN: Drink[] = [
  {
    id: 'acai-bowl',
    square: 'Acai Bowl',
    section: 'food',
    family: 'fruit',
    name: { en: 'Açaí Bowl', es: 'Bowl de Açaí' },
    tagline: { en: 'Granola, berries, banana', es: 'Granola, frutos rojos, plátano' },
    description: {
      en: 'Blended açaí under granola, berries, banana and coconut. Then pick your finish — pistachio, Biscoff or peanut butter.',
      es: 'Açaí batido con granola, frutos rojos, plátano y coco. Luego eliges el acabado: pistacho, Biscoff o cacahuete.',
    },
    variations: { by: 'none', name: 'Regular' },
    serves: ['sitIn'],
    options: [
      { square: 'Granola', label: { en: 'Granola', es: 'Granola' } },
      { square: 'Topping Sauce', label: { en: 'Finish', es: 'Acabado' } },
      { square: 'Extras', label: { en: 'Extras', es: 'Extras' } },
    ],
    madeToOrder: true,
  },
  {
    id: 'chia-fruit-parfait',
    hue: 'ube',
    square: 'Chia Fruit Parfait',
    section: 'food',
    family: 'fruit',
    name: { en: 'Chia Fruit Parfait', es: 'Parfait de Chía' },
    tagline: { en: 'Layered and cold', es: 'En capas y frío' },
    description: {
      en: 'Chia set overnight, layered with fruit and yogurt.',
      es: 'Chía reposada toda la noche, en capas con fruta y yogur.',
    },
    variations: {
      by: 'pick',
      label: { en: 'Pick one', es: 'Elige uno' },
      picks: [
        { id: 'strawberry', square: 'Strawberry', name: { en: 'Strawberry', es: 'Fresa' } },
        { id: 'mango', square: 'Mango', name: { en: 'Mango', es: 'Mango' } },
      ],
    },
    serves: ['sitIn'],
    options: [],
    madeToOrder: false,
  },
  bakery('croissant', 'Croissant', { en: 'Croissant', es: 'Croissant' }, {
    en: 'Baked this morning, and gone by lunch.',
    es: 'Horneado esta mañana, y agotado para el mediodía.',
  }),
  bakery(
    'almond-croissant',
    'Almond Croissant',
    { en: 'Almond Croissant', es: 'Croissant de Almendra' },
    {
      en: 'Filled with frangipane and finished with flaked almonds.',
      es: 'Relleno de frangipane y acabado con almendra laminada.',
    },
    'chai',
  ),
  bakery(
    'ham-cheese-croissant',
    'Ham & Cheese Croissant',
    { en: 'Ham & Cheese Croissant', es: 'Croissant de Jamón y Queso' },
    { en: 'Warmed through, so the cheese goes.', es: 'Calentado, para que el queso se funda.' },
    'chocolate',
  ),
  bakery(
    'pain-au-chocolat',
    'Pain au Chocolat',
    { en: 'Pain au Chocolat', es: 'Napolitana de Chocolate' },
    {
      en: 'Two batons of dark chocolate, laminated in.',
      es: 'Dos barras de chocolate negro, dentro del hojaldre.',
    },
    'ube',
  ),
  bakery(
    'cinnamon-swirl',
    'Cinnamon Swirl',
    { en: 'Cinnamon Swirl', es: 'Rollo de Canela' },
    {
      en: 'Rolled, proved and baked with cinnamon sugar right through.',
      es: 'Enrollado, fermentado y horneado con azúcar y canela por dentro.',
    },
    'chai',
  ),
  bakery(
    'raisin-butter-swirl',
    'Raisin Butter Swirl',
    { en: 'Raisin Butter Swirl', es: 'Caracola de Pasas' },
    {
      en: 'Butter pastry, custard and raisins, rolled together.',
      es: 'Hojaldre, crema pastelera y pasas, enrollados juntos.',
    },
  ),
  bakery(
    'gluten-free-brownie',
    'Gluten Free Brownie',
    { en: 'Gluten Free Brownie', es: 'Brownie sin Gluten' },
    {
      en: 'Dense, dark, and gluten free without announcing it.',
      es: 'Denso, oscuro, y sin gluten sin hacer ruido.',
    },
    'chocolate',
  ),
  bakery(
    'pistachio-cheesecake',
    'Pistachio Cheesecake',
    { en: 'Pistachio Cheesecake', es: 'Tarta de Pistacho' },
    {
      en: 'Baked cheesecake with a pistachio top. One slice is plenty.',
      es: 'Tarta de queso al horno con pistacho por encima. Una porción es suficiente.',
    },
    'matcha',
  ),
];

/** Bakery items are all the same shape: one price, one size, nothing to choose. */
function bakery(
  id: string,
  square: string,
  name: Bilingual,
  description: Bilingual,
  hue?: Drink['hue'],
): Drink {
  return {
    id,
    square,
    section: 'bakery',
    family: 'coffee',
    hue,
    name,
    tagline: { en: 'From the counter', es: 'De la barra' },
    description,
    variations: { by: 'none', name: 'Regular' },
    serves: ['sitIn'],
    options: [],
    madeToOrder: false,
  };
}

/** The whole board, in the order the café reads it. */
export const DRINKS: Drink[] = [...COFFEE, ...SPECIALITY, ...SMOOTHIES, ...COLD, ...KITCHEN];

/** Section headings, in board order. */
export const SECTIONS: Array<{ id: Section; label: Bilingual; blurb: Bilingual }> = [
  {
    id: 'coffee',
    label: { en: 'Coffee', es: 'Café' },
    blurb: { en: 'The everyday cups', es: 'Las tazas de cada día' },
  },
  {
    id: 'speciality',
    label: { en: 'Speciality', es: 'Especialidades' },
    blurb: { en: 'What we are known for', es: 'Por lo que nos conocen' },
  },
  {
    id: 'smoothies',
    label: { en: 'Smoothies', es: 'Batidos' },
    blurb: { en: 'Blended to order', es: 'Batidos al momento' },
  },
  {
    id: 'cold',
    label: { en: 'Cold Drinks', es: 'Bebidas Frías' },
    blurb: { en: 'Straight from the fridge', es: 'Directo de la nevera' },
  },
  {
    id: 'bakery',
    label: { en: 'Bakery', es: 'Bollería' },
    blurb: { en: 'Baked this morning', es: 'Horneado esta mañana' },
  },
  {
    id: 'food',
    label: { en: 'Food', es: 'Comida' },
    blurb: { en: 'Made at the counter', es: 'Hecho en barra' },
  },
];

/**
 * The board's first fork: drinks or food. Sections hang off one of the two, so
 * the navigation reads as a crumb trail — pick a side, then a part of it.
 */
export const GROUPS: Array<{ id: MenuGroup; label: Bilingual; sections: Section[] }> = [
  {
    id: 'drinks',
    label: { en: 'Drinks', es: 'Bebidas' },
    sections: ['coffee', 'speciality', 'smoothies', 'cold'],
  },
  {
    id: 'food',
    label: { en: 'Food', es: 'Comida' },
    sections: ['bakery', 'food'],
  },
];

export function groupOf(section: Section): MenuGroup {
  return GROUPS.find((group) => group.sections.includes(section))?.id ?? 'drinks';
}

const BY_ID = new Map(DRINKS.map((drink) => [drink.id, drink]));

export function drinkById(id: string): Drink | undefined {
  return BY_ID.get(id);
}

export function drinksInSection(section: Section): Drink[] {
  return DRINKS.filter((drink) => drink.section === section);
}

/** Art folder for a drink before any flavour choice is applied. */
export function baseArt(drink: Drink): string {
  return drink.art ?? drink.id;
}
