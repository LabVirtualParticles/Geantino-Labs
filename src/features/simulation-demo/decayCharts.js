// Gráficos do decaimento radioativo (rdecay01), desenhados em <canvas> no
// mesmo padrão de scatteringChart.js / pidChart.js:
//  - carta de nuclídeos: N (nêutrons) no eixo X, Z (prótons) no eixo Y; cada
//    núcleo da cadeia é um quadrado e cada decaimento uma seta. O traço da
//    seta diz o modo (alfa contínuo, beta⁻ tracejado, beta⁺/captura
//    pontilhado), além do rótulo — a identidade nunca depende só de cor.
//  - espectros: um painel por tipo de partícula (pequenos múltiplos).

import { REPORT_CHART_COLORS } from './scatteringChart';
import { MODE_SHORT, formatHalfLife } from './nuclide';

const FONT_FAMILY = 'Fraunces, Georgia, serif';

const MODE_DASH = {
  alpha: [],
  'beta-': [6, 4],
  'beta+': [2, 3],
  EC: [2, 3],
  n: [8, 3, 2, 3],
  p: [8, 3, 2, 3],
  other: [1, 3],
};

// ---------------------------------------------------------------------- //
// Carta de nuclídeos
// ---------------------------------------------------------------------- //

export function chartLayout(width, height, chain) {
  const margin = { left: 40, right: 14, top: 14, bottom: 38 };
  const ns = chain.nodes.map((node) => node.N);
  const zs = chain.nodes.map((node) => node.Z);
  const nMin = Math.min(...ns) - 1;
  const nMax = Math.max(...ns) + 1;
  const zMin = Math.min(...zs) - 1;
  const zMax = Math.max(...zs) + 1;
  const cols = nMax - nMin + 1;
  const rows = zMax - zMin + 1;
  const cell = Math.max(
    8,
    Math.min(64, (width - margin.left - margin.right) / cols, (height - margin.top - margin.bottom) / rows),
  );
  const plotW = cell * cols;
  const plotH = cell * rows;
  const left = margin.left + Math.max(0, (width - margin.left - margin.right - plotW) / 2);
  const top = margin.top;
  return {
    cell, left, top, plotW, plotH, nMin, nMax, zMin, zMax,
    // centro da célula (N, Z)
    cx: (N) => left + (N - nMin + 0.5) * cell,
    cy: (Z) => top + (zMax - Z + 0.5) * cell,
  };
}

export function chainNodeAt(x, y, width, height, chain) {
  if (!chain.nodes.length) return null;
  const layout = chartLayout(width, height, chain);
  return (
    chain.nodes.find(
      (node) =>
        Math.abs(x - layout.cx(node.N)) <= layout.cell / 2 &&
        Math.abs(y - layout.cy(node.Z)) <= layout.cell / 2,
    ) ?? null
  );
}

