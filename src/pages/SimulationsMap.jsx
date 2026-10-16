import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import CategoryCover from '../components/simulations/CategoryCover';
import { SIMULATION_CATEGORIES } from '../data/simulationCategories';
import './SimulationsMap.css';

// Página "Simulações" da navbar: 4 cards (um por área) numa grade 2x2.
//
// Com mouse: passar por cima de um card abre ele — a linha e a coluna
// dele crescem ~50% e os outros três encolhem (classes .open-N no CSS).
// A altura total da grade é fixa, então a página não muda de tamanho:
// card de baixo cresce pra cima, card de cima cresce pra baixo.
// Dentro do card aberto, um carrossel passa pela ilustração da área e
// depois pelas simulações cadastradas nela.
//
// Em toque (celular/tablet) ou tela estreita: não existe "passar o
// mouse", então tocar num card abre ele por cima da grade, com botão de
// fechar.
//
// Tudo vem de data/simulationCategories.js — cadastrar uma simulação lá
// já faz ela aparecer no carrossel e no contador do card.

const SLIDE_MS = 2200;

function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, [query]);
  return matches;
}

function slidesFor(category) {
  return [
    { key: 'cover', kind: 'cover', label: category.label },
    ...category.items.map((item) => ({
      key: item.path,
      kind: 'sim',
      label: item.label,
      image: item.image,
    })),
  ];
}

function countLabel(category) {
  const n = category.items.length;
  if (n === 0) return 'Em breve';
  return n === 1 ? '1 simulação' : `${n} simulações`;
}

