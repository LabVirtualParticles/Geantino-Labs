// "Imagem reconstruída" do PET (B3a): retroprojeção simples das linhas de
// resposta. Cada linha é somada numa grade 2D por onde ela passa; onde
// muitas linhas se cruzam o valor fica alto, e é ali que está a fonte.
// É a ideia por trás da imagem de um PET de verdade, sem os filtros e
// correções que um tomógrafo real aplica (por isso aparece o "efeito
// estrela": cada linha deixa um rastro pelo campo de visão inteiro).
//
// Duas vistas: corte transversal (x–y, olhando ao longo do eixo do
// tomógrafo) e vista lateral (x–z). Coordenadas em cm, as mesmas do
// Geant4 (resultados.json → lines_of_response). Desenho em <canvas>, no
// mesmo padrão de scatteringChart.js: um só `drawPetImage` serve à página
// (cores do tema) e ao PNG do relatório (paleta escura fixa).

import { REPORT_CHART_COLORS } from './scatteringChart';

export const PET_VIEWS = [
  { id: 'xy', label: 'Corte transversal (x–y)', axes: [0, 1], names: ['x', 'y'] },
  { id: 'xz', label: 'Vista lateral (x–z)', axes: [0, 2], names: ['x', 'z'] },
];

// Paciente do B3 (DetectorConstruction.cc): cilindro de raio 8 cm ao longo
// de z, de −5 a +5 cm.
export const PATIENT = { radius: 8, halfLength: 5 };

const HALF_FOV = 20; // cm — o campo mostrado vai de −20 a +20 cm
const PIXEL = 0.4; // cm

/**
 * @param {{points:number[][]}[]} lines - results.lines_of_response
 * @param {'xy'|'xz'} viewId
 */
export function buildPetImage(lines, viewId) {
  const view = PET_VIEWS.find((item) => item.id === viewId) ?? PET_VIEWS[0];
  const [ia, ib] = view.axes;
  const size = Math.round((2 * HALF_FOV) / PIXEL);
  const raw = new Float32Array(size * size);
  const step = PIXEL / 3;

  for (const line of lines ?? []) {
    const [p, q] = line.points ?? [];
    if (!p || !q) continue;
    const a = [p[ia], p[ib]];
    const b = [q[ia], q[ib]];
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (length === 0) continue;
    const samples = Math.ceil(length / step);
    // Cada pixel recebe no máximo 1 por linha (senão uma linha quase
    // paralela a um eixo pesaria mais que as outras).
    const touched = new Set();
    for (let s = 0; s <= samples; s += 1) {
      const t = s / samples;
      const u = a[0] + (b[0] - a[0]) * t;
      const v = a[1] + (b[1] - a[1]) * t;
      const col = Math.floor((u + HALF_FOV) / PIXEL);
      const row = Math.floor((HALF_FOV - v) / PIXEL);
      if (col < 0 || col >= size || row < 0 || row >= size) continue;
      touched.add(row * size + col);
    }
    for (const index of touched) raw[index] += 1;
  }

  // Suavização leve (3×3) — deixa o pico mais estável com poucas linhas.
  const grid = new Float32Array(size * size);
  let max = 0;
  let peakIndex = -1;
  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      let sum = 0;
      let weight = 0;
      for (let dr = -1; dr <= 1; dr += 1) {
        for (let dc = -1; dc <= 1; dc += 1) {
          const r = row + dr;
          const c = col + dc;
          if (r < 0 || r >= size || c < 0 || c >= size) continue;
          const w = dr === 0 && dc === 0 ? 4 : dr === 0 || dc === 0 ? 2 : 1;
          sum += raw[r * size + c] * w;
          weight += w;
        }
      }
      const value = sum / weight;
      grid[row * size + col] = value;
      if (value > max) {
        max = value;
        peakIndex = row * size + col;
      }
    }
  }

  const peak =
    peakIndex >= 0 && max > 0
      ? pixelCenter(peakIndex % size, Math.floor(peakIndex / size))
      : null;

  return { view, size, pixel: PIXEL, halfFov: HALF_FOV, grid, raw, max, peak, lineCount: lines?.length ?? 0 };
}

