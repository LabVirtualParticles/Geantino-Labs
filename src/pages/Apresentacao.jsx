import { useCallback, useEffect, useRef, useState } from 'react';
import ShowerTitle from '../components/home/ShowerTitle';
import { createIntroScene, LOGO, TRACK_COLORS } from '../features/apresentacao/introScene';
import './Apresentacao.css';

// Página de apresentação em tela cheia (feiras: FICIÊNCIAS etc.).
// De propósito NÃO tem link em nenhum lugar do site — só abre por
// /apresentacao digitado ou compartilhado. Não usa Navbar nem Footer e
// pede pros buscadores não indexarem.
//
// Teclas: F (ou duplo clique) = tela cheia · Espaço / R = recomeçar.

const SUBTITLE = 'Simulações de física de partículas com o Geant4, direto no navegador';
const INSTITUTION = 'IFPR · Centro de Referência Biopark · Toledo – PR';

// Chuveiro do nome em tamanho de telão: mais gerações (mais depósitos),
// partículas mais rápidas (o caminho é longo) e traços mais grossos.
const WORDMARK_SHOWER = {
  generations: 8,
  speed: 0.95,
  revealMs: 750,
  trailFadeMs: 1000,
  flashMs: 380,
  bendFactor: 0.16,
  sampleGap: 3,
  padding: { left: 320, right: 60, top: 90, bottom: 90 },
  lineScale: 1.7,
};

// A apresentação é sempre no visual escuro original (preto e branco),
// independente do tema escolhido no Painel — estilo inline no <html>
// ganha de qualquer :root[data-theme=...]. Desfeito ao sair da página.
const FORCED_VARS = {
  '--color-void': '#000000',
  '--color-beam': '#ffffff',
  '--color-trace': '#9a9a9a',
  '--color-on-void': 'rgba(255, 255, 255, 0.96)',
  '--color-on-void-soft': 'rgba(255, 255, 255, 0.62)',
};

function useForcedDarkLook() {
  useEffect(() => {
    const root = document.documentElement;
    for (const [name, value] of Object.entries(FORCED_VARS)) root.style.setProperty(name, value);

    const previousTitle = document.title;
    document.title = 'Geantino Labs';
    const robots = document.createElement('meta');
    robots.name = 'robots';
    robots.content = 'noindex, nofollow';
    document.head.appendChild(robots);

    return () => {
      for (const name of Object.keys(FORCED_VARS)) root.style.removeProperty(name);
      document.title = previousTitle;
      robots.remove();
    };
  }, []);
}

function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen?.();
  else document.documentElement.requestFullscreen?.().catch(() => {});
}

export default function Apresentacao() {
  useForcedDarkLook();
  const canvasRef = useRef(null);
  const sceneRef = useRef(null);
  const [phase, setPhase] = useState('start');
  const [loop, setLoop] = useState(0);
  const [idle, setIdle] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const scene = createIntroScene(canvas, {
      onPhase: (name) => {
        if (name === 'start') setLoop((n) => n + 1);
        setPhase(name);
      },
    });
    sceneRef.current = scene;

    let alive = true;
    // Garante as fontes antes de começar (o nome é desenhado a partir
    // delas e os símbolos das partículas usam a Fraunces).
    Promise.all([
      document.fonts.load('400 100px Ykar'),
      document.fonts.load('italic 400 40px Fraunces'),
      document.fonts.load('400 40px Fraunces'),
    ])
      .catch(() => {})
      .finally(() => alive && scene.start());

    const onResize = () => scene.resize();
    window.addEventListener('resize', onResize);
    return () => {
      alive = false;
      window.removeEventListener('resize', onResize);
      scene.destroy();
    };
  }, []);

  // Teclado
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'f' || e.key === 'F') toggleFullscreen();
      else if (e.key === ' ' || e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        sceneRef.current?.restart();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Esconde cursor e dica quando o mouse fica parado
  const idleTimer = useRef(0);
  const wake = useCallback(() => {
    setIdle(false);
    clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => setIdle(true), 2500);
  }, []);
  useEffect(() => {
    idleTimer.current = setTimeout(() => setIdle(true), 2500);
    return () => clearTimeout(idleTimer.current);
  }, []);

  const showWordmark = ['wordmark', 'subtitle', 'fadeout'].includes(phase);
  const lockupTop = `calc(${LOGO.cy * 100}% + ${LOGO.r * 100 * 1.72}vmin)`;

  return (
    <div
      className="apres"
      data-phase={phase}
      data-idle={idle}
      onMouseMove={wake}
      onDoubleClick={toggleFullscreen}
    >
      <canvas ref={canvasRef} className="apres__canvas" aria-hidden="true" />

      <div className="apres__hud" aria-hidden="true">
        {/* A Ykar não tem acentos — só o nome vai nela. */}
        <p className="apres__hud-title">Geantino Labs</p>
        <p>Visualização de evento · colisão próton-próton (ilustração)</p>
      </div>

      <ul className="apres__legend" aria-hidden="true">
        <li><i style={{ background: TRACK_COLORS.positive }} /> carga <b>+</b></li>
        <li><i style={{ background: TRACK_COLORS.negative }} /> carga <b>−</b></li>
        <li><i className="apres__legend-dash" style={{ color: TRACK_COLORS.neutral }} /> neutra</li>
        <li className="apres__legend-note">cores no padrão do Geant4</li>
      </ul>

      <div className="apres__lockup" style={{ top: lockupTop }}>
        <div className="apres__wordmark-slot">
          {showWordmark && (
            <ShowerTitle key={loop} as="h1" className="apres__wordmark" config={WORDMARK_SHOWER}>
              Geantino Labs
            </ShowerTitle>
          )}
        </div>
        <p className="apres__subtitle">{SUBTITLE}</p>
        <p className="apres__institution">{INSTITUTION}</p>
      </div>

      <p className="apres__credit">
        Geant4 é desenvolvido pela Colaboração Geant4 · geant4.web.cern.ch
      </p>

      <p className="apres__hint">F tela cheia · Espaço recomeça</p>
    </div>
  );
}
