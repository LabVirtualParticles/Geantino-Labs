// Identificação de partículas no espectrômetro (exemplo B5): para cada
// evento, tempo de voo entre os dois hodoscópios (t2 − t1) × energia
// depositada num calorímetro. Os dados vêm de resultados.json → events.
//
// Forma: pequenos múltiplos, um painel por partícula. Em cada painel a
// partícula fica em destaque (cor do tema) e as outras em cinza ao fundo,
// com os mesmos eixos em todos os painéis. Cinco categorias num só gráfico
// de dispersão exigiriam cinco cores distinguíveis entre si, o que nenhuma
// paleta consegue (validado com o script da skill de dataviz); com painéis,
// a identidade vem do título, não da cor.

import { REPORT_CHART_COLORS } from './scatteringChart';

export const PID_PARTICLES = [
  { id: 'e+', label: 'Pósitron (e⁺)' },
  { id: 'mu+', label: 'Múon (μ⁺)' },
  { id: 'pi+', label: 'Píon (π⁺)' },
  { id: 'kaon+', label: 'Káon (K⁺)' },
  { id: 'proton', label: 'Próton (p)' },
];

export const PID_Y_OPTIONS = [
  { id: 'em_edep_MeV', label: 'Calorímetro eletromagnético', short: 'Energia no cal. EM (MeV)' },
  { id: 'had_edep_MeV', label: 'Calorímetro hadrônico', short: 'Energia no cal. hadrônico (MeV)' },
];

const FONT_FAMILY = 'Fraunces, Georgia, serif';

/**
 * @returns {{ points: object[], missing: Object<string, number>, totals: Object<string, number>,
 *            xDomain: number[], yDomain: Object<string, number[]> }}
 */
export function preparePid(events) {
  const points = [];
  const missing = {};
  const totals = {};
  for (const event of events ?? []) {
    totals[event.particle] = (totals[event.particle] ?? 0) + 1;
    if (typeof event.t1_ns !== 'number' || typeof event.t2_ns !== 'number') {
      missing[event.particle] = (missing[event.particle] ?? 0) + 1;
      continue;
    }
    points.push({ ...event, tof: event.t2_ns - event.t1_ns });
  }
  const xs = points.map((point) => point.tof);
  const pad = (min, max, fraction) => {
    const span = Math.max(max - min, 1);
    return [min - span * fraction, max + span * fraction];
  };
  const xDomain = xs.length ? pad(Math.min(...xs), Math.max(...xs), 0.08) : [0, 1];
  const yDomain = {};
  for (const option of PID_Y_OPTIONS) {
    const ys = points.map((point) => point[option.id] ?? 0);
    const max = ys.length ? Math.max(...ys) : 1;
    yDomain[option.id] = [0, niceCeil(Math.max(max * 1.08, 10))];
  }
  return { points, missing, totals, xDomain, yDomain };
}

export function pidPanelLayout(width, height) {
  const left = 46;
  const right = 10;
  const top = 8;
  const bottom = 34;
  return { left, top, width: Math.max(10, width - left - right), height: Math.max(10, height - top - bottom) };
}

// Ponto mais perto do cursor (até 14 px) — pro texto de leitura.
export function pidPointAt(x, y, width, height, pid, yKey, particle) {
  const plot = pidPanelLayout(width, height);
  const [x0, x1] = pid.xDomain;
  const [, y1] = pid.yDomain[yKey];
  let best = null;
  let bestDistance = 14;
  for (const point of pid.points) {
    if (point.particle !== particle) continue;
    const px = plot.left + ((point.tof - x0) / (x1 - x0)) * plot.width;
    const py = plot.top + plot.height - ((point[yKey] ?? 0) / y1) * plot.height;
    const distance = Math.hypot(px - x, py - y);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = point;
    }
  }
  return best;
}

