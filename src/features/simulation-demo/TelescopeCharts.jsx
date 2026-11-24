import { useCallback, useMemo, useState } from 'react';
import { barIndexAt, angleRange, drawHistogramPanel, histogram } from './telescopeCharts';
import { ACD_THRESHOLD_MEV, TELESCOPE_PARTICLES, containment } from './telescope';
import { useChartCanvas } from './useChartCanvas';
import { formatNumber } from './formatParams';

// Cards do telescópio de raios gama (gammaray_telescope) na seção
// "Resultados": direção reconstruída, anticoincidência e calorímetro.

function HistogramCanvas({ hist, xLabel, format, markers, describe, ariaLabel, className = 'pid-panel__canvas-wrap' }) {
  const [hover, setHover] = useState(-1);
  const draw = useCallback(
    (ctx, { width, height, colors }) =>
      drawHistogramPanel(ctx, { width, height, hist, colors, xLabel, format, markers, highlight: hover }),
    [hist, xLabel, format, markers, hover],
  );
  const { wrapRef, canvasRef } = useChartCanvas(draw);
  return (
    <>
      <div className={className} ref={wrapRef}>
        <canvas
          ref={canvasRef}
          className="sim-results__canvas"
          role="img"
          aria-label={ariaLabel}
          onPointerMove={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            setHover(barIndexAt(event.clientX - rect.left, rect.width, hist));
          }}
          onPointerLeave={(event) => {
            if (event.pointerType === 'mouse') setHover(-1);
          }}
        />
      </div>
      {describe && (
        <p className="sim-results__readout" aria-live="polite">
          {describe(hover)}
        </p>
      )}
    </>
  );
}

const formatDeg = (value) => `${formatNumber(value, 1)}°`;
const formatMeV = (value) => formatNumber(value, 1);
const formatPercent = (value) => `${formatNumber(value * 100, 0)}%`;

export function TelescopePsfCard({ results }) {
  const errors = useMemo(
    () =>
      (results?.events ?? [])
        .filter((event) => event.particle === 'gamma' && typeof event.angle_error_deg === 'number')
        .map((event) => event.angle_error_deg),
    [results],
  );
  const gammas = (results?.events ?? []).filter((event) => event.particle === 'gamma').length;
  const psf68 = containment(errors, 0.68);
  const hist = useMemo(() => histogram(errors, 0, angleRange(errors), 40), [errors]);
  const markers = useMemo(() => (psf68 == null ? [] : [{ x: psf68, label: `68%: ${formatDeg(psf68)}` }]), [psf68]);

  return (
    <div className="sim-results__chart-card">
      <div className="sim-results__chart-head">
        <h3 className="sim-results__chart-title">De onde veio o raio gama?</h3>
      </div>
      {errors.length === 0 ? (
        <p className="sim-results__note">
          {gammas
            ? 'Nenhum raio gama teve a direção reconstruída (o tracker precisa de pelo menos 3 camadas com sinal em cada vista). Tente mais partículas ou uma energia maior.'
            : 'Esta simulação não tem raios gama — escolha “Raio gama” ou “Sorteada” para ver a direção reconstruída.'}
        </p>
      ) : (
        <>
          <HistogramCanvas
            className="sim-results__canvas-wrap"
            hist={hist}
            xLabel="Erro na direção reconstruída (graus)"
            format={(value) => formatNumber(value, 1)}
            markers={markers}
            ariaLabel={`Histograma do erro angular de ${errors.length} raios gama; 68% abaixo de ${formatDeg(psf68)}`}
            describe={(index) =>
              index < 0
                ? `${formatNumber(errors.length, 0)} de ${formatNumber(gammas, 0)} raios gama com direção reconstruída · 68% deles erraram menos de ${formatDeg(psf68)}.`
                : `${formatDeg(hist.min + index * hist.width)} a ${formatDeg(hist.min + (index + 1) * hist.width)}: ${formatNumber(hist.counts[index], 0)} raios gama`
            }
          />
          <p className="sim-results__note">
            O raio gama não deixa rastro: ele só aparece quando se converte num par elétron–pósitron
            numa folha de tungstênio. O tracker segue o par pelas camadas de silício seguintes e uma
            reta por esses pontos dá a direção de chegada. O gráfico mostra quanto essa direção errou
            em relação à verdadeira; o ângulo que contém 68% dos raios gama é a resolução angular do
            telescópio. Em energias baixas o par sofre mais espalhamento nas folhas e o erro cresce —
            compare 0,1 GeV com 1 GeV.
          </p>
        </>
      )}
    </div>
  );
}

