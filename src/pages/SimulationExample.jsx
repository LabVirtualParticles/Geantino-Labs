import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import ParametersPanel from '../features/simulation-demo/ParametersPanel';
import SimulationViewer from '../features/simulation-demo/SimulationViewer';
import ExplanationPanel from '../features/simulation-demo/ExplanationPanel';
import { useSimulationRun } from '../features/simulation-demo/useSimulationRun';
import {
  computeScatteringAngles,
  buildHistogram,
  renderHistogramToDataURL,
} from '../features/simulation-demo/angularHistogram';
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
  const { values, setField, status, data, meta, error, run, exportData } = useSimulationRun(schema);
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

      // Direção de incidência padrão do Rutherford (ver default_params em
      // app.py: dir_x=-1, dir_y=0, dir_z=0) — fixo por ora porque é a
      // única simulação cadastrada; se o catálogo crescer, isso passa a
      // vir de `meta.paramsUsed`.
      const angles = computeScatteringAngles(data.trajectories, [-1, 0, 0]);
      const histogram = buildHistogram(angles);
      const chartDataUrl = renderHistogramToDataURL(histogram);

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
            Página de referência para executar uma simulação: os campos de parâmetros e a
            renderização já estão prontos, falta apenas ligar <code>useSimulationRun</code> ao
            backend real do Geant4.
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
            <SimulationViewer ref={viewerRef} data={data} status={status} />
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

        <ExplanationPanel
          schema={explanationSchema}
          isOpen={isExplanationOpen}
          onClose={() => setExplanationOpen(false)}
        />
      </main>
    </>
  );
}
