import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import CategoryCover from './simulations/CategoryCover';
import { SIMULATION_CATEGORIES } from '../data/simulationCategories';
import './Categories.css';

// "Explore por área" da Home: carrossel com um card quadrado por área
// (mesma ilustração dos cards da página /simulacoes). O card do centro
// fica em destaque (um pouco maior); os vizinhos aparecem dos lados,
// menores, escurecidos e desfocados.
//
// - Avança sozinho a cada AUTOPLAY_MS, sempre. Só pausa enquanto alguém
//   navega pelo teclado dentro do carrossel (foco visível) — clicar numa
//   seta com o mouse NÃO pausa. Trocar de card na mão reinicia a contagem.
//   Com "reduzir movimento" ligado continua passando, só que sem animação.
// - Setas, bolinhas, clique num card do lado, arrastar no celular e as
//   teclas ← → (com o foco no carrossel) trocam o card.
// - Os dados vêm de data/simulationCategories.js, igual à /simulacoes.

const AUTOPLAY_MS = 4500;
const SWIPE_MIN_PX = 40;

function countLabel(category) {
  const n = category.items.length;
  if (n === 0) return 'Em breve';
  return n === 1 ? '1 simulação' : `${n} simulações`;
}

// Distância circular do card até o ativo: 0 = centro, -1 esquerda, 1
// direita; os demais ficam escondidos atrás (|offset| ≥ 2).
function circularOffset(index, active, total) {
  let offset = (index - active) % total;
  if (offset > total / 2) offset -= total;
  if (offset <= -total / 2) offset += total;
  return offset;
}

export default function Categories() {
  const categories = SIMULATION_CATEGORIES;
  const total = categories.length;
  // `previous` serve pra saber quem "deu a volta" (saiu por um lado e
  // entrou pelo outro): esse card troca de lugar sem animação, escondido,
  // em vez de atravessar o carrossel inteiro.
  const [slide, setSlide] = useState({ active: 0, previous: 0 });
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef(null);
  const { active, previous } = slide;

  const go = useCallback(
    (index) =>
      setSlide((current) => ({ active: ((index % total) + total) % total, previous: current.active })),
    [total],
  );
  const next = useCallback(
    () => setSlide((current) => ({ active: (current.active + 1) % total, previous: current.active })),
    [total],
  );
  const prev = useCallback(
    () =>
      setSlide((current) => ({ active: (current.active - 1 + total) % total, previous: current.active })),
    [total],
  );

  // `active` nas dependências: trocar de card na mão reinicia a contagem.
  useEffect(() => {
    if (paused || total < 2) return undefined;
    const id = setInterval(next, AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [paused, total, next, active]);

  return (
    <section className="categories" aria-labelledby="categories-title">
      <div className="categories__inner">
        <h2 className="categories__title" id="categories-title">
          Explore por área
        </h2>

        <div
          className="cat-carousel"
          role="region"
          aria-roledescription="carrossel"
          aria-label="Áreas da física"
          tabIndex={0}
          onFocus={(event) => {
            if (event.target.matches(':focus-visible')) setPaused(true);
          }}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false);
          }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowRight') {
              event.preventDefault();
              next();
            } else if (event.key === 'ArrowLeft') {
              event.preventDefault();
              prev();
            }
          }}
          onTouchStart={(event) => {
            touchStartX.current = event.touches[0].clientX;
          }}
          onTouchEnd={(event) => {
            if (touchStartX.current === null) return;
            const dx = event.changedTouches[0].clientX - touchStartX.current;
            touchStartX.current = null;
            if (dx <= -SWIPE_MIN_PX) next();
            else if (dx >= SWIPE_MIN_PX) prev();
          }}
        >
          <div className="cat-carousel__stage">
            {categories.map((category, index) => {
              const offset = circularOffset(index, active, total);
              const before = circularOffset(index, previous, total);
              const isActive = offset === 0;
              const isSide = Math.abs(offset) === 1;
              const classes = ['cat-card'];
              if (isActive) classes.push('is-active');
              else if (isSide) classes.push('is-side');
              else classes.push('is-hidden');
              if (Math.abs(offset - before) > 1) classes.push('no-transition');

              return (
                <article
                  key={category.slug}
                  className={classes.join(' ')}
                  style={{ '--offset': offset }}
                  role="group"
                  aria-roledescription="slide"
                  aria-label={`${index + 1} de ${total}: ${category.label}`}
                  aria-hidden={!isActive}
                  onClick={isSide ? () => go(index) : undefined}
                >
                  <div className="cat-card__media">
                    <CategoryCover name={category.cover} className="cat-card__cover" />
                  </div>
                  <div className="cat-card__body">
                    <span className="cat-card__meta">
                      {String(index + 1).padStart(2, '0')} · {countLabel(category)}
                    </span>
                    <h3 className="cat-card__title">{category.label}</h3>
                    <p className="cat-card__desc">{category.description}</p>
                    {category.items.length > 0 ? (
                      <Link
                        to={`/simulacoes/categoria/${category.slug}`}
                        className="cat-card__cta"
                        tabIndex={isActive ? 0 : -1}
                      >
                        Ver a área →
                      </Link>
                    ) : (
                      <span className="cat-card__soon">Simulações em breve</span>
                    )}
                  </div>
                </article>
              );
            })}
          </div>

          <div className="cat-carousel__controls">
            <button
              type="button"
              className="cat-carousel__arrow"
              onClick={prev}
              aria-label="Área anterior"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
                <path
                  d="M15 5l-7 7 7 7"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            <div className="cat-carousel__dots">
              {categories.map((category, index) => (
                <button
                  key={category.slug}
                  type="button"
                  className={`cat-carousel__dot${index === active ? ' is-active' : ''}`}
                  aria-label={`Mostrar ${category.label}`}
                  aria-current={index === active}
                  onClick={() => go(index)}
                />
              ))}
            </div>

            <button
              type="button"
              className="cat-carousel__arrow"
              onClick={next}
              aria-label="Próxima área"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
                <path
                  d="M9 5l7 7-7 7"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>

          <p className="cat-carousel__live" aria-live="polite">
            {categories[active].label}
          </p>
        </div>

        <p className="categories__all">
          <Link to="/simulacoes">Ver todas as simulações</Link>
        </p>
      </div>
    </section>
  );
}
