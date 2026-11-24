import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Zueira } from '../../context/Zueira';
import './Hero.css';

export default function Hero() {
  const videoRef = useRef(null);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;
    if (prefersReducedMotion && videoRef.current) {
      videoRef.current.pause();
    }
  }, []);

  return (
    <section className="hero">
      <div className="hero__content">
        <Zueira>
          <p className="zueira-tag">Nível de radiação de fundo: de boa</p>
        </Zueira>
        <h1 className="hero__title">
          <Zueira fallback="Geantino Labs">Geantino City</Zueira>
        </h1>
        <p className="hero__lede">
          <Zueira
            fallback={(
              <>
                Uma plataforma web que roda simulações reais no Geant4 — o mesmo motor
                científico usado no CERN — direto do navegador, sem instalação.
              </>
            )}
          >
            Onde os elétrons não respeitam semáforo e o geantino atravessa tudo
            sem pagar pedágio. As simulações continuam reais, no Geant4, direto
            do navegador.
          </Zueira>
        </p>
        <Link to="/simulacoes/rutherford" className="hero__cta">
          <Zueira fallback="Explorar simulações">Partiu fazer física</Zueira>
        </Link>
      </div>

      <div className="hero__stage" aria-hidden="true">
        <video
          ref={videoRef}
          className="hero__video"
          src="/videos/hero-simulacao.mp4"
          poster="/videos/hero-simulacao-poster.jpg"
          autoPlay
          loop
          muted
          playsInline
        />
      </div>
    </section>
  );
}
