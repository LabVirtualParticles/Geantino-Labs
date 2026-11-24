// Transforma os resultados numéricos que algumas simulações devolvem
// (`results` na resposta do backend — hoje só o B3a/PET, lido do
// resultados.json gravado pelo C++) em linhas para a tabela "Resumo":
//   [{ key, label, value }, ...]
// Chave desconhecida é ignorada (o JSON completo continua em "Exportar dados").

import { formatNumber } from './formatParams';
import { examEquivalence } from './petReference';

const DOSE_UNITS = [
  { factor: 1, unit: 'Gy' },
  { factor: 1e-3, unit: 'mGy' },
  { factor: 1e-6, unit: 'µGy' },
  { factor: 1e-9, unit: 'nGy' },
  { factor: 1e-12, unit: 'pGy' },
];

// Mesma ideia do G4BestUnit do Geant4: escolhe a unidade em que o número
// fica entre 1 e 1000.
export function formatDose(gray) {
  const value = Number(gray);
  if (!Number.isFinite(value)) return '—';
  if (value === 0) return '0 Gy';
  const best = DOSE_UNITS.find(({ factor }) => Math.abs(value) >= factor) ?? DOSE_UNITS.at(-1);
  return `${formatNumber(value / best.factor, 3)} ${best.unit}`;
}

const PARTICLE_SHORT = { 'e+': 'e⁺', 'mu+': 'μ⁺', 'pi+': 'π⁺', 'kaon+': 'K⁺', proton: 'p' };

// Espectrômetro (B5): resultados vêm evento a evento (results.events).
function formatSpectrometerResults(events) {
  const total = events.length;
  const counts = {};
  let reached = 0;
  for (const event of events) {
    counts[event.particle] = (counts[event.particle] ?? 0) + 1;
    if (typeof event.t2_ns === 'number') reached += 1;
  }
  const order = ['e+', 'mu+', 'pi+', 'kaon+', 'proton'];
  const list = order
    .filter((particle) => counts[particle])
    .map((particle) => `${formatNumber(counts[particle], 0)} ${PARTICLE_SHORT[particle]}`)
    .join(' · ');
  const percent = total ? (reached / total) * 100 : 0;
  return [
    { key: 'particles', label: 'Partículas simuladas', value: list || '—' },
    {
      key: 'reached',
      label: 'Chegaram ao 2º hodoscópio',
      value: `${formatNumber(reached, 0)} de ${formatNumber(total, 0)} (${formatNumber(percent, 0)}%)`,
    },
  ];
}

// `paramsUsed` (opcional) dá o isótopo, pra regra de 3 com o exame real.
export function formatResults(results, paramsUsed) {
  if (!results || typeof results !== 'object') return [];
  if (Array.isArray(results.events)) {
    const rows = formatSpectrometerResults(results.events);
    if (results.trajectories_truncated) {
      rows.push({
        key: 'trajectories_truncated',
        label: 'Trajetórias',
        value: 'Cortadas no limite de 300 mil pontos (a tabela conta todos os eventos)',
      });
    }
    return rows;
  }
  const rows = [];

  const equivalence = examEquivalence(results.n_events, paramsUsed?.isotope);
  if (equivalence) {
    rows.push({
      key: 'exam_equivalence',
      label: `${formatNumber(results.n_events, 0)} decaimentos equivalem a`,
      value: equivalence.text,
    });
  }

  if (results.good_events !== undefined) {
    const total = Number(results.n_events) || 0;
    const percent = total ? (Number(results.good_events) / total) * 100 : null;
    const threshold = results.energy_threshold_keV ?? 500;
    rows.push({
      key: 'good_events',
      label: `Coincidências (2 cristais > ${formatNumber(threshold, 0)} keV)`,
      value:
        percent === null
          ? formatNumber(results.good_events, 0)
          : `${formatNumber(results.good_events, 0)} (${formatNumber(percent, 1)}%)`,
    });
  }

  // Na página vem a lista inteira; no relatório do painel só a contagem
  // (ver compactResults em lib/reports.js).
  const lineCount = Array.isArray(results.lines_of_response)
    ? results.lines_of_response.length
    : results.lines_of_response_count;
  if (lineCount !== undefined) {
    rows.push({
      key: 'lines_of_response',
      label: 'Linhas de resposta desenhadas',
      value: formatNumber(lineCount, 0),
    });
  }

  if (results.dose_Gy !== undefined) {
    rows.push({ key: 'dose_Gy', label: 'Dose no paciente', value: formatDose(results.dose_Gy) });
  }

  if (results.trajectories_truncated) {
    rows.push({
      key: 'trajectories_truncated',
      label: 'Trajetórias',
      value: 'Cortadas no limite de 300 mil pontos (os números acima contam todos os eventos)',
    });
  }

  return rows;
}
