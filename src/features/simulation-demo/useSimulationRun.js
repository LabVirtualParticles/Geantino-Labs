import { useCallback, useState } from 'react';
import resultShape from './data/result.example.json';
import { runSimulation } from './api';
import { adaptSimulationResult } from './adapter';

// Duração da última simulação (segundos de relógio, contando rede +
// Geant4 + conversão) e quantas partículas ela tinha — usado só pra
// ESTIMAR a duração da próxima no indicador de progresso
// (RunProgress.jsx). Fica no localStorage deste navegador; se não der pra
// ler/gravar, só não tem estimativa.
const LAST_RUN_STORAGE_KEY = 'geantino:lastRunTiming';

function readLastRun() {
  try {
    const value = JSON.parse(window.localStorage.getItem(LAST_RUN_STORAGE_KEY));
    return value?.seconds > 0 && value?.events > 0 ? value : null;
  } catch {
    return null;
  }
}

function writeLastRun(seconds, events) {
  try {
    window.localStorage.setItem(LAST_RUN_STORAGE_KEY, JSON.stringify({ seconds, events }));
  } catch {
    // sem armazenamento — tudo bem
  }
}

// Metade do tempo tratada como custo fixo (subir o Geant4, gravar e
// converter arquivos, rede) e metade proporcional ao número de partículas.
// Medido no Rutherford: 500 partículas ≈ 0,9 s e 1000 ≈ 1,4 s no backend —
// nem fixo nem proporcional puro.
function estimateSeconds(lastRun, events) {
  if (!lastRun || !events) return null;
  return lastRun.seconds * (0.5 + 0.5 * (events / lastRun.events));
}

function defaultsFromSchema(schema) {
  return schema.fields.reduce((acc, field) => {
    acc[field.id] = field.default;
    return acc;
  }, {});
}

export function useSimulationRun(schema) {
  const [values, setValues] = useState(() => defaultsFromSchema(schema));
  const [status, setStatus] = useState('idle'); // idle | running | done | error
  const [data, setData] = useState(resultShape);
  // Metadados crus da última resposta do backend — não usados pra desenhar
  // a cena (isso é `data`, via adaptSimulationResult), mas necessários pro
  // relatório do painel: a seed de fato usada pelo Geant4, os parâmetros
  // validados (podem diferir do que o usuário digitou, ex. defaults) e a
  // duração real da simulação.
  const [meta, setMeta] = useState(null);
  const [error, setError] = useState(null);
  // Info do indicador de progresso enquanto `status === 'running'`.
  const [runProgress, setRunProgress] = useState(null);

  const setField = useCallback((id, value) => {
    setValues((prev) => ({ ...prev, [id]: value }));
  }, []);

  const run = useCallback(async () => {
    const events = Number(values.beamCount) || null;
    const startedAt = performance.now();
    setRunProgress({
      startedAt,
      events,
      estimatedSeconds: estimateSeconds(readLastRun(), events),
    });
    setStatus('running');
    setError(null);
    try {
      const raw = await runSimulation(schema.simulationId, values);
      const wallSeconds = (performance.now() - startedAt) / 1000;
      const ranEvents = Number(raw?.params_used?.n_events) || events;
      if (ranEvents) writeLastRun(wallSeconds, ranEvents);
      setData(adaptSimulationResult(raw));
      setMeta({
        runId: raw?.run_id ?? null,
        seed: raw?.seed_used ?? null,
        paramsUsed: raw?.params_used ?? values,
        durationSeconds: raw?.duration_seconds ?? null,
      });
      setStatus('done');
    } catch (err) {
      setError(err.message ?? String(err));
      setStatus('error');
    }
  }, [schema.simulationId, values]);

  const exportData = useCallback(() => {
    const payload = { simulationId: schema.simulationId, parameters: values, result: data };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${schema.simulationId ?? 'simulacao'}-resultado.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, [schema.simulationId, values, data]);

  return { values, setField, status, data, meta, error, run, exportData, runProgress };
}
