/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DigitalMultimeter3D — Modern Laboratory Digital Multimeter with Three.js (Procedural DeepSeek R1 Math).
 * Features:
 * - Genuine Industrial DMM (Image 6):
 *   * Yellow ergonomic rubber protective holster (vertex-tapered RoundedBoxGeometry)
 *   * Flank side grip ridges
 *   * Large LCD display with 7-segment digital readout (DC, AUTO, voltage/current)
 *   * Central black rotary selector dial with 32 knurled ridges & chrome pointer
 *   * 4 input jack sockets (10A, mA, COM, VΩ) with color-coded accent rings
 *   * Dual test probes (Red & Black) with needle tips & coiled helical test leads plugged into jacks
 * - Interactive 3D drag-to-inspect
 * - Dynamic LCD reading update
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

interface DigitalMultimeter3DProps {
  reading?: string; // e.g. "1.50", "0.00", "8.79", "O.L"
  unit?: string;    // "V", "A", "Ω", etc.
  mode?: 'DCV' | 'ACV' | 'DCA' | 'RES' | 'OFF';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const D2R = (deg: number) => (deg * Math.PI) / 180;

/** Helical coiled test lead between two 3D points */
function createCoiledLead(
  a: THREE.Vector3,
  b: THREE.Vector3,
  color: number,
  turns = 9,
  coilRadius = 0.12,
  tubeRadius = 0.026
): THREE.Mesh {
  const dir = new THREE.Vector3().subVectors(b, a);
  const axis = dir.clone().normalize();
  const ref = Math.abs(axis.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
  const n1 = new THREE.Vector3().crossVectors(axis, ref).normalize();
  const n2 = new THREE.Vector3().crossVectors(axis, n1).normalize();

  const pts: THREE.Vector3[] = [];
  const N = turns * 12;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const ang = t * turns * Math.PI * 2;
    pts.push(
      a.clone()
        .addScaledVector(dir, t)
        .addScaledVector(n1, Math.cos(ang) * coilRadius)
        .addScaledVector(n2, Math.sin(ang) * coilRadius)
    );
  }
  const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.25);
  const geo = new THREE.TubeGeometry(curve, N, tubeRadius, 8, false);
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.0 });
  return new THREE.Mesh(geo, mat);
}

/** Banana plug probe with handle and chrome needle */
function createProbeHandle(color: number): THREE.Group {
  const g = new THREE.Group();
  const matBody = new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.0 });
  const matChrome = new THREE.MeshStandardMaterial({ color: 0xe8e8ec, metalness: 1.0, roughness: 0.12 });

  // Handle body
  const gripGeo = new THREE.CylinderGeometry(0.08, 0.11, 0.95, 20);
  const grip = new THREE.Mesh(gripGeo, matBody);
  grip.position.y = 0.475;
  g.add(grip);

  // Grip ribs
  for (let i = 0; i < 4; i++) {
    const ribGeo = new THREE.TorusGeometry(0.095, 0.010, 8, 20);
    const rib = new THREE.Mesh(ribGeo, new THREE.MeshStandardMaterial({
      color: new THREE.Color(color).multiplyScalar(0.75).getHex(),
      roughness: 0.7,
    }));
    rib.rotation.x = Math.PI / 2;
    rib.position.y = 0.25 + i * 0.16;
    g.add(rib);
  }

  // Safety collar
  const collarGeo = new THREE.CylinderGeometry(0.13, 0.13, 0.06, 20);
  const collar = new THREE.Mesh(collarGeo, matBody);
  collar.position.y = 0.95;
  g.add(collar);

  // Chrome needle tip
  const needleGeo = new THREE.ConeGeometry(0.025, 0.38, 14);
  const needle = new THREE.Mesh(needleGeo, matChrome);
  needle.position.y = 1.17;
  g.add(needle);

  return g;
}

