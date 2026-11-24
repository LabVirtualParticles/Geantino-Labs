import { useCallback, useMemo, useState } from 'react';
import {
  SPECTRUM_SERIES,
  chainNodeAt,
  describeNode,
  drawNuclideChart,
  drawSpectrumPanel,
  prepareSeries,
  spectrumBarAt,
} from './decayCharts';
import { MODE_LABELS, buildChain, elementName, formatHalfLife } from './nuclide';
import { useChartCanvas } from './useChartCanvas';
import { formatNumber } from './formatParams';

// Cards do decaimento radioativo (rdecay01) na seção "Resultados".

export function DecayChainCard({ results }) {
  const chain = useMemo(() => buildChain(results?.transitions, results?.primary, results?.full_chain !== false), [results]);
  const [hover, setHover] = useState(null);
  const draw = useCallback(
    (ctx, { width, height, colors }) =>
      drawNuclideChart(ctx, { width, height, chain, colors, hoverKey: hover?.key }),
    [chain, hover],
  );
  const { wrapRef, canvasRef } = useChartCanvas(draw);
  const byKey = useMemo(() => new Map(chain.nodes.map((node) => [node.key, node])), [chain]);
  // Altura acompanha o formato da cadeia (quadrados do mesmo tamanho na
  // largura e na altura); limites no CSS (.decay-chart__wrap).
  const aspectRatio = useMemo(() => {
    if (!chain.nodes.length) return undefined;
    const ns = chain.nodes.map((node) => node.N);
    const zs = chain.nodes.map((node) => node.Z);
    const cols = Math.max(...ns) - Math.min(...ns) + 3;
    const rows = Math.max(...zs) - Math.min(...zs) + 3;
    return `${cols + 2} / ${rows + 2}`;
  }, [chain]);

  function pick(event) {
    const rect = event.currentTarget.getBoundingClientRect();
    setHover(chainNodeAt(event.clientX - rect.left, event.clientY - rect.top, rect.width, rect.height, chain));
  }

  // Lista na ordem da cadeia: começa no núcleo inicial e segue o ramo mais comum
  const ordered = useMemo(() => {
    const out = [];
    const seen = new Set();
    const visit = (key) => {
      if (seen.has(key)) return;
      seen.add(key);
      const edges = chain.edges.filter((edge) => edge.from === key).sort((a, b) => b.count - a.count);
      for (const edge of edges) out.push(edge);
      for (const edge of edges) visit(edge.to);
    };
    if (chain.start) visit(chain.start);
    return out;
  }, [chain]);

  const readout = hover
    ? `${describeNode(hover)} — ${elementName(hover.symbol)}`
    : 'Passe o mouse (ou toque) num quadrado para ver o núcleo.';

  return (
    <div className="sim-results__chart-card">
      <div className="sim-results__chart-head">
        <h3 className="sim-results__chart-title">Cadeia de decaimento</h3>
      </div>
      <div className="sim-results__canvas-wrap decay-chart__wrap" ref={wrapRef} style={{ aspectRatio }}>
        <canvas
          ref={canvasRef}
          className="sim-results__canvas"
          role="img"
          aria-label={`Carta de nuclídeos com ${chain.nodes.length} núcleos e ${chain.edges.length} decaimentos`}
          onPointerMove={pick}
          onPointerDown={pick}
          onPointerLeave={(event) => {
            if (event.pointerType === 'mouse') setHover(null);
          }}
        />
      </div>
      <p className="sim-results__readout" aria-live="polite">
        {readout}
      </p>
      <ul className="sim-results__legend">
        <li>
          <span className="decay-legend decay-legend--solid" aria-hidden="true" />α (2 prótons e 2 nêutrons a menos)
        </li>
        <li>
          <span className="decay-legend decay-legend--dashed" aria-hidden="true" />β⁻ (um nêutron vira próton)
        </li>
        <li>
          <span className="decay-legend decay-legend--dotted" aria-hidden="true" />β⁺ / captura (um próton vira nêutron)
        </li>
        <li>
          <span className="decay-legend decay-legend--filled" aria-hidden="true" />estável (fim da cadeia)
        </li>
      </ul>

      <ol className="decay-steps">
        {ordered.map((edge) => {
          const from = byKey.get(edge.from);
          const to = byKey.get(edge.to);
          return (
            <li key={`${edge.from}-${edge.to}-${edge.mode}`}>
              <strong>{from.label}</strong>
              <span className="decay-steps__half"> ({formatHalfLife(from.halfLife)})</span>
              {' → '}
              <span className="decay-steps__mode">{MODE_LABELS[edge.mode] ?? edge.mode}</span>
              {' → '}
              <strong>{to.label}</strong>
              {to.halfLife == null && <span className="decay-steps__half"> (estável)</span>}
              {edge.fraction < 0.995 && (
                <span className="decay-steps__half">
                  {' '}
                  · {formatNumber(edge.fraction * 100, 1)}% das vezes
                </span>
              )}
            </li>
          );
        })}
      </ol>

      <p className="sim-results__note">
        Cada quadrado é um núcleo, na posição dada pelo número de nêutrons (N) e de prótons (Z). No
        decaimento alfa o núcleo perde 2 prótons e 2 nêutrons e desce na diagonal; no beta⁻ um
        nêutron vira próton e ele sobe uma casa para a esquerda. As meias-vidas vêm dos dados
        nucleares do próprio Geant4.
      </p>
    </div>
  );
}

