/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DCMotor3D — Mabuchi 130 Hobby DC Motor with Three.js (Procedural DeepSeek R1 Math).
 * Features:
 * - Genuine Mabuchi 130 DC Motor (Image 3):
 *   * Flat-sided oval steel can via RoundedBoxGeometry with brushed metallic finish
 *   * Front circular brass bearing boss and 4 front ventilation cutouts
 *   * Side stamped retaining notches on can flanks
 *   * Hardened steel drive shaft with rounded tip
 *   * Rear off-white polymer end-bell with copper solder terminal tabs
 *   * Optional 12-tooth brass spur pinion gear & cooling propeller (hasFan)
 * - Real-time physical rotation proportional to RPM & electrical polarity
 * - Subtle vibration shake when operating under high dyno load
 * - Interactive 3D drag-to-inspect
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

interface DCMotor3DProps {
  rpm: number;
  isRunning?: boolean;
  voltage?: number;
  direction?: 1 | -1;
  hasFan?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const DCMotor3D: React.FC<DCMotor3DProps> = ({
  rpm,
  isRunning = true,
  voltage = 3.0,
  direction = 1,
  hasFan = false,
  size = 'md',
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rotorGroupRef = useRef<THREE.Group | null>(null);
  const rootGroupRef = useRef<THREE.Group | null>(null);
  const sparkParticlesRef = useRef<THREE.Points | null>(null);

  const rpmRef = useRef<number>(rpm);
  const isRunningRef = useRef<boolean>(isRunning);
  const directionRef = useRef<1 | -1>(direction);

  useEffect(() => {
    rpmRef.current = rpm;
    isRunningRef.current = isRunning;
    directionRef.current = direction;
  }, [rpm, isRunning, direction]);

  const isDraggingRef = useRef<boolean>(false);
  const previousPointerXRef = useRef<number>(0);
  const previousPointerYRef = useRef<number>(0);
  const manualRotXRef = useRef<number>(0.25);
  const manualRotYRef = useRef<number>(-0.45);

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

    const width = container.clientWidth || 200;
    const height = container.clientHeight || 150;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 1.1, 3.2);
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

    const cyanRim = new THREE.DirectionalLight(0x38bdf8, 2.2);
    cyanRim.position.set(-3, 2, -2);
    scene.add(cyanRim);

    const fillLight = new THREE.AmbientLight(0x334155, 1.4);
    scene.add(fillLight);

    const brushGlowLight = new THREE.PointLight(0x38bdf8, 0, 2);
    brushGlowLight.position.set(0, 0, -0.8);
    scene.add(brushGlowLight);

    // 4. Materials (PBR calibrated by DeepSeek R1)
    const matSteel = new THREE.MeshStandardMaterial({
      color: 0xd4d4d8,
      metalness: 0.92,
      roughness: 0.30,
    });

    const matBrass = new THREE.MeshStandardMaterial({
      color: 0xb08d57,
      metalness: 0.95,
      roughness: 0.28,
    });

    const matShaft = new THREE.MeshStandardMaterial({
      color: 0xe8e8ec,
      metalness: 0.95,
      roughness: 0.12,
    });

    const matPlastic = new THREE.MeshStandardMaterial({
      color: 0xe4e4e7, // Off-white polymer end-bell
      roughness: 0.85,
      metalness: 0.05,
    });

    const matDark = new THREE.MeshStandardMaterial({
      color: 0x0a0a0a,
      roughness: 0.90,
      metalness: 0.20,
    });

    const matCopper = new THREE.MeshStandardMaterial({
      color: 0xb87333,
      metalness: 0.95,
      roughness: 0.35,
    });

    const redPropMat = new THREE.MeshStandardMaterial({
      color: 0xe11d48,
      metalness: 0.25,
      roughness: 0.35,
    });

    // 5. Root Motor Group
    const rootGroup = new THREE.Group();
    rootGroupRef.current = rootGroup;
    scene.add(rootGroup);

    /* ── A. Flat-Sided Oval Steel Can (DeepSeek R1 RoundedBox) ── */
    // Mabuchi 130 dimensions: width 1.35, height 1.00, length 1.60
    const canGeo = new RoundedBoxGeometry(1.35, 1.00, 1.60, 4, 0.24);
    const canMesh = new THREE.Mesh(canGeo, matSteel);
    rootGroup.add(canMesh);

    /* ── B. Front Bearing Boss (Brass bushing on +Z face) ───── */
    const bossGeo = new THREE.CylinderGeometry(0.24, 0.28, 0.20, 28);
    const bossMesh = new THREE.Mesh(bossGeo, matBrass);
    bossMesh.rotation.x = Math.PI / 2;
    bossMesh.position.z = 0.80 + 0.10;
    rootGroup.add(bossMesh);

    /* ── C. Front Vent Holes (4 radial slots around boss) ────── */
    for (let i = 0; i < 4; i++) {
      const a = Math.PI / 4 + i * (Math.PI / 2);
      const holeGeo = new THREE.CylinderGeometry(0.048, 0.048, 0.08, 12);
      const holeMesh = new THREE.Mesh(holeGeo, matDark);
      holeMesh.rotation.x = Math.PI / 2;
      holeMesh.position.set(Math.cos(a) * 0.44, Math.sin(a) * 0.34, 0.79);
      rootGroup.add(holeMesh);
    }

    /* ── D. Side Retaining Notches (Stamped can flanks) ──────── */
    for (const s of [-1, 1]) {
      const notchGeo = new THREE.BoxGeometry(0.025, 0.18, 0.36);
      const notchMesh = new THREE.Mesh(notchGeo, matDark);
      notchMesh.position.set(s * 0.68, 0.0, 0.48);
      rootGroup.add(notchMesh);
    }

    /* ── E. Rear Plastic End-Bell ───────────────────────────── */
    const bellGeo = new RoundedBoxGeometry(1.30, 0.94, 0.20, 3, 0.16);
    const bellMesh = new THREE.Mesh(bellGeo, matPlastic);
    bellMesh.position.z = -0.80 - 0.08;
    rootGroup.add(bellMesh);

    const centerBlock = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.24, 0.10), matPlastic);
    centerBlock.position.set(0, 0.14, -0.96);
    rootGroup.add(centerBlock);

    /* ── F. Copper Solder Terminals (Rear solder tabs) ───────── */
    for (const x of [-0.32, 0.32]) {
      const tabGeo = new THREE.BoxGeometry(0.16, 0.045, 0.34);
      const tab = new THREE.Mesh(tabGeo, matCopper);
      tab.position.set(x, 0.14, -1.08);
      rootGroup.add(tab);

      const bendGeo = new THREE.BoxGeometry(0.16, 0.12, 0.045);
      const bend = new THREE.Mesh(bendGeo, matCopper);
      bend.position.set(x, 0.08, -1.24);
      rootGroup.add(bend);
    }

    /* ── G. Rotating Rotor (Drive Shaft + Optional Fan/Gear) ─── */
    const rotorGroup = new THREE.Group();
    rotorGroup.position.z = 0.90;
    rotorGroupRef.current = rotorGroup;
    rootGroup.add(rotorGroup);

    // Hardened steel drive shaft
    const shaftGeo = new THREE.CylinderGeometry(0.065, 0.065, 1.05, 16);
    const shaftMesh = new THREE.Mesh(shaftGeo, matShaft);
    shaftMesh.rotation.x = Math.PI / 2;
    shaftMesh.position.z = 0.525;
    rotorGroup.add(shaftMesh);

    const shaftTipGeo = new THREE.SphereGeometry(0.065, 12, 10);
    const shaftTip = new THREE.Mesh(shaftTipGeo, matShaft);
    shaftTip.position.z = 1.05;
    rotorGroup.add(shaftTip);

    // Optional 12-tooth brass spur pinion gear or propeller fan
    if (hasFan) {
      // Brass spur pinion
      const gearGeo = new THREE.CylinderGeometry(0.20, 0.20, 0.14, 12);
      const gearMesh = new THREE.Mesh(gearGeo, matBrass);
      gearMesh.rotation.x = Math.PI / 2;
      gearMesh.position.z = 0.35;
      rotorGroup.add(gearMesh);

      // Red cooling fan propeller
      const fanHub = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.10, 0.12, 16), redPropMat);
      fanHub.rotation.x = Math.PI / 2;
      fanHub.position.z = 0.65;
      rotorGroup.add(fanHub);

      for (let i = 0; i < 3; i++) {
        const bladeGeo = new THREE.BoxGeometry(0.48, 0.02, 0.14);
        const blade = new THREE.Mesh(bladeGeo, redPropMat);
        blade.position.z = 0.65;
        blade.rotation.z = (i * Math.PI * 2) / 3;
        blade.rotation.x = 0.35; // Blade pitch angle
        rotorGroup.add(blade);
      }
    }

    // 6. Commutator Micro-Sparks Particles
    const sparkCount = 12;
    const sparkGeo = new THREE.BufferGeometry();
    const sparkPos = new Float32Array(sparkCount * 3);
    for (let i = 0; i < sparkCount * 3; i += 3) {
      sparkPos[i] = (Math.random() - 0.5) * 0.3;
      sparkPos[i + 1] = (Math.random() - 0.5) * 0.3;
      sparkPos[i + 2] = -0.85 + (Math.random() - 0.5) * 0.15;
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
    rootGroup.add(sparkPoints);

    // 7. Animation Loop
    let animId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const dt = clock.getDelta();

      // Manual 3D rotation damping
      if (rootGroupRef.current) {
        rootGroupRef.current.rotation.y += (manualRotYRef.current - rootGroupRef.current.rotation.y) * 0.1;
        rootGroupRef.current.rotation.x += (manualRotXRef.current - rootGroupRef.current.rotation.x) * 0.1;
      }

      // Motor shaft rotation (rad/s = RPM * 2*pi / 60)
      if (rotorGroupRef.current) {
        if (isRunningRef.current && Math.abs(rpmRef.current) > 1) {
          const radPerSec = (rpmRef.current * (2 * Math.PI)) / 60;
          rotorGroupRef.current.rotation.z += radPerSec * directionRef.current * dt;

          // Subtle physical motor vibration under load
          const vibIntensity = Math.min(0.015, (Math.abs(rpmRef.current) / 12000) * 0.012);
          if (rootGroupRef.current) {
            rootGroupRef.current.position.x = (Math.random() - 0.5) * vibIntensity;
            rootGroupRef.current.position.y = (Math.random() - 0.5) * vibIntensity;
          }

          // Commutator spark flickering
          if (sparkParticlesRef.current) {
            (sparkParticlesRef.current.material as THREE.PointsMaterial).opacity =
              Math.random() > 0.6 ? 0.7 : 0.1;
          }
        } else {
          if (rootGroupRef.current) {
            rootGroupRef.current.position.set(0, 0, 0);
          }
          if (sparkParticlesRef.current) {
            (sparkParticlesRef.current.material as THREE.PointsMaterial).opacity = 0;
          }
        }
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
      canGeo.dispose();
      bossGeo.dispose();
      bellGeo.dispose();
      shaftGeo.dispose();
      shaftTipGeo.dispose();
      sparkGeo.dispose();
      scene.clear();
    };
  }, [hasFan, voltage]);

  const heightClass = size === 'sm' ? 'h-28' : size === 'lg' ? 'h-48' : 'h-36';

  return (
    <div
      className={`relative rounded-xl overflow-hidden select-none transition-transform duration-200 ${heightClass} ${
        isHovered ? 'scale-[1.02]' : ''
      } ${className}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title="มอเตอร์ Mabuchi 130 DC 3 มิติ (ลากหมุนเพื่อตรวจ 360°)"
    >
      <div ref={containerRef} className="w-full h-full" />

      {/* Floating Status Pill */}
      <div className="absolute top-2 left-2 pointer-events-none flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-950/80 backdrop-blur-sm border border-slate-700/60 text-[10px] font-bold">
        <span
          className={`w-2.5 h-2.5 rounded-full ${
            isRunning && Math.abs(rpm) > 10
              ? 'bg-cyan-400 animate-pulse shadow-[0_0_8px_#38bdf8]'
              : 'bg-slate-600'
          }`}
        />
        <span className={isRunning && Math.abs(rpm) > 10 ? 'text-cyan-300 font-mono' : 'text-slate-400 font-mono'}>
          {isRunning && Math.abs(rpm) > 10
            ? `${(Math.abs(rpm) * direction).toFixed(0)} RPM ${direction === 1 ? 'CW' : 'CCW'}`
            : 'หยุดนิ่ง (0 RPM)'}
        </span>
      </div>

      <div className="absolute bottom-1 right-2 pointer-events-none text-[9px] font-mono text-slate-400 bg-slate-950/70 px-1.5 py-0.5 rounded">
        Mabuchi 130 DC · {voltage}V · ลากหมุน 3D
      </div>
    </div>
  );
};
