/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Racing3DRenderer — Full Three.js 3D race scene engine for Battery Quest.
 * Features:
 * 1. Robust elevated highway roadbed with 3D concrete deck thickness (no z-fighting or gaps).
 * 2. Continuous 3D guardrail ribbons with reflector posts (inspired by mountain highway racing).
 * 3. Seamless closed-loop track math with centripetal Catmull-Rom splines.
 * 4. Procedural Stylized Cyclists faithfully matching the Character Creator
 *    (Tech Prodigy Kwanjai with side-braid & lightning hoodie, Prof. Watt with wild hair & goggles,
 *     Alis with spiky hair & bracers, and AI opponents).
 * 5. Two-Bone Inverse Kinematics (IK) pedaling animation locking feet to rotating pedals.
 */

import * as THREE from 'three';
import { CharacterState } from '../types/game';

// ─── Track Geometry Constants ───────────────────────────────────────────────

const ROAD_HALF_WIDTH = 5.5;      // 11 m wide asphalt highway
const KERB_WIDTH = 0.8;           // Red/white kerbs
const SHOULDER_WIDTH = 1.4;       // Outer shoulder
const DECK_LIFT = 0.85;           // Elevates roadbed above terrain (eliminates clipping & horizon gaps)
const DECK_THICKNESS = 0.50;      // 3D concrete slab thickness
const RAIL_HEIGHT = 0.85;         // Guardrail height above deck
const RAIL_BASE = 0.25;           // Guardrail lower ribbon bound
const RAIL_OFFSET = 0.15;         // Guardrail lateral offset on shoulder
const TRACK_SAMPLES = 800;        // Arc-length samples for continuous smooth curves
const FOG_NEAR = 120;
const FOG_FAR = 650;              // Visible distance for highway horizon

function hexColor(hex: string): THREE.Color {
  return new THREE.Color(hex);
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

// ─── Track Control Points ───────────────────────────────────────────────────

function getTrackPoints(trackId: string): THREE.Vector3[] {
  if (trackId === 'hill_climb') {
    // Undulating uphill highway with realistic slope physics:
    // Climb (+14%) -> Downhill Valley (-9%) -> Second Mountain Climb to Summit (+16%)
    return [
      new THREE.Vector3(0, 0, 0),             // 0m (Y: 0m)
      new THREE.Vector3(30, 2.5, -40),        // 50m (Y: 2.5m)
      new THREE.Vector3(75, 7.5, -75),        // 110m (Y: 7.5m) - base of mountain
      new THREE.Vector3(95, 16.0, -130),      // 175m (Y: 16m) - steep climb (+14%)
      new THREE.Vector3(60, 26.0, -180),      // 240m (Y: 26m) - near first peak
      new THREE.Vector3(15, 29.5, -205),      // 275m (Y: 29.5m) - crest
      new THREE.Vector3(-35, 23.5, -225),     // 325m (Y: 23.5m) - downhill descent (-9%)
      new THREE.Vector3(-80, 20.0, -210),     // 365m (Y: 20m) - valley bottom
      new THREE.Vector3(-115, 28.5, -165),    // 425m (Y: 28.5m) - second mountain climb (+15%)
      new THREE.Vector3(-125, 38.5, -115),    // 485m (Y: 38.5m) - steep switchback (+16%)
      new THREE.Vector3(-95, 43.5, -65),      // 545m (Y: 43.5m) - summit
      new THREE.Vector3(-55, 42.0, -30),      // 600m (Y: 42m) - mountain top finish line
    ];
  }
  if (trackId === 'endurance_route') {
    // Rolling hills figure-8 circuit
    return [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(50, 2, -40),
      new THREE.Vector3(100, 4, -20),
      new THREE.Vector3(135, 2, -60),
      new THREE.Vector3(105, 5, -110),
      new THREE.Vector3(50, 7, -130),
      new THREE.Vector3(0, 4, -100),
      new THREE.Vector3(-50, 2, -70),
      new THREE.Vector3(-80, 0, -30),
      new THREE.Vector3(-50, 1, 10),
    ];
  }
  // flat_sprint — 12 control points for smooth highway oval with gentle 3D elevation camber
  return [
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(45, 0.3, -5),
    new THREE.Vector3(95, 0.7, -10),
    new THREE.Vector3(145, 1.1, -25),
    new THREE.Vector3(180, 1.4, -60),
    new THREE.Vector3(175, 1.6, -105),
    new THREE.Vector3(135, 1.3, -135),
    new THREE.Vector3(85, 0.9, -145),
    new THREE.Vector3(30, 0.5, -135),
    new THREE.Vector3(-20, 0.2, -105),
    new THREE.Vector3(-45, 0.1, -65),
    new THREE.Vector3(-25, 0.0, -25),
  ];
}

// ─── Cyclist Parts & IK Interface ──────────────────────────────────────────

interface CyclistParts {
  group: THREE.Group;
  rollPivot: THREE.Group;
  steerPivot: THREE.Group;
  pelvisGroup: THREE.Group;
  torsoGroup: THREE.Group;
  headGroup: THREE.Group;
  body: THREE.Mesh;
  head: THREE.Mesh;
  helmet?: THREE.Mesh;
  leftUpperArm: THREE.Mesh;
  leftForeArm: THREE.Mesh;
  leftElbow: THREE.Mesh;
  rightUpperArm: THREE.Mesh;
  rightForeArm: THREE.Mesh;
  rightElbow: THREE.Mesh;
  leftUpperLeg: THREE.Mesh;
  leftLowerLeg: THREE.Mesh;
  rightUpperLeg: THREE.Mesh;
  rightLowerLeg: THREE.Mesh;
  leftKneeJoint: THREE.Mesh;
  rightKneeJoint: THREE.Mesh;
  leftShoe: THREE.Mesh;
  rightShoe: THREE.Mesh;
  leftPedalPivot: THREE.Group;
  rightPedalPivot: THREE.Group;
  crankGroup: THREE.Group;
  frontWheel: THREE.Group;
  rearWheel: THREE.Group;
  frame: THREE.Group;
  motorGlow: THREE.PointLight;
  batteryLed: THREE.Mesh;
  nameSprite: THREE.Sprite;
  brakeParticles: THREE.Points;
  updateKinematics: (crankAngle: number, speedMps: number, dt: number) => void;
  updateLegIK: (crankAngle: number) => void;
  currentLean: number;
  currentSteer: number;
  prevX: number;
}

// ─── Two-Bone Inverse Kinematics Helper ─────────────────────────────────────

function solveTwoBoneIK(
  root: THREE.Vector3,
  target: THREE.Vector3,
  L1: number,
  L2: number,
  pole: THREE.Vector3
): THREE.Vector3 {
  const delta = new THREE.Vector3().subVectors(target, root);
  let d = delta.length();
  const minReach = Math.abs(L1 - L2) + 0.001;
  const maxReach = L1 + L2 - 0.001;
  d = THREE.MathUtils.clamp(d, minReach, maxReach);

  const u = delta.clone().normalize();
  const a = (L1 * L1 - L2 * L2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, L1 * L1 - a * a));

  const n = pole.clone().sub(u.clone().multiplyScalar(pole.dot(u))).normalize();
  if (n.lengthSq() < 0.0001) {
    n.set(0, 0, 1).cross(u).normalize();
  }

  return root.clone().add(u.multiplyScalar(a)).add(n.multiplyScalar(h));
}

// Helper to orient and scale a cylinder between two 3D points
function alignSegmentBetween(mesh: THREE.Mesh, from: THREE.Vector3, to: THREE.Vector3, nominalLen = 1) {
  const dir = new THREE.Vector3().subVectors(to, from);
  const len = dir.length();
  mesh.position.copy(from).add(to).multiplyScalar(0.5);
  mesh.scale.set(1, len / nominalLen, 1);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
}

// ─── Procedural Cyclist Builder (Matching Character Creator) ───────────────