function SpectrumPanel({ series, meta, logScale }) {
  const [hover, setHover] = useState(-1);
  const draw = useCallback(
    (ctx, { width, height, colors }) =>
      drawSpectrumPanel(ctx, { width, height, series, colors, logScale, highlight: hover }),
    [series, logScale, hover],
  );
  const { wrapRef, canvasRef } = useChartCanvas(draw);
  const from = hover >= 0 ? hover * series.binKeV : null;

  return (
    <figure className="pid-panel">
      <figcaption className="pid-panel__title">
        {meta.label}
        <span className="pid-panel__count">
          {from == null
            ? `${formatNumber(series.total, 0)} emitidos · ${meta.note}`
            : `${formatNumber(from, 0)}–${formatNumber(from + series.binKeV, 0)} keV: ${formatNumber(series.bars[hover], 0)}`}
        </span>
      </figcaption>
      <div className="pid-panel__canvas-wrap" ref={wrapRef}>
        <canvas
          ref={canvasRef}
          className="sim-results__canvas"
          role="img"
          aria-label={`Espectro de energia: ${meta.label}, ${series.total} partículas`}
          onPointerMove={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            setHover(spectrumBarAt(event.clientX - rect.left, rect.width, series));
          }}
          onPointerLeave={(event) => {
            if (event.pointerType === 'mouse') setHover(-1);
          }}
        />
      </div>
    </figure>
  );
}

export function DecaySpectraCard({ results }) {
  const [logScale, setLogScale] = useState(false);
  const panels = useMemo(
    () =>
      SPECTRUM_SERIES.map((meta) => ({ meta, series: prepareSeries(results?.spectra, meta.id) })).filter(
        (panel) => panel.series,
      ),
    [results],
  );

  return (
    <div className="sim-results__chart-card">
      <div className="sim-results__chart-head">
        <h3 className="sim-results__chart-title">Energia das partículas emitidas</h3>
        <div className="sim-results__scale" role="group" aria-label="Escala do eixo Y">
          <span className="sim-results__scale-label">Eixo Y</span>
          {[
            { id: false, label: 'Linear' },
            { id: true, label: 'Log' },
          ].map((option) => (
            <button
              key={option.label}
              type="button"
              aria-pressed={logScale === option.id}
              className={`sim-results__scale-option${logScale === option.id ? ' is-active' : ''}`}
              onClick={() => setLogScale(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      {panels.length === 0 ? (
        <p className="sim-results__note">Nenhuma partícula emitida nesta simulação.</p>
      ) : (
        <div className="pid-grid">
          {panels.map(({ meta, series }) => (
            <SpectrumPanel key={meta.id} meta={meta} series={series} logScale={logScale} />
          ))}
        </div>
      )}
      <p className="sim-results__note">
        Cada painel conta quantas partículas de um tipo saíram em cada faixa de energia, somando
        todos os decaimentos (cada painel tem a própria escala de energia). Repare na diferença: o
        alfa e o gama aparecem como picos estreitos, porque o núcleo passa de um estado para outro
        com energia definida; o elétron do beta sai com qualquer energia até um máximo, porque
        divide a energia com um antineutrino. Foi esse espectro contínuo que levou Wolfgang Pauli a
        propor o neutrino, em 1930.
      </p>
    </div>
  );
}
