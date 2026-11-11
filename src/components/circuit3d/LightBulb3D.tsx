/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * LightBulb3D — Miniature E10 Screw-Base Light Bulb with Three.js (Procedural DeepSeek R1 Math).
 * Features:
 * - Genuine Miniature E10 Screw Base Bulb (Image 2):
 *   * Solder lead contact bead at bottom tip
 *   * Black rubber/insulator ring
 *   * Threaded metallic screw shell (sine-rippled lathe with 5 thread turns and top lip)
 *   * Teardrop glass envelope (lathe profile with PBR transmission, refraction & specular sheen)
 *   * Internal molybdenum support posts and 6-turn coiled tungsten filament (Catmull-Rom tube)
 * - Dynamic emission radiance PointLight & additive inner glow
 * - Visual overvoltage burnout animation (scorched dark glass & extinguished filament)
 * - Interactive 3D drag-to-inspect
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';

interface LightBulb3DProps {
  brightness?: number; // 0.0 (off) to 1.0 (nominal) to 1.5+ (overload)
  isBlown?: boolean;
  voltage?: number;
  ratedVoltage?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const LightBulb3D: React.FC<LightBulb3DProps> = ({
  brightness = 1.0,
  isBlown = false,
  voltage = 1.5,
  ratedVoltage = 1.5,
  size = 'md',
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const bulbPointLightRef = useRef<THREE.PointLight | null>(null);
  const filamentMeshRef = useRef<THREE.Mesh | null>(null);
  const bulbGlowMeshRef = useRef<THREE.Mesh | null>(null);
  const rootGroupRef = useRef<THREE.Group | null>(null);

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

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 160;
    const height = container.clientHeight || 120;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 0.5, 3.0);
    camera.lookAt(0, 0.2, 0);

    // 2. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    container.appendChild(renderer.domElement);

    // 3. Lighting
    const studioKey = new THREE.DirectionalLight(0xffffff, 2.2);
    studioKey.position.set(2, 3, 2);
    scene.add(studioKey);

    const rimBlue = new THREE.DirectionalLight(0x38bdf8, 2.0);
    rimBlue.position.set(-2, 2, -2);
    scene.add(rimBlue);

    const ambientLight = new THREE.AmbientLight(0x334155, 1.3);
    scene.add(ambientLight);

    // Dynamic bulb radiance PointLight
    const bulbPointLight = new THREE.PointLight(0xfef08a, 0, 4);
    bulbPointLight.position.set(0, 0.55, 0);
    scene.add(bulbPointLight);
    bulbPointLightRef.current = bulbPointLight;

    // 4. Materials (PBR calibrated by DeepSeek R1)
    const matNickel = new THREE.MeshStandardMaterial({
      color: 0xcbd5e1,
      metalness: 0.95,
      roughness: 0.22,
    });

    const matBlack = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      metalness: 0.0,
      roughness: 0.75,
    });

    const matCeramic = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.2,
      roughness: 0.85,
    });

    const matBrassTerminal = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.9,
      roughness: 0.25,
    });

    const glassMat = new THREE.MeshPhysicalMaterial({
      color: isBlown ? 0x27272a : 0xffffff,
      transmission: isBlown ? 0.25 : 0.96,
      opacity: 1.0,
      transparent: true,
      roughness: isBlown ? 0.45 : 0.05,
      ior: 1.5,
      thickness: 0.35,
      clearcoat: 1.0,
      clearcoatRoughness: 0.03,
      metalness: 0.0,
      envMapIntensity: 1.4,
      side: THREE.FrontSide,
    });

    const filamentMat = new THREE.MeshStandardMaterial({
      color: isBlown ? 0x18181b : 0xffe9a8,
      emissive: isBlown ? 0x000000 : 0xfef08a,
      emissiveIntensity: 0,
      metalness: 0.9,
      roughness: 0.3,
      toneMapped: false,
    });

    const innerGlowMat = new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });

    // 5. Root Group
    const rootGroup = new THREE.Group();
    rootGroupRef.current = rootGroup;
    scene.add(rootGroup);

    // Subtle tilt to display threaded screw and glass beautifully (matching Image 2)
    const bulbGroup = new THREE.Group();
    bulbGroup.position.set(0, -0.45, 0);

    /* ── A. Solder Contact Bead (Bottom tip) ────────────────── */
    const beadGeo = new THREE.SphereGeometry(0.12, 24, 16);
    const bead = new THREE.Mesh(beadGeo, matNickel);
    bead.scale.set(1, 0.55, 1);
    bead.position.y = 0.055;
    bulbGroup.add(bead);

    /* ── B. Black Insulator Ring ────────────────────────────── */
    const insulatorGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.09, 32);
    const insulator = new THREE.Mesh(insulatorGeo, matBlack);
    insulator.position.y = 0.145;
    bulbGroup.add(insulator);

    /* ── C. Threaded E10 Shell (R1 Sine-Rippled Lathe) ──────── */
    const R_SCREW = 0.28;
    const Y0 = 0.19;
    const H_SCREW = 0.52;
    const TURNS = 5;
    const prof: THREE.Vector2[] = [];
    const N = TURNS * 24;
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const r = R_SCREW + 0.030 * Math.sin(t * Math.PI * 2 * TURNS);
      const y = Y0 + t * H_SCREW;
      prof.push(new THREE.Vector2(r, y));
    }
    prof.push(new THREE.Vector2(R_SCREW + 0.012, Y0 + H_SCREW + 0.02)); // Top rim lip
    const screwGeo = new THREE.LatheGeometry(prof, 48);
    const screwMesh = new THREE.Mesh(screwGeo, matNickel);
    bulbGroup.add(screwMesh);

    /* ── D. Glass Teardrop Envelope (R1 Lathe Math) ─────────── */
    const GLOBE_Y = Y0 + H_SCREW - 0.03;
    const s = 0.88; // Scale factor
    const globeProfile = [
      new THREE.Vector2(0.220 * s, 0.000 * s),
      new THREE.Vector2(0.420 * s, 0.100 * s),
      new THREE.Vector2(0.560 * s, 0.280 * s),
      new THREE.Vector2(0.645 * s, 0.550 * s),
      new THREE.Vector2(0.650 * s, 0.750 * s),
      new THREE.Vector2(0.600 * s, 0.980 * s),
      new THREE.Vector2(0.440 * s, 1.160 * s),
      new THREE.Vector2(0.220 * s, 1.270 * s),
      new THREE.Vector2(0.000 * s, 1.300 * s),
    ];
    const globeGeo = new THREE.LatheGeometry(globeProfile, 48);
    const globeMesh = new THREE.Mesh(globeGeo, glassMat);
    globeMesh.position.y = GLOBE_Y;
    bulbGroup.add(globeMesh);

    /* ── E. Coiled Tungsten Filament & Molybdenum Posts ─────── */
    const helixPts: THREE.Vector3[] = [];
    const TURNS_F = 6;
    const R_F = 0.055;
    const Y_F0 = 0.45;
    const Y_F1 = 0.85;
    for (let i = 0; i <= TURNS_F * 24; i++) {
      const t = i / (TURNS_F * 24);
      const a = t * TURNS_F * Math.PI * 2;
      helixPts.push(
        new THREE.Vector3(Math.cos(a) * R_F, Y_F0 + t * (Y_F1 - Y_F0), Math.sin(a) * R_F)
      );
    }
    const filamentGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(helixPts), 160, 0.010, 8, false);
    const filamentMesh = new THREE.Mesh(filamentGeo, filamentMat);
    filamentMesh.position.y = GLOBE_Y;
    bulbGroup.add(filamentMesh);
    filamentMeshRef.current = filamentMesh;

    // Two support posts from neck to filament
    for (const x of [-R_F, R_F]) {
      const postGeo = new THREE.CylinderGeometry(0.010, 0.010, 0.45, 8);
      const post = new THREE.Mesh(postGeo, matNickel);
      post.position.set(x, GLOBE_Y + 0.25, 0);
      bulbGroup.add(post);
    }

    /* ── F. Dynamic Light & Inner Glow Sphere ───────────────── */
    const innerGlowGeo = new THREE.SphereGeometry(0.28, 20, 16);
    const innerGlowMesh = new THREE.Mesh(innerGlowGeo, innerGlowMat);
    innerGlowMesh.position.set(0, GLOBE_Y + 0.65, 0);
    bulbGroup.add(innerGlowMesh);
    bulbGlowMeshRef.current = innerGlowMesh;

    bulbPointLight.position.set(0, GLOBE_Y + 0.65 - 0.45, 0);

    /* ── G. Workstation Ceramic Mounting Collar (with Terminal Screws) ── */
    const collarBaseGeo = new THREE.CylinderGeometry(0.48, 0.54, 0.14, 32);
    const collarBase = new THREE.Mesh(collarBaseGeo, matCeramic);
    collarBase.position.y = -0.07;
    bulbGroup.add(collarBase);

    // Left & Right Brass Binding Screws
    for (const sx of [-0.42, 0.42]) {
      const screwPin = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.12, 12), matBrassTerminal);
      screwPin.position.set(sx, -0.04, 0.14);
      bulbGroup.add(screwPin);

      const hexCap = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.04, 6), matBrassTerminal);
      hexCap.position.set(sx, -0.01, 0.14);
      bulbGroup.add(hexCap);
    }

    rootGroup.add(bulbGroup);

    // 6. Animation Loop
    let animId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Damping manual rotation
      if (rootGroupRef.current) {
        rootGroupRef.current.rotation.y += (manualRotYRef.current - rootGroupRef.current.rotation.y) * 0.1;
        rootGroupRef.current.rotation.x += (manualRotXRef.current - rootGroupRef.current.rotation.x) * 0.1;
      }

      // Dynamic brightness & emission
      const effectiveBrightness = isBlown ? 0 : Math.max(0, brightness);
      const pulseFlicker = effectiveBrightness > 0 ? 1 + Math.sin(elapsed * 18) * 0.03 : 0;

      if (bulbPointLightRef.current) {
        bulbPointLightRef.current.intensity = effectiveBrightness * 3.2 * pulseFlicker;
        if (effectiveBrightness > 1.2) {
          bulbPointLightRef.current.color.setHex(0xffffff); // Overload white
        } else {
          bulbPointLightRef.current.color.setHex(0xfef08a); // Warm tungsten amber
        }
      }

      if (filamentMeshRef.current) {
        const mat = filamentMeshRef.current.material as THREE.MeshStandardMaterial;
        mat.emissiveIntensity = effectiveBrightness * 4.0 * pulseFlicker;
        if (effectiveBrightness > 1.2) {
          mat.emissive.setHex(0xffffff);
        } else {
          mat.emissive.setHex(0xfef08a);
        }
      }

      if (bulbGlowMeshRef.current) {
        const glowMat = bulbGlowMeshRef.current.material as THREE.MeshBasicMaterial;
        glowMat.opacity = effectiveBrightness > 0 ? Math.min(0.7, effectiveBrightness * 0.45 * pulseFlicker) : 0;
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
      beadGeo.dispose();
      insulatorGeo.dispose();
      screwGeo.dispose();
      globeGeo.dispose();
      filamentGeo.dispose();
      innerGlowGeo.dispose();
      collarBaseGeo.dispose();
      scene.clear();
    };
  }, [brightness, isBlown]);

  const heightClass = size === 'sm' ? 'h-24' : size === 'lg' ? 'h-36' : 'h-28';
  const isGlowing = brightness > 0 && !isBlown;

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
      title="หลอดไฟเกลียว E10 3 มิติ (ลากหมุนเพื่อตรวจ 360°)"
    >
      <div ref={containerRef} className="w-full h-full" />

      {/* Floating Status Badge */}
      <div className="absolute top-1.5 left-2 pointer-events-none flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-950/80 backdrop-blur-sm border border-slate-700/60 text-[10px] font-bold">
        <span
          className={`w-2 h-2 rounded-full ${
            isBlown
              ? 'bg-rose-500'
              : isGlowing
              ? 'bg-amber-300 animate-pulse shadow-[0_0_8px_#fde047]'
              : 'bg-slate-600'
          }`}
        />
        <span className={isBlown ? 'text-rose-400' : isGlowing ? 'text-amber-300' : 'text-slate-400'}>
          {isBlown
            ? 'ไส้หลอดขาด (BLOWN)'
            : isGlowing
            ? `สว่าง ${(brightness * 100).toFixed(0)}%`
            : 'ดับ (0V)'}
        </span>
      </div>

      <div className="absolute bottom-1 right-2 pointer-events-none text-[9px] font-mono text-slate-500 bg-slate-950/60 px-1.5 py-0.5 rounded">
        E10 {ratedVoltage}V (3.0Ω) · ลากหมุน 3D
      </div>
    </div>
  );
};

