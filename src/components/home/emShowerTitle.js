// Chuveiro eletromagnético que "escreve" um título.
//
// Motor em JS puro (sem React) — o componente ShowerTitle.jsx só cuida de
// montar/desmontar. Ideia: um elétron primário entra pela esquerda e, a
// cada "comprimento de radiação", cada partícula se divide em duas
// (e± → e± + γ por bremsstrahlung; γ → e⁻ + e⁺ por produção de par),
// dividindo a energia. Quando a energia acaba (última geração), a
// partícula para e deposita a energia ali — e é nesse depósito que as
// letras do título vão aparecendo.
//
// Pra que os depósitos caiam exatamente em cima das letras, a árvore de
// divisões é construída ao contrário: os pixels do título são divididos
// recursivamente ao meio (pela mediana, no eixo mais comprido), igual à
// árvore binária do chuveiro. Cada ramo da cascata "mira" no centro do
// seu pedaço de letras, e cada folha revela o seu pedaço em círculo a
// partir do ponto de depósito.

// --- Ajustes (tempos em ms, distâncias em px CSS) ----------------------
export const SHOWER_CONFIG = {
  generations: 7, // 2^7 = 128 depósitos finais
  speed: 0.32, // px por ms — "velocidade da luz" do chuveiro
  splitFraction: 0.5, // quanto do caminho até o alvo cada ramo anda antes de dividir
  revealMs: 650, // quanto tempo cada depósito leva pra revelar seu pedaço de letra
  trailFadeMs: 900, // quanto tempo o rastro de uma partícula leva pra sumir
  flashMs: 320, // brilho no ponto de depósito
  bendFactor: 0.18, // curvatura dos e± (como se houvesse campo magnético)
  sampleGap: 3, // espaçamento da amostragem dos pixels das letras
  padding: { left: 140, right: 40, top: 48, bottom: 48 }, // área extra do canvas em volta do título
  lineScale: 1, // multiplica espessura dos rastros e tamanho dos pontos (texto pequeno → menor)
};

// Preset pro logo da navbar: texto pequeno (~1rem), então amostragem
// mais fina, menos gerações, partículas mais lentas (o caminho é curto) e
// traços mais finos; a área extra fica dentro da altura da navbar.
export const NAVBAR_SHOWER_CONFIG = {
  generations: 6,
  speed: 0.13,
  revealMs: 420,
  trailFadeMs: 650,
  flashMs: 260,
  bendFactor: 0.25,
  sampleGap: 1,
  padding: { left: 44, right: 16, top: 22, bottom: 22 },
  lineScale: 0.7,
};

const SOFT_CORE = 0.65;
const easeOut = (x) => 1 - Math.pow(1 - x, 3);
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);

function cssVar(name, fallback) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

// Desenha o texto do elemento num canvas, caractere por caractere, na
// MESMA posição em que o navegador desenhou (pega o retângulo de cada
// letra via Range) — assim a quebra de linha, o letter-spacing e o tamanho
// fluido (clamp) batem exatamente com o título real.
function rasterizeTitle(titleEl, originX, originY, width, height, dpr, color) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(width * dpr);
  canvas.height = Math.ceil(height * dpr);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const style = getComputedStyle(titleEl);
  ctx.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = color;

  const walker = document.createTreeWalker(titleEl, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  let node;
  while ((node = walker.nextNode())) {
    const text = node.textContent;
    for (let i = 0; i < text.length; i += 1) {
      const ch = text[i];
      if (!ch.trim()) continue;
      range.setStart(node, i);
      range.setEnd(node, i + 1);
      const rect = range.getClientRects()[0];
      if (!rect) continue;
      const metrics = ctx.measureText(ch);
      const ascent = metrics.fontBoundingBoxAscent ?? metrics.actualBoundingBoxAscent;
      ctx.fillText(ch, rect.left - originX, rect.top - originY + ascent);
    }
  }
  return canvas;
}

function samplePoints(textCanvas, dpr, gap) {
  const { width, height } = textCanvas;
  const data = textCanvas.getContext('2d').getImageData(0, 0, width, height).data;
  const step = Math.max(1, Math.round(gap * dpr));
  const points = [];
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      if (data[(y * width + x) * 4 + 3] > 110) points.push({ x: x / dpr, y: y / dpr });
    }
  }
  return points;
}

function centroid(points) {
  let sx = 0;
  let sy = 0;
  for (const p of points) {
    sx += p.x;
    sy += p.y;
  }
  return { x: sx / points.length, y: sy / points.length };
}

