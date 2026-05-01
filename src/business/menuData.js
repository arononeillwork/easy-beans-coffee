/*
 * menuData.js — Easy Beans drinks + food menu, bilingual.
 * Allergen codes: 'dairy' | 'gluten' | 'eggs' | 'nuts' | 'soy'.
 * Drinks: no allergens (milk is customisable). Food: allergens shown.
 * Source: printed PDF for drinks, business spreadsheet for food.
 */

export const drinkSections = [
  {
    id: 'classics',
    title: { en: 'The Classics', es: 'Los Clásicos' },
    items: [
      { name: { en: 'Espresso',         es: 'Espresso' },        price: '€2.30' },
      { name: { en: 'Double Espresso',  es: 'Espresso Doble' },  price: '€3.40' },
      { name: { en: 'Americano',        es: 'Americano' },       price: '€2.90' },
      { name: { en: 'Coffee with Milk', es: 'Café con Leche' },  price: '€3.20' },
      { name: { en: 'Cappuccino',       es: 'Cappuccino' },      price: '€3.80' },
      { name: { en: 'Latte',            es: 'Latte' },           price: '€3.80' },
      { name: { en: 'Flat White',       es: 'Flat White' },      price: '€4.00' },
      { name: { en: 'Mocha',            es: 'Mocha' },           price: '€4.20' },
    ],
    extras: [
      { name: { en: 'Add Espresso Shot', es: 'Añadir Shot de Espresso' }, price: '+€1.00' },
    ],
    note: {
      heading: { en: 'Milk Alternative  +€0.50', es: 'Alternativa de Leche  +€0.50' },
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
    title: { en: 'Specialty Coffee', es: 'Cafés Especiales' },
    items: [
      { name: { en: 'Iced Latte',                 es: 'Iced Latte' },              price: '€4.30' },
      { name: { en: 'Matcha Latte',               es: 'Matcha Latte' },            price: '€4.50' },
      { name: { en: 'Matcha',                     es: 'Matcha' },                  price: '€4.50' },
      { name: { en: 'Tea (Green / Irish / English)', es: 'Té (Verde / Irlandés / Inglés)' }, price: '€3.00' },
      { name: { en: 'Hot Chocolate',              es: 'Chocolate Caliente' },      price: '€4.80' },
    ],
    extras: [
      { name: { en: 'Add Sauce', es: 'Añadir Sirope' }, price: '+€1.00' },
    ],
  },

  {
    id: 'other',
    title: { en: 'Other Drinks', es: 'Otras Bebidas' },
    items: [
      { name: { en: 'Water Bottle',          es: 'Agua' },                    price: '€2.00' },
      { name: { en: 'Soda (Fizzy / Iced Tea)', es: 'Refresco (Fizzy / Iced Tea)' }, price: '€3.00' },
      { name: { en: 'Sparkling Water',       es: 'Agua con Gas' },            price: '€3.00' },
      { name: { en: 'Fresh Orange Juice',    es: 'Zumo de Naranja Natural' }, price: '€4.50' },
      { name: { en: 'Apple Juice',           es: 'Zumo de Manzana' },         price: '€3.50' },
    ],
  },
];

export const foodSections = [
  {
    id: 'smoothies',
    title: { en: 'Smoothies', es: 'Smoothies' },
    items: [
      { name: { en: 'Organic Açai Berry', es: 'Açai Berry Orgánico' }, price: '€7.50', allergens: [] },
      { name: { en: 'Energy Boost',       es: 'Energy Boost' },        price: '€7.50', allergens: [] },
      { name: { en: "Runner's High",      es: "Runner's High" },       price: '€7.50', allergens: [] },
      { name: { en: 'Gym Nut',            es: 'Gym Nut' },             price: '€8.00', allergens: ['nuts'] },
      { name: { en: 'Mango Glow',         es: 'Mango Glow' },          price: '€7.50', allergens: [] },
      { name: { en: 'Strawberry Blast',   es: 'Strawberry Blast' },    price: '€7.50', allergens: [] },
    ],
    extras: [
      { name: { en: 'Add Item',    es: 'Añadir Ingrediente' }, price: '+€1.00' },
      { name: { en: 'Add Protein', es: 'Añadir Proteína' },    price: '+€2.00' },
    ],
  },

  {
    id: 'bakery',
    title: { en: 'Bakery', es: 'Panadería' },
    items: [
      { name: { en: 'Croissant (Plain)',    es: 'Croissant' },              price: '€3.00', allergens: ['gluten', 'dairy', 'eggs'] },
      { name: { en: 'Pistachio Croissant',  es: 'Croissant de Pistacho' },  price: '€4.00', allergens: ['gluten', 'dairy', 'eggs', 'nuts'] },
      { name: { en: 'Almond Croissant',     es: 'Croissant de Almendras' }, price: '€4.00', allergens: ['gluten', 'dairy', 'eggs', 'nuts'] },
      { name: { en: 'Raspberry Tart',       es: 'Tarta de Frambuesa' },     price: '€5.50', allergens: ['gluten', 'dairy', 'eggs'] },
      { name: { en: 'Pavlova',              es: 'Pavlova' },                price: '€5.50', allergens: ['dairy', 'eggs'] },
      { name: { en: 'Normande Tart',        es: 'Tarta Normande' },         price: '€5.50', allergens: ['gluten', 'dairy', 'eggs', 'nuts'] },
      { name: { en: 'Lemon Tart',           es: 'Tarta de Limón' },         price: '€5.50', allergens: ['gluten', 'dairy', 'eggs'] },
      { name: { en: 'Brownie',              es: 'Brownie' },                price: '€4.90', allergens: ['gluten', 'dairy', 'eggs'] },
    ],
  },

  {
    id: 'dining',
    title: { en: 'Dining In', es: 'Para Comer Aquí' },
    items: [
      { name: { en: 'Açai Bowl',                  es: 'Açai Bowl' },                  price: '€11.00', allergens: ['gluten', 'nuts'] },
      { name: { en: 'Avocado & Toast',            es: 'Tostada con Aguacate' },       price: '€8.00',  allergens: ['gluten'] },
      { name: { en: 'Toast (Jam / Olive Oil / Butter)', es: 'Tostada (Mermelada / Aceite / Mantequilla)' }, price: '€3.00', allergens: ['gluten', 'dairy'] },
      { name: { en: 'Ham & Cheese Croissant',     es: 'Croissant de Jamón y Queso' }, price: '€4.00',  allergens: ['gluten', 'dairy', 'eggs'] },
      { name: { en: 'Toastie (Ham & Cheese)',     es: 'Tostado (Jamón y Queso)' },    price: '€4.00',  allergens: ['gluten', 'dairy'] },
    ],
  },

  {
    id: 'grabngo',
    title: { en: 'Grab & Go', es: 'Para Llevar' },
    items: [
      { name: { en: 'Iced Coffee',         es: 'Café Helado' },          price: '€2.30', allergens: ['dairy'] },
      { name: { en: 'Matcha',              es: 'Matcha' },               price: '€3.40', allergens: ['dairy'] },
      { name: { en: 'Overnight Oats',      es: 'Avena Nocturna' },       price: '€2.90', allergens: ['gluten', 'dairy'] },
      { name: { en: 'Organic Açai Bowl',   es: 'Açai Bowl Orgánico' },   price: '€3.80', allergens: ['gluten', 'nuts'] },
      { name: { en: 'Protein Pots',        es: 'Vasitos de Proteína' },                  allergens: ['dairy'] },
      { name: { en: 'Dessert Pots (Oreo / Biscoff)', es: 'Vasitos de Postre (Oreo / Biscoff)' }, allergens: ['gluten', 'dairy', 'eggs', 'soy'] },
      { name: { en: 'Fruit Pots',          es: 'Vasitos de Fruta' },                     allergens: [] },
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
  allergensHeading: { en: 'Allergens',                  es: 'Alérgenos' },
  allergensNote:    { en: 'Allergen info is indicative — please ask staff if you have a severe allergy.',
                      es: 'La información de alérgenos es orientativa — pregunta al personal si tienes alergia grave.' },
  tagline:          { en: 'Coffee, matcha, and good energy.',
                      es: 'Café, matcha y buena energía.' },
};
