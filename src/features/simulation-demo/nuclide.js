// Utilitários de núcleos para o decaimento radioativo (rdecay01): nomes do
// Geant4 → nome legível, meia-vida em unidade humana, e a cadeia agrupada
// por nuclídeo (juntando estados excitados) a partir de results.transitions.

// Nome em português dos elementos que aparecem nas cadeias oferecidas no site.
const ELEMENT_NAMES = {
  H: 'hidrogênio', He: 'hélio', C: 'carbono', N: 'nitrogênio', O: 'oxigênio', Ne: 'neônio',
  Na: 'sódio', Mg: 'magnésio', Ar: 'argônio', K: 'potássio', Ca: 'cálcio', Fe: 'ferro',
  Mn: 'manganês', Co: 'cobalto', Ni: 'níquel', Cs: 'césio', Ba: 'bário', Tl: 'tálio',
  Pb: 'chumbo', Bi: 'bismuto', Po: 'polônio', At: 'astato', Rn: 'radônio', Fr: 'frâncio',
  Ra: 'rádio', Ac: 'actínio', Th: 'tório', Pa: 'protactínio', U: 'urânio', Np: 'netúnio',
  Pu: 'plutônio', Am: 'amerício', Hg: 'mercúrio', Au: 'ouro',
};

/** "Pa234[73.92000X]" → { symbol: 'Pa', A: 234, excited: true, excitation_keV: 73.92 } */
export function parseIonName(name = '') {
  const match = String(name).match(/^([A-Z][a-z]?)(\d+)(?:\[([\d.]+)[A-Z]?\])?$/);
  if (!match) return { symbol: name, A: null, excited: false, excitation_keV: 0 };
  const excitation = match[3] ? Number.parseFloat(match[3]) : 0;
  return { symbol: match[1], A: Number(match[2]), excited: excitation > 0, excitation_keV: excitation };
}

export function elementName(symbol) {
  return ELEMENT_NAMES[symbol] ?? symbol;
}

/** "U-238" (ou "Pa-234m" quando `metastable`) */
export function nuclideLabel(symbol, A, metastable = false) {
  return `${symbol}-${A}${metastable ? 'm' : ''}`;
}

const SECONDS_PER_YEAR = 365.25 * 24 * 3600;

/** Intervalo de tempo em unidade legível: "4,47 bilhões de anos", "24,1 dias", "164 µs". */
export function formatDuration(seconds) {
  if (seconds == null || !Number.isFinite(seconds)) return '—';
  if (seconds <= 0) return 'no mesmo instante';
  const fmt = (value, digits = 3) =>
    value.toLocaleString('pt-BR', { maximumSignificantDigits: digits });
  const years = seconds / SECONDS_PER_YEAR;
  if (years >= 1e12) {
    // ex.: bismuto-209, ~2 × 10¹⁹ anos
    const exponent = Math.floor(Math.log10(years));
    const superscript = String(exponent).replace(/\d/g, (d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d]);
    return `${fmt(years / 10 ** exponent)} × 10${superscript} anos`;
  }
  if (years >= 1e9) return `${fmt(years / 1e9)} bilhões de anos`;
  if (years >= 1e6) return `${fmt(years / 1e6)} milhões de anos`;
  if (years >= 1e3) return `${fmt(years / 1e3)} mil anos`;
  if (years >= 1) return `${fmt(years)} ${years < 2 ? 'ano' : 'anos'}`;
  if (seconds >= 86400) return `${fmt(seconds / 86400)} dias`;
  if (seconds >= 3600) return `${fmt(seconds / 3600)} h`;
  if (seconds >= 60) return `${fmt(seconds / 60)} min`;
  if (seconds >= 1) return `${fmt(seconds)} s`;
  if (seconds >= 1e-3) return `${fmt(seconds * 1e3)} ms`;
  if (seconds >= 1e-6) return `${fmt(seconds * 1e6)} µs`;
  if (seconds >= 1e-9) return `${fmt(seconds * 1e9)} ns`;
  return 'em menos de um nanossegundo';
}

/** Meia-vida legível; sem meia-vida (null/0) = "estável". */
export function formatHalfLife(seconds) {
  if (seconds == null || !Number.isFinite(seconds) || seconds <= 0) return 'estável';
  return formatDuration(seconds);
}

/** Energia em keV → "52 keV" ou "4,2 MeV". */
export function formatEnergy(keV) {
  const value = Number(keV);
  if (!Number.isFinite(value)) return '—';
  if (value >= 1000) return `${(value / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} MeV`;
  return `${value.toLocaleString('pt-BR', { maximumFractionDigits: value < 10 ? 1 : 0 })} keV`;
}