function VetoPanel({ particle, events }) {
  const values = useMemo(() => events.map((event) => event.acd_MeV), [events]);
  const hist = useMemo(() => histogram(values, 0, 15, 30), [values]);
  const fired = values.filter((value) => value > ACD_THRESHOLD_MEV).length;
  const markers = useMemo(() => [{ x: ACD_THRESHOLD_MEV, label: 'limiar' }], []);
  return (
    <figure className="pid-panel">
      <figcaption className="pid-panel__title">
        {particle.label}
        <span className="pid-panel__count">
          Veto em {formatNumber(fired, 0)} de {formatNumber(events.length, 0)} ({formatPercent(fired / events.length)})
          {hist.overflow ? ` · ${hist.overflow} acima de 15 MeV` : ''}
        </span>
      </figcaption>
      <HistogramCanvas
        hist={hist}
        xLabel="Energia na anticoincidência (MeV)"
        format={formatMeV}
        markers={markers}
        ariaLabel={`${particle.label}: ${fired} de ${events.length} acenderam a anticoincidência`}
      />
    </figure>
  );
}

export function TelescopeVetoCard({ results }) {
  const groups = useMemo(
    () =>
      TELESCOPE_PARTICLES.map((particle) => ({
        particle,
        events: (results?.events ?? []).filter((event) => event.particle === particle.id),
      })).filter((group) => group.events.length),
    [results],
  );
  return (
    <div className="sim-results__chart-card">
      <div className="sim-results__chart-head">
        <h3 className="sim-results__chart-title">Raio gama ou raio cósmico?</h3>
      </div>
      <div className="pid-grid">
        {groups.map(({ particle, events }) => (
          <VetoPanel key={particle.id} particle={particle} events={events} />
        ))}
      </div>
      <p className="sim-results__note">
        No espaço, os raios cósmicos (prótons e elétrons) chegam ao telescópio de mil a cem mil
        vezes mais que os raios gama. A anticoincidência — placas de plástico cintilador em volta
        do tracker — acende quando passa uma partícula com carga, que deixa uns 2 MeV em 1 cm de
        plástico; aí o evento é descartado (veto). Neste site o veto vale acima de{' '}
        {formatNumber(ACD_THRESHOLD_MEV, 0)} MeV (linha tracejada). O raio gama, sem carga, passa
        apagado — a não ser quando o chuveiro que ele cria no calorímetro espirra partículas de volta
        (“backsplash”) e a anticoincidência acende sozinha. Escolha “Sorteada” para comparar os três
        no mesmo gráfico.
      </p>
    </div>
  );
}

function CalPanel({ particle, events }) {
  const values = useMemo(
    () => events.map((event) => (event.energy_MeV ? event.cal_MeV / event.energy_MeV : 0)),
    [events],
  );
  const hist = useMemo(() => histogram(values, 0, 1.1, 22), [values]);
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const markers = useMemo(() => [{ x: mean, label: `média ${formatPercent(mean)}` }], [mean]);
  return (
    <figure className="pid-panel">
      <figcaption className="pid-panel__title">
        {particle.label}
        <span className="pid-panel__count">{formatNumber(events.length, 0)} partículas</span>
      </figcaption>
      <HistogramCanvas
        hist={hist}
        xLabel="Energia no calorímetro ÷ energia da partícula"
        format={formatPercent}
        markers={markers}
        ariaLabel={`${particle.label}: em média ${formatPercent(mean)} da energia no calorímetro`}
      />
    </figure>
  );
}

export function TelescopeCalCard({ results }) {
  const groups = useMemo(
    () =>
      TELESCOPE_PARTICLES.map((particle) => ({
        particle,
        events: (results?.events ?? []).filter((event) => event.particle === particle.id),
      })).filter((group) => group.events.length),
    [results],
  );
  return (
    <div className="sim-results__chart-card">
      <div className="sim-results__chart-head">
        <h3 className="sim-results__chart-title">Energia medida no calorímetro</h3>
      </div>
      <div className="pid-grid">
        {groups.map(({ particle, events }) => (
          <CalPanel key={particle.id} particle={particle} events={events} />
        ))}
      </div>
      <p className="sim-results__note">
        O calorímetro de iodeto de césio (CsI) mede a energia: o par elétron–pósitron vira um
        chuveiro de fótons e elétrons que deposita ali a maior parte da energia. A fração fica
        abaixo de 100%: em energias baixas uma parte maior fica no tracker, e em energias altas o
        chuveiro fica mais comprido e escapa mais pelo fundo e pelos lados. O próton quase sempre só atravessa o cristal ionizando e deixa uma
        fração pequena — mais um jeito de separá-lo de um raio gama.
      </p>
    </div>
  );
}
