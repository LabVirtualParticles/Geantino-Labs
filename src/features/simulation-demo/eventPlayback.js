import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

// Playback evento a evento do visualizador 3D (design completo em
// claude/design-playback-eventos.md, no projeto). Modo acumulativo: as
// trajetórias vão aparecendo evento por evento e ficam na tela até
// completar tudo, como se a simulação estivesse "se formando".

// Quanto tempo o playback leva do primeiro ao último evento em 1×,
// independente de quantos eventos são (100 ou 5000) — com muitos eventos
// cada quadro revela vários de uma vez.
export const PLAYBACK_DURATION_MS = 6000;
export const PLAYBACK_SPEEDS = [0.5, 1, 2];

// Eventos revelados nos últimos RECENT_FRACTION do total ficam com cor
// cheia; os anteriores ficam mais apagados — dá a sensação de "acontecendo
// agora". Mínimo de 1 evento.
const RECENT_FRACTION = 0.04;

/**
 * Ordena as trajetórias por evento e calcula, pra cada quantidade de
 * eventos revelados, quantas trajetórias isso representa.
 * Trajetória sem `event` (ex.: dados de exemplo) conta como evento próprio.
 * @returns {{ trajectories: object[], eventCount: number, endIndex: number[] }}
 *   endIndex[k] = quantas trajetórias aparecem com k eventos revelados.
 */
export function groupByEvent(trajectories) {
  const withKey = trajectories.map((trajectory, index) => ({
    trajectory,
    key: trajectory.event ?? `solo-${index}`,
    index,
  }));

  // Ordem dos eventos = ordem em que aparecem (o backend já manda em
  // ordem); dentro do evento, mantém a ordem original (primária primeiro).
  const order = new Map();
  for (const item of withKey) {
    if (!order.has(item.key)) order.set(item.key, order.size);
  }
  withKey.sort((a, b) => order.get(a.key) - order.get(b.key) || a.index - b.index);

  const endIndex = [0];
  let previousKey;
  withKey.forEach((item, position) => {
    if (position > 0 && item.key !== previousKey) endIndex.push(position);
    previousKey = item.key;
  });
  if (withKey.length > 0) endIndex.push(withKey.length);

  return {
    trajectories: withKey.map((item) => item.trajectory),
    eventCount: endIndex.length - 1,
    endIndex,
  };
}

function prefersReducedMotion() {
  return typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Estado do playback. `resetKey` muda a cada simulação nova (ex.: o objeto
 * `data`): o playback volta pro começo e começa a tocar sozinho — a não
 * ser com "reduzir movimento" ligado (ou `enabled` falso), que já mostra
 * tudo.
 */
export function useEventPlayback(eventCount, { resetKey, enabled = true } = {}) {
  // Só a parte inteira vai pro estado: o React re-renderiza quando muda o
  // número de eventos visíveis, não a cada quadro.
  const [revealed, setRevealed] = useState(eventCount);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  // Muda quando a posição é trocada "de fora" (seek, recomeçar, simulação
  // nova) — faz o loop de animação recomeçar dessa posição.
  const [jumpToken, setJumpToken] = useState(0);

  // Simulação nova → recomeça e toca. Feito durante a renderização (e não
  // num efeito) pra não existir nenhum quadro com tudo desenhado antes do
  // playback começar.
  const [appliedKey, setAppliedKey] = useState(resetKey);
  if (resetKey !== appliedKey) {
    const animate = enabled && eventCount > 0 && !prefersReducedMotion();
    setAppliedKey(resetKey);
    setRevealed(animate ? 0 : eventCount);
    setIsPlaying(animate);
    setJumpToken((token) => token + 1);
  }

  // Posição atual num ref, pro loop saber de onde começar.
  const latestRef = useRef(revealed);
  useLayoutEffect(() => {
    latestRef.current = revealed;
  });

  // Loop de animação: avança proporcional ao tempo real (não "1 evento
  // por quadro"), então a duração é a mesma em qualquer computador.
  useEffect(() => {
    if (!isPlaying) return undefined;
    let frame = 0;
    let last = performance.now();
    let current = latestRef.current;
    const perMs = (eventCount / PLAYBACK_DURATION_MS) * speed;

    const tick = (now) => {
      // O timestamp do rAF pode vir um pouco antes do performance.now()
      // inicial (dt negativo) — por isso o max(0). O teto evita um salto
      // grande depois de a aba ficar em segundo plano.
      const dt = Math.max(0, Math.min(250, now - last));
      last = now;
      current = Math.min(eventCount, current + dt * perMs);
      setRevealed(Math.floor(current));
      if (current >= eventCount) {
        setIsPlaying(false);
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [isPlaying, speed, eventCount, jumpToken]);

  const toggle = useCallback(() => {
    if (isPlaying) {
      setIsPlaying(false);
      return;
    }
    // Play no fim recomeça do zero.
    if (revealed >= eventCount) {
      setRevealed(0);
      setJumpToken((token) => token + 1);
    }
    setIsPlaying(true);
  }, [isPlaying, revealed, eventCount]);

  const seek = useCallback(
    (value) => {
      setRevealed(Math.max(0, Math.min(eventCount, Math.round(value))));
      setJumpToken((token) => token + 1);
    },
    [eventCount],
  );

  const revealedEvents = Math.min(eventCount, revealed);
  const recentEvents = Math.max(1, Math.ceil(eventCount * RECENT_FRACTION));

  return {
    revealedEvents,
    eventCount,
    isPlaying,
    speed,
    setSpeed,
    toggle,
    seek,
    // Destaque do "agora" só faz sentido no meio do caminho.
    recentFromEvent:
      revealedEvents > 0 && revealedEvents < eventCount
        ? Math.max(0, revealedEvents - recentEvents)
        : 0,
  };
}