export function drawNuclideChart(ctx, { width, height, chain, colors, hoverKey }) {
  ctx.save();
  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, width, height);
  if (!chain.nodes.length) {
    ctx.restore();
    return;
  }
  const L = chartLayout(width, height, chain);

  // Grade de fundo (cada célula = um nuclídeo possível)
  ctx.strokeStyle = colors.grid;
  ctx.lineWidth = 1;
  for (let N = L.nMin; N <= L.nMax + 1; N += 1) {
    const x = Math.round(L.left + (N - L.nMin) * L.cell) + 0.5;
    ctx.beginPath();
    ctx.moveTo(x, L.top);
    ctx.lineTo(x, L.top + L.plotH);
    ctx.stroke();
  }
  for (let Z = L.zMin; Z <= L.zMax + 1; Z += 1) {
    const y = Math.round(L.top + (Z - L.zMin) * L.cell) + 0.5;
    ctx.beginPath();
    ctx.moveTo(L.left, y);
    ctx.lineTo(L.left + L.plotW, y);
    ctx.stroke();
  }

  // Eixos
  ctx.font = `10px ${FONT_FAMILY}`;
  ctx.fillStyle = colors.text;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const nStep = Math.max(1, Math.ceil(28 / L.cell));
  for (let N = L.nMin; N <= L.nMax; N += 1) {
    if ((N - L.nMin) % nStep) continue;
    ctx.fillText(String(N), L.cx(N), L.top + L.plotH + 4);
  }
  ctx.fillText('N (número de nêutrons)', L.left + L.plotW / 2, L.top + L.plotH + 18);
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  const zStep = Math.max(1, Math.ceil(16 / L.cell));
  for (let Z = L.zMin; Z <= L.zMax; Z += 1) {
    if ((Z - L.zMin) % zStep) continue;
    ctx.fillText(String(Z), L.left - 5, L.cy(Z));
  }
  ctx.save();
  ctx.translate(Math.max(10, L.left - 30), L.top + L.plotH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = 'center';
  ctx.fillText('Z (prótons)', 0, 0);
  ctx.restore();

  const byKey = new Map(chain.nodes.map((node) => [node.key, node]));

  // Setas
  for (const edge of chain.edges) {
    const from = byKey.get(edge.from);
    const to = byKey.get(edge.to);
    if (!from || !to) continue;
    const x1 = L.cx(from.N);
    const y1 = L.cy(from.Z);
    const x2 = L.cx(to.N);
    const y2 = L.cy(to.Z);
    const length = Math.hypot(x2 - x1, y2 - y1);
    const ux = (x2 - x1) / length;
    const uy = (y2 - y1) / length;
    const inset = L.cell * 0.42;
    const sx = x1 + ux * inset;
    const sy = y1 + uy * inset;
    const ex = x2 - ux * inset;
    const ey = y2 - uy * inset;
    ctx.strokeStyle = colors.bar;
    ctx.globalAlpha = edge.fraction < 0.05 ? 0.55 : 1;
    ctx.lineWidth = 1.6;
    ctx.setLineDash(MODE_DASH[edge.mode] ?? []);
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    ctx.setLineDash([]);
    // ponta
    const head = Math.min(7, L.cell * 0.22);
    ctx.fillStyle = colors.bar;
    ctx.beginPath();
    ctx.moveTo(ex, ey);
    ctx.lineTo(ex - ux * head - uy * head * 0.6, ey - uy * head + ux * head * 0.6);
    ctx.lineTo(ex - ux * head + uy * head * 0.6, ey - uy * head - ux * head * 0.6);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
    // rótulo do modo (+ % quando é um ramo)
    if (L.cell >= 18) {
      const label = MODE_SHORT[edge.mode] + (edge.fraction < 0.995 ? ` ${Math.round(edge.fraction * 1000) / 10}%` : '');
      ctx.font = `${Math.min(12, Math.max(9, L.cell * 0.3))}px ${FONT_FAMILY}`;
      ctx.fillStyle = colors.text;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, (sx + ex) / 2 - uy * 9, (sy + ey) / 2 + ux * 9);
    }
  }

  // Núcleos
  for (const node of chain.nodes) {
    const x = L.cx(node.N) - L.cell * 0.42;
    const y = L.cy(node.Z) - L.cell * 0.42;
    const size = L.cell * 0.84;
    const stable = node.halfLife == null;
    const isStart = node.key === chain.start;
    ctx.fillStyle = stable ? colors.bar : colors.background;
    ctx.fillRect(x, y, size, size);
    ctx.strokeStyle = colors.bar;
    ctx.lineWidth = isStart || node.key === hoverKey ? 2.5 : 1.2;
    ctx.strokeRect(x, y, size, size);
    if (L.cell >= 22) {
      ctx.fillStyle = stable ? colors.background : colors.text;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `600 ${Math.min(15, L.cell * 0.36)}px ${FONT_FAMILY}`;
      ctx.fillText(node.symbol + (node.metastable ? 'ᵐ' : ''), L.cx(node.N), L.cy(node.Z) - L.cell * 0.13);
      ctx.font = `${Math.min(12, L.cell * 0.28)}px ${FONT_FAMILY}`;
      ctx.fillText(String(node.A), L.cx(node.N), L.cy(node.Z) + L.cell * 0.17);
    }
  }

  ctx.restore();
}

export function renderNuclideChartToDataURL(chain, { width = 640, height = 420 } = {}) {
  const scale = 2;
  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);
  drawNuclideChart(ctx, { width, height, chain, colors: REPORT_CHART_COLORS });
  return canvas.toDataURL('image/png');
}

export function describeNode(node) {
  return `${node.label} (Z = ${node.Z}, N = ${node.N}) · meia-vida ${formatHalfLife(node.halfLife)}`;
}

// ---------------------------------------------------------------------- //
// Espectros
// ---------------------------------------------------------------------- //

export const SPECTRUM_SERIES = [
  { id: 'alpha', label: 'Alfa (α)', note: 'linhas finas: cada decaimento alfa tem energia bem definida' },
  { id: 'electron', label: 'Elétrons (β⁻ e conversão)', note: 'contínuo: a energia é dividida com o antineutrino' },
  { id: 'positron', label: 'Pósitrons (β⁺)', note: 'contínuo: a energia é dividida com o neutrino' },
  { id: 'gamma', label: 'Gama (γ)', note: 'linhas: o núcleo filho perde a energia de excitação' },
  { id: 'neutrino', label: 'Neutrinos', note: 'invisíveis num detector real — levam parte da energia' },
];

