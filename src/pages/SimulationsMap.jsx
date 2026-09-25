import { useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import { SIMULATION_CATEGORIES } from '../data/simulationCategories';
import './SimulationsMap.css';

// Landing page for "Simulações" in the navbar — replaces the old
// hover dropdown. Shows one card per category fanning out from the
// center title; click a card to go to its catalog (or, for a
// category whose `directPath` is set, straight to that simulation).
function categoryHref(category) {
  return category.directPath ?? `/simulacoes/categoria/${category.slug}`;
}

// Point where a straight line from `from` to `to` crosses the border
// of the rectangle centered on `from` — i.e. where the connector
// should actually touch the card, instead of stopping at an eyeballed
// coordinate that drifts out of place on every screen size.
function pointOnRectBorder(rect, from, to) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const halfW = rect.width / 2;
  const halfH = rect.height / 2;
  const scale = Math.min(
    dx !== 0 ? Math.abs(halfW / dx) : Infinity,
    dy !== 0 ? Math.abs(halfH / dy) : Infinity,
  );
  return { x: from.x + dx * scale, y: from.y + dy * scale };
}

export default function SimulationsMap() {
  const diagramRef = useRef(null);
  const centerRef = useRef(null);
  const cardRefs = useRef([]);
  const [linePaths, setLinePaths] = useState([]);

  useLayoutEffect(() => {
    const diagram = diagramRef.current;
    if (!diagram) return undefined;

    function recompute() {
      const center = centerRef.current;
      if (!diagram || !center) return;

      const diagramRect = diagram.getBoundingClientRect();
      const centerRect = center.getBoundingClientRect();
      const centerPoint = {
        x: centerRect.left + centerRect.width / 2 - diagramRect.left,
        y: centerRect.top + centerRect.height / 2 - diagramRect.top,
      };

      const nextPaths = cardRefs.current.map((card) => {
        if (!card) return '';
        const cardRect = card.getBoundingClientRect();
        const cardCenter = {
          x: cardRect.left + cardRect.width / 2 - diagramRect.left,
          y: cardRect.top + cardRect.height / 2 - diagramRect.top,
        };
        const start = pointOnRectBorder(cardRect, cardCenter, centerPoint);
        const mid = {
          x: (start.x + centerPoint.x) / 2,
          y: (start.y + centerPoint.y) / 2,
        };
        return `M ${start.x} ${start.y} Q ${mid.x} ${mid.y} ${centerPoint.x} ${centerPoint.y}`;
      });

      setLinePaths(nextPaths);
    }

    recompute();

    const resizeObserver = new ResizeObserver(recompute);
    resizeObserver.observe(diagram);
    window.addEventListener('resize', recompute);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', recompute);
    };
  }, []);

  return (
    <>
      <Navbar />
      <main className="sim-map">
        <div className="sim-map__diagram" ref={diagramRef}>
          <svg className="sim-map__lines" aria-hidden="true">
            {linePaths.map(
              (d, index) => d && <path key={SIMULATION_CATEGORIES[index].slug} d={d} />,
            )}
          </svg>

          <div className="sim-map__center" ref={centerRef}>
            <h1 className="sim-map__center-title">Simulações</h1>
            <p className="sim-map__center-hint">
              Escolha uma área para ver as simulações disponíveis.
            </p>
          </div>

          {SIMULATION_CATEGORIES.map((category, index) => (
            <Link
              key={category.slug}
              to={categoryHref(category)}
              ref={(el) => {
                cardRefs.current[index] = el;
              }}
              className={`sim-map__card sim-map__card--${index}`}
            >
              <span className="sim-map__card-title">{category.label}</span>
              <span className="sim-map__card-rule" aria-hidden="true" />
              {category.items.length === 0 && !category.directPath && (
                <span className="sim-map__card-soon">Em breve</span>
              )}
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}
