/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Bike3DViewer — Interactive 3D Bicycle Viewer for Garage (Scene 11).
 * Supports:
 * 1. Loading custom GLTF/GLB models exported from Blender (e.g., /assets/models/ebike.glb).
 * 2. Automatic centering, bounding box normalisation, and material assignment.
 * 3. Graceful procedural fallback 3D e-bike with frame color, battery pack, and motor when GLB is not yet placed.
 * 4. 360° touch/mouse drag rotation and smooth cinematic turntable animation.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RotateCw, Sparkles, Box, CheckCircle2 } from 'lucide-react';

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

    const width = container.clientWidth || 480;
    const height = container.clientHeight || 340;

    // 1. Scene setup
    const scene = new THREE.Scene();

    // 2. Camera setup (Iso perspective showcasing bike profile)
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 0.45, 2.7);
    camera.lookAt(0, 0, 0);

    // 3. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 4. Studio Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.0);
    keyLight.position.set(4, 5, 4);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x38bdf8, 1.2);
    fillLight.position.set(-4, 3, -2);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xf59e0b, 1.0);
    rimLight.position.set(0, -2, -4);
    scene.add(rimLight);

    // 5. Floor Pedestal & Radial Shadow
    const floorGeo = new THREE.CylinderGeometry(1.4, 1.45, 0.05, 48);
    const floorMat = new THREE.MeshPhongMaterial({
      color: 0x0f172a,
      shininess: 40,
    });
    const pedestal = new THREE.Mesh(floorGeo, floorMat);
    pedestal.position.y = -0.52;
    pedestal.receiveShadow = true;
    scene.add(pedestal);

    // Ring accent on pedestal
    const ringGeo = new THREE.RingGeometry(1.36, 1.39, 48);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -0.494;
    scene.add(ring);

    // Main rotating group
    const rootGroup = new THREE.Group();
    scene.add(rootGroup);
    bikeGroupRef.current = rootGroup;

    // Helper to build procedural bicycle
    const buildProceduralBike = () => {
      const bikeGroup = new THREE.Group();

      const bikeMat = new THREE.MeshPhongMaterial({
        color: new THREE.Color(frameColor),
        shininess: 90,
      });
      const chromeMat = new THREE.MeshPhongMaterial({ color: 0xd4d4d8, shininess: 100 });
      const darkMat = new THREE.MeshPhongMaterial({ color: 0x18181b, shininess: 20 });
      const goldMat = new THREE.MeshPhongMaterial({ color: 0xf59e0b, shininess: 80 });

      const createTube = (from: THREE.Vector3, to: THREE.Vector3, mat: THREE.Material, radius = 0.024) => {
        const dir = new THREE.Vector3().subVectors(to, from);
        const len = dir.length();
        const geo = new THREE.CylinderGeometry(radius, radius, len, 12);
        const mesh = new THREE.Mesh(geo, mat);
        mesh.castShadow = true;
        mesh.position.copy(from).addScaledVector(dir, 0.5);
        mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
        return mesh;
      };

      const bbCenter = new THREE.Vector3(0, -0.15, 0);
      const rearAxle = new THREE.Vector3(-0.52, -0.15, 0);
      const headTop = new THREE.Vector3(0.48, 0.32, 0);
      const headBottom = new THREE.Vector3(0.43, 0.16, 0);
      const seatCluster = new THREE.Vector3(-0.16, 0.24, 0);
      const frontAxle = new THREE.Vector3(0.56, -0.15, 0);

      // Frame Tubes
      bikeGroup.add(createTube(bbCenter, seatCluster, bikeMat));
      bikeGroup.add(createTube(seatCluster, headTop, bikeMat));
      bikeGroup.add(createTube(bbCenter, headBottom, bikeMat, 0.032));
      bikeGroup.add(createTube(headBottom, headTop, bikeMat, 0.030));
      bikeGroup.add(createTube(bbCenter, rearAxle, bikeMat, 0.018));
      bikeGroup.add(createTube(seatCluster, rearAxle, bikeMat, 0.018));

      // Telescopic Front Suspension Fork
      bikeGroup.add(createTube(headBottom, new THREE.Vector3(0.48, 0.0, 0), chromeMat, 0.018));
      bikeGroup.add(createTube(new THREE.Vector3(0.48, 0.0, 0), frontAxle, goldMat, 0.022));

      // Wheels
      [-1, 1].forEach((isRear) => {
        const center = isRear === -1 ? rearAxle : frontAxle;
        const wheelGroup = new THREE.Group();
        wheelGroup.position.copy(center);

        const tire = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.026, 12, 32), darkMat);
        tire.rotation.y = Math.PI / 2;
        tire.castShadow = true;
        wheelGroup.add(tire);

        const rim = new THREE.Mesh(new THREE.TorusGeometry(0.29, 0.012, 8, 32), chromeMat);
        rim.rotation.y = Math.PI / 2;
        wheelGroup.add(rim);

        for (let i = 0; i < 16; i++) {
          const angle = (i / 16) * Math.PI * 2;
          const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.002, 0.28, 4), chromeMat);
          spoke.position.set(0, Math.cos(angle) * 0.14, Math.sin(angle) * 0.14);
          spoke.rotation.x = angle;
          wheelGroup.add(spoke);
        }

        const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.08, 12), chromeMat);
        hub.rotation.z = Math.PI / 2;
        wheelGroup.add(hub);

        bikeGroup.add(wheelGroup);
      });

      // Handlebars
      const stem = createTube(headTop, new THREE.Vector3(0.46, 0.40, 0), chromeMat, 0.016);
      bikeGroup.add(stem);
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.48, 12), darkMat);
      bar.rotation.z = Math.PI / 2;
      bar.position.set(0.46, 0.40, 0);
      bikeGroup.add(bar);

      // Saddle
      const seatPost = createTube(seatCluster, new THREE.Vector3(-0.19, 0.38, 0), chromeMat, 0.016);
      bikeGroup.add(seatPost);
      const saddleGeo = new THREE.BoxGeometry(0.22, 0.04, 0.12);
      const saddle = new THREE.Mesh(saddleGeo, darkMat);
      saddle.position.set(-0.20, 0.40, 0);
      bikeGroup.add(saddle);

      // Battery Pack (Mounted along downtube)
      const battGeo = new THREE.BoxGeometry(0.24, 0.08, 0.07);
      const battMat = new THREE.MeshPhongMaterial({
        color: 0x0284c7,
        emissive: 0x0369a1,
        emissiveIntensity: 0.3,
        shininess: 90,
      });
      const battMesh = new THREE.Mesh(battGeo, battMat);
      battMesh.position.set(0.18, 0.02, 0);
      battMesh.rotation.z = 0.52;
      battMesh.castShadow = true;
      bikeGroup.add(battMesh);

      // Hub Motor / Mid Motor
      const motorGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.09, 16);
      const motorMat = new THREE.MeshPhongMaterial({ color: 0x0f172a, shininess: 80 });
      const motor = new THREE.Mesh(motorGeo, motorMat);
      motor.position.copy(rearAxle);
      motor.rotation.z = Math.PI / 2;
      bikeGroup.add(motor);

      bikeGroup.position.y = -0.05;
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
        // Fallback to procedural model
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

          // Compute bounding box and normalize scale & center
          const box = new THREE.Box3().setFromObject(model);
          const size = box.getSize(new THREE.Vector3());
          const maxDim = Math.max(size.x, size.y, size.z);
          const scale = 1.3 / Math.max(maxDim, 0.001);
          model.scale.setScalar(scale);

          const center = box.getCenter(new THREE.Vector3()).multiplyScalar(scale);
          model.position.sub(center);
          model.position.y -= 0.05;

          // Enable shadows and enhance materials
          model.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              const mesh = child as THREE.Mesh;
              mesh.castShadow = true;
              mesh.receiveShadow = true;
            }
          });

          rootGroup.add(model);
          setIsCustomModelLoaded(true);
          isCustomModelRef.current = true;
          setModelFileName(path.split('/').pop() || 'ebike.glb');
        },
        undefined,
        () => {
          // Try next path
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
      targetRotationYRef.current += deltaX * 0.01;
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
      targetRotationYRef.current += deltaX * 0.01;
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
        targetRotationYRef.current += 0.003;
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
      const newW = container.clientWidth || 480;
      const newH = container.clientHeight || 340;
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
    <div className={`relative w-full h-full min-h-[300px] flex flex-col justify-end select-none ${className}`}>
      {/* 3D Canvas Container */}
      <div
        ref={containerRef}
        className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing rounded-2xl overflow-hidden"
      />

      {/* Top Overlay Badge: Model Status */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
        {isCustomModelLoaded ? (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 text-[11px] font-mono font-bold backdrop-blur-md shadow-lg shadow-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>โมเดลกำหนดเอง: {modelFileName}</span>
          </span>
        ) : (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-[11px] font-mono font-bold backdrop-blur-md shadow-lg">
            <Box className="w-3.5 h-3.5 text-cyan-400" />
            <span>โมเดล 3D จำลอง (พร้อมรับ ebike.glb จาก Blender)</span>
          </span>
        )}
      </div>

      {/* Bottom Floating Controls: 360 Rotation Hint & Rotate Buttons */}
      <div className="relative z-10 p-3 flex items-center justify-between pointer-events-none">
        <span className="text-[10px] font-mono text-slate-400 bg-slate-900/80 px-2.5 py-1 rounded-full border border-slate-800 backdrop-blur-sm">
          🖱️ ลากเมาส์ / สัมผัสเพื่อหมุนดู 360°
        </span>

        <div className="flex items-center gap-1.5 pointer-events-auto">
          <button
            onClick={() => handleRotate(-Math.PI / 4)}
            className="p-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition active:scale-95"
            title="หมุนซ้าย 45°"
          >
            <RotateCw className="w-3.5 h-3.5 -scale-x-100" />
          </button>
          <button
            onClick={() => handleRotate(Math.PI / 4)}
            className="p-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition active:scale-95"
            title="หมุนขวา 45°"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

