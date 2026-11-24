// Gráficos do telescópio de raios gama, em <canvas>, no mesmo padrão de
// decayCharts.js: um histograma por painel (uma cor só, a do tema), com
// marcadores verticais tracejados (ex.: o raio de 68% ou o limiar do veto).

import { REPORT_CHART_COLORS } from './scatteringChart';

const FONT_FAMILY = 'Fraunces, Georgia, serif';

/**
 * Agrupa `values` em `bins` faixas iguais de [min, max). Valores >= max vão
 * para `overflow` (mostrado no texto, não no gráfico).
 */
export function histogram(values, min, max, bins) {
  const counts = new Array(bins).fill(0);
  let overflow = 0;
  const width = (max - min) / bins;
  for (const value of values) {
    if (!Number.isFinite(value)) continue;
    if (value >= max) {
      overflow += 1;
      continue;
    }
    const index = Math.floor((Math.max(value, min) - min) / width);
    counts[Math.min(bins - 1, index)] += 1;
  }
  return { counts, min, max, width, overflow };
}

export function niceStep(raw) {
  const safe = Math.max(raw, 1e-9);
  const magnitude = 10 ** Math.floor(Math.log10(safe));
  const fraction = safe / magnitude;
  const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;
  return nice * magnitude;
}

export function panelLayout(width, height) {
  const left = 40;
  const right = 10;
  const top = 8;
  const bottom = 34;
  return { left, top, width: Math.max(10, width - left - right), height: Math.max(10, height - top - bottom) };
}

export function barIndexAt(x, width, hist) {
  const plot = panelLayout(width, 0);
  const index = Math.floor(((x - plot.left) / plot.width) * hist.counts.length);
  return index >= 0 && index < hist.counts.length ? index : -1;
}

/**
 * @param {object} opts
 *   hist: saída de histogram(); xLabel; format(x) para os números do eixo X;
 *   markers: [{ x, label }] linhas verticais tracejadas; highlight: índice da
 *   barra sob o mouse; logScale.
 */
export function drawHistogramPanel(ctx, { width, height, hist, colors, xLabel, format = String, markers = [], highlight = -1, logScale = false }) {
  const plot = panelLayout(width, height);
  ctx.save();
  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, width, height);

  const max = Math.max(1, ...hist.counts);
  const ticks = [];
  let yOf;
  if (logScale) {
    const yMax = 10 ** Math.ceil(Math.log10(max * 1.5));
    const span = Math.log10(yMax) - Math.log10(0.5);
    yOf = (v) => plot.top + plot.height - ((Math.log10(Math.max(v, 0.5)) - Math.log10(0.5)) / span) * plot.height;
    for (let v = 1; v <= yMax; v *= 10) ticks.push(v);
  } else {
    const step = Math.max(1, niceStep(max / 4));
    const yMax = Math.ceil((max * 1.08) / step) * step;
    yOf = (v) => plot.top + plot.height - (v / yMax) * plot.height;
    for (let v = 0; v <= yMax + step / 2; v += step) ticks.push(v);
  }

  ctx.font = `10px ${FONT_FAMILY}`;
  ctx.lineWidth = 1;
  ctx.textBaseline = 'middle';
  for (const v of ticks) {
    const y = Math.round(yOf(v)) + 0.5;
    ctx.strokeStyle = colors.grid;
    ctx.beginPath();
    ctx.moveTo(plot.left, y);
    ctx.lineTo(plot.left + plot.width, y);
    ctx.stroke();
    ctx.fillStyle = colors.text;
    ctx.textAlign = 'right';
    ctx.fillText(String(v), plot.left - 5, y);
  }

  const barW = plot.width / hist.counts.length;
  if (highlight >= 0) {
    ctx.fillStyle = colors.highlight;
    ctx.fillRect(plot.left + highlight * barW, plot.top, barW, plot.height);
  }
  ctx.fillStyle = colors.bar;
  hist.counts.forEach((count, i) => {
    if (!count) return;
    const y = yOf(count);
    const gap = barW > 5 ? 1 : 0;
    ctx.fillRect(plot.left + i * barW + gap / 2, y, Math.max(1, barW - gap), plot.top + plot.height - y);
  });

  // eixo X
  ctx.strokeStyle = colors.axis;
  ctx.beginPath();
  ctx.moveTo(plot.left, plot.top + plot.height + 0.5);
  ctx.lineTo(plot.left + plot.width, plot.top + plot.height + 0.5);
  ctx.stroke();
  const range = hist.max - hist.min;
  const step = niceStep(range / 4);
  const xOf = (value) => plot.left + ((value - hist.min) / range) * plot.width;
  ctx.fillStyle = colors.text;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (let value = Math.ceil(hist.min / step) * step; value <= hist.max + 1e-9; value += step) {
    ctx.fillText(format(value), xOf(value), plot.top + plot.height + 4);
  }
  ctx.fillText(xLabel, plot.left + plot.width / 2, plot.top + plot.height + 18);

  // marcadores
  ctx.setLineDash([4, 3]);
  ctx.strokeStyle = colors.text;
  ctx.lineWidth = 1.2;
  for (const marker of markers) {
    if (marker.x == null || marker.x < hist.min || marker.x > hist.max) continue;
    const x = Math.round(xOf(marker.x)) + 0.5;
    ctx.beginPath();
    ctx.moveTo(x, plot.top);
    ctx.lineTo(x, plot.top + plot.height);
    ctx.stroke();
    if (marker.label) {
      ctx.setLineDash([]);
      ctx.font = `600 11px ${FONT_FAMILY}`;
      ctx.textBaseline = 'top';
      const right = x > plot.left + plot.width * 0.7;
      ctx.textAlign = right ? 'right' : 'left';
      ctx.fillText(marker.label, x + (right ? -4 : 4), plot.top + 2);
      ctx.setLineDash([4, 3]);
    }
  }
  ctx.restore();
}

/** Escala do eixo do erro angular: até ~1,5× o raio de 90%, de 2° a 30°. */
export function angleRange(errors) {
  if (!errors.length) return 10;
  const sorted = [...errors].sort((a, b) => a - b);
  const p90 = sorted[Math.min(sorted.length - 1, Math.floor(0.9 * sorted.length))];
  const raw = Math.min(30, Math.max(2, p90 * 1.5));
  const step = niceStep(raw / 5);
  return Math.ceil(raw / step) * step;
}

export function renderHistogramToDataURL(opts, { width = 640, height = 340 } = {}) {
  const scale = 2;
  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);
  drawHistogramPanel(ctx, { ...opts, width, height, colors: REPORT_CHART_COLORS });
  return canvas.toDataURL('image/png');
}
