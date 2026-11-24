// Converte a resposta real do backend ({geometry, trajectories}, em
// centímetros, formato geometry_converter.py) para o formato que
// SimulationViewer.jsx espera ({world, volumes, trajectories}, em
// "unidades de cena").
//
// Fator de escala: a cena (câmera, distâncias do OrbitControls etc.) foi
// calibrada para um mundo de 400 unidades no maior lado. O fator sai do
// tamanho do volume-mundo de cada simulação: no Rutherford o mundo é um
// cubo de 20 cm (×20, o valor fixo de antes); no B3a (PET) tem ~81 cm
// (×~5). Sem volume-mundo na resposta, cai no ×20 de antes.
// `viewer.sceneSize` troca os 400 quando o conteúdo enche o mundo (no PET
// o tomógrafo ocupa quase todo o volume-mundo e ficaria colado na câmera).
export const SCENE_SIZE = 400;
const FALLBACK_SCALE = 20;

// Nome lógico do volume, sem o endereço que o G4GDMLParser acrescenta
// (ex. "CrystalLV0x55d1c0a8" -> "CrystalLV").
export function logicalName(name = '') {
  return name.replace(/0x[0-9a-fA-F]+$/, '');
}

// O geometry_converter.py percorre a árvore a partir do mundo, então ele
// é sempre o primeiro volume. O teste por nome fica como reserva.
function findWorldVolume(volumes) {
  return (
    volumes.find((volume) => /world/i.test(logicalName(volume.name))) ?? volumes[0] ?? null
  );
}

// Bounding box (min/max) dos vértices de um volume — usado só para o
// volume-mundo, que o viewer desenha como caixa de aresta (WireframeBox).
function boundingBoxSize(vertices) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < vertices.length; i += 3) {
    for (let axis = 0; axis < 3; axis += 1) {
      const value = vertices[i + axis];
      if (value < min[axis]) min[axis] = value;
      if (value > max[axis]) max[axis] = value;
    }
  }
  return [max[0] - min[0], max[1] - min[1], max[2] - min[2]];
}

// Cor da trajetória a partir da carga da partícula (trajetorias.json,
// campo "charge", escrito pelo TrajectoryRecorder em C++) — não pela
// espécie de partícula, para funcionar igual para qualquer partícula
// permitida (allowed_particles em app.py).
//
// Mesmo padrão do visualizador do próprio Geant4 (G4TrajectoryDrawByCharge,
// o modelo padrão do /vis/scene/add/trajectories): positiva = azul,
// negativa = vermelho, neutra = verde, com as cores puras do G4Colour.
export const CHARGE_COLORS = {
  positive: '#0000FF', // G4Colour::Blue()  — ex.: alfa, próton
  negative: '#FF0000', // G4Colour::Red()   — ex.: elétron
  neutral: '#00FF00', // G4Colour::Green() — ex.: gama, nêutron
};

function colorForCharge(charge) {
  if (charge > 0) return CHARGE_COLORS.positive;
  if (charge < 0) return CHARGE_COLORS.negative;
  return CHARGE_COLORS.neutral;
}

// Cor padrão das linhas de resposta (LOR) do PET: amarelo, para não
// confundir com as cores por carga das trajetórias.
export const LOR_COLOR = '#FFD400';

/**
 * @param {{geometry: {volumes: object[]}, trajectories: object[], results?: object}} raw - resposta de POST /simulations/{id}/run
 * @param {{volumeColors?: Object<string,string>, lorColor?: string, sceneSize?: number, edgesOnly?: string[]}} [viewer] - `schema.viewer` do JSON de parâmetros
 * @returns {{world: {size:number[]}, volumes: object[], trajectories: object[]}}
 */
export function adaptSimulationResult(raw, viewer = {}) {
  const volumes = raw?.geometry?.volumes ?? [];
  const trajectories = raw?.trajectories ?? [];
  const volumeColors = viewer.volumeColors ?? {};
  const sceneSize = viewer.sceneSize ?? SCENE_SIZE;

  const worldVolume = findWorldVolume(volumes);
  const meshVolumes = volumes.filter((volume) => volume !== worldVolume);

  const worldSize = worldVolume ? boundingBoxSize(worldVolume.vertices) : null;
  const largest = worldSize ? Math.max(...worldSize) : 0;
  const scale = largest > 0 ? sceneSize / largest : FALLBACK_SCALE;
  const scalePoint = (point) => point.map((v) => v * scale);

  const world = {
    size: worldSize ? worldSize.map((size) => size * scale) : [sceneSize, sceneSize, sceneSize],
  };

  // Vários volumes podem ter o mesmo nome (288 cristais "CrystalLV" no
  // B3a), então o índice entra no id pra servir de `key` estável.
  const sceneVolumes = meshVolumes.map((volume, index) => ({
    id: `${volume.name}-${index}`,
    shape: 'mesh',
    color: volumeColors[logicalName(volume.name)],
    // Só as arestas do sólido, sem as diagonais dos triângulos (ex.: os
    // cristais do PET viram caixas limpas).
    edgesOnly: (viewer.edgesOnly ?? []).includes(logicalName(volume.name)),
    vertices: (volume.vertices ?? []).map((v) => v * scale),
    indices: volume.indices ?? [],
    position: (volume.position ?? [0, 0, 0]).map((v) => v * scale),
  }));

  // event/track/particle/charge não são usados pelo viewer, mas os
  // gráficos precisam deles (ex.: angularHistogram.js conta só a
  // partícula primária de cada evento, que é a track 1 no Geant4).
  const sceneTrajectories = trajectories.map((trajectory) => ({
    id: `evt${trajectory.event}-trk${trajectory.track}`,
    event: trajectory.event,
    track: trajectory.track,
    particle: trajectory.particle,
    charge: trajectory.charge,
    // `viewer.particleColors` (opcional) troca a cor de uma partícula pelo
    // nome — ex. neutrinos em cinza no decaimento, pra não confundir com γ.
    color: viewer.particleColors?.[trajectory.particle] ?? colorForCharge(trajectory.charge),
    points: (trajectory.points ?? []).map(scalePoint),
  }));

  // PET (B3a): cada coincidência vira uma linha reta entre os dois
  // cristais atingidos, no mesmo evento — entra no playback junto com as
  // trajetórias daquele evento. `kind: 'lor'` separa das partículas nos
  // gráficos (ex.: angularHistogram.js só olha partículas).
  const lines = raw?.results?.lines_of_response ?? [];
  const lorTrajectories = lines.map((line, index) => ({
    id: `evt${line.event}-lor${index}`,
    kind: 'lor',
    event: line.event,
    color: viewer.lorColor ?? LOR_COLOR,
    points: (line.points ?? []).map(scalePoint),
  }));

  return {
    world,
    volumes: sceneVolumes,
    trajectories: [...sceneTrajectories, ...lorTrajectories],
  };
}
