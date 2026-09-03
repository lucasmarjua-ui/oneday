// NPC portraits are deliberately not the full paper-doll layer system --
// just a bust silhouette tinted in that NPC's own color, enough to recognize
// a recurring face across cards without a second character-art pipeline.
export function findNpc(era, npcId) {
  return (era.npcs || []).find(npc => npc.id === npcId) || null;
}

export function renderNpcPortraitSVG(npc) {
  const color = npc?.portraitColor || '#999999';
  return `<svg viewBox="0 0 100 100" class="npc-portrait-svg" aria-hidden="true">
    <circle cx="50" cy="50" r="48" fill="${color}" opacity="0.16"/>
    <circle cx="50" cy="38" r="18" fill="${color}"/>
    <path d="M18 90 Q18 60 50 60 Q82 60 82 90 Z" fill="${color}"/>
  </svg>`;
}