function pixelCenter(col, row) {
  return [-HALF_FOV + (col + 0.5) * PIXEL, HALF_FOV - (row + 0.5) * PIXEL];
}

// Posição estimada (x, y, z) juntando os picos das duas vistas: x e y do
// corte transversal, z da vista lateral.
export function estimateSourcePosition(lines) {
  if (!lines?.length) return null;
  const xy = buildPetImage(lines, 'xy').peak;
  const xz = buildPetImage(lines, 'xz').peak;
  if (!xy || !xz) return null;
  return [xy[0], xy[1], xz[1]];
}

export function petImageLayout(width, height) {
  const left = 44;
  const right = 12;
  const top = 12;
  const bottom = 40;
  const side = Math.max(10, Math.min(width - left - right, height - top - bottom));
  // Centraliza o quadrado na largura disponível.
  const x0 = left + Math.max(0, (width - left - right - side) / 2);
  return { left: x0, top, side };
}

// Coordenadas (cm) sob o ponteiro, ou null fora da imagem.
export function petImageCoordsAt(x, y, width, height, image) {
  const plot = petImageLayout(width, height);
  const u = ((x - plot.left) / plot.side) * 2 * image.halfFov - image.halfFov;
  const v = image.halfFov - ((y - plot.top) / plot.side) * 2 * image.halfFov;
  if (Math.abs(u) > image.halfFov || Math.abs(v) > image.halfFov) return null;
  const col = Math.min(image.size - 1, Math.floor((u + image.halfFov) / image.pixel));
  const row = Math.min(image.size - 1, Math.floor((image.halfFov - v) / image.pixel));
  return { u, v, value: image.grid[row * image.size + col], raw: image.raw[row * image.size + col] };
}

