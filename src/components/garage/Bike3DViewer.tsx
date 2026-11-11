/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Bike3DViewer — Interactive 3D Bicycle Viewer for Garage (Scene 11).
 * Supports:
 * 1. Loading custom GLTF/GLB models exported from Blender (e.g., /assets/models/porter_ebike_concept__lumelectrics.glb).
 * 2. Automatic centering, bounding box normalisation, and exact tire-to-floor contact alignment.
 * 3. Graceful procedural fallback 3D e-bike with frame color, battery pack, and motor when GLB is not yet placed.
 * 4. 360° touch/mouse drag rotation and smooth cinematic turntable animation.
 * 5. Bright high-tech showroom lighting and clean studio aesthetic.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RotateCw, Box, CheckCircle2 } from 'lucide-react';

interface Bike3DViewerProps {
  frameColor: string;
  motorVoltage: number;
  batteryPackName?: string;
  className?: string;
}

export const Bike3DViewer: React.FC<Bike3DViewerProps> = ({
  frameColor,
  motorVoltage,
  batteryPackName = '4S 2P (12V 4,000mAh)',
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const bikeGroupRef = useRef<THREE.Group | null>(null);
  const targetRotationYRef = useRef<number>(-0.45);
  const currentRotationYRef = useRef<number>(-0.45);
  const isDraggingRef = useRef<boolean>(false);
  const prevMouseXRef = useRef<number>(0);
  const isCustomModelRef = useRef<boolean>(false);

  const [isCustomModelLoaded, setIsCustomModelLoaded] = useState<boolean>(false);
  const [modelFileName, setModelFileName] = useState<string>('');

  // Rotate helper
  const handleRotate = useCallback((deltaAngle: number) => {
    targetRotationYRef.current += deltaAngle;
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 540;
    const height = container.clientHeight || 380;

    // 1. Scene setup
    const scene = new THREE.Scene();

    // 2. Camera setup — framing the enlarged bicycle prominently in bright daylight
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    camera.position.set(0, 0.46, 2.35);
    camera.lookAt(0, 0.06, 0);

    // 3. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 4. Bright Studio Showroom Lighting (Clean Daylight & High Key)
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
    scene.add(ambientLight);

    // Main Sunlight Key
    const keyLight = new THREE.DirectionalLight(0xfffbeb, 2.3);
    keyLight.position.set(4, 6, 4);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.bias = -0.0008;
    scene.add(keyLight);

    // Cool Sky Fill Light
    const fillLight = new THREE.DirectionalLight(0xbae6fd, 1.35);
    fillLight.position.set(-4, 4, 3);
    scene.add(fillLight);

    // Warm Rim / Back Light
    const rimLight = new THREE.DirectionalLight(0xfef3c7, 1.1);
    rimLight.position.set(0, 4, -4);
    scene.add(rimLight);

    // Ground Bounce / Underglow
    const bounceLight = new THREE.DirectionalLight(0xf1f5f9, 0.8);
    bounceLight.position.set(0, -3, 0);
    scene.add(bounceLight);

    // 5. Floor Pedestal (Showroom Turntable with exact floor level at y = -0.48)
    const floorY = -0.48; // Exact top surface level of showroom podium
    const pedestalHeight = 0.08;
    const pedestalRadius = 1.55;

    const floorGeo = new THREE.CylinderGeometry(pedestalRadius, pedestalRadius + 0.07, pedestalHeight, 64);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.22,
      metalness: 0.18,
    });
    const pedestal = new THREE.Mesh(floorGeo, floorMat);
    pedestal.position.y = floorY - pedestalHeight / 2; // top surface aligns precisely to floorY
    pedestal.receiveShadow = true;
    scene.add(pedestal);

    // Glowing Cyan / Teal LED Accent Ring on edge of podium
    const ringGeo = new THREE.RingGeometry(pedestalRadius - 0.05, pedestalRadius - 0.01, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = floorY + 0.001; // barely above podium top to avoid z-fighting
    scene.add(ring);

    // Outer Chrome Bezel
    const outerTorusGeo = new THREE.TorusGeometry(pedestalRadius + 0.03, 0.015, 12, 64);
    const outerTorusMat = new THREE.MeshStandardMaterial({
      color: 0xcbd5e1,
      metalness: 0.85,
      roughness: 0.2,
    });
    const outerBezel = new THREE.Mesh(outerTorusGeo, outerTorusMat);
    outerBezel.rotation.x = Math.PI / 2;
    outerBezel.position.y = floorY;
    scene.add(outerBezel);

    // Soft Radial Shadow on Podium Top under bike
    const shadowGeo = new THREE.CircleGeometry(1.05, 48);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x0f172a,
      transparent: true,
      opacity: 0.18,
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = floorY + 0.002;
    scene.add(shadowMesh);

    // Main rotating group for bicycle
    const rootGroup = new THREE.Group();
    scene.add(rootGroup);
    bikeGroupRef.current = rootGroup;

    // Helper to build procedural bicycle
    const buildProceduralBike = () => {
      const bikeGroup = new THREE.Group();

      const bikeMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(frameColor),
        roughness: 0.35,
        metalness: 0.65,
      });
      const chromeMat = new THREE.MeshStandardMaterial({
        color: 0xe2e8f0,
        roughness: 0.15,
        metalness: 0.9,
      });
      const darkMat = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        roughness: 0.6,
      });
      const goldMat = new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        roughness: 0.3,
        metalness: 0.8,
      });

      const createTube = (from: THREE.Vector3, to: THREE.Vector3, mat: THREE.Material, radius = 0.032) => {
        const dir = new THREE.Vector3().subVectors(to, from);
        const len = dir.length();
        const geo = new THREE.CylinderGeometry(radius, radius, len, 16);
        const mesh = new THREE.Mesh(geo, mat);
        mesh.castShadow = true;
        mesh.position.copy(from).addScaledVector(dir, 0.5);
        mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
        return mesh;
      };

      const wheelRadius = 0.32;
      // Axles positioned so bottom of wheels rests precisely at floorY (-0.48)
      const axleY = floorY + wheelRadius; // -0.48 + 0.32 = -0.16
      const bbCenter = new THREE.Vector3(0, axleY, 0);
      const rearAxle = new THREE.Vector3(-0.65, axleY, 0);
      const frontAxle = new THREE.Vector3(0.70, axleY, 0);
      const headTop = new THREE.Vector3(0.58, axleY + 0.54, 0);
      const headBottom = new THREE.Vector3(0.52, axleY + 0.36, 0);
      const seatCluster = new THREE.Vector3(-0.20, axleY + 0.46, 0);

      // Frame Tubes
      bikeGroup.add(createTube(bbCenter, seatCluster, bikeMat, 0.034));
      bikeGroup.add(createTube(seatCluster, headTop, bikeMat, 0.030));
      bikeGroup.add(createTube(bbCenter, headBottom, bikeMat, 0.042));
      bikeGroup.add(createTube(headBottom, headTop, bikeMat, 0.036));
      bikeGroup.add(createTube(bbCenter, rearAxle, bikeMat, 0.024));
      bikeGroup.add(createTube(seatCluster, rearAxle, bikeMat, 0.024));
      bikeGroup.add(createTube(headBottom, frontAxle, bikeMat, 0.028));

      // Seatpost & Saddle
      const seatpostTop = new THREE.Vector3(-0.24, axleY + 0.58, 0);
      bikeGroup.add(createTube(seatCluster, seatpostTop, chromeMat, 0.022));

      // Handlebar & Stem
      const stemTop = new THREE.Vector3(0.56, axleY + 0.62, 0);
      bikeGroup.add(createTube(headTop, stemTop, chromeMat, 0.022));
      const barL = new THREE.Vector3(0.56, axleY + 0.62, -0.32);
      const barR = new THREE.Vector3(0.56, axleY + 0.62, 0.32);
      bikeGroup.add(createTube(barL, barR, darkMat, 0.02));

      // Wheels (Tires & Rims)
      const buildWheel = (pos: THREE.Vector3) => {
        const wheelGroup = new THREE.Group();
        wheelGroup.position.copy(pos);

        // Fat Tire
        const tireGeo = new THREE.TorusGeometry(wheelRadius - 0.05, 0.055, 16, 48);
        const tire = new THREE.Mesh(tireGeo, darkMat);
        tire.castShadow = true;
        wheelGroup.add(tire);

        // Rim
        const rimMesh = new THREE.Mesh(new THREE.TorusGeometry(wheelRadius - 0.07, 0.02, 12, 36), chromeMat);
        wheelGroup.add(rimMesh);

        // Hub & Rotor
        const hubGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.1, 16);
        const hub = new THREE.Mesh(hubGeo, chromeMat);
        hub.rotation.x = Math.PI / 2;
        wheelGroup.add(hub);

        const discGeo = new THREE.RingGeometry(0.05, 0.11, 24);
        const disc = new THREE.Mesh(discGeo, chromeMat);
        disc.position.z = 0.04;
        wheelGroup.add(disc);

        return wheelGroup;
      };

      bikeGroup.add(buildWheel(rearAxle));
      bikeGroup.add(buildWheel(frontAxle));

      // Saddle
      const saddleGeo = new THREE.ConeGeometry(0.12, 0.28, 4);
      const saddle = new THREE.Mesh(saddleGeo, darkMat);
      saddle.rotation.z = Math.PI / 2;
      saddle.position.set(-0.25, axleY + 0.60, 0);
      saddle.scale.set(0.7, 1.2, 0.9);
      saddle.castShadow = true;
      bikeGroup.add(saddle);

      // Battery Pack (Integrated downtube mount)
      const battGeo = new THREE.BoxGeometry(0.32, 0.10, 0.09);
      const battMat = new THREE.MeshStandardMaterial({
        color: 0x0284c7,
        emissive: 0x0369a1,
        emissiveIntensity: 0.35,
        roughness: 0.2,
        metalness: 0.7,
      });
      const battMesh = new THREE.Mesh(battGeo, battMat);
      battMesh.position.set(0.22, axleY + 0.18, 0);
      battMesh.rotation.z = 0.48;
      battMesh.castShadow = true;
      bikeGroup.add(battMesh);

      // Hub Motor
      const motorGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.12, 24);
      const motorMat = new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        roughness: 0.3,
        metalness: 0.8,
      });
      const motor = new THREE.Mesh(motorGeo, motorMat);
      motor.position.copy(rearAxle);
      motor.rotation.x = Math.PI / 2;
      bikeGroup.add(motor);

      return bikeGroup;
    };

    // 6. Try to load custom Blender/glTF GLB model first
    const gltfLoader = new GLTFLoader();
    const candidatePaths = [
      '/assets/models/porter_ebike_concept__lumelectrics.glb',
      '/assets/models/ebike.glb',
      '/assets/models/E_BYCLYCE.glb',
      '/assets/models/bike.glb',
    ];

    let isLoaded = false;

    const tryLoadGlb = (index: number) => {
      if (index >= candidatePaths.length) {
        if (!isLoaded) {
          const proceduralBike = buildProceduralBike();
          rootGroup.add(proceduralBike);
          setIsCustomModelLoaded(false);
          isCustomModelRef.current = false;
        }
        return;
      }

      const path = candidatePaths[index];
      gltfLoader.load(
        path,
        (gltf) => {
          if (isLoaded) return;
          isLoaded = true;

          const model = gltf.scene;

          // 1. Initial bounding box
          const initialBox = new THREE.Box3().setFromObject(model);
          const initialSize = initialBox.getSize(new THREE.Vector3());
          const maxDim = Math.max(initialSize.x, initialSize.y, initialSize.z);

          // 2. Scale up significantly: was 1.3, now 2.15 to look prominently large & grand
          const scale = 2.15 / Math.max(maxDim, 0.001);
          model.scale.setScalar(scale);
          model.updateMatrixWorld(true);

          // 3. Compute accurate bounding box of the scaled model
          const scaledBox = new THREE.Box3().setFromObject(model);
          const scaledCenter = scaledBox.getCenter(new THREE.Vector3());

          // 4. Center X and Z
          model.position.x = -scaledCenter.x;
          model.position.z = -scaledCenter.z;

          // 5. CRUCIAL FIX: Align bottom of tires exactly to the top surface of the showroom podium (floorY = -0.48)
          // scaledBox.min.y is the lowest vertex of the tires
          model.position.y = floorY - scaledBox.min.y;

          // 6. Enhance lighting & shadows on meshes
          model.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              const mesh = child as THREE.Mesh;
              mesh.castShadow = true;
              mesh.receiveShadow = true;

              // Ensure materials respond richly to bright studio lighting
              if (mesh.material) {
                const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
                mats.forEach((m) => {
                  const stdMat = m as THREE.MeshStandardMaterial;
                  if (typeof stdMat.roughness === 'number') {
                    stdMat.roughness = Math.min(stdMat.roughness, 0.7);
                  }
                  if ('envMapIntensity' in stdMat) {
                    (stdMat as any).envMapIntensity = 1.3;
                  }
                });
              }
            }
          });

          rootGroup.add(model);
          setIsCustomModelLoaded(true);
          isCustomModelRef.current = true;
          setModelFileName(path.split('/').pop() || 'ebike.glb');
        },
        undefined,
        () => {
          tryLoadGlb(index + 1);
        }
      );
    };

    tryLoadGlb(0);

    // 7. Mouse / Touch Drag Interaction
    const onMouseDown = (e: MouseEvent) => {
      isDraggingRef.current = true;
      prevMouseXRef.current = e.clientX;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const deltaX = e.clientX - prevMouseXRef.current;
      prevMouseXRef.current = e.clientX;
      targetRotationYRef.current += deltaX * 0.008;
    };

    const onMouseUp = () => {
      isDraggingRef.current = false;
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        isDraggingRef.current = true;
        prevMouseXRef.current = e.touches[0].clientX;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isDraggingRef.current || e.touches.length !== 1) return;
      const deltaX = e.touches[0].clientX - prevMouseXRef.current;
      prevMouseXRef.current = e.touches[0].clientX;
      targetRotationYRef.current += deltaX * 0.008;
    };

    const onTouchEnd = () => {
      isDraggingRef.current = false;
    };

    const domEl = renderer.domElement;
    domEl.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    domEl.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd);

    // 8. Animation Render Loop
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);

      // Auto slow turntable rotation when not dragging
      if (!isDraggingRef.current) {
        targetRotationYRef.current += 0.0025;
      }

      // Smooth rotation damping
      currentRotationYRef.current += (targetRotationYRef.current - currentRotationYRef.current) * 0.08;
      if (bikeGroupRef.current) {
        bikeGroupRef.current.rotation.y = currentRotationYRef.current;
      }

      renderer.render(scene, camera);
    };
    animate();

    // 9. Resize Observer
    const ro = new ResizeObserver(() => {
      if (!container) return;
      const newW = container.clientWidth || 540;
      const newH = container.clientHeight || 380;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    });
    ro.observe(container);

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
      domEl.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      domEl.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      renderer.dispose();
      scene.clear();
    };
  }, [frameColor, motorVoltage]);

  return (
    <div className={`relative w-full h-full min-h-[320px] flex flex-col justify-end select-none ${className}`}>
      {/* 3D Canvas Container — 100% Clear View of Bicycle (No blocking badges or text) */}
      <div
        ref={containerRef}
        className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing rounded-2xl overflow-hidden"
      />

      {/* Discrete Rotate Buttons at Bottom Right (Never obstructing bike body or wheels) */}
      <div className="relative z-10 p-2.5 flex items-center justify-end pointer-events-none">
        <div className="flex items-center gap-1.5 pointer-events-auto">
          <button
            onClick={() => handleRotate(-Math.PI / 4)}
            className="w-7 h-7 rounded-lg bg-white/80 hover:bg-white border border-slate-200 text-slate-700 shadow-sm transition active:scale-90 flex items-center justify-center backdrop-blur-md"
            title="หมุนซ้าย 45°"
          >
            <RotateCw className="w-3.5 h-3.5 -scale-x-100" />
          </button>
          <button
            onClick={() => handleRotate(Math.PI / 4)}
            className="w-7 h-7 rounded-lg bg-white/80 hover:bg-white border border-slate-200 text-slate-700 shadow-sm transition active:scale-90 flex items-center justify-center backdrop-blur-md"
            title="หมุนขวา 45°"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
