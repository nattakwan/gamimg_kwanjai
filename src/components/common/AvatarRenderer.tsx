/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { CharacterState } from '../../types/game';

interface AvatarRendererProps {
  avatar: CharacterState;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  mode?: '3d' | '2d';
  enableRotation?: boolean;
  className?: string;
}

export const AvatarRenderer: React.FC<AvatarRendererProps> = ({
  avatar,
  size = 'md',
  mode = '3d',
  enableRotation = true,
  className = '',
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [webGlSupported, setWebGlSupported] = useState(true);

  const sizeMap = {
    sm: { width: 44, height: 44, scale: 0.5 },
    md: { width: 90, height: 100, scale: 0.8 },
    lg: { width: 180, height: 210, scale: 1.0 },
    xl: { width: 260, height: 300, scale: 1.2 },
  };

  const currentSize = sizeMap[size];

  useEffect(() => {
    if (mode === '2d' || !mountRef.current) return;

    let renderer: THREE.WebGLRenderer | null = null;
    let scene: THREE.Scene | null = null;
    let camera: THREE.PerspectiveCamera | null = null;
    let frameId: number;

    try {
      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(
        40,
        currentSize.width / currentSize.height,
        0.1,
        1000
      );
      camera.position.set(0, 0.4, 2.6);

      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      renderer.setSize(currentSize.width, currentSize.height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

      // Lights
      const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
      scene.add(ambientLight);

      const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
      dirLight.position.set(2, 4, 3);
      scene.add(dirLight);

      // Character Group
      const charGroup = new THREE.Group();

      // Head
      const skinColor = new THREE.Color(avatar.skinTone || '#fed7aa');
      const headGeo = new THREE.SphereGeometry(0.35, 24, 24);
      const headMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.6 });
      const head = new THREE.Mesh(headGeo, headMat);
      head.position.y = 0.5;
      charGroup.add(head);

      // Hair
      const hairColor = new THREE.Color(avatar.hairColor || '#f59e0b');
      const hairMat = new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.4 });
      const hairGeo = new THREE.ConeGeometry(0.4, 0.35, 16);
      const hair = new THREE.Mesh(hairGeo, hairMat);
      hair.position.set(0, 0.8, -0.05);
      hair.rotation.x = -0.2;
      charGroup.add(hair);

      // Goggles
      if (avatar.gogglesStyle && avatar.gogglesStyle !== 'none') {
        const goggleGeo = new THREE.TorusGeometry(0.12, 0.04, 8, 16);
        const goggleMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.8 });
        const goggleL = new THREE.Mesh(goggleGeo, goggleMat);
        goggleL.position.set(-0.14, 0.55, 0.3);
        const goggleR = new THREE.Mesh(goggleGeo, goggleMat);
        goggleR.position.set(0.14, 0.55, 0.3);
        charGroup.add(goggleL);
        charGroup.add(goggleR);
      }

      // Torso / Suit
      const outfitColor = new THREE.Color(avatar.outfitColor || '#0284c7');
      const bodyGeo = new THREE.CylinderGeometry(0.28, 0.22, 0.65, 16);
      const bodyMat = new THREE.MeshStandardMaterial({ color: outfitColor, roughness: 0.5 });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.y = -0.05;
      charGroup.add(body);

      // Shoulders & Arms
      const armGeo = new THREE.CylinderGeometry(0.08, 0.07, 0.45, 12);
      const armMat = new THREE.MeshStandardMaterial({ color: outfitColor, roughness: 0.5 });
      const armL = new THREE.Mesh(armGeo, armMat);
      armL.position.set(-0.35, -0.05, 0);
      armL.rotation.z = 0.3;
      const armR = new THREE.Mesh(armGeo, armMat);
      armR.position.set(0.35, -0.05, 0);
      armR.rotation.z = -0.3;
      charGroup.add(armL);
      charGroup.add(armR);

      scene.add(charGroup);

      mountRef.current.appendChild(renderer.domElement);

      const animate = () => {
        if (enableRotation && charGroup) {
          charGroup.rotation.y += 0.008;
        }
        renderer?.render(scene!, camera!);
        frameId = requestAnimationFrame(animate);
      };
      animate();

      return () => {
        cancelAnimationFrame(frameId);
        if (renderer && renderer.domElement && renderer.domElement.parentNode) {
          renderer.domElement.parentNode.removeChild(renderer.domElement);
        }
        renderer?.dispose();
      };
    } catch {
      setWebGlSupported(false);
    }
  }, [avatar, mode, size, enableRotation]);

  if (mode === '2d' || !webGlSupported) {
    return (
      <div
        className={`relative flex items-center justify-center rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 overflow-hidden shadow-inner ${className}`}
        style={{ width: currentSize.width, height: currentSize.height }}
      >
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full p-1"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Hair back */}
          <circle cx="50" cy="40" r="28" fill={avatar.hairColor || '#f59e0b'} />
          {/* Body */}
          <path
            d="M 22 92 C 22 68 78 68 78 92 Z"
            fill={avatar.outfitColor || '#0284c7'}
          />
          {/* Head */}
          <circle cx="50" cy="42" r="20" fill={avatar.skinTone || '#fed7aa'} />
          {/* Eyes */}
          <circle cx="43" cy="40" r="2.5" fill="#0f172a" />
          <circle cx="57" cy="40" r="2.5" fill="#0f172a" />
          <circle cx="44" cy="39" r="0.8" fill="#ffffff" />
          <circle cx="58" cy="39" r="0.8" fill="#ffffff" />
          {/* Smile */}
          <path
            d="M 45 49 Q 50 54 55 49"
            stroke="#0f172a"
            strokeWidth="2"
            strokeLinecap="round"
          />
          {/* Goggles if enabled */}
          {avatar.gogglesStyle && avatar.gogglesStyle !== 'none' && (
            <g stroke="#0284c7" strokeWidth="2.5" fill="rgba(56, 189, 248, 0.4)">
              <rect x="33" y="34" width="14" height="11" rx="3" />
              <rect x="53" y="34" width="14" height="11" rx="3" />
              <line x1="47" y1="39" x2="53" y2="39" strokeWidth="2" />
            </g>
          )}
        </svg>
      </div>
    );
  }

  return (
    <div
      ref={mountRef}
      className={`relative flex items-center justify-center cursor-grab active:cursor-grabbing ${className}`}
      style={{ width: currentSize.width, height: currentSize.height }}
    />
  );
};
