import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import {
  NUCLIDES,
  detailedEventIds,
  eventSteps,
  formatDuration,
  formatEnergy,
  formatHalfLife,
  fullNuclideName,
  halfLifeByName,
  parseIonName,
} from './nuclide';

// Ilustração do núcleo (rdecay01): prótons e nêutrons como bolinhas, e os
// decaimentos de UM núcleo da simulação contados passo a passo — na alfa
// saem 2 prótons e 2 nêutrons juntos; na beta⁻ um nêutron vira próton e
// sai um elétron (e um antineutrino); na beta⁺ / captura eletrônica, o
// contrário. É uma ILUSTRAÇÃO: o tamanho, as posições das bolinhas e as
// direções de saída são inventados (o Geant4 não modela o núcleo assim) —
// o que vem da simulação é a sequência de núcleos, o tipo de cada
// decaimento, as partículas que saíram, suas energias e os tempos.

const COLORS = {
  proton: '#ef5a5a',
  neutron: '#9aa7b8',
  'e-': '#38bdf8',
  'e+': '#f472b6',
  neutrino: '#8b8b8b',
  gamma: '#facc15',
};

const PARTICLE_SYMBOLS = {
  alpha: 'α',
  'e-': 'e⁻',
  'e+': 'e⁺',
  gamma: 'γ',
  anti_nu_e: 'ν̄',
  nu_e: 'ν',
  neutron: 'n',
  proton: 'p',
};

const STEP_SECONDS = 2.6;
const MAX_NUCLEONS = 260;

// --------------------------------------------------------------------- //
// Geometria: pontos de uma rede cúbica de face centrada (empacotamento
// denso de esferas), ordenados do centro para fora. Os A primeiros formam
// uma "bola" de A núcleons encostados.
// --------------------------------------------------------------------- //
const LATTICE = (() => {
  const points = [];
  const n = 6;
  const a = Math.SQRT2; // distância entre vizinhos = 1
  const basis = [
    [0, 0, 0],
    [0.5, 0.5, 0],
    [0.5, 0, 0.5],
    [0, 0.5, 0.5],
  ];
  for (let i = -n; i <= n; i += 1)
    for (let j = -n; j <= n; j += 1)
      for (let k = -n; k <= n; k += 1)
        for (const [bx, by, bz] of basis) {
          const p = new THREE.Vector3((i + bx) * a, (j + by) * a, (k + bz) * a);
          // desempate determinístico para a bola não ficar "quadrada"
          p.userData = p.length() + 1e-4 * Math.sin(i * 12.9898 + j * 78.233 + k * 37.719 + bx * 3 + by * 5);
          points.push(p);
        }
  points.sort((p, q) => p.userData - q.userData);
  return points.slice(0, MAX_NUCLEONS + 8);
})();

function layoutFor(count) {
  // um tremido pequeno e fixo para a bola não parecer um cristal
  const pts = LATTICE.slice(0, count).map((p, i) =>
    p.clone().add(new THREE.Vector3(Math.sin(i * 1.7), Math.sin(i * 2.3 + 1), Math.sin(i * 3.1 + 2)).multiplyScalar(0.09)),
  );
  const centroid = new THREE.Vector3();
  pts.forEach((p) => centroid.add(p));
  if (count) centroid.divideScalar(count);
  return pts.map((p) => p.sub(centroid));
}

function nucleusRadius(A) {
  return Math.cbrt((3 * A) / (4 * Math.PI * Math.SQRT2)) + 0.5;
}

