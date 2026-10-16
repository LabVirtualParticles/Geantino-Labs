import { useEffect, useState } from 'react';
import { formatNumber } from './formatParams';

// Indicador por cima do visualizador enquanto a simulação roda.
//
// O backend é síncrono (a resposta só chega quando o Geant4 termina), então
// não existe progresso "de verdade" pra mostrar. O que dá pra fazer com
// honestidade:
//  - cronômetro do tempo decorrido;
//  - se já rodou alguma simulação neste navegador, uma ESTIMATIVA baseada
//    na duração da última (useSimulationRun guarda isso) — a barra enche
//    até 95% e espera a resposta; o texto diz que é estimado;
//  - sem estimativa, barra indeterminada (vai e volta).

const TICK_MS = 100;

export default function RunProgress({ startedAt, estimatedSeconds, events }) {
  const [now, setNow] = useState(() => performance.now());

  useEffect(() => {
    const id = setInterval(() => setNow(performance.now()), TICK_MS);
    return () => clearInterval(id);
  }, []);

  const elapsed = startedAt ? Math.max(0, (now - startedAt) / 1000) : 0;
  const hasEstimate = Number.isFinite(estimatedSeconds) && estimatedSeconds > 0;
  const fraction = hasEstimate ? Math.min(0.95, elapsed / estimatedSeconds) : null;
  const slow = hasEstimate && elapsed > estimatedSeconds * 2;

  let hint = 'Primeira simulação: ainda sem estimativa de tempo.';
  if (hasEstimate) {
    hint = slow
      ? 'Está levando mais que o esperado — o Geant4 ainda está trabalhando.'
      : `≈ ${formatNumber(estimatedSeconds, 1)} s no total (estimado pela última simulação)`;
  }

  return (
    <div className="simulation-viewer__overlay run-progress" role="status" aria-live="polite">
      <div className="run-progress__box">
        <p className="run-progress__title">Rodando no Geant4…</p>
        <p className="run-progress__meta">
          {events ? `${formatNumber(events, 0)} partículas · ` : ''}
          <span className="run-progress__time">{formatNumber(elapsed, 1)} s</span>
        </p>
        <div
          className={`run-progress__bar${hasEstimate ? '' : ' run-progress__bar--indeterminate'}`}
          role="progressbar"
          aria-label="Progresso estimado da simulação"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={hasEstimate ? Math.round(fraction * 100) : undefined}
        >
          <span
            className="run-progress__fill"
            style={hasEstimate ? { transform: `scaleX(${fraction})` } : undefined}
          />
        </div>
        <p className="run-progress__hint">{hint}</p>
      </div>
    </div>
  );
}
