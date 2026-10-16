import { useEffect, useRef } from 'react';
import { createCollisionScene } from './collisionScene';
import './ProtonCollision.css';

// Intervalo entre uma colisão e a próxima enquanto a área está na tela
// (a animação em si dura ~2,5 s + 0,5 s pra sumir, então cabe folgado).
const REPEAT_MS = 5000;

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Colisão próton-próton (event display de detector) que toca quando a
 * área aparece na tela e depois sorteia uma colisão nova a cada
 * REPEAT_MS enquanto ela continuar visível. Fora da tela, para de
 * repetir (não gasta CPU à toa); ao voltar, toca na hora e retoma o
 * ciclo. Com "reduzir movimento" ligado no sistema, mostra direto uma
 * colisão já pronta, sem animar nem repetir.
 */
export default function ProtonCollision({ className = '' }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const scene = createCollisionScene(canvas);
    const reduced = prefersReducedMotion();
    if (reduced) scene.drawFinal();

    // Dispara ao entrar na tela (só na transição fora -> dentro) e
    // repete a cada REPEAT_MS enquanto estiver visível.
    let visible = false;
    let timer = 0;
    const stopRepeating = () => {
      clearInterval(timer);
      timer = 0;
    };
    const intersection = new IntersectionObserver(
      ([entry]) => {
        // Dispara assim que qualquer pedaço da seção entra na tela.
        const nowVisible = entry.isIntersecting;
        if (nowVisible && !visible && !reduced) {
          scene.play();
          stopRepeating();
          timer = setInterval(() => scene.play(), REPEAT_MS);
        } else if (!nowVisible && visible) {
          stopRepeating();
        }
        visible = nowVisible;
      },
      { threshold: 0 },
    );
    intersection.observe(canvas);

    const resize = new ResizeObserver(() => scene.resize());
    resize.observe(canvas);

    // Tema claro/escuro trocado com a cena já desenhada: redesenha com
    // as cores novas (ThemeContext muda o data-theme do <html>).
    const theme = new MutationObserver(() => scene.redraw());
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    return () => {
      stopRepeating();
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
