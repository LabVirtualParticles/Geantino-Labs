import { Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { Line, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

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
function MeshVolume({ vertices, indices, position = [0, 0, 0], color = '#9a9a9a' }) {
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    if (indices && indices.length > 0) geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }, [vertices, indices]);

  return (
    <mesh geometry={geometry} position={position}>
      <meshBasicMaterial color={color} wireframe />
    </mesh>
  );
}

function Trajectories({ trajectories }) {
  return trajectories.map((trajectory) => (
    <Line key={trajectory.id} points={trajectory.points} color={trajectory.color} lineWidth={1.4} />
  ));
}

/**
 * `data` aceita dois formatos de volume, para funcionar tanto com o mock
 * quanto com a resposta real do backend (já convertida por adapter.js):
 *   - caixa simples: { id, shape: 'box' (ou omitido), size, position, wireframeOnly? }
 *   - malha genérica: { id, shape: 'mesh', vertices, indices, position }
 * Formato geral: { world: { size }, volumes: [...], trajectories: [{ id, color, points }] }
 */
export default function SimulationViewer({ data, status }) {
  return (
    <div className="simulation-viewer">
      <Canvas camera={{ position: [220, 160, 260], fov: 40 }}>
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
                />
              ) : (
                <TargetVolume key={volume.id} size={volume.size} position={volume.position} />
              )
            )}
          <Trajectories trajectories={data.trajectories} />
        </Suspense>
        <OrbitControls enablePan={false} minDistance={120} maxDistance={600} />
      </Canvas>

      {status === 'running' && (
        <div className="simulation-viewer__overlay" role="status">
          Processando simulação…
        </div>
      )}
      {status === 'error' && (
        <div className="simulation-viewer__overlay" role="alert">
          Falha ao rodar a simulação. Veja o console para detalhes.
        </div>
      )}
    </div>
  );
}
