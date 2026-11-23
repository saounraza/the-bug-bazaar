import { CATEGORIES, type Category, type Product } from '../api/types';

export const PRODUCT_COUNT = 5000;

/**
 * Small seeded PRNG (mulberry32). A fixed seed means every reload, every test
 * run and every teammate sees the same 5,000 products with the same ids.
 */
export function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type CategoryCatalog = {
  adjectives: readonly string[];
  nouns: readonly string[];
  code: string;
  /** Whole-dollar price range; every price ends in .99. */
  dollars: readonly [min: number, max: number];
};

const CATALOG: Record<Category, CategoryCatalog> = {
  keyboards: {
    adjectives: [
      'Clacky',
      'Silent',
      'Tactile',
      'Linear',
      'Hot-Swap',
      'RGB',
      'Retro',
      'Low-Profile',
      'Wireless',
      'Ergonomic',
    ],
    nouns: [
      'Mechanical Keyboard',
      'Tenkeyless Board',
      '65% Keyboard',
      'Split Keyboard',
      'Ortholinear Board',
      'Macro Pad',
    ],
    code: 'KB',
    dollars: [49, 249],
  },
  ducks: {
    adjectives: [
      'Pirate',
      'Ninja',
      'Golden',
      'Rainbow',
      'Wizard',
      'Astronaut',
      'Sleepy',
      'Senior',
      'Junior',
      'Caffeinated',
    ],
    nouns: ['Rubber Duck', 'Debugging Duck', 'Pair-Programming Duck', 'Desk Duck', 'Mini Duck'],
    code: 'DK',
    dollars: [4, 24],
  },
  coffee: {
    adjectives: [
      'Dark Mode',
      'Midnight',
      'Hotfix',
      'Sprint',
      'Legacy',
      'Refactor',
      'Deploy Friday',
      'Stack Overflow',
      'Late Night',
      'Morning Standup',
    ],
    nouns: [
      'Espresso Beans',
      'Cold Brew',
      'Pour-Over Blend',
      'Decaf',
      'Single Origin',
      'Instant Coffee',
    ],
    code: 'CF',
    dollars: [9, 34],
  },
  stickers: {
    adjectives: [
      'Holographic',
      'Matte',
      'Glossy',
      'Vintage',
      'Glow-in-the-Dark',
      'Tiny',
      'Giant',
      'Die-Cut',
      'Vinyl',
      'Neon',
    ],
    nouns: [
      '"It Works on My Machine" Sticker',
      '"404" Sticker',
      'Semicolon Sticker',
      '"git push --force" Sticker',
      'Bug Sticker',
      'Sticker Pack',
    ],
    code: 'ST',
    dollars: [1, 7],
  },
};

function pick<T>(random: () => number, items: readonly T[]): T {
  const item = items[Math.floor(random() * items.length)];
  if (item === undefined) throw new Error('pick() called with an empty list');
  return item;
}

function between(random: () => number, min: number, max: number): number {
  return min + Math.floor(random() * (max - min + 1));
}

export function seedProducts(count = PRODUCT_COUNT, seed = 42): Product[] {
  const random = createRandom(seed);
  const products: Product[] = [];

  for (let i = 0; i < count; i++) {
    const category = CATEGORIES[i % CATEGORIES.length] as Category;
    const catalog = CATALOG[category];
    const number = String(i + 1).padStart(4, '0');
    const outOfStock = random() < 0.08;

    products.push({
      id: `p-${number}`,
      name: `${pick(random, catalog.adjectives)} ${pick(random, catalog.nouns)} ${catalog.code}-${number}`,
      price: between(random, catalog.dollars[0], catalog.dollars[1]) * 100 + 99,
      category,
      stock: outOfStock ? 0 : between(random, 1, 40),
      // Ratings skew positive like real stores: 2.5 to 5.0, one decimal.
      rating: Math.round((2.5 + random() * 2.5) * 10) / 10,
      imageUrl: `/images/${category}-${between(random, 1, 4)}.svg`,
    });
  }

  return products;
}
