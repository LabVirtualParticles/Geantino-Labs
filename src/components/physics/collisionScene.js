// collisionScene.js — colisão próton-próton estilo "event display" de detector (vista
// transversal, como as imagens do CMS/ATLAS): dois prótons chegam pelo
// tubo do feixe, colidem no centro e os produtos saem em todas as
// direções. Partículas carregadas fazem arcos (campo magnético do
// detector — quanto menor o momento, mais a curva fecha; algumas nem
// chegam a sair e ficam "enroladas"), deixam pontos nas camadas do
// rastreador e terminam depositando energia no calorímetro (as barras no
// anel de fora). Fótons (neutros) vão retos e tracejados.
//
// Motor em JS puro — ProtonCollision.jsx só monta/desmonta e decide
// quando tocar. Tudo é gerado em unidades normalizadas (raio do
// calorímetro = 1) e escalado no desenho, então redimensionar a tela não
// estraga a cena.

// --- Ajustes (tempos em ms) -------------------------------------------
export const COLLISION_CONFIG = {
  approachMs: 750, // prótons vindo pelo feixe até o centro
  flashMs: 450, // clarão da colisão
  trackMs: 1100, // tempo pra um rastro típico chegar ao calorímetro
  depositMs: 260, // barra de energia crescendo no calorímetro
  maxStartDelayMs: 120, // espalhamento no início dos rastros
  fadeOutMs: 500, // colisão anterior sumindo antes da próxima começar
  jets: 2, // jatos (grupos estreitos de partículas)
  tracksPerJet: 7,
  extraTracks: 10, // partículas espalhadas fora dos jatos
  photons: 5, // neutros (tracejados)
  layers: [0.22, 0.36, 0.5, 0.64, 0.78], // camadas do rastreador (fração do raio do calorímetro)
  caloDepth: 0.2, // espessura do anel do calorímetro
  radiusFraction: 0.38, // raio do calorímetro em relação ao menor lado do canvas (com o anel de fora, cabe inteiro)
};

const easeIn = (x) => x * x;
const easeOut = (x) => 1 - Math.pow(1 - x, 3);
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);

function cssVar(name, fallback) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