function Carousel({ category, current, isOpen, onPick }) {
  const slides = slidesFor(category);
  return (
    <div className="sim-card__media">
      <div className="sim-card__track" style={{ transform: `translateX(-${current * 100}%)` }}>
        {slides.map((slide, index) => (
          <div key={slide.key} className="sim-card__slide" aria-hidden={index !== current}>
            {slide.kind === 'cover' ? (
              <CategoryCover name={category.cover} className="sim-cover" />
            ) : (
              <>
                <img src={slide.image} alt={slide.label} loading="lazy" />
                {isOpen && <span className="sim-card__caption">{slide.label}</span>}
              </>
            )}
          </div>
        ))}
      </div>

      {isOpen && slides.length > 1 && (
        <div className="sim-card__dots">
          {slides.map((slide, index) => (
            <button
              key={slide.key}
              type="button"
              className={`sim-card__dot${index === current ? ' is-active' : ''}`}
              aria-label={`Mostrar ${slide.kind === 'cover' ? 'ilustração da área' : slide.label}`}
              aria-pressed={index === current}
              onClick={(event) => {
                event.stopPropagation();
                onPick(index);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CardBody({ category, index, isOpen, titleId }) {
  return (
    <div className="sim-card__body">
      <span className="sim-card__meta">
        {String(index + 1).padStart(2, '0')} · {countLabel(category)}
      </span>
      <h2 className="sim-card__title" id={titleId}>
        {category.label}
      </h2>
      {isOpen && (
        <div className="sim-card__extra">
          <p className="sim-card__desc">{category.description}</p>
          {category.items.length > 0 ? (
            <Link to={`/simulacoes/categoria/${category.slug}`} className="sim-card__cta">
              Ver a área
            </Link>
          ) : (
            <span className="sim-card__soon">Ainda sem simulações nesta área — em breve.</span>
          )}
        </div>
      )}
    </div>
  );
}

export default function SimulationsMap() {
  const canHover = useMediaQuery('(hover: hover) and (pointer: fine)');
  const narrow = useMediaQuery('(max-width: 640px)');
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const touchMode = !canHover || narrow;

  const [openIndex, setOpenIndex] = useState(-1);
  const [slide, setSlide] = useState(0);

  // Carrossel automático do card aberto (desligado com "reduzir
  // movimento" — aí só os pontinhos trocam de imagem).
  useEffect(() => {
    if (openIndex < 0 || reducedMotion) return undefined;
    const count = slidesFor(SIMULATION_CATEGORIES[openIndex]).length;
    if (count < 2) return undefined;
    const id = setInterval(() => setSlide((s) => (s + 1) % count), SLIDE_MS);
    return () => clearInterval(id);
  }, [openIndex, reducedMotion]);

  // Esc fecha o card aberto no modo de toque.
  useEffect(() => {
    if (!touchMode || openIndex < 0) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') setOpenIndex(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [touchMode, openIndex]);

  function open(index) {
    if (index === openIndex) return;
    setOpenIndex(index);
    setSlide(0);
  }

  function close() {
    setOpenIndex(-1);
    setSlide(0);
  }

  const gridClass = [
    'sim-grid',
    touchMode ? 'is-touch' : '',
    !touchMode && openIndex >= 0 ? `open-${openIndex}` : '',
  ]
    .filter(Boolean)
    .join(' ');

  const openCategory = openIndex >= 0 ? SIMULATION_CATEGORIES[openIndex] : null;

  return (
    <div className="sim-map-page">
      <Navbar />
      <main className="sim-map">
        <svg className="sim-map__rings" viewBox="0 0 900 900" aria-hidden="true" focusable="false">
          <circle cx="450" cy="450" r="90" />
          <circle cx="450" cy="450" r="160" />
          <circle cx="450" cy="450" r="230" />
          <circle cx="450" cy="450" r="300" />
          <circle cx="450" cy="450" r="370" />
          <circle cx="450" cy="450" r="440" />
          <line x1="0" y1="450" x2="900" y2="450" />
        </svg>

        <header className="sim-map__header">
          <h1 className="sim-map__title">Simulações</h1>
          <p className="sim-map__lede">
            Experimentos reais no Geant4, organizados por área da física.{' '}
            {touchMode
              ? 'Toque numa área pra ver as simulações dela.'
              : 'Passe o mouse numa área pra ver as simulações dela.'}
          </p>
        </header>

        <div
          className={gridClass}
          onMouseLeave={touchMode ? undefined : close}
          onBlur={
            touchMode
              ? undefined
              : (event) => {
                  if (!event.currentTarget.contains(event.relatedTarget)) close();
                }
          }
        >
          {SIMULATION_CATEGORIES.map((category, index) => {
            const isOpen = index === openIndex;
            const titleId = `sim-card-title-${category.slug}`;

            if (touchMode) {
              return (
                <button
                  key={category.slug}
                  type="button"
                  className="sim-tile"
                  aria-expanded={isOpen}
                  onClick={() => (isOpen ? close() : open(index))}
                >
                  <span className="sim-tile__media">
                    <CategoryCover name={category.cover} className="sim-cover" />
                  </span>
                  <span className="sim-tile__body">
                    <span className="sim-card__meta">
                      {String(index + 1).padStart(2, '0')} · {countLabel(category)}
                    </span>
                    <span className="sim-tile__title">{category.label}</span>
                  </span>
                </button>
              );
            }

            const classes = ['sim-card'];
            if (isOpen) classes.push('is-open');
            if (openIndex >= 0 && !isOpen) classes.push('is-dim');

            return (
              <article
                key={category.slug}
                className={classes.join(' ')}
                tabIndex={0}
                aria-labelledby={titleId}
                onMouseEnter={() => open(index)}
                onFocus={() => open(index)}
              >
                <Carousel
                  category={category}
                  current={isOpen ? slide : 0}
                  isOpen={isOpen}
                  onPick={setSlide}
                />
                <CardBody category={category} index={index} isOpen={isOpen} titleId={titleId} />
              </article>
            );
          })}

          {touchMode && openCategory && (
            <article
              className="sim-card is-open sim-overlay"
              aria-labelledby={`sim-overlay-title-${openCategory.slug}`}
            >
              <Carousel category={openCategory} current={slide} isOpen onPick={setSlide} />
              <button type="button" className="sim-overlay__close" aria-label="Fechar" onClick={close}>
                <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
                  <path
                    d="M6 6l12 12M18 6L6 18"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
              <CardBody
                category={openCategory}
                index={openIndex}
                isOpen
                titleId={`sim-overlay-title-${openCategory.slug}`}
              />
            </article>
          )}
        </div>
      </main>
    </div>
  );
}
