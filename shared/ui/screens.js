// Screen transitions: a diagonal pixel wipe between pages, and the loading
// screen's progress bar. Pure DOM, no dependencies.
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function buildWipe(out) {
  const wipe = document.createElement('div');
  wipe.className = `wipe${out ? ' out' : ''}`;
  const cols = 16;
  const rows = Math.ceil((window.innerHeight / window.innerWidth) * cols) + 1;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const cell = document.createElement('span');
      // Sweep from the top-left corner to the bottom-right one.
      cell.style.animationDelay = `${(x + y) * 0.022}s`;
      wipe.appendChild(cell);
    }
  }
  document.body.appendChild(wipe);
  return { wipe, duration: (cols + rows) * 22 + 420 };
}

/** Cover the screen with pixels; resolves when it is fully covered. */
export function wipeIn() {
  if (reduced()) return Promise.resolve();
  const { duration } = buildWipe(false);
  return new Promise(resolve => setTimeout(resolve, duration));
}

/** Uncover the screen (used when a page has finished loading). */
export function wipeOut() {
  if (reduced()) return;
  const { wipe, duration } = buildWipe(true);
  setTimeout(() => wipe.remove(), duration);
}

export function setLoading(fraction) {
  const fill = document.querySelector('#loading-fill');
  if (fill) fill.style.width = `${Math.round(fraction * 100)}%`;
}

export function finishLoading() {
  const loading = document.querySelector('#loading');
  if (!loading) return;
  loading.classList.add('done');
  setTimeout(() => loading.remove(), 500);
}
