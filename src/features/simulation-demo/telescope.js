// Telescópio de raios gama (exemplo gammaray_telescope do Geant4): contas
// feitas no navegador a partir de results.events (um item por partícula
// simulada, gravado pelo TelescopeRecorder do C++).

// Limiar do veto da anticoincidência, escolhido pelo site: uma partícula
// carregada atravessando 1 cm de plástico deixa ~2 MeV; metade disso separa
// "passou uma partícula carregada" de "não passou nada".
export const ACD_THRESHOLD_MEV = 1;

export const TELESCOPE_PARTICLES = [
  { id: 'gamma', label: 'Raios gama (γ)', short: 'γ' },
  { id: 'e-', label: 'Elétrons (e⁻)', short: 'e⁻' },
  { id: 'proton', label: 'Prótons (p)', short: 'p' },
];

export function particleShort(id) {
  return TELESCOPE_PARTICLES.find((particle) => particle.id === id)?.short ?? id;
}

/** Valor abaixo do qual fica a fração `q` dos valores (q = 0,68 → 68%). */
export function containment(values, q = 0.68) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(q * sorted.length) - 1));
  return sorted[index];
}

/**
 * Resumo da run, por partícula:
 *   { total, byParticle: { gamma: { count, reconstructed, psf68, vetoed, calFraction }, ... } }
 * calFraction = média de (energia no calorímetro / energia da partícula).
 */
export function summarizeTelescope(results) {
  if (results?.summary) return results.summary; // relatório salvo (compactResults)
  const events = Array.isArray(results?.events) ? results.events : [];
  const byParticle = {};
  for (const particle of TELESCOPE_PARTICLES) {
    const list = events.filter((event) => event.particle === particle.id);
    if (!list.length) continue;
    const errors = list
      .map((event) => event.angle_error_deg)
      .filter((value) => typeof value === 'number' && Number.isFinite(value));
    const fractions = list.map((event) => (event.energy_MeV ? event.cal_MeV / event.energy_MeV : 0));
    byParticle[particle.id] = {
      count: list.length,
      reconstructed: errors.length,
      psf68: containment(errors, 0.68),
      vetoed: list.filter((event) => event.acd_MeV > ACD_THRESHOLD_MEV).length,
      calFraction: fractions.reduce((sum, value) => sum + value, 0) / list.length,
    };
  }
  return { total: events.length, byParticle };
}
