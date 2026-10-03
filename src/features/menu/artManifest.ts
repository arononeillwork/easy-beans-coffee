/**
 * Which drink photographs actually exist on disk.
 *
 * GENERATED — do not edit by hand. `npm run media:drinks` walks
 * `public/media/drinks/` and rewrites this file.
 *
 * It exists so the art resolver can fall back *before* rendering rather than
 * after: the library is shot drink by drink and is legitimately incomplete
 * (there is a hot flat white sit-in shot and no takeaway one yet), and an
 * <img> that 404s after layout is a worse answer than a considered substitute
 * chosen up front. See ./drinkArt.
 *
 * Keys are art folders; values are `<temp>-<serve>` slugs, where temp is
 * hot | iced | na and serve is sit-in | takeaway | can.
 */
export const ART_MANIFEST: Record<string, string[]> = {
  "acai-bowl": [
    "na-sit-in"
  ],
  "americano": [
    "hot-sit-in",
    "hot-takeaway",
    "iced-can",
    "iced-sit-in",
    "iced-takeaway"
  ],
  "aquarius": [
    "na-takeaway"
  ],
  "berry-blast": [
    "iced-can",
    "iced-sit-in",
    "iced-takeaway"
  ],
  "bumble-coffee": [
    "iced-can",
    "iced-sit-in",
    "iced-takeaway"
  ],
  "cappuccino": [
    "hot-sit-in",
    "hot-takeaway",
    "iced-sit-in",
    "iced-takeaway"
  ],
  "caramel-latte": [
    "iced-can",
    "iced-sit-in",
    "iced-takeaway"
  ],
  "chai-latte": [
    "hot-sit-in",
    "iced-can",
    "iced-sit-in",
    "iced-takeaway"
  ],
  "coca-cola": [
    "na-takeaway"
  ],
  "coca-cola-zero": [
    "na-takeaway"
  ],
  "cold-brew": [
    "iced-sit-in",
    "iced-takeaway"
  ],
  "cold-brew-latte": [
    "iced-sit-in",
    "iced-takeaway"
  ],
  "corona": [
    "na-takeaway"
  ],
  "cortado": [
    "hot-sit-in",
    "hot-takeaway",
    "iced-sit-in"
  ],
  "espresso": [
    "hot-sit-in",
    "hot-takeaway"
  ],
  "estrella-galicia": [
    "na-takeaway"
  ],
  "fanta-lemon": [
    "na-takeaway"
  ],
  "fanta-orange": [
    "na-takeaway"
  ],
  "flat-white": [
    "hot-sit-in"
  ],
  "fresh-orange-juice": [
    "iced-can",
    "iced-sit-in",
    "iced-takeaway"
  ],
  "gym-nut": [
    "iced-can",
    "iced-sit-in",
    "iced-takeaway"
  ],
  "hot-chocolate": [
    "hot-sit-in",
    "hot-takeaway"
  ],
  "iced-tea": [
    "na-takeaway"
  ],
  "latte": [
    "hot-sit-in",
    "iced-can",
    "iced-sit-in",
    "iced-takeaway"
  ],
  "mango-matcha": [
    "iced-sit-in",
    "iced-takeaway"
  ],
  "matcha-latte": [
    "hot-sit-in",
    "hot-takeaway",
    "iced-sit-in",
    "iced-takeaway"
  ],
  "mocha": [
    "hot-sit-in",
    "hot-takeaway"
  ],
  "pink-chai-latte": [
    "hot-sit-in",
    "hot-takeaway",
    "iced-can",
    "iced-sit-in",
    "iced-takeaway"
  ],
  "powerade": [
    "na-takeaway"
  ],
  "sparkling-water": [
    "na-takeaway"
  ],
  "sprite": [
    "na-takeaway"
  ],
  "strawberry-matcha": [
    "iced-sit-in",
    "iced-takeaway"
  ],
  "strawberry-sunrise": [
    "iced-can",
    "iced-sit-in",
    "iced-takeaway"
  ],
  "strawberry-ube": [
    "iced-sit-in",
    "iced-takeaway"
  ],
  "tea": [
    "hot-sit-in",
    "hot-takeaway"
  ],
  "tropical": [
    "iced-can",
    "iced-sit-in",
    "iced-takeaway"
  ],
  "ube-latte": [
    "hot-sit-in",
    "hot-takeaway",
    "iced-can",
    "iced-sit-in",
    "iced-takeaway"
  ],
  "ube-matcha-latte": [
    "iced-can",
    "iced-sit-in"
  ],
  "vanilla-matcha": [
    "iced-can",
    "iced-sit-in",
    "iced-takeaway"
  ],
  "water": [
    "na-takeaway"
  ]
};

/** Bottle shots for the syrup rail, keyed by Square modifier name, normalized. */
export const SYRUP_ART: Record<string, string> = {
  "vanilla": "/media/syrups/vanilla.webp",
  "vanilla - sugar free": "/media/syrups/vanilla-sugar-free.webp",
  "caramel": "/media/syrups/caramel.webp",
  "caramel - sugar free": "/media/syrups/caramel-sugar-free.webp",
  "salted caramel": "/media/syrups/salted-caramel.webp",
  "hazelnut": "/media/syrups/hazelnut.webp",
  "curacao": "/media/syrups/curacao.webp",
  "strawberry": "/media/syrups/strawberry.webp",
  "fresca": "/media/syrups/strawberry.webp",
  "mango": "/media/syrups/mango.webp",
  "passion fruit": "/media/syrups/passion-fruit.webp"
};

/**
 * Frames shot in the café rather than on the studio sweep, as `<art>/<frame>`.
 *
 * These cannot be composited with multiply — there is no white ground to drop
 * out, only a table and a wall, and blending one turns the whole photograph the
 * colour of the stage. They are presented as photographs instead: a framed card
 * rather than a cup floating on colour. See ./drinkArt's `isSceneFrame`.
 */
export const SCENE_FRAMES: string[] = [
  "americano/iced-can",
  "matcha-latte/iced-sit-in",
  "ube-matcha-latte/iced-can"
];
