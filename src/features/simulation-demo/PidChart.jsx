import { useCallback, useMemo, useState } from 'react';
import { PID_PARTICLES, PID_Y_OPTIONS, drawPidPanel, pidPointAt, preparePid } from './pidChart';
import { useChartCanvas } from './useChartCanvas';
import { formatNumber } from './formatParams';

// Card "Identificação de partículas" do espectrômetro (B5): cinco painéis
// (um por partícula), mesmos eixos, escolha do calorímetro no eixo Y.

function PidPanel({ pid, yKey, particle, onHover }) {
  const [hover, setHover] = useState(null);
  const draw = useCallback(
    (ctx, { width, height, colors }) =>
      drawPidPanel(ctx, { width, height, pid, yKey, particle: particle.id, colors, hover }),
    [pid, yKey, particle, hover],
  );
  const { wrapRef, canvasRef } = useChartCanvas(draw);

  const count = pid.totals[particle.id] ?? 0;
  const missing = pid.missing[particle.id] ?? 0;

  function pick(event) {
    const rect = event.currentTarget.getBoundingClientRect();
    const point = pidPointAt(
      event.clientX - rect.left,
      event.clientY - rect.top,
      rect.width,
      rect.height,
      pid,
      yKey,
      particle.id,
    );
    setHover(point);
    onHover(point ? { point, particle } : null);
  }

  return (
    <figure className="pid-panel">
      <figcaption className="pid-panel__title">
        {particle.label}
        <span className="pid-panel__count">
          {count === 0
            ? 'nenhuma nesta simulação'
            : `${formatNumber(count, 0)} ${count === 1 ? 'evento' : 'eventos'}` +
              (missing ? ` · ${formatNumber(missing, 0)} sem tempo de voo` : '')}
        </span>
      </figcaption>
      <div className="pid-panel__canvas-wrap" ref={wrapRef}>
        <canvas
          ref={canvasRef}
          className="sim-results__canvas"
          role="img"
          aria-label={`${particle.label}: tempo de voo por energia depositada, ${count} eventos`}
          onPointerMove={pick}
          onPointerDown={pick}
          onPointerLeave={(event) => {
            if (event.pointerType === 'mouse') {
              setHover(null);
              onHover(null);
            }
          }}
        />
      </div>
    </figure>
  );
}

export function PidCard({ results }) {
  const pid = useMemo(() => preparePid(results?.events ?? []), [results]);
  const [yKey, setYKey] = useState('em_edep_MeV');
  const [hover, setHover] = useState(null);

  let readout = 'Passe o mouse (ou toque) num ponto para ver o evento.';
  if (hover) {
    const { point, particle } = hover;
    readout =
      `${particle.label}, evento ${point.event}: tempo de voo ${formatNumber(point.tof, 2)} ns · ` +
      `cal. EM ${formatNumber(point.em_edep_MeV, 0)} MeV · cal. hadrônico ${formatNumber(point.had_edep_MeV, 1)} MeV · ` +
      `momento ${formatNumber(point.momentum_MeV / 1000, 3)} GeV/c`;
  }

  const plotted = pid.points.length;
  const total = results?.events?.length ?? 0;

  return (
    <div className="sim-results__chart-card">
      <div className="sim-results__chart-head">
        <h3 className="sim-results__chart-title">Identificação de partículas</h3>
        <div className="sim-results__views" role="tablist" aria-label="Calorímetro no eixo Y">
          {PID_Y_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              role="tab"
              aria-selected={yKey === option.id}
              className={`sim-results__view${yKey === option.id ? ' is-active' : ''}`}
              onClick={() => setYKey(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <p className="sim-results__note">
        Eixo Y: {PID_Y_OPTIONS.find((option) => option.id === yKey).short}. Em cada painel, os
        pontos cheios são a partícula do título; os cinzas são as outras, para comparar.
      </p>

      <div className="pid-grid">
        {PID_PARTICLES.map((particle) => (
          <PidPanel key={particle.id} pid={pid} yKey={yKey} particle={particle} onHover={setHover} />
        ))}
      </div>

      <p className="sim-results__readout" aria-live="polite">
        {readout}
      </p>

      <p className="sim-results__note">
        {formatNumber(plotted, 0)} de {formatNumber(total, 0)} partículas passaram pelos dois
        hodoscópios e entram no gráfico. Com o mesmo momento, partícula mais pesada é mais lenta e
        demora mais entre os hodoscópios: o próton fica bem à direita. No calorímetro
        eletromagnético o pósitron forma um chuveiro e deixa quase toda a energia; múons e píons em
        geral só atravessam ionizando o cristal; o próton, mais lento, ioniza mais e costuma parar
        ali. Káons muitas vezes decaem no caminho e não chegam ao segundo hodoscópio. No calorímetro
        hadrônico o múon, que atravessa tudo, deixa sempre um valor parecido; os píons variam
        conforme começaram ou não um chuveiro; e quase nenhum próton chega (ali só a parte que cai
        no cintilador é medida, por isso os valores são menores).
      </p>
    </div>
  );
}
