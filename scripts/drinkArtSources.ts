/**
 * The café's drink photography, as it sits in Google Drive.
 *
 * The library is organised by eye — "Iced Capuccino - Sit In.png", one folder
 * per drink, spelling and casing as whoever uploaded it typed them — which is
 * the right way for the people shooting it and the wrong way for a build step.
 * This table is the translation: Drive file id on one side, the canonical
 * `<art>/<temp>-<serve>` frame on the other.
 *
 * It is written out by hand on purpose. Deriving frames from the filenames
 * would mean guessing at "Ube Matcha Sit In" (iced, though it does not say so),
 * "Bumble Coffee - Can" (also iced) and "Matcha Vanilla Takeaway" (a matcha
 * latte with vanilla syrup, which is a *flavour* of another drink) — and a
 * wrong guess puts the wrong cup on the menu. Adding a shot is one line here.
 *
 * Frames are `<temp>-<serve>`: temp is hot | iced | na, serve is
 * sit-in | takeaway | can. See features/menu/drinkArt.
 */

export interface ArtSource {
  /** Google Drive file id. */
  id: string;
  /** Art folder, matching a drink's `id` or `art` in features/menu/drinks. */
  art: string;
  /** `<temp>-<serve>`. */
  frame: string;
}

export const DRINK_ART: ArtSource[] = [
  // ── Coffee ────────────────────────────────────────────────────────────────
  { id: '1aA5rOVJTQZ5EX0mKLLbOQeCp96ltk4Ja', art: 'flat-white', frame: 'hot-sit-in' },

  { id: '1HNmycDGkvcSniHMwtSuCw6tauyxamfka', art: 'cappuccino', frame: 'hot-sit-in' },
  { id: '1Xqlg8VaSWgAJgCKr_o4q1eKxqur3o8Gx', art: 'cappuccino', frame: 'hot-takeaway' },
  { id: '14K0a3PVvQN3Uay_cQfeqN_ThXbxTe4jr', art: 'cappuccino', frame: 'iced-sit-in' },
  { id: '113cDQ8XC6qwnlBQZPnlhdROuNh9Ok24R', art: 'cappuccino', frame: 'iced-takeaway' },

  { id: '1zCsURVYvEoBsV1R7geBYc6DOzQtfzhpE', art: 'cortado', frame: 'hot-sit-in' },
  { id: '1Q5JfKg9NCMig_khgMzXBqwfEgdFoljyc', art: 'cortado', frame: 'hot-takeaway' },
  { id: '13zbGX32lG4Er_eyr606uR0EPFOoXJqZZ', art: 'cortado', frame: 'iced-sit-in' },

  // Bumble is only ever iced; the filenames do not say so.
  { id: '1Gfu0_TXXrSbhuSifkFcbWLz7XhvwDnZC', art: 'bumble-coffee', frame: 'iced-sit-in' },
  { id: '1RPzhYWfqzzOOGxcfAPx7_7Z09Iyipp8a', art: 'bumble-coffee', frame: 'iced-takeaway' },
  { id: '1lXxYY-r5qdP_HMDnPyjHBJJvNAbHcLp4', art: 'bumble-coffee', frame: 'iced-can' },

  { id: '15sy8AhrL6s7IfpLgE1dny5f7vZ2zHZ5Q', art: 'espresso', frame: 'hot-sit-in' },
  { id: '1YRlJu2Q6HO82bEVP062WbzqAFE5oIQ0n', art: 'espresso', frame: 'hot-takeaway' },

  { id: '16F2eb9pex3JZSd2jECoDewqy1qWsHml2', art: 'americano', frame: 'hot-sit-in' },
  { id: '1_DmDBzIntlNQpVOCBmfeRmklTbvCjeI6', art: 'americano', frame: 'hot-takeaway' },
  { id: '1usTXMUv-O8Q9BeEQ1j0bUA9x5XXzZzch', art: 'americano', frame: 'iced-sit-in' },
  { id: '1BW5jjIbUJxGbf7GE0EsfPjIzBocfP8rP', art: 'americano', frame: 'iced-takeaway' },
  { id: '1wJYT5KDGmmMIV-p2bJU_mcIHpz34VG-P', art: 'americano', frame: 'iced-can' },

  { id: '1OJXt6DIXNLyIh8t3LQuTHv_yCl6_XVaQ', art: 'latte', frame: 'hot-sit-in' },
  { id: '14yKJEpsnVSytv5hrzCuT2ikdJ0QGSZwk', art: 'latte', frame: 'iced-sit-in' },
  { id: '1ecYMetk78BLwA5f16eoSJrSG1EjLbtnc', art: 'latte', frame: 'iced-takeaway' },
  { id: '1UNR8NcdCjspByV8mAEl0JEChQ700hyuf', art: 'latte', frame: 'iced-can' },

  // A latte with caramel syrup — reached through the Syrup rail, not the board.
  { id: '1yptmRzPty0-oFGPrYfrOHcCZxbScfjxD', art: 'caramel-latte', frame: 'iced-sit-in' },
  { id: '1qJZMszCYhCUAAzb9oq5VEgSdxMECp8N9', art: 'caramel-latte', frame: 'iced-takeaway' },
  { id: '1Rjn9DJJObYKWf0gsJDHI7GzjEDe2XOib', art: 'caramel-latte', frame: 'iced-can' },

  { id: '1kRFc6vIn1pLATcHXQnYJH4It2OMx731w', art: 'mocha', frame: 'hot-sit-in' },
  { id: '1UsAnjZXnUPxMcb27bc_th0TVG5YCETaT', art: 'mocha', frame: 'hot-takeaway' },

  { id: '1wWFFoiVLzizKPwzdjYIyevcsgNeR3h47', art: 'hot-chocolate', frame: 'hot-sit-in' },
  { id: '1PWyo8Ytt1KNJJD1tbUYIsvZqGg5LoRRo', art: 'hot-chocolate', frame: 'hot-takeaway' },

  { id: '1qUY3MIEWKAeRwh6Yd4LWJeMKsZ_FEsbS', art: 'tea', frame: 'hot-sit-in' },
  { id: '1Cz0P-ZTgrWBOm7im2ACxhUP8cTEwZWzn', art: 'tea', frame: 'hot-takeaway' },

  // ── Speciality ────────────────────────────────────────────────────────────
  { id: '1cD6hqHFT6gWXRF2nZdZZp_rySngIvYwF', art: 'chai-latte', frame: 'hot-sit-in' },
  { id: '1QAJy9mzdu1nhzk-bfZe1kR10Og12VoVg', art: 'chai-latte', frame: 'iced-sit-in' },
  { id: '12ezAy-JdhfZ2im5OrFxLc-7SForekGwV', art: 'chai-latte', frame: 'iced-takeaway' },
  { id: '1NQu9ksI5SkDp5YVQ0tqmOUeEth0aSNZQ', art: 'chai-latte', frame: 'iced-can' },

  { id: '1mzI4nuskaiOnKvkRK14RenVnDzOTpjqT', art: 'pink-chai-latte', frame: 'hot-sit-in' },
  { id: '1iXDFNot5VGN0nAbuknSWwha-eNlm_Uop', art: 'pink-chai-latte', frame: 'hot-takeaway' },
  { id: '1kFgoumuhznaRNEE9N9YgcP0B6aRaobvV', art: 'pink-chai-latte', frame: 'iced-sit-in' },
  { id: '19S-MIDrsPHf2-ypncO5SBcyuNk-Q5y-X', art: 'pink-chai-latte', frame: 'iced-takeaway' },
  { id: '1nTbgpKQHnq3WX3G1XlIYB1tF0BLGAD7w', art: 'pink-chai-latte', frame: 'iced-can' },

  { id: '1sOA03exZ1PRX2N2GVzEp_OC_qxKSUd2J', art: 'ube-matcha-latte', frame: 'iced-sit-in' },
  { id: '19NdRxiOztdDiVSmaCTxWlz0KcGLA7R4J', art: 'ube-matcha-latte', frame: 'iced-can' },

  { id: '1KLmYbtcqrTH8Y5ya00JvQvxkVVEFSl8b', art: 'cold-brew', frame: 'iced-sit-in' },
  { id: '1JZZl72eUVt3cLq1ghz9SO3EWr3taIGAa', art: 'cold-brew', frame: 'iced-takeaway' },

  // Cold brew with foam on it — reached through the Cold Foam rail.
  { id: '1wQ0ekmtRfm6YESAAbGxHKPKyzDFR3Rd3', art: 'cold-brew-latte', frame: 'iced-sit-in' },
  { id: '1D2yF0-PNLQ907xYtcI7UQHwVhqDLHkOK', art: 'cold-brew-latte', frame: 'iced-takeaway' },

  // The Drive library carries "Matcha" and "Matcha Latte" as separate folders
  // holding byte-identical files; Square has one item, so this is one drink.
  { id: '187Zfl_bFGu0SXgIz3O96fWXgIx2bKCw7', art: 'matcha-latte', frame: 'hot-sit-in' },
  { id: '1IBBOevColLvW3aLOW22AZstxt61zn6MI', art: 'matcha-latte', frame: 'hot-takeaway' },
  { id: '1KrhhD15OQPREJCV9Jtg7N58nUD6ltcrh', art: 'matcha-latte', frame: 'iced-sit-in' },
  { id: '1K-SYKX5-bAx8RpDircCr15wVmA5zqsRq', art: 'matcha-latte', frame: 'iced-takeaway' },

  { id: '1MxjPNXR4gEKz5Z7JkNfRgE52ccgbWq2v', art: 'mango-matcha', frame: 'iced-sit-in' },
  { id: '1tf99SqngNTSM2R0vtr0fVmzUAi_M7bcw', art: 'mango-matcha', frame: 'iced-takeaway' },

  { id: '1lXRQl3z_YXPgmtOoomZa_rDbAqdvaC0G', art: 'strawberry-matcha', frame: 'iced-sit-in' },
  { id: '1Uqaipy41Ny9LXj6xnfZ2yFJg-g4SnG9Z', art: 'strawberry-matcha', frame: 'iced-takeaway' },

  { id: '1hH1sa5unVlhwzhykVl4Ry-6er5_1_rCo', art: 'vanilla-matcha', frame: 'iced-sit-in' },
  { id: '1-fTG2_pZIeV-l0l7Zupt8ywyQMB05B4b', art: 'vanilla-matcha', frame: 'iced-takeaway' },
  { id: '1rV-PV5Mq1O316zWBBQOwuDP8dx4hVm5J', art: 'vanilla-matcha', frame: 'iced-can' },

  { id: '1AAQNDlQ4JrnhU29h2LG_wmJ79yVQVWOD', art: 'ube-latte', frame: 'hot-sit-in' },
  { id: '1VtKD-mXpeUGBCtLZmyWj54GCGiicbQaK', art: 'ube-latte', frame: 'hot-takeaway' },
  { id: '1QENqVtI2IiBDvkXR7Gj9BQAreAZY_EoJ', art: 'ube-latte', frame: 'iced-sit-in' },
  { id: '1qwusVSWTCxLbNt0nELczMAKv6EFJ0Y6t', art: 'ube-latte', frame: 'iced-takeaway' },
  { id: '1jkjObWnFJKn804g_VWiFQ8HQ0uX9bWpR', art: 'ube-latte', frame: 'iced-can' },

  { id: '1uIvQLSqkcGw4535udfIuaufyolRzzM25', art: 'strawberry-ube', frame: 'iced-sit-in' },
  { id: '1VopvoyRKKAzUXwQUTTqEWaUflAu-SvVs', art: 'strawberry-ube', frame: 'iced-takeaway' },

  // ── Smoothies ─────────────────────────────────────────────────────────────
  { id: '1-OWCPeKkshDUuonEZ2lXDjrbFHuiekZF', art: 'strawberry-sunrise', frame: 'iced-sit-in' },
  { id: '1ACeB1hKcoAsTseWx6RqevGruwHqH2Ocz', art: 'strawberry-sunrise', frame: 'iced-takeaway' },
  { id: '1SVJrkv51lUhl1Fxr7eMF_sJmg7V6LYTu', art: 'strawberry-sunrise', frame: 'iced-can' },

  { id: '1u14bTh8bm_E6xW3iGVMw5MAlXe5X58EK', art: 'berry-blast', frame: 'iced-sit-in' },
  { id: '1LzrPykfYbcQl7YuZRWVcDlsaibrssYgt', art: 'berry-blast', frame: 'iced-takeaway' },
  { id: '1bWmVs7-5IirFwZ_zk3hQYkYj0sSR1UUJ', art: 'berry-blast', frame: 'iced-can' },

  { id: '1ayhDqpsxDKYmpU6hS9lRcznZFjgyqM-c', art: 'tropical', frame: 'iced-sit-in' },
  { id: '1lNxx9EFA6ecA2NNTLARKKZZrSHl1-YDw', art: 'tropical', frame: 'iced-takeaway' },
  { id: '1_CTZXn7MV6yOYqQci9arT7pxXG32hNL1', art: 'tropical', frame: 'iced-can' },

  { id: '1l_WkNWjDJ8914gni3YLQ0VulEGmaJevx', art: 'gym-nut', frame: 'iced-sit-in' },
  { id: '1xT72_fR2Ky2ONmPY3-myJQSsqohJ5aDM', art: 'gym-nut', frame: 'iced-takeaway' },
  { id: '1gbMOyY5zi3T2cd82u6pPeV4HLjBsXIVY', art: 'gym-nut', frame: 'iced-can' },

  // ── Juice ─────────────────────────────────────────────────────────────────
  { id: '1WCVWWllYN8RxF_-MsuIXlOj_-uVDEEhl', art: 'fresh-orange-juice', frame: 'iced-sit-in' },
  { id: '1qF0hJuwRzu8ZhvmnbJ5FzNZg5XJQEZxS', art: 'fresh-orange-juice', frame: 'iced-takeaway' },
  { id: '1RU5wXSV_ljUsHVjErs8rE2UPR-T8aBPu', art: 'fresh-orange-juice', frame: 'iced-can' },

  // ── The fridge ────────────────────────────────────────────────────────────
  // Bottles and cans have no temperature: `na`.
  { id: '1FrdLwDmjcMWpuEkEVrxvQTzwjqxCoPvb', art: 'coca-cola', frame: 'na-takeaway' },
  { id: '1UlrKTNWjXTdSVB62IeZV9ZFT0r0nmyW9', art: 'coca-cola-zero', frame: 'na-takeaway' },
  { id: '1PPdRzOBBZGAMdbCQyx_LX1Bx-04Vit-T', art: 'fanta-orange', frame: 'na-takeaway' },
  { id: '1iSAKEr53Tx34qiZJIwKMpaE8qi-pvGhd', art: 'fanta-lemon', frame: 'na-takeaway' },
  { id: '1ES7mpEa_GURdi8giyq0PCLJ6wEmxoqgr', art: 'sprite', frame: 'na-takeaway' },
  { id: '1hVgCptZle4g5R7eAkS27PRwKOPkNcfHG', art: 'aquarius', frame: 'na-takeaway' },
  { id: '1B9nskQiMLQn63NOvUMEexGt488LMm_4B', art: 'iced-tea', frame: 'na-takeaway' },
  { id: '1KxMJ0M3fNaNXNQDKUlOimaCnQhZSJYJ0', art: 'water', frame: 'na-takeaway' },
  { id: '1wB_aTLClvMqmrRKrS_jBf0OVoz6yS8vD', art: 'sparkling-water', frame: 'na-takeaway' },
  { id: '13lbZ3e1w_Xy4VOqN4gYfp3UDyrEB4Tav', art: 'powerade', frame: 'na-takeaway' },
  { id: '15vQcpKgeM-TsySeT7qmQiq6TUfcWFeJA', art: 'corona', frame: 'na-takeaway' },
  { id: '1X9IDLE3Zob80rNEVB6rQnzUkL1gX4nMl', art: 'estrella-galicia', frame: 'na-takeaway' },
];

