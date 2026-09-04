// Renders a shareable Daily Challenge result card, themed with the played
// era's own palette/fonts (era.theme) so each era's card feels like part of
// that world rather than one generic template reskinned three times.
const WIDTH = 1080;
const HEIGHT = 1150;

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

// `era` supplies theme.colors/fonts/icon; everything else is pre-localized,
// plain data -- this module has no i18n or game-model knowledge of its own.
export async function renderShareCardCanvas(canvas, { era, eraName, endingText, dateLabel, score, objectives, streak, appLabel }) {
  if (document.fonts?.ready) { try { await document.fonts.ready; } catch { /* draw with whatever is loaded */ } }

  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d');
  const colors = era.theme.colors;
  const heading = era.theme.fonts.heading;
  const body = era.theme.fonts.body;

  const gradient = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  gradient.addColorStop(0, colors.bg);
  gradient.addColorStop(1, colors.panel);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.strokeStyle = colors.accent;
  ctx.lineWidth = 6;
  ctx.strokeRect(24, 24, WIDTH - 48, HEIGHT - 48);

  ctx.textAlign = 'center';
  ctx.font = `120px ${body}`;
  ctx.fillStyle = colors.ink;
  ctx.fillText(era.theme.icon || '', WIDTH / 2, 200);

  ctx.font = `bold 60px ${heading}`;
  ctx.fillStyle = colors.accent;
  ctx.fillText(eraName, WIDTH / 2, 300);

  ctx.font = `36px ${heading}`;
  ctx.fillStyle = colors.ink;
  let y = drawWrapped(ctx, endingText, WIDTH / 2, 370, WIDTH - 200, 46);
  ctx.textAlign = 'center';

  ctx.font = `26px ${body}`;
  ctx.fillStyle = colors.inkSoft;
  y += 40;
  ctx.fillText(dateLabel, WIDTH / 2, y);

  if (score) {
    y += 100;
    ctx.font = `bold 110px ${heading}`;
    ctx.fillStyle = colors.accent;
    ctx.fillText(String(score.total), WIDTH / 2, y);
    y += 40;
    ctx.font = `24px ${body}`;
    ctx.fillStyle = colors.inkSoft;
    ctx.fillText('SCORE', WIDTH / 2, y);
  }

  y += 70;
  ctx.textAlign = 'left';
  ctx.font = `30px ${body}`;
  (objectives || []).forEach(entry => {
    ctx.fillStyle = entry.complete ? colors.accent : colors.inkSoft;
    ctx.fillText(entry.complete ? '✓' : '✗', 130, y);
    ctx.fillStyle = colors.ink;
    y = drawWrapped(ctx, entry.description, 175, y, WIDTH - 130 - 175, 38) + 20;
  });

  if (streak && streak.currentStreak > 1) {
    ctx.textAlign = 'center';
    ctx.font = `bold 34px ${heading}`;
    ctx.fillStyle = colors.accent;
    ctx.fillText(`🔥 ${streak.currentStreak}`, WIDTH / 2, y + 60);
  }

  ctx.textAlign = 'center';
  ctx.font = `bold 28px ${heading}`;
  ctx.fillStyle = colors.accentDark || colors.accent;
  ctx.fillText(appLabel || 'OneDay', WIDTH / 2, HEIGHT - 60);

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
