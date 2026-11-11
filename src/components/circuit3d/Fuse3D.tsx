/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Fuse3D — Stylized 3D Glass Cartridge Safety Fuse with Three.js.
 * Features:
 * - Transparent glass cartridge cylinder with nickel end ferrules
 * - Internal fusible metallic filament wire
 * - Insulated vocational cradle holder with quick-clip spring terminals
 * - Animated burnout state with scorch discoloration and alert LED
 * - Interactive 3D drag-to-inspect
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';

interface Fuse3DProps {
  ratingAmps?: number;
  isBlown?: boolean;
  currentAmps?: number;
  size?: 'sm' | 'md';
  className?: string;
}

export const Fuse3D: React.FC<Fuse3DProps> = ({
  ratingAmps = 10,
  isBlown = false,
  currentAmps = 0,
  size = 'md',
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rootGroupRef = useRef<THREE.Group | null>(null);

  const isDraggingRef = useRef<boolean>(false);
  const previousPointerXRef = useRef<number>(0);
  const previousPointerYRef = useRef<number>(0);
  const manualRotXRef = useRef<number>(0.2);
  const manualRotYRef = useRef<number>(0);

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
    manualRotXRef.current = Math.max(-0.5, Math.min(0.5, manualRotXRef.current + deltaY * 0.015));
  }, []);

  const handlePointerUp = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 150;
    const height = container.clientHeight || 110;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 1.2, 2.6);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
    keyLight.position.set(2, 3, 2);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 2.0);
    rimLight.position.set(-2, 2, -2);
    scene.add(rimLight);

    const ambientLight = new THREE.AmbientLight(0x334155, 1.2);
    scene.add(ambientLight);

    // Materials
    const chromeMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.95,
      roughness: 0.15,
    });

    const brassClipMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.9,
      roughness: 0.2,
    });

    const cradleBaseMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.8,
      metalness: 0.2,
    });

    const glassMat = new THREE.MeshPhysicalMaterial({
      color: isBlown ? 0x27272a : 0xffffff,
      transmission: isBlown ? 0.35 : 0.94,
      opacity: isBlown ? 0.9 : 0.85,
      transparent: true,
      roughness: isBlown ? 0.5 : 0.08,
      ior: 1.5,
      thickness: 0.3,
    });

    const rootGroup = new THREE.Group();
    rootGroupRef.current = rootGroup;
    scene.add(rootGroup);

    // A. Cradle Base
    const baseGeo = new THREE.BoxGeometry(1.6, 0.12, 0.6);
    const baseMesh = new THREE.Mesh(baseGeo, cradleBaseMat);
    baseMesh.position.y = -0.15;
    rootGroup.add(baseMesh);

    // Clip Terminals (Left & Right)
    [-0.55, 0.55].forEach((x) => {
      const clipGeo = new THREE.BoxGeometry(0.16, 0.26, 0.32);
      const clip = new THREE.Mesh(clipGeo, brassClipMat);
      clip.position.set(x, 0.02, 0);
      rootGroup.add(clip);
    });

    // B. Glass Fuse Cartridge (Horizontal along X)
    const fuseGroup = new THREE.Group();
    rootGroup.add(fuseGroup);

    const tubeGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.85, 24);
    const tube = new THREE.Mesh(tubeGeo, glassMat);
    tube.rotation.z = Math.PI / 2;
    fuseGroup.add(tube);

    // End Ferrules (Caps)
    [-0.48, 0.48].forEach((x) => {
      const capGeo = new THREE.CylinderGeometry(0.185, 0.185, 0.22, 24);
      const cap = new THREE.Mesh(capGeo, chromeMat);
      cap.rotation.z = Math.PI / 2;
      cap.position.x = x;
      fuseGroup.add(cap);
    });

    // Fusible Filament Wire inside
    if (!isBlown) {
      const filGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.78, 8);
      const filMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.9, roughness: 0.2 });
      const fil = new THREE.Mesh(filGeo, filMat);
      fil.rotation.z = Math.PI / 2;
      fuseGroup.add(fil);
    } else {
      // Scorched blob for blown fuse
      const scorchGeo = new THREE.SphereGeometry(0.08, 12, 12);
      const scorchMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.9 });
      const scorch = new THREE.Mesh(scorchGeo, scorchMat);
      fuseGroup.add(scorch);
    }

    // Status LED
    const ledColor = isBlown ? 0xef4444 : 0x10b981;
    const ledGeo = new THREE.SphereGeometry(0.05, 16, 16);
    const ledMat = new THREE.MeshBasicMaterial({ color: ledColor });
    const led = new THREE.Mesh(ledGeo, ledMat);
    led.position.set(0, -0.06, 0.24);
    rootGroup.add(led);

    // Animation Loop
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
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
      scene.clear();
    };
  }, [ratingAmps, isBlown]);

  const heightClass = size === 'sm' ? 'h-24' : 'h-28';

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
      title="ฟิวส์นิรภัย 3 มิติ (ลากหมุนเพื่อตรวจ 360°)"
    >
      <div ref={containerRef} className="w-full h-full" />

      {/* Floating Status Badge */}
      <div className="absolute top-1.5 left-2 pointer-events-none flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-950/80 backdrop-blur-sm border border-slate-700/60 text-[10px] font-bold">
        <span className={`w-2 h-2 rounded-full ${isBlown ? 'bg-rose-500 animate-ping' : 'bg-emerald-400'}`} />
        <span className={isBlown ? 'text-rose-400' : 'text-emerald-300'}>
          {isBlown ? 'ฟิวส์ขาด (BLOWN)' : `FUSE ${ratingAmps}A`}
        </span>
      </div>

      <div className="absolute bottom-1 right-2 pointer-events-none text-[9px] font-mono text-slate-500 bg-slate-950/60 px-1.5 py-0.5 rounded">
        {isBlown ? 'กระแสเกินพิกัด!' : `พิกัด ${ratingAmps}A`}
      </div>
    </div>
  );
};