// PRNG determinístico (mulberry32) — a mesma simulação desenha sempre igual.
function rng(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Direção "de lado" para quem olha (no plano da tela, um pouco para a
// câmera), no ângulo `angle` — para a saída das partículas ficar visível.
function screenDirection(angle, cameraDir) {
  const helper = Math.abs(cameraDir.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
  const u = new THREE.Vector3().crossVectors(helper, cameraDir).normalize();
  const v = new THREE.Vector3().crossVectors(cameraDir, u).normalize();
  return u
    .multiplyScalar(Math.cos(angle))
    .addScaledVector(v, Math.sin(angle))
    .addScaledVector(cameraDir, 0.35)
    .normalize();
}

function buildNucleons(Z, A, seed) {
  const random = rng(seed);
  const types = Array.from({ length: A }, (_, i) => (i < Z ? 'p' : 'n'));
  for (let i = types.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [types[i], types[j]] = [types[j], types[i]];
  }
  return layoutFor(A).map((pos, i) => ({
    type: types[i],
    pos,
    from: pos.clone(),
    to: pos.clone(),
    color: new THREE.Color(types[i] === 'p' ? COLORS.proton : COLORS.neutron),
  }));
}

const ease = (x) => {
  const t = Math.min(1, Math.max(0, x));
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
};
const phase = (t, start, end) => Math.min(1, Math.max(0, (t - start) / (end - start)));

// Escolhe, entre os núcleons do tipo pedido, o mais "para fora" na direção dir.
function pickOutermost(nucleons, type, dir, exclude) {
  let best = -1;
  let bestDot = -Infinity;
  nucleons.forEach((nucleon, i) => {
    if (nucleon.type !== type || exclude.has(i)) return;
    const d = nucleon.pos.dot(dir);
    if (d > bestDot) {
      bestDot = d;
      best = i;
    }
  });
  if (best >= 0) exclude.add(best);
  return best;
}

/**
 * Monta o "plano" de animação de um decaimento a partir do estado atual.
 * Retorna as emissões (partículas que saem) e o que acontece com cada núcleon.
 */
function planStep(nucleons, step, seed, cameraDir) {
  const random = rng(seed);
  // ângulos espalhados (ângulo de ouro) para as partículas não saírem juntas
  const baseAngle = random() * Math.PI * 2;
  let turn = 0;
  const nextDirection = () => screenDirection(baseAngle + 2.4 * turn++, cameraDir);
  const dir = nextDirection();
  const dZ = step.daughter_Z - step.parent_Z;
  const dA = step.daughter_A - step.parent_A;
  const chosen = new Set();
  const leaving = [];
  const flips = [];

  if (step.mode === 'alpha' || dA < 0) {
    const nP = Math.max(0, -dZ);
    const nN = Math.max(0, -dA - nP);
    for (let i = 0; i < nP; i += 1) leaving.push(pickOutermost(nucleons, 'p', dir, chosen));
    for (let i = 0; i < nN; i += 1) leaving.push(pickOutermost(nucleons, 'n', dir, chosen));
  } else if (dZ > 0) {
    // beta⁻: nêutron → próton (um bem visível, de frente para a câmera)
    const i = pickOutermost(nucleons, 'n', cameraDir, chosen);
    if (i >= 0) flips.push({ index: i, to: 'p' });
  } else if (dZ < 0) {
    const i = pickOutermost(nucleons, 'p', cameraDir, chosen);
    if (i >= 0) flips.push({ index: i, to: 'n' });
  }

  // Partículas leves que saem (o alfa já é o grupo de núcleons acima)
  const origin =
    flips.length > 0
      ? nucleons[flips[0].index].pos.clone()
      : dir.clone().multiplyScalar(nucleusRadius(step.parent_A) * 0.8);
  const emissions = [];
  let delay = 0.3;
  if (step.mode === 'EC') {
    emissions.push({ id: 'ec', kind: 'e-', label: 'e⁻', incoming: true, origin, dir: nextDirection(), delay: 0 });
  }
  for (const [name] of step.emitted) {
    if (name === 'alpha' || /\d/.test(name)) continue;
    if (emissions.length >= 9) break;
    const kind = name === 'gamma' ? 'gamma' : name === 'e+' ? 'e+' : name === 'e-' ? 'e-' : 'neutrino';
    const isPrompt = kind === 'gamma' || (kind === 'e-' && step.mode !== 'beta-' && step.mode !== 'EC');
    emissions.push({
      id: `${emissions.length}`,
      kind,
      label: PARTICLE_SYMBOLS[name] ?? name,
      origin: kind === 'gamma' ? new THREE.Vector3() : origin,
      dir: nextDirection(),
      delay: isPrompt ? 0.62 + emissions.length * 0.04 : delay,
    });
    if (!isPrompt) delay += 0.05;
  }
  return {
    dir,
    leaving: leaving.filter((i) => i >= 0),
    flips,
    emissions,
    glowAll: step.mode === 'IT' || (dZ === 0 && dA === 0),
  };
}

// --------------------------------------------------------------------- //
// Cena 3D
// --------------------------------------------------------------------- //

const tmpMatrix = new THREE.Matrix4();
const tmpScale = new THREE.Vector3();
const tmpQuat = new THREE.Quaternion();
const white = new THREE.Color('#ffffff');

function NucleusMesh({ engine }) {
  const meshRef = useRef(null);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    // garante o buffer de cor por instância desde o início
    mesh.setColorAt(0, white);
  }, []);

  useFrame((state) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const now = state.clock.elapsedTime;
    engine.current.tick(now);
    const { nucleons, plan } = engine.current;
    const t = plan ? (now - plan.start) / STEP_SECONDS : 1;
    mesh.count = nucleons.length;
    nucleons.forEach((nucleon, i) => {
      let scale = 1;
      const color = nucleon.color.clone();
      if (plan) {
        if (nucleon.leaving) {
          const k = ease(phase(t, 0.22, 1));
          nucleon.pos.copy(nucleon.from).addScaledVector(plan.dir, k * 16);
          scale = 1 + 0.25 * Math.sin(Math.min(1, t / 0.22) * Math.PI);
        } else {
          nucleon.pos.lerpVectors(nucleon.from, nucleon.to, ease(phase(t, 0.45, 0.95)));
        }
        if (nucleon.flip) {
          const k = phase(t, 0.25, 0.5);
          color.lerpColors(nucleon.color, nucleon.flip, k);
          const glow = Math.sin(phase(t, 0.15, 0.6) * Math.PI);
          color.lerp(white, glow * 0.55);
          scale = 1 + 0.35 * glow;
        }
        if (plan.glowAll) color.lerp(white, Math.sin(phase(t, 0.35, 0.9) * Math.PI) * 0.45);
      }
      tmpScale.setScalar(scale * 0.5);
      tmpMatrix.compose(nucleon.pos, tmpQuat, tmpScale);
      mesh.setMatrixAt(i, tmpMatrix);
      mesh.setColorAt(i, color);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, MAX_NUCLEONS]} frustumCulled={false}>
      <sphereGeometry args={[1, 20, 14]} />
      <meshStandardMaterial roughness={0.55} metalness={0.05} />
    </instancedMesh>
  );
}

function Emission({ emission, engine }) {
  const ref = useRef(null);
  const tagRef = useRef(null);
  // O <Html> do drei não some junto com o grupo: esconde o rótulo à mão.
  const show = (group, visible) => {
    group.visible = visible;
    if (tagRef.current) tagRef.current.style.display = visible ? '' : 'none';
  };
  const size = emission.kind === 'neutrino' ? 0.14 : 0.22;
  const color = COLORS[emission.kind] ?? '#ffffff';
  useFrame((state) => {
    const group = ref.current;
    if (!group) return;
    const t = (state.clock.elapsedTime - engine.current.stepStart) / STEP_SECONDS;
    if (!(t >= 0)) {
      show(group, false);
      return;
    }
    if (emission.incoming) {
      // captura eletrônica: o elétron vem de fora e some no próton
      const k = ease(phase(t, 0, 0.28));
      group.position.copy(emission.origin).addScaledVector(emission.dir, (1 - k) * 9);
      show(group, t < 0.3);
      return;
    }
    const k = phase(t, emission.delay, 1);
    const speed = emission.kind === 'gamma' || emission.kind === 'neutrino' ? 22 : 15;
    group.position.copy(emission.origin).addScaledVector(emission.dir, k * speed);
    show(group, t >= emission.delay && t < 1.15);
  });
  return (
    <group ref={ref} visible={false}>
      <mesh>
        <sphereGeometry args={[size, 12, 10]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <Html center distanceFactor={10} zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
        <span ref={tagRef} className="nucleus-illustration__tag" style={{ '--tag-color': color, display: 'none' }}>
          {emission.label}
        </span>
      </Html>
    </group>
  );
}

function AlphaTag({ engine }) {
  const ref = useRef(null);
  const tagRef = useRef(null);
  useFrame(() => {
    const group = ref.current;
    if (!group) return;
    const { nucleons, plan } = engine.current;
    const leaving = nucleons.filter((nucleon) => nucleon.leaving);
    if (!plan || leaving.length === 0) {
      group.visible = false;
      if (tagRef.current) tagRef.current.style.display = 'none';
      return;
    }
    const center = new THREE.Vector3();
    leaving.forEach((nucleon) => center.add(nucleon.pos));
    center.divideScalar(leaving.length);
    group.position.copy(center).add(new THREE.Vector3(0, 1.1, 0));
    group.visible = true;
    if (tagRef.current) tagRef.current.style.display = '';
  });
  return (
    <group ref={ref} visible={false}>
      <Html center distanceFactor={10} zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
        <span ref={tagRef} className="nucleus-illustration__tag" style={{ display: 'none' }}>
          α
        </span>
      </Html>
    </group>
  );
}

// --------------------------------------------------------------------- //
// "Motor" da animação — fica num ref para o useFrame não depender do React
// --------------------------------------------------------------------- //

function createEngine(Z, A, seed) {
  return {
    nucleons: buildNucleons(Z, A, seed),
    plan: null,
    onDone: null,
    stepStart: Infinity,
    cameraDir: new THREE.Vector3(0, 0, 1),
    start(step, stepSeed) {
      const plan = planStep(this.nucleons, step, stepSeed, this.cameraDir.clone());
      const leavingSet = new Set(plan.leaving);
      this.nucleons.forEach((nucleon, i) => {
        nucleon.from = nucleon.pos.clone();
        nucleon.leaving = leavingSet.has(i);
        nucleon.flip = null;
      });
      for (const flip of plan.flips) {
        this.nucleons[flip.index].flip = new THREE.Color(flip.to === 'p' ? COLORS.proton : COLORS.neutron);
        this.nucleons[flip.index].newType = flip.to;
      }
      // os que ficam vão para a nova "bola", mais compacta
      // Os que ficam vão para a nova "bola", mais compacta: cada lugar novo
      // (do centro para fora) recebe o núcleon mais próximo que sobrou, para
      // ninguém atravessar o núcleo inteiro.
      const staying = this.nucleons.filter((nucleon) => !nucleon.leaving);
      if (staying.length !== this.nucleons.length) {
        const targets = layoutFor(staying.length);
        const centroid = new THREE.Vector3();
        staying.forEach((nucleon) => centroid.add(nucleon.pos));
        centroid.divideScalar(Math.max(1, staying.length));
        const free = staying.map((nucleon) => ({ nucleon, rel: nucleon.pos.clone().sub(centroid) }));
        for (const target of targets) {
          let best = 0;
          let bestDist = Infinity;
          for (let i = 0; i < free.length; i += 1) {
            const d = free[i].rel.distanceToSquared(target);
            if (d < bestDist) {
              bestDist = d;
              best = i;
            }
          }
          free[best].nucleon.to = target;
          free.splice(best, 1);
        }
      } else {
        staying.forEach((nucleon) => {
          nucleon.to = nucleon.pos.clone();
        });
      }
      this.plan = { ...plan, start: null };
      this.stepStart = Infinity;
    },
    tick(now) {
      if (!this.plan) return;
      if (this.plan.start === null) {
        this.plan.start = now;
        this.stepStart = now;
      }
      if ((now - this.plan.start) / STEP_SECONDS < 1) return;
      // fim do passo: aplica o resultado
      this.nucleons = this.nucleons.filter((nucleon) => !nucleon.leaving);
      for (const nucleon of this.nucleons) {
        nucleon.pos.copy(nucleon.to);
        if (nucleon.flip) {
          nucleon.color = nucleon.flip;
          nucleon.type = nucleon.newType;
          nucleon.flip = null;
        }
      }
      this.plan = null;
      const done = this.onDone;
      this.onDone = null;
      done?.();
    },
  };
}

// Guarda para onde a câmera olha (o usuário pode girar a cena), para as
// partículas saírem de lado na tela.
function CameraTracker({ engine }) {
  useFrame(({ camera }) => {
    engine.current.cameraDir.copy(camera.position).normalize();
  });
  return null;
}

function Scene({ engine, emissions }) {
  return (
    <>
      <color attach="background" args={['#000000']} />
      <ambientLight intensity={0.55} />
      <directionalLight position={[6, 8, 10]} intensity={1.6} />
      <directionalLight position={[-8, -4, -6]} intensity={0.35} />
      <CameraTracker engine={engine} />
      <NucleusMesh engine={engine} />
      <AlphaTag engine={engine} />
      {emissions.items.map((emission) => (
        <Emission key={`${emissions.key}-${emission.id}`} emission={emission} engine={engine} />
      ))}
      <OrbitControls enablePan={false} minDistance={4} maxDistance={40} />
    </>
  );
}

// --------------------------------------------------------------------- //
// Componente principal
// --------------------------------------------------------------------- //

function stateLabel(name, halfLives, fallbackHalfLife) {
  const { symbol, A, excited } = parseIonName(name);
  const halfLife = halfLives.get(name) ?? fallbackHalfLife ?? null;
  const metastable = excited && halfLife != null && halfLife > 1e-6;
  return { symbol, A, metastable, halfLife };
}

const STEP_TITLES = {
  alpha: 'Decaimento alfa (α)',
  'beta-': 'Decaimento beta menos (β⁻)',
  'beta+': 'Decaimento beta mais (β⁺)',
  EC: 'Captura eletrônica',
  IT: 'Transição isomérica',
  n: 'Emissão de nêutron',
  p: 'Emissão de próton',
};

function describeStep(step) {
  const byKind = {
    alpha: 'saíram 2 prótons e 2 nêutrons juntos — uma partícula alfa (um núcleo de hélio-4)',
    'beta-': 'um nêutron virou próton; para a carga fechar, saiu um elétron, junto com um antineutrino',
    'beta+': 'um próton virou nêutron; saiu um pósitron (a antipartícula do elétron) e um neutrino',
    EC: 'o núcleo capturou um elétron da própria eletrosfera: um próton virou nêutron e saiu um neutrino',
    IT: 'o núcleo estava num estado excitado que dura bastante (metaestável) e liberou a energia extra como raio gama ou elétron de conversão — os prótons e nêutrons continuam os mesmos',
    n: 'saiu um nêutron',
    p: 'saiu um próton',
  };
  return `${STEP_TITLES[step.mode] ?? 'Decaimento'}: ${byKind[step.mode] ?? 'o núcleo mudou'}.`;
}

export default function NucleusIllustration({ nuclide, results, runKey }) {
  // Com resultados da simulação deste núcleo: anima a cadeia de um evento.
  // Sem eles (antes de simular, ou depois de trocar o núcleo no
  // formulário): só mostra o núcleo escolhido, parado.
  const selected = NUCLIDES[nuclide] ?? NUCLIDES.U238;
  const usable = Boolean(
    results?.primary && results.primary.Z === selected.Z && results.primary.A === selected.A,
  );
  const eventIds = useMemo(() => (usable ? detailedEventIds(results.decays) : []), [usable, results]);
  const [eventChoice, setEventChoice] = useState({ runKey, pos: 0 });
  // nova simulação: volta para o primeiro núcleo
  const eventPos = eventChoice.runKey === runKey ? eventChoice.pos : 0;
  const eventId = eventIds[eventPos % Math.max(1, eventIds.length)] ?? 0;

  // Trocar de núcleo, de evento ou de simulação remonta o player do zero.
  return (
    <NucleusPlayer
      key={`${nuclide}-${usable ? `${runKey}-${eventId}` : 'static'}`}
      selected={selected}
      nuclide={nuclide}
      results={usable ? results : null}
      eventId={eventId}
      eventPos={eventPos}
      eventCount={eventIds.length}
      onNextEvent={() => setEventChoice({ runKey, pos: (eventPos + 1) % Math.max(1, eventIds.length) })}
    />
  );
}

function NucleusPlayer({ selected, nuclide, results, eventId, eventPos, eventCount, onNextEvent }) {
  const usable = Boolean(results);
  const steps = useMemo(() => (usable ? eventSteps(results.decays, eventId) : []), [usable, results, eventId]);
  const halfLives = useMemo(() => halfLifeByName(results?.transitions), [results]);

  // index = quantos decaimentos já aconteceram no núcleo mostrado
  const [index, setIndex] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [autoplayOn, setAutoplay] = useState(false);
  const autoplay = autoplayOn && index < steps.length;
  const engine = useRef(null);
  if (engine.current == null) engine.current = createEngine(selected.Z, selected.A, 7919 * (eventId + 1));
  const [emissions, setEmissions] = useState({ key: 0, items: [] });
  const distance = Math.max(7, nucleusRadius(selected.A) * 3.4);

  const rebuild = useCallback(
    (toIndex) => {
      const state =
        toIndex === 0
          ? { Z: selected.Z, A: selected.A }
          : { Z: steps[toIndex - 1].daughter_Z, A: steps[toIndex - 1].daughter_A };
      engine.current = createEngine(state.Z, state.A, 7919 * (eventId + 1) + toIndex);
      setEmissions((prev) => ({ key: prev.key + 1, items: [] }));
      setIndex(toIndex);
      setAnimating(false);
      setAutoplay(false);
    },
    [selected, steps, eventId],
  );

  const advance = useCallback(() => {
    if (animating || index >= steps.length || !engine.current) return;
    const step = steps[index];
    engine.current.start(step, 104729 * (eventId + 1) + index);
    engine.current.onDone = () => {
      setIndex((value) => value + 1);
      setAnimating(false);
    };
    setEmissions((prev) => ({ key: prev.key + 1, items: engine.current.plan.emissions }));
    setAnimating(true);
  }, [animating, index, steps, eventId]);

  // Reproduzir: passa sozinho de um decaimento para o próximo.
  useEffect(() => {
    if (!autoplay || animating) return undefined;
    const timer = setTimeout(advance, index === 0 ? 150 : 700);
    return () => clearTimeout(timer);
  }, [autoplay, animating, index, advance]);

  // Estado mostrado: antes do passo `index` (ou o último núcleo, no fim)
  const current = (() => {
    if (!usable || steps.length === 0) {
      return { symbol: parseIonName(nuclide).symbol, A: selected.A, Z: selected.Z, metastable: false, halfLife: results?.primary?.half_life_s ?? selected.halfLife };
    }
    if (index < steps.length) {
      const info = stateLabel(steps[index].parent, halfLives, index === 0 ? results.primary.half_life_s : null);
      return { ...info, Z: steps[index].parent_Z };
    }
    const last = steps[steps.length - 1];
    const info = stateLabel(last.daughter, halfLives, null);
    return { ...info, Z: last.daughter_Z };
  })();
  const N = current.A - current.Z;
  const finished = usable && steps.length > 0 && index >= steps.length;
  const lastStep = index > 0 ? steps[index - 1] : null;

  let caption;
  if (!usable) {
    caption = 'Clique em Simular para ver os decaimentos deste núcleo, um de cada vez.';
  } else if (animating) {
    caption = describeStep(steps[index]);
  } else if (lastStep) {
    const gap = lastStep.life_s ?? lastStep.t_s - (index > 1 ? steps[index - 2].t_s : 0);
    const particles = lastStep.emitted
      .filter(([name]) => !/\d/.test(name))
      .map(([name, keV]) => `${PARTICLE_SYMBOLS[name] ?? name} ${formatEnergy(keV)}`)
      .join(' · ');
    const parent = stateLabel(lastStep.parent, halfLives, null);
    const parentName = fullNuclideName(parent.symbol, parent.A, parent.metastable).toLowerCase();
    const when =
      gap < 1e-9
        ? `O ${parentName} decaiu praticamente na hora.`
        : `O ${parentName} durou ${formatDuration(gap)} antes de decair.`;
    caption = `${describeStep(lastStep)} ${when} Energia das partículas: ${particles || '—'}.`;
  } else {
    caption =
      steps.length > 0
        ? `Este núcleo vai decair ${steps.length} ${steps.length === 1 ? 'vez' : 'vezes'} nesta simulação. Clique em “Próximo decaimento” ou em “Reproduzir”.`
        : 'Nenhum decaimento registrado para este núcleo.';
  }

  const nameText = fullNuclideName(current.symbol, current.A, current.metastable);
  const halfText = formatHalfLife(current.halfLife);

  return (
    <section className="nucleus-illustration" aria-label="Ilustração do núcleo">
      <div className="nucleus-illustration__head">
        <div>
          <h3 className="nucleus-illustration__title">
            {nameText}
            {finished && current.halfLife == null && <span className="nucleus-illustration__stable"> · estável</span>}
          </h3>
          <p className="nucleus-illustration__counts">
            {current.Z} prótons · {N} nêutrons
            {halfText && current.halfLife != null && ` · meia-vida ${halfText}`}
          </p>
        </div>
        <span className="nucleus-illustration__scale">ilustração fora de escala</span>
      </div>

      <div className="nucleus-illustration__canvas">
        <Canvas
          dpr={[1, 2]}
          camera={{ position: [0, 0, distance], fov: 40, near: 0.1, far: 200 }}
          gl={{ preserveDrawingBuffer: false, antialias: true }}
        >
          <Scene engine={engine} emissions={emissions} />
        </Canvas>
      </div>

      <p className="nucleus-illustration__caption" aria-live="polite">
        {caption}
      </p>

      {usable && steps.length > 0 && (
        <div className="nucleus-illustration__controls">
          <button
            type="button"
            className="sim-page__button sim-page__button--primary"
            onClick={() => {
              if (finished) {
                rebuild(0);
                return;
              }
              setAutoplay((value) => !value);
            }}
          >
            {finished ? 'Recomeçar' : autoplay ? 'Pausar' : 'Reproduzir'}
          </button>
          <button type="button" className="sim-page__button" onClick={advance} disabled={animating || autoplay || finished}>
            Próximo decaimento
          </button>
          <button
            type="button"
            className="sim-page__button"
            onClick={() => rebuild(Math.max(0, index - 1))}
            disabled={animating || autoplay || index === 0}
          >
            Voltar
          </button>
          {eventCount > 1 && (
            <button
              type="button"
              className="sim-page__button"
              onClick={onNextEvent}
              disabled={animating}
              title="Cada evento da simulação é um núcleo diferente — os tempos (e, em alguns núcleos, o caminho) mudam"
            >
              Outro núcleo ({eventPos + 1} de {eventCount})
            </button>
          )}
          <span className="nucleus-illustration__progress">
            Decaimento {Math.min(index + (animating ? 1 : 0), steps.length)} de {steps.length}
          </span>
        </div>
      )}

      <ul className="nucleus-illustration__legend">
        <li>
          <span style={{ '--swatch': COLORS.proton }} aria-hidden="true" />
          próton
        </li>
        <li>
          <span style={{ '--swatch': COLORS.neutron }} aria-hidden="true" />
          nêutron
        </li>
        <li>
          <span style={{ '--swatch': COLORS['e-'] }} aria-hidden="true" />
          elétron (e⁻)
        </li>
        <li>
          <span style={{ '--swatch': COLORS['e+'] }} aria-hidden="true" />
          pósitron (e⁺)
        </li>
        <li>
          <span style={{ '--swatch': COLORS.neutrino }} aria-hidden="true" />
          neutrino (ν)
        </li>
        <li>
          <span style={{ '--swatch': COLORS.gamma }} aria-hidden="true" />
          gama (γ)
        </li>
      </ul>
      <p className="nucleus-illustration__note">
        Um núcleo de verdade não é um cacho de bolinhas paradas, e é umas 100 mil vezes menor que o
        átomo: o desenho só serve para contar prótons e nêutrons. O que vem da simulação é a
        sequência de núcleos, o tipo de cada decaimento, as partículas emitidas, suas energias e os
        tempos entre um decaimento e outro.
      </p>
    </section>
  );
}
