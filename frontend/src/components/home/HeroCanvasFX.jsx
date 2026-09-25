import { useEffect, useRef } from 'react';
import { useTheme } from '../../context/ThemeContext';

// Timeline da animação, em segundos — mexa aqui pra mudar o ritmo.
const T_APPROACH_END = 2.4; // duas retas viajando uma em direção à outra
const T_BURST_END = 3.8; // linhas nascendo do ponto de colisão
const T_HOLD_END = 7.8; // linhas paradas, totalmente desenhadas
const T_FADE_END = 8.8; // tudo esmaecendo
const REST_SECONDS = 30; // pausa em branco antes de reiniciar o ciclo
const T_CYCLE = T_FADE_END + REST_SECONDS;

const RAYS_PER_SIDE = 5; // 5 linhas pra cima + 5 pra baixo = 10 no total
const MAX_ANGLE_DEG = 62; // abertura máxima em relação à vertical (cantos)

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function easeInCubic(t) {
  return t * t * t;
}

// Ângulos das 5 linhas de cada lado (cima/baixo), medidos a partir da
// vertical: 0 = reto pra cima/baixo, ±MAX_ANGLE_DEG = quase deitado,
// apontando pros cantos. Distribuídos simetricamente à esquerda/direita.
const RAY_ANGLES = Array.from({ length: RAYS_PER_SIDE }, (_, i) => {
  const step = (2 * MAX_ANGLE_DEG) / (RAYS_PER_SIDE - 1);
  const deg = -MAX_ANGLE_DEG + i * step;
  return (deg * Math.PI) / 180;
});

function drawBurst(ctx, cx, cy, width, height, colorRgb, growth, alpha) {
  if (alpha <= 0) return;

  const maxLength = Math.min(width, height) * 0.42;
  ctx.lineWidth = 1.25;
  ctx.strokeStyle = `rgba(${colorRgb}, ${alpha})`;

  RAY_ANGLES.forEach((angle) => {
    // Quanto mais a linha se inclina pra horizontal (cantos), mais curta
    // ela fica — é o que dá a sensação de profundidade/perspectiva.
    const length = maxLength * Math.cos(angle) * growth;
    const dx = Math.sin(angle) * length;
    const dy = Math.cos(angle) * length;

    // metade de cima
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + dx, cy - dy);
    ctx.stroke();

    // metade de baixo (espelhada)
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + dx, cy + dy);
    ctx.stroke();
  });
}

/**
 * Fundo animado do Hero: duas retas entram de lados opostos, se
 * encontram no centro e, na colisão, disparam 10 linhas se abrindo pra
 * cima e pra baixo (mais curtas nas pontas, pra dar profundidade).
 * Fica parado ~30s e reinicia. Cor muda com o tema (cinza no claro,
 * branco no escuro).
 */
export default function HeroCanvasFX() {
  const canvasRef = useRef(null);
  const { theme } = useTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    if (!canvas || !parent) return;

    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = 0;
    let height = 0;
    let frameId;

    function resize() {
      const rect = parent.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(parent);

    const colorRgb = theme === 'light' ? '138, 138, 138' : '255, 255, 255';
    const startTime = performance.now();

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    function draw(now) {
      const elapsed = ((now - startTime) / 1000) % T_CYCLE;
      ctx.clearRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;

      if (elapsed <= T_APPROACH_END) {
        // Fase 1 — as duas retas vindas de lados opostos, se aproximando.
        const p = easeInCubic(elapsed / T_APPROACH_END);
        const travel = cx * p;
        const fadeIn = Math.min(1, elapsed / 0.3);

        ctx.lineWidth = 1.5;
        ctx.strokeStyle = `rgba(${colorRgb}, ${fadeIn})`;

        ctx.beginPath();
        ctx.moveTo(0, cy);
        ctx.lineTo(travel, cy);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(width, cy);
        ctx.lineTo(width - travel, cy);
        ctx.stroke();
      } else if (elapsed <= T_BURST_END) {
        // Fase 2 — no ponto de colisão, as 10 linhas nascem crescendo.
        const p = easeOutCubic((elapsed - T_APPROACH_END) / (T_BURST_END - T_APPROACH_END));
        drawBurst(ctx, cx, cy, width, height, colorRgb, p, 1);
      } else if (elapsed <= T_HOLD_END) {
        // Fase 3 — linhas paradas, totalmente desenhadas.
        drawBurst(ctx, cx, cy, width, height, colorRgb, 1, 1);
      } else if (elapsed <= T_FADE_END) {
        // Fase 4 — esmaecendo antes da pausa de 30s.
        const p = (elapsed - T_HOLD_END) / (T_FADE_END - T_HOLD_END);
        drawBurst(ctx, cx, cy, width, height, colorRgb, 1, 1 - p);
      }
      // fora dessas janelas é a pausa: fica em branco até o ciclo reiniciar.

      frameId = requestAnimationFrame(draw);
    }

    if (prefersReducedMotion) {
      // Sem animação: desenha só o resultado final, parado.
      resize();
      drawBurst(ctx, width / 2, height / 2, width, height, colorRgb, 1, 1);
    } else {
      frameId = requestAnimationFrame(draw);
    }

    return () => {
      if (frameId) cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
    };
  }, [theme]);

  return <canvas ref={canvasRef} className="hero__fx" aria-hidden="true" />;
}
