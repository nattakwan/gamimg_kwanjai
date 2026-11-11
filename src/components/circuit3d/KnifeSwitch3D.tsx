/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * KnifeSwitch3D (ToggleSwitch3D) — Industrial Heavy-Duty Toggle Switch with Three.js (Procedural DeepSeek R1 Math).
 * Features:
 * - Industrial Heavy-Duty Toggle Switch on Labeled Plate (Image 5):
 *   * Matte dark rectangular base enclosure (RoundedBoxGeometry)
 *   * Beveled mounting plate with corner screw holes & slotted chrome screws
 *   * Left side: matte dark surface embossed with 'OFF'
 *   * Right side: slightly raised bold red plate with crisp white 'ON'
 *   * Central lathe-rippled threaded collar with hexagonal locking nut
 *   * Glowing blue LED indicator ring (illuminates bright cyan when ON)
 *   * Polished chrome bat toggle lever pivoting ±28° with smooth kinematic damping
 * - Electrical spark burst on state transition
 * - Interactive pointer click to toggle + drag to inspect 3D rotation
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

interface KnifeSwitch3DProps {
  isClosed: boolean;
  isActive?: boolean;
  isShortCircuit?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onToggle?: () => void;
  className?: string;
}

const D2R = (deg: number) => (deg * Math.PI) / 180;

