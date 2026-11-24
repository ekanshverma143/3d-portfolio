"use client";

import { Html } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

const AMBER = new THREE.Color("#ffb35c");
const TOOLS = ["gmail", "whatsapp", "voice", "sql", "slack", "search", "pdf", "queue", "calendar", "payments"];
const PULSE_SPEED = 1.15;
const TRAIL = [
  { lag: 0, size: 3.6, glow: 1 },
  { lag: 0.06, size: 2.5, glow: 0.5 },
  { lag: 0.12, size: 1.7, glow: 0.26 },
  { lag: 0.18, size: 1.1, glow: 0.12 },
];

const vertexShader = /* glsl */ `
  uniform float uPixelRatio;
  uniform float uScale;
  attribute float aSize;
  attribute vec3 aColor;
  varying vec3 vColor;
  varying float vDepth;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aSize * uScale * uPixelRatio / -mv.z;
    vColor = aColor;
    vDepth = -mv.z;
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uNear;
  uniform float uFar;
  varying vec3 vColor;
  varying float vDepth;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    float a = pow(smoothstep(0.5, 0.0, d), 1.7);
    float fade = 1.0 - smoothstep(uNear, uFar, vDepth) * 0.85;
    gl_FragColor = vec4(vColor * fade, a * fade);
  }
`;