function createCyclist(
  name: string,
  jerseyColor: string,
  bikeColor: string,
  isPlayer: boolean,
  char?: CharacterState
): CyclistParts {
  const group = new THREE.Group();
  const rollPivot = new THREE.Group();
  group.add(rollPivot);

  // Deduce character archetype
  const isGirl = char ? (char.gender === 'cadet_girl' || char.bodyType === 'girl') : false;
  const isProfessor = char ? (char.jacketStyle === 'tweed_professor' || char.archetype === 'professor') : false;
  const isTechGirl = char ? (isGirl && (char.jacketStyle === 'tech_hoodie' || char.archetype === 'tech_girl')) : false;

  const hasGoggles = char ? (char.hasGoggles || isProfessor || char.faceStyle === 7) : false;
  const hasGlasses = char ? (char.hasGlasses || isProfessor || char.faceStyle === 5) : false;
  const hasMustache = char ? (!isGirl && (char.hasMustache || isProfessor || char.faceStyle === 5)) : false;

  // Materials
  const skinMat = new THREE.MeshPhongMaterial({
    color: char?.skinTone ? hexColor(char.skinTone) : hexColor(isGirl ? '#ffedd5' : '#fed7aa'),
  });

  let hairHex = char?.hairColor;
  if (!hairHex) {
    hairHex = isProfessor ? '#f1f5f9' : isGirl ? '#b45309' : '#78350f';
  }
  const hairMat = new THREE.MeshPhongMaterial({ color: hexColor(hairHex) });

  let outfitHex = char?.outfitColor || jerseyColor;
  if (isTechGirl && outfitHex === '#f8fafc') outfitHex = '#0284c7';
  if (isProfessor && outfitHex === '#f8fafc') outfitHex = '#ca8a04';
  const jerseyMat = new THREE.MeshPhongMaterial({ color: hexColor(outfitHex), shininess: 40 });

  const bikeMat = new THREE.MeshPhongMaterial({ color: hexColor(bikeColor), shininess: 80 });
  const darkMat = new THREE.MeshPhongMaterial({ color: isTechGirl ? 0x0f172a : 0x1a1a2e });
  const chromeMat = new THREE.MeshPhongMaterial({ color: 0xcccccc, shininess: 100 });
  const goldMat = new THREE.MeshPhongMaterial({ color: 0xf59e0b, shininess: 90 });

  // ── 1. Bicycle Frame & Components ──
  const frameGroup = new THREE.Group();

  const createTube = (from: THREE.Vector3, to: THREE.Vector3, mat: THREE.Material, radius = 0.028) => {
    const dir = new THREE.Vector3().subVectors(to, from);
    const len = dir.length();
    const geo = new THREE.CylinderGeometry(radius, radius, len, 8);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(from).add(to).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    return mesh;
  };

  const bbCenter = new THREE.Vector3(0, 0.35, 0.05);        // bottom bracket
  const seatTop = new THREE.Vector3(0, 0.88, -0.22);        // seat tube top
  const headTop = new THREE.Vector3(0, 0.94, 0.48);        // head tube top
  const rearAxle = new THREE.Vector3(0, 0.34, -0.52);      // rear wheel center
  const frontAxle = new THREE.Vector3(0, 0.34, 0.58);      // front wheel center

  frameGroup.add(createTube(seatTop, headTop, bikeMat, 0.028));
  frameGroup.add(createTube(headTop, bbCenter, bikeMat, 0.032));
  frameGroup.add(createTube(bbCenter, seatTop, bikeMat, 0.028));
  frameGroup.add(createTube(bbCenter, rearAxle, bikeMat, 0.022));
  frameGroup.add(createTube(seatTop, rearAxle, bikeMat, 0.020));

  // Saddle
  const seatGeo = new THREE.BoxGeometry(0.13, 0.035, 0.24);
  const seatMesh = new THREE.Mesh(seatGeo, darkMat);
  seatMesh.position.copy(seatTop).add(new THREE.Vector3(0, 0.03, -0.02));
  frameGroup.add(seatMesh);

  // High-Tech Battery Pack on Down Tube
  const battGeo = new THREE.BoxGeometry(0.09, 0.07, 0.24);
  const battMesh = new THREE.Mesh(battGeo, new THREE.MeshPhongMaterial({ color: 0x0284c7, shininess: 80 }));
  const battPos = new THREE.Vector3().addVectors(headTop, bbCenter).multiplyScalar(0.5);
  battMesh.position.copy(battPos);
  battMesh.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3().subVectors(bbCenter, headTop).normalize()
  );
  frameGroup.add(battMesh);

  // Battery LED
  const batteryLed = new THREE.Mesh(
    new THREE.SphereGeometry(0.02, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0x34d399 })
  );
  batteryLed.position.copy(battPos).add(new THREE.Vector3(0, 0.05, 0));
  frameGroup.add(batteryLed);

  rollPivot.add(frameGroup);

  // ── 1.1 Steer Assembly (Fork, Drop Handlebars, Front Wheel) ──
  // Steer pivot rotates around the head tube axis (leaning back by ~10 deg rake)
  const steerPivot = new THREE.Group();
  steerPivot.position.copy(headTop);
  rollPivot.add(steerPivot);

  // Steer collar / head tube sleeve
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, 0.12, 10), bikeMat);
  collar.position.set(0, -0.02, 0);
  steerPivot.add(collar);

  // Front wheel axle in steerPivot local space
  const frontAxleLocal = new THREE.Vector3().subVectors(frontAxle, headTop);

  // Fork crown & dual fork blades
  const forkCrown = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.09, 8), chromeMat);
  forkCrown.rotation.z = Math.PI / 2;
  forkCrown.position.set(0, -0.06, 0);
  steerPivot.add(forkCrown);

  [-0.035, 0.035].forEach((sideX) => {
    const blade = createTube(
      new THREE.Vector3(sideX, -0.06, 0),
      new THREE.Vector3(sideX, frontAxleLocal.y, frontAxleLocal.z),
      chromeMat,
      0.018
    );
    steerPivot.add(blade);
  });

  // Drop Handlebars (Road / Racing style) in steerPivot local space
  const barGroup = new THREE.Group();
  barGroup.position.set(0, 0.04, 0.04);
  const crossBar = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.42, 8), chromeMat);
  crossBar.rotation.z = Math.PI / 2;
  barGroup.add(crossBar);

  [-1, 1].forEach((side) => {
    const dropGeo = new THREE.TorusGeometry(0.08, 0.014, 6, 12, Math.PI * 0.7);
    const drop = new THREE.Mesh(dropGeo, darkMat);
    drop.position.set(side * 0.20, -0.04, 0.02);
    drop.rotation.y = side * Math.PI / 2;
    barGroup.add(drop);
  });

  // Handlebar gloves / hands that steer along with handlebars
  const handGloveL = new THREE.Mesh(
    new THREE.SphereGeometry(0.035, 8, 8),
    isTechGirl ? darkMat : skinMat
  );
  handGloveL.position.set(-0.19, -0.01, 0.04);
  barGroup.add(handGloveL);

  const handGloveR = new THREE.Mesh(
    new THREE.SphereGeometry(0.035, 8, 8),
    isTechGirl ? darkMat : skinMat
  );
  handGloveR.position.set(0.19, -0.01, 0.04);
  barGroup.add(handGloveR);

  steerPivot.add(barGroup);

  // ── 2. Racing Wheels (Thin Aero Rims & Spokes) ──
  const createWheel = (center: THREE.Vector3) => {
    const wheelGroup = new THREE.Group();
    wheelGroup.position.copy(center);

    const tire = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.024, 8, 28), darkMat);
    tire.rotation.y = Math.PI / 2;
    wheelGroup.add(tire);

    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.31, 0.012, 8, 28), chromeMat);
    rim.rotation.y = Math.PI / 2;
    wheelGroup.add(rim);

    // 16 Spokes
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.002, 0.29, 3), chromeMat);
      spoke.position.set(0, Math.cos(angle) * 0.145, Math.sin(angle) * 0.145);
      spoke.rotation.x = angle;
      wheelGroup.add(spoke);
    }

    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.06, 8), chromeMat);
    hub.rotation.z = Math.PI / 2;
    wheelGroup.add(hub);

    return wheelGroup;
  };

  const rearWheel = createWheel(rearAxle);
  rollPivot.add(rearWheel);

  // Front wheel is placed in frontWheelPivot under steerPivot so it turns with the steering
  const frontWheelPivot = new THREE.Group();
  frontWheelPivot.position.copy(frontAxleLocal);
  steerPivot.add(frontWheelPivot);

  const frontWheel = createWheel(new THREE.Vector3(0, 0, 0));
  frontWheelPivot.add(frontWheel);

  // ── 3. Crank & Pedals (Rotated by Leg IK) ──
  const crankGroup = new THREE.Group();
  crankGroup.position.copy(bbCenter);

  const crankArmGeo = new THREE.CylinderGeometry(0.014, 0.014, 0.17, 6);
  const pedalGeo = new THREE.BoxGeometry(0.08, 0.012, 0.05);

  const leftPedalPivot = new THREE.Group();
  const leftCrank = new THREE.Mesh(crankArmGeo, chromeMat);
  leftCrank.position.set(0.10, 0.085, 0);
  leftPedalPivot.add(leftCrank);
  const leftPedal = new THREE.Mesh(pedalGeo, darkMat);
  leftPedal.position.set(0.10, 0.17, 0);
  leftPedalPivot.add(leftPedal);
  crankGroup.add(leftPedalPivot);

  const rightPedalPivot = new THREE.Group();
  const rightCrank = new THREE.Mesh(crankArmGeo, chromeMat);
  rightCrank.position.set(-0.10, -0.085, 0);
  rightPedalPivot.add(rightCrank);
  const rightPedal = new THREE.Mesh(pedalGeo, darkMat);
  rightPedal.position.set(-0.10, -0.17, 0);
  rightPedalPivot.add(rightPedal);
  crankGroup.add(rightPedalPivot);

  rollPivot.add(crankGroup);

  // ── 4. Stylized Rider Body (DeepSeek R1 Organic Kinematics) ──
  const pelvisBasePos = new THREE.Vector3(0, 0.88, -0.18);
  const pelvisGroup = new THREE.Group();
  pelvisGroup.position.copy(pelvisBasePos);
  rollPivot.add(pelvisGroup);

  const pelvisMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 12, 10),
    jerseyMat
  );
  pelvisMesh.scale.set(1.1, 0.65, 0.85);
  pelvisMesh.castShadow = true;
  pelvisGroup.add(pelvisMesh);

  // Hip markers on pelvisGroup
  const hipL = new THREE.Object3D();
  hipL.position.set(-0.12, -0.02, 0);
  pelvisGroup.add(hipL);

  const hipR = new THREE.Object3D();
  hipR.position.set(0.12, -0.02, 0);
  pelvisGroup.add(hipR);

  // Torso (leaning forward at ~46 deg towards handlebars, child of pelvisGroup)
  const torsoBaseLean = THREE.MathUtils.degToRad(46);
  const torsoGroup = new THREE.Group();
  torsoGroup.position.set(0, 0.06, 0.02);
  torsoGroup.rotation.set(torsoBaseLean, 0, 0, 'YXZ');
  pelvisGroup.add(torsoGroup);

  const torsoGeo = new THREE.BoxGeometry(0.32, 0.44, 0.20);
  const body = new THREE.Mesh(torsoGeo, jerseyMat);
  body.position.set(0, 0.22, 0);
  body.castShadow = true;
  torsoGroup.add(body);

  // Stylized Outfit Features on Torso
  if (isTechGirl) {
    // Yellow Lightning Bolt Badge on Chest
    const boltGeo = new THREE.BufferGeometry();
    const boltVerts = new Float32Array([
      -0.01, 0.32, 0.105,
       0.04, 0.32, 0.105,
      -0.02, 0.24, 0.105,
      -0.02, 0.24, 0.105,
       0.03, 0.24, 0.105,
      -0.01, 0.15, 0.105,
    ]);
    boltGeo.setAttribute('position', new THREE.BufferAttribute(boltVerts, 3));
    const boltMesh = new THREE.Mesh(boltGeo, new THREE.MeshBasicMaterial({ color: 0xfacc15, side: THREE.DoubleSide }));
    torsoGroup.add(boltMesh);

  } else if (isProfessor) {
    // Yellow inner sweater + Tweed coat lapels
    const sweater = new THREE.Mesh(
      new THREE.PlaneGeometry(0.10, 0.32),
      new THREE.MeshPhongMaterial({ color: 0xfacc15 })
    );
    sweater.position.set(0, 0.22, 0.102);
    torsoGroup.add(sweater);

    const badge = new THREE.Mesh(
      new THREE.BoxGeometry(0.045, 0.055, 0.01),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    badge.position.set(0.09, 0.28, 0.108);
    torsoGroup.add(badge);

  } else if (!isPlayer) {
    // Racer Number on back (like in reference image)
    const numCanvas = document.createElement('canvas');
    numCanvas.width = 128;
    numCanvas.height = 128;
    const nctx = numCanvas.getContext('2d')!;
    nctx.fillStyle = '#ffffff';
    nctx.fillRect(10, 10, 108, 108);
    nctx.fillStyle = '#000000';
    nctx.font = 'bold 50px sans-serif';
    nctx.textAlign = 'center';
    nctx.textBaseline = 'middle';
    nctx.fillText(name.slice(0, 2).toUpperCase() || '85', 64, 64);

    const numTex = new THREE.CanvasTexture(numCanvas);
    const numPatch = new THREE.Mesh(
      new THREE.PlaneGeometry(0.18, 0.18),
      new THREE.MeshBasicMaterial({ map: numTex, side: THREE.DoubleSide })
    );
    numPatch.position.set(0, 0.26, -0.105);
    numPatch.rotation.y = Math.PI;
    torsoGroup.add(numPatch);
  }

  // Shoulder markers for dynamic 2-bone arm IK
  const shoulderL = new THREE.Object3D();
  shoulderL.position.set(-0.16, 0.38, 0);
  torsoGroup.add(shoulderL);

  const shoulderR = new THREE.Object3D();
  shoulderR.position.set(0.16, 0.38, 0);
  torsoGroup.add(shoulderR);

  // ── 5. Stylized Head & Expressive Features (Attached to Torso with Dynamic Gaze) ──
  const neckOffset = new THREE.Vector3(0, 0.45, 0.04);
  const headGroup = new THREE.Group();
  headGroup.position.copy(neckOffset);
  // Counter-rotate relative to torso so character looks forward along track
  headGroup.rotation.set(-torsoBaseLean * 0.48, 0, 0, 'YXZ');
  torsoGroup.add(headGroup);

  const headGeo = new THREE.SphereGeometry(0.15, 20, 20);
  headGeo.scale(1, 1.12, 1.05);
  const head = new THREE.Mesh(headGeo, skinMat);
  headGroup.add(head);

  // Expressive Eyes with Highlights (Pixar/ELECTRIO style)
  [-1, 1].forEach((side) => {
    const eyeGroup = new THREE.Group();
    eyeGroup.position.set(side * 0.055, 0.02, 0.135);

    const sclera = new THREE.Mesh(
      new THREE.SphereGeometry(0.028, 12, 12),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    sclera.scale.set(1.1, 1.0, 0.4);
    eyeGroup.add(sclera);

    const irisColor = isTechGirl ? 0x15803d : isProfessor ? 0x0284c7 : 0x451a03;
    const iris = new THREE.Mesh(
      new THREE.CircleGeometry(0.018, 12),
      new THREE.MeshBasicMaterial({ color: irisColor })
    );
    iris.position.set(0, 0, 0.012);
    eyeGroup.add(iris);

    const pupil = new THREE.Mesh(
      new THREE.CircleGeometry(0.010, 12),
      new THREE.MeshBasicMaterial({ color: 0x09090b })
    );
    pupil.position.set(0, 0, 0.014);
    eyeGroup.add(pupil);

    const hi = new THREE.Mesh(
      new THREE.CircleGeometry(0.005, 8),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    hi.position.set(side * 0.004 + 0.003, 0.005, 0.015);
    eyeGroup.add(hi);

    headGroup.add(eyeGroup);
  });

  // Eyebrows
  [-1, 1].forEach((side) => {
    const brow = new THREE.Mesh(
      new THREE.BoxGeometry(0.045, 0.012, 0.015),
      new THREE.MeshBasicMaterial({ color: isProfessor ? 0xffffff : hairHex })
    );
    brow.position.set(side * 0.058, 0.065, 0.145);
    brow.rotation.z = side * -0.15;
    headGroup.add(brow);
  });

  // Nose & Smile
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.016, 0.035, 6), skinMat);
  nose.position.set(0, -0.015, 0.155);
  nose.rotation.x = -Math.PI / 2 + 0.2;
  headGroup.add(nose);

  const mouth = new THREE.Mesh(
    new THREE.TorusGeometry(0.024, 0.006, 6, 12, Math.PI * 0.7),
    new THREE.MeshBasicMaterial({ color: 0x991b1b })
  );
  mouth.position.set(0, -0.055, 0.138);
  mouth.rotation.x = 0.2;
  mouth.rotation.z = Math.PI * 0.15;
  headGroup.add(mouth);

  // ── Hair Style & Accessories on Head ──
  const hairStyle = char?.hairStyle || (isProfessor ? 'wild_scientist' : isGirl ? 'side_braid' : 'spiky');

  if (hairStyle === 'side_braid' || isTechGirl) {
    // 🌟 ELECTRIO Tech Girl Braid (cascading over right shoulder)
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.165, 16, 14, 0, Math.PI * 2, 0, Math.PI * 0.6), hairMat);
    cap.position.set(0, 0.01, -0.02);
    headGroup.add(cap);

    // Front swept bangs
    for (let b = 0; b < 4; b++) {
      const bang = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.015, 0.12, 6), hairMat);
      bang.position.set(-0.06 + b * 0.035, 0.04 - b * 0.01, 0.12 + (1.5 - Math.abs(b - 1.5)) * 0.02);
      bang.rotation.z = -0.4;
      headGroup.add(bang);
    }

    // Volumetric Side Braid descending over shoulder
    for (let s = 0; s < 5; s++) {
      const seg = new THREE.Mesh(new THREE.SphereGeometry(0.038 - s * 0.003, 10, 10), hairMat);
      seg.scale.set(1.2, 1.4, 0.9);
      seg.position.set(0.12 + Math.sin(s * 0.6) * 0.015, -0.04 - s * 0.05, 0.08 + s * 0.02);
      seg.rotation.z = s % 2 === 0 ? 0.3 : -0.3;
      headGroup.add(seg);
    }

  } else if (hairStyle === 'wild_scientist' || isProfessor) {
    // 🌟 ELECTRIO Professor Wild Fluffy Hair
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.165, 16, 14), hairMat);
    headGroup.add(cap);

    [
      [-0.15, 0.02, 0.01], [0.15, 0.02, 0.01],
      [-0.16, -0.04, -0.05], [0.16, -0.04, -0.05],
      [0, 0.08, -0.15], [-0.08, 0.15, -0.04], [0.08, 0.15, -0.04]
    ].forEach(([px, py, pz]) => {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), hairMat);
      puff.position.set(px, py, pz);
      headGroup.add(puff);
    });

  } else if (hairStyle === 'ponytail') {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.165, 16, 14, 0, Math.PI * 2, 0, Math.PI * 0.6), hairMat);
    headGroup.add(cap);

    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.055, 0.22, 8), hairMat);
    tail.position.set(0, 0.06, -0.18);
    tail.rotation.x = 0.7;
    headGroup.add(tail);

  } else {
    // Spiky adventurer hair
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.165, 16, 14, 0, Math.PI * 2, 0, Math.PI * 0.55), hairMat);
    headGroup.add(cap);

    for (let t = 0; t < 6; t++) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.10, 6), hairMat);
      const xOff = ((t - 2.5) / 2.5) * 0.10;
      spike.position.set(xOff, 0.12, 0.06 - Math.abs(xOff) * 0.05);
      spike.rotation.x = -0.4;
      spike.rotation.z = -xOff * 1.5;
      headGroup.add(spike);
    }
  }

  // Forehead Twin Electric Goggles (glowing cyan lenses)
  if (hasGoggles) {
    const goggleGroup = new THREE.Group();
    goggleGroup.position.set(0, 0.10, 0.11);
    goggleGroup.rotation.x = -0.25;

    [-1, 1].forEach((gSide) => {
      const barrel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.028, 0.030, 0.04, 12),
        new THREE.MeshPhongMaterial({ color: 0x334155, shininess: 80 })
      );
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(gSide * 0.046, 0, 0.02);
      goggleGroup.add(barrel);

      const lens = new THREE.Mesh(
        new THREE.CircleGeometry(0.025, 12),
        new THREE.MeshStandardMaterial({
          color: 0x38bdf8,
          emissive: 0x0ea5e9,
          emissiveIntensity: 0.8,
        })
      );
      lens.position.set(gSide * 0.046, 0, 0.041);
      goggleGroup.add(lens);
    });

    const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.015, 0.02), darkMat);
    bridge.position.set(0, 0, 0.02);
    goggleGroup.add(bridge);

    headGroup.add(goggleGroup);
  }

  // Round Glasses & Walrus Mustache (Professor)
  if (hasGlasses) {
    [-1, 1].forEach((gSide) => {
      const rim = new THREE.Mesh(
        new THREE.TorusGeometry(0.032, 0.004, 6, 16),
        new THREE.MeshBasicMaterial({ color: 0x0f172a })
      );
      rim.position.set(gSide * 0.055, 0.02, 0.145);
      headGroup.add(rim);
    });
  }

  if (hasMustache) {
    [-1, 1].forEach((mSide) => {
      const stache = new THREE.Mesh(
        new THREE.ConeGeometry(0.028, 0.08, 8),
        new THREE.MeshPhongMaterial({ color: 0xf1f5f9 })
      );
      stache.position.set(mSide * 0.032, -0.038, 0.145);
      stache.rotation.z = mSide * (-Math.PI / 2 + 0.3);
      headGroup.add(stache);
    });
  }

  // ── 6. Articulated Arms with Two-Bone IK (Elbow Flexion & Dynamic Reach) ──
  const upperArmGeo = new THREE.CylinderGeometry(0.034, 0.028, 1, 8);
  const foreArmGeo = new THREE.CylinderGeometry(0.028, 0.024, 1, 8);
  const elbowGeo = new THREE.SphereGeometry(0.032, 8, 8);

  const leftUpperArm = new THREE.Mesh(upperArmGeo, jerseyMat);
  const leftForeArm = new THREE.Mesh(foreArmGeo, jerseyMat);
  const leftElbow = new THREE.Mesh(elbowGeo, jerseyMat);
  rollPivot.add(leftUpperArm);
  rollPivot.add(leftForeArm);
  rollPivot.add(leftElbow);

  const rightUpperArm = new THREE.Mesh(upperArmGeo, jerseyMat);
  const rightForeArm = new THREE.Mesh(foreArmGeo, jerseyMat);
  const rightElbow = new THREE.Mesh(elbowGeo, jerseyMat);
  rollPivot.add(rightUpperArm);
  rollPivot.add(rightForeArm);
  rollPivot.add(rightElbow);

  // ── 7. Legs with Two-Bone Inverse Kinematics (Pedaling Math) ──
  const thighLen = 0.40;
  const calfLen = 0.40;

  const legMat = new THREE.MeshPhongMaterial({
    color: isTechGirl ? 0x1e293b : isProfessor ? 0x57534e : 0x1e3a8a,
    shininess: 30,
  });

  const upperLegGeo = new THREE.CylinderGeometry(0.046, 0.038, 1, 8);
  const lowerLegGeo = new THREE.CylinderGeometry(0.036, 0.030, 1, 8);
  const kneeGeo = new THREE.SphereGeometry(0.038, 8, 8);
  const shoeGeo = new THREE.BoxGeometry(0.08, 0.04, 0.14);
  const shoeMat = new THREE.MeshPhongMaterial({ color: isTechGirl ? 0x0284c7 : 0x1e293b });

  const leftUpperLeg = new THREE.Mesh(upperLegGeo, legMat);
  const leftLowerLeg = new THREE.Mesh(lowerLegGeo, legMat);
  const leftKneeJoint = new THREE.Mesh(kneeGeo, legMat);
  const leftShoe = new THREE.Mesh(shoeGeo, shoeMat);
  rollPivot.add(leftUpperLeg);
  rollPivot.add(leftLowerLeg);
  rollPivot.add(leftKneeJoint);
  rollPivot.add(leftShoe);

  const rightUpperLeg = new THREE.Mesh(upperLegGeo, legMat);
  const rightLowerLeg = new THREE.Mesh(lowerLegGeo, legMat);
  const rightKneeJoint = new THREE.Mesh(kneeGeo, legMat);
  const rightShoe = new THREE.Mesh(shoeGeo, shoeMat);
  rollPivot.add(rightUpperLeg);
  rollPivot.add(rightLowerLeg);
  rollPivot.add(rightKneeJoint);
  rollPivot.add(rightShoe);

  // Reusable scratch vectors for 60 FPS zero-GC kinematics
  const _sL = new THREE.Vector3();
  const _sR = new THREE.Vector3();
  const _hL = new THREE.Vector3();
  const _hR = new THREE.Vector3();
  const _hipL = new THREE.Vector3();
  const _hipR = new THREE.Vector3();
  const _poleArmL = new THREE.Vector3();
  const _poleArmR = new THREE.Vector3();
  const _pedalL = new THREE.Vector3();
  const _pedalR = new THREE.Vector3();
  const _poleKnee = new THREE.Vector3(0, -0.15, 1.0);

  // DeepSeek R1 Full Organic Cyclist Kinematics & Two-Bone IK Update
  const updateKinematics = (crankAngle: number, speedMps: number, dt: number) => {
    const activity = THREE.MathUtils.clamp(speedMps / 3.0, 0.0, 1.0);
    const s = Math.sin(crankAngle);
    const c = Math.cos(crankAngle);
    const down = 0.5 - 0.5 * Math.cos(2 * crankAngle);

    // 1. Pelvis Dynamic Sway & Heave
    const pelvicHeave = -0.016 * down * activity;
    const pelvicSway = 0.008 * s * activity;
    const pelvicRoll = -0.035 * s * activity;
    const pelvicYaw = -0.022 * c * activity;
    const pelvicPitch = 0.008 * down * activity;

    pelvisGroup.position.copy(pelvisBasePos);
    pelvisGroup.position.y += pelvicHeave;
    pelvisGroup.position.x += pelvicSway;
    pelvisGroup.rotation.set(pelvicPitch, pelvicYaw, pelvicRoll, 'YXZ');

    // 2. Torso Dynamic Effort Bobbing, Counter-Roll & Lateral Sway
    const torsoPitch = torsoBaseLean + 0.038 * down * activity;
    const torsoRoll = -pelvicRoll * 0.65 + 0.012 * s * activity;
    const torsoYaw = -pelvicYaw * 0.35 + 0.015 * s * activity;
    const torsoLateral = 0.006 * s * activity;

    torsoGroup.position.set(torsoLateral, 0.06, 0.02);
    torsoGroup.rotation.set(torsoPitch, torsoYaw, torsoRoll, 'YXZ');

    // 3. Head & Neck Gaze Stabilization + subtle nod
    const totalPitch = pelvicPitch + (torsoPitch - torsoBaseLean);
    const totalYaw = pelvicYaw + torsoYaw;
    const totalRoll = pelvicRoll + torsoRoll;

    const neckPitch = -torsoBaseLean * 0.48 - totalPitch * 0.82 + 0.012 * Math.sin(2 * crankAngle) * activity;
    const neckYaw = -totalYaw * 0.80 + 0.014 * s * activity;
    const neckRoll = -totalRoll * 0.75;

    headGroup.rotation.set(neckPitch, neckYaw, neckRoll, 'YXZ');

    // Refresh hierarchy transforms for accurate IK anchor reading
    rollPivot.updateMatrixWorld(true);

    // 4. Arms IK (Dynamic Shoulders -> Steering Handlebars)
    shoulderL.getWorldPosition(_sL);
    shoulderR.getWorldPosition(_sR);
    handGloveL.getWorldPosition(_hL);
    handGloveR.getWorldPosition(_hR);

    rollPivot.worldToLocal(_sL);
    rollPivot.worldToLocal(_sR);
    rollPivot.worldToLocal(_hL);
    rollPivot.worldToLocal(_hR);

    const armL1 = 0.27;
    const armL2 = 0.25;
    _poleArmL.copy(_sL).add(new THREE.Vector3(-0.40, -0.15, -0.10));
    _poleArmR.copy(_sR).add(new THREE.Vector3(0.40, -0.15, -0.10));

    const elbowL = solveTwoBoneIK(_sL, _hL, armL1, armL2, _poleArmL);
    const elbowR = solveTwoBoneIK(_sR, _hR, armL1, armL2, _poleArmR);

    alignSegmentBetween(leftUpperArm, _sL, elbowL, 1);
    leftElbow.position.copy(elbowL);
    alignSegmentBetween(leftForeArm, elbowL, _hL, 1);

    alignSegmentBetween(rightUpperArm, _sR, elbowR, 1);
    rightElbow.position.copy(elbowR);
    alignSegmentBetween(rightForeArm, elbowR, _hR, 1);

    // 5. Legs IK (Dynamic Hips -> Pedals)
    hipL.getWorldPosition(_hipL);
    hipR.getWorldPosition(_hipR);
    rollPivot.worldToLocal(_hipL);
    rollPivot.worldToLocal(_hipR);

    const crankRadius = 0.17;
    _pedalL.set(
      0.10,
      bbCenter.y + crankRadius * Math.sin(crankAngle),
      bbCenter.z + crankRadius * Math.cos(crankAngle)
    );
    _pedalR.set(
      -0.10,
      bbCenter.y + crankRadius * Math.sin(crankAngle + Math.PI),
      bbCenter.z + crankRadius * Math.cos(crankAngle + Math.PI)
    );

    const leftKnee = solveTwoBoneIK(_hipL, _pedalL, thighLen, calfLen, _poleKnee);
    const rightKnee = solveTwoBoneIK(_hipR, _pedalR, thighLen, calfLen, _poleKnee);

    alignSegmentBetween(leftUpperLeg, _hipL, leftKnee, 1);
    leftKneeJoint.position.copy(leftKnee);
    alignSegmentBetween(leftLowerLeg, leftKnee, _pedalL, 1);
    leftShoe.position.copy(_pedalL);
    leftShoe.rotation.x = Math.sin(crankAngle) * 0.2;

    alignSegmentBetween(rightUpperLeg, _hipR, rightKnee, 1);
    rightKneeJoint.position.copy(rightKnee);
    alignSegmentBetween(rightLowerLeg, rightKnee, _pedalR, 1);
    rightShoe.position.copy(_pedalR);
    rightShoe.rotation.x = Math.sin(crankAngle + Math.PI) * 0.2;
  };

  // Backward compatibility alias
  const updateLegIK = (crankAngle: number) => {
    updateKinematics(crankAngle, 5.0, 0.016);
  };

  // Initial pose initialization
  updateKinematics(0, 0, 0.016);

  // ── 8. Motor Glow, Particles & Name Badge ──
  const motorGlow = new THREE.PointLight(0x38bdf8, 0, 3);
  motorGlow.position.copy(rearAxle).add(new THREE.Vector3(0, 0.1, 0));
  rollPivot.add(motorGlow);

  // Name badge sprite (stays directly on root group so it stays upright above rider)
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = isPlayer ? 'rgba(2, 132, 199, 0.85)' : 'rgba(15, 23, 42, 0.75)';
  ctx.roundRect(4, 4, 248, 56, 12);
  ctx.fill();
  ctx.strokeStyle = isPlayer ? '#38bdf8' : '#94a3b8';
  ctx.lineWidth = 3;
  ctx.roundRect(4, 4, 248, 56, 12);
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(name, 128, 32);

  const spriteTex = new THREE.CanvasTexture(canvas);
  const spriteMat = new THREE.SpriteMaterial({ map: spriteTex, depthTest: false });
  const nameSprite = new THREE.Sprite(spriteMat);
  nameSprite.position.set(0, 1.95, 0.2);
  nameSprite.scale.set(1.5, 0.38, 1);
  group.add(nameSprite);

  // Brake sparks particles
  const sparkGeo = new THREE.BufferGeometry();
  const sparkPos = new Float32Array(30 * 3);
  for (let i = 0; i < 30 * 3; i += 3) {
    sparkPos[i] = rearAxle.x + (Math.random() - 0.5) * 0.15;
    sparkPos[i + 1] = rearAxle.y + (Math.random() - 0.5) * 0.15;
    sparkPos[i + 2] = rearAxle.z - Math.random() * 0.5;
  }
  sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
  const brakeParticles = new THREE.Points(
    sparkGeo,
    new THREE.PointsMaterial({ color: 0xf59e0b, size: 0.05, transparent: true, opacity: 0 })
  );
  rollPivot.add(brakeParticles);

  return {
    group,
    rollPivot,
    steerPivot,
    pelvisGroup,
    torsoGroup,
    headGroup,
    body,
    head,
    leftUpperArm,
    leftForeArm,
    leftElbow,
    rightUpperArm,
    rightForeArm,
    rightElbow,
    leftUpperLeg,
    leftLowerLeg,
    rightUpperLeg,
    rightLowerLeg,
    leftKneeJoint,
    rightKneeJoint,
    leftShoe,
    rightShoe,
    leftPedalPivot,
    rightPedalPivot,
    crankGroup,
    frontWheel,
    rearWheel,
    frame: frameGroup,
    motorGlow,
    batteryLed,
    nameSprite,
    brakeParticles,
    updateKinematics,
    updateLegIK,
    currentLean: 0,
    currentSteer: 0,
    prevX: 0,
  };
}