export const KnifeSwitch3D: React.FC<KnifeSwitch3DProps> = ({
  isClosed,
  isActive = false,
  isShortCircuit = false,
  size = 'md',
  onToggle,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const leverPivotRef = useRef<THREE.Group | null>(null);
  const sparkParticlesRef = useRef<THREE.Points | null>(null);
  const ledRingRef = useRef<THREE.Mesh | null>(null);
  const rootGroupRef = useRef<THREE.Group | null>(null);

  const isClosedRef = useRef<boolean>(isClosed);
  useEffect(() => {
    isClosedRef.current = isClosed;
  }, [isClosed]);

  const isDraggingRef = useRef<boolean>(false);
  const previousPointerXRef = useRef<number>(0);
  const previousPointerYRef = useRef<number>(0);
  const manualRotXRef = useRef<number>(0.35);
  const manualRotYRef = useRef<number>(-0.35);

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

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 160;
    const height = container.clientHeight || 120;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 1.8, 3.2);
    camera.lookAt(0, 0.5, 0);

    // 2. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    container.appendChild(renderer.domElement);

    // 3. Lighting
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.4);
    keyLight.position.set(2, 4, 3);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 2.2);
    rimLight.position.set(-3, 2, -2);
    scene.add(rimLight);

    const ambientLight = new THREE.AmbientLight(0x334155, 1.4);
    scene.add(ambientLight);

    // 4. Materials (PBR calibrated by DeepSeek R1)
    const matBody = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.78,
      metalness: 0.05,
    });

    const matPlate = new THREE.MeshStandardMaterial({
      color: 0xc9ccd4,
      metalness: 0.95,
      roughness: 0.28,
    });

    const matChrome = new THREE.MeshStandardMaterial({
      color: 0xf2f2f6,
      metalness: 1.0,
      roughness: 0.08,
    });

    const matRed = new THREE.MeshStandardMaterial({
      color: 0xdc2626,
      roughness: 0.45,
      metalness: 0.05,
    });

    const matDark = new THREE.MeshStandardMaterial({
      color: 0x0b1220,
      roughness: 0.65,
      metalness: 0.05,
    });

    const matLED = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x38bdf8,
      emissiveIntensity: isClosed ? 3.5 : 0.15,
      roughness: 0.2,
      metalness: 0.0,
      toneMapped: false,
    });

    // 5. Root Switch Group
    const rootGroup = new THREE.Group();
    rootGroupRef.current = rootGroup;
    scene.add(rootGroup);

    // Scaling to fit workbench scene
    const scale = 0.65;
    const switchGroup = new THREE.Group();
    switchGroup.scale.setScalar(scale);
    switchGroup.position.y = -0.4;
    rootGroup.add(switchGroup);

    /* ── A. Base Enclosure (DeepSeek R1 RoundedBox) ──────────── */
    const baseGeo = new RoundedBoxGeometry(2.8, 1.2, 1.4, 3, 0.10);
    const baseMesh = new THREE.Mesh(baseGeo, matBody);
    baseMesh.position.y = 0.60;
    switchGroup.add(baseMesh);

    /* ── B. Mounting Plate (Beveled Steel Faceplate) ─────────── */
    const plateGeo = new RoundedBoxGeometry(2.9, 0.16, 1.5, 2, 0.06);
    const plateMesh = new THREE.Mesh(plateGeo, matPlate);
    plateMesh.position.y = 1.28; // Top face at y = 1.36
    switchGroup.add(plateMesh);

    /* ── C. 'OFF' Matte Panel (Left) ────────────────────────── */
    const offCanvas = document.createElement('canvas');
    offCanvas.width = 512;
    offCanvas.height = 512;
    const offCtx = offCanvas.getContext('2d')!;
    offCtx.fillStyle = '#0b1220';
    offCtx.fillRect(0, 0, 512, 512);
    offCtx.fillStyle = '#94a3b8';
    offCtx.font = '900 170px Arial, sans-serif';
    offCtx.textAlign = 'center';
    offCtx.textBaseline = 'middle';
    offCtx.fillText('OFF', 256, 256);
    const offTex = new THREE.CanvasTexture(offCanvas);

    const offPanelGeo = new THREE.PlaneGeometry(0.90, 0.90);
    const offPanelMat = new THREE.MeshStandardMaterial({
      map: offTex,
      transparent: true,
      roughness: 0.6,
      depthWrite: false,
    });
    const offPanel = new THREE.Mesh(offPanelGeo, offPanelMat);
    offPanel.rotation.x = -Math.PI / 2;
    offPanel.position.set(-0.78, 1.365, 0);
    switchGroup.add(offPanel);

    /* ── D. 'ON' Bold Red Plate (Right, Slightly Raised) ─────── */
    const redPlateGeo = new RoundedBoxGeometry(0.95, 0.06, 0.95, 2, 0.03);
    const redPlate = new THREE.Mesh(redPlateGeo, matRed);
    redPlate.position.set(0.78, 1.39, 0);
    switchGroup.add(redPlate);

    const onCanvas = document.createElement('canvas');
    onCanvas.width = 512;
    onCanvas.height = 512;
    const onCtx = onCanvas.getContext('2d')!;
    onCtx.fillStyle = '#dc2626';
    onCtx.fillRect(0, 0, 512, 512);
    onCtx.fillStyle = '#ffffff';
    onCtx.font = '900 220px Arial, sans-serif';
    onCtx.textAlign = 'center';
    onCtx.textBaseline = 'middle';
    onCtx.fillText('ON', 256, 256);
    const onTex = new THREE.CanvasTexture(onCanvas);

    const onPanelGeo = new THREE.PlaneGeometry(0.90, 0.90);
    const onPanelMat = new THREE.MeshStandardMaterial({
      map: onTex,
      transparent: true,
      roughness: 0.45,
      depthWrite: false,
    });
    const onPanel = new THREE.Mesh(onPanelGeo, onPanelMat);
    onPanel.rotation.x = -Math.PI / 2;
    onPanel.position.set(0.78, 1.425, 0);
    switchGroup.add(onPanel);

    /* ── E. Mounting Screws (4 Corners with Slotted Heads) ──── */
    for (const sx of [-1.32, 1.32]) {
      for (const sz of [-0.58, 0.58]) {
        // Dark countersunk ring
        const ringGeo = new THREE.TorusGeometry(0.075, 0.018, 8, 20);
        const ring = new THREE.Mesh(ringGeo, matDark);
        ring.rotation.x = Math.PI / 2;
        ring.position.set(sx, 1.362, sz);
        switchGroup.add(ring);

        // Chrome screw head
        const screwGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.04, 16);
        const screw = new THREE.Mesh(screwGeo, matChrome);
        screw.position.set(sx, 1.375, sz);
        switchGroup.add(screw);

        // Slot indent
        const slotGeo = new THREE.BoxGeometry(0.10, 0.012, 0.022);
        const slot = new THREE.Mesh(slotGeo, matDark);
        slot.position.set(sx, 1.398, sz);
        switchGroup.add(slot);
      }
    }

    /* ── F. Central Threaded Collar + Hex Nut + Glowing LED Ring ── */
    const collarProf: THREE.Vector2[] = [];
    const CY0 = 1.36;
    const CH = 0.40;
    for (let i = 0; i <= 64; i++) {
      const t = i / 64;
      const r = 0.28 + 0.024 * Math.sin(t * Math.PI * 2 * 6);
      const y = CY0 + t * CH;
      collarProf.push(new THREE.Vector2(r, y));
    }
    collarProf.push(new THREE.Vector2(0.30, CY0 + CH + 0.02));
    const collarGeo = new THREE.LatheGeometry(collarProf, 36);
    const collar = new THREE.Mesh(collarGeo, matChrome);
    switchGroup.add(collar);

    const hexNutGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.14, 6);
    const hexNut = new THREE.Mesh(hexNutGeo, matChrome);
    hexNut.position.y = 1.43;
    switchGroup.add(hexNut);

    const ledRingGeo = new THREE.TorusGeometry(0.295, 0.028, 10, 36);
    const ledRing = new THREE.Mesh(ledRingGeo, matLED);
    ledRing.rotation.x = Math.PI / 2;
    ledRing.position.y = 1.775;
    switchGroup.add(ledRing);
    ledRingRef.current = ledRing;

    /* ── G. Bat Lever (Pivot at y = 1.78, Tilting ±28° about Z) ── */
    const leverPivot = new THREE.Group();
    leverPivot.position.set(0, 1.78, 0);
    leverPivotRef.current = leverPivot;
    switchGroup.add(leverPivot);

    const bootGeo = new THREE.CylinderGeometry(0.20, 0.24, 0.10, 24);
    const boot = new THREE.Mesh(bootGeo, matDark);
    boot.position.y = 0.02;
    leverPivot.add(boot);

    const stemGeo = new THREE.CylinderGeometry(0.065, 0.150, 1.05, 24);
    const stem = new THREE.Mesh(stemGeo, matChrome);
    stem.position.y = 0.10 + 0.525;
    leverPivot.add(stem);

    const knobGeo = new THREE.SphereGeometry(0.135, 24, 18);
    const knob = new THREE.Mesh(knobGeo, matChrome);
    knob.position.y = 1.21;
    leverPivot.add(knob);

    // Initial angle: ON = -28° (tilted right toward red plate), OFF = +28° (tilted left toward dark plate)
    leverPivot.rotation.z = isClosed ? -D2R(28) : D2R(28);

    // 6. Micro-Spark Particles on Toggle
    const sparkCount = 14;
    const sparkGeo = new THREE.BufferGeometry();
    const sparkPos = new Float32Array(sparkCount * 3);
    for (let i = 0; i < sparkCount * 3; i += 3) {
      sparkPos[i] = (Math.random() - 0.5) * 0.4;
      sparkPos[i + 1] = 1.78 + (Math.random() - 0.5) * 0.3;
      sparkPos[i + 2] = (Math.random() - 0.5) * 0.4;
    }
    sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
    const sparkMat = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 0.05,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
    });
    const sparkPoints = new THREE.Points(sparkGeo, sparkMat);
    sparkParticlesRef.current = sparkPoints;
    switchGroup.add(sparkPoints);

    // 7. Animation Loop
    let animId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.05);

      // Manual 3D rotation damping
      if (rootGroupRef.current) {
        rootGroupRef.current.rotation.y += (manualRotYRef.current - rootGroupRef.current.rotation.y) * 0.1;
        rootGroupRef.current.rotation.x += (manualRotXRef.current - rootGroupRef.current.rotation.x) * 0.1;
      }

      // Smooth kinematic dampening for bat lever (pivots ±28°)
      if (leverPivotRef.current) {
        const targetZ = isClosedRef.current ? -D2R(28) : D2R(28);
        leverPivotRef.current.rotation.z = THREE.MathUtils.damp(
          leverPivotRef.current.rotation.z,
          targetZ,
          16,
          dt
        );
      }

      // LED Ring emission
      if (ledRingRef.current) {
        const mat = ledRingRef.current.material as THREE.MeshStandardMaterial;
        const targetIntensity = isClosedRef.current ? 3.5 : 0.15;
        mat.emissiveIntensity += (targetIntensity - mat.emissiveIntensity) * 0.2;
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
      baseGeo.dispose();
      plateGeo.dispose();
      redPlateGeo.dispose();
      collarGeo.dispose();
      hexNutGeo.dispose();
      ledRingGeo.dispose();
      bootGeo.dispose();
      stemGeo.dispose();
      knobGeo.dispose();
      offTex.dispose();
      onTex.dispose();
      sparkGeo.dispose();
      scene.clear();
    };
  }, []);

  const heightClass = size === 'sm' ? 'h-24' : size === 'lg' ? 'h-36' : 'h-28';

  return (
    <div
      className={`relative rounded-xl overflow-hidden select-none transition-transform duration-200 cursor-pointer ${heightClass} ${
        isHovered ? 'scale-[1.02]' : ''
      } ${className}`}
      onClick={onToggle}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title="สวิตซ์อุตสาหกรรมแบบก้านโยก 3 มิติ (คลิกเพื่อเปิด/ปิด · ลากเพื่อหมุน 360°)"
    >
      <div ref={containerRef} className="w-full h-full" />

      {/* Floating Status Pill */}
      <div className="absolute top-1.5 left-2 pointer-events-none flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-950/80 backdrop-blur-sm border border-slate-700/60 text-[10px] font-bold">
        <span
          className={`w-2 h-2 rounded-full ${
            isClosed
              ? 'bg-cyan-400 shadow-[0_0_8px_#38bdf8] animate-pulse'
              : 'bg-rose-500'
          }`}
        />
        <span className={isClosed ? 'text-cyan-300' : 'text-slate-400'}>
          {isClosed ? 'วงจรปิด (ON)' : 'วงจรเปิด (OFF)'}
        </span>
      </div>

      <div className="absolute bottom-1 right-2 pointer-events-none text-[9px] font-mono text-slate-400 bg-slate-950/70 px-1.5 py-0.5 rounded">
        คลิกเพื่อสับสวิตช์ · ลากหมุน 3D
      </div>
    </div>
  );
};

// Also export alias ToggleSwitch3D
export const ToggleSwitch3D = KnifeSwitch3D;
