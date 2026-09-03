// Decorative background icon per decision card. Card JSON is intentionally
// left untouched (no new "category" field) -- this infers a category from
// the card's own id via keyword matching instead, purely presentational.
// A future era whose ids don't match any keyword just falls back to
// DEFAULT_CATEGORY, never breaks.
const DEFAULT_CATEGORY = 'default';

const CATEGORY_KEYWORDS = {
  combat: ['wrestl', 'thief', 'hunt', 'predator', 'security', 'patrol', 'watch'],
  water: ['water', 'hydro'],
  food: ['bread', 'diner', 'forag', 'meal'],
  market: ['market', 'haggle', 'merchant', 'broker', 'recruiter', 'charity', 'craftsman', 'tool-making'],
  explore: ['shrine', 'cave', 'server', 'rooftop', 'oracle', 'path'],
  social: ['agora', 'assembly', 'symposium', 'tavern', 'festival', 'dispute', 'poetry', 'performer', 'elder', 'boardroom', 'arcade', 'child', 'beggar', 'family', 'debate', 'ritual'],
  work: ['gymnasium', 'training', 'delivery', 'fire-keeping', 'injured'],
  rest: ['wake', 'nap-pod', 'shelter', 'sleep'],
};

export function classifyCardIcon(card) {
  const id = (card?.id || '').toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(keyword => id.includes(keyword))) return category;
  }
  return DEFAULT_CATEGORY;
}

const ICON_SHAPES = {
  market: '<rect x="22" y="42" width="56" height="42" rx="8"/><path d="M35 42 L35 30 Q35 18 50 18 Q65 18 65 30 L65 42" fill="none" stroke="currentColor" stroke-width="6"/>',
  food: '<ellipse cx="50" cy="58" rx="32" ry="18"/><rect x="30" y="34" width="40" height="16" rx="8"/>',
  water: '<path d="M50 15 C65 40 78 55 78 68 A28 28 0 0 1 22 68 C22 55 35 40 50 15 Z"/>',
  combat: '<rect x="46" y="15" width="8" height="70" rx="4" transform="rotate(20 50 50)"/><rect x="46" y="15" width="8" height="70" rx="4" transform="rotate(-20 50 50)"/>',
  explore: '<circle cx="50" cy="50" r="34" fill="none" stroke="currentColor" stroke-width="6"/><path d="M50 30 L58 50 L50 70 L42 50 Z"/>',
  social: '<ellipse cx="36" cy="42" rx="24" ry="18"/><path d="M26 56 L18 70 L40 58 Z"/><ellipse cx="68" cy="56" rx="18" ry="14"/>',
  work: '<circle cx="50" cy="50" r="16"/><rect x="44" y="10" width="12" height="24" rx="4"/><rect x="44" y="66" width="12" height="24" rx="4"/><rect x="10" y="44" width="24" height="12" rx="4"/><rect x="66" y="44" width="24" height="12" rx="4"/>',
  rest: '<path d="M62 18 A32 32 0 1 0 62 82 A26 26 0 1 1 62 18 Z"/>',
  default: '<rect x="20" y="15" width="60" height="70" rx="6" fill="none" stroke="currentColor" stroke-width="5"/><line x1="32" y1="35" x2="68" y2="35" stroke="currentColor" stroke-width="5"/><line x1="32" y1="50" x2="68" y2="50" stroke="currentColor" stroke-width="5"/><line x1="32" y1="65" x2="55" y2="65" stroke="currentColor" stroke-width="5"/>',
};

export function renderCardIconSVG(category) {
  const shape = ICON_SHAPES[category] || ICON_SHAPES[DEFAULT_CATEGORY];
  return `<svg viewBox="0 0 100 100" class="card-icon-watermark" aria-hidden="true">${shape}</svg>`;
}
