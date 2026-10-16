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
};

const HIDDEN_KEYS = new Set(['seed1', 'seed2']);

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

export function formatParams(params) {
  if (!params || typeof params !== 'object') return [];
  const rows = [];
  const used = new Set(HIDDEN_KEYS);

  const take = (key, label, format) => {
    if (params[key] === undefined || params[key] === null || used.has(key)) return;
    rows.push({ key, label, value: format(params[key]) });
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

  const posKeys = ['pos_x_cm', 'pos_y_cm', 'pos_z_cm'];
  if (hasAll(params, posKeys)) {
    rows.push({ key: 'pos', label: 'Posição da fonte', value: `${formatVector(params, posKeys)} cm` });
    posKeys.forEach((key) => used.add(key));
  }

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
