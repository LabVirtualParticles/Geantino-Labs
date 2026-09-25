import { useEffect, useRef } from 'react';

// Timeline da animação, em segundos — mexa aqui pra mudar o ritmo.
const T_APPROACH_END = 2.4; // duas retas viajando uma em direção à outra
const T_BURST_END = 3.8; // linhas nascendo do ponto de colisão
const T_HOLD_END = 7.8; // linhas paradas, totalmente desenhadas
const T_FADE_END = 8.8; // tudo esmaecendo
const REST_SECONDS = 30; // pausa em branco antes de reiniciar o ciclo
const T_CYCLE = T_FADE_END + REST_SECONDS;

// 30 "partículas" (linhas) saindo do ponto de colisão — como as
// trajetórias espalhadas de um evento tipo Rutherford batendo na
// estrutura do detector. Metade sobe, metade desce; dentro de cada
// metade, os ângulos (medidos a partir da HORIZONTAL, o eixo das duas
// retas que colidem) são distribuídos continuamente de quase-deitado
// até reto (90°), alternando lado esquerdo/direito — não são mais só
// 3-5 ângulos fixos repetidos em 4 quadrantes, é um leque contínuo.
const RAY_COUNT = 30;
const RAYS_PER_SIDE = RAY_COUNT / 2; // 15 pra cima + 15 pra baixo
const MIN_ANGLE_DEG = 8; // quase deitado — "roça" a estrutura e para logo
const MAX_ANGLE_DEG = 90; // reto pra cima/baixo — vai mais fundo

const RAYS = Array.from({ length: RAY_COUNT }, (_, i) => {
  const slot = i % RAYS_PER_SIDE; // 0..14, dá a volta pra metade de baixo
  const t = RAYS_PER_SIDE === 1 ? 1 : slot / (RAYS_PER_SIDE - 1);
  const deg = MIN_ANGLE_DEG + t * (MAX_ANGLE_DEG - MIN_ANGLE_DEG);
  const angle = (deg * Math.PI) / 180;
  const sy = i < RAYS_PER_SIDE ? -1 : 1; // primeira metade sobe, segunda desce
  const sx = slot % 2 === 0 ? 1 : -1; // alterna direita/esquerda
  return { angle, sx, sy };
});

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function easeInCubic(t) {
  return t * t * t;
}

function drawBurst(ctx, cx, cy, width, height, colorRgb, growth, alpha) {
  if (alpha <= 0) return;

  // Espalhamento vertical do burst limitado a 80% da altura da div ao
  // final da animação (metade pra cima, metade pra baixo do ponto de
  // colisão) — a linha mais vertical (90°) é a que bate exatamente
  // nesse limite; as demais ficam mais curtas conforme se aproximam da
  // horizontal, simulando partículas que esbarram mais cedo na
  // estrutura do detector.
  const maxLength = (height * 0.8) / 2;
  ctx.lineWidth = 1.1;
  ctx.strokeStyle = `rgba(${colorRgb}, ${alpha})`;

  RAYS.forEach(({ angle, sx, sy }) => {
    const length = maxLength * Math.sin(angle) * growth;
    const dx = length * Math.cos(angle) * sx;
    const dy = length * Math.sin(angle) * sy;

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + dx, cy + dy);
    ctx.stroke();
  });
}

/**
 * Fundo animado da seção "Sobre" (About): duas retas entram de lados
 * opostos, se encontram no centro e, na colisão, disparam 30 linhas —
 * simulando as trajetórias de partículas colidindo com a estrutura do
 * detector — abrindo pra cima e pra baixo em leque contínuo (mais curtas
 * perto da horizontal, mais compridas perto da vertical, pra dar
 * profundidade). Ao final da animação, o conjunto ocupa 80% da altura
 * da div. As retas de aproximação e o burst fazem parte do MESMO
 * ciclo/timer — reiniciam sempre juntas, nunca dessincronizadas. Fica
 * parado ~30s depois do burst e só então reinicia. Cor fixa (#E5DFE6),
 * igual nos dois temas.
 */
export default function AboutCanvasFX() {
  const canvasRef = useRef(null);

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

    const colorRgb = '229, 223, 230'; // #E5DFE6
    const startTime = performance.now();

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    function draw(now) {
      // Um único relógio (`elapsed`) controla as duas fases — retas de
      // aproximação e burst — então elas sempre recarregam juntas, no
      // mesmo instante de cada ciclo.
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
        // Fase 2 — no ponto de colisão, as 30 linhas nascem crescendo.
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
  }, []);

  return <canvas ref={canvasRef} className="about__fx" aria-hidden="true" />;
}
