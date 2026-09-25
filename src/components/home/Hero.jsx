import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
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
        <h1 className="hero__title">Geantino Labs</h1>
        <p className="hero__lede">
          Uma plataforma web que roda simulações reais no Geant4 — o mesmo motor
          científico usado no CERN — direto do navegador, sem instalação.
        </p>
        <Link to="/simulacoes/rutherford" className="hero__cta">
          Explorar simulações
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
