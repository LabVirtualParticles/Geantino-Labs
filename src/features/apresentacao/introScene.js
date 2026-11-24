// introScene.js — animação de abertura em tela cheia (página /apresentacao).
//
// Roteiro, tudo num canvas só:
//   1. o detector se desenha (tubo do feixe, camadas do rastreador,
//      calorímetros eletromagnético e hadrônico, câmaras de múons);
//   2. dois prótons chegam pelo feixe e colidem no centro;
//   3. os subprodutos saem: partículas carregadas fazem arcos no campo
//      magnético (azul = carga +, vermelho = carga −, como no Geant4),
//      fótons vão retos e tracejados (verde = neutra), deixam pontos no
//      rastreador e torres de energia nos calorímetros; os múons
//      atravessam tudo e chegam às câmaras de fora;
//   4. o rastro some e o anel do calorímetro encolhe e se abre virando o
//      "G" do logo; a barra do G corre até o ponto de colisão (o vértice).
// Depois disso o React (Apresentacao.jsx) escreve "Geantino Labs" com o
// chuveiro eletromagnético e mostra o subtítulo. No fim, tudo some e o
// roteiro recomeça com uma colisão sorteada de novo.
//
// Motor em JS puro: o componente só monta/desmonta e reage às fases
// (callback onPhase). Geometria do detector em unidades normalizadas
// (raio interno do calorímetro = 1), escalada no desenho — redimensionar
// a janela não estraga a cena.

// --- Roteiro (ms desde o começo de cada volta) --------------------------
export const TIMELINE = {
  detectorIn: 0, // detector começa a se desenhar
  hud: 1100, // legenda do evento aparece (fase 'collision')
  approach: 1000, // prótons entram pelas bordas
  collide: 2600, // instante da colisão
  flashMs: 700,
  trackMs: 1300, // tempo pra um rastro típico chegar ao calorímetro
  maxStartDelayMs: 160,
  depositMs: 320,
  fadeTracks: 7000, // fim da colisão: rastros e detector somem (fase 'logo')
  fadeTracksMs: 800,
  morph: 7200, // anel do calorímetro vira o G
  morphMs: 1500,
  barMs: 380, // barra do G correndo até o vértice
  curlMs: 420, // o arquinho fino do G
  wordmark: 9300, // fase 'wordmark' — React escreve o nome
  subtitle: 12200, // fase 'subtitle'
  fadeOut: 19000, // fase 'fadeout'
  fadeOutMs: 1000,
  loop: 20400, // recomeça (fase 'start')
};

// Posição e tamanho do logo (G) no fim — usados também pelo React pra
// posicionar o nome logo abaixo. cy = fração da altura; r = fração do
// menor lado da tela.
export const LOGO = { cy: 0.36, r: 0.115 };

// Cores dos rastros no padrão do Geant4 (+ azul, − vermelho, neutra
// verde), clareadas pra aparecer bem em fundo preto/projetor.
export const TRACK_COLORS = {
  positive: '#6b93ff',
  negative: '#ff5f5f',
  neutral: '#4cf08f',
};

const DETECTOR = {
  radiusFraction: 0.27, // raio interno do calorímetro em relação ao menor lado da tela
  layers: [0.16, 0.27, 0.38, 0.5, 0.62, 0.74, 0.86], // camadas do rastreador
  ecal: [1, 1.13],
  hcal: [1.16, 1.42],
  muon: [1.52, 1.6, 1.68],
  muonSegments: 12,
};

// Geometria do G do logo (tirada de public/favicon.svg, em frações do
// raio do arco): começa em cima à direita, dá a volta no sentido
// anti-horário e termina um pouco abaixo da horizontal.
const G = {
  startDeg: -37.5,
  sweepDeg: 306.2,
  stroke: 0.278,
  bar: { y: 0.28, toX: 0.071 },
  dot: { x: 0.071, y: 0.28, r: 0.25 },
  curl: { c: [0.96, -0.164], e: [0.627, -0.164], stroke: 0.133, alpha: 0.55 },
};

