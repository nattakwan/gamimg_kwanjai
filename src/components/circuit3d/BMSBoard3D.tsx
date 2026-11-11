/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * BMSBoard3D — Modern Stylized 3D Battery Management System PCB with Three.js.
 * Features:
 * - High-tech cyan/navy multi-layer PCB substrate with gold copper traces
 * - Central smart MCU microcontroller chip with pin headers
 * - Heavy-duty power MOSFETs with aluminum cooling fins
 * - 4x active cell balancing LEDs that animate when balancing
 * - Dual screw terminal blocks for Main Bus (+/-)
 * - Interactive 3D drag-to-inspect
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';

interface BMSBoard3DProps {
  isActive?: boolean;
  hasFault?: boolean;
  balancingCellIndex?: number;
  size?: 'sm' | 'md';
  className?: string;
}

export const BMSBoard3D: React.FC<BMSBoard3DProps> = ({
  isActive = true,
  hasFault = false,
  balancingCellIndex = 0,
  size = 'md',
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rootGroupRef = useRef<THREE.Group | null>(null);
  const balanceLedsRef = useRef<THREE.Mesh[]>([]);

  const isDraggingRef = useRef<boolean>(false);
  const previousPointerXRef = useRef<number>(0);
  const previousPointerYRef = useRef<number>(0);
  const manualRotXRef = useRef<number>(0.3);
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

    const width = container.clientWidth || 180;
    const height = container.clientHeight || 120;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 1.4, 2.5);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    container.appendChild(renderer.domElement);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
    keyLight.position.set(2, 3, 2);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 2.0);
    rimLight.position.set(-2, 2, -2);
    scene.add(rimLight);

    const ambientLight = new THREE.AmbientLight(0x334155, 1.3);
    scene.add(ambientLight);

    // Materials
    const pcbMat = new THREE.MeshStandardMaterial({
      color: 0x0f3b4c, // High-tech dark teal PCB
      roughness: 0.45,
      metalness: 0.2,
    });

    const icChipMat = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      roughness: 0.6,
      metalness: 0.1,
    });

    const heatsinkMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.9,
      roughness: 0.2,
    });

    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.95,
      roughness: 0.2,
    });

    const terminalBlockMat = new THREE.MeshStandardMaterial({
      color: 0x15803d, // Green industrial terminal block
      roughness: 0.5,
      metalness: 0.1,
    });

    const rootGroup = new THREE.Group();
    rootGroupRef.current = rootGroup;
    scene.add(rootGroup);

    // A. PCB Substrate Board
    const pcbGeo = new THREE.BoxGeometry(1.7, 0.06, 1.05);
    const pcbMesh = new THREE.Mesh(pcbGeo, pcbMat);
    rootGroup.add(pcbMesh);

    // Gold Plated Edge Traces
    const traceGeo = new THREE.BoxGeometry(1.64, 0.01, 0.04);
    const traceTop = new THREE.Mesh(traceGeo, goldMat);
    traceTop.position.set(0, 0.035, -0.48);
    rootGroup.add(traceTop);

    // B. Microcontroller IC (Center QFP chip)
    const icGeo = new THREE.BoxGeometry(0.38, 0.08, 0.38);
    const icMesh = new THREE.Mesh(icGeo, icChipMat);
    icMesh.position.set(-0.25, 0.06, 0);
    rootGroup.add(icMesh);

    // IC White text label
    const icCanvas = document.createElement('canvas');
    icCanvas.width = 128;
    icCanvas.height = 128;
    const ictx = icCanvas.getContext('2d')!;
    ictx.fillStyle = '#18181b';
    ictx.fillRect(0, 0, 128, 128);
    ictx.fillStyle = '#ffffff';
    ictx.font = 'bold 28px monospace';
    ictx.textAlign = 'center';
    ictx.fillText('BMS', 64, 52);
    ictx.fillText('4S-40A', 64, 88);
    const icTex = new THREE.CanvasTexture(icCanvas);
    const icLabel = new THREE.Mesh(
      new THREE.PlaneGeometry(0.32, 0.32),
      new THREE.MeshBasicMaterial({ map: icTex, transparent: true })
    );
    icLabel.rotation.x = -Math.PI / 2;
    icLabel.position.set(-0.25, 0.105, 0);
    rootGroup.add(icLabel);

    // C. Power MOSFET Heatsinks (Right side)
    [-0.2, 0.2].forEach((z) => {
      const mosfetGeo = new THREE.BoxGeometry(0.24, 0.18, 0.18);
      const mosfet = new THREE.Mesh(mosfetGeo, heatsinkMat);
      mosfet.position.set(0.32, 0.11, z);
      rootGroup.add(mosfet);

      // Heatsink fins
      for (let fin = -0.06; fin <= 0.06; fin += 0.04) {
        const finGeo = new THREE.BoxGeometry(0.22, 0.08, 0.015);
        const finMesh = new THREE.Mesh(finGeo, heatsinkMat);
        finMesh.position.set(0.32, 0.22, z + fin);
        rootGroup.add(finMesh);
      }
    });

    // D. Terminal Blocks (Far right edge)
    const tbGeo = new THREE.BoxGeometry(0.26, 0.22, 0.55);
    const tb = new THREE.Mesh(tbGeo, terminalBlockMat);
    tb.position.set(0.68, 0.13, 0);
    rootGroup.add(tb);

    // E. 4x Cell Balancing Status LEDs
    const leds: THREE.Mesh[] = [];
    for (let i = 0; i < 4; i++) {
      const ledGeo = new THREE.SphereGeometry(0.035, 12, 12);
      const ledMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
      const led = new THREE.Mesh(ledGeo, ledMat);
      led.position.set(-0.62, 0.05, -0.3 + i * 0.2);
      rootGroup.add(led);
      leds.push(led);
    }
    balanceLedsRef.current = leds;

    // Animation Loop
    let animId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      if (rootGroupRef.current) {
        rootGroupRef.current.rotation.y += (manualRotYRef.current - rootGroupRef.current.rotation.y) * 0.1;
        rootGroupRef.current.rotation.x += (manualRotXRef.current - rootGroupRef.current.rotation.x) * 0.1;
      }

      // Animate balance LEDs
      balanceLedsRef.current.forEach((led, idx) => {
        const mat = led.material as THREE.MeshBasicMaterial;
        if (hasFault) {
          mat.color.setHex(Math.sin(elapsed * 12) > 0 ? 0xef4444 : 0x450a0a);
        } else if (isActive) {
          const isBalancing = (Math.floor(elapsed * 2) + idx) % 4 === 0;
          mat.color.setHex(isBalancing ? 0x38bdf8 : 0x10b981);
        } else {
          mat.color.setHex(0x334155);
        }
      });

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
  }, [isActive, hasFault, balancingCellIndex]);

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
      title="แผงวงจรควบคุมแบตเตอรี่อัจฉริยะ 3 มิติ (ลากหมุนเพื่อตรวจ 360°)"
    >
      <div ref={containerRef} className="w-full h-full" />

      {/* Floating Status Badge */}
      <div className="absolute top-1.5 left-2 pointer-events-none flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-950/80 backdrop-blur-sm border border-slate-700/60 text-[10px] font-bold">
        <span
          className={`w-2 h-2 rounded-full ${
            hasFault ? 'bg-rose-500 animate-ping' : isActive ? 'bg-cyan-400 animate-pulse' : 'bg-slate-600'
          }`}
        />
        <span className={hasFault ? 'text-rose-400' : 'text-cyan-300'}>
          {hasFault ? 'BMS FAULT' : 'SMART BMS 4S'}
        </span>
      </div>

      <div className="absolute bottom-1 right-2 pointer-events-none text-[9px] font-mono text-slate-500 bg-slate-950/60 px-1.5 py-0.5 rounded">
        ระบบบาลานซ์แรงดันอัตโนมัติ
      </div>
    </div>
  );
};

