// Ângulo de espalhamento de cada partícula — base dos gráficos da seção
// "Resultados" (SimulationResults.jsx) e do PNG do relatório do painel.
// O histograma, a curva de Rutherford e o desenho ficam em
// scatteringChart.js.

// Ângulo (graus, 0-180) entre a direção de SAÍDA de cada trajetória e a
// direção de incidência do feixe.
// `trajectories` é o formato já adaptado pro viewer: [{ id, points: [[x,y,z], ...] }]
//
// Direção de saída = último trecho reto da trajetória, não "ponto inicial
// -> ponto final". O trajeto real do Rutherford é
//   fonte (x=10) -> face de entrada da folha -> face de saída -> borda do mundo
// e o desvio acontece todo dentro da folha. Medir do ponto inicial ao
// final mistura o trecho de chegada (antes da folha) e dá mais ou menos
// metade do ângulo verdadeiro. Por isso a gente volta a partir do último
// ponto até achar um ponto "longe o bastante" (OUTGOING_MIN_FRACTION do
// comprimento total), pulando pontos repetidos/colados no fim — o
// TrajectoryRecorder costuma gravar 2-3 pontos quase iguais na borda do
// mundo, e um trecho minúsculo desses daria uma direção com muito ruído.
const OUTGOING_MIN_FRACTION = 0.1;

export function outgoingDirection(points) {
  if (!points || points.length < 2) return null;
  const end = points[points.length - 1];
  const total = distance(points[0], end);
  const minLength = total * OUTGOING_MIN_FRACTION;

  for (let i = points.length - 2; i >= 0; i -= 1) {
    if (distance(points[i], end) >= minLength && distance(points[i], end) > 0) {
      const p = points[i];
      return normalize([end[0] - p[0], end[1] - p[1], end[2] - p[2]]);
    }
  }
  return null;
}

// Direção do feixe a partir dos parâmetros que o backend devolve em
// `params_used` (dir_x, dir_y, dir_z — ver default_params em app.py).
// Se faltar algum campo ou vier tudo zero, usa `fallback`.
export function beamDirectionFromParams(params, fallback = [-1, 0, 0]) {
  const raw = [params?.dir_x, params?.dir_y, params?.dir_z];
  if (raw.some((value) => value === undefined || value === null || value === '')) return fallback;
  const dir = raw.map(Number);
  if (dir.some((value) => !Number.isFinite(value))) return fallback;
  return normalize(dir) ?? fallback;
}

// Partícula primária = a que o canhão disparou. No Geant4 ela é sempre a
// track 1 de cada evento; secundárias (elétrons arrancados, gamas...) têm
// track > 1 e não entram no histograma — o "ângulo de espalhamento" delas
// em relação ao feixe não tem o mesmo significado. Trajetória sem o campo
// `track` (ex.: dados de exemplo antigos) é tratada como primária.
function isPrimary(trajectory) {
  return trajectory.track === undefined || trajectory.track === null || trajectory.track === 1;
}

export function computeScatteringAngles(
  trajectories,
  incidentDir = [-1, 0, 0],
  { primariesOnly = true } = {},
) {
  const [ix, iy, iz] = normalize(incidentDir) ?? [-1, 0, 0];

  return trajectories
    .filter((trajectory) => !primariesOnly || isPrimary(trajectory))
    .map((trajectory) => {
      const dir = outgoingDirection(trajectory.points);
      if (!dir) return null;
      const dot = dir[0] * ix + dir[1] * iy + dir[2] * iz;
      const clamped = Math.min(1, Math.max(-1, dot));
      return (Math.acos(clamped) * 180) / Math.PI;
    })
    .filter((angle) => angle !== null && Number.isFinite(angle));
}

function distance(a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const dz = b[2] - a[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function normalize([x, y, z]) {
  const length = Math.sqrt(x * x + y * y + z * z);
  if (!length) return null;
  return [x / length, y / length, z / length];
}