// Divide os pontos ao meio recursivamente (eixo mais comprido, pela
// mediana) — devolve a árvore no mesmo formato da cascata.
function splitTree(points, depth, maxDepth) {
  const node = { points, center: centroid(points), children: [] };
  if (depth >= maxDepth || points.length < 4) return node;

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  const key = maxX - minX >= maxY - minY ? 'x' : 'y';
  const sorted = [...points].sort((a, b) => a[key] - b[key]);
  const mid = sorted.length >> 1;
  node.children = [
    splitTree(sorted.slice(0, mid), depth + 1, maxDepth),
    splitTree(sorted.slice(mid), depth + 1, maxDepth),
  ];
  return node;
}

// Transforma a árvore de pontos numa cascata de partículas com tempo,
// trajetória e tipo (e⁻, e⁺, γ).
function buildShower(root, entry, cfg) {
  const tracks = [];
  const leaves = [];

  function visit(node, start, t0, kind, charge) {
    const isLeaf = node.children.length === 0;
    const target = node.center;
    const end = isLeaf
      ? target
      : {
          x: start.x + (target.x - start.x) * cfg.splitFraction,
          y: start.y + (target.y - start.y) * cfg.splitFraction,
        };
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.hypot(dx, dy) || 1;

    // e± curvam (um lado ou outro conforme a carga); γ vai reto.
    const bend = kind === 'gamma' ? 0 : charge * cfg.bendFactor * length;
    const control = {
      x: (start.x + end.x) / 2 + (-dy / length) * bend,
      y: (start.y + end.y) / 2 + (dx / length) * bend,
    };

    const duration = length / cfg.speed;
    const track = { start, control, end, t0, t1: t0 + duration, kind };
    tracks.push(track);

    if (isLeaf) {
      let radius = 0;
      for (const p of node.points) {
        const d = Math.hypot(p.x - end.x, p.y - end.y);
        if (d > radius) radius = d;
      }
      leaves.push({ x: end.x, y: end.y, t: track.t1, radius: radius + Math.max(cfg.sampleGap * 2, 2) });
      return;
    }

    const [a, b] = Math.random() < 0.5 ? node.children : [node.children[1], node.children[0]];
    if (kind === 'gamma') {
      // produção de par: γ → e⁻ + e⁺
      visit(a, end, track.t1, 'electron', -1);
      visit(b, end, track.t1, 'electron', 1);
    } else {
      // bremsstrahlung: e± → e± + γ
      visit(a, end, track.t1, 'electron', charge);
      visit(b, end, track.t1, 'gamma', 0);
    }
  }

  visit(root, entry, 0, 'electron', -1);
  return { tracks, leaves };
}

function pointOnTrack(track, s) {
  const u = 1 - s;
  return {
    x: u * u * track.start.x + 2 * u * s * track.control.x + s * s * track.end.x,
    y: u * u * track.start.y + 2 * u * s * track.control.y + s * s * track.end.y,
  };
}

/**
 * Roda o chuveiro sobre `titleEl`, desenhando em `canvas` (posicionado
 * por esta função em relação ao título — o pai dos dois precisa ter
 * position: relative). Chama `onDone` quando todas as letras foram
 * reveladas. Devolve uma função que cancela a animação.
 */
