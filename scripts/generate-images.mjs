// Generates the product placeholder images in public/images.
// Run with: node scripts/generate-images.mjs
import { mkdirSync, writeFileSync } from 'node:fs';

// Warm tints that match the cream / ink / gold theme.
const backgrounds = ['#f6e7bf', '#f5dcc8', '#e6eef6', '#efe6d6'];

const art = {
  ducks: `
    <ellipse cx="200" cy="200" rx="95" ry="62" fill="#facc15"/>
    <circle cx="150" cy="122" r="48" fill="#facc15"/>
    <path d="M100 122 l-38 10 l38 12 z" fill="#f97316"/>
    <circle cx="140" cy="110" r="7" fill="#1f2937"/>
    <path d="M215 170 q40 -10 60 30 q-40 10 -60 -30z" fill="#eab308"/>`,
  keyboards: `
    <rect x="60" y="110" width="280" height="130" rx="16" fill="#334155"/>
    ${Array.from({ length: 4 }, (_, r) =>
      Array.from(
        { length: 10 },
        (__, c) =>
          `<rect x="${76 + c * 25.5}" y="${124 + r * 26}" width="20" height="20" rx="4" fill="#e2e8f0"/>`,
      ).join(''),
    ).join('')}`,
  coffee: `
    <path d="M120 120 h150 l-15 140 a20 20 0 0 1 -20 18 h-80 a20 20 0 0 1 -20 -18z" fill="#78350f"/>
    <path d="M268 150 a35 35 0 0 1 0 70" stroke="#78350f" stroke-width="16" fill="none"/>
    <rect x="112" y="108" width="166" height="20" rx="8" fill="#a16207"/>
    <path d="M160 90 q10 -20 0 -40 M195 90 q10 -20 0 -40 M230 90 q10 -20 0 -40" stroke="#57534e" stroke-width="6" fill="none" stroke-linecap="round"/>`,
  stickers: `
    <g transform="rotate(-8 200 180)">
      <rect x="95" y="90" width="210" height="160" rx="24" fill="#ffffff" stroke="#1f2937" stroke-width="6"/>
      <text x="200" y="185" font-family="monospace" font-size="54" font-weight="700" text-anchor="middle" fill="#dc2626">&lt;/bug&gt;</text>
    </g>`,
};

mkdirSync('public/images', { recursive: true });
for (const [category, body] of Object.entries(art)) {
  backgrounds.forEach((bg, i) => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="400" height="300"><rect width="400" height="300" fill="${bg}"/>${body}</svg>\n`;
    writeFileSync(`public/images/${category}-${i + 1}.svg`, svg);
  });
}
console.info('Generated', Object.keys(art).length * backgrounds.length, 'images');
