import { useCallback, useState } from 'react';
import resultShape from './data/result.example.json';
import { runSimulation } from './api';
import { adaptSimulationResult } from './adapter';

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

  const setField = useCallback((id, value) => {
    setValues((prev) => ({ ...prev, [id]: value }));
  }, []);

  const run = useCallback(async () => {
    setStatus('running');
    setError(null);
    try {
      const raw = await runSimulation(schema.simulationId, values);
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

  return { values, setField, status, data, meta, error, run, exportData };
}
