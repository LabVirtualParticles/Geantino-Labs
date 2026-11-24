import { Suspense, forwardRef, memo, useImperativeHandle, useMemo, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { Line, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import RunProgress from './RunProgress';

// Clean edge-only wireframe (via EdgesGeometry) instead of the
// `wireframe: true` material prop, which draws a diagonal across every
// quad face and doesn't match the clean box outline in the reference
// video.
function WireframeBox({ size, position = [0, 0, 0] }) {
  const edges = useMemo(
    () => new THREE.EdgesGeometry(new THREE.BoxGeometry(...size)),
    [size]
  );
  return (
    <lineSegments geometry={edges} position={position}>
      <lineBasicMaterial color="#ffffff" transparent opacity={0.35} />
    </lineSegments>
  );
}

function TargetVolume({ size, position = [0, 0, 0] }) {
  return (
    <mesh position={position}>
      <boxGeometry args={size} />
      <meshBasicMaterial color="#9a9a9a" wireframe />
    </mesh>
  );
}

// Malha genérica vinda do backend real (geometry_converter.py): vértices
// planos [x0,y0,z0, x1,y1,z1, ...] + índices de triângulo. Usado para
// qualquer sólido que não seja uma caixa simples (ex.: o detector, um
// G4Tubs tesselado em arco).
function MeshVolume({ vertices, indices, position = [0, 0, 0], color, edgesOnly = false }) {
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    if (indices && indices.length > 0) geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }, [vertices, indices]);
  const edges = useMemo(
    () => (edgesOnly ? new THREE.EdgesGeometry(geometry) : null),
    [edgesOnly, geometry],
  );

  if (edges) {
    return (
      <lineSegments geometry={edges} position={position}>
        <lineBasicMaterial color={color ?? '#9a9a9a'} transparent opacity={0.6} />
      </lineSegments>
    );
  }

  return (
    <mesh geometry={geometry} position={position}>
      <meshBasicMaterial color={color ?? '#9a9a9a'} wireframe />
    </mesh>
  );
}

// Uma linha por trajetória. `memo` + `key` estável: quando o playback
// revela mais eventos, só as linhas novas são criadas — as que já estavam
// na tela não são refeitas. `dim` apaga as trajetórias mais antigas
// enquanto o playback está no meio (as recentes ficam com cor cheia).
// Linhas de resposta do PET (`kind: 'lor'`) saem mais grossas que as
// trajetórias, senão somem no meio dos fótons.
const TrajectoryLine = memo(function TrajectoryLine({ points, color, dim, width = 1.4 }) {
  return (
    <Line points={points} color={color} lineWidth={width} transparent opacity={dim ? 0.4 : 1} />
  );
});

function Trajectories({ trajectories, visibleCount, recentFrom, showParticles = true }) {
  const count = visibleCount ?? trajectories.length;
  return trajectories.slice(0, count).map((trajectory, index) => {
    const isLor = trajectory.kind === 'lor';
    if (!showParticles && !isLor) return null;
    return (
      <TrajectoryLine
        key={trajectory.id}
        points={trajectory.points}
        color={trajectory.color}
        dim={index < recentFrom}
        width={isLor ? 3 : 1.4}
      />
    );
  });
}

/**
 * `data` aceita dois formatos de volume, para funcionar tanto com o mock
 * quanto com a resposta real do backend (já convertida por adapter.js):
 *   - caixa simples: { id, shape: 'box' (ou omitido), size, position, wireframeOnly? }
 *   - malha genérica: { id, shape: 'mesh', vertices, indices, position, color? }
 * Formato geral: { world: { size }, volumes: [...], trajectories: [{ id, color, points }] }
 */
// `forwardRef` expõe `captureScreenshot()` pro componente pai (ver
// SimulationExample.jsx, botão "Gerar relatório") — é como o "print do
// detector no momento em que o botão é acionado" é obtido: lê o canvas
// WebGL atual como PNG. `preserveDrawingBuffer: true` no <Canvas> é
// obrigatório pra isso: sem ele, o WebGL limpa o buffer de desenho logo
// depois de cada frame e toDataURL() devolve uma imagem em branco.
//
// Playback (ver eventPlayback.js): `visibleCount` = quantas trajetórias
// desenhar (as primeiras da lista, já ordenada por evento) e `recentFrom` =
// a partir de qual índice ficam com cor cheia. Sem essas props, desenha
// tudo. `runProgress` alimenta o indicador enquanto a simulação roda.
// `showParticles={false}` esconde as trajetórias e deixa só as linhas de
// resposta (PET). `cameraPosition` (de `schema.viewer.camera`) troca o
// ponto de vista inicial — no espectrômetro o detector é comprido e a vista
// padrão cortava os calorímetros. `cameraUp` (de `schema.viewer.up`) troca
// o "para cima" da câmera — no telescópio de raios gama o eixo do detector é
// o z do Geant4, e com [0, 0, 1] ele aparece em pé.
const SimulationViewer = forwardRef(function SimulationViewer(
  { data, status, visibleCount, recentFrom = 0, runProgress, showParticles = true, cameraPosition, cameraUp },
  ref,
) {
  const wrapperRef = useRef(null);

  useImperativeHandle(ref, () => ({
    captureScreenshot() {
      const canvas = wrapperRef.current?.querySelector('canvas');
      return canvas ? canvas.toDataURL('image/png') : null;
    },
  }));

  return (
    <div className="simulation-viewer" ref={wrapperRef}>
      <Canvas
        camera={{ position: cameraPosition ?? [220, 160, 260], fov: 40, ...(cameraUp ? { up: cameraUp } : {}) }}
        gl={{ preserveDrawingBuffer: true }}
      >
        <color attach="background" args={['#000000']} />
        <ambientLight intensity={0.6} />
        <Suspense fallback={null}>
          <WireframeBox size={data.world.size} />
          {data.volumes
            .filter((volume) => !volume.wireframeOnly)
            .map((volume) =>
              volume.shape === 'mesh' ? (
                <MeshVolume
                  key={volume.id}
                  vertices={volume.vertices}
                  indices={volume.indices}
                  position={volume.position}
                  color={volume.color}
                  edgesOnly={volume.edgesOnly}
                />
              ) : (
                <TargetVolume key={volume.id} size={volume.size} position={volume.position} />
              )
            )}
          <Trajectories
            trajectories={data.trajectories}
            visibleCount={visibleCount}
            recentFrom={recentFrom}
            showParticles={showParticles}
          />
        </Suspense>
        <OrbitControls enablePan={false} minDistance={120} maxDistance={600} />
      </Canvas>

      {status === 'running' && <RunProgress {...runProgress} />}
      {status === 'error' && (
        <div className="simulation-viewer__overlay" role="alert">
          Falha ao rodar a simulação. Veja o console para detalhes.
        </div>
      )}
    </div>
  );
});

export default SimulationViewer;
