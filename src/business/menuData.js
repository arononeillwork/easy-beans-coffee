/*
 * menuData.js — Easy Beans drinks + food menu, bilingual.
 * Allergen codes: 'dairy' | 'gluten' | 'eggs' | 'nuts' | 'soy'.
 * Drinks: no allergens (milk is customisable). Food: allergens shown.
 * Prices: single-price items use `price`; hot/iced items use `priceHot`/`priceIced`.
 * Source: business price list.
 */

export const drinkSections = [
  {
    id: 'classics',
    title: { en: 'Coffee', es: 'Café' },
    items: [
      { name: { en: 'Espresso',        es: 'Espresso' },        priceHot: '€2.40' },
      { name: { en: 'Americano',       es: 'Americano' },       priceHot: '€2.80', priceIced: '€3.60' },
      { name: { en: 'Cortado',         es: 'Cortado' },         priceHot: '€3.00', priceIced: '€3.80' },
      { name: { en: 'Double Cortado',  es: 'Cortado Doble' },   priceHot: '€3.50', priceIced: '€4.30' },
      { name: { en: 'Cappuccino',      es: 'Cappuccino' },      priceHot: '€3.50', priceIced: '€4.30' },
      { name: { en: 'Flat White',      es: 'Flat White' },      priceHot: '€3.80', priceIced: '€4.60' },
      { name: { en: 'Latte',           es: 'Latte' },           priceHot: '€4.00', priceIced: '€4.80' },
      { name: { en: 'Bumble Coffee',   es: 'Bumble Coffee' },                      priceIced: '€6.00' },
      { name: { en: 'Mocha',           es: 'Mocha' },           priceHot: '€4.50' },
      { name: { en: 'Hot Chocolate',   es: 'Chocolate Caliente' }, priceHot: '€4.00' },
      { name: { en: 'Irish Tea (Barrys & Lyons)', es: 'Té Irlandés (Barrys & Lyons)' }, priceHot: '€3.00' },
    ],
    extras: [
      { name: { en: 'Add Espresso Shot', es: 'Añadir Shot de Espresso' }, price: '+€0.50' },
    ],
    note: {
      heading: { en: 'Milk Alternative', es: 'Alternativa de Leche' },
      options: [
        { en: 'Semi-skimmed', es: 'Semidesnatada' },
        { en: 'Lactose-free', es: 'Sin lactosa' },
        { en: 'Oat',          es: 'Avena' },
        { en: 'Almond',       es: 'Almendra' },
        { en: 'Coconut',      es: 'Coco' },
      ],
    },
  },

  {
    id: 'specialty',
    title: { en: 'Specialty Drinks', es: 'Bebidas Especiales' },
    items: [
      { name: { en: 'Matcha Latte',     es: 'Matcha Latte' },     priceHot: '€5.50', priceIced: '€6.50' },
      { name: { en: 'Chai Latte',       es: 'Chai Latte' },       priceHot: '€4.50', badge: { en: 'Coming soon', es: 'Próximamente' } },
      { name: { en: 'Pink Chai Latte',  es: 'Pink Chai Latte' },  priceHot: '€5.50', priceIced: '€6.50' },
      { name: { en: 'Ube Latte',        es: 'Ube Latte' },        priceHot: '€5.50', priceIced: '€6.50' },
      { name: { en: 'Ube Matcha Latte', es: 'Ube Matcha Latte' },                    priceIced: '€7.90' },
      { name: { en: 'Cold Brew',        es: 'Cold Brew' },                           priceIced: '€4.70' },
    ],
    notes: [
      {
        heading: { en: 'Syrups  +€0.50', es: 'Siropes  +€0.50' },
        options: [
          { en: 'Caramel',      es: 'Caramelo' },
          { en: 'Hazelnut',     es: 'Avellana' },
          { en: 'Vanilla',      es: 'Vainilla' },
          { en: 'Mango',        es: 'Mango' },
          { en: 'Strawberry',   es: 'Fresa' },
          { en: 'Passion Fruit', es: 'Maracuyá' },
        ],
      },
      {
        heading: { en: 'Purées  +€0.50', es: 'Purés  +€0.50' },
        options: [
          { en: 'Passion Fruit', es: 'Maracuyá' },
          { en: 'Mango',         es: 'Mango' },
          { en: 'Strawberry',    es: 'Fresa' },
        ],
      },
    ],
  },

  {
    id: 'cold',
    title: { en: 'Cold Drinks', es: 'Bebidas Frías' },
    items: [
      { name: { en: 'Fresh Orange Juice', es: 'Zumo de Naranja Natural' }, price: '€3.80' },
      { name: { en: 'Water',              es: 'Agua' },                     price: '€2.50' },
      { name: { en: 'Sparkling Water',    es: 'Agua con Gas' },            price: '€3.00' },
      { name: { en: 'Apple Juice',        es: 'Zumo de Manzana' },         price: '€2.50' },
      { name: { en: 'Fanta Lemon',        es: 'Fanta Limón' },             price: '€2.50' },
      { name: { en: 'Fanta',              es: 'Fanta' },                   price: '€2.50' },
      { name: { en: 'Sprite',             es: 'Sprite' },                  price: '€2.50' },
      { name: { en: 'Coca Cola',          es: 'Coca Cola' },               price: '€2.50' },
      { name: { en: 'Coca Cola Zero',     es: 'Coca Cola Zero' },          price: '€2.50' },
      { name: { en: 'Aquarius (Plain)',   es: 'Aquarius (Normal)' },       price: '€2.50' },
      { name: { en: 'Aquarius (Orange)',  es: 'Aquarius (Naranja)' },      price: '€2.50' },
      { name: { en: 'Iced Tea',           es: 'Té Helado' },               price: '€2.50' },
      { name: { en: 'Powerade',           es: 'Powerade' },                price: '€3.00' },
      { name: { en: 'Corona',             es: 'Corona' },                  price: '€3.00' },
      { name: { en: 'Estrella Galicia',   es: 'Estrella Galicia' },        price: '€3.00' },
    ],
  },
];