const DS = 0.01;
const TAU = Math.PI * 2;
const easeIn = (x) => x * x;
const easeOut = (x) => 1 - Math.pow(1 - x, 3);
const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const lerp = (a, b, k) => a + (b - a) * k;
const rad = (deg) => (deg * Math.PI) / 180;

function gaussian() {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// Partícula carregada no campo magnético uniforme do solenoide: a direção
// gira a uma taxa constante (1/raio de curvatura) até chegar ao
// calorímetro (r = 1) ou dar ~meia volta (baixo momento, fica enrolada).
function integrateCharged(angle, curvature, charge) {
  const points = [{ x: 0, y: 0 }];
  const hits = [];
  let x = 0;
  let y = 0;
  let dir = angle;
  let s = 0;
  let prevR = 0;
  let exited = false;
  const maxS = Math.min(3, Math.PI * curvature * 1.1);
  while (s < maxS) {
    dir += (charge * DS) / curvature;
    x += Math.cos(dir) * DS;
    y += Math.sin(dir) * DS;
    s += DS;
    const r = Math.hypot(x, y);
    for (const layer of DETECTOR.layers) {
      if (prevR < layer && r >= layer) hits.push({ x, y, s });
    }
    prevR = r;
    points.push({ x, y });
    if (r >= 1) {
      exited = true;
      break;
    }
  }
  return { points, hits, length: s, exited, dir };
}

function makeCharged(species, angle, curvature, charge) {
  const path = integrateCharged(angle, curvature, charge);
  const end = path.points[path.points.length - 1];
  const track = {
    kind: 'charged',
    species,
    charge,
    points: path.points,
    hits: path.hits,
    length: path.length,
    deposit: null,
  };
  if (!path.exited) return track;

  const exitAngle = Math.atan2(end.y, end.x);
  const energy = 0.3 + Math.min(1, curvature / 5) * 0.7;
  if (species === 'electron') track.deposit = { layer: 'ecal', angle: exitAngle, energy };
  else if (species === 'muon') {
    // Múon atravessa os calorímetros e chega às câmaras de múons. Fora do
    // solenoide o campo de retorno inverte: a curva troca de lado.
    let { x, y } = end;
    let dir = path.dir;
    let s = path.length;
    let prevR = 1;
    const outerCurv = curvature * 1.6;
    const maxR = DETECTOR.muon[DETECTOR.muon.length - 1] + 0.05;
    while (Math.hypot(x, y) < maxR && s < 6) {
      dir -= (charge * DS) / outerCurv;
      x += Math.cos(dir) * DS;
      y += Math.sin(dir) * DS;
      s += DS;
      const r = Math.hypot(x, y);
      for (const station of DETECTOR.muon) {
        if (prevR < station && r >= station) track.hits.push({ x, y, s, station: true, dir });
      }
      prevR = r;
      track.points.push({ x, y });
    }
    track.length = s;
    track.deposit = { layer: 'mip', angle: exitAngle, energy: 0.12 };
  } else {
    track.deposit = { layer: 'hcal', angle: exitAngle, energy, ecalShare: 0.25 };
  }
  return track;
}

function makePhoton(angle) {
  const points = [];
  for (let s = 0; s <= 1 + 1e-9; s += DS) points.push({ x: Math.cos(angle) * s, y: Math.sin(angle) * s });
  return {
    kind: 'neutral',
    species: 'photon',
    charge: 0,
    points,
    hits: [],
    length: 1,
    deposit: { layer: 'ecal', angle, energy: 0.35 + Math.random() * 0.55 },
  };
}

const HADRONS = ['pion', 'pion', 'pion', 'kaon', 'proton'];
const SYMBOL = {
  muon: { '-1': 'μ⁻', 1: 'μ⁺' },
  electron: { '-1': 'e⁻', 1: 'e⁺' },
  pion: { '-1': 'π⁻', 1: 'π⁺' },
  photon: { 0: 'γ' },
};

export function generateEvent() {
  const tracks = [];
  const first = Math.random() * TAU;
  const jetAxes = [first, first + Math.PI + gaussian() * 0.3];
  const sign = () => (Math.random() < 0.5 ? -1 : 1);

  // dois jatos (grupos estreitos de hádrons) quase opostos
  for (const axis of jetAxes) {
    for (let i = 0; i < 9; i += 1) {
      const species = HADRONS[Math.floor(Math.random() * HADRONS.length)];
      tracks.push(makeCharged(species, axis + gaussian() * 0.17, 1.6 + Math.random() * 6, sign()));
    }
    for (let i = 0; i < 2; i += 1) tracks.push(makePhoton(axis + gaussian() * 0.2));
  }
  // partículas moles espalhadas (algumas ficam enroladas no campo)
  for (let i = 0; i < 14; i += 1) {
    const species = HADRONS[Math.floor(Math.random() * HADRONS.length)];
    const soft = Math.random() < 0.65;
    tracks.push(makeCharged(species, Math.random() * TAU, soft ? 0.3 + Math.random() * 1.2 : 1.4 + Math.random() * 3, sign()));
  }
  // um par de múons, um elétron e fótons isolados — os que ganham nome
  const muonAxis = first + Math.PI / 2 + gaussian() * 0.4;
  const muonCharge = sign();
  const muA = makeCharged('muon', muonAxis, 7 + Math.random() * 5, muonCharge);
  const muB = makeCharged('muon', muonAxis + Math.PI + gaussian() * 0.25, 7 + Math.random() * 5, -muonCharge);
  muA.label = true;
  muB.label = true;
  tracks.push(muA, muB);

  const electron = makeCharged('electron', Math.random() * TAU, 3 + Math.random() * 3, sign());
  electron.label = electron.deposit !== null;
  tracks.push(electron);

  for (let i = 0; i < 3; i += 1) {
    const photon = makePhoton(Math.random() * TAU);
    if (i === 0) photon.label = true;
    tracks.push(photon);
  }

  // nomeia o píon mais energético que chegou ao calorímetro
  const pion = tracks
    .filter((t) => t.species === 'pion' && t.deposit)
    .sort((a, b) => b.deposit.energy - a.deposit.energy)[0];
  if (pion) pion.label = true;

  for (const track of tracks) {
    track.delay = Math.random() * TIMELINE.maxStartDelayMs;
    if (track.label) {
      track.symbol = SYMBOL[track.species]?.[String(track.charge)] ?? '';
    }
  }
  return { tracks };
}

function trackColor(track) {
  if (track.charge > 0) return TRACK_COLORS.positive;
  if (track.charge < 0) return TRACK_COLORS.negative;
  return TRACK_COLORS.neutral;
}

/**
 * Cria a cena. Devolve { start, restart, resize, destroy }.
 * onPhase(nome) é chamado em: 'start', 'collision', 'logo', 'wordmark',
 * 'subtitle', 'fadeout'.
 */
export function createIntroScene(canvas, { onPhase } = {}) {
  const ctx = canvas.getContext('2d');
  const T = TIMELINE;
  let width = 0;
  let height = 0;
  let dpr = 1;
  let frameId = 0;
  let startTime = null;
  let event = generateEvent();
  let emitted = new Set();

  function resize() {
    const rect = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = rect.width;
    height = rect.height;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
  }

  function emit(name, t, at) {
    if (t >= at && !emitted.has(name)) {
      emitted.add(name);
      onPhase?.(name);
    }
  }

  // ---------------------------------------------------------------- desenho
  function drawDetector(t, cx, cy, R, alpha) {
    if (alpha <= 0) return;
    const appear = (delay, dur = 900) => easeOut(clamp01((t - T.detectorIn - delay) / dur));
    ctx.lineCap = 'butt';

    // tubo do feixe, crescendo do centro pras bordas
    const pipe = appear(0, 1100);
    ctx.globalAlpha = 0.16 * alpha;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - (width / 2) * pipe, cy);
    ctx.lineTo(cx + (width / 2) * pipe, cy);
    ctx.stroke();

    // camadas do rastreador (arcos que se fecham)
    DETECTOR.layers.forEach((layer, i) => {
      const k = appear(80 + i * 60);
      if (k <= 0) return;
      ctx.globalAlpha = 0.1 * alpha;
      ctx.beginPath();
      ctx.arc(cx, cy, layer * R, -Math.PI / 2, -Math.PI / 2 + TAU * k);
      ctx.stroke();
    });

    // calorímetro eletromagnético: bordas + segmentação fina
    const ecal = appear(450);
    ctx.globalAlpha = 0.2 * alpha;
    ctx.beginPath();
    ctx.arc(cx, cy, DETECTOR.ecal[1] * R, -Math.PI / 2, -Math.PI / 2 + TAU * ecal);
    ctx.stroke();
    ctx.globalAlpha = 0.06 * alpha;
    ctx.beginPath();
    const ecalSeg = Math.floor(96 * ecal);
    for (let i = 0; i < ecalSeg; i += 1) {
      const a = -Math.PI / 2 + (i / 96) * TAU;
      ctx.moveTo(cx + Math.cos(a) * DETECTOR.ecal[0] * R, cy + Math.sin(a) * DETECTOR.ecal[0] * R);
      ctx.lineTo(cx + Math.cos(a) * DETECTOR.ecal[1] * R, cy + Math.sin(a) * DETECTOR.ecal[1] * R);
    }
    ctx.stroke();

    // calorímetro hadrônico
    const hcal = appear(600);
    ctx.globalAlpha = 0.13 * alpha;
    for (const r of DETECTOR.hcal) {
      ctx.beginPath();
      ctx.arc(cx, cy, r * R, -Math.PI / 2, -Math.PI / 2 + TAU * hcal);
      ctx.stroke();
    }
    ctx.globalAlpha = 0.05 * alpha;
    ctx.beginPath();
    const hcalSeg = Math.floor(48 * hcal);
    for (let i = 0; i < hcalSeg; i += 1) {
      const a = -Math.PI / 2 + (i / 48) * TAU;
      ctx.moveTo(cx + Math.cos(a) * DETECTOR.hcal[0] * R, cy + Math.sin(a) * DETECTOR.hcal[0] * R);
      ctx.lineTo(cx + Math.cos(a) * DETECTOR.hcal[1] * R, cy + Math.sin(a) * DETECTOR.hcal[1] * R);
    }
    ctx.stroke();

    // câmaras de múons: segmentos com folga
    const muon = appear(750, 1000);
    ctx.globalAlpha = 0.14 * alpha;
    ctx.lineWidth = 2;
    const seg = TAU / DETECTOR.muonSegments;
    const shown = DETECTOR.muonSegments * muon;
    DETECTOR.muon.forEach((r, layer) => {
      for (let i = 0; i < Math.ceil(shown); i += 1) {
        const part = Math.min(1, shown - i);
        const a0 = -Math.PI / 2 + i * seg + seg * 0.08 + (layer % 2) * seg * 0.5;
        ctx.beginPath();
        ctx.arc(cx, cy, r * R, a0, a0 + seg * 0.84 * part);
        ctx.stroke();
      }
    });
    ctx.lineWidth = 1;
    ctx.globalAlpha = 1;
  }

  function strokeTrack(track, s, toPx, alpha) {
    const pts = track.points;
    const last = Math.min(pts.length - 1, Math.round(s / DS));
    if (last < 1) return null;
    const color = trackColor(track);
    const neutral = track.kind === 'neutral';
    ctx.strokeStyle = color;
    ctx.lineCap = 'round';
    ctx.setLineDash(neutral ? [5, 6] : []);

    const path = new Path2D();
    const p0 = toPx(pts[0]);
    path.moveTo(p0.x, p0.y);
    for (let i = 2; i <= last; i += 2) {
      const p = toPx(pts[i]);
      path.lineTo(p.x, p.y);
    }
    const head = toPx(pts[last]);
    path.lineTo(head.x, head.y);

    // brilho largo + núcleo fino (composição aditiva — fica luminoso)
    ctx.globalAlpha = (neutral ? 0.12 : 0.18) * alpha;
    ctx.lineWidth = neutral ? 3 : 4.5;
    ctx.stroke(path);
    ctx.globalAlpha = (neutral ? 0.75 : 0.95) * alpha;
    ctx.lineWidth = neutral ? 1.1 : 1.5;
    ctx.stroke(path);
    ctx.setLineDash([]);
    return { head, color };
  }

  function drawHead(head, color, alpha) {
    const glow = ctx.createRadialGradient(head.x, head.y, 0, head.x, head.y, 9);
    glow.addColorStop(0, '#ffffff');
    glow.addColorStop(0.35, color);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = alpha;
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(head.x, head.y, 9, 0, TAU);
    ctx.fill();
  }

  // Torre de energia no calorímetro (fatia de anel)
  function drawTower(cx, cy, R, angle, r0, r1, halfWidth, alpha) {
    if (r1 <= r0) return;
    const a = -angle; // y pra cima nas unidades, pra baixo na tela
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(cx, cy, r0 * R, a - halfWidth, a + halfWidth);
    ctx.arc(cx, cy, r1 * R, a + halfWidth, a - halfWidth, true);
    ctx.closePath();
    ctx.fill();
  }

  function drawEvent(t, cx, cy, R, alpha) {
    if (alpha <= 0) return;
    const toPx = (p) => ({ x: cx + p.x * R, y: cy - p.y * R });

    // prótons chegando pelo feixe
    if (t >= T.approach && t < T.collide) {
      const k = easeIn(clamp01((t - T.approach) / (T.collide - T.approach)));
      const reach = width / 2 + 20;
      ctx.globalCompositeOperation = 'lighter';
      for (const side of [-1, 1]) {
        const x = cx + side * reach * (1 - k);
        const tail = 60 + 220 * k;
        const color = TRACK_COLORS.positive;
        const g = ctx.createLinearGradient(x, cy, x + side * tail, cy);
        g.addColorStop(0, color);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.strokeStyle = g;
        ctx.lineCap = 'round';
        ctx.globalAlpha = 0.35 * alpha;
        ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.moveTo(x, cy);
        ctx.lineTo(x + side * tail, cy);
        ctx.stroke();
        ctx.globalAlpha = alpha;
        ctx.lineWidth = 2;
        ctx.stroke();
        drawHead({ x, y: cy }, color, alpha);
        // o "p" de próton, pequenininho, acompanhando
        if (k < 0.85) {
          ctx.globalAlpha = 0.75 * alpha * (1 - k / 0.85);
          ctx.fillStyle = '#ffffff';
          ctx.font = `italic 400 ${Math.round(R * 0.075)}px Fraunces, Georgia, serif`;
          ctx.textAlign = 'center';
          ctx.fillText('p', x, cy - R * 0.06);
        }
      }
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      return;
    }
    if (t < T.collide) return;

    const te = t - T.collide;
    const speed = 1 / T.trackMs;
    ctx.globalCompositeOperation = 'lighter';

    for (const track of event.tracks) {
      const local = te - track.delay;
      if (local <= 0) continue;
      const s = Math.min(track.length, local * speed);
      const drawn = strokeTrack(track, s, toPx, alpha);
      if (!drawn) continue;

      // pontos nas camadas do rastreador / câmaras de múons
      ctx.fillStyle = '#ffffff';
      for (const hit of track.hits) {
        if (hit.s > s) break;
        const p = toPx(hit);
        ctx.globalAlpha = 0.9 * alpha;
        if (hit.station) {
          const a = -Math.atan2(hit.y, hit.x);
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(a);
          ctx.fillStyle = drawn.color;
          ctx.fillRect(-2, -9, 4, 18);
          ctx.restore();
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 1.9, 0, TAU);
          ctx.fill();
        }
      }

      const moving = s < track.length;
      if (moving) drawHead(drawn.head, drawn.color, alpha);

      // depósitos de energia
      const dep = track.deposit;
      const reachedCalo = dep && (dep.layer === 'mip' ? s >= 1 : !moving);
      if (reachedCalo) {
        const arrival = dep.layer === 'mip' ? 1 / speed : track.length / speed;
        const k = easeOut(clamp01((local - arrival) / T.depositMs));
        ctx.fillStyle = '#ffffff';
        if (dep.layer === 'ecal') {
          const [r0, r1] = DETECTOR.ecal;
          drawTower(cx, cy, R, dep.angle, r0 + 0.01, r0 + (r1 - r0) * dep.energy * k, 0.03, 0.75 * alpha);
        } else if (dep.layer === 'hcal') {
          const [e0, e1] = DETECTOR.ecal;
          drawTower(cx, cy, R, dep.angle, e0 + 0.01, e0 + (e1 - e0) * dep.ecalShare * k, 0.03, 0.5 * alpha);
          const [r0, r1] = DETECTOR.hcal;
          drawTower(cx, cy, R, dep.angle, r0 + 0.01, r0 + (r1 - r0) * dep.energy * k, 0.055, 0.42 * alpha);
        } else {
          const [r0] = DETECTOR.hcal;
          drawTower(cx, cy, R, dep.angle, r0 + 0.04, r0 + 0.08 * k, 0.02, 0.4 * alpha);
        }
      }

      // nome da partícula, quando ela termina o caminho
      if (track.label && track.symbol && !moving) {
        const age = local - track.length / speed;
        const k = clamp01(age / 500);
        const end = track.points[track.points.length - 1];
        let ang = Math.atan2(end.y, end.x);
        let dist = Math.hypot(end.x, end.y) + 0.1;
        if (dep && dep.layer !== 'mip') {
          ang = dep.angle;
          dist = (dep.layer === 'hcal' ? DETECTOR.hcal[1] : DETECTOR.ecal[1]) + 0.12;
        }
        const p = toPx({ x: Math.cos(ang) * dist, y: Math.sin(ang) * dist });
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = k * alpha;
        ctx.fillStyle = drawn.color;
        ctx.font = `italic 400 ${Math.max(16, Math.round(R * 0.09))}px Fraunces, Georgia, serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(track.symbol, p.x, p.y);
        ctx.globalCompositeOperation = 'lighter';
      }
    }

    // clarão da colisão + onda de choque
    if (te < T.flashMs) {
      const k = te / T.flashMs;
      const radius = 10 + R * 0.45 * easeOut(k);
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(0.25, 'rgba(200,215,255,0.8)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalAlpha = (1 - k) * alpha;
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, TAU);
      ctx.fill();

      ctx.globalAlpha = (1 - k) * 0.6 * alpha;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.7 * easeOut(k), 0, TAU);
      ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }

  // Tela inteira clareia um instante na colisão
  function drawScreenFlash(t) {
    const te = t - T.collide;
    if (te < 0 || te > 450) return;
    ctx.globalAlpha = 0.22 * (1 - te / 450);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.globalAlpha = 1;
  }

  // Anel do calorímetro → G do logo; barra; ponto; arquinho.
  function drawLogo(t, cx, cy, R, alpha) {
    const minSide = Math.min(width, height);
    const gx = width / 2;
    const gy = height * LOGO.cy;
    const rg = minSide * LOGO.r;

    const m = easeInOut(clamp01((t - T.morph) / T.morphMs));
    const ringAlphaBefore = 0.32; // mesmo brilho do anel no detector
    const x = lerp(cx, gx, m);
    const y = lerp(cy, gy, m);
    const r = lerp(R * DETECTOR.ecal[0], rg, m);
    const start = rad(G.startDeg);
    const sweep = lerp(TAU, rad(G.sweepDeg), m);
    const lw = lerp(1.2, G.stroke * rg, m);

    // antes do morph o anel faz parte do detector (aparece junto com ele)
    const appear = easeOut(clamp01((t - T.detectorIn - 450) / 900));
    const ringAlpha = lerp(ringAlphaBefore, 1, m);

    ctx.lineCap = m > 0.02 ? 'round' : 'butt';
    ctx.strokeStyle = '#ffffff';
    if (m > 0) {
      // brilho em volta durante a transformação
      ctx.globalAlpha = 0.25 * Math.sin(Math.PI * m) * alpha;
      ctx.lineWidth = lw * 3;
      ctx.beginPath();
      ctx.arc(x, y, r, start, start - sweep, true);
      ctx.stroke();
    }
    ctx.globalAlpha = ringAlpha * alpha;
    ctx.lineWidth = lw;
    ctx.beginPath();
    if (m === 0) ctx.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + TAU * appear);
    else ctx.arc(x, y, r, start, start - sweep, true);
    ctx.stroke();

    const morphEnd = T.morph + T.morphMs;
    if (t < morphEnd) {
      ctx.globalAlpha = 1;
      return;
    }

    // barra do G correndo até o vértice
    const endX = gx + Math.cos(rad(G.startDeg - G.sweepDeg)) * rg;
    const barY = gy + G.bar.y * rg;
    const kb = easeOut(clamp01((t - morphEnd) / T.barMs));
    const barTo = lerp(endX, gx + G.bar.toX * rg, kb);
    ctx.globalAlpha = alpha;
    ctx.lineWidth = G.stroke * rg;
    ctx.beginPath();
    ctx.moveTo(endX, barY);
    ctx.lineTo(barTo, barY);
    ctx.stroke();

    const dotAt = morphEnd + T.barMs;
    if (t < dotAt) {
      ctx.globalAlpha = 1;
      return;
    }
    // o ponto do G = o vértice da colisão, com um clarão pequeno
    const dx = gx + G.dot.x * rg;
    const dy = gy + G.dot.y * rg;
    const kd = clamp01((t - dotAt) / 600);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(dx, dy, G.dot.r * rg * easeOut(clamp01(kd * 2.5)), 0, TAU);
    ctx.fill();
    if (kd < 1) {
      const fr = G.dot.r * rg * (1 + 5 * easeOut(kd));
      const g = ctx.createRadialGradient(dx, dy, 0, dx, dy, fr);
      g.addColorStop(0, 'rgba(255,255,255,0.9)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalAlpha = (1 - kd) * alpha;
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(dx, dy, fr, 0, TAU);
      ctx.fill();
    }

    // arquinho fino (uma partícula secundária saindo do G)
    const kc = easeOut(clamp01((t - dotAt) / T.curlMs));
    if (kc > 0) {
      const s0 = { x: endX, y: barY };
      const c = { x: gx + G.curl.c[0] * rg, y: gy + G.curl.c[1] * rg };
      const e = { x: gx + G.curl.e[0] * rg, y: gy + G.curl.e[1] * rg };
      ctx.globalAlpha = G.curl.alpha * alpha;
      ctx.lineWidth = G.curl.stroke * rg;
      ctx.beginPath();
      ctx.moveTo(s0.x, s0.y);
      const steps = 20;
      for (let i = 1; i <= steps; i += 1) {
        const u = (i / steps) * kc;
        const v = 1 - u;
        ctx.lineTo(v * v * s0.x + 2 * v * u * c.x + u * u * e.x, v * v * s0.y + 2 * v * u * c.y + u * u * e.y);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function draw(t) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);

    const cx = width / 2;
    const cy = height / 2;
    const R = Math.min(width, height) * DETECTOR.radiusFraction;
    const master = 1 - clamp01((t - T.fadeOut) / T.fadeOutMs);
    const fade = 1 - clamp01((t - T.fadeTracks) / T.fadeTracksMs);

    // brilho residual no centro depois da colisão
    if (t > T.collide && fade > 0) {
      const k = clamp01((t - T.collide) / 1200);
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 1.8);
      g.addColorStop(0, `rgba(90,110,180,${0.16 * k * fade})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, width, height);
    }

    drawDetector(t, cx, cy, R, fade * master);
    drawEvent(t, cx, cy, R, fade * master);
    drawLogo(t, cx, cy, R, master);
    drawScreenFlash(t);
  }

  // ------------------------------------------------------------------ laço
  function frame(now) {
    if (startTime === null) startTime = now;
    const t = now - startTime;
    emit('collision', t, T.hud);
    emit('logo', t, T.fadeTracks);
    emit('wordmark', t, T.wordmark);
    emit('subtitle', t, T.subtitle);
    emit('fadeout', t, T.fadeOut);
    draw(t);
    if (t >= T.loop) {
      beginLoop();
      startTime = now;
    }
    frameId = requestAnimationFrame(frame);
  }

  function beginLoop() {
    event = generateEvent();
    emitted = new Set();
    onPhase?.('start');
  }

  function start() {
    cancelAnimationFrame(frameId);
    beginLoop();
    startTime = null;
    frameId = requestAnimationFrame(frame);
  }

  resize();
  return {
    start,
    restart: start,
    resize,
    destroy: () => cancelAnimationFrame(frameId),
  };
}