// ─── Main Renderer Class ────────────────────────────────────────────────────

export interface RacerUpdate {
  id: string;
  name: string;
  z: number;
  x: number;
  speedMps: number;
  isPedaling: boolean;
  isMotorActive: boolean;
  isBraking: boolean;
  batteryPct: number;
  color: string;
  isPlayer: boolean;
  jerseyColor: string;
  bikeColor: string;
  character?: CharacterState;
}

export class Racing3DRenderer {
  private container: HTMLDivElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private cyclists: Map<string, CyclistParts> = new Map();
  private envGroup: THREE.Group = new THREE.Group();

  // Track
  private trackCurve!: THREE.CatmullRomCurve3;
  private trackArcLength: number = 0;
  private gameTrackLength: number;
  private isClosedTrack: boolean;
  private laps: number;

  // Pre-sampled track frames
  private sampledPositions: THREE.Vector3[] = [];
  private sampledTangents: THREE.Vector3[] = [];
  private sampledNormals: THREE.Vector3[] = [];
  private sampledCurvatures: number[] = [];

  // Chase camera smoothing & dynamics (Spring-Arm, Horizon Banking & Apex Lead)
  private smoothCamPos = new THREE.Vector3(0, 5, 12);
  private smoothCamTarget = new THREE.Vector3(0, 2, 0);
  private smoothCamLateral: number = 0;
  private smoothCamRoll: number = 0;
  private smoothFov: number = 54;