export const foodSections = [
  {
    id: 'smoothies',
    title: { en: 'Smoothies', es: 'Smoothies' },
    items: [
      { name: { en: 'Strawberry Sunrise', es: 'Strawberry Sunrise' }, price: '€6.50', allergens: [] },
      { name: { en: 'Tropical',           es: 'Tropical' },           price: '€6.50', allergens: [] },
      { name: { en: 'Gym Nut',            es: 'Gym Nut' },            price: '€6.50', allergens: ['nuts'] },
      { name: { en: 'Berry Blast',        es: 'Berry Blast' },        price: '€6.50', allergens: [] },
    ],
  },

  {
    id: 'bakery',
    title: { en: 'Bakery', es: 'Panadería' },
    items: [
      { name: { en: 'Croissant (Plain)',    es: 'Croissant' },                price: '€2.70', allergens: ['gluten', 'dairy', 'eggs'] },
      { name: { en: 'Cinnamon Swirl',       es: 'Rollo de Canela' },          price: '€3.30', allergens: ['gluten', 'dairy', 'eggs'] },
      { name: { en: 'Raisin Butter Swirl',  es: 'Rollo de Pasas' },           price: '€3.00', allergens: ['gluten', 'dairy', 'eggs'] },
      { name: { en: 'Gluten Free Brownie',  es: 'Brownie Sin Gluten' },       price: '€3.80', allergens: ['dairy', 'eggs'] },
      { name: { en: 'Pain au Chocolat',     es: 'Pain au Chocolat' },         price: '€2.50', allergens: ['gluten', 'dairy', 'eggs'] },
      { name: { en: 'Pistachio Cheesecake', es: 'Tarta de Queso de Pistacho' }, price: '€6.40', allergens: ['gluten', 'dairy', 'eggs', 'nuts'] },
    ],
  },

  {
    id: 'cans',
    title: { en: 'Cans', es: 'Latas' },
    items: [
      { name: { en: 'Mango Chia Pudding',     es: 'Pudín de Chía y Mango' },     price: '€4.50', allergens: [] },
      { name: { en: 'Strawberry Chia Pudding', es: 'Pudín de Chía y Fresa' },    price: '€4.50', allergens: [] },
      { name: { en: 'Biscoff Cheesecake',     es: 'Tarta de Queso Biscoff' },    price: '€4.50', allergens: ['gluten', 'dairy', 'eggs', 'soy'] },
      { name: { en: 'Fruit Can',              es: 'Lata de Fruta' },             price: '€5.00', allergens: [] },
    ],
  },
];

export const allergenInfo = {
  dairy:  { label: { en: 'Dairy',  es: 'Lácteos' },      short: 'D', color: '#c75a5a' },
  gluten: { label: { en: 'Gluten', es: 'Gluten' },       short: 'G', color: '#d89a3f' },
  eggs:   { label: { en: 'Eggs',   es: 'Huevos' },       short: 'E', color: '#e0b04a' },
  nuts:   { label: { en: 'Nuts',   es: 'Frutos Secos' }, short: 'N', color: '#a85a2c' },
  soy:    { label: { en: 'Soy',    es: 'Soja' },         short: 'S', color: '#7a8b6e' },
};

export const t = {
  drinks:           { en: 'Drinks',                     es: 'Bebidas' },
  food:             { en: 'Food',                       es: 'Comida' },
  hot:              { en: 'Hot',                         es: 'Caliente' },
  iced:             { en: 'Iced',                        es: 'Frío' },
  allergensHeading: { en: 'Allergens',                  es: 'Alérgenos' },
  allergensNote:    { en: 'Allergen info is indicative — please ask staff if you have a severe allergy.',
                      es: 'La información de alérgenos es orientativa — pregunta al personal si tienes alergia grave.' },
  tagline:          { en: 'Coffee, matcha, and good energy.',
                      es: 'Café, matcha y buena energía.' },
};
