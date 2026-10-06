// Shared pieces of interface for the historian's career: the rank line and
// medal tiles, used by the title screen's archive and the end-of-day summary.
import { icon } from './icons.js';
import { rankFor } from '../career-logic.js';

const escapeHtml = text => String(text).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));

/** A medal: coloured by tier when won, a padlock when not. */
export function medalTile(medal, won, { localize, t }) {
  return `<div class="medal-tile ${medal.tier} ${won ? 'won' : 'locked'}" title="${escapeHtml(won ? localize(medal.title) : t('medals.locked'))}">
    <span class="medal-icon">${won ? icon('medal', 3) : icon('lock', 3)}</span>
    <span class="medal-text"><strong>${escapeHtml(localize(medal.title))}</strong><span>${escapeHtml(localize(medal.description))}</span></span>
  </div>`;
}

/** The rank, the XP bar and how far it is to the next rank. */
export function rankBlock(xp, { localize, t }, { from = null } = {}) {
  const { rank, next, progress } = rankFor(xp);
  const start = from === null ? progress : from;
  const toNext = next ? t('career.toNext', { xp: next.xp - xp, rank: localize(next.name) }) : t('career.max');
  return `<div class="rank-block">
    <div class="rank-line"><span class="rank-medal">${icon('medal', 4)}</span><span><span class="t8 soft">${escapeHtml(t('career.xp', { xp }))}</span><strong class="rank-name">${escapeHtml(localize(rank.name))}</strong></span></div>
    <div class="xp-bar"><span style="width:${Math.round(start * 100)}%" data-to="${Math.round(progress * 100)}"></span></div>
    <p class="t8 soft xp-next">${escapeHtml(toNext)}</p>
  </div>`;
}

/** Grow every XP bar inside `root` to its target width on the next frame. */
export function animateXpBars(root) {
  requestAnimationFrame(() => requestAnimationFrame(() => {
    root.querySelectorAll('.xp-bar span[data-to]').forEach(bar => { bar.style.width = `${bar.dataset.to}%`; });
  }));
}
