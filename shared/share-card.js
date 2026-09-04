// Renders a shareable Daily Challenge result card in OneDay's single global
// visual identity (navy/glass/serif) -- no per-era palette anymore. What
// still varies by era is content only: its icon and name, same as every
// other screen now.
const WIDTH = 1080;
const HEIGHT = 1150;

const PALETTE = {
  background: 'hsl(201 100% 13%)',
  panel: 'hsl(0 0% 10%)',
  foreground: 'hsl(0 0% 100%)',
  mutedForeground: 'hsl(240 4% 66%)',
  glassBorder: 'hsla(0, 0%, 100%, 0.28)',
};
const FONT_DISPLAY = "'Instrument Serif', serif";
const FONT_BODY = "'Inter', sans-serif";

function wrapLines(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  words.forEach(word => {
    const test = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(test).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  });
  if (line) lines.push(line);
  return lines;
}

function drawWrapped(ctx, text, x, y, maxWidth, lineHeight) {
  const lines = wrapLines(ctx, text, maxWidth);
  lines.forEach((line, i) => ctx.fillText(line, x, y + i * lineHeight));
  return y + lines.length * lineHeight;
}

// `era` supplies only its icon and name now; everything else is
// pre-localized, plain data -- this module has no i18n or game-model
// knowledge of its own.
export async function renderShareCardCanvas(canvas, { era, eraName, endingText, dateLabel, score, objectives, streak, appLabel }) {
  if (document.fonts?.ready) { try { await document.fonts.ready; } catch { /* draw with whatever is loaded */ } }

  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d');

  const gradient = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  gradient.addColorStop(0, PALETTE.background);
  gradient.addColorStop(1, PALETTE.panel);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // A thin, soft-edged border stands in for the liquid-glass highlight ring
  // used everywhere else -- a flat canvas has no real backdrop to blur.
  ctx.strokeStyle = PALETTE.glassBorder;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(24, 24, WIDTH - 48, HEIGHT - 48);

  ctx.textAlign = 'center';
  ctx.font = `120px ${FONT_BODY}`;
  ctx.fillStyle = PALETTE.foreground;
  ctx.fillText(era.theme?.icon || '', WIDTH / 2, 200);

  ctx.font = `56px ${FONT_DISPLAY}`;
  ctx.fillStyle = PALETTE.foreground;
  ctx.fillText(eraName, WIDTH / 2, 300);

  ctx.font = `32px ${FONT_DISPLAY}`;
  ctx.fillStyle = PALETTE.mutedForeground;
  let y = drawWrapped(ctx, endingText, WIDTH / 2, 370, WIDTH - 200, 44);
  ctx.textAlign = 'center';

  ctx.font = `24px ${FONT_BODY}`;
  ctx.fillStyle = PALETTE.mutedForeground;
  y += 40;
  ctx.fillText(dateLabel, WIDTH / 2, y);

  if (score) {
    y += 100;
    ctx.font = `bold 110px ${FONT_DISPLAY}`;
    ctx.fillStyle = PALETTE.foreground;
    ctx.fillText(String(score.total), WIDTH / 2, y);
    y += 40;
    ctx.font = `500 22px ${FONT_BODY}`;
    ctx.fillStyle = PALETTE.mutedForeground;
    ctx.fillText('SCORE', WIDTH / 2, y);
  }

  y += 70;
  ctx.textAlign = 'left';
  ctx.font = `30px ${FONT_BODY}`;
  (objectives || []).forEach(entry => {
    ctx.fillStyle = entry.complete ? PALETTE.foreground : PALETTE.mutedForeground;
    ctx.fillText(entry.complete ? '✓' : '✗', 130, y);
    ctx.fillStyle = PALETTE.foreground;
    y = drawWrapped(ctx, entry.description, 175, y, WIDTH - 130 - 175, 38) + 20;
  });

  if (streak && streak.currentStreak > 1) {
    ctx.textAlign = 'center';
    ctx.font = `500 34px ${FONT_BODY}`;
    ctx.fillStyle = PALETTE.foreground;
    ctx.fillText(`🔥 ${streak.currentStreak}`, WIDTH / 2, y + 60);
  }

  ctx.textAlign = 'center';
  ctx.font = `40px ${FONT_DISPLAY}`;
  ctx.fillStyle = PALETTE.mutedForeground;
  ctx.fillText(appLabel || 'OneDay', WIDTH / 2, HEIGHT - 55);

  return canvas;
}

export function downloadCanvasAsPng(canvas, filename) {
  canvas.toBlob(blob => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, 'image/png');
}