  // Time & animations
  private elapsedTime = 0;
  private resizeObserver: ResizeObserver;

  constructor(
    container: HTMLDivElement,
    trackId: string,
    gameTrackLength: number,
    laps: number = 1
  ) {
    this.container = container;
    this.gameTrackLength = gameTrackLength;
    this.laps = laps;
    this.isClosedTrack = trackId !== 'hill_climb';

    // ── 1. Scene & Atmosphere ──
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb);
    this.scene.fog = new THREE.Fog(0xc8e6f5, FOG_NEAR, FOG_FAR);

    // ── 2. Camera ──
    const w = container.clientWidth || 800;
    const h = container.clientHeight || 600;
    this.camera = new THREE.PerspectiveCamera(54, w / h, 0.1, 2500);
    this.camera.position.set(0, 5, 12);

    // ── 3. WebGL Renderer ──
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    container.appendChild(this.renderer.domElement);

    // ── 4. Lights ──
    this.setupLighting();

    // ── 5. Track with 3D Deck & Continuous Guardrails ──
    this.buildTrack(trackId);

    // ── 6. Environment & Scenery ──
    this.buildEnvironment(trackId);

    // ── 7. Resize Observer ──
    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(container);
  }

  // ─── Lighting Setup ────────────────────────────────────────────────────────

  private setupLighting() {
    const ambient = new THREE.AmbientLight(0xdbeafe, 0.75);
    this.scene.add(ambient);

    const hemi = new THREE.HemisphereLight(0x87ceeb, 0x1e3a1f, 0.55);
    this.scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xfffaea, 1.45);
    sun.position.set(120, 250, 150);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.near = 50;
    sun.shadow.camera.far = 600;
    const shadowD = 180;
    sun.shadow.camera.left = -shadowD;
    sun.shadow.camera.right = shadowD;
    sun.shadow.camera.top = shadowD;
    sun.shadow.camera.bottom = -shadowD;
    sun.shadow.bias = -0.0005;
    this.scene.add(sun);
  }

  // ─── Track Builder (Elevated 3D Highway) ───────────────────────────────────

  private buildTrack(trackId: string) {
    const points = getTrackPoints(trackId);
    this.trackCurve = new THREE.CatmullRomCurve3(points, this.isClosedTrack, 'centripetal', 0.5);
    this.trackArcLength = this.trackCurve.getLength();

    // Pre-sample frames with DECK_LIFT
    this.sampledPositions = [];
    this.sampledTangents = [];
    this.sampledNormals = [];

    const up = new THREE.Vector3(0, 1, 0);
    const prevNormal = new THREE.Vector3(1, 0, 0);

    for (let i = 0; i <= TRACK_SAMPLES; i++) {
      const u = i / TRACK_SAMPLES;
      const pos = this.trackCurve.getPointAt(u);
      pos.y += DECK_LIFT; // Elevate road deck above terrain to eliminate clipping

      const tan = this.trackCurve.getTangentAt(u).normalize();
      let normal = new THREE.Vector3().crossVectors(tan, up).normalize();
      if (normal.length() < 0.01) {
        normal.copy(prevNormal);
      }
      // Guarantee normal doesn't flip 180 degrees between adjacent frames on steep slopes
      if (normal.dot(prevNormal) < 0) {
        normal.negate();
      }
      prevNormal.copy(normal);

      this.sampledPositions.push(pos);
      this.sampledTangents.push(tan);
      this.sampledNormals.push(normal);
    }

    // Precalculate signed curvature at each station for realistic bike leaning physics
    this.sampledCurvatures = [];
    for (let i = 0; i <= TRACK_SAMPLES; i++) {
      const i0 = Math.max(0, i - 1);
      const i1 = Math.min(TRACK_SAMPLES, i + 1);
      const t0 = this.sampledTangents[i0];
      const t1 = this.sampledTangents[i1];
      const p0 = this.sampledPositions[i0];
      const p1 = this.sampledPositions[i1];
      const ds = Math.max(0.01, p0.distanceTo(p1));
      // Signed curvature in horizontal plane: cross(t0, t1).y
      const signedKappa = (t0.z * t1.x - t0.x * t1.z) / ds;
      this.sampledCurvatures.push(signedKappa);
    }

    // 1. Build Elevated Road Deck with 3D Thickness
    this.buildRoadMesh();

    // 2. Build Continuous Guardrails with Reflector Posts
    this.buildContinuousGuardrails();

    // 3. Build Viaduct Bridge Piers (concrete pillars supporting elevated spans)
    this.buildViaductPiers();

    // 4. Build Continuous Sloping Earth Embankment Skirt (connecting road deck to ground)
    this.buildEmbankmentSkirt();

    // 5. Build Start Gantry & Finish Line
    this.buildStartGantry();
    this.buildFinishLine();
  }

  // ─── 3D Road Deck Geometry ────────────────────────────────────────────────

  private buildRoadMesh() {
    const numSeg = TRACK_SAMPLES;
    const positions: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];
    const uvs: number[] = [];

    // Helper to generate quad strips between two 3D point chains with correct counter-clockwise winding
    const addStrip = (
      leftChain: THREE.Vector3[],
      rightChain: THREE.Vector3[],
      colorFn: (i: number) => [number, number, number]
    ) => {
      const baseIdx = positions.length / 3;
      const count = leftChain.length;

      for (let i = 0; i < count; i++) {
        const l = leftChain[i];
        const r = rightChain[i];
        positions.push(l.x, l.y, l.z);
        positions.push(r.x, r.y, r.z);

        const [cr, cg, cb] = colorFn(i);
        colors.push(cr, cg, cb, cr, cg, cb);

        const v = (i / numSeg) * 40;
        uvs.push(0, v, 1, v);

        if (i < numSeg) {
          const nextI = i + 1;
          const a0 = baseIdx + i * 2;
          const b0 = baseIdx + i * 2 + 1;
          const a1 = baseIdx + nextI * 2;
          const b1 = baseIdx + nextI * 2 + 1;

          // Counter-clockwise upward-facing triangles
          indices.push(a0, b0, a1);
          indices.push(b0, b1, a1);
        }
      }
    };

    // Calculate road contours along spline
    const asphaltLeft: THREE.Vector3[] = [];
    const asphaltRight: THREE.Vector3[] = [];
    const kerbLeftOuter: THREE.Vector3[] = [];
    const kerbRightOuter: THREE.Vector3[] = [];
    const shoulderLeftOuter: THREE.Vector3[] = [];
    const shoulderRightOuter: THREE.Vector3[] = [];
    const deckBottomLeft: THREE.Vector3[] = [];
    const deckBottomRight: THREE.Vector3[] = [];

    const totalWidth = ROAD_HALF_WIDTH + KERB_WIDTH + SHOULDER_WIDTH;

    for (let i = 0; i <= numSeg; i++) {
      const pos = this.sampledPositions[i];
      const norm = this.sampledNormals[i];

      // Top surface contours
      asphaltLeft.push(pos.clone().addScaledVector(norm, -ROAD_HALF_WIDTH));
      asphaltRight.push(pos.clone().addScaledVector(norm, ROAD_HALF_WIDTH));

      kerbLeftOuter.push(pos.clone().addScaledVector(norm, -(ROAD_HALF_WIDTH + KERB_WIDTH)));
      kerbRightOuter.push(pos.clone().addScaledVector(norm, (ROAD_HALF_WIDTH + KERB_WIDTH)));

      const sL = pos.clone().addScaledVector(norm, -totalWidth);
      const sR = pos.clone().addScaledVector(norm, totalWidth);
      shoulderLeftOuter.push(sL);
      shoulderRightOuter.push(sR);

      // Deck bottom contours (lowered by DECK_THICKNESS)
      deckBottomLeft.push(sL.clone().add(new THREE.Vector3(0, -DECK_THICKNESS, 0)));
      deckBottomRight.push(sR.clone().add(new THREE.Vector3(0, -DECK_THICKNESS, 0)));
    }

    // 1. Asphalt Top Strip
    addStrip(asphaltLeft, asphaltRight, (i) => {
      const isAlt = Math.floor(i / 6) % 2 === 0;
      const c = isAlt ? 0.16 : 0.13;
      return [c, c, c + 0.015];
    });

    // 2. Left Kerb (Red/White alternating)
    addStrip(kerbLeftOuter, asphaltLeft, (i) => {
      const isRed = Math.floor(i / 6) % 2 === 0;
      return isRed ? [0.95, 0.15, 0.15] : [0.95, 0.95, 0.95];
    });

    // 3. Right Kerb (Red/White alternating)
    addStrip(asphaltRight, kerbRightOuter, (i) => {
      const isRed = Math.floor(i / 6) % 2 === 0;
      return isRed ? [0.95, 0.15, 0.15] : [0.95, 0.95, 0.95];
    });

    // 4. Outer Shoulders
    addStrip(shoulderLeftOuter, kerbLeftOuter, () => [0.22, 0.22, 0.24]);
    addStrip(kerbRightOuter, shoulderRightOuter, () => [0.22, 0.22, 0.24]);

    // 5. Concrete Side Walls (descending to deck underside)
    addStrip(deckBottomLeft, shoulderLeftOuter, () => [0.35, 0.35, 0.38]);
    addStrip(shoulderRightOuter, deckBottomRight, () => [0.35, 0.35, 0.38]);

    // 6. Deck Underside
    addStrip(deckBottomRight, deckBottomLeft, () => [0.18, 0.18, 0.20]);

    const roadGeo = new THREE.BufferGeometry();
    roadGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    roadGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    roadGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    roadGeo.setIndex(indices);
    roadGeo.computeVertexNormals();

    const roadMat = new THREE.MeshPhongMaterial({
      vertexColors: true,
      shininess: 25,
      specular: 0x333333,
      side: THREE.DoubleSide,
    });
    const roadMesh = new THREE.Mesh(roadGeo, roadMat);
    roadMesh.receiveShadow = true;
    this.scene.add(roadMesh);

    // Center Dashed White Lines
    this.buildCenterLine();
  }

  // ─── Center Dashed Lane Lines ─────────────────────────────────────────────

  private buildCenterLine() {
    const dashPositions: number[] = [];
    const dashIndices: number[] = [];
    let vertIdx = 0;

    for (let i = 0; i < TRACK_SAMPLES; i++) {
      const isDash = Math.floor(i / 8) % 2 === 0;
      if (!isDash) continue;

      const nextI = (i + 1) >= TRACK_SAMPLES ? (this.isClosedTrack ? 0 : TRACK_SAMPLES) : (i + 1);
      if (nextI >= this.sampledPositions.length) continue;

      const pos1 = this.sampledPositions[i];
      const pos2 = this.sampledPositions[nextI];
      const normal1 = this.sampledNormals[i];
      const normal2 = this.sampledNormals[nextI];

      const hw = 0.10;
      dashPositions.push(
        pos1.x + normal1.x * hw, pos1.y + 0.03, pos1.z + normal1.z * hw,
        pos1.x - normal1.x * hw, pos1.y + 0.03, pos1.z - normal1.z * hw,
        pos2.x + normal2.x * hw, pos2.y + 0.03, pos2.z + normal2.z * hw,
        pos2.x - normal2.x * hw, pos2.y + 0.03, pos2.z - normal2.z * hw
      );
      dashIndices.push(
        vertIdx, vertIdx + 1, vertIdx + 2,
        vertIdx + 1, vertIdx + 3, vertIdx + 2
      );
      vertIdx += 4;
    }

    const dashGeo = new THREE.BufferGeometry();
    dashGeo.setAttribute('position', new THREE.Float32BufferAttribute(dashPositions, 3));
    dashGeo.setIndex(dashIndices);
    dashGeo.computeVertexNormals();

    const dashMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    this.scene.add(new THREE.Mesh(dashGeo, dashMat));
  }

  // ─── Continuous 3D Guardrails with Reflector Posts ────────────────────────

  private buildContinuousGuardrails() {
    const numSeg = TRACK_SAMPLES;
    const totalOffset = ROAD_HALF_WIDTH + KERB_WIDTH + SHOULDER_WIDTH - RAIL_OFFSET;

    const railPositions: number[] = [];
    const railIndices: number[] = [];

    // Helper to generate ribbon for left (-1) or right (+1)
    const addRailRibbon = (sideSign: number) => {
      const baseIdx = railPositions.length / 3;

      for (let i = 0; i <= numSeg; i++) {
        const pos = this.sampledPositions[i];
        const norm = this.sampledNormals[i];

        const railCenter = pos.clone().addScaledVector(norm, sideSign * totalOffset);
        const top = railCenter.clone().add(new THREE.Vector3(0, RAIL_HEIGHT, 0));
        const bot = railCenter.clone().add(new THREE.Vector3(0, RAIL_BASE, 0));

        railPositions.push(top.x, top.y, top.z);
        railPositions.push(bot.x, bot.y, bot.z);

        if (i < numSeg) {
          const nextI = i + 1;
          const a0 = baseIdx + i * 2;
          const b0 = baseIdx + i * 2 + 1;
          const a1 = baseIdx + nextI * 2;
          const b1 = baseIdx + nextI * 2 + 1;

          railIndices.push(a0, a1, b0);
          railIndices.push(b0, a1, b1);
        }
      }
    };

    addRailRibbon(-1); // Left continuous rail
    addRailRibbon(1);  // Right continuous rail

    const railGeo = new THREE.BufferGeometry();
    railGeo.setAttribute('position', new THREE.Float32BufferAttribute(railPositions, 3));
    railGeo.setIndex(railIndices);
    railGeo.computeVertexNormals();

    const railMat = new THREE.MeshPhongMaterial({
      color: 0xf1f5f9,
      shininess: 90,
      specular: 0x888888,
      side: THREE.DoubleSide,
    });
    this.scene.add(new THREE.Mesh(railGeo, railMat));

    // Vertical Support Posts & Safety Reflectors (Every 6 meters)
    const postGeo = new THREE.BoxGeometry(0.08, RAIL_HEIGHT + 0.1, 0.08);
    const postMat = new THREE.MeshPhongMaterial({ color: 0x64748b, shininess: 50 });
    const reflGeo = new THREE.BoxGeometry(0.09, 0.10, 0.04);
    const reflRedMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const reflWhiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    const postStep = Math.max(2, Math.floor(TRACK_SAMPLES / (this.trackArcLength / 6)));

    [-1, 1].forEach((sideSign) => {
      for (let i = 0; i < TRACK_SAMPLES; i += postStep) {
        const pos = this.sampledPositions[i];
        const norm = this.sampledNormals[i];

        const postPos = pos.clone().addScaledVector(norm, sideSign * totalOffset);
        const post = new THREE.Mesh(postGeo, postMat);
        post.position.copy(postPos).add(new THREE.Vector3(0, (RAIL_HEIGHT + 0.1) / 2 - 0.05, 0));
        post.castShadow = true;
        this.scene.add(post);

        // Reflector marker on post facing the road
        const refl = new THREE.Mesh(reflGeo, sideSign === -1 ? reflWhiteMat : reflRedMat);
        refl.position.copy(postPos).add(new THREE.Vector3(0, RAIL_HEIGHT * 0.75, 0));
        refl.position.addScaledVector(norm, sideSign * -0.04);
        this.scene.add(refl);
      }
    });
  }

  // ─── Concrete Viaduct Bridge Piers (Grounding Elevated Road Spans) ───────

  private buildViaductPiers() {
    const pierGroup = new THREE.Group();
    pierGroup.name = 'viaductPiers';

    const concreteMat = new THREE.MeshPhongMaterial({
      color: 0x94a3b8,
      shininess: 25,
      specular: 0x333333,
    });
    const darkConcreteMat = new THREE.MeshPhongMaterial({
      color: 0x475569,
      shininess: 15,
    });

    const pierStep = Math.max(3, Math.round(TRACK_SAMPLES / (this.trackArcLength / 18)));
    const minClearance = 1.35; // Deck clearance threshold where piers are placed
    const pillarSpacing = 4.2;
    const pillarRadius = 0.55;
    const capWidth = (ROAD_HALF_WIDTH + KERB_WIDTH + SHOULDER_WIDTH) * 2 - 0.4;
    const capHeight = 0.85;
    const capDepth = 1.8;

    for (let i = 0; i < TRACK_SAMPLES; i += pierStep) {
      const pos = this.sampledPositions[i];
      const tangent = this.sampledTangents[i];
      const normal = this.sampledNormals[i];

      const deckUndersideY = pos.y - DECK_THICKNESS;
      if (deckUndersideY < minClearance) continue;

      // 1. Concrete Cap Beam (directly supporting underside of road deck)
      const cap = new THREE.Mesh(
        new THREE.BoxGeometry(capWidth, capHeight, capDepth),
        concreteMat
      );
      const capCenterY = deckUndersideY - capHeight * 0.5;
      cap.position.set(pos.x, capCenterY, pos.z);
      cap.lookAt(pos.x + tangent.x, capCenterY, pos.z + tangent.z);
      cap.castShadow = true;
      cap.receiveShadow = true;
      pierGroup.add(cap);

      // 2. Twin Concrete Pillars (extending down from cap to ground level Y = 0)
      const pillarTopY = capCenterY - capHeight * 0.5;
      const pillarBottomY = 0;
      const pillarHeight = Math.max(0.2, pillarTopY - pillarBottomY);

      [-1, 1].forEach((side) => {
        const pillarOffset = side * pillarSpacing;
        const pillarPos = pos.clone().addScaledVector(normal, pillarOffset);

        // Cylindrical Reinforced Concrete Pillar Column
        const pillarGeo = new THREE.CylinderGeometry(pillarRadius, pillarRadius * 1.1, pillarHeight, 14);
        const pillar = new THREE.Mesh(pillarGeo, concreteMat);
        pillar.position.set(pillarPos.x, pillarBottomY + pillarHeight * 0.5, pillarPos.z);
        pillar.castShadow = true;
        pillar.receiveShadow = true;
        pierGroup.add(pillar);

        // Concrete Footing Pedestal Base Block
        const footingGeo = new THREE.BoxGeometry(1.6, 0.45, 1.6);
        const footing = new THREE.Mesh(footingGeo, darkConcreteMat);
        footing.position.set(pillarPos.x, 0.225, pillarPos.z);
        footing.receiveShadow = true;
        pierGroup.add(footing);
      });
    }

    this.scene.add(pierGroup);
  }

  // ─── Continuous Sloping Earth Embankment Skirt ─────────────────────────────

  private buildEmbankmentSkirt() {
    const numSeg = TRACK_SAMPLES;
    const totalWidth = ROAD_HALF_WIDTH + KERB_WIDTH + SHOULDER_WIDTH;
    const positions: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];

    [-1, 1].forEach((sideSign) => {
      const baseIdx = positions.length / 3;

      for (let i = 0; i <= numSeg; i++) {
        const pos = this.sampledPositions[i];
        const norm = this.sampledNormals[i];

        const outward = norm.clone().multiplyScalar(sideSign);
        const edge = pos.clone().addScaledVector(outward, totalWidth);
        const edgeY = edge.y - DECK_THICKNESS;
        const h = Math.max(0, edgeY);

        // Realistic outward slope run: h * 1.35 + 0.5 creates a stable ~36 deg highway embankment
        const run = h > 0.05 ? h * 1.35 + 0.5 : 0.0;
        const toe = edge.clone().addScaledVector(outward, run);
        toe.y = 0.0;

        positions.push(edge.x, edgeY, edge.z);
        positions.push(toe.x, 0.0, toe.z);

        // Vertex coloring: top edge transitions between rock/retaining earth, bottom toe blends into lush ground (#22542a)
        const isHigh = h > 2.0;
        const topColor = isHigh ? [0.38, 0.40, 0.36] : [0.22, 0.40, 0.24];
        const botColor = [0.13, 0.33, 0.16]; // exact hex #22542a of ground plane

        colors.push(topColor[0], topColor[1], topColor[2]);
        colors.push(botColor[0], botColor[1], botColor[2]);

        if (i < numSeg) {
          const nextI = i + 1;
          const a0 = baseIdx + i * 2;
          const b0 = baseIdx + i * 2 + 1;
          const a1 = baseIdx + nextI * 2;
          const b1 = baseIdx + nextI * 2 + 1;

          if (sideSign === 1) {
            indices.push(a0, b0, a1);
            indices.push(b0, b1, a1);
          } else {
            indices.push(a0, a1, b0);
            indices.push(b0, a1, b1);
          }
        }
      }
    });

    const embGeo = new THREE.BufferGeometry();
    embGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    embGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    embGeo.setIndex(indices);
    embGeo.computeVertexNormals();

    const embMat = new THREE.MeshPhongMaterial({
      vertexColors: true,
      shininess: 12,
      side: THREE.DoubleSide,
    });
    const embMesh = new THREE.Mesh(embGeo, embMat);
    embMesh.receiveShadow = true;
    this.scene.add(embMesh);
  }

  // ─── Finish Line & Gantry ─────────────────────────────────────────────────

  private buildFinishLine() {
    const finishIdx = this.isClosedTrack ? 0 : TRACK_SAMPLES;
    const pos = this.sampledPositions[finishIdx];
    const normal = this.sampledNormals[finishIdx];
    const tangent = this.sampledTangents[finishIdx];

    const checkWidth = ROAD_HALF_WIDTH * 2;
    const numCols = 10;
    const cellW = checkWidth / numCols;
    const cellH = 0.8;

    for (let c = 0; c < numCols; c++) {
      for (let r = 0; r < 2; r++) {
        const isWhite = (c + r) % 2 === 0;
        const cell = new THREE.Mesh(
          new THREE.PlaneGeometry(cellW, cellH),
          new THREE.MeshBasicMaterial({ color: isWhite ? 0xffffff : 0x111111, side: THREE.DoubleSide })
        );
        const lateral = -ROAD_HALF_WIDTH + (c + 0.5) * cellW;
        const forward = (r - 0.5) * cellH;

        cell.position.copy(pos);
        cell.position.addScaledVector(normal, lateral);
        cell.position.addScaledVector(tangent, forward);
        cell.position.y += 0.04;
        cell.rotation.x = -Math.PI / 2;
        this.scene.add(cell);
      }
    }
  }

  private buildStartGantry() {
    const pos = this.sampledPositions[0];
    const normal = this.sampledNormals[0];
    const tangent = this.sampledTangents[0];

    const spanW = (ROAD_HALF_WIDTH + KERB_WIDTH + SHOULDER_WIDTH) * 2;
    const gantry = new THREE.Group();

    const pillarMat = new THREE.MeshPhongMaterial({ color: 0x0f172a });
    const beamMat = new THREE.MeshPhongMaterial({ color: 0x1e293b });

    [-1, 1].forEach((side) => {
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 8.5, 12), pillarMat);
      pillar.position.copy(pos).addScaledVector(normal, side * (spanW / 2 + 0.5));
      pillar.position.y += 4.25;
      gantry.add(pillar);
    });

    const beam = new THREE.Mesh(new THREE.BoxGeometry(spanW + 2, 1.2, 1.2), beamMat);
    beam.position.copy(pos);
    beam.position.y += 8.2;
    beam.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), normal.clone());
    gantry.add(beam);

    // Glowing START Banner
    const bannerCanvas = document.createElement('canvas');
    bannerCanvas.width = 512;
    bannerCanvas.height = 128;
    const bctx = bannerCanvas.getContext('2d')!;
    bctx.fillStyle = '#0f172a';
    bctx.fillRect(0, 0, 512, 128);
    bctx.strokeStyle = '#f59e0b';
    bctx.lineWidth = 6;
    bctx.strokeRect(6, 6, 500, 116);
    bctx.fillStyle = '#facc15';
    bctx.font = '900 68px sans-serif';
    bctx.textAlign = 'center';
    bctx.textBaseline = 'middle';
    bctx.fillText('START', 256, 64);

    const bannerTex = new THREE.CanvasTexture(bannerCanvas);
    const bannerMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(spanW * 0.65, 2.2),
      new THREE.MeshBasicMaterial({ map: bannerTex, side: THREE.DoubleSide })
    );
    bannerMesh.position.copy(pos);
    bannerMesh.position.y += 8.2;
    bannerMesh.position.addScaledVector(tangent, -0.65);
    bannerMesh.lookAt(bannerMesh.position.clone().add(tangent));
    bannerMesh.rotation.y += Math.PI;
    gantry.add(bannerMesh);

    this.scene.add(gantry);
  }

  // ─── Environment & Mountain Background ────────────────────────────────────

  private buildEnvironment(trackId: string) {
    // 1. Terrain Ground Plane
    const groundGeo = new THREE.PlaneGeometry(1600, 1600);
    const groundMat = new THREE.MeshPhongMaterial({ color: 0x22542a, shininess: 5 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.05;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // 2. Mountains (Spaced naturally so they don't block the highway)
    this.addMountainRange();

    // 3. Scenic Rolling Green Foothills under Elevated Highway
    this.addRollingHills(trackId);

    // 4. Roadside Pine & Palm Trees (firmly grounded at ground level)
    this.addRoadsideVegetation();

    // 5. Goodyear Blimp in Sky
    this.addGoodyearBlimp();

    this.scene.add(this.envGroup);
  }

  private addRollingHills(trackId: string) {
    const hillMat = new THREE.MeshPhongMaterial({
      color: 0x28592f,
      shininess: 4,
      flatShading: true,
    });

    const points = getTrackPoints(trackId);
    points.forEach((pt) => {
      if (pt.y > 1.2) {
        // Place lush rolling green hill mound centered beneath high elevation spans
        const radius = Math.max(28, pt.y * 5.2);
        const height = pt.y * 0.92;
        const hillGeo = new THREE.ConeGeometry(radius, height, 14);
        const hillMesh = new THREE.Mesh(hillGeo, hillMat);
        hillMesh.position.set(pt.x, height * 0.5, pt.z);
        hillMesh.receiveShadow = true;
        this.envGroup.add(hillMesh);
      }
    });
  }

  private addMountainRange() {
    const mtnMat = new THREE.MeshPhongMaterial({ color: 0x3d5a37, flatShading: true });
    const snowMat = new THREE.MeshPhongMaterial({ color: 0xf1f5f9, flatShading: true });

    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      const dist = 320 + (i % 3) * 80;
      const height = 45 + ((i * 17) % 55);
      const radius = 35 + ((i * 13) % 40);

      const mtn = new THREE.Mesh(new THREE.ConeGeometry(radius, height, 7), mtnMat);
      mtn.position.set(Math.cos(angle) * dist, height / 2 - 5, Math.sin(angle) * dist);
      this.envGroup.add(mtn);

      const snow = new THREE.Mesh(new THREE.ConeGeometry(radius * 0.32, height * 0.22, 7), snowMat);
      snow.position.copy(mtn.position);
      snow.position.y += height * 0.39;
      this.envGroup.add(snow);
    }
  }

  private addRoadsideVegetation() {
    const trunkMat = new THREE.MeshPhongMaterial({ color: 0x5c3d2e });
    const foliageMat = new THREE.MeshPhongMaterial({ color: 0x166534 });

    const totalWidth = ROAD_HALF_WIDTH + KERB_WIDTH + SHOULDER_WIDTH;

    for (let i = 0; i < 90; i++) {
      const sampleIdx = Math.floor((i * 17) % TRACK_SAMPLES);
      const pos = this.sampledPositions[sampleIdx];
      const norm = this.sampledNormals[sampleIdx];

      const side = i % 2 === 0 ? 1 : -1;
      const dist = totalWidth + 4 + ((i * 7) % 18);

      const treeGroup = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 2.5, 6), trunkMat);
      trunk.position.y = 1.25;
      treeGroup.add(trunk);

      const foliage = new THREE.Mesh(new THREE.ConeGeometry(1.6, 3.8, 8), foliageMat);
      foliage.position.y = 3.8;
      treeGroup.add(foliage);

      // Trees are firmly planted at ground plane Y = 0 (never floating in the sky)
      treeGroup.position.set(
        pos.x + norm.x * side * dist,
        0,
        pos.z + norm.z * side * dist
      );
      this.envGroup.add(treeGroup);
    }
  }

  private addGoodyearBlimp() {
    const blimpGroup = new THREE.Group();
    blimpGroup.position.set(160, 95, -180);

    const bodyMat = new THREE.MeshPhongMaterial({ color: 0xdbeafe, shininess: 80 });
    const body = new THREE.Mesh(new THREE.SphereGeometry(18, 20, 16), bodyMat);
    body.scale.set(1, 0.55, 2.6);
    blimpGroup.add(body);

    const finMat = new THREE.MeshPhongMaterial({ color: 0x1e3a8a });
    [-1, 1].forEach((fSide) => {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.5, 6, 5), finMat);
      fin.position.set(fSide * 8, 0, -32);
      blimpGroup.add(fin);
    });

    this.scene.add(blimpGroup);
  }

  // ─── Cyclist Management ───────────────────────────────────────────────────

  addRacer(
    id: string,
    name: string,
    jerseyColor: string,
    bikeColor: string,
    isPlayer: boolean,
    character?: CharacterState
  ) {
    if (this.cyclists.has(id)) return;

    const cyclist = createCyclist(name, jerseyColor, bikeColor, isPlayer, character);
    this.scene.add(cyclist.group);
    this.cyclists.set(id, cyclist);
  }

  removeRacer(id: string) {
    const cyclist = this.cyclists.get(id);
    if (cyclist) {
      this.scene.remove(cyclist.group);
      this.cyclists.delete(id);
    }
  }

  // ─── Position Mapping: Game Distance → 3D Road Position ───────────────────

  private getTrackPosition(gameZ: number, lateralX: number): {
    position: THREE.Vector3;
    tangent: THREE.Vector3;
    normal: THREE.Vector3;
  } {
    const lapLen = this.gameTrackLength / this.laps;
    let u: number;

    if (this.isClosedTrack) {
      if (gameZ >= this.gameTrackLength) {
        u = 0.999;
      } else {
        u = Math.min(0.999, Math.max(0, (gameZ % lapLen) / lapLen));
      }
    } else {
      u = Math.min(1, Math.max(0, gameZ / this.gameTrackLength));
    }

    const floatIdx = u * TRACK_SAMPLES;
    const idx0 = Math.min(Math.floor(floatIdx), TRACK_SAMPLES - 1);
    const idx1 = (idx0 + 1) % (TRACK_SAMPLES + 1);
    const frac = floatIdx - idx0;

    const pos = this.sampledPositions[idx0].clone().lerp(this.sampledPositions[idx1], frac);
    const tangent = this.sampledTangents[idx0].clone().lerp(this.sampledTangents[idx1], frac).normalize();
    const normal = this.sampledNormals[idx0].clone().lerp(this.sampledNormals[idx1], frac).normalize();

    // Map lateralX (-1 to +1) within road bounds
    const lateralOffset = lateralX * (ROAD_HALF_WIDTH - 0.7);
    pos.addScaledVector(normal, lateralOffset);

    return { position: pos, tangent, normal };
  }

  // ─── Per-Frame Update (Driven by Game Loop) ────────────────────────────────

  update(racers: RacerUpdate[], dt: number) {
    this.elapsedTime += dt;

    let playerPos: THREE.Vector3 | null = null;
    let playerTangent: THREE.Vector3 | null = null;
    let playerNormal: THREE.Vector3 | null = null;

    for (const racer of racers) {
      if (!this.cyclists.has(racer.id)) {
        this.addRacer(
          racer.id,
          racer.name,
          racer.jerseyColor,
          racer.bikeColor,
          racer.isPlayer,
          racer.character
        );
      }

      const cyclist = this.cyclists.get(racer.id)!;
      const { position, tangent, normal } = this.getTrackPosition(racer.z, racer.x);

      // Position cyclist on elevated road
      cyclist.group.position.copy(position);

      // Orient smoothly forward along road tangent (rock-solid orientation, never flips or inverts)
      const lookTarget = position.clone().add(tangent);
      cyclist.group.lookAt(lookTarget);

      // Dynamic lean & banking physics (Centripetal Curve Lean + Steering Lean)
      const lapLen = this.gameTrackLength / this.laps;
      const trackFrac = this.isClosedTrack
        ? ((racer.z % lapLen) / lapLen)
        : Math.min(1, Math.max(0, racer.z / this.gameTrackLength));
      const sampleIdx = Math.min(
        TRACK_SAMPLES,
        Math.max(0, Math.floor(trackFrac * TRACK_SAMPLES))
      );
      const kappaLat = this.sampledCurvatures[sampleIdx] || 0;

      // 1. DeepSeek R1 Kinematic Steering Angle (Fork, Drop Handlebars, Front Wheel)
      const dx = (racer.x - cyclist.prevX) / Math.max(dt, 0.001);
      cyclist.prevX = racer.x;

      const v = Math.max(0.4, racer.speedMps);
      const wheelbase = 1.10;
      const kinematicSteer = Math.atan(wheelbase * kappaLat);
      const lateralSteer = 0.55 * Math.atan2(dx, Math.max(2.0, v));
      const maxSteer = THREE.MathUtils.degToRad(24);
      const targetSteer = THREE.MathUtils.clamp(kinematicSteer + lateralSteer, -maxSteer, maxSteer);

      // Smooth exponential damping for realistic handlebar steering inertia
      const steerAlpha = 1 - Math.exp(-14.0 * dt);
      cyclist.currentSteer += (targetSteer - cyclist.currentSteer) * steerAlpha;

      // Rotate steerPivot along head tube axis (leaning back ~10 deg rake)
      const steerAxis = new THREE.Vector3(0, 0.985, -0.174).normalize();
      cyclist.steerPivot.quaternion.setFromAxisAngle(steerAxis, cyclist.currentSteer);

      // 2. Dynamic Centripetal + Lateral Banking Lean
      const centripetalLean = -Math.atan((v * v * kappaLat) / 9.81);
      const steeringLean = -0.12 * THREE.MathUtils.clamp(dx, -2.5, 2.5);
      const maxLean = THREE.MathUtils.degToRad(24);
      const targetLean = THREE.MathUtils.clamp(centripetalLean + steeringLean, -maxLean, maxLean);

      const leanAlpha = 1 - Math.exp(-8.0 * dt);
      cyclist.currentLean += (targetLean - cyclist.currentLean) * leanAlpha;
      cyclist.rollPivot.rotation.z = cyclist.currentLean;

      // 3. Pedaling crank rotation
      if (racer.isPedaling && racer.speedMps > 0.4) {
        const crankCadence = 3.5 + racer.speedMps * 0.85;
        cyclist.crankGroup.rotation.x += crankCadence * dt;
      }

      // 4. Wheels rotation (front and rear)
      const wheelSpeed = racer.speedMps / 0.34;
      cyclist.frontWheel.rotation.x += wheelSpeed * dt;
      cyclist.rearWheel.rotation.x += wheelSpeed * dt;

      // 5. DeepSeek R1 Full Organic Cyclist Kinematics (Pelvis, Torso, Gaze, Arms, Legs)
      const crankAngle = cyclist.crankGroup.rotation.x;
      cyclist.updateKinematics(crankAngle, racer.speedMps, dt);

      // Motor glow effect
      if (racer.isMotorActive && racer.batteryPct > 1) {
        cyclist.motorGlow.intensity = 2.2 + Math.sin(this.elapsedTime * 12) * 0.6;
        cyclist.motorGlow.color.setHex(0x38bdf8);
      } else {
        cyclist.motorGlow.intensity = 0;
      }

      // Battery LED indicator
      const ledMat = cyclist.batteryLed.material as THREE.MeshBasicMaterial;
      if (racer.batteryPct > 50) {
        ledMat.color.setHex(0x34d399);
      } else if (racer.batteryPct > 20) {
        ledMat.color.setHex(0xfbbf24);
      } else {
        ledMat.color.setHex(0xef4444);
      }
      ledMat.visible = racer.isMotorActive;

      // Brake particles
      const sparkMat = cyclist.brakeParticles.material as THREE.PointsMaterial;
      if (racer.isBraking && racer.speedMps > 1) {
        sparkMat.opacity = 0.8;
      } else {
        sparkMat.opacity = 0;
      }

      if (racer.isPlayer) {
        playerPos = position;
        playerTangent = tangent;
        playerNormal = normal;
      }
    }

    // ── Smooth Spring-Arm Chase Camera Follow with Horizon Banking & Apex Anticipation ──
    if (playerPos && playerTangent && playerNormal) {
      const lastPlayer = racers.find((r) => r.isPlayer);
      const playerCyclist = lastPlayer ? this.cyclists.get(lastPlayer.id) : null;
      const playerSpeed = lastPlayer?.speedMps || 0;
      const isBoosting = !!(lastPlayer?.isMotorActive && lastPlayer.batteryPct > 1);

      // 1. Independent lateral smoothing (prevents rigid snapping when turning left/right)
      const targetLateral = lastPlayer ? lastPlayer.x : 0;
      const lateralAlpha = 1 - Math.exp(-2.5 * dt);
      this.smoothCamLateral += (targetLateral - this.smoothCamLateral) * lateralAlpha;

      // 2. Base camera offset: behind and above
      const camDist = 8.2;
      const camHeight = 3.6;
      const targetCamPos = playerPos.clone()
        .addScaledVector(playerTangent, -camDist)
        .add(new THREE.Vector3(0, camHeight, 0))
        .addScaledVector(playerNormal, this.smoothCamLateral * 1.35);

      // 3. Apex look-ahead: looks into the corner apex and smoothly anticipates player heading
      const lapLen = this.gameTrackLength / this.laps;
      const trackFrac = this.isClosedTrack
        ? (((lastPlayer?.z || 0) % lapLen) / lapLen)
        : Math.min(1, Math.max(0, (lastPlayer?.z || 0) / this.gameTrackLength));
      const sampleIdx = Math.min(
        TRACK_SAMPLES,
        Math.max(0, Math.floor(trackFrac * TRACK_SAMPLES))
      );
      const kappaLat = this.sampledCurvatures[sampleIdx] || 0;
      const apexOffset = THREE.MathUtils.clamp(kappaLat * 18.0, -2.4, 2.4);

      const targetLookAt = playerPos.clone()
        .addScaledVector(playerTangent, 6.5)
        .add(new THREE.Vector3(0, 0.9, 0))
        .addScaledVector(playerNormal, apexOffset + this.smoothCamLateral * 0.45);

      // 4. Exponential position and target damping
      const posAlpha = 1 - Math.exp(-5.5 * dt);
      const lookAlpha = 1 - Math.exp(-7.0 * dt);
      this.smoothCamPos.lerp(targetCamPos, posAlpha);
      this.smoothCamTarget.lerp(targetLookAt, lookAlpha);

      this.camera.position.copy(this.smoothCamPos);

      // 5. Dutch roll / horizon banking: camera up-vector subtly tilts with bicycle bank angle
      const targetCamRoll = (playerCyclist?.currentLean || 0) * 0.18;
      const rollAlpha = 1 - Math.exp(-4.0 * dt);
      this.smoothCamRoll += (targetCamRoll - this.smoothCamRoll) * rollAlpha;

      const viewDir = new THREE.Vector3().subVectors(this.smoothCamTarget, this.smoothCamPos).normalize();
      if (viewDir.lengthSq() > 0.001) {
        const camUp = new THREE.Vector3(0, 1, 0).applyAxisAngle(viewDir, this.smoothCamRoll);
        this.camera.up.copy(camUp.normalize());
      }
      this.camera.lookAt(this.smoothCamTarget);

      // 6. Dynamic FOV with speed and boost
      const baseFov = 54;
      const speedFov = THREE.MathUtils.clamp(playerSpeed / 12, 0, 1) * 6;
      const boostFov = isBoosting ? 6 : 0;
      const targetFov = baseFov + speedFov + boostFov;
      const fovAlpha = 1 - Math.exp(-3.5 * dt);
      this.smoothFov += (targetFov - this.smoothFov) * fovAlpha;
      this.camera.fov = this.smoothFov;
      this.camera.updateProjectionMatrix();
    }

    // Render Scene
    this.renderer.render(this.scene, this.camera);
  }

  // ─── Window Resize & Cleanup ──────────────────────────────────────────────

  private handleResize() {
    const w = this.container.clientWidth || 800;
    const h = this.container.clientHeight || 600;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  dispose() {
    this.resizeObserver?.disconnect();
    this.cyclists.clear();
    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry?.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          obj.material?.dispose();
        }
      }
    });
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}
