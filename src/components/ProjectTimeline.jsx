import { useEffect, useRef } from 'react';
import { PROJECT_TIMELINE } from '../data/projectTimeline';
import TimelineCanvasFX from './TimelineCanvasFX';
import './ProjectTimeline.css';

// Agrupa os marcos por ano mantendo a ordem do arquivo de dados.
function groupByYear(items) {
  const groups = [];
  for (const item of items) {
    const last = groups[groups.length - 1];
    if (last && last.year === item.year) last.items.push(item);
    else groups.push({ year: item.year, items: [item] });
  }
  return groups;
}

// Revela cada marco (e cada ano) quando ele entra na tela. Sem
// IntersectionObserver ou com "reduzir movimento", tudo aparece de vez.
function useReveal(rootRef) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    const targets = root.querySelectorAll('[data-reveal]');
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    if (reduce || !('IntersectionObserver' in window)) {
      targets.forEach((el) => el.classList.add('is-visible'));
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: '0px 0px -15% 0px', threshold: 0.2 },
    );
    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [rootRef]);
}

// A linha da timeline "acende" de cima para baixo conforme a rolagem.
function useTrackProgress(trackRef) {
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return undefined;
    let frame = 0;

    const update = () => {
      frame = 0;
      const rect = track.getBoundingClientRect();
      const p = (window.innerHeight * 0.6 - rect.top) / Math.max(1, rect.height);
      track.style.setProperty('--tl-progress', Math.min(1, Math.max(0, p)).toFixed(4));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [trackRef]);
}

export default function ProjectTimeline() {
  const rootRef = useRef(null);
  const trackRef = useRef(null);
  useReveal(rootRef);
  useTrackProgress(trackRef);
  const groups = groupByYear(PROJECT_TIMELINE);

  return (
    <section className="timeline" aria-labelledby="timeline-title" ref={rootRef}>
      <div className="timeline__fx" aria-hidden="true">
        <TimelineCanvasFX sectionRef={rootRef} />
      </div>

      <div className="timeline__inner">
        <header className="timeline__header" data-reveal>
          <h2 className="timeline__title" id="timeline-title">
            Nossa trajetória
          </h2>
          <p className="timeline__lede">
            Do primeiro contato com o Geant4 ao laboratório virtual no ar.
          </p>
        </header>

        <div className="timeline__track" ref={trackRef}>
          {groups.map((group) => (
            <div className="timeline__year" key={group.year}>
              <h3 className="timeline__year-label" data-reveal>
                <span className="timeline__year-node" aria-hidden="true" />
                {group.year}
              </h3>

              <ol className="timeline__list">
                {group.items.map((item) => (
                  <li
                    key={`${item.dateTime}-${item.title}`}
                    data-reveal
                    className={[
                      'timeline__item',
                      item.tag ? 'timeline__item--highlight' : '',
                      item.upcoming ? 'timeline__item--upcoming' : '',
                    ].join(' ')}
                  >
                    <span className="timeline__node" aria-hidden="true" />
                    <div className="timeline__meta">
                      {item.upcoming ? (
                        <span className="timeline__date">{item.date}</span>
                      ) : (
                        <time className="timeline__date" dateTime={item.dateTime}>
                          {item.date}
                        </time>
                      )}
                      {item.tag && <span className="timeline__tag">{item.tag}</span>}
                    </div>
                    <h4 className="timeline__item-title">{item.title}</h4>
                    <p className="timeline__text">{item.text}</p>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
