import { useEffect, useRef } from 'react';
import { createCollisionScene } from './collisionScene';
import './ProtonCollision.css';

// Quanto da área precisa estar visível pra disparar a animação.
const VISIBLE_THRESHOLD = 0.35;

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Colisão próton-próton (event display de detector) que toca quando a
 * área aparece na tela — e de novo, com uma colisão diferente, toda vez
 * que o usuário sai e volta pra ela. Com "reduzir movimento" ligado no
 * sistema, mostra direto uma colisão já pronta, sem animar.
 */
export default function ProtonCollision({ className = '' }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const scene = createCollisionScene(canvas);
    const reduced = prefersReducedMotion();
    if (reduced) scene.drawFinal();

    // Dispara ao entrar na tela (só na transição fora -> dentro).
    let visible = false;
    const intersection = new IntersectionObserver(
      ([entry]) => {
        const nowVisible = entry.isIntersecting && entry.intersectionRatio >= VISIBLE_THRESHOLD;
        if (nowVisible && !visible && !reduced) scene.play();
        visible = nowVisible;
      },
      { threshold: [0, VISIBLE_THRESHOLD] },
    );
    intersection.observe(canvas);

    const resize = new ResizeObserver(() => scene.resize());
    resize.observe(canvas);

    // Tema claro/escuro trocado com a cena já desenhada: redesenha com
    // as cores novas (ThemeContext muda o data-theme do <html>).
    const theme = new MutationObserver(() => scene.redraw());
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    return () => {
      intersection.disconnect();
      resize.disconnect();
      theme.disconnect();
      scene.destroy();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`proton-collision ${className}`}
      role="img"
      aria-label="Animação de uma colisão entre dois prótons vista num detector de partículas"
    />
  );
}
