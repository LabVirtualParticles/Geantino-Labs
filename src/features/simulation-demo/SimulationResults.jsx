import { useEffect, useMemo, useRef, useState } from 'react';
import { beamDirectionFromParams, computeScatteringAngles } from './angularHistogram';
import {
  binAtX,
  buildRutherfordTheory,
  buildScatteringHistogram,
  chartColorsFromTheme,
  computeScatteringStats,
  drawScatteringChart,
} from './scatteringChart';
import { formatNumber, formatParams, formatSeed } from './formatParams';

// Seção "Resultados" que aparece embaixo do visualizador 3D assim que a
// simulação termina: gráfico (com seletor de visualização) à esquerda,
// tabelas de resumo e de parâmetros ao lado. Mesmos dados do relatório
// do painel, menos o print do detector.
//
// Quais gráficos aparecem depende da simulação: `schema.charts` no JSON
// de parâmetros (ex. "charts": ["scattering"] no Rutherford). Simulação
// sem `charts` mostra só as tabelas.

const CHART_VIEWS = [
  { id: 'log', label: 'Distribuição angular' },
  { id: 'theory', label: 'Comparar com Rutherford' },
];

export default function SimulationResults({ schema, data, meta }) {
  const hasScattering = (schema.charts ?? []).includes('scattering');
  const [view, setView] = useState('log');

  const analysis = useMemo(() => {
    if (!hasScattering) return null;
    const angles = computeScatteringAngles(
      data.trajectories ?? [],
      beamDirectionFromParams(meta?.paramsUsed),
    );
    const histogram = buildScatteringHistogram(angles);
    return {
      stats: computeScatteringStats(angles),
      histogram,
      theory: buildRutherfordTheory(histogram),
    };
  }, [hasScattering, data, meta]);

  const paramRows = formatParams(meta?.paramsUsed);
  const seedText = formatSeed(meta?.seed);
  const stats = analysis?.stats;

  return (
    <section className="sim-results" aria-labelledby="sim-results-title">
      <h2 className="sim-results__title" id="sim-results-title">
        Resultados
      </h2>

      <div className={`sim-results__grid${hasScattering ? '' : ' sim-results__grid--tables'}`}>
        {hasScattering && (
          <div className="sim-results__chart-card">
            <div className="sim-results__chart-head">
              <div className="sim-results__views" role="tablist" aria-label="Visualização do gráfico">
                {CHART_VIEWS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    role="tab"
                    aria-selected={view === option.id}
                    className={`sim-results__view${view === option.id ? ' is-active' : ''}`}
                    onClick={() => setView(option.id)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <ScatteringChart analysis={analysis} mode={view} />

            <p className="sim-results__note">
              {view === 'log' ? (
                <>
                  Cada barra conta quantas partículas desviaram naquela faixa de ângulo. A escala
                  log deixa visíveis os desvios grandes, que são raros.
                </>
              ) : analysis.theory.ok ? (
                <>
                  A linha é a previsão de Rutherford para um único desvio no núcleo, ajustada às
                  partículas acima de {analysis.theory.fitFrom}°. Abaixo disso a simulação foge da
                  curva: perto de 0° fica bem abaixo (os elétrons do átomo blindam o núcleo) e entre
                  uns 4° e 10° fica acima, porque vários desvios pequenos seguidos se somam
                  (espalhamento múltiplo).
                </>
              ) : (
                `Poucas partículas acima de ${analysis.theory.fitFrom}° pra comparar com a teoria ` +
                `(${analysis.theory.tailCount}). Rode com mais partículas pra ver a curva.`
              )}
            </p>
          </div>
        )}

        <aside className="sim-results__side">
          <div className="sim-results__table-block">
            <h3>Resumo</h3>
            <table className="sim-results__table">
              <tbody>
                {stats && (
                  <>
                    <Row label="Partículas analisadas" value={formatNumber(stats.count, 0)} />
                    <Row label="Ângulo médio" value={formatAngle(stats.mean)} />
                    <Row label="Mediana" value={formatAngle(stats.median)} />
                    <Row label="Maior desvio" value={formatAngle(stats.max)} />
                    <Row label="Acima de 10°" value={formatShare(stats.above10, stats.count)} />
                    <Row label="Voltaram (> 90°)" value={formatShare(stats.above90, stats.count)} />
                  </>
                )}
                {!stats && (
                  <Row label="Trajetórias" value={formatNumber(data.trajectories?.length ?? 0, 0)} />
                )}
                {meta?.durationSeconds != null && (
                  <Row label="Duração" value={`${formatNumber(meta.durationSeconds)} s`} />
                )}
                <Row label="Seed" value={seedText ?? 'Não disponível'} />
              </tbody>
            </table>
          </div>

          {paramRows.length > 0 && (
            <div className="sim-results__table-block">
              <h3>Parâmetros</h3>
              <table className="sim-results__table">
                <tbody>
                  {paramRows.map((row) => (
                    <Row key={row.key} label={row.label} value={row.value} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}

function Row({ label, value }) {
  return (
    <tr>
      <th scope="row">{label}</th>
      <td>{value}</td>
    </tr>
  );
}

function formatAngle(value) {
  return value == null ? '—' : `${formatNumber(value, 1)}°`;
}

function formatShare(part, total) {
  if (!total) return '—';
  const percent = (part / total) * 100;
  return `${formatNumber(part, 0)} (${formatNumber(percent, percent < 1 && percent > 0 ? 2 : 1)}%)`;
}

// Canvas do gráfico: redesenha ao mudar de dados/visualização, ao
// redimensionar e ao trocar o tema (lê as cores dos tokens do CSS).
function ScatteringChart({ analysis, mode }) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [themeKey, setThemeKey] = useState(0);
  const [hoverBin, setHoverBin] = useState(-1);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return undefined;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ width: Math.round(width), height: Math.round(height) });
    });
    observer.observe(wrap);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const observer = new MutationObserver(() => setThemeKey((key) => key + 1));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !size.width || !size.height) return;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(size.width * ratio);
    canvas.height = Math.round(size.height * ratio);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    drawScatteringChart(ctx, {
      width: size.width,
      height: size.height,
      mode,
      histogram: analysis.histogram,
      theory: analysis.theory,
      colors: chartColorsFromTheme(),
      highlightBin: hoverBin,
    });
  }, [analysis, mode, size, themeKey, hoverBin]);

  const { histogram, theory } = analysis;

  // Mouse: segue o cursor. Toque: o toque escolhe a faixa (e ela fica
  // marcada até tocar em outra).
  function pickBin(event) {
    const rect = event.currentTarget.getBoundingClientRect();
    setHoverBin(binAtX(event.clientX - rect.left, rect.width, histogram));
  }

  let readout = 'Passe o mouse (ou toque) no gráfico para ver cada faixa.';
  if (hoverBin >= 0) {
    const from = hoverBin * histogram.binSize;
    const to = from + histogram.binSize;
    const count = histogram.counts[hoverBin];
    readout = `${from}°–${to}°: ${formatNumber(count, 0)} ${count === 1 ? 'partícula' : 'partículas'}`;
    if (mode === 'theory' && theory.ok && from >= 2) {
      readout += ` · teoria: ${formatNumber(theory.expected[hoverBin], 1)}`;
    }
  }

  return (
    <>
      <div className="sim-results__canvas-wrap" ref={wrapRef}>
        <canvas
          ref={canvasRef}
          className="sim-results__canvas"
          role="img"
          aria-label={
            mode === 'theory'
              ? 'Distribuição angular das partículas comparada com a curva de Rutherford'
              : 'Distribuição angular das partículas em escala logarítmica'
          }
          onPointerMove={pickBin}
          onPointerDown={pickBin}
          onPointerLeave={(event) => {
            if (event.pointerType === 'mouse') setHoverBin(-1);
          }}
        />
      </div>
      <p className="sim-results__readout" aria-live="polite">
        {readout}
      </p>
    </>
  );
}
