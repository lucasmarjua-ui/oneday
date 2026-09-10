// The Daily Challenge result card, drawn in the same almanac identity as the
// rest of the game: paper ground, ink type, hairline rules, and the era's own
// accent hue as the single spot color. What varies per era is content only --
// its name, the persona the day produced, and its ending line.
const WIDTH = 1080;
const HEIGHT = 1350;

const PAPER = '#f7f2e8';
const INK = '#221d18';
const INK_SOFT = '#6f675e';
const RULE = '#d9d1c4';
const FONT_DISPLAY = "'Fraunces', Georgia, serif";
const FONT_MONO = "'IBM Plex Mono', monospace";
const FONT_BODY = "'Inter', sans-serif";

function wrapLines(ctx, text, maxWidth) {
  const words = String(text).split(' ');
  const lines = [];
  let line = '';
  words.forEach(word => {
    const candidate = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(candidate).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  });
  if (line) lines.push(line);
  return lines;
}

function drawWrapped(ctx, text, x, y, maxWidth, lineHeight) {
  const lines = wrapLines(ctx, text, maxWidth);
  lines.forEach((line, index) => ctx.fillText(line, x, y + index * lineHeight));
  return y + lines.length * lineHeight;
}

function rule(ctx, x1, y, x2, color = RULE, width = 1) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x1, y + 0.5);
  ctx.lineTo(x2, y + 0.5);
  ctx.stroke();
}

export async function renderShareCardCanvas(canvas, { eraName, accentHue = 28, personaName, endingText, dateLabel, score, objectives, streak, appLabel }) {
  if (document.fonts?.ready) { try { await document.fonts.ready; } catch { /* draw with whatever is loaded */ } }

  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d');
  const accent = `hsl(${accentHue} 58% 40%)`;
  const M = 96;
  const inner = WIDTH - M * 2;

  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = `hsl(${accentHue} 58% 40% / 0.06)`;
  ctx.fillRect(0, 0, WIDTH, 260);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  ctx.font = `500 24px ${FONT_MONO}`;
  ctx.fillStyle = INK_SOFT;
  ctx.fillText((appLabel || 'ONEDAY').toUpperCase(), M, 116);
  ctx.textAlign = 'right';
  ctx.fillText(String(dateLabel || ''), WIDTH - M, 116);
  ctx.textAlign = 'left';
  rule(ctx, M, 148, WIDTH - M, INK, 2);

  ctx.font = `28px ${FONT_MONO}`;
  ctx.fillStyle = accent;
  ctx.fillText(String(eraName || '').toUpperCase(), M, 210);

  ctx.font = `400 94px ${FONT_DISPLAY}`;
  ctx.fillStyle = INK;
  let y = drawWrapped(ctx, personaName || '', M, 316, inner, 104);

  ctx.font = `italic 32px ${FONT_DISPLAY}`;
  ctx.fillStyle = INK_SOFT;
  y = drawWrapped(ctx, endingText || '', M, y + 46, inner, 46);

  y += 40;
  rule(ctx, M, y, WIDTH - M);

  if (score) {
    y += 74;
    ctx.font = `400 110px ${FONT_DISPLAY}`;
    ctx.fillStyle = accent;
    ctx.fillText(String(score.total), M, y);
    ctx.font = `500 22px ${FONT_MONO}`;
    ctx.fillStyle = INK_SOFT;
    ctx.fillText('SCORE', M + ctx.measureText(String(score.total)).width + 220, y - 8);
    y += 34;
    rule(ctx, M, y, WIDTH - M);
  }

  y += 62;
  ctx.font = `500 22px ${FONT_MONO}`;
  ctx.fillStyle = INK_SOFT;
  ctx.fillText('OBJECTIVES', M, y);
  y += 30;

  (objectives || []).forEach(entry => {
    rule(ctx, M, y, WIDTH - M);
    y += 44;
    ctx.font = `26px ${FONT_MONO}`;
    ctx.fillStyle = entry.complete ? accent : INK_SOFT;
    ctx.fillText(entry.complete ? '✓' : '✗', M, y);
    ctx.font = `28px ${FONT_BODY}`;
    ctx.fillStyle = entry.complete ? INK : INK_SOFT;
    y = drawWrapped(ctx, entry.description, M + 52, y, inner - 52, 38) + 18;
  });

  rule(ctx, M, y, WIDTH - M);

  if (streak && streak.currentStreak > 1) {
    y += 62;
    ctx.font = `500 26px ${FONT_MONO}`;
    ctx.fillStyle = accent;
    ctx.fillText(`${streak.currentStreak} DAY STREAK`, M, y);
  }

  rule(ctx, M, HEIGHT - 132, WIDTH - M, INK, 2);
  ctx.font = `400 40px ${FONT_DISPLAY}`;
  ctx.fillStyle = INK;
  ctx.fillText(appLabel || 'OneDay', M, HEIGHT - 80);
  ctx.textAlign = 'right';
  ctx.font = `22px ${FONT_MONO}`;
  ctx.fillStyle = INK_SOFT;
  ctx.fillText('ONE DAY. ONE ERA. YOUR CHOICES.', WIDTH - M, HEIGHT - 82);

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