// Núcleos oferecidos no site (mesma lista de RDECAY_NUCLIDES no backend).
// halfLife (s) só para mostrar antes da primeira simulação — depois vale a
// do Geant4, que vem nos resultados.
const Y = 365.25 * 24 * 3600;
export const NUCLIDES = {
  U238: { Z: 92, A: 238, name: 'Urânio-238', halfLife: 4.468e9 * Y },
  Th232: { Z: 90, A: 232, name: 'Tório-232', halfLife: 1.40e10 * Y },
  Ra226: { Z: 88, A: 226, name: 'Rádio-226', halfLife: 1600 * Y },
  Rn222: { Z: 86, A: 222, name: 'Radônio-222', halfLife: 3.8235 * 86400 },
  Am241: { Z: 95, A: 241, name: 'Amerício-241', halfLife: 432.6 * Y },
  Co60: { Z: 27, A: 60, name: 'Cobalto-60', halfLife: 5.2714 * Y },
  Cs137: { Z: 55, A: 137, name: 'Césio-137', halfLife: 30.08 * Y },
  K40: { Z: 19, A: 40, name: 'Potássio-40', halfLife: 1.248e9 * Y },
  Na22: { Z: 11, A: 22, name: 'Sódio-22', halfLife: 2.6018 * Y },
  C14: { Z: 6, A: 14, name: 'Carbono-14', halfLife: 5700 * Y },
  Ne24: { Z: 10, A: 24, name: 'Neônio-24', halfLife: 3.38 * 60 },
};

/** "Urânio-238" a partir do símbolo e A ("U", 238). */
export function fullNuclideName(symbol, A, metastable = false) {
  const element = elementName(symbol);
  return `${element.charAt(0).toUpperCase()}${element.slice(1)}-${A}${metastable ? 'm' : ''}`;
}

/** Meia-vida de cada estado (nome do Geant4) que aparece como pai nas transições. */
export function halfLifeByName(transitions) {
  const map = new Map();
  for (const t of transitions ?? []) {
    if (t.parent && !map.has(t.parent)) map.set(t.parent, t.parent_half_life_s ?? null);
    if (t.daughter && !map.has(t.daughter) && t.daughter_half_life_s) map.set(t.daughter, t.daughter_half_life_s);
  }
  return map;
}

export const MODE_LABELS = {
  alpha: 'α',
  'beta-': 'β⁻',
  'beta+': 'β⁺',
  EC: 'captura eletrônica',
  IT: 'transição isomérica (γ)',
  n: 'emissão de nêutron',
  p: 'emissão de próton',
  other: 'outro',
};

export const MODE_SHORT = { alpha: 'α', 'beta-': 'β⁻', 'beta+': 'β⁺', EC: 'CE', IT: 'γ', n: 'n', p: 'p', other: '?' };

/**
 * Agrupa results.transitions por nuclídeo (Z, A), juntando estados
 * excitados e ignorando as desexcitações gama (IT dentro do mesmo núcleo).
 * @returns {{ nodes: object[], edges: object[], start: string|null, ends: string[] }}
 *   node: { key, Z, A, N, symbol, label, halfLife, metastable, decays }
 *   edge: { from, to, mode, count, fraction }  (fraction = do total que saiu do pai)
 */
