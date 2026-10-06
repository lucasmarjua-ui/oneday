// How the 3D character is dressed: which colours its `pal_*` materials take
// and which accessories (`acc_*` nodes of assets/models/character.glb) show.
// Pure, so the wardrobe is covered by tests.
import { playerPalette, npcPalette, SKIN_TONES } from './sprites.js';

// Accessories per event, for everybody, and per scene variant.
const EVENT_ACCESSORIES = {
  giza: ['acc_kilt'],
  'd-day': ['acc_combathelmet'],
};
const VARIANT_ACCESSORIES = {
  helmet: ['acc_spacehelmet', 'acc_visor', 'acc_backpack'],
};
// Who you are shows in what you wear.
const PLAYER_ACCESSORIES = {
  tenochtitlan: ['acc_skirt'],
  'd-day': ['acc_armband'],
};
const NPC_ACCESSORIES = {
  'npc-moctezuma': ['acc_feathers', 'acc_cape'],
  'npc-cortes': ['acc_morion'],
  'npc-hemiunu': ['acc_cape'],
};
const NPC_COLORS = {
  'npc-moctezuma': { cape: '#2f6f9e', feather: '#2fae7a' },
  'npc-hemiunu': { cape: '#f3ecd8' },
};

export const ACCESSORIES = [...new Set([
  ...Object.values(EVENT_ACCESSORIES).flat(),
  ...Object.values(VARIANT_ACCESSORIES).flat(),
  ...Object.values(PLAYER_ACCESSORIES).flat(),
  ...Object.values(NPC_ACCESSORIES).flat(),
])];

function colorsFrom(palette, variant, extra = {}) {
  const colors = {
    s: palette.s, h: palette.h, c: palette.c, C: palette.C, p: palette.p, f: palette.f, t: palette.t, e: palette.e || '#1b1620',
    helmet: palette.h, visor: '#d9a63a', cape: palette.t, feather: '#2fae7a', ...extra,
  };
  if (variant === 'helmet') {
    // A spacesuit: white helmet and gloves, a gold visor.
    Object.assign(colors, { helmet: '#f4f4f1', s: '#f2f1ec' });
  }
  return colors;
}

/** The player's look in an event, in a scene variant (e.g. 'helmet' on the Moon). */
export function playerLook(eraId, variant) {
  const base = playerPalette(eraId);
  return {
    colors: colorsFrom(base, variant),
    accessories: [...(EVENT_ACCESSORIES[eraId] || []), ...(VARIANT_ACCESSORIES[variant] || []), ...(PLAYER_ACCESSORIES[eraId] || [])],
  };
}

/** A named character's look: their own colour, their own insignia. */
export function npcLook(eraId, { id = null, color = '#7a5cc7', variant, skin = null } = {}) {
  const palette = { ...npcPalette(color, eraId), ...(skin !== null ? SKIN_TONES[skin % SKIN_TONES.length] : {}) };
  return {
    colors: colorsFrom(palette, variant, NPC_COLORS[id] || {}),
    accessories: [...(EVENT_ACCESSORIES[eraId] || []), ...(VARIANT_ACCESSORIES[variant] || []), ...(NPC_ACCESSORIES[id] || [])],
  };
}
