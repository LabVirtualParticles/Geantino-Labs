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

  return { values, setField, status, data, error, run, exportData };
}