// "#rrggbb" ou "rgb(a)(...)" → [r, g, b]
function parseColor(color, fallback) {
  const text = String(color ?? '').trim();
  let match = text.match(/^#([0-9a-f]{6})$/i);
  if (match) {
    const n = parseInt(match[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  match = text.match(/^#([0-9a-f]{3})$/i);
  if (match) return match[1].split('').map((h) => parseInt(h + h, 16));
  match = text.match(/rgba?\(([^)]+)\)/i);
  if (match) return match[1].split(',').slice(0, 3).map((n) => Number.parseFloat(n));
  return fallback;
}

/**
 * Desenha a imagem (coordenadas em px CSS — quem chama cuida do
 * devicePixelRatio). Escala sequencial de uma cor só: do fundo do tema
 * (nenhuma linha) até a cor de destaque do tema (máximo).
 */
export function drawPetImage(ctx, { width, height, image, colors, source, estimate, hover }) {
  const plot = petImageLayout(width, height);
  const { size, halfFov, grid, max, view } = image;

  ctx.save();
  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, width, height);

  // Imagem: cada pixel mistura fundo → cor de destaque. Expoente > 1 deixa
  // o rastro de uma linha isolada fraco e destaca onde várias se cruzam.
  const bg = parseColor(colors.background, [0, 0, 0]);
  const fg = parseColor(colors.bar, [255, 255, 255]);
  const offscreen = document.createElement('canvas');
  offscreen.width = size;
  offscreen.height = size;
  const octx = offscreen.getContext('2d');
  const pixels = octx.createImageData(size, size);
  for (let i = 0; i < grid.length; i += 1) {
    const t = max > 0 ? (grid[i] / max) ** 1.4 : 0;
    pixels.data[i * 4] = bg[0] + (fg[0] - bg[0]) * t;
    pixels.data[i * 4 + 1] = bg[1] + (fg[1] - bg[1]) * t;
    pixels.data[i * 4 + 2] = bg[2] + (fg[2] - bg[2]) * t;
    pixels.data[i * 4 + 3] = 255;
  }
  octx.putImageData(pixels, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(offscreen, plot.left, plot.top, plot.side, plot.side);

  const toPx = (u, v) => [
    plot.left + ((u + halfFov) / (2 * halfFov)) * plot.side,
    plot.top + ((halfFov - v) / (2 * halfFov)) * plot.side,
  ];
  const cmToPx = plot.side / (2 * halfFov);

  // Contorno do paciente (tracejado)
  ctx.strokeStyle = colors.text;
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  if (view.id === 'xy') {
    const [cx, cy] = toPx(0, 0);
    ctx.arc(cx, cy, PATIENT.radius * cmToPx, 0, Math.PI * 2);
  } else {
    const [x0, y0] = toPx(-PATIENT.radius, PATIENT.halfLength);
    ctx.rect(x0, y0, 2 * PATIENT.radius * cmToPx, 2 * PATIENT.halfLength * cmToPx);
  }
  ctx.stroke();
  ctx.setLineDash([]);

  // Posição da fonte (centro do cubo, params_used): cruz
  const [ia, ib] = view.axes;
  if (source) {
    const [sx, sy] = toPx(source[ia], source[ib]);
    ctx.strokeStyle = colors.text;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sx - 7, sy);
    ctx.lineTo(sx + 7, sy);
    ctx.moveTo(sx, sy - 7);
    ctx.lineTo(sx, sy + 7);
    ctx.stroke();
  }

  // Pico da imagem: círculo
  if (estimate) {
    const [ex, ey] = toPx(estimate[ia], estimate[ib]);
    ctx.strokeStyle = colors.text;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(ex, ey, 9, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Mira do ponteiro
  if (hover) {
    const [hx, hy] = toPx(hover.u, hover.v);
    ctx.strokeStyle = colors.axis;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(plot.left, Math.round(hy) + 0.5);
    ctx.lineTo(plot.left + plot.side, Math.round(hy) + 0.5);
    ctx.moveTo(Math.round(hx) + 0.5, plot.top);
    ctx.lineTo(Math.round(hx) + 0.5, plot.top + plot.side);
    ctx.stroke();
  }

  // Moldura e eixos
  ctx.strokeStyle = colors.axis;
  ctx.lineWidth = 1;
  ctx.strokeRect(plot.left + 0.5, plot.top + 0.5, plot.side - 1, plot.side - 1);

  ctx.font = `11px ${FONT_FAMILY}`;
  ctx.fillStyle = colors.text;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (let tick = -halfFov; tick <= halfFov; tick += 10) {
    const [tx] = toPx(tick, 0);
    ctx.fillText(String(tick).replace('-', '−'), tx, plot.top + plot.side + 6);
  }
  ctx.fillText(`${view.names[0]} (cm)`, plot.left + plot.side / 2, plot.top + plot.side + 22);
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let tick = -halfFov; tick <= halfFov; tick += 10) {
    const [, ty] = toPx(0, tick);
    ctx.fillText(String(tick).replace('-', '−'), plot.left - 6, ty);
  }
  ctx.save();
  ctx.translate(12, plot.top + plot.side / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = 'center';
  ctx.fillText(`${view.names[1]} (cm)`, 0, 0);
  ctx.restore();

  ctx.restore();
}

const FONT_FAMILY = 'Fraunces, Georgia, serif';

// PNG pro relatório do painel: corte transversal, paleta escura fixa.
export function renderPetImageToDataURL(lines, source, { width = 420, height = 420 } = {}) {
  const scale = 2;
  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);
  drawPetImage(ctx, {
    width,
    height,
    image: buildPetImage(lines, 'xy'),
    colors: REPORT_CHART_COLORS,
    source,
    estimate: estimateSourcePosition(lines),
  });
  return canvas.toDataURL('image/png');
}
