import { useState } from 'react';
import Navbar from '../components/layout/Navbar';
import ParametersPanel from '../features/simulation-demo/ParametersPanel';
import SimulationViewer from '../features/simulation-demo/SimulationViewer';
import ExplanationPanel from '../features/simulation-demo/ExplanationPanel';
import { useSimulationRun } from '../features/simulation-demo/useSimulationRun';
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
  const { values, setField, status, data, error, run, exportData } = useSimulationRun(schema);
  const [isExplanationOpen, setExplanationOpen] = useState(false);

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
            <SimulationViewer data={data} status={status} />
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
            </div>
            {status === 'error' && error && (
              <p className="sim-page__error" role="alert">
                {error}
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