function mulberry32(seed: number) {
  let s = seed;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function fibonacciSphere(i: number, n: number) {
  const y = 1 - (i / Math.max(n - 1, 1)) * 2;
  const r = Math.sqrt(Math.max(0, 1 - y * y));
  const theta = Math.PI * (3 - Math.sqrt(5)) * i;
  return new THREE.Vector3(Math.cos(theta) * r, y, Math.sin(theta) * r);
}

type Graph = {
  points: THREE.Vector3[];
  baseSize: Float32Array;
  baseColor: Float32Array;
  edges: Array<[number, number]>;
  spokes: Array<[number, number]>;
  adj: number[][];
  tools: number[];
};

function buildGraph(fieldCount: number): Graph {
  const rand = mulberry32(7);
  const jitter = (v: THREE.Vector3, amount: number) =>
    v.set(v.x + (rand() - 0.5) * amount, v.y + (rand() - 0.5) * amount, v.z + (rand() - 0.5) * amount);

  const points: THREE.Vector3[] = [new THREE.Vector3()];
  const tools: number[] = [];
  TOOLS.forEach((_, i) => {
    tools.push(points.length);
    points.push(jitter(fibonacciSphere(i, TOOLS.length).multiplyScalar(1.4), 0.3));
  });

  const fieldStart = points.length;
  for (let i = 0; i < fieldCount; i++) {
    const p = fibonacciSphere(i, fieldCount).multiplyScalar(2.3 + rand() * 1.15);
    p.y *= 0.8;
    points.push(jitter(p, 0.4));
  }

  const n = points.length;
  const seen = new Set<string>();
  const edges: Array<[number, number]> = [];
  const spokes: Array<[number, number]> = [];
  const adj: number[][] = Array.from({ length: n }, () => []);
  const link = (a: number, b: number, list: Array<[number, number]>) => {
    const key = a < b ? `${a}-${b}` : `${b}-${a}`;
    if (a === b || seen.has(key)) return;
    seen.add(key);
    list.push([a, b]);
    adj[a].push(b);
    adj[b].push(a);
  };
  const nearest = (i: number, k: number) => {
    const out: Array<[number, number]> = [];
    for (let j = fieldStart; j < n; j++) if (j !== i) out.push([points[i].distanceToSquared(points[j]), j]);
    out.sort((x, y) => x[0] - y[0]);
    return out.slice(0, k).map(([, j]) => j);
  };

  tools.forEach((t) => link(0, t, spokes));
  tools.forEach((t) => nearest(t, 4).forEach((j) => link(t, j, edges)));
  for (let i = fieldStart; i < n; i++) nearest(i, 2).forEach((j) => link(i, j, edges));

  const baseSize = new Float32Array(n);
  const baseColor = new Float32Array(n * 3);
  const field = new THREE.Color("#8a93a3");
  const tool = new THREE.Color("#e8e6e1");
  for (let i = 0; i < n; i++) {
    if (i === 0) {
      baseSize[i] = 9;
      AMBER.toArray(baseColor, i * 3);
    } else if (i < fieldStart) {
      baseSize[i] = 4.6;
      tool.toArray(baseColor, i * 3);
    } else {
      baseSize[i] = 1.8 + rand() * 1.6;
      field.clone().multiplyScalar(0.55 + rand() * 0.45).toArray(baseColor, i * 3);
    }
  }

  return { points, baseSize, baseColor, edges, spokes, adj, tools };
}

function lineGeometry(points: THREE.Vector3[], list: Array<[number, number]>) {
  const arr = new Float32Array(list.length * 6);
  list.forEach(([a, b], i) => {
    points[a].toArray(arr, i * 6);
    points[b].toArray(arr, i * 6 + 3);
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(arr, 3));
  return g;
}

type Pulse = { from: number; to: number; t: number; hops: number };

function Network({ animate, pointer }: { animate: boolean; pointer: React.RefObject<{ x: number; y: number }> }) {
  const { size, gl, camera, invalidate } = useThree();
  const compact = size.width < 900;
  const graph = useMemo(() => buildGraph(compact ? 72 : 132), [compact]);
  const outer = useRef<THREE.Group>(null!);
  const inner = useRef<THREE.Group>(null!);
  const ring1 = useRef<THREE.Mesh>(null!);
  const ring2 = useRef<THREE.Mesh>(null!);
  const labels = useRef<Array<HTMLSpanElement | null>>([]);
  const n = graph.points.length;
  const pulseCount = compact ? 18 : 34;

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uPixelRatio: { value: gl.getPixelRatio() },
          uScale: { value: 32 },
          uNear: { value: 6.4 },
          uFar: { value: 11.5 },
        },
        vertexShader,
        fragmentShader,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [gl],
  );

  const nodeGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(n * 3);
    graph.points.forEach((p, i) => p.toArray(pos, i * 3));
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aSize", new THREE.BufferAttribute(graph.baseSize.slice(), 1));
    g.setAttribute("aColor", new THREE.BufferAttribute(graph.baseColor.slice(), 3));
    return g;
  }, [graph, n]);

  const edgeGeo = useMemo(() => lineGeometry(graph.points, graph.edges), [graph]);
  const spokeGeo = useMemo(() => lineGeometry(graph.points, graph.spokes), [graph]);

  const sim = useMemo(() => {
    const rand = mulberry32(11);
    const pickTool = () => graph.tools[Math.floor(rand() * graph.tools.length)];
    const pulses: Pulse[] = Array.from({ length: pulseCount }, () => ({
      from: 0,
      to: pickTool(),
      t: rand() * 1.4 - 0.4,
      hops: 2 + Math.floor(rand() * 3),
    }));
    const geo = new THREE.BufferGeometry();
    const count = pulseCount * TRAIL.length;
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    geo.setAttribute("aSize", new THREE.BufferAttribute(new Float32Array(count), 1));
    geo.setAttribute("aColor", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    return { rand, pickTool, pulses, geo, flash: new Float32Array(n) };
  }, [graph, n, pulseCount]);

  useEffect(() => () => {
    nodeGeo.dispose();
    edgeGeo.dispose();
    spokeGeo.dispose();
    sim.geo.dispose();
  }, [nodeGeo, edgeGeo, spokeGeo, sim]);

  useEffect(() => {
    if (!animate) invalidate();
  }, [animate, invalidate]);

  const tmp = useMemo(() => ({ v: new THREE.Vector3(), c: new THREE.Color() }), []);

  useFrame((state, rawDt) => {
    const dt = animate ? Math.min(rawDt, 0.05) : 0;
    const { pulses, flash, geo, rand, pickTool } = sim;

    if (animate) {
      outer.current.rotation.y += dt * 0.045;
      const p = pointer.current;
      inner.current.rotation.x = THREE.MathUtils.damp(inner.current.rotation.x, -p.y * 0.18, 2.2, dt);
      inner.current.rotation.y = THREE.MathUtils.damp(inner.current.rotation.y, p.x * 0.32, 2.2, dt);
      ring1.current.rotation.z += dt * 0.5;
      ring2.current.rotation.x += dt * 0.22;
    }

    const pos = geo.attributes.position.array as Float32Array;
    const sizes = geo.attributes.aSize.array as Float32Array;
    const colors = geo.attributes.aColor.array as Float32Array;

    pulses.forEach((pulse, pi) => {
      const a = graph.points[pulse.from];
      const b = graph.points[pulse.to];
      pulse.t += (dt * PULSE_SPEED) / Math.max(a.distanceTo(b), 0.2);
      if (pulse.t >= 1) {
        flash[pulse.to] = 1;
        pulse.hops -= 1;
        const options = graph.adj[pulse.to].filter((j) => j !== pulse.from);
        if (pulse.hops <= 0 || options.length === 0) {
          pulse.from = 0;
          pulse.to = pickTool();
          pulse.t = -rand() * 0.9;
          pulse.hops = 2 + Math.floor(rand() * 3);
        } else {
          pulse.from = pulse.to;
          pulse.to = options[Math.floor(rand() * options.length)];
          pulse.t = 0;
        }
      }
      const from = graph.points[pulse.from];
      const to = graph.points[pulse.to];
      TRAIL.forEach((seg, k) => {
        const idx = pi * TRAIL.length + k;
        const tt = pulse.t - seg.lag;
        const on = pulse.t >= 0 && tt >= 0;
        tmp.v.copy(from).lerp(to, Math.max(tt, 0)).toArray(pos, idx * 3);
        sizes[idx] = on ? seg.size : 0;
        tmp.c.copy(AMBER).multiplyScalar(seg.glow).toArray(colors, idx * 3);
      });
    });
    geo.attributes.position.needsUpdate = true;
    geo.attributes.aSize.needsUpdate = true;
    geo.attributes.aColor.needsUpdate = true;

    const nodeSize = nodeGeo.attributes.aSize.array as Float32Array;
    const nodeColor = nodeGeo.attributes.aColor.array as Float32Array;
    const decay = Math.exp(-dt * 2.4);
    for (let i = 0; i < n; i++) {
      flash[i] *= decay;
      nodeSize[i] = graph.baseSize[i] * (1 + flash[i] * 1.3);
      tmp.c.fromArray(graph.baseColor, i * 3).lerp(AMBER, flash[i] * 0.85).toArray(nodeColor, i * 3);
    }
    nodeGeo.attributes.aSize.needsUpdate = true;
    nodeGeo.attributes.aColor.needsUpdate = true;

    graph.tools.forEach((nodeIdx, i) => {
      const el = labels.current[i];
      if (!el) return;
      tmp.v.copy(graph.points[nodeIdx]).applyMatrix4(inner.current.matrixWorld);
      const depth = tmp.v.distanceTo(state.camera.position);
      el.style.opacity = String(THREE.MathUtils.clamp(1.2 - (depth - 5.6) / 4.2, 0.1, 0.8));
    });
  });

  const wide = size.width >= 900;
  void camera;

  return (
    <group ref={outer} position={wide ? [2.35, 0.05, 0] : [0, 2.15, -1.6]} scale={wide ? 0.95 : 0.7}>
      <group ref={inner}>
        <lineSegments geometry={edgeGeo}>
          <lineBasicMaterial color="#3a404c" transparent opacity={0.55} depthWrite={false} />
        </lineSegments>
        <lineSegments geometry={spokeGeo}>
          <lineBasicMaterial color="#ffb35c" transparent opacity={0.28} depthWrite={false} />
        </lineSegments>
        <points geometry={nodeGeo} material={material} />
        <points geometry={sim.geo} material={material} />
        <mesh ref={ring1} rotation={[Math.PI / 2.3, 0, 0]}>
          <torusGeometry args={[0.36, 0.004, 6, 128]} />
          <meshBasicMaterial color="#ffb35c" transparent opacity={0.55} />
        </mesh>
        <mesh ref={ring2} rotation={[0.3, 0.9, 0]}>
          <torusGeometry args={[0.55, 0.003, 6, 128]} />
          <meshBasicMaterial color="#e8e6e1" transparent opacity={0.16} />
        </mesh>
        <mesh>
          <icosahedronGeometry args={[0.19, 1]} />
          <meshBasicMaterial color="#ffb35c" wireframe transparent opacity={0.4} />
        </mesh>
        {wide &&
          graph.tools.map((nodeIdx, i) => {
            const p = graph.points[nodeIdx];
            return (
              <Html key={TOOLS[i]} position={[p.x, p.y + 0.16, p.z]} center zIndexRange={[5, 0]} style={{ pointerEvents: "none" }}>
                <span
                  ref={(el) => {
                    labels.current[i] = el;
                  }}
                  className="block whitespace-nowrap font-mono text-[10px] tracking-[0.12em] text-[#c9c7c2] uppercase"
                >
                  {TOOLS[i]}
                </span>
              </Html>
            );
          })}
      </group>
    </group>
  );
}

export default function HeroScene({ active, animate }: { active: boolean; animate: boolean }) {
  const [ready, setReady] = useState(false);
  const pointer = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  return (
    <Canvas
      className={`transition-opacity duration-[1600ms] ease-out ${ready ? "opacity-100" : "opacity-0"}`}
      frameloop={active && animate ? "always" : "demand"}
      dpr={[1, 1.75]}
      camera={{ position: [0, 0, 8], fov: 45 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      onCreated={() => setReady(true)}
    >
      <fog attach="fog" args={["#08090b", 6.6, 12.5]} />
      <Network animate={animate} pointer={pointer} />
    </Canvas>
  );
}