const MAX_BARS = 70;

/** Recorta o espectro até a última faixa com contagem e reagrupa em ≤ 70 barras. */
export function prepareSeries(spectra, id) {
  const series = spectra?.series?.[id];
  if (!series) return null;
  const binKeV = Number(spectra.bin_keV) || 10;
  const counts = series.counts ?? [];
  const total = counts.reduce((sum, value) => sum + value, 0) + (series.overflow ?? 0);
  if (!total) return null;
  let last = counts.length - 1;
  while (last > 0 && !counts[last]) last -= 1;
  const niceMax = niceCeil((last + 1) * binKeV * 1.05);
  const shownBins = Math.min(counts.length, Math.ceil(niceMax / binKeV));
  const group = Math.max(1, Math.ceil(shownBins / MAX_BARS));
  const bars = [];
  for (let i = 0; i < shownBins; i += group) {
    let sum = 0;
    for (let j = i; j < Math.min(i + group, shownBins); j += 1) sum += counts[j];
    bars.push(sum);
  }
  return { id, binKeV: binKeV * group, bars, range: bars.length * binKeV * group, total, overflow: series.overflow ?? 0 };
}

export function spectrumPanelLayout(width, height) {
  const left = 44;
  const right = 8;
  const top = 6;
  const bottom = 32;
  return { left, top, width: Math.max(10, width - left - right), height: Math.max(10, height - top - bottom) };
}

export function spectrumBarAt(x, width, series) {
  const plot = spectrumPanelLayout(width, 0);
  const index = Math.floor(((x - plot.left) / plot.width) * series.bars.length);
  return index >= 0 && index < series.bars.length ? index : -1;
}

export function drawSpectrumPanel(ctx, { width, height, series, colors, logScale, highlight = -1 }) {
  const plot = spectrumPanelLayout(width, height);
  ctx.save();
  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, width, height);

  const max = Math.max(1, ...series.bars);
  let yOf;
  const ticks = [];
  if (logScale) {
    const yMax = 10 ** Math.ceil(Math.log10(max * 1.5));
    const span = Math.log10(yMax) - Math.log10(0.5);
    yOf = (v) => plot.top + plot.height - ((Math.log10(Math.max(v, 0.5)) - Math.log10(0.5)) / span) * plot.height;
    for (let v = 1; v <= yMax; v *= 10) ticks.push(v);
  } else {
    const step = niceStep(max / 4);
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
    ctx.fillText(v >= 1000 ? `${v / 1000}k` : String(v), plot.left - 5, y);
  }

  const barW = plot.width / series.bars.length;
  if (highlight >= 0) {
    ctx.fillStyle = colors.highlight;
    ctx.fillRect(plot.left + highlight * barW, plot.top, barW, plot.height);
  }
  ctx.fillStyle = colors.bar;
  series.bars.forEach((count, i) => {
    if (!count) return;
    const y = yOf(count);
    const gap = barW > 5 ? 1 : 0;
    ctx.fillRect(plot.left + i * barW + gap / 2, y, Math.max(1, barW - gap), plot.top + plot.height - y);
  });

  ctx.strokeStyle = colors.axis;
  ctx.beginPath();
  ctx.moveTo(plot.left, plot.top + plot.height + 0.5);
  ctx.lineTo(plot.left + plot.width, plot.top + plot.height + 0.5);
  ctx.stroke();

  const useMeV = series.range >= 2000;
  const unit = useMeV ? 'MeV' : 'keV';
  const step = niceStep(series.range / 4);
  ctx.fillStyle = colors.text;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (let e = 0; e <= series.range + 1e-9; e += step) {
    const x = plot.left + (e / series.range) * plot.width;
    const label = useMeV ? (e / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 2 }) : String(Math.round(e));
    ctx.fillText(label, x, plot.top + plot.height + 4);
  }
  ctx.fillText(`Energia (${unit})`, plot.left + plot.width / 2, plot.top + plot.height + 17);
  ctx.restore();
}

function niceStep(raw) {
  const safe = Math.max(raw, 1e-9);
  const magnitude = 10 ** Math.floor(Math.log10(safe));
  const fraction = safe / magnitude;
  const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;
  return nice * magnitude;
}

function niceCeil(value) {
  const step = niceStep(value / 5);
  return Math.ceil(value / step) * step;
}