/**
 * Bottle shots for the syrup and purée rails, keyed by the Square modifier name
 * they belong to (normalized at build time).
 *
 * One bottle can answer to more than one name: the strawberry purée shot is the
 * same bottle whether Square calls it "Strawberry" on the purée list or
 * "Fresca" on the syrup list.
 */
export const SYRUP_ART_SOURCES: Array<{ id: string; slug: string; modifiers: string[] }> = [
  { id: '1TMU2aehPxa56UDKWfM7x_sfJMwjSrqs0', slug: 'vanilla', modifiers: ['Vanilla'] },
  {
    id: '175Qi84MRDjB1oSIc4pFtNYeEJuIxECIO',
    slug: 'vanilla-sugar-free',
    modifiers: ['Vanilla - Sugar Free'],
  },
  { id: '1fmnYSmBofOdptoZBkYMNQzF8fcy4yzEO', slug: 'caramel', modifiers: ['Caramel'] },
  {
    id: '1N_AgYaqKRPWjmpvcjdrAl7ftLEcWMf0X',
    slug: 'caramel-sugar-free',
    modifiers: ['Caramel - Sugar Free'],
  },
  {
    id: '1RwyNGEncOBdmvytEEtrkRDA05HyL1kO6',
    slug: 'salted-caramel',
    modifiers: ['Salted Caramel'],
  },
  { id: '1-OJ7r8FrRCBcVNrbrgBJIiHHUtn2oT5u', slug: 'hazelnut', modifiers: ['Hazelnut'] },
  { id: '1ggKHObhUEu-e6-CE165vM9i0xFIHamA8', slug: 'curacao', modifiers: ['Curacao'] },
  {
    id: '12znjPOjvcRXXJfI8tw7weib7GBTs-fgw',
    slug: 'strawberry',
    modifiers: ['Strawberry', 'Fresca'],
  },
  { id: '1jYVQC27ac5FO3mRoagohyvF9XlRrWv4A', slug: 'mango', modifiers: ['Mango'] },
  {
    id: '1nW2FOAtB7VhnoB0JLWOB2eOFYZEFPBi5',
    slug: 'passion-fruit',
    modifiers: ['Passion Fruit'],
  },
];
