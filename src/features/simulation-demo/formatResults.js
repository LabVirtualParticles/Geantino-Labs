// Transforma os resultados numéricos que algumas simulações devolvem
// (`results` na resposta do backend — hoje só o B3a/PET, lido do
// resultados.json gravado pelo C++) em linhas para a tabela "Resumo":
//   [{ key, label, value }, ...]
// Chave desconhecida é ignorada (o JSON completo continua em "Exportar dados").

import { formatNumber } from './formatParams';
import { examEquivalence } from './petReference';
import { ACD_THRESHOLD_MEV, TELESCOPE_PARTICLES, summarizeTelescope } from './telescope';
import { MODE_SHORT, buildChain, fullNuclideName, formatHalfLife, parseIonName } from './nuclide';

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

const EMITTED_LABELS = {
  alpha: 'α',
  'e-': 'e⁻',
  'e+': 'e⁺',
  gamma: 'γ',
  anti_nu_e: 'antineutrinos',
  nu_e: 'neutrinos',
  neutron: 'n',
  proton: 'p',
};

// Decaimento radioativo (rdecay01): cadeia, fim da cadeia, quantos
// decaimentos de cada tipo e partículas emitidas.
function formatDecayResults(results) {
  const rows = [];
  const n = Number(results.n_events) || 0;
  const chain = buildChain(results.transitions, results.primary, results.full_chain !== false);
  const byKey = new Map(chain.nodes.map((node) => [node.key, node]));
  const start = byKey.get(chain.start);
  if (start) {
    rows.push({
      key: 'primary',
      label: 'Núcleo inicial',
      value: `${fullNuclideName(start.symbol, start.A)} · meia-vida ${formatHalfLife(start.halfLife)}`,
    });
  }

  // Onde os núcleos pararam. Na cadeia: o núcleo estável final. Num
  // decaimento só: cada estado do filho separado (ex.: Cs-137 vai ~95% para
  // o Ba-137m, metaestável, e ~5% direto para o Ba-137 estável).
  const arrivals = new Map(); // nome legível -> { count, halfLife }
  if (results.full_chain === false) {
    for (const t of results.transitions) {
      if (!t.daughter) continue;
      const { symbol, A, excited } = parseIonName(t.daughter);
      const metastable = excited && Boolean(t.daughter_half_life_s);
      const name = fullNuclideName(symbol, A, metastable);
      const entry = arrivals.get(name) ?? { count: 0, halfLife: metastable ? t.daughter_half_life_s : t.daughter_half_life_s ?? null };
      entry.count += t.count;
      arrivals.set(name, entry);
    }
  } else {
    for (const edge of chain.edges) {
      if (!chain.ends.includes(edge.to)) continue;
      const node = byKey.get(edge.to);
      const name = fullNuclideName(node.symbol, node.A, node.metastable);
      const entry = arrivals.get(name) ?? { count: 0, halfLife: node.halfLife };
      entry.count += edge.count;
      arrivals.set(name, entry);
    }
  }
  if (arrivals.size) {
    const ends = [...arrivals.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .map(([name, { count, halfLife }]) => {
        const status = halfLife == null ? 'estável' : `meia-vida ${formatHalfLife(halfLife)}`;
        const share = arrivals.size > 1 && n ? ` — ${formatNumber((count / n) * 100, 1)}%` : '';
        return `${name} (${status})${share}`;
      })
      .join(' · ');
    rows.push({
      key: 'end',
      label: results.full_chain === false ? 'Depois de um decaimento' : 'Fim da cadeia',
      value: ends,
    });
  }

  // Decaimentos por núcleo, por tipo (ex.: U-238 → 8 α e 6 β⁻)
  const perMode = {};
  for (const edge of chain.edges) perMode[edge.mode] = (perMode[edge.mode] ?? 0) + edge.count;
  const modeText = Object.entries(perMode)
    .sort((a, b) => b[1] - a[1])
    .map(([mode, count]) => `${formatNumber(n ? count / n : count, 2)} ${mode === 'EC' ? 'captura eletrônica' : (MODE_SHORT[mode] ?? mode)}`)
    .join(' + ');
  if (modeText) {
    rows.push({ key: 'per_nucleus', label: 'Decaimentos por núcleo (média)', value: modeText });
  }

  const counts = results.particle_counts ?? {};
  const emitted = Object.entries(counts)
    .filter(([name]) => !/\d/.test(name))
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => `${formatNumber(count, 0)} ${EMITTED_LABELS[name] ?? name}`)
    .join(' · ');
  if (emitted) rows.push({ key: 'emitted', label: 'Partículas emitidas', value: emitted });

  if (results.trajectories_truncated) {
    rows.push({
      key: 'trajectories_truncated',
      label: 'Trajetórias',
      value: 'Cortadas no limite de 300 mil pontos (os números acima contam todos os núcleos)',
    });
  }
  return rows;
}

// Telescópio de raios gama (gammaray_telescope): por partícula.
function formatTelescopeResults(results) {
  const summary = summarizeTelescope(results);
  const present = TELESCOPE_PARTICLES.filter((particle) => summary.byParticle[particle.id]);
  const rows = [];
  rows.push({
    key: 'particles',
    label: 'Partículas simuladas',
    value:
      present
        .map((particle) => `${formatNumber(summary.byParticle[particle.id].count, 0)} ${particle.short}`)
        .join(' · ') || '—',
  });
  const gamma = summary.byParticle.gamma;
  if (gamma) {
    rows.push({
      key: 'reconstructed',
      label: 'Raios gama com direção reconstruída',
      value: `${formatNumber(gamma.reconstructed, 0)} de ${formatNumber(gamma.count, 0)} (${formatNumber((gamma.reconstructed / gamma.count) * 100, 0)}%)`,
    });
    if (gamma.psf68 != null) {
      rows.push({
        key: 'psf68',
        label: 'Resolução angular (68% dos raios gama)',
        value: `${formatNumber(gamma.psf68, 2)}°`,
      });
    }
  }
  rows.push({
    key: 'veto',
    label: `Anticoincidência acesa (> ${formatNumber(ACD_THRESHOLD_MEV, 0)} MeV)`,
    value: present
      .map((particle) => {
        const item = summary.byParticle[particle.id];
        return `${particle.short} ${formatNumber((item.vetoed / item.count) * 100, 0)}%`;
      })
      .join(' · '),
  });
  rows.push({
    key: 'cal',
    label: 'Energia no calorímetro (média)',
    value: present
      .map((particle) => `${particle.short} ${formatNumber(summary.byParticle[particle.id].calFraction * 100, 0)}%`)
      .join(' · '),
  });
  if (results.trajectories_truncated) {
    rows.push({
      key: 'trajectories_truncated',
      label: 'Trajetórias',
      value: 'Cortadas no limite de 300 mil pontos (os números acima contam todas as partículas)',
    });
  }
  return rows;
}

// `paramsUsed` (opcional) dá o isótopo, pra regra de 3 com o exame real.
export function formatResults(results, paramsUsed) {
  if (!results || typeof results !== 'object') return [];
  if (Array.isArray(results.transitions)) return formatDecayResults(results);
  if (results.tkr_layers !== undefined) return formatTelescopeResults(results);
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
