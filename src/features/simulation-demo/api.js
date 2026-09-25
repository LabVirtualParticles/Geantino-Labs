// Ponte com o backend real (FastAPI + Geant4 batch). Traduz os nomes de
// campo do formulário (ver data/parameters.example.json) para os nomes
// esperados por app.py, e mapeia o `simulationId` do schema (usado no
// front) para o id do catálogo no backend (`GET /simulations`).

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';

// simulationId (schema do front) -> id no catálogo do backend (app.py: SIMULATIONS)
const BACKEND_SIMULATION_ID = {
  'rutherford-scattering': 'rutherford',
};

// campo do formulário -> campo esperado por RunSimulationRequest (app.py)
const FIELD_MAP = {
  particleType: 'particle',
  energy: 'energy_MeV',
  beamCount: 'n_events',
  // targetMaterial / targetThickness: sem efeito no backend por ora
  // (Detector.cpp tem material/espessura fixos em C++) — não traduzidos
  // de propósito. Ver nota em parameters.example.json.
};

// valor do <select> particleType (front) -> nome de partícula do Geant4 (backend)
const PARTICLE_MAP = {
  alpha: 'alpha',
  proton: 'proton',
  electron: 'e-',
};

function translateParams(values) {
  const payload = {};
  for (const [frontKey, backendKey] of Object.entries(FIELD_MAP)) {
    const value = values[frontKey];
    if (value === undefined || value === null || value === '') continue;
    payload[backendKey] = frontKey === 'particleType' ? (PARTICLE_MAP[value] ?? value) : value;
  }
  return payload;
}

/**
 * Roda uma simulação no backend real.
 * @param {string} simulationId - schema.simulationId (ex.: "rutherford-scattering")
 * @param {object} values - valores atuais do formulário (ids do front)
 * @returns {Promise<{geometry: object, trajectories: object[]}>} resposta crua do backend
 */
export async function runSimulation(simulationId, values) {
  const backendId = BACKEND_SIMULATION_ID[simulationId] ?? simulationId;
  const body = translateParams(values);

  let response;
  try {
    response = await fetch(`${API_BASE_URL}/simulations/${backendId}/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (networkError) {
    throw new Error(
      `Não foi possível contatar o backend em ${API_BASE_URL}. Ele está rodando? (${networkError.message})`
    );
  }

  if (!response.ok) {
    let detail = null;
    try {
      detail = await response.json();
    } catch {
      // resposta sem corpo JSON — ignora
    }
    const message =
      (typeof detail?.detail === 'string' && detail.detail) ||
      detail?.detail?.message ||
      `Falha ao rodar a simulação (HTTP ${response.status})`;
    throw new Error(message);
  }

  return response.json();
}
