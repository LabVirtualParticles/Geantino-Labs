import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import ParametersPanel from '../features/simulation-demo/ParametersPanel';
import SimulationViewer from '../features/simulation-demo/SimulationViewer';
import ExplanationPanel from '../features/simulation-demo/ExplanationPanel';
import { useSimulationRun } from '../features/simulation-demo/useSimulationRun';
import SimulationResults from '../features/simulation-demo/SimulationResults';
import PlaybackControls from '../features/simulation-demo/PlaybackControls';
import { groupByEvent, useEventPlayback } from '../features/simulation-demo/eventPlayback';
import {
  beamDirectionFromParams,
  computeScatteringAngles,
} from '../features/simulation-demo/angularHistogram';
import {
  buildRutherfordTheory,
  buildScatteringHistogram,
  renderScatteringChartToDataURL,
} from '../features/simulation-demo/scatteringChart';
import { useAuth } from '../context/AuthContext';
import { saveReport } from '../lib/reports';
import schema from '../features/simulation-demo/data/parameters.example.json';
import explanationSchema from '../features/simulation-demo/data/explanations.example.json';
import '../features/simulation-demo/simulation-demo.css';

// Reference page for running a simulation end to end: parameter fields
// on the left, 3D viewer + actions on the right. useSimulationRun já usa
// o backend real (api.js -> POST /simulations/{id}/run + adapter.js) —
// configure a URL em frontend/.env (VITE_API_BASE_URL). O botão de
// "Contexto e fundamentos" abre o ExplanationPanel, com o conteúdo
// pedagógico definido em data/explanations.example.json.
export default function SimulationExample() {
  const { values, setField, status, data, meta, error, run, exportData, runProgress } =
    useSimulationRun(schema);

  // Playback evento a evento: as trajetórias vão aparecendo em ordem de
  // evento quando a simulação termina (ver eventPlayback.js). Antes da
  // primeira simulação (dados de exemplo) mostra tudo, sem controles.
  const grouped = useMemo(() => groupByEvent(data.trajectories ?? []), [data]);
  const playback = useEventPlayback(grouped.eventCount, {
    resetKey: data,
    enabled: status === 'done',
  });
  const showPlayback = status === 'done' && grouped.eventCount > 1;
  const viewerData = useMemo(() => ({ ...data, trajectories: grouped.trajectories }), [data, grouped]);
  const visibleCount = showPlayback ? (grouped.endIndex[playback.revealedEvents] ?? 0) : undefined;
  const recentFrom = showPlayback ? (grouped.endIndex[playback.recentFromEvent] ?? 0) : 0;
  const [isExplanationOpen, setExplanationOpen] = useState(false);
  const { user } = useAuth();
  const viewerRef = useRef(null);
  // idle | saving | done | error — feedback do botão "Gerar relatório",
  // separado do `status` da simulação em si.
  const [reportState, setReportState] = useState('idle');
  const [reportError, setReportError] = useState('');

  // "print do detector no momento em que for acionado o botão gerar
  // relatório" (pedido do Lorenzo) — por isso a captura de tela e o
  // histograma são calculados AQUI, no clique, e não quando a simulação
  // termina: o usuário pode girar a câmera (OrbitControls) antes de gerar
  // o relatório, e o print reflete o enquadramento escolhido por ele.
  async function handleGenerateReport() {
    if (status !== 'done' || !user) return;
    setReportState('saving');
    setReportError('');
    try {
      const screenshotDataUrl = viewerRef.current?.captureScreenshot() ?? null;

      // Direção do feixe = a que o backend de fato usou (params_used:
      // dir_x/dir_y/dir_z). Se não vier, cai no padrão do Rutherford (-x).
      // computeScatteringAngles já conta só as partículas primárias.
      // O PNG do relatório usa o mesmo desenho do gráfico da seção
      // "Resultados" (scatteringChart.js), em paleta escura fixa e já com
      // a curva de Rutherford quando há partículas suficientes acima de 10°.
      let chartDataUrl = null;
      if ((schema.charts ?? []).includes('scattering')) {
        const beamDir = beamDirectionFromParams(meta?.paramsUsed);
        const angles = computeScatteringAngles(data.trajectories, beamDir);
        const histogram = buildScatteringHistogram(angles);
        chartDataUrl = renderScatteringChartToDataURL(histogram, buildRutherfordTheory(histogram));
      }

      await saveReport({
        userId: user.id,
        simulationId: schema.simulationId,
        label: schema.title,
        params: meta?.paramsUsed ?? values,
        seed: meta?.seed ?? null,
        durationSeconds: meta?.durationSeconds ?? null,
        trajectoryCount: data.trajectories.length,
        screenshotDataUrl,
        chartDataUrl,
      });

      setReportState('done');
    } catch (err) {
      setReportError(err.message ?? String(err));
      setReportState('error');
    }
  }

  return (
    <>
      <Navbar />
      <main className="sim-page">
        <header className="sim-page__header">
          <h1>{schema.title}</h1>
          <p>
            Em 1909, Geiger e Marsden dispararam partículas alfa contra uma folha de ouro
            finíssima e viram algumas voltarem — o resultado que levou Rutherford a descobrir o
            núcleo atômico. Aqui o mesmo experimento roda de verdade no Geant4: escolha a
            partícula, a energia e quantas partículas disparar, clique em Simular e veja as
            trajetórias em 3D e, logo abaixo, a distribuição dos ângulos de desvio comparada com a
            previsão de Rutherford.
          </p>
          <button
            type="button"
            className="sim-page__button sim-page__explanation-trigger"
            onClick={() => setExplanationOpen(true)}
          >
            {explanationSchema.buttonLabel}
          </button>
        </header>

        <div className="sim-page__grid">
          <ParametersPanel schema={schema} values={values} onChange={setField} />

          <div className="sim-page__stage">
            <SimulationViewer
              ref={viewerRef}
              data={viewerData}
              status={status}
              visibleCount={visibleCount}
              recentFrom={recentFrom}
              runProgress={runProgress}
            />
            {showPlayback && <PlaybackControls playback={playback} />}
            <div className="sim-page__actions">
              <button
                type="button"
                className="sim-page__button sim-page__button--primary"
                onClick={run}
                disabled={status === 'running'}
              >
                {status === 'running' ? 'Simulando…' : 'Simular'}
              </button>
              <button
                type="button"
                className="sim-page__button"
                onClick={exportData}
                disabled={status !== 'done'}
              >
                Exportar dados
              </button>
              <button
                type="button"
                className="sim-page__button"
                onClick={handleGenerateReport}
                disabled={status !== 'done' || reportState === 'saving'}
                title="Salva seed, parâmetros, um print do detector (no enquadramento atual) e o gráfico de distribuição angular no seu painel"
              >
                {reportState === 'saving' ? 'Gerando relatório…' : 'Gerar relatório'}
              </button>
            </div>
            {status === 'error' && error && (
              <p className="sim-page__error" role="alert">
                {error}
              </p>
            )}
            {reportState === 'done' && (
              <p className="sim-page__info" role="status">
                Relatório salvo! Veja em <Link to="/painel">Painel → Relatórios</Link>.
              </p>
            )}
            {reportState === 'error' && reportError && (
              <p className="sim-page__error" role="alert">
                Não foi possível salvar o relatório: {reportError}
              </p>
            )}
          </div>
        </div>

        {/* Resultados (gráfico + resumo + parâmetros) logo depois de
            simular. Some enquanto uma nova simulação está rodando. */}
        {status === 'done' && meta && <SimulationResults schema={schema} data={data} meta={meta} />}

        <ExplanationPanel
          schema={explanationSchema}
          isOpen={isExplanationOpen}
          onClose={() => setExplanationOpen(false)}
        />
      </main>
    </>
  );
}