function gaussian() {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// Rastro carregado: integra o movimento num campo magnético uniforme
// (a direção gira a uma taxa constante = 1/raio de curvatura) até sair
// pelo calorímetro ou dar ~meia volta (partícula de baixo momento).
function chargedTrack(angle, curvatureRadius, charge, layers) {
  const ds = 0.01;
  const points = [{ x: 0, y: 0, s: 0 }];
  const hits = [];
  let x = 0;
  let y = 0;
  let dir = angle;
  let s = 0;
  let prevR = 0;
  let exited = false;
  const maxS = Math.min(3, Math.PI * curvatureRadius * 1.1);

  while (s < maxS) {
    dir += (charge * ds) / curvatureRadius;
    x += Math.cos(dir) * ds;
    y += Math.sin(dir) * ds;
    s += ds;
    const r = Math.hypot(x, y);
    for (const layer of layers) {
      if (prevR < layer && r >= layer) hits.push({ x, y, s });
    }
    prevR = r;
    points.push({ x, y, s });
    if (r >= 1) {
      exited = true;
      break;
    }
  }

  const end = points[points.length - 1];
  return {
    kind: 'charged',
    points,
    hits,
    length: s,
    deposit: exited
      ? { angle: Math.atan2(end.y, end.x), energy: 0.25 + Math.min(1, curvatureRadius / 4) * 0.75 }
      : null,
  };
}

function neutralTrack(angle) {
  const points = [
    { x: 0, y: 0, s: 0 },
    { x: Math.cos(angle), y: Math.sin(angle), s: 1 },
  ];
  return {
    kind: 'neutral',
    points,
    hits: [],
    length: 1,
    deposit: { angle, energy: 0.35 + Math.random() * 0.5 },
  };
}

export function generateEvent(cfg = COLLISION_CONFIG) {
  const tracks = [];
  const jetAxes = [];
  const firstAxis = Math.random() * Math.PI * 2;
  for (let j = 0; j < cfg.jets; j += 1) {
    // jatos saem aproximadamente opostos (conservação de momento)
    jetAxes.push(firstAxis + (j * Math.PI * 2) / cfg.jets + gaussian() * 0.35);
  }

  const addCharged = (angle, highMomentum) => {
    const curvature = highMomentum ? 1.5 + Math.random() * 6 : 0.35 + Math.random() * 1.6;
    const charge = Math.random() < 0.5 ? -1 : 1;
    tracks.push(chargedTrack(angle, curvature, charge, cfg.layers));
  };

  for (const axis of jetAxes) {
    for (let i = 0; i < cfg.tracksPerJet; i += 1) addCharged(axis + gaussian() * 0.16, true);
  }
  for (let i = 0; i < cfg.extraTracks; i += 1) addCharged(Math.random() * Math.PI * 2, Math.random() < 0.4);
  for (let i = 0; i < cfg.photons; i += 1) {
    const nearJet = Math.random() < 0.6;
    const angle = nearJet
      ? jetAxes[i % jetAxes.length] + gaussian() * 0.2
      : Math.random() * Math.PI * 2;
    tracks.push(neutralTrack(angle));
  }

  for (const track of tracks) {
    track.delay = Math.random() * cfg.maxStartDelayMs;
  }
  return { tracks };
}

function pointAt(track, s) {
  const pts = track.points;
  if (s >= track.length) return pts[pts.length - 1];
  if (track.kind === 'neutral') return { x: pts[1].x * s, y: pts[1].y * s };
  const index = Math.min(pts.length - 1, Math.round(s / 0.01));
  return pts[index];
}

/**
 * Cria a cena num canvas. Devolve { play, drawFinal, resize, destroy }.
 * `play()` sorteia uma colisão nova e anima; `drawFinal()` desenha uma
 * colisão já pronta, sem animação (pra quem prefere movimento reduzido).
 */
export function createCollisionScene(canvas, config = {}) {
  const cfg = { ...COLLISION_CONFIG, ...config };
  const ctx = canvas.getContext('2d');
  let event = null;
  let frameId = 0;
  let startTime = null;
  let width = 0;
  let height = 0;
  let dpr = 1;
  let colors = null;
  let lastT = Infinity;
  let eventAlpha = 1; // usado pra apagar a colisão anterior antes da próxima

  function readColors() {
    colors = {
      track: cssVar('--color-beam', '#ffffff'),
      neutral: cssVar('--color-trace', '#9a9a9a'),
      line: cssVar('--color-line', 'rgba(255,255,255,0.14)'),
      lineSoft: cssVar('--color-line-soft', 'rgba(255,255,255,0.08)'),
    };
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = rect.width;
    height = rect.height;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    draw(lastT === Infinity ? 0 : lastT);
  }

  function draw(t) {
    lastT = t;
    if (!colors) readColors();
    const cx = width / 2;
    const cy = height / 2;
    const R = Math.min(width, height) * cfg.radiusFraction;
    const toPx = (p) => ({ x: cx + p.x * R, y: cy - p.y * R });

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.lineCap = 'round';

    // --- detector: tubo do feixe, camadas do rastreador, calorímetro ---
    ctx.strokeStyle = colors.lineSoft;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, cy);
    ctx.lineTo(width, cy);
    ctx.stroke();

    for (const layer of cfg.layers) {
      ctx.beginPath();
      ctx.arc(cx, cy, layer * R, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.strokeStyle = colors.line;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, R * (1 + cfg.caloDepth), 0, Math.PI * 2);
    ctx.stroke();

    if (!event) return;

    // --- prótons chegando ---
    const collideAt = cfg.approachMs;
    if (t < collideAt) {
      const k = easeIn(clamp01(t / cfg.approachMs));
      const reach = width / 2 + 10;
      for (const side of [-1, 1]) {
        const x = cx + side * reach * (1 - k);
        const tail = 40 + 60 * k;
        const gradient = ctx.createLinearGradient(x, cy, x + side * tail, cy);
        gradient.addColorStop(0, colors.track);
        gradient.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, cy);
        ctx.lineTo(x + side * tail, cy);
        ctx.stroke();
        ctx.fillStyle = colors.track;
        ctx.beginPath();
        ctx.arc(x, cy, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      return;
    }

    const te = t - collideAt; // tempo desde a colisão
    const speed = 1 / cfg.trackMs; // unidades normalizadas por ms

    // --- rastros ---
    for (const track of event.tracks) {
      const local = te - track.delay;
      if (local <= 0) continue;
      const s = Math.min(track.length, local * speed);
      const neutral = track.kind === 'neutral';

      ctx.globalAlpha = (neutral ? 0.7 : 0.9) * eventAlpha;
      ctx.strokeStyle = neutral ? colors.neutral : colors.track;
      ctx.lineWidth = neutral ? 1 : 1.25;
      ctx.setLineDash(neutral ? [4, 5] : []);
      ctx.beginPath();
      const start = toPx(track.points[0]);
      ctx.moveTo(start.x, start.y);
      if (neutral) {
        const p = toPx(pointAt(track, s));
        ctx.lineTo(p.x, p.y);
      } else {
        const last = Math.min(track.points.length - 1, Math.round(s / 0.01));
        for (let i = 2; i <= last; i += 2) {
          const p = toPx(track.points[i]);
          ctx.lineTo(p.x, p.y);
        }
        const p = toPx(track.points[last]);
        ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // pontos nas camadas do rastreador
      ctx.globalAlpha = eventAlpha;
      ctx.fillStyle = colors.track;
      for (const hit of track.hits) {
        if (hit.s > s) break;
        const p = toPx(hit);
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.6, 0, Math.PI * 2);
        ctx.fill();
      }

      // depósito no calorímetro
      if (track.deposit && s >= track.length) {
        const age = local - track.length / speed;
        const k = easeOut(clamp01(age / cfg.depositMs));
        const r0 = R * 1.02;
        const r1 = r0 + R * cfg.caloDepth * 0.95 * track.deposit.energy * k;
        const a = track.deposit.angle;
        ctx.strokeStyle = neutral ? colors.neutral : colors.track;
        ctx.globalAlpha = 0.85 * eventAlpha;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * r0, cy - Math.sin(a) * r0);
        ctx.lineTo(cx + Math.cos(a) * r1, cy - Math.sin(a) * r1);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;

    // --- clarão da colisão ---
    if (te < cfg.flashMs) {
      const k = te / cfg.flashMs;
      const radius = 6 + 40 * easeOut(k);
      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
      gradient.addColorStop(0, colors.track);
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalAlpha = 1 - k;
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  function totalDuration() {
    let longest = 0;
    for (const track of event.tracks) {
      longest = Math.max(longest, track.delay + track.length * cfg.trackMs + cfg.depositMs);
    }
    return cfg.approachMs + Math.max(longest, cfg.flashMs);
  }

  function startNewEvent() {
    eventAlpha = 1;
    event = generateEvent(cfg);
    startTime = null;
    const total = totalDuration();
    const frame = (now) => {
      if (startTime === null) startTime = now;
      const t = now - startTime;
      draw(Math.min(t, total));
      if (t < total) frameId = requestAnimationFrame(frame);
    };
    frameId = requestAnimationFrame(frame);
  }

  // Sorteia e anima uma colisão nova. Se já tem uma colisão desenhada,
  // ela some suavemente antes (fadeOutMs) pra troca não ser um corte seco.
  function play() {
    cancelAnimationFrame(frameId);
    readColors();
    const hasVisibleEvent = event && lastT !== Infinity && lastT > cfg.approachMs;
    if (!hasVisibleEvent) {
      startNewEvent();
      return;
    }
    const frozenT = lastT;
    let fadeStart = null;
    const fade = (now) => {
      if (fadeStart === null) fadeStart = now;
      const k = clamp01((now - fadeStart) / cfg.fadeOutMs);
      eventAlpha = 1 - k;
      draw(frozenT);
      if (k < 1) frameId = requestAnimationFrame(fade);
      else startNewEvent();
    };
    frameId = requestAnimationFrame(fade);
  }

  function drawFinal() {
    cancelAnimationFrame(frameId);
    readColors();
    eventAlpha = 1;
    event = generateEvent(cfg);
    draw(totalDuration());
  }

  resize();
  draw(0);

  return {
    play,
    drawFinal,
    resize,
    redraw: () => {
      readColors();
      draw(lastT === Infinity ? 0 : lastT);
    },
    destroy: () => cancelAnimationFrame(frameId),
  };
}
