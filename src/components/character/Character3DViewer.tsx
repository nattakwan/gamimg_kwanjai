/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Character3DViewer — Interactive 3D Character Renderer with 360° rotation.
 * Faithfully renders stylized 3D characters in the Pixar/ELECTRIO aesthetic:
 * 1. Tech Prodigy Girl ("Electra / Kwanjai"): Side-braid, electric hoodie with lightning badge,
 *    fingerless gloves, and high-tech telemetry tablet in hands.
 * 2. Eccentric Scientist ("Prof. Watt"): Fluffy wild hair, dual forehead electric goggles,
 *    round spectacles, bushy walrus mustache, tweed coat with ID badge, gadget belt, and pet hamster.
 * 3. Adventurer Racer ("Alis"): Spiky hair, trimmed beard, adventurer tunic, leather bracers & pouch.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { CharacterState } from '../../types/game';

interface Character3DViewerProps {
  character: CharacterState;
  height?: number;
  className?: string;
  onRotate?: (angle: number) => void;
}

export const Character3DViewer: React.FC<Character3DViewerProps> = ({
  character,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const characterGroupRef = useRef<THREE.Group | null>(null);
  const targetRotationYRef = useRef<number>(0);
  const currentRotationYRef = useRef<number>(0);
  const isDraggingRef = useRef<boolean>(false);
  const previousMouseXRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);

  const [, setRotationAngle] = useState<number>(0);

  // Manual rotation step
  const handleRotateLeft = useCallback(() => {
    targetRotationYRef.current -= Math.PI / 4;
    setRotationAngle((prev) => prev - 45);
  }, []);

  const handleRotateRight = useCallback(() => {
    targetRotationYRef.current += Math.PI / 4;
    setRotationAngle((prev) => prev + 45);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 360;
    const height = container.clientHeight || 480;

    // 1. Scene
    const scene = new THREE.Scene();

    // 2. Camera — Calibrated for full-body coverage from pedestal ground to hair crest
    const camera = new THREE.PerspectiveCamera(44, width / height, 0.1, 100);
    
    // Dynamic responsive framing: Ensures head & feet are NEVER cut off regardless of screen aspect
    const updateCameraFraming = (w: number, h: number) => {
      const aspect = w / h;
      camera.aspect = aspect;
      if (aspect < 0.75) {
        // Narrow portrait (mobile screens): back up camera so full figure stays completely in view
        camera.position.set(0, 0.95, 3.15 * (0.75 / aspect));
      } else {
        camera.position.set(0, 0.95, 3.15);
      }
      camera.lookAt(0, 0.88, 0);
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    container.appendChild(renderer.domElement);

    updateCameraFraming(width, height);

    // 4. Lights
    const ambientLight = new THREE.AmbientLight(0xfff7ed, 1.15);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x15803d, 0.65);
    scene.add(hemiLight);

    // Main warm sunlight
    const sunLight = new THREE.DirectionalLight(0xfffaea, 1.4);
    sunLight.position.set(3, 5, 4);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.bias = -0.001;
    scene.add(sunLight);

    // Soft rim / backlight for cartoon silhouette pop
    const rimLight = new THREE.DirectionalLight(0x93c5fd, 0.95);
    rimLight.position.set(-3, 3, -3);
    scene.add(rimLight);

    // Fill light from bottom/front
    const fillLight = new THREE.PointLight(0xfef08a, 0.45, 6);
    fillLight.position.set(0, 0.6, 2.2);
    scene.add(fillLight);

    // 5. Grassy Circular Pedestal (Ground Mound)
    const pedestalGroup = new THREE.Group();
    pedestalGroup.position.y = 0;

    const moundGeo = new THREE.CylinderGeometry(0.85, 0.95, 0.14, 32);
    const moundMat = new THREE.MeshStandardMaterial({
      color: 0x3f6212,
      roughness: 0.8,
    });
    const mound = new THREE.Mesh(moundGeo, moundMat);
    mound.position.y = -0.07;
    mound.receiveShadow = true;
    pedestalGroup.add(mound);

    const rimGeo = new THREE.TorusGeometry(0.85, 0.05, 8, 32);
    const rimMat = new THREE.MeshStandardMaterial({ color: 0x4d7c0f, roughness: 0.7 });
    const grassRim = new THREE.Mesh(rimGeo, rimMat);
    grassRim.rotation.x = Math.PI / 2;
    grassRim.position.y = 0;
    pedestalGroup.add(grassRim);

    // Shadow blob under feet
    const shadowGeo = new THREE.CircleGeometry(0.48, 24);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x142b08,
      transparent: true,
      opacity: 0.5,
    });
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.005;
    pedestalGroup.add(shadow);

    scene.add(pedestalGroup);

    // 6. Build Stylized 3D Character Group
    const characterGroup = new THREE.Group();
    characterGroupRef.current = characterGroup;
    scene.add(characterGroup);

    // ── Archetype & Style Deductions ──
    const isGirl = character.gender === 'cadet_girl' || character.bodyType === 'girl';
    const outfitType = character.jacketStyle || 'adventurer_shirt';
    const isProfessor = outfitType === 'tweed_professor' || character.archetype === 'professor';
    const isTechGirl = isGirl && (outfitType === 'tech_hoodie' || character.archetype === 'tech_girl');

    const hasGoggles = character.hasGoggles || isProfessor || character.faceStyle === 7 || character.gogglesStyle === 'twin_tech';
    const hasGlasses = character.hasGlasses || isProfessor || character.faceStyle === 5;
    const hasMustache = !isGirl && (character.hasMustache || isProfessor || character.faceStyle === 5);
    const hasTablet = character.hasTablet || isTechGirl || outfitType === 'tech_hoodie';
    const hasPetHamster = character.hasPetHamster || isProfessor;

    // Helper materials
    const skinColor = new THREE.Color(
      character.skinTone || (isProfessor ? '#fed7aa' : isGirl ? '#ffedd5' : '#fed7aa')
    );
    const skinMat = new THREE.MeshStandardMaterial({
      color: skinColor,
      roughness: 0.52,
      metalness: 0.05,
    });

    // Hair color (Professor default white/gray, Tech Girl auburn/copper, Adventurer brown)
    let hairHex = character.hairColor;
    if (!hairHex) {
      hairHex = isProfessor ? '#e2e8f0' : isGirl ? '#b45309' : '#78350f';
    }
    const hairColor = new THREE.Color(hairHex);
    const hairMat = new THREE.MeshStandardMaterial({
      color: hairColor,
      roughness: 0.48,
      metalness: 0.08,
    });

    // Outfit primary color
    let mainOutfitHex = character.outfitColor || '#f8fafc';
    if (isTechGirl) {
      mainOutfitHex = character.outfitColor && character.outfitColor !== '#f8fafc' ? character.outfitColor : '#0284c7';
    } else if (isProfessor) {
      mainOutfitHex = character.outfitColor && character.outfitColor !== '#f8fafc' ? character.outfitColor : '#a8a29e';
    }
    const outfitColor = new THREE.Color(mainOutfitHex);
    const outfitMat = new THREE.MeshStandardMaterial({
      color: outfitColor,
      roughness: 0.65,
    });

    const pantsColor = new THREE.Color(isTechGirl ? '#1e293b' : isProfessor ? '#57534e' : '#387478');
    const pantsMat = new THREE.MeshStandardMaterial({
      color: pantsColor,
      roughness: 0.7,
    });

    const leatherMat = new THREE.MeshStandardMaterial({
      color: 0x78350f,
      roughness: 0.5,
      metalness: 0.1,
    });

    const darkLeatherMat = new THREE.MeshStandardMaterial({
      color: 0x331e0f,
      roughness: 0.6,
    });

    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.3,
      metalness: 0.8,
    });

    const eyeWhiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    // Iris color: green for Tech Girl (like reference), brown/hazel for others
    const eyeIrisColor = isTechGirl ? 0x15803d : isProfessor ? 0x0284c7 : 0x451a03;
    const eyeIrisMat = new THREE.MeshBasicMaterial({ color: eyeIrisColor });
    const eyePupilMat = new THREE.MeshBasicMaterial({ color: 0x09090b });
    const eyeHighlightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    // ── Head ──
    const headGeo = new THREE.SphereGeometry(0.24, 24, 24);
    headGeo.scale(1, 1.15, 1.05);
    const head = new THREE.Mesh(headGeo, skinMat);
    head.position.y = 1.48;
    head.castShadow = true;
    characterGroup.add(head);

    // Neck
    const neckGeo = new THREE.CylinderGeometry(0.09, 0.11, 0.16, 16);
    const neck = new THREE.Mesh(neckGeo, skinMat);
    neck.position.y = 1.25;
    characterGroup.add(neck);

    // Ears
    [-1, 1].forEach((side) => {
      const earGeo = new THREE.SphereGeometry(0.055, 12, 12);
      earGeo.scale(0.5, 1, 0.8);
      const ear = new THREE.Mesh(earGeo, skinMat);
      ear.position.set(side * 0.23, 1.48, -0.02);
      ear.rotation.y = side * 0.2;
      characterGroup.add(ear);
    });

    // ── Stylized Expressive Eyes ──
    [-1, 1].forEach((side) => {
      const eyeGroup = new THREE.Group();
      eyeGroup.position.set(side * 0.085, 1.51, 0.21);

      // Eye white (Pixar/Disney cartoon scale)
      const scleraGeo = new THREE.SphereGeometry(0.046, 16, 16);
      scleraGeo.scale(1.15, 1.05, 0.4);
      const sclera = new THREE.Mesh(scleraGeo, eyeWhiteMat);
      eyeGroup.add(sclera);

      // Iris
      const irisGeo = new THREE.CircleGeometry(0.030, 16);
      const iris = new THREE.Mesh(irisGeo, eyeIrisMat);
      iris.position.set(0, 0, 0.02);
      eyeGroup.add(iris);

      // Pupil
      const pupilGeo = new THREE.CircleGeometry(0.017, 16);
      const pupil = new THREE.Mesh(pupilGeo, eyePupilMat);
      pupil.position.set(0, 0, 0.022);
      eyeGroup.add(pupil);

      // Primary highlight reflection
      const hi1Geo = new THREE.CircleGeometry(0.009, 12);
      const hi1 = new THREE.Mesh(hi1Geo, eyeHighlightMat);
      hi1.position.set(side * 0.008 + 0.006, 0.009, 0.023);
      eyeGroup.add(hi1);

      // Secondary specular catchlight (cartoon shine)
      const hi2Geo = new THREE.CircleGeometry(0.004, 8);
      const hi2 = new THREE.Mesh(hi2Geo, eyeHighlightMat);
      hi2.position.set(-side * 0.006 - 0.004, -0.008, 0.023);
      eyeGroup.add(hi2);

      characterGroup.add(eyeGroup);

      // Eyebrow
      const browGeo = new THREE.BoxGeometry(0.07, 0.018, 0.02);
      const browMat = new THREE.MeshStandardMaterial({
        color: isProfessor ? 0xffffff : hairColor,
        roughness: 0.5,
      });
      const brow = new THREE.Mesh(browGeo, browMat);
      brow.position.set(side * 0.088, 1.58, 0.23);
      brow.rotation.z = side * -0.12;
      brow.rotation.y = side * 0.08;
      characterGroup.add(brow);
    });

    // Nose
    const noseGeo = new THREE.ConeGeometry(0.026, 0.05, 8);
    noseGeo.scale(1, 1, 0.8);
    const nose = new THREE.Mesh(noseGeo, skinMat);
    nose.position.set(0, 1.45, 0.25);
    nose.rotation.x = -Math.PI / 2 + 0.2;
    characterGroup.add(nose);

    // Smile Mouth
    const mouthGeo = new THREE.TorusGeometry(0.04, 0.009, 8, 16, Math.PI * 0.7);
    const mouthMat = new THREE.MeshBasicMaterial({ color: 0x991b1b });
    const mouth = new THREE.Mesh(mouthGeo, mouthMat);
    mouth.position.set(0, 1.38, 0.22);
    mouth.rotation.x = 0.2;
    mouth.rotation.z = Math.PI * 0.15;
    characterGroup.add(mouth);

    // ── Bushy Walrus Mustache (For Professor / Style 5) ──
    if (hasMustache) {
      const mustacheGroup = new THREE.Group();
      mustacheGroup.position.set(0, 1.41, 0.22);

      [-1, 1].forEach((side) => {
        const halfGeo = new THREE.ConeGeometry(0.05, 0.14, 12);
        halfGeo.scale(1.2, 0.8, 1.0);
        const half = new THREE.Mesh(
          halfGeo,
          new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.6 })
        );
        half.position.set(side * 0.055, -0.01, 0.02);
        half.rotation.z = side * (-Math.PI / 2 + 0.3);
        half.rotation.x = -0.15;
        mustacheGroup.add(half);
      });

      // Center tuft
      const centerTuftGeo = new THREE.SphereGeometry(0.035, 10, 10);
      centerTuftGeo.scale(1.4, 0.8, 1.0);
      const centerTuft = new THREE.Mesh(
        centerTuftGeo,
        new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.6 })
      );
      centerTuft.position.set(0, 0.01, 0.02);
      mustacheGroup.add(centerTuft);

      characterGroup.add(mustacheGroup);
    }

    // ── Round Spectacles / Glasses (Professor / Style 5) ──
    if (hasGlasses) {
      const glassesGroup = new THREE.Group();
      glassesGroup.position.set(0, 1.51, 0.23);

      const glassRimMat = new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        roughness: 0.3,
        metalness: 0.9,
      });

      [-1, 1].forEach((side) => {
        // Round rim
        const rimGeo = new THREE.TorusGeometry(0.055, 0.007, 8, 24);
        const rimMesh = new THREE.Mesh(rimGeo, glassRimMat);
        rimMesh.position.set(side * 0.085, 0, 0);
        glassesGroup.add(rimMesh);

        // Glass reflection plane
        const glassGeo = new THREE.CircleGeometry(0.05, 16);
        const glassMat = new THREE.MeshBasicMaterial({
          color: 0xbae6fd,
          transparent: true,
          opacity: 0.25,
        });
        const glass = new THREE.Mesh(glassGeo, glassMat);
        glass.position.set(side * 0.085, 0, 0.005);
        glassesGroup.add(glass);

        // Side temples going back to ears
        const templeGeo = new THREE.BoxGeometry(0.005, 0.005, 0.22);
        const temple = new THREE.Mesh(templeGeo, glassRimMat);
        temple.position.set(side * 0.14, 0.01, -0.11);
        temple.rotation.y = side * -0.15;
        glassesGroup.add(temple);
      });

      // Center bridge
      const bridgeGeo = new THREE.BoxGeometry(0.045, 0.006, 0.006);
      const bridge = new THREE.Mesh(bridgeGeo, glassRimMat);
      bridge.position.set(0, 0.015, 0);
      glassesGroup.add(bridge);

      characterGroup.add(glassesGroup);
    }

    // ── High-Tech Forehead Electric Goggles (ELECTRIO Professor / Tech) ──
    if (hasGoggles) {
      const gogglesGroup = new THREE.Group();
      gogglesGroup.position.set(0, 1.66, 0.16);
      gogglesGroup.rotation.x = -0.22;

      // Elastic dark head strap
      const strapGeo = new THREE.TorusGeometry(0.24, 0.014, 8, 32);
      const strapMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
      const strap = new THREE.Mesh(strapGeo, strapMat);
      strap.rotation.x = Math.PI / 2;
      strap.position.set(0, -0.04, -0.16);
      gogglesGroup.add(strap);

      // Twin lens barrels
      [-1, 1].forEach((side) => {
        // Barrel cylinder
        const barrelGeo = new THREE.CylinderGeometry(0.046, 0.050, 0.07, 16);
        const barrelMat = new THREE.MeshStandardMaterial({
          color: 0x334155,
          metalness: 0.7,
          roughness: 0.35,
        });
        const barrel = new THREE.Mesh(barrelGeo, barrelMat);
        barrel.rotation.x = Math.PI / 2;
        barrel.position.set(side * 0.075, 0, 0.035);
        gogglesGroup.add(barrel);

        // Metallic front bezel
        const bezelGeo = new THREE.TorusGeometry(0.047, 0.008, 8, 16);
        const bezelMat = new THREE.MeshStandardMaterial({
          color: 0x0284c7,
          metalness: 0.8,
          roughness: 0.2,
        });
        const bezel = new THREE.Mesh(bezelGeo, bezelMat);
        bezel.position.set(side * 0.075, 0, 0.07);
        gogglesGroup.add(bezel);

        // Glowing Cyan Electric Lens
        const lensGeo = new THREE.CircleGeometry(0.040, 16);
        const lensMat = new THREE.MeshStandardMaterial({
          color: 0x38bdf8,
          emissive: 0x0ea5e9,
          emissiveIntensity: 0.7,
          roughness: 0.1,
          metalness: 0.5,
        });
        const lens = new THREE.Mesh(lensGeo, lensMat);
        lens.position.set(side * 0.075, 0, 0.072);
        gogglesGroup.add(lens);
      });

      // Center mount / hinge
      const centerMountGeo = new THREE.BoxGeometry(0.04, 0.03, 0.04);
      const centerMount = new THREE.Mesh(
        centerMountGeo,
        new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.8 })
      );
      centerMount.position.set(0, 0, 0.03);
      gogglesGroup.add(centerMount);

      characterGroup.add(gogglesGroup);
    }

    // ── Beard / Facial Hair (For Adventurer / Boy) ──
    if (!isGirl && !isProfessor && (character.faceStyle === 3 || character.faceStyle === 4)) {
      const beardGroup = new THREE.Group();
      const jawGeo = new THREE.TorusGeometry(0.20, 0.038, 10, 20, Math.PI * 0.9);
      const jawBeard = new THREE.Mesh(jawGeo, hairMat);
      jawBeard.position.set(0, 1.42, 0.08);
      jawBeard.rotation.x = Math.PI / 2 + 0.35;
      jawBeard.rotation.z = -Math.PI * 0.05;
      beardGroup.add(jawBeard);

      const chinGeo = new THREE.SphereGeometry(0.055, 12, 12);
      chinGeo.scale(1.2, 0.8, 1.0);
      const chin = new THREE.Mesh(chinGeo, hairMat);
      chin.position.set(0, 1.32, 0.21);
      beardGroup.add(chin);

      characterGroup.add(beardGroup);
    }

    // ── Hair Style ──
    const hairStyle = character.hairStyle || (isProfessor ? 'wild_scientist' : isGirl ? 'side_braid' : 'spiky');
    const hairGroup = new THREE.Group();
    hairGroup.position.set(0, 1.56, 0);

    if (hairStyle === 'side_braid' || isTechGirl) {
      // 🌟 ELECTRIO Tech Girl Braid & Swept Bangs
      // Main crown cap
      const capGeo = new THREE.SphereGeometry(0.26, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.6);
      const cap = new THREE.Mesh(capGeo, hairMat);
      hairGroup.add(cap);

      // Swept diagonal bangs on forehead (Pixar style)
      for (let i = 0; i < 5; i++) {
        const bangGeo = new THREE.CylinderGeometry(0.04, 0.02, 0.20, 8);
        bangGeo.scale(1.4, 1.0, 0.6);
        const bang = new THREE.Mesh(bangGeo, hairMat);
        bang.position.set(-0.10 + i * 0.05, 0.02 - i * 0.015, 0.16 + (2 - Math.abs(i - 2)) * 0.03);
        bang.rotation.z = -0.4 - i * 0.08;
        bang.rotation.x = -0.3;
        hairGroup.add(bang);
      }

      // Volumetric Side Braid cascading over the right shoulder
      const braidGroup = new THREE.Group();
      braidGroup.position.set(0.18, -0.05, 0.05);

      // Chain of bulbous braided segments
      const segmentCount = 6;
      for (let s = 0; s < segmentCount; s++) {
        const segGeo = new THREE.SphereGeometry(0.052 - s * 0.004, 12, 12);
        segGeo.scale(1.2, 1.4, 0.9);
        const seg = new THREE.Mesh(segGeo, hairMat);
        seg.position.set(
          Math.sin(s * 0.5) * 0.02,
          -s * 0.075,
          0.04 + s * 0.03
        );
        seg.rotation.z = (s % 2 === 0 ? 0.25 : -0.25);
        seg.rotation.x = 0.2;
        braidGroup.add(seg);
      }

      // Hair tie band
      const tieGeo = new THREE.TorusGeometry(0.035, 0.012, 8, 16);
      const tieMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.3 });
      const tie = new THREE.Mesh(tieGeo, tieMat);
      tie.rotation.x = Math.PI / 2;
      tie.position.set(0.01, -0.46, 0.20);
      braidGroup.add(tie);

      // Tassled tail at the end
      const tailGeo = new THREE.ConeGeometry(0.03, 0.09, 8);
      const tail = new THREE.Mesh(tailGeo, hairMat);
      tail.position.set(0.01, -0.52, 0.21);
      tail.rotation.x = 0.3;
      braidGroup.add(tail);

      hairGroup.add(braidGroup);

    } else if (hairStyle === 'wild_scientist' || isProfessor) {
      // 🌟 ELECTRIO Professor Wild Fluffy Hair (Doc Brown / Einstein style)
      // Base cap
      const capGeo = new THREE.SphereGeometry(0.26, 20, 16);
      const cap = new THREE.Mesh(capGeo, hairMat);
      hairGroup.add(cap);

      // Fluffy puffs on sides, temples and back
      const puffPositions = [
        // Left ear & temple
        [-0.24, 0.02, 0.02], [-0.27, -0.05, -0.05], [-0.23, 0.12, -0.10],
        // Right ear & temple
        [0.24, 0.02, 0.02], [0.27, -0.05, -0.05], [0.23, 0.12, -0.10],
        // Back of head
        [0.0, 0.06, -0.25], [-0.14, 0.02, -0.24], [0.14, 0.02, -0.24],
        // Top wild wisps
        [-0.08, 0.24, -0.06], [0.08, 0.25, -0.04], [0.0, 0.26, 0.05]
      ];

      puffPositions.forEach(([px, py, pz]) => {
        const puffGeo = new THREE.SphereGeometry(0.085, 10, 10);
        puffGeo.scale(1.2, 1.1, 1.0);
        const puff = new THREE.Mesh(puffGeo, hairMat);
        puff.position.set(px, py, pz);
        hairGroup.add(puff);
      });

    } else if (hairStyle === 'ponytail') {
      const capGeo = new THREE.SphereGeometry(0.26, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.6);
      const cap = new THREE.Mesh(capGeo, hairMat);
      hairGroup.add(cap);

      const tailGeo = new THREE.CylinderGeometry(0.04, 0.08, 0.35, 12);
      const tail = new THREE.Mesh(tailGeo, hairMat);
      tail.position.set(0, 0.1, -0.28);
      tail.rotation.x = 0.6;
      hairGroup.add(tail);

    } else if (hairStyle === 'sleek_bob') {
      const bobGeo = new THREE.SphereGeometry(0.27, 20, 16);
      bobGeo.scale(1.05, 1.15, 1.1);
      const bob = new THREE.Mesh(bobGeo, hairMat);
      bob.position.set(0, -0.02, -0.02);
      hairGroup.add(bob);

    } else {
      // Spiky Adventurer
      const capGeo = new THREE.SphereGeometry(0.26, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.55);
      const cap = new THREE.Mesh(capGeo, hairMat);
      cap.position.set(0, 0.02, -0.03);
      hairGroup.add(cap);

      const tuftCount = 7;
      for (let i = 0; i < tuftCount; i++) {
        const tGeo = new THREE.ConeGeometry(0.065, 0.16, 8);
        tGeo.scale(1.2, 1, 0.7);
        const tuft = new THREE.Mesh(tGeo, hairMat);
        const xOff = ((i - (tuftCount - 1) / 2) / (tuftCount / 2)) * 0.16;
        tuft.position.set(xOff, 0.15 + (1 - Math.abs(xOff)) * 0.06, 0.10 - Math.abs(xOff) * 0.08);
        tuft.rotation.x = -0.45;
        tuft.rotation.z = -xOff * 1.5;
        hairGroup.add(tuft);
      }
    }

    characterGroup.add(hairGroup);

    // ── Torso / Outfit ──
    const chestGeo = new THREE.BoxGeometry(0.38, 0.42, 0.22);
    const chest = new THREE.Mesh(chestGeo, outfitMat);
    chest.position.set(0, 1.02, 0);
    chest.castShadow = true;
    characterGroup.add(chest);

    // 🌟 Specific Outfit Details:
    if (isTechGirl || outfitType === 'tech_hoodie') {
      // 1. Electric Cyan Hoodie Collar / Hood rim
      const hoodRimGeo = new THREE.TorusGeometry(0.18, 0.045, 8, 20);
      const hoodRim = new THREE.Mesh(hoodRimGeo, outfitMat);
      hoodRim.rotation.x = Math.PI / 2 + 0.2;
      hoodRim.position.set(0, 1.20, -0.04);
      characterGroup.add(hoodRim);

      // Yellow Lightning Bolt Emblem on Chest
      const boltGeo = new THREE.BufferGeometry();
      const boltVerts = new Float32Array([
        // Upper jagged triangle
        -0.01, 1.15, 0.115,
         0.05, 1.15, 0.115,
        -0.03, 1.06, 0.115,
        // Lower jagged triangle
        -0.03, 1.06, 0.115,
         0.03, 1.06, 0.115,
        -0.01, 0.95, 0.115,
      ]);
      boltVerts[0] -= 0.08; boltVerts[3] -= 0.08; boltVerts[6] -= 0.08;
      boltVerts[9] -= 0.08; boltVerts[12] -= 0.08; boltVerts[15] -= 0.08;
      boltGeo.setAttribute('position', new THREE.BufferAttribute(boltVerts, 3));
      const boltMat = new THREE.MeshBasicMaterial({ color: 0xfacc15, side: THREE.DoubleSide });
      const bolt = new THREE.Mesh(boltGeo, boltMat);
      characterGroup.add(bolt);

    } else if (isProfessor) {
      // 2. Professor Tweed Coat + Yellow Inner Sweater
      // Yellow sweater cutout in middle
      const innerSweaterGeo = new THREE.PlaneGeometry(0.12, 0.32);
      const sweaterMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.7 });
      const innerSweater = new THREE.Mesh(innerSweaterGeo, sweaterMat);
      innerSweater.position.set(0, 1.05, 0.112);
      characterGroup.add(innerSweater);

      // Coat Lapels
      [-1, 1].forEach((side) => {
        const lapelGeo = new THREE.BoxGeometry(0.06, 0.32, 0.02);
        const lapel = new THREE.Mesh(lapelGeo, outfitMat);
        lapel.position.set(side * 0.08, 1.05, 0.118);
        lapel.rotation.z = side * -0.15;
        characterGroup.add(lapel);
      });

      // Security ID Badge on left chest
      const idBadgeGeo = new THREE.BoxGeometry(0.05, 0.065, 0.01);
      const idBadgeMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
      const idBadge = new THREE.Mesh(idBadgeGeo, idBadgeMat);
      idBadge.position.set(0.11, 1.10, 0.12);
      characterGroup.add(idBadge);

      // Blue photo stripe on ID badge
      const stripeGeo = new THREE.PlaneGeometry(0.035, 0.02);
      const stripeMat = new THREE.MeshBasicMaterial({ color: 0x0284c7 });
      const stripe = new THREE.Mesh(stripeGeo, stripeMat);
      stripe.position.set(0.11, 1.11, 0.128);
      characterGroup.add(stripe);

    } else {
      // 3. Adventurer Tunic Lapels & V-neck
      const vSkinGeo = new THREE.BufferGeometry();
      const vVertices = new Float32Array([
        -0.08, 1.23, 0.115,
         0.08, 1.23, 0.115,
         0.0,  1.08, 0.115,
      ]);
      vSkinGeo.setAttribute('position', new THREE.BufferAttribute(vVertices, 3));
      const vSkin = new THREE.Mesh(vSkinGeo, skinMat);
      characterGroup.add(vSkin);

      [-1, 1].forEach((side) => {
        const collarGeo = new THREE.BoxGeometry(0.04, 0.16, 0.02);
        const collar = new THREE.Mesh(collarGeo, outfitMat);
        collar.position.set(side * 0.08, 1.18, 0.12);
        collar.rotation.z = side * -0.4;
        characterGroup.add(collar);
      });
    }

    // ── Belt & Buckle ──
    const beltGeo = new THREE.BoxGeometry(0.40, 0.08, 0.24);
    const belt = new THREE.Mesh(beltGeo, isProfessor ? darkLeatherMat : leatherMat);
    belt.position.set(0, 0.81, 0);
    characterGroup.add(belt);

    if (isProfessor) {
      // High-tech battery gadget buckle with LED indicators
      const gadgetBuckleGeo = new THREE.BoxGeometry(0.12, 0.09, 0.04);
      const gadgetBuckleMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8 });
      const gadgetBuckle = new THREE.Mesh(gadgetBuckleGeo, gadgetBuckleMat);
      gadgetBuckle.position.set(0, 0.81, 0.13);
      characterGroup.add(gadgetBuckle);

      // Red & Green LED lights
      const ledGeo = new THREE.SphereGeometry(0.012, 8, 8);
      const redLed = new THREE.Mesh(ledGeo, new THREE.MeshBasicMaterial({ color: 0xef4444 }));
      redLed.position.set(-0.03, 0.81, 0.155);
      characterGroup.add(redLed);

      const greenLed = new THREE.Mesh(ledGeo, new THREE.MeshBasicMaterial({ color: 0x22c55e }));
      greenLed.position.set(0.03, 0.81, 0.155);
      characterGroup.add(greenLed);

    } else {
      // Golden rectangular buckle & side leather pouch
      const buckleGeo = new THREE.BoxGeometry(0.09, 0.07, 0.02);
      const buckle = new THREE.Mesh(buckleGeo, goldMat);
      buckle.position.set(0, 0.81, 0.125);
      characterGroup.add(buckle);

      const pouchGeo = new THREE.BoxGeometry(0.09, 0.12, 0.07);
      const pouch = new THREE.Mesh(pouchGeo, darkLeatherMat);
      pouch.position.set(-0.21, 0.77, 0.02);
      pouch.rotation.z = 0.15;
      characterGroup.add(pouch);
    }

    // ── Arms & Props (Tablet or Hamster or Idle) ──
    if (hasTablet) {
      // 🌟 Tech Girl holding Golden Telemetry Tablet in hands
      // Left arm bending forward to hold left of tablet
      const leftArmGroup = new THREE.Group();
      leftArmGroup.position.set(-0.22, 1.14, 0);
      leftArmGroup.rotation.x = -0.65;
      leftArmGroup.rotation.y = 0.40;
      leftArmGroup.rotation.z = -0.15;

      const lArmGeo = new THREE.CylinderGeometry(0.055, 0.048, 0.32, 12);
      const lArm = new THREE.Mesh(lArmGeo, outfitMat);
      lArm.position.set(0, -0.16, 0);
      leftArmGroup.add(lArm);

      // Dark tech fingerless glove
      const lHandGeo = new THREE.SphereGeometry(0.042, 12, 12);
      const gloveMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 });
      const lHand = new THREE.Mesh(lHandGeo, gloveMat);
      lHand.position.set(0, -0.34, 0);
      leftArmGroup.add(lHand);
      characterGroup.add(leftArmGroup);

      // Right arm bending forward to hold right of tablet
      const rightArmGroup = new THREE.Group();
      rightArmGroup.position.set(0.22, 1.14, 0);
      rightArmGroup.rotation.x = -0.65;
      rightArmGroup.rotation.y = -0.40;
      rightArmGroup.rotation.z = 0.15;

      const rArmGeo = new THREE.CylinderGeometry(0.055, 0.048, 0.32, 12);
      const rArm = new THREE.Mesh(rArmGeo, outfitMat);
      rArm.position.set(0, -0.16, 0);
      rightArmGroup.add(rArm);

      const rHandGeo = new THREE.SphereGeometry(0.042, 12, 12);
      const rHand = new THREE.Mesh(rHandGeo, gloveMat);
      rHand.position.set(0, -0.34, 0);
      rightArmGroup.add(rHand);
      characterGroup.add(rightArmGroup);

      // High-Tech Telemetry Tablet
      const tabletGroup = new THREE.Group();
      tabletGroup.position.set(0, 0.98, 0.28);
      tabletGroup.rotation.x = -0.35;

      // Golden casing
      const casingGeo = new THREE.BoxGeometry(0.25, 0.17, 0.016);
      const casingMat = new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        metalness: 0.4,
        roughness: 0.3,
      });
      const casing = new THREE.Mesh(casingGeo, casingMat);
      tabletGroup.add(casing);

      // Glowing Circuit Screen
      const screenGeo = new THREE.PlaneGeometry(0.22, 0.14);
      const screenMat = new THREE.MeshStandardMaterial({
        color: 0x0ea5e9,
        emissive: 0x0284c7,
        emissiveIntensity: 0.65,
        roughness: 0.2,
      });
      const screen = new THREE.Mesh(screenGeo, screenMat);
      screen.position.set(0, 0, 0.01);
      tabletGroup.add(screen);

      // Orange telemetry bars on screen
      [-0.06, -0.02, 0.02, 0.06].forEach((x, idx) => {
        const barGeo = new THREE.PlaneGeometry(0.025, 0.05 + idx * 0.02);
        const barMat = new THREE.MeshBasicMaterial({ color: 0xf97316 });
        const bar = new THREE.Mesh(barGeo, barMat);
        bar.position.set(x, -0.02 + idx * 0.01, 0.012);
        tabletGroup.add(bar);
      });

      characterGroup.add(tabletGroup);

    } else if (isProfessor) {
      // 🌟 Professor with Left Hand holding Cute Pet Hamster & Right Hand in Eureka Pose
      // Right Arm: Pointing / Eureka pose
      const rightArmGroup = new THREE.Group();
      rightArmGroup.position.set(0.24, 1.18, 0);
      rightArmGroup.rotation.z = 0.4;
      rightArmGroup.rotation.x = -0.5;

      const rArmGeo = new THREE.CylinderGeometry(0.062, 0.054, 0.32, 12);
      const rArm = new THREE.Mesh(rArmGeo, outfitMat);
      rArm.position.set(0, -0.16, 0);
      rightArmGroup.add(rArm);

      const rHandGeo = new THREE.SphereGeometry(0.045, 12, 12);
      const rHand = new THREE.Mesh(rHandGeo, skinMat);
      rHand.position.set(0, -0.34, 0);
      rightArmGroup.add(rHand);

      // Extended index finger ("Eureka!")
      const fingerGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.06, 8);
      const finger = new THREE.Mesh(fingerGeo, skinMat);
      finger.position.set(0, -0.38, 0.02);
      finger.rotation.x = -Math.PI / 2;
      rightArmGroup.add(finger);
      characterGroup.add(rightArmGroup);

      // Left Arm: Cupped forward holding Pet Hamster
      const leftArmGroup = new THREE.Group();
      leftArmGroup.position.set(-0.24, 1.18, 0);
      leftArmGroup.rotation.x = -0.8;
      leftArmGroup.rotation.y = 0.3;

      const lArmGeo = new THREE.CylinderGeometry(0.062, 0.054, 0.32, 12);
      const lArm = new THREE.Mesh(lArmGeo, outfitMat);
      lArm.position.set(0, -0.16, 0);
      leftArmGroup.add(lArm);

      const lHandGeo = new THREE.SphereGeometry(0.048, 12, 12);
      const lHand = new THREE.Mesh(lHandGeo, skinMat);
      lHand.position.set(0, -0.34, 0);
      leftArmGroup.add(lHand);

      // 🐹 Cute Chubby Pet Hamster ("Ampere") sitting on the palm
      if (hasPetHamster) {
        const hamsterGroup = new THREE.Group();
        hamsterGroup.position.set(0, -0.33, 0.06);

        // Chubby Golden Body
        const hamBodyGeo = new THREE.SphereGeometry(0.045, 14, 14);
        hamBodyGeo.scale(1.0, 1.15, 1.2);
        const hamBodyMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.7 });
        const hamBody = new THREE.Mesh(hamBodyGeo, hamBodyMat);
        hamsterGroup.add(hamBody);

        // Cream white tummy
        const hamTummyGeo = new THREE.SphereGeometry(0.038, 12, 12);
        hamTummyGeo.scale(0.9, 1.0, 0.5);
        const hamTummyMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.7 });
        const hamTummy = new THREE.Mesh(hamTummyGeo, hamTummyMat);
        hamTummy.position.set(0, -0.01, 0.035);
        hamsterGroup.add(hamTummy);

        // Cute Little Ears
        [-1, 1].forEach((eSide) => {
          const earGeo = new THREE.SphereGeometry(0.015, 8, 8);
          const earMat = new THREE.MeshStandardMaterial({ color: 0xf472b6, roughness: 0.6 });
          const ear = new THREE.Mesh(earGeo, earMat);
          ear.position.set(eSide * 0.032, 0.04, 0.01);
          hamsterGroup.add(ear);

          // Black bead eye
          const eyeGeo = new THREE.SphereGeometry(0.007, 8, 8);
          const hamEye = new THREE.Mesh(eyeGeo, new THREE.MeshBasicMaterial({ color: 0x000000 }));
          hamEye.position.set(eSide * 0.024, 0.015, 0.05);
          hamsterGroup.add(hamEye);
        });

        // Little Pink Nose
        const noseG = new THREE.SphereGeometry(0.006, 6, 6);
        const noseM = new THREE.Mesh(noseG, new THREE.MeshBasicMaterial({ color: 0xf43f5e }));
        noseM.position.set(0, 0.005, 0.058);
        hamsterGroup.add(noseM);

        leftArmGroup.add(hamsterGroup);
      }

      characterGroup.add(leftArmGroup);

    } else {
      // 🌟 Adventurer Relaxed Arms with Leather Bracers
      [-1, 1].forEach((side) => {
        const armGroup = new THREE.Group();
        armGroup.position.set(side * 0.24, 1.18, 0);

        const upperArmGeo = new THREE.CylinderGeometry(0.065, 0.06, 0.18, 12);
        const upperArm = new THREE.Mesh(upperArmGeo, outfitMat);
        upperArm.position.set(0, -0.09, 0);
        armGroup.add(upperArm);

        const cuffGeo = new THREE.TorusGeometry(0.068, 0.015, 8, 16);
        const cuff = new THREE.Mesh(cuffGeo, outfitMat);
        cuff.rotation.x = Math.PI / 2;
        cuff.position.set(0, -0.17, 0);
        armGroup.add(cuff);

        const bracerGeo = new THREE.CylinderGeometry(0.055, 0.048, 0.18, 12);
        const bracer = new THREE.Mesh(bracerGeo, leatherMat);
        bracer.position.set(0, -0.27, 0.02);
        armGroup.add(bracer);

        [-0.23, -0.31].forEach((yPos) => {
          const strapGeo = new THREE.TorusGeometry(0.058, 0.008, 6, 16);
          const strap = new THREE.Mesh(strapGeo, darkLeatherMat);
          strap.rotation.x = Math.PI / 2;
          strap.position.set(0, yPos, 0.02);
          armGroup.add(strap);
        });

        const handGeo = new THREE.SphereGeometry(0.045, 12, 12);
        handGeo.scale(0.8, 1.2, 0.8);
        const hand = new THREE.Mesh(handGeo, skinMat);
        hand.position.set(0, -0.40, 0.02);
        armGroup.add(hand);

        armGroup.rotation.z = side * -0.12;
        armGroup.rotation.x = 0.08;
        characterGroup.add(armGroup);
      });
    }

    // ── Pants / Legs ──
    const hipGeo = new THREE.BoxGeometry(0.36, 0.16, 0.22);
    const hip = new THREE.Mesh(hipGeo, pantsMat);
    hip.position.set(0, 0.72, 0);
    characterGroup.add(hip);

    [-1, 1].forEach((side) => {
      const legGroup = new THREE.Group();
      legGroup.position.set(side * 0.10, 0.64, 0);

      const thighGeo = new THREE.CylinderGeometry(0.075, 0.065, 0.28, 12);
      const thigh = new THREE.Mesh(thighGeo, pantsMat);
      thigh.position.set(0, -0.14, 0);
      legGroup.add(thigh);

      const pCuffGeo = new THREE.TorusGeometry(0.07, 0.015, 8, 16);
      const pCuff = new THREE.Mesh(pCuffGeo, pantsMat);
      pCuff.rotation.x = Math.PI / 2;
      pCuff.position.set(0, -0.27, 0);
      legGroup.add(pCuff);

      const calfGeo = new THREE.CylinderGeometry(0.05, 0.045, 0.18, 12);
      const calf = new THREE.Mesh(calfGeo, isTechGirl ? pantsMat : skinMat);
      calf.position.set(0, -0.37, 0);
      legGroup.add(calf);

      // Boots
      const bootColor = isTechGirl ? 0x0284c7 : isProfessor ? 0x44403c : 0x78350f;
      const bootMat = new THREE.MeshStandardMaterial({ color: bootColor, roughness: 0.5 });

      const bootCuffGeo = new THREE.CylinderGeometry(0.062, 0.058, 0.08, 12);
      const bootCuff = new THREE.Mesh(bootCuffGeo, bootMat);
      bootCuff.position.set(0, -0.48, 0.02);
      legGroup.add(bootCuff);

      const footGeo = new THREE.BoxGeometry(0.10, 0.09, 0.18);
      const foot = new THREE.Mesh(footGeo, isTechGirl ? darkLeatherMat : bootMat);
      foot.position.set(0, -0.55, 0.05);
      legGroup.add(foot);

      characterGroup.add(legGroup);
    });

    // Sole of boot rests firmly on grass pedestal surface at Y=0
    characterGroup.position.y = 0.0;

    // 7. Mouse / Touch Drag to Rotate 360°
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      isDraggingRef.current = true;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      previousMouseXRef.current = clientX;
    };

    const onPointerMove = (e: MouseEvent | TouchEvent) => {
      if (!isDraggingRef.current) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const deltaX = clientX - previousMouseXRef.current;
      previousMouseXRef.current = clientX;

      targetRotationYRef.current += deltaX * 0.015;
    };

    const onPointerUp = () => {
      isDraggingRef.current = false;
    };

    container.addEventListener('mousedown', onPointerDown);
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);

    container.addEventListener('touchstart', onPointerDown, { passive: true });
    window.addEventListener('touchmove', onPointerMove, { passive: true });
    window.addEventListener('touchend', onPointerUp);

    // 8. Animation & Render Loop
    const clock = new THREE.Clock();

    const animate = () => {
      const elapsedTime = clock.getElapsedTime();

      // Smooth rotation interpolation
      currentRotationYRef.current +=
        (targetRotationYRef.current - currentRotationYRef.current) * 0.12;
      characterGroup.rotation.y = currentRotationYRef.current;

      // Subtle breathing / idle animation
      const breath = Math.sin(elapsedTime * 2.2) * 0.006;
      chest.scale.set(1 + breath, 1 + breath, 1 + breath * 1.5);
      head.position.y = 1.48 + breath * 0.5;

      renderer.render(scene, camera);
      animFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    // 9. Resize Handling
    const handleResize = () => {
      if (!container) return;
      const newW = container.clientWidth || 360;
      const newH = container.clientHeight || 480;
      updateCameraFraming(newW, newH);
    };

    window.addEventListener('resize', handleResize);

    // 10. Cleanup
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('mouseup', onPointerUp);
      container.removeEventListener('touchstart', onPointerDown);
      window.removeEventListener('touchmove', onPointerMove);
      window.removeEventListener('touchend', onPointerUp);

      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry?.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material?.dispose();
          }
        }
      });

      renderer.dispose();
      if (renderer.domElement.parentElement) {
        renderer.domElement.parentElement.removeChild(renderer.domElement);
      }
    };
  }, [character]);

  return (
    <div className={`relative w-full h-full flex flex-col items-center justify-center select-none ${className}`}>
      {/* 3D WebGL Canvas Container — Tooltip removed to prevent pop-up overlap on steppers */}
      <div
        ref={containerRef}
        className="w-full h-full min-h-[300px] cursor-grab active:cursor-grabbing flex items-center justify-center touch-none"
      />

      {/* Subtle Rotation Controls at Bottom Right Corner (Never obscuring feet/pedestal) */}
      <div className="absolute bottom-2 right-2 flex items-center gap-1 pointer-events-auto z-10">
        <button
          type="button"
          onClick={handleRotateLeft}
          className="w-7 h-7 rounded-lg bg-white/80 hover:bg-white text-slate-700 shadow-sm flex items-center justify-center transition-all cursor-pointer backdrop-blur-md border border-slate-200 active:scale-90"
          title="หมุนซ้าย"
        >
          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
            <path d="M12.5 8c-2.65 0-5.05 1-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z" />
          </svg>
        </button>

        <button
          type="button"
          onClick={handleRotateRight}
          className="w-7 h-7 rounded-lg bg-white/80 hover:bg-white text-slate-700 shadow-sm flex items-center justify-center transition-all cursor-pointer backdrop-blur-md border border-slate-200 active:scale-90"
          title="หมุนขวา"
        >
          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
            <path d="M11.5 8c2.65 0 5.05 1 6.9 2.6L22 7v9h-9l3.62-3.62c-1.39-1.16-3.16-1.88-5.12-1.88-3.54 0-6.55 2.31-7.6 5.5l-2.37-.78C2.92 11.03 6.85 8 11.5 8z" />
          </svg>
        </button>
      </div>
    </div>
  );
};
