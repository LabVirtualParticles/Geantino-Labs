import { useCallback, useMemo, useState } from 'react';
import {
  PET_VIEWS,
  buildPetImage,
  drawPetImage,
  estimateSourcePosition,
  petImageCoordsAt,
} from './petImage';
import { drawSpectrum, prepareSpectrum, spectrumBinAtX } from './crystalSpectrum';
import { useChartCanvas } from './useChartCanvas';
import { formatNumber } from './formatParams';

// Gráficos do PET (B3a) na seção "Resultados": imagem reconstruída a
// partir das linhas de resposta e espectro de energia nos cristais.

function sourceFromParams(params) {
  const keys = ['pos_x_cm', 'pos_y_cm', 'pos_z_cm'];
  if (!params || keys.some((key) => typeof params[key] !== 'number')) return null;
  return keys.map((key) => params[key]);
}

function formatCm(value) {
  return formatNumber(value, 1).replace('-', '−');
}

function formatPoint(point) {
  return `(${point.map(formatCm).join(', ')}) cm`;
}

export function PetImageCard({ results, paramsUsed }) {
  const lines = useMemo(() => results?.lines_of_response ?? [], [results]);
  const [viewId, setViewId] = useState('xy');
  const [hover, setHover] = useState(null);

  const image = useMemo(() => buildPetImage(lines, viewId), [lines, viewId]);
  const estimate = useMemo(() => estimateSourcePosition(lines), [lines]);
  const source = useMemo(() => sourceFromParams(paramsUsed), [paramsUsed]);

  const draw = useCallback(
    (ctx, { width, height, colors }) =>
      drawPetImage(ctx, { width, height, image, colors, source, estimate, hover }),
    [image, source, estimate, hover],
  );
  const { wrapRef, canvasRef } = useChartCanvas(draw);

  function pick(event) {
    const rect = event.currentTarget.getBoundingClientRect();
    setHover(
      petImageCoordsAt(event.clientX - rect.left, event.clientY - rect.top, rect.width, rect.height, image),
    );
  }

  const [nameA, nameB] = image.view.names;
  let readout = 'Passe o mouse (ou toque) na imagem para ver a posição e quantas linhas passam ali.';
  if (hover) {
    readout =
      `${nameA} = ${formatCm(hover.u)} cm, ${nameB} = ${formatCm(hover.v)} cm: ` +
      `${formatNumber(hover.raw, 0)} ${hover.raw === 1 ? 'linha passa' : 'linhas passam'} por aqui`;
  }

  const distance =
    estimate && source ? Math.hypot(...estimate.map((value, index) => value - source[index])) : null;

  return (
    <div className="sim-results__chart-card">
      <div className="sim-results__chart-head">
        <h3 className="sim-results__chart-title">Imagem reconstruída</h3>
        <div className="sim-results__views" role="tablist" aria-label="Vista da imagem">
          {PET_VIEWS.map((option) => (
            <button
              key={option.id}
              type="button"
              role="tab"
              aria-selected={viewId === option.id}
              className={`sim-results__view${viewId === option.id ? ' is-active' : ''}`}
              onClick={() => setViewId(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {lines.length === 0 ? (
        <p className="sim-results__note">
          Nenhuma coincidência nesta simulação, então não há linhas de resposta para montar a
          imagem. Rode com mais decaimentos ou com a fonte dentro do paciente.
        </p>
      ) : (
        <>
          <div className="sim-results__canvas-wrap sim-results__canvas-wrap--square" ref={wrapRef}>
            <canvas
              ref={canvasRef}
              className="sim-results__canvas"
              role="img"
              aria-label={`Imagem reconstruída, ${image.view.label.toLowerCase()}, a partir de ${lines.length} linhas de resposta`}
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
              <span className="sim-results__legend-mark sim-results__legend-mark--cross" aria-hidden="true" />
              Fonte{source ? `: ${formatPoint(source)}` : ''}
            </li>
            <li>
              <span className="sim-results__legend-mark sim-results__legend-mark--circle" aria-hidden="true" />
              Ponto mais claro da imagem{estimate ? `: ${formatPoint(estimate)}` : ''}
              {distance != null ? ` — ${formatCm(distance)} cm da fonte` : ''}
            </li>
            <li>
              <span className="sim-results__legend-mark sim-results__legend-mark--dashed" aria-hidden="true" />
              Contorno do paciente
            </li>
          </ul>
        </>
      )}

      <p className="sim-results__note">
        Cada uma das {formatNumber(lines.length, 0)} linhas de resposta é somada por onde passa;
        quanto mais clara a região, mais linhas se cruzam ali. Essa é a ideia por trás da imagem de
        um PET, numa versão simples, sem os filtros de um tomógrafo real: por isso cada linha deixa
        um rastro (o “efeito estrela”). Com mais decaimentos o ponto claro fica mais nítido.
      </p>
    </div>
  );
}

export function SpectrumCard({ results }) {
  const spectrum = useMemo(() => prepareSpectrum(results?.crystal_spectrum), [results]);
  const [hoverBin, setHoverBin] = useState(-1);
  const [logScale, setLogScale] = useState(true);

  const draw = useCallback(
    (ctx, { width, height, colors }) => {
      if (spectrum) {
        drawSpectrum(ctx, { width, height, spectrum, colors, highlightBin: hoverBin, logScale });
      }
    },
    [spectrum, hoverBin, logScale],
  );
  const { wrapRef, canvasRef } = useChartCanvas(draw);

  if (!spectrum) {
    return (
      <div className="sim-results__chart-card">
        <h3 className="sim-results__chart-title">Espectro de energia nos cristais</h3>
        <p className="sim-results__note">
          O backend não mandou o espectro. Recompile o B3a-geantino (a versão com o espectro) e
          rode de novo.
        </p>
      </div>
    );
  }

  let readout = 'Passe o mouse (ou toque) no gráfico para ver cada faixa.';
  if (hoverBin >= 0) {
    const from = hoverBin * spectrum.binKeV;
    const count = spectrum.counts[hoverBin];
    readout = `${from}–${from + spectrum.binKeV} keV: ${formatNumber(count, 0)} ${count === 1 ? 'cristal' : 'cristais'}`;
  }

  return (
    <div className="sim-results__chart-card">
      <div className="sim-results__chart-head">
        <h3 className="sim-results__chart-title">Espectro de energia nos cristais</h3>
        <div className="sim-results__scale" role="group" aria-label="Escala do eixo Y">
          <span className="sim-results__scale-label">Eixo Y</span>
          {[
            { id: true, label: 'Log' },
            { id: false, label: 'Linear' },
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
      <div className="sim-results__canvas-wrap" ref={wrapRef}>
        <canvas
          ref={canvasRef}
          className="sim-results__canvas"
          role="img"
          aria-label={`Espectro de energia nos cristais: ${formatNumber(spectrum.total, 0)} cristais atingidos, ${formatNumber(spectrum.above, 0)} acima de ${spectrum.threshold} keV`}
          onPointerMove={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            setHoverBin(spectrumBinAtX(event.clientX - rect.left, rect.width, spectrum));
          }}
          onPointerDown={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            setHoverBin(spectrumBinAtX(event.clientX - rect.left, rect.width, spectrum));
          }}
          onPointerLeave={(event) => {
            if (event.pointerType === 'mouse') setHoverBin(-1);
          }}
        />
      </div>
      <p className="sim-results__readout" aria-live="polite">
        {readout}
      </p>
      <ul className="sim-results__legend">
        <li>
          <span className="sim-results__legend-mark sim-results__legend-mark--bar" aria-hidden="true" />
          Acima do limite (conta na coincidência): {formatNumber(spectrum.above, 0)} de{' '}
          {formatNumber(spectrum.total, 0)} cristais
        </li>
        <li>
          <span className="sim-results__legend-mark sim-results__legend-mark--bar-muted" aria-hidden="true" />
          Abaixo do limite (descartado)
        </li>
      </ul>
      <p className="sim-results__note">
        Cada barra conta quantos cristais receberam aquela faixa de energia, somando todos os
        decaimentos. O pico em 511 keV são fótons absorvidos inteiros no cristal. A faixa larga
        abaixo vem de fótons que só se espalharam (efeito Compton) e saíram levando parte da
        energia — um fóton de 511 keV deixa no máximo uns 341 keV num único espalhamento (a borda
        Compton). O limite de 500 keV do exemplo existe para aceitar só o pico e descartar esses
        fótons, que dariam linhas de resposta erradas.
        {spectrum.hidden > 0 &&
          ` ${formatNumber(spectrum.hidden, 0)} ${spectrum.hidden === 1 ? 'cristal recebeu' : 'cristais receberam'} mais de 700 keV (caso raro, como os dois fótons no mesmo cristal) e não aparece${spectrum.hidden === 1 ? '' : 'm'} no gráfico.`}
      </p>
    </div>
  );
}
