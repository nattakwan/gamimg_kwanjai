/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * BatteryCell3D — Modern Stylized 3D Battery Cell with Three.js (Procedural DeepSeek R1 Math).
 * Features:
 * - Dual-tone Real Laboratory AA 1.5V aesthetic:
 *   * Upper 30% Electric Blue (#0284c7) with bold black '+' positive symbol
 *   * Lower 70% Deep Matte Black (#18181b) with clean 'AA 1.5V' decal
 *   * Top Cap: lathe-profile silver beveled ring with circular groove recession & raised nickel nub
 *   * Bottom Terminal: flat circular nickel disc with concentric bevel
 * - Modern high-tech mounting cradle with brass spring contacts
 * - Interactive 3D drag-to-rotate inspection
 * - Smooth 180° flip animation when reversed
 * - Animated electrical spark ions when active
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';

interface BatteryCell3DProps {
  voltage?: number;
  label?: string;
  isReversed?: boolean;
  isActive?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onFlip?: () => void;
  className?: string;
}

export const BatteryCell3D: React.FC<BatteryCell3DProps> = ({
  voltage = 1.5,
  label = 'AA 1.5V',
  isReversed = false,
  isActive = false,
  size = 'md',
  onFlip,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cellGroupRef = useRef<THREE.Group | null>(null);
  const sparkParticlesRef = useRef<THREE.Points | null>(null);
  const glowLightRef = useRef<THREE.PointLight | null>(null);

  const targetRotationZRef = useRef<number>(isReversed ? Math.PI : 0);
  const currentRotationZRef = useRef<number>(isReversed ? Math.PI : 0);
  const isDraggingRef = useRef<boolean>(false);
  const previousPointerXRef = useRef<number>(0);
  const previousPointerYRef = useRef<number>(0);
  const manualRotXRef = useRef<number>(0);
  const manualRotYRef = useRef<number>(0);

  const [isHovered, setIsHovered] = useState<boolean>(false);

  // Sync reversal prop with 3D rotation target
  useEffect(() => {
    targetRotationZRef.current = isReversed ? Math.PI : 0;
  }, [isReversed]);

  // Pointer drag to inspect in 3D
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
    camera.position.set(0, 0.8, 3.2);
    camera.lookAt(0, 0, 0);

    // 2. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    container.appendChild(renderer.domElement);

    // 3. Lighting (Studio Key + Blue Rim + Warm Fill)
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
    keyLight.position.set(2, 3, 3);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 2.2);
    rimLight.position.set(-3, 2, -2);
    scene.add(rimLight);

    const fillLight = new THREE.AmbientLight(0x334155, 1.2);
    scene.add(fillLight);

    const glowLight = new THREE.PointLight(0x0284c7, 0, 3);
    glowLight.position.set(0, 0, 0.5);
    scene.add(glowLight);
    glowLightRef.current = glowLight;

    // 4. Materials (PBR calibrated by DeepSeek R1)
    const matNickel = new THREE.MeshStandardMaterial({
      color: 0xd9d9e0,
      metalness: 1.0,
      roughness: 0.18,
    });

    const matBrass = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.9,
      roughness: 0.25,
    });

    const matBlue = new THREE.MeshStandardMaterial({
      color: 0x0284c7, // Electric blue (upper 30%)
      metalness: 0.05,
      roughness: 0.30,
    });

    const matBlack = new THREE.MeshStandardMaterial({
      color: 0x18181b, // Deep matte black (lower 70%)
      metalness: 0.0,
      roughness: 0.80,
    });

    // 5. Battery Mesh Group
    const cellGroup = new THREE.Group();
    cellGroupRef.current = cellGroup;

    // Orientation: lay horizontally along X-axis
    const horizontalGroup = new THREE.Group();
    horizontalGroup.rotation.z = Math.PI / 2;

    const cellRadius = 0.38;
    const cellLength = 1.35;

    // A. Lower Matte Black Jacket (70% of body)
    const lowerHeight = cellLength * 0.70;
    const lowerGeo = new THREE.CylinderGeometry(cellRadius, cellRadius, lowerHeight, 48, 1);
    const lowerMesh = new THREE.Mesh(lowerGeo, matBlack);
    lowerMesh.position.y = -cellLength * 0.15;
    horizontalGroup.add(lowerMesh);

    // B. Upper Electric Blue Jacket (30% of body)
    const upperHeight = cellLength * 0.30;
    const upperGeo = new THREE.CylinderGeometry(cellRadius, cellRadius, upperHeight, 48, 1);
    const upperMesh = new THREE.Mesh(upperGeo, matBlue);
    upperMesh.position.y = cellLength * 0.35;
    horizontalGroup.add(upperMesh);

    // C. Seam Ring at Colour Boundary
    const seamGeo = new THREE.TorusGeometry(cellRadius + 0.002, 0.008, 8, 48);
    const seamMesh = new THREE.Mesh(seamGeo, matBlack);
    seamMesh.rotation.x = Math.PI / 2;
    seamMesh.position.y = cellLength * 0.20;
    horizontalGroup.add(seamMesh);

    // D. Bottom Negative Contact Nickel Plate
    const botPlateGeo = new THREE.CylinderGeometry(cellRadius, cellRadius - 0.02, 0.03, 48);
    const botPlate = new THREE.Mesh(botPlateGeo, matNickel);
    botPlate.position.y = -cellLength / 2 - 0.015;
    horizontalGroup.add(botPlate);

    const botPlateRingGeo = new THREE.TorusGeometry(cellRadius * 0.75, 0.01, 8, 36);
    const botPlateRing = new THREE.Mesh(botPlateRingGeo, matNickel);
    botPlateRing.rotation.x = Math.PI / 2;
    botPlateRing.position.y = -cellLength / 2 - 0.028;
    horizontalGroup.add(botPlateRing);

    // E. Top Cap: Beveled Ring + Circular Groove + Raised Nickel Nub (DeepSeek R1 Lathe Math)
    const capProfile = [
      new THREE.Vector2(0.380, 0.000),
      new THREE.Vector2(0.388, 0.016),
      new THREE.Vector2(0.388, 0.050),
      new THREE.Vector2(0.369, 0.082),
      new THREE.Vector2(0.295, 0.095),
      new THREE.Vector2(0.275, 0.083),
      new THREE.Vector2(0.256, 0.055), // recessed groove valley
      new THREE.Vector2(0.235, 0.083),
      new THREE.Vector2(0.213, 0.095),
      new THREE.Vector2(0.127, 0.096),
      new THREE.Vector2(0.116, 0.113),
      new THREE.Vector2(0.108, 0.201),
      new THREE.Vector2(0.079, 0.224),
      new THREE.Vector2(0.000, 0.232), // positive contact nub tip
    ];
    const capGeo = new THREE.LatheGeometry(capProfile, 48);
    const capMesh = new THREE.Mesh(capGeo, matNickel);
    capMesh.position.y = cellLength / 2;
    horizontalGroup.add(capMesh);

    // F. Polarity Decals
    // 1. Bold Black '+' on Upper Blue Section (Both front and back)
    const plusCanvas = document.createElement('canvas');
    plusCanvas.width = 128;
    plusCanvas.height = 128;
    const pctx = plusCanvas.getContext('2d')!;
    pctx.fillStyle = '#09090b';
    pctx.font = '900 110px Arial, sans-serif';
    pctx.textAlign = 'center';
    pctx.textBaseline = 'middle';
    pctx.fillText('+', 64, 64);
    const plusTex = new THREE.CanvasTexture(plusCanvas);

    const plusGeo = new THREE.CylinderGeometry(cellRadius + 0.003, cellRadius + 0.003, 0.24, 24, 1, true, -0.4, 0.8);
    const plusMat = new THREE.MeshStandardMaterial({
      map: plusTex,
      transparent: true,
      roughness: 0.5,
      metalness: 0,
      depthWrite: false,
    });
    const plusMeshFront = new THREE.Mesh(plusGeo, plusMat);
    plusMeshFront.position.y = cellLength * 0.35;
    horizontalGroup.add(plusMeshFront);

    const plusMeshBack = plusMeshFront.clone();
    plusMeshBack.rotation.y = Math.PI;
    horizontalGroup.add(plusMeshBack);

    // 2. Clean 'AA 1.5V' Decal on Lower Matte Black Section
    const aaCanvas = document.createElement('canvas');
    aaCanvas.width = 512;
    aaCanvas.height = 128;
    const actx = aaCanvas.getContext('2d')!;
    actx.fillStyle = '#f4f4f5';
    actx.font = 'bold 64px Arial, sans-serif';
    actx.textAlign = 'center';
    actx.textBaseline = 'middle';
    actx.fillText('AA 1.5V', 256, 64);
    const aaTex = new THREE.CanvasTexture(aaCanvas);

    const aaGeo = new THREE.CylinderGeometry(cellRadius + 0.003, cellRadius + 0.003, 0.26, 32, 1, true, -1.2, 2.4);
    const aaMat = new THREE.MeshStandardMaterial({
      map: aaTex,
      transparent: true,
      roughness: 0.7,
      metalness: 0,
      depthWrite: false,
    });
    const aaMeshFront = new THREE.Mesh(aaGeo, aaMat);
    aaMeshFront.position.y = -cellLength * 0.12;
    horizontalGroup.add(aaMeshFront);

    const aaMeshBack = aaMeshFront.clone();
    aaMeshBack.rotation.y = Math.PI;
    horizontalGroup.add(aaMeshBack);

    cellGroup.add(horizontalGroup);
    scene.add(cellGroup);

    // 6. Modern Acrylic Battery Cradle (Mounting bay)
    const cradleGroup = new THREE.Group();
    const cradleMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.4,
      roughness: 0.6,
    });
    const cradleBaseGeo = new THREE.BoxGeometry(cellLength + 0.45, 0.16, cellRadius * 2 + 0.24);
    const cradleBase = new THREE.Mesh(cradleBaseGeo, cradleMat);
    cradleBase.position.y = -cellRadius - 0.08;
    cradleGroup.add(cradleBase);

    // Gold Spring Contact on Positive Side
    const springGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.15, 12);
    const springMesh = new THREE.Mesh(springGeo, matBrass);
    springMesh.rotation.z = Math.PI / 2;
    springMesh.position.set(cellLength / 2 + 0.12, 0, 0);
    cradleGroup.add(springMesh);

    // Flat Gold Contact on Negative Side
    const contactGeo = new THREE.BoxGeometry(0.04, 0.35, 0.35);
    const contactMesh = new THREE.Mesh(contactGeo, matBrass);
    contactMesh.position.set(-cellLength / 2 - 0.10, 0, 0);
    cradleGroup.add(contactMesh);

    scene.add(cradleGroup);

    // 7. Electrical Spark Ions (Floating particles when active)
    const particleCount = 20;
    const partGeo = new THREE.BufferGeometry();
    const partPos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
      partPos[i] = (Math.random() - 0.5) * 1.6;
      partPos[i + 1] = (Math.random() - 0.5) * 0.8;
      partPos[i + 2] = (Math.random() - 0.5) * 0.8;
    }
    partGeo.setAttribute('position', new THREE.BufferAttribute(partPos, 3));
    const partMat = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 0.06,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
    });
    const sparkParticles = new THREE.Points(partGeo, partMat);
    sparkParticlesRef.current = sparkParticles;
    scene.add(sparkParticles);

    // 8. Animation Render Loop
    let animId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const dt = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      // Smooth reversal rotation interpolation (Z-axis flip)
      currentRotationZRef.current += (targetRotationZRef.current - currentRotationZRef.current) * 0.14;

      if (cellGroupRef.current) {
        cellGroupRef.current.rotation.z = currentRotationZRef.current;
        cellGroupRef.current.rotation.y = manualRotYRef.current;
        cellGroupRef.current.rotation.x = manualRotXRef.current;

        // Gentle breathing float when idle
        if (!isDraggingRef.current) {
          manualRotYRef.current += (0 - manualRotYRef.current) * 0.05;
          manualRotXRef.current += (0 - manualRotXRef.current) * 0.05;
          cellGroupRef.current.position.y = Math.sin(elapsed * 2.5) * 0.03;
        }
      }

      // Spark / Glow effects when active
      if (sparkParticlesRef.current && glowLightRef.current) {
        if (isActive) {
          (sparkParticlesRef.current.material as THREE.PointsMaterial).opacity =
            0.6 + Math.sin(elapsed * 12) * 0.3;
          sparkParticlesRef.current.rotation.y += dt * 1.5;
          glowLightRef.current.intensity = 1.8 + Math.sin(elapsed * 8) * 0.6;
        } else {
          (sparkParticlesRef.current.material as THREE.PointsMaterial).opacity = 0;
          glowLightRef.current.intensity = 0;
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    // 9. Resize Observer
    const ro = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const w = entry.contentRect.width || width;
      const h = entry.contentRect.height || height;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    ro.observe(container);

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
      renderer.dispose();
      lowerGeo.dispose();
      upperGeo.dispose();
      seamGeo.dispose();
      botPlateGeo.dispose();
      botPlateRingGeo.dispose();
      capGeo.dispose();
      plusGeo.dispose();
      aaGeo.dispose();
      plusTex.dispose();
      aaTex.dispose();
      partGeo.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [voltage, label, isActive]);

  const hClass = size === 'sm' ? 'h-24' : size === 'lg' ? 'h-36' : 'h-28';

  return (
    <div
      className={`relative w-full ${hClass} cursor-grab active:cursor-grabbing select-none flex items-center justify-center ${className}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div ref={containerRef} className="w-full h-full" />

      {/* Floating 360 Hint Pill */}
      {isHovered && (
        <div className="absolute bottom-1 px-2 py-0.5 rounded-full bg-slate-950/80 border border-slate-700 text-[9px] font-mono text-cyan-300 pointer-events-none animate-in fade-in">
          ลากเพื่อหมุน 3D · คลิกปุ่มกลับขั้ว
        </div>
      )}

      {/* Quick Flip Button on Top-Right */}
      {onFlip && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onFlip();
          }}
          className="absolute top-1 right-1 p-1 rounded-md bg-slate-900/80 hover:bg-slate-800 text-amber-300 border border-slate-700 text-[10px] shadow transition active:scale-95"
          title="กลับขั้วแบตเตอรี่ (Flip 180°)"
        >
          🔄
        </button>
      )}
    </div>
  );
};