export const DigitalMultimeter3D: React.FC<DigitalMultimeter3DProps> = ({
  reading = '0.00',
  unit = 'V',
  mode = 'DCV',
  size = 'md',
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rootGroupRef = useRef<THREE.Group | null>(null);
  const lcdMeshRef = useRef<THREE.Mesh | null>(null);
  const dialRef = useRef<THREE.Mesh | null>(null);

  const isDraggingRef = useRef<boolean>(false);
  const previousPointerXRef = useRef<number>(0);
  const previousPointerYRef = useRef<number>(0);
  const manualRotXRef = useRef<number>(0.2);
  const manualRotYRef = useRef<number>(-0.3);

  const [isHovered, setIsHovered] = useState<boolean>(false);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    isDraggingRef.current = true;
    previousPointerXRef.current = e.clientX;
    previousPointerYRef.current = e.clientY;
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const deltaX = e.clientX - previousPointerXRef.current;
    const deltaY = e.clientY - previousPointerYRef.current;
    previousPointerXRef.current = e.clientX;
    previousPointerYRef.current = e.clientY;

    manualRotYRef.current += deltaX * 0.015;
    manualRotXRef.current = Math.max(-0.6, Math.min(0.6, manualRotXRef.current + deltaY * 0.015));
  }, []);

  const handlePointerUp = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  // Update LCD canvas texture when reading changes
  const updateLcdTexture = useCallback((val: string, u: string, m: string) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // LCD Greenish-grey backlight
    ctx.fillStyle = '#c3cfba';
    ctx.fillRect(0, 0, 1024, 512);

    // Faint 7-segment ghosting background
    ctx.fillStyle = 'rgba(25, 40, 25, 0.08)';
    ctx.font = 'bold 280px "Courier New", monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText('-88.88', 1024 - 240, 256 + 15);

    // Active digital reading
    ctx.fillStyle = '#16241a';
    ctx.font = 'bold 280px "Courier New", monospace';
    ctx.fillText(m === 'OFF' ? '' : val, 1024 - 240, 256 + 15);

    // Unit symbol
    ctx.font = 'bold 130px "Courier New", monospace';
    ctx.fillText(m === 'OFF' ? '' : u, 1024 - 80, 256 + 55);

    // Status annunciator indicators
    ctx.font = 'bold 50px Arial, sans-serif';
    ctx.fillStyle = '#2f4030';
    ctx.textAlign = 'left';
    ctx.fillText('DC', 60, 80);
    ctx.fillText('AUTO', 60, 512 - 60);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 200;
    const height = container.clientHeight || 180;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 0.8, 5.0);
    camera.lookAt(0, 0, 0);

    // 2. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    container.appendChild(renderer.domElement);

    // 3. Lighting
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.4);
    keyLight.position.set(3, 4, 3);
    scene.add(keyLight);

    const blueRim = new THREE.DirectionalLight(0x38bdf8, 2.0);
    blueRim.position.set(-3, 2, -2);
    scene.add(blueRim);

    const fillLight = new THREE.AmbientLight(0x334155, 1.4);
    scene.add(fillLight);

    // 4. Materials
    const matYellow = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.72, metalness: 0.02 });
    const matYellowDark = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.75, metalness: 0.02 });
    const matBlack = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.60, metalness: 0.1 });
    const matBezel = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.45, metalness: 0.15 });
    const matChrome = new THREE.MeshStandardMaterial({ color: 0xd6d6dc, metalness: 1.0, roughness: 0.20 });

    // 5. Root Group
    const rootGroup = new THREE.Group();
    rootGroupRef.current = rootGroup;
    scene.add(rootGroup);

    const meterScale = 0.62;
    const meterGroup = new THREE.Group();
    meterGroup.scale.setScalar(meterScale);
    rootGroup.add(meterGroup);

    const W = 2.2;
    const H = 3.6;
    const D = 0.9;
    const FRONT = D / 2; // 0.45

    /* ── A. Ergonomic Yellow Holster (Vertex-Tapered RoundedBox) ── */
    const holsterGeo = new RoundedBoxGeometry(W, H, D, 6, 0.26);
    {
      const pos = holsterGeo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i);
        const t = y / (H / 2);
        pos.setX(i, pos.getX(i) * (1 + 0.045 * t));
        pos.setZ(i, pos.getZ(i) * (1 - 0.03 * t));
      }
      holsterGeo.computeVertexNormals();
    }
    const holster = new THREE.Mesh(holsterGeo, matYellow);
    meterGroup.add(holster);

    /* ── B. Side Grip Ridges ─────────────────────────────────── */
    for (const s of [-1, 1]) {
      for (let i = 0; i < 5; i++) {
        const grooveGeo = new RoundedBoxGeometry(0.05, 0.07, 0.56, 2, 0.025);
        const groove = new THREE.Mesh(grooveGeo, matYellowDark);
        groove.position.set(s * 1.08, -1.05 + i * 0.20, 0);
        meterGroup.add(groove);
      }
    }

    /* ── C. LCD Display ──────────────────────────────────────── */
    const bezelGeo = new RoundedBoxGeometry(1.72, 1.02, 0.12, 2, 0.06);
    const bezel = new THREE.Mesh(bezelGeo, matBezel);
    bezel.position.set(0, 1.10, FRONT - 0.01);
    meterGroup.add(bezel);

    const initialLcdTex = updateLcdTexture(reading, unit, mode);
    const lcdMat = new THREE.MeshStandardMaterial({
      map: initialLcdTex,
      emissive: 0xffffff,
      emissiveMap: initialLcdTex,
      emissiveIntensity: 0.30,
      roughness: 0.22,
      metalness: 0.0,
    });
    const lcd = new THREE.Mesh(new THREE.PlaneGeometry(1.54, 0.84), lcdMat);
    lcd.position.set(0, 1.10, FRONT + 0.055);
    meterGroup.add(lcd);
    lcdMeshRef.current = lcd;

    /* ── D. Rotary Selector Dial ─────────────────────────────── */
    const DIAL_Y = -0.45;
    const dialGeo = new THREE.CylinderGeometry(0.60, 0.62, 0.22, 40);
    const dial = new THREE.Mesh(dialGeo, matBlack);
    dial.rotation.x = Math.PI / 2;
    dial.position.set(0, DIAL_Y, FRONT + 0.04);
    meterGroup.add(dial);
    dialRef.current = dial;

    // 32 Knurled Grips on dial rim
    for (let i = 0; i < 32; i++) {
      const a = (i / 32) * Math.PI * 2;
      const knurlGeo = new THREE.BoxGeometry(0.035, 0.035, 0.20);
      const knurl = new THREE.Mesh(knurlGeo, matBlack);
      knurl.position.set(Math.cos(a) * 0.605, Math.sin(a) * 0.605 + DIAL_Y, FRONT + 0.04);
      knurl.rotation.z = a;
      meterGroup.add(knurl);
    }

    // Chrome Pointer Notch
    const pointerGeo = new THREE.ConeGeometry(0.055, 0.20, 3);
    const pointer = new THREE.Mesh(pointerGeo, matChrome);
    pointer.position.set(0, DIAL_Y + 0.42, FRONT + 0.17);
    meterGroup.add(pointer);

    // Range markings around dial
    const ranges = [
      { text: 'OFF', a: 220 },
      { text: 'V=', a: 175 },
      { text: 'V~', a: 130 },
      { text: 'mA', a: 85 },
      { text: 'Ω', a: 40 },
    ];
    for (const r of ranges) {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 160;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 96px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(r.text, 128, 80);
      const tex = new THREE.CanvasTexture(canvas);

      const lbl = new THREE.Mesh(
        new THREE.PlaneGeometry(0.30, 0.19),
        new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false })
      );
      const rad = D2R(r.a);
      lbl.position.set(Math.cos(rad) * 0.86, DIAL_Y + Math.sin(rad) * 0.86, FRONT + 0.012);
      meterGroup.add(lbl);
    }

    /* ── E. 4 Input Jack Sockets ─────────────────────────────── */
    const JACK_Y = -1.52;
    const jacks = [
      { x: -0.70, label: '10A', color: 0xef4444 },
      { x: -0.24, label: 'mA', color: 0x18181b },
      { x: 0.24, label: 'COM', color: 0x18181b },
      { x: 0.70, label: 'VΩ', color: 0xef4444 },
    ];
    for (const j of jacks) {
      const ringGeo = new THREE.CylinderGeometry(0.175, 0.175, 0.07, 24);
      const ring = new THREE.Mesh(ringGeo, matBlack);
      ring.rotation.x = Math.PI / 2;
      ring.position.set(j.x, JACK_Y, FRONT + 0.01);
      meterGroup.add(ring);

      const boreGeo = new THREE.CylinderGeometry(0.105, 0.105, 0.10, 20);
      const bore = new THREE.Mesh(boreGeo, new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 1.0 }));
      bore.rotation.x = Math.PI / 2;
      bore.position.set(j.x, JACK_Y, FRONT - 0.01);
      meterGroup.add(bore);

      const accentGeo = new THREE.TorusGeometry(0.135, 0.018, 8, 24);
      const accent = new THREE.Mesh(accentGeo, new THREE.MeshStandardMaterial({ color: j.color, roughness: 0.45 }));
      accent.position.set(j.x, JACK_Y, FRONT + 0.05);
      meterGroup.add(accent);
    }

    /* ── F. Dual Test Probes + Helical Coiled Leads ──────────── */
    const jackRedPos = new THREE.Vector3(0.70, JACK_Y, FRONT + 0.06);
    const jackBlackPos = new THREE.Vector3(0.24, JACK_Y, FRONT + 0.06);

    // Red Probe
    const redProbe = createProbeHandle(0xef4444);
    redProbe.position.set(1.55, -1.62, 1.20);
    redProbe.rotation.set(-0.42, -0.25, 0.06);
    meterGroup.add(redProbe);

    const redLead = createCoiledLead(jackRedPos, redProbe.position.clone().setY(-1.60), 0xef4444, 9, 0.14);
    meterGroup.add(redLead);

    // Black Probe
    const blackProbe = createProbeHandle(0x18181b);
    blackProbe.position.set(-1.55, -1.62, 1.20);
    blackProbe.rotation.set(-0.42, 0.25, -0.06);
    meterGroup.add(blackProbe);

    const blackLead = createCoiledLead(jackBlackPos, blackProbe.position.clone().setY(-1.60), 0x18181b, 8, 0.14);
    meterGroup.add(blackLead);

    // 6. Animation Loop
    let animId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Manual 3D rotation damping
      if (rootGroupRef.current) {
        rootGroupRef.current.rotation.y += (manualRotYRef.current - rootGroupRef.current.rotation.y) * 0.1;
        rootGroupRef.current.rotation.x += (manualRotXRef.current - rootGroupRef.current.rotation.x) * 0.1;
      }

      renderer.render(scene, camera);
    };

    animate();

    const resizeObserver = new ResizeObserver(() => {
      if (!container) return;
      const nw = container.clientWidth;
      const nh = container.clientHeight;
      if (nw === 0 || nh === 0) return;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    });
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      renderer.dispose();
      holsterGeo.dispose();
      bezelGeo.dispose();
      dialGeo.dispose();
      pointerGeo.dispose();
      scene.clear();
    };
  }, []);

  // Update LCD texture when reading, unit, or mode changes
  useEffect(() => {
    if (lcdMeshRef.current) {
      const newTex = updateLcdTexture(reading, unit, mode);
      const mat = lcdMeshRef.current.material as THREE.MeshStandardMaterial;
      if (mat.map) mat.map.dispose();
      if (mat.emissiveMap) mat.emissiveMap.dispose();
      mat.map = newTex;
      mat.emissiveMap = newTex;
      mat.needsUpdate = true;
    }
  }, [reading, unit, mode, updateLcdTexture]);

  const heightClass = size === 'sm' ? 'h-36' : size === 'lg' ? 'h-64' : 'h-48';

  return (
    <div
      className={`relative rounded-xl overflow-hidden select-none transition-transform duration-200 cursor-grab active:cursor-grabbing ${heightClass} ${
        isHovered ? 'scale-[1.02]' : ''
      } ${className}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title="มัลติมิเตอร์ดิจิทัล 3 มิติ (ลากหมุนเพื่อตรวจ 360°)"
    >
      <div ref={containerRef} className="w-full h-full" />

      {/* Floating Status Badge */}
      <div className="absolute top-2 left-2 pointer-events-none flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-950/85 backdrop-blur-sm border border-slate-700/60 text-[10px] font-bold">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
        <span className="text-emerald-300 font-mono">DMM ACTIVE</span>
      </div>

      <div className="absolute bottom-1 right-2 pointer-events-none text-[9px] font-mono text-slate-400 bg-slate-950/70 px-1.5 py-0.5 rounded">
        ดิจิทัลมัลติมิเตอร์ · ลากหมุน 3D
      </div>
    </div>
  );
};