export function playShowerTitle(titleEl, canvas, { onDone, config = {} } = {}) {
  const cfg = { ...SHOWER_CONFIG, ...config, padding: { ...SHOWER_CONFIG.padding, ...config.padding } };
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  const titleRect = titleEl.getBoundingClientRect();
  const parentRect = canvas.offsetParent?.getBoundingClientRect() ?? titleRect;
  const width = titleRect.width + cfg.padding.left + cfg.padding.right;
  const height = titleRect.height + cfg.padding.top + cfg.padding.bottom;
  const originX = titleRect.left - cfg.padding.left;
  const originY = titleRect.top - cfg.padding.top;

  canvas.style.left = `${originX - parentRect.left}px`;
  canvas.style.top = `${originY - parentRect.top}px`;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  canvas.width = Math.ceil(width * dpr);
  canvas.height = Math.ceil(height * dpr);

  const colors = {
    text: cssVar('--color-on-void', '#ffffff'),
    electron: cssVar('--color-beam', '#ffffff'),
    gamma: cssVar('--color-trace', '#9a9a9a'),
  };

  const textCanvas = rasterizeTitle(titleEl, originX, originY, width, height, dpr, colors.text);
  const points = samplePoints(textCanvas, dpr, cfg.sampleGap);
  if (points.length === 0) {
    onDone?.();
    return () => {};
  }

  const tree = splitTree(points, 0, cfg.generations);
  const entry = { x: 6, y: cfg.padding.top + titleRect.height * 0.5 };
  const { tracks, leaves } = buildShower(tree, entry, cfg);
  const lastLeaf = leaves.reduce((max, leaf) => Math.max(max, leaf.t), 0);
  const totalMs = lastLeaf + Math.max(cfg.revealMs, cfg.trailFadeMs);

  // Máscara acumulada com o que já foi revelado + canvas de composição.
  const mask = document.createElement('canvas');
  mask.width = canvas.width;
  mask.height = canvas.height;
  const maskCtx = mask.getContext('2d');
  maskCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const comp = document.createElement('canvas');
  comp.width = canvas.width;
  comp.height = canvas.height;
  const compCtx = comp.getContext('2d');

  const ctx = canvas.getContext('2d');
  let frameId = 0;
  let startTime = null;
  let finished = false;

  function frame(now) {
    if (startTime === null) startTime = now;
    const t = now - startTime;

    // 1) letras reveladas pelos depósitos — cada depósito é um círculo
    // de borda suave que cresce a partir do ponto onde a partícula parou.
    // O núcleo (até 65% do raio) é opaco; o raio final é calculado pra
    // que todos os pixels do pedaço caiam no núcleo, então no fim o
    // título fica 100% sólido.
    maskCtx.clearRect(0, 0, mask.width / dpr, mask.height / dpr);
    for (const leaf of leaves) {
      if (t < leaf.t) continue;
      const r = (leaf.radius / SOFT_CORE) * easeOut(clamp01((t - leaf.t) / cfg.revealMs));
      if (r <= 0.5) continue;
      const gradient = maskCtx.createRadialGradient(leaf.x, leaf.y, 0, leaf.x, leaf.y, r);
      gradient.addColorStop(0, 'rgba(0,0,0,1)');
      gradient.addColorStop(SOFT_CORE, 'rgba(0,0,0,1)');
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      maskCtx.fillStyle = gradient;
      maskCtx.beginPath();
      maskCtx.arc(leaf.x, leaf.y, r, 0, Math.PI * 2);
      maskCtx.fill();
    }
    compCtx.globalCompositeOperation = 'source-over';
    compCtx.clearRect(0, 0, comp.width, comp.height);
    compCtx.drawImage(mask, 0, 0);
    compCtx.globalCompositeOperation = 'source-in';
    compCtx.drawImage(textCanvas, 0, 0);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(comp, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // 2) rastros das partículas
    ctx.lineCap = 'round';
    for (const track of tracks) {
      if (t < track.t0) continue;
      const fade = t > track.t1 ? 1 - (t - track.t1) / cfg.trailFadeMs : 1;
      if (fade <= 0) continue;
      const progress = clamp01((t - track.t0) / (track.t1 - track.t0));

      ctx.globalAlpha = fade * (track.kind === 'gamma' ? 0.6 : 0.95);
      ctx.strokeStyle = track.kind === 'gamma' ? colors.gamma : colors.electron;
      ctx.lineWidth = (track.kind === 'gamma' ? 0.8 : 1.1) * cfg.lineScale;
      ctx.setLineDash(track.kind === 'gamma' ? [3 * cfg.lineScale, 4 * cfg.lineScale] : []);
      ctx.beginPath();
      ctx.moveTo(track.start.x, track.start.y);
      const steps = 12;
      for (let i = 1; i <= steps; i += 1) {
        const p = pointOnTrack(track, (i / steps) * progress);
        ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();

      if (progress < 1) {
        const head = pointOnTrack(track, progress);
        ctx.globalAlpha = 1;
        ctx.fillStyle = colors.electron;
        ctx.beginPath();
        ctx.arc(head.x, head.y, (track.kind === 'gamma' ? 1.1 : 1.6) * cfg.lineScale, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.setLineDash([]);

    // 3) brilho no ponto de depósito
    for (const leaf of leaves) {
      const age = t - leaf.t;
      if (age < 0 || age > cfg.flashMs) continue;
      const k = 1 - age / cfg.flashMs;
      ctx.globalAlpha = k * 0.8;
      ctx.fillStyle = colors.electron;
      ctx.beginPath();
      ctx.arc(leaf.x, leaf.y, (1 + 2 * k) * cfg.lineScale, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    if (t >= totalMs) {
      finished = true;
      onDone?.();
      return;
    }
    frameId = requestAnimationFrame(frame);
  }

  frameId = requestAnimationFrame(frame);

  return () => {
    cancelAnimationFrame(frameId);
    if (!finished) ctx.clearRect(0, 0, canvas.width, canvas.height);
  };
}
