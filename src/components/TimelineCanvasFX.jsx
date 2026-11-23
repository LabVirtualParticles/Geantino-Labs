import { useEffect, useRef } from 'react';

/**
 * Fundo animado da timeline "Nossa trajetória".
 *
 * O canvas fica "grudado" na tela (position: sticky) enquanto a seção
 * rola, e a cena muda conforme o leitor desce:
 *
 *   início  → estrelas cadentes (sobre um céu estrelado)
 *   meio    → raios cósmicos: chuveiros que se ramificam ao entrar na
 *             atmosfera, e alguns múons atravessando a tela
 *   final   → colisões de partículas: dois feixes se encontram e
 *             disparam trajetórias curvas, como num detector com campo
 *             magnético
 *
 * As transições são suaves (as cenas se misturam por alguns % da
 * rolagem). Ajuste os limites em SCENE_* para mudar onde cada cena
 * começa e termina. Com "reduzir movimento" ligado, fica só o céu
 * estrelado parado.
 */

// Progresso da rolagem (0 = topo da seção no meio da tela, 1 = fim).
const SCENE_STARS_OUT = [0.26, 0.4]; // estrelas somem aqui
const SCENE_RAYS_OUT = [0.58, 0.72]; // raios cósmicos somem aqui

const MAX_DPR = 2;

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const rand = (a, b) => a + Math.random() * (b - a);
const smooth = (e0, e1, x) => {
  const t = clamp((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

function sceneWeights(p) {
  const starsOut = smooth(SCENE_STARS_OUT[0], SCENE_STARS_OUT[1], p);
  const raysOut = smooth(SCENE_RAYS_OUT[0], SCENE_RAYS_OUT[1], p);
  return {
    stars: 1 - starsOut,
    rays: starsOut * (1 - raysOut),
    collisions: raysOut,
  };
}

// Cor das linhas = --color-beam do tema ativo (branco no escuro, preto
// no claro, ciano no Síncrotron etc.). Lida só quando o tema muda.
let cachedTheme = null;
let cachedRgb = '229, 223, 230';
const colorProbe = typeof document !== 'undefined' ? document.createElement('canvas').getContext('2d') : null;

function inkRgb() {
  const root = document.documentElement;
  const theme = root.getAttribute('data-theme');
  if (theme === cachedTheme) return cachedRgb;
  cachedTheme = theme;
  const value = getComputedStyle(root).getPropertyValue('--color-beam').trim();
  if (colorProbe && value) {
    colorProbe.fillStyle = '#000';
    colorProbe.fillStyle = value; // o navegador normaliza para #rrggbb ou rgba()
    const v = colorProbe.fillStyle;
    if (v.startsWith('#') && v.length === 7) {
      cachedRgb = [1, 3, 5].map((i) => parseInt(v.slice(i, i + 2), 16)).join(', ');
    } else {
      const m = v.match(/\d+(\.\d+)?/g);
      if (m && m.length >= 3) cachedRgb = m.slice(0, 3).join(', ');
    }
  }
  return cachedRgb;
}

// Posição x preferindo o lado esquerdo (onde não tem texto).
function pickX(width) {
  return Math.random() < 0.65 ? rand(0, width * 0.42) : rand(width * 0.42, width);
}

/* --- Céu estrelado (fundo fixo) ------------------------------------- */

function makeSky(width, height) {
  const count = Math.round((width * height) / 5000);
  return Array.from({ length: count }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    r: rand(0.4, 1.3),
    phase: rand(0, Math.PI * 2),
    speed: rand(0.6, 1.8),
  }));
}

function drawSky(ctx, sky, rgb, t, weight) {
  if (weight <= 0.01) return;
  for (const s of sky) {
    const twinkle = 0.55 + 0.45 * Math.sin(s.phase + t * s.speed);
    ctx.fillStyle = `rgba(${rgb}, ${0.7 * twinkle * weight})`;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
}

/* --- Estrelas cadentes ---------------------------------------------- */

function spawnShootingStar(width, height) {
  const angle = rand(2.55, 2.85); // descendo para a esquerda
  const speed = rand(520, 900);
  return {
    x: rand(width * 0.15, width * 1.05),
    y: rand(-height * 0.05, height * 0.55),
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    len: rand(130, 280),
    life: rand(0.7, 1.2),
    age: 0,
  };
}

function drawShootingStar(ctx, s, rgb, weight) {
  const k = s.age / s.life;
  const fade = Math.min(1, k / 0.15) * (1 - smooth(0.6, 1, k));
  const alpha = fade * weight;
  if (alpha <= 0.01) return;

  const speed = Math.hypot(s.vx, s.vy);
  const tx = s.x - (s.vx / speed) * s.len;
  const ty = s.y - (s.vy / speed) * s.len;
  const grad = ctx.createLinearGradient(s.x, s.y, tx, ty);
  grad.addColorStop(0, `rgba(${rgb}, ${0.9 * alpha})`);
  grad.addColorStop(1, `rgba(${rgb}, 0)`);

  ctx.strokeStyle = grad;
  ctx.lineWidth = 1.7;
  ctx.beginPath();
  ctx.moveTo(s.x, s.y);
  ctx.lineTo(tx, ty);
  ctx.stroke();

  ctx.fillStyle = `rgba(${rgb}, ${alpha})`;
  ctx.beginPath();
  ctx.arc(s.x, s.y, 1.6, 0, Math.PI * 2);
  ctx.fill();
}

/* --- Raios cósmicos (chuveiros atmosféricos) ------------------------ */

const SHOWER_SPEED = 650; // px/s com que as trajetórias "crescem"

function spawnShower(width, height) {
  const x0 = pickX(width);
  const tilt = rand(-0.28, 0.28);
  const dir = Math.PI / 2 + tilt; // para baixo
  const segments = [];

  // Múon solitário: uma reta longa e rápida atravessando a tela.
  if (Math.random() < 0.3) {
    const len = height * 1.3;
    segments.push({
      x1: x0,
      y1: -20,
      x2: x0 + Math.cos(dir) * len,
      y2: -20 + Math.sin(dir) * len,
      t0: 0,
      dur: len / (SHOWER_SPEED * 2.2),
      depth: 1,
    });
    return { segments, age: 0, end: segments[0].dur };
  }

  // Partícula primária até a primeira interação.
  const yHit = rand(height * 0.12, height * 0.38);
  const lenPrimary = (yHit + 20) / Math.sin(dir);
  const hx = x0 + Math.cos(dir) * lenPrimary;
  segments.push({
    x1: x0,
    y1: -20,
    x2: hx,
    y2: yHit,
    t0: 0,
    dur: lenPrimary / SHOWER_SPEED,
    depth: 0,
  });

  // Cascata: cada partícula se divide em 2–3 com ângulos abrindo.
  const stack = [{ x: hx, y: yHit, ang: dir, depth: 1, t0: segments[0].dur }];
  while (stack.length && segments.length < 70) {
    const n = stack.shift();
    const children = n.depth === 1 ? 3 : Math.random() < 0.6 ? 2 : 1;
    for (let i = 0; i < children; i += 1) {
      const spread = 0.32 + n.depth * 0.05;
      const ang = n.ang + rand(-spread, spread);
      const len = rand(45, 120) * (1 - n.depth * 0.1);
      const x2 = n.x + Math.cos(ang) * len;
      const y2 = n.y + Math.sin(ang) * len;
      const dur = len / SHOWER_SPEED;
      segments.push({ x1: n.x, y1: n.y, x2, y2, t0: n.t0, dur, depth: n.depth });
      if (n.depth < 6 && Math.random() > 0.18) {
        stack.push({ x: x2, y: y2, ang, depth: n.depth + 1, t0: n.t0 + dur });
      }
    }
  }
  const end = Math.max(...segments.map((s) => s.t0 + s.dur));
  return { segments, age: 0, end };
}

function drawShower(ctx, shower, rgb, weight) {
  const FADE = 1.4;
  const fade = 1 - clamp((shower.age - shower.end) / FADE);
  if (fade <= 0 || weight <= 0.01) return;

  for (const s of shower.segments) {
    const g = clamp((shower.age - s.t0) / s.dur);
    if (g <= 0) continue;
    const alpha = Math.max(0.12, 0.6 - s.depth * 0.07) * fade * weight;
    ctx.strokeStyle = `rgba(${rgb}, ${alpha})`;
    ctx.lineWidth = s.depth === 0 ? 1.6 : 1;
    ctx.beginPath();
    ctx.moveTo(s.x1, s.y1);
    ctx.lineTo(s.x1 + (s.x2 - s.x1) * g, s.y1 + (s.y2 - s.y1) * g);
    ctx.stroke();
  }
}

/* --- Colisões de partículas ----------------------------------------- */

const C_APPROACH = 0.7; // feixes se aproximando
const C_BURST = 1.6; // trajetórias nascendo
const C_HOLD = 3.4; // trajetórias paradas
const C_FADE = 4.6; // esmaecendo

function spawnCollision(width, height) {
  const cx = rand(width * 0.1, width * 0.9);
  const cy = rand(height * 0.2, height * 0.8);
  const count = Math.round(rand(14, 26));
  const tracks = Array.from({ length: count }, () => {
    // Curvatura = campo magnético: partículas de baixa energia
    // fazem curvas mais fechadas.
    const theta = rand(0, Math.PI * 2);
    const k = (Math.random() < 0.5 ? -1 : 1) * rand(0.0015, 0.013);
    const len = rand(70, 280);
    const pts = [];
    let x = cx;
    let y = cy;
    for (let s = 0; s <= len; s += 6) {
      const a = theta + k * s;
      pts.push([x, y]);
      x += Math.cos(a) * 6;
      y += Math.sin(a) * 6;
    }
    return pts;
  });
  return { cx, cy, span: Math.min(width * 0.35, 420), tracks, age: 0 };
}

function drawCollision(ctx, c, rgb, weight) {
  const t = c.age;
  if (t > C_FADE || weight <= 0.01) return;

  if (t <= C_APPROACH) {
    const p = t / C_APPROACH;
    const travel = c.span * p * p;
    const alpha = 0.7 * Math.min(1, t / 0.2) * weight;
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = `rgba(${rgb}, ${alpha})`;
    ctx.beginPath();
    ctx.moveTo(c.cx - c.span, c.cy);
    ctx.lineTo(c.cx - c.span + travel, c.cy);
    ctx.moveTo(c.cx + c.span, c.cy);
    ctx.lineTo(c.cx + c.span - travel, c.cy);
    ctx.stroke();
    return;
  }

  const growth = easeOutCubic(clamp((t - C_APPROACH) / (C_BURST - C_APPROACH)));
  const fade = 1 - clamp((t - C_HOLD) / (C_FADE - C_HOLD));
  const alpha = 0.55 * fade * weight;

  // clarão no ponto de colisão
  const flash = 1 - clamp((t - C_APPROACH) / 0.5);
  if (flash > 0) {
    const r = 4 + 26 * (1 - flash);
    ctx.fillStyle = `rgba(${rgb}, ${0.35 * flash * weight})`;
    ctx.beginPath();
    ctx.arc(c.cx, c.cy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.lineWidth = 1;
  ctx.strokeStyle = `rgba(${rgb}, ${alpha})`;
  ctx.beginPath();
  for (const pts of c.tracks) {
    const n = Math.max(2, Math.floor(pts.length * growth));
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < n; i += 1) ctx.lineTo(pts[i][0], pts[i][1]);
  }
  ctx.stroke();
}

/* --- Componente ------------------------------------------------------ */

export default function TimelineCanvasFX({ sectionRef }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const section = sectionRef?.current;
    if (!canvas || !section) return undefined;

    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    let width = 0;
    let height = 0;
    let sky = [];

    function resize() {
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      sky = makeSky(width, height);
    }

    function scrollProgress() {
      const rect = section.getBoundingClientRect();
      const vh = window.innerHeight;
      return clamp((vh * 0.5 - rect.top) / Math.max(1, rect.height));
    }

    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);

    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      // Sem animação: só o céu estrelado, parado.
      const drawStatic = () => {
        ctx.clearRect(0, 0, width, height);
        drawSky(ctx, sky, inkRgb(), 0, 0.8);
      };
      drawStatic();
      const ro = new ResizeObserver(drawStatic);
      ro.observe(canvas);
      return () => {
        resizeObserver.disconnect();
        ro.disconnect();
      };
    }

    const stars = [];
    const showers = [];
    const collisions = [];
    let nextStar = 0.3;
    let nextShower = 0.2;
    let nextCollision = 0.2;
    let frameId = 0;
    let running = false;
    let last = 0;
    let clock = 0;

    function frame(now) {
      const dt = Math.min(0.05, (now - last) / 1000 || 0);
      last = now;
      clock += dt;

      const rgb = inkRgb();
      const w = sceneWeights(scrollProgress());
      // no celular o texto ocupa a tela toda: fundo mais discreto
      const soft = width < 720 ? 0.6 : 1;
      w.rays *= soft;
      w.collisions *= soft;
      ctx.clearRect(0, 0, width, height);

      // céu: sempre um pouco presente, mais forte no começo
      drawSky(ctx, sky, rgb, clock, 0.3 + 0.7 * w.stars);

      // estrelas cadentes
      nextStar -= dt;
      if (w.stars > 0.05 && nextStar <= 0) {
        stars.push(spawnShootingStar(width, height));
        nextStar = rand(0.3, 0.9);
      }
      for (let i = stars.length - 1; i >= 0; i -= 1) {
        const s = stars[i];
        s.age += dt;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        if (s.age > s.life) stars.splice(i, 1);
        else drawShootingStar(ctx, s, rgb, w.stars);
      }

      // raios cósmicos
      nextShower -= dt;
      if (w.rays > 0.05 && nextShower <= 0 && showers.length < 5) {
        showers.push(spawnShower(width, height));
        nextShower = rand(0.9, 2);
      }
      for (let i = showers.length - 1; i >= 0; i -= 1) {
        const sh = showers[i];
        sh.age += dt;
        if (sh.age > sh.end + 1.5) showers.splice(i, 1);
        else drawShower(ctx, sh, rgb, w.rays);
      }

      // colisões
      nextCollision -= dt;
      if (w.collisions > 0.05 && nextCollision <= 0 && collisions.length < 3) {
        collisions.push(spawnCollision(width, height));
        nextCollision = rand(1.6, 3);
      }
      for (let i = collisions.length - 1; i >= 0; i -= 1) {
        const c = collisions[i];
        c.age += dt;
        if (c.age > C_FADE) collisions.splice(i, 1);
        else drawCollision(ctx, c, rgb, w.collisions);
      }

      frameId = requestAnimationFrame(frame);
    }

    // Só anima enquanto a seção está na tela.
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !running) {
        running = true;
        last = performance.now();
        frameId = requestAnimationFrame(frame);
      } else if (!entry.isIntersecting && running) {
        running = false;
        cancelAnimationFrame(frameId);
      }
    });
    io.observe(section);

    return () => {
      cancelAnimationFrame(frameId);
      io.disconnect();
      resizeObserver.disconnect();
    };
  }, [sectionRef]);

  return <canvas ref={canvasRef} className="timeline__canvas" aria-hidden="true" />;
}