/** Um painel (em px CSS; quem chama cuida do devicePixelRatio). */
export function drawPidPanel(ctx, { width, height, pid, yKey, particle, colors, hover }) {
  const plot = pidPanelLayout(width, height);
  const [x0, x1] = pid.xDomain;
  const [, y1] = pid.yDomain[yKey];
  const xOf = (value) => plot.left + ((value - x0) / (x1 - x0)) * plot.width;
  const yOf = (value) => plot.top + plot.height - (value / y1) * plot.height;

  ctx.save();
  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, width, height);

  // Grade e eixo Y
  ctx.font = `10px ${FONT_FAMILY}`;
  ctx.lineWidth = 1;
  ctx.textBaseline = 'middle';
  const yStep = y1 / 4;
  for (let value = 0; value <= y1 + yStep / 2; value += yStep) {
    const y = Math.round(yOf(value)) + 0.5;
    ctx.strokeStyle = colors.grid;
    ctx.beginPath();
    ctx.moveTo(plot.left, y);
    ctx.lineTo(plot.left + plot.width, y);
    ctx.stroke();
    ctx.fillStyle = colors.text;
    ctx.textAlign = 'right';
    ctx.fillText(Math.round(value).toLocaleString('pt-BR'), plot.left - 6, y);
  }

  // Eixo X
  ctx.strokeStyle = colors.axis;
  ctx.beginPath();
  ctx.moveTo(plot.left, plot.top + plot.height + 0.5);
  ctx.lineTo(plot.left + plot.width, plot.top + plot.height + 0.5);
  ctx.stroke();
  ctx.fillStyle = colors.text;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const xStep = niceStep((x1 - x0) / 4);
  for (let value = Math.ceil(x0 / xStep) * xStep; value <= x1; value += xStep) {
    ctx.fillText(value.toLocaleString('pt-BR', { maximumFractionDigits: 1 }), xOf(value), plot.top + plot.height + 5);
  }
  ctx.fillText('Tempo de voo (ns)', plot.left + plot.width / 2, plot.top + plot.height + 19);

  // Outras partículas: cinza, menores, atrás
  ctx.fillStyle = colors.barMuted;
  ctx.globalAlpha = 0.45;
  for (const point of pid.points) {
    if (point.particle === particle) continue;
    ctx.beginPath();
    ctx.arc(xOf(point.tof), yOf(point[yKey] ?? 0), 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Partícula do painel: cor de destaque, com anel do fundo separando
  // pontos sobrepostos
  for (const point of pid.points) {
    if (point.particle !== particle) continue;
    const px = xOf(point.tof);
    const py = yOf(point[yKey] ?? 0);
    ctx.beginPath();
    ctx.arc(px, py, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = colors.bar;
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = colors.background;
    ctx.stroke();
  }

  if (hover) {
    ctx.beginPath();
    ctx.arc(xOf(hover.tof), yOf(hover[yKey] ?? 0), 8, 0, Math.PI * 2);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = colors.bar;
    ctx.stroke();
  }

  ctx.restore();
}

// PNG pro relatório: os cinco painéis lado a lado, paleta escura fixa.
export function renderPidToDataURL(events, yKey = 'em_edep_MeV') {
  const pid = preparePid(events);
  const panelWidth = 240;
  const panelHeight = 200;
  const titleHeight = 22;
  const width = panelWidth * 3;
  const height = (panelHeight + titleHeight) * 2;
  const scale = 2;
  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);
  ctx.fillStyle = REPORT_CHART_COLORS.background;
  ctx.fillRect(0, 0, width, height);
  PID_PARTICLES.forEach((particle, index) => {
    const x = (index % 3) * panelWidth;
    const y = Math.floor(index / 3) * (panelHeight + titleHeight);
    ctx.save();
    ctx.fillStyle = REPORT_CHART_COLORS.text;
    ctx.font = `12px ${FONT_FAMILY}`;
    ctx.textBaseline = 'middle';
    ctx.fillText(particle.label, x + 46, y + titleHeight / 2);
    ctx.translate(x, y + titleHeight);
    drawPidPanel(ctx, {
      width: panelWidth,
      height: panelHeight,
      pid,
      yKey,
      particle: particle.id,
      colors: REPORT_CHART_COLORS,
    });
    ctx.restore();
  });
  return canvas.toDataURL('image/png');
}

function niceStep(raw) {
  const safe = Math.max(raw, 1e-6);
  const magnitude = 10 ** Math.floor(Math.log10(safe));
  const fraction = safe / magnitude;
  const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;
  return nice * magnitude;
}

function niceCeil(value) {
  const step = niceStep(value / 4);
  return Math.ceil(value / step) * step;
}
