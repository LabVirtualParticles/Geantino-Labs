// Converte a resposta real do backend ({geometry, trajectories}, em
// centímetros, formato geometry_converter.py) para o formato que
// SimulationViewer.jsx espera ({world, volumes, trajectories}, em
// "unidades de cena").
//
// Fator de escala: o mundo real do Geant4 é um cubo de 20cm de lado
// (worldBox no GDML); a cena mock original foi calibrada para um mundo
// de 400 unidades (câmera, distâncias do OrbitControls etc.) — daí o
// fator fixo de ×20 abaixo. Se o tamanho do worldBox mudar no C++, este
// fator deixa de bater e a câmera fica desproporcional ao conteúdo.
export const SCENE_SCALE = 20;

function scalePoint(point) {
  return point.map((v) => v * SCENE_SCALE);
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
function colorForCharge(charge) {
  if (charge > 0) return '#E3B23C'; // positiva (ex.: alpha, próton) — dourado
  if (charge < 0) return '#7FB2FF'; // negativa (ex.: elétron) — azul claro
  return '#2F5DFF'; // neutra (ex.: gama) — azul do feixe
}

/**
 * @param {{geometry: {volumes: object[]}, trajectories: object[]}} raw - resposta de POST /simulations/{id}/run
 * @returns {{world: {size:number[]}, volumes: object[], trajectories: object[]}}
 */
export function adaptSimulationResult(raw) {
  const volumes = raw?.geometry?.volumes ?? [];
  const trajectories = raw?.trajectories ?? [];

  const worldVolume = volumes.find((volume) => volume.name?.startsWith('LogicalWorld'));
  const meshVolumes = volumes.filter((volume) => volume !== worldVolume);

  const world = {
    size: worldVolume
      ? boundingBoxSize(worldVolume.vertices).map((size) => size * SCENE_SCALE)
      : [400, 400, 400],
  };

  const sceneVolumes = meshVolumes.map((volume) => ({
    id: volume.name,
    shape: 'mesh',
    vertices: (volume.vertices ?? []).map((v) => v * SCENE_SCALE),
    indices: volume.indices ?? [],
    position: (volume.position ?? [0, 0, 0]).map((v) => v * SCENE_SCALE),
  }));

  const sceneTrajectories = trajectories.map((trajectory) => ({
    id: `evt${trajectory.event}-trk${trajectory.track}`,
    color: colorForCharge(trajectory.charge),
    points: (trajectory.points ?? []).map(scalePoint),
  }));

  return { world, volumes: sceneVolumes, trajectories: sceneTrajectories };
}