export function buildChain(transitions, primary, fullChain = true) {
  const nodes = new Map();
  const edgeMap = new Map();
  // meia-vida de cada nó = a do estado que mais decaiu (ex.: o Pa-234m)
  const halfLifeVotes = new Map();

  const ensure = (Z, A, name) => {
    const key = `${Z}-${A}`;
    if (!nodes.has(key)) {
      const { symbol } = parseIonName(name);
      nodes.set(key, { key, Z, A, N: A - Z, symbol, label: nuclideLabel(symbol, A), halfLife: null, metastable: false, decays: 0 });
    }
    return nodes.get(key);
  };

  if (primary) ensure(primary.Z, primary.A, primary.name);

  for (const t of transitions ?? []) {
    const parent = ensure(t.parent_Z, t.parent_A, t.parent);
    if (!t.daughter) continue;
    const child = ensure(t.daughter_Z, t.daughter_A, t.daughter);
    if (parent.key === child.key) continue; // desexcitação dentro do mesmo núcleo
    parent.decays += t.count;
    const edgeKey = `${parent.key}>${child.key}>${t.mode}`;
    const edge = edgeMap.get(edgeKey) ?? { from: parent.key, to: child.key, mode: t.mode, count: 0 };
    edge.count += t.count;
    edgeMap.set(edgeKey, edge);
    if (t.parent_half_life_s) {
      const votes = halfLifeVotes.get(parent.key) ?? new Map();
      const state = `${t.parent_half_life_s}|${parseIonName(t.parent).excited}`;
      votes.set(state, (votes.get(state) ?? 0) + t.count);
      halfLifeVotes.set(parent.key, votes);
    }
  }

  for (const [key, votes] of halfLifeVotes) {
    const [best] = [...votes.entries()].sort((a, b) => b[1] - a[1]);
    const [halfLife, excited] = best[0].split('|');
    const node = nodes.get(key);
    node.halfLife = Number(halfLife);
    node.metastable = excited === 'true';
    node.label = nuclideLabel(node.symbol, node.A, node.metastable);
  }
  if (primary) {
    const node = nodes.get(`${primary.Z}-${primary.A}`);
    if (node && node.halfLife == null && primary.half_life_s) node.halfLife = primary.half_life_s;
  }

  // Só no modo "um decaimento": onde a simulação parou, o núcleo pode não
  // ser estável — a meia-vida vem do lado "filho" das transições (ex.:
  // Ba-137m). Na cadeia inteira, o fim é sempre estável.
  for (const t of fullChain ? [] : (transitions ?? [])) {
    if (!t.daughter) continue;
    const node = nodes.get(`${t.daughter_Z}-${t.daughter_A}`);
    if (!node || halfLifeVotes.has(node.key) || node.halfLife != null) continue;
    if (t.daughter_half_life_s >= 1e-6) {
      node.halfLife = t.daughter_half_life_s;
      node.metastable = parseIonName(t.daughter).excited;
      node.label = nuclideLabel(node.symbol, node.A, node.metastable);
    }
  }

  const edges = [...edgeMap.values()].map((edge) => ({
    ...edge,
    fraction: nodes.get(edge.from).decays ? edge.count / nodes.get(edge.from).decays : 0,
  }));
  const hasOutgoing = new Set(edges.map((edge) => edge.from));
  const ends = [...nodes.keys()].filter((key) => !hasOutgoing.has(key) && edges.some((e) => e.to === key));

  // Ordem "de cima pra baixo": A decrescente, depois Z decrescente
  const ordered = [...nodes.values()].sort((a, b) => b.A - a.A || b.Z - a.Z);
  return {
    nodes: ordered,
    edges,
    start: primary ? `${primary.Z}-${primary.A}` : ordered[0]?.key ?? null,
    ends,
  };
}

/**
 * Decaimentos de um evento, em ordem. As desexcitações gama instantâneas
 * dentro do mesmo núcleo entram como "partículas emitidas" no passo
 * anterior; as de estados metaestáveis viram um passo "IT". Usado pela
 * ilustração do núcleo.
 */
export function eventSteps(decays, eventId) {
  const list = (decays ?? []).filter((d) => d.event === eventId).sort((a, b) => a.t_s - b.t_s);
  const steps = [];
  for (const decay of list) {
    const sameNucleus = decay.parent_Z === decay.daughter_Z && decay.parent_A === decay.daughter_A;
    // life_s = quanto tempo esse estado viveu (o C++ grava o tempo local da
    // trilha do íon); sem ele, a diferença de tempos globais.
    const life = decay.life_s ?? (steps.length ? decay.t_s - steps[steps.length - 1].t_s : 0);
    const prompt = steps.length > 0 && life < 1e-6;
    // Desexcitação de um estado metaestável (ex.: Ba-137m, 2,55 min) vira
    // um passo próprio; as instantâneas entram no passo anterior.
    if (sameNucleus && steps.length && !prompt) {
      steps.push({ ...decay, mode: 'IT', emitted: [...decay.emitted] });
      continue;
    }
    if (sameNucleus && steps.length) {
      steps[steps.length - 1].emitted.push(...decay.emitted);
      continue;
    }
    if (sameNucleus) continue;
    steps.push({ ...decay, emitted: [...decay.emitted] });
  }
  return steps;
}

/** Eventos que têm decaimentos detalhados (o C++ guarda os 100 primeiros). */
export function detailedEventIds(decays) {
  return [...new Set((decays ?? []).map((d) => d.event))].sort((a, b) => a - b);
}
