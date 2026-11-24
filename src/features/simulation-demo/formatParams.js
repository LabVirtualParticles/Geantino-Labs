// Transforma os parâmetros crus da simulação (params_used do backend,
// ex. { particle: 'alpha', energy_MeV: 5, dir_x: -1, ... }) numa lista
// legível pra tabela da página da simulação e pro relatório do painel:
//   [{ key, label, value }, ...]  ex. { label: 'Energia', value: '5 MeV' }
//
// A seed NÃO entra aqui (seed1/seed2) — ela tem a própria linha/seção.
// Chave desconhecida aparece com o nome cru, pra nunca sumir informação.

const PARTICLE_NAMES = {
  alpha: 'Alfa (α)',
  proton: 'Próton',
  'e-': 'Elétron',
  electron: 'Elétron',
  'e+': 'Pósitron',
  gamma: 'Gama (γ)',
  neutron: 'Nêutron',
  'mu-': 'Múon',
  'mu+': 'Múon (μ⁺)',
  'pi+': 'Píon (π⁺)',
  'kaon+': 'Káon (K⁺)',
  random: 'Sorteada (e⁺, μ⁺, π⁺, K⁺ ou p)',
  mix: 'Sorteada (γ, e⁻ ou p)',
};

const ISOTOPE_NAMES = {
  F18: 'Flúor-18 (¹⁸F)',
  C11: 'Carbono-11 (¹¹C)',
  N13: 'Nitrogênio-13 (¹³N)',
  O15: 'Oxigênio-15 (¹⁵O)',
};

const NUCLIDE_NAMES = {
  U238: 'Urânio-238',
  Th232: 'Tório-232',
  Ra226: 'Rádio-226',
  Rn222: 'Radônio-222',
  Am241: 'Amerício-241',
  Co60: 'Cobalto-60',
  Cs137: 'Césio-137',
  K40: 'Potássio-40',
  Na22: 'Sódio-22',
  C14: 'Carbono-14',
  Ne24: 'Neônio-24',
};

const DECAY_MODE_NAMES = {
  chain: 'Cadeia inteira (até um núcleo estável)',
  single: 'Só o primeiro decaimento',
};

const HIDDEN_KEYS = new Set(['seed1', 'seed2', 'showNucleus']);

export function formatNumber(value, maxDecimals = 2) {
  const number = Number(value);
  if (!Number.isFinite(number)) return String(value);
  return number.toLocaleString('pt-BR', { maximumFractionDigits: maxDecimals });
}

// Sinal de menos tipográfico (−) em vez do hífen, pra vetores ficarem
// legíveis: (−1, 0, 0).
function formatSigned(value) {
  return formatNumber(value).replace('-', '−');
}

function formatVector(params, keys) {
  return `(${keys.map((key) => formatSigned(params[key])).join(', ')})`;
}

function hasAll(params, keys) {
  return keys.every((key) => params[key] !== undefined && params[key] !== null);
}

// Rótulos próprios de cada simulação (pelo simulationId do schema), usados
// tanto na página da simulação quanto no relatório do painel.
export const PARAM_LABELS_BY_SIMULATION = {
  'pet-b3a': { n_events: 'Decaimentos simulados' },
  'decaimento-rdecay01': { n_events: 'Núcleos simulados', beamCount: 'Núcleos simulados' },
  'telescopio-gammaraytel': { energy_GeV: 'Energia da partícula' },
};

// `labels` (opcional) troca o rótulo de uma linha pela chave — normalmente
// PARAM_LABELS_BY_SIMULATION[simulationId].
export function formatParams(params, labels = {}) {
  if (!params || typeof params !== 'object') return [];
  const rows = [];
  const used = new Set(HIDDEN_KEYS);

  const take = (key, label, format) => {
    if (params[key] === undefined || params[key] === null || used.has(key)) return;
    rows.push({ key, label: labels[key] ?? label, value: format(params[key]) });
    used.add(key);
  };

  // Backend (params_used) e, como reserva, os nomes do formulário do
  // front (parameters.example.json) quando a resposta não trouxe params.
  take('particle', 'Partícula', (value) => PARTICLE_NAMES[value] ?? String(value));
  take('particleType', 'Partícula', (value) => PARTICLE_NAMES[value] ?? String(value));
  take('energy_MeV', 'Energia', (value) => `${formatNumber(value)} MeV`);
  take('energy', 'Energia', (value) => `${formatNumber(value)} MeV`);
  take('n_events', 'Partículas simuladas', (value) => formatNumber(value, 0));
  take('beamCount', 'Partículas simuladas', (value) => formatNumber(value, 0));
  take('isotope', 'Isótopo da fonte', (value) => ISOTOPE_NAMES[value] ?? String(value));
  take('momentum_GeV', 'Momento', (value) => `${formatNumber(value, 3)} GeV/c`);
  take('field_T', 'Campo magnético', (value) => `${formatSigned(value)} T`);
  take('arm_angle_deg', 'Ângulo do 2º braço', (value) => `${formatNumber(value, 1)}°`);
  take('nuclide', 'Núcleo inicial', (value) => NUCLIDE_NAMES[value] ?? String(value));
  take('decay_mode', 'Decaimentos', (value) => DECAY_MODE_NAMES[value] ?? String(value));
  take('decayMode', 'Decaimentos', (value) => DECAY_MODE_NAMES[value] ?? String(value));
  take('energy_GeV', 'Energia', (value) => `${formatNumber(value, 3)} GeV`);
  take('theta_deg', 'Ângulo de chegada (do eixo)', (value) => `${formatNumber(value, 1)}°`);

  const posKeys = ['pos_x_cm', 'pos_y_cm', 'pos_z_cm'];
  if (hasAll(params, posKeys)) {
    rows.push({
      key: 'pos',
      label: labels.pos ?? 'Posição da fonte',
      value: `${formatVector(params, posKeys)} cm`,
    });
    posKeys.forEach((key) => used.add(key));
  }
  take('source_size_cm', 'Tamanho da fonte (aresta)', (value) => `${formatNumber(value)} cm`);

  const dirKeys = ['dir_x', 'dir_y', 'dir_z'];
  if (hasAll(params, dirKeys)) {
    rows.push({ key: 'dir', label: 'Direção do feixe', value: formatVector(params, dirKeys) });
    dirKeys.forEach((key) => used.add(key));
  }

  for (const [key, value] of Object.entries(params)) {
    if (used.has(key) || value === undefined || value === null) continue;
    rows.push({ key, label: key, value: typeof value === 'number' ? formatNumber(value) : String(value) });
  }

  // Duas fontes pra mesma linha (ex. particle e particleType) — fica só a
  // primeira.
  const seen = new Set();
  return rows.filter((row) => {
    if (seen.has(row.label)) return false;
    seen.add(row.label);
    return true;
  });
}

export function formatSeed(seed) {
  if (!seed || typeof seed !== 'object') return null;
  const parts = [seed.seed1, seed.seed2].filter((value) => value !== undefined && value !== null);
  return parts.length ? parts.join(' · ') : null;
}
