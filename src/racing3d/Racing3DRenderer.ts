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
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { CharacterState } from '../types/game';
import { getStageBatteryItems, BatteryPickupConfig } from './batteryPickupsConfig';

export interface BatteryPickupVisual {
  id: string;
  config: BatteryPickupConfig;
  group: THREE.Group;
  core: THREE.Mesh;
  ring: THREE.Mesh;
  aura: THREE.Mesh;
  groundGlow: THREE.Mesh;
  basePos: THREE.Vector3;
  surfaceUp: THREE.Vector3;
  phase: number;
  collected: boolean;
  collectT: number;
}

// ─── Track Geometry Constants ───────────────────────────────────────────────

const ROAD_HALF_WIDTH = 3.2;      // 6.4 m wide track (realistic 2-lane racing circuit / downhill trail)
const KERB_WIDTH = 0.6;           // Red/white kerbs
const SHOULDER_WIDTH = 0.9;       // Outer shoulder
const DECK_LIFT = 0.85;           // Elevates roadbed above terrain (eliminates clipping & horizon gaps)
const DECK_THICKNESS = 0.50;      // 3D concrete slab thickness
const RAIL_HEIGHT = 0.85;         // Guardrail height above deck
const RAIL_BASE = 0.25;           // Guardrail lower ribbon bound
const RAIL_OFFSET = 0.15;         // Guardrail lateral offset on shoulder
const TRACK_SAMPLES = 800;        // Arc-length samples for continuous smooth curves
const FOG_NEAR = 120;
const FOG_FAR = 650;              // Visible distance for highway horizon

// Camera Constants (DeepSeek V4 Pro Optical Flow Tuned)
const CAM_DIST = 3.6;             // Bike fills 25-30% screen, strong sense of scale
const CAM_HEIGHT = 1.6;           // Near rider eye level (not a distant drone)
const CAM_LOOKAHEAD = 9.0;        // Looking down the trail for readable approach motion
const CAM_LOOK_UP = 0.55;         // Lower aim, keeping road surface in high-flow view
const BASE_FOV = 68;              // Wide action perspective
const MAX_FOV_KICK = 14;          // Expands dynamically up to 82° at top speed
const TOP_SPEED = 12.5;           // m/s (~45 km/h)

function hexColor(hex: string): THREE.Color {
  return new THREE.Color(hex);
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

// ─── Track Control Points ───────────────────────────────────────────────────

function getTrackPoints(trackId: string): THREE.Vector3[] {
  // DeepSeek V4 Pro: Exact Arc-Length Calibrated Track Points
  // Ensures 3D path length matches the physics game distance 1:1 across all circuits
  if (trackId === 'offroad_downhill') {
    // MX Offroad Downhill Trail (Target 800.0m) - Scale XZ: 0.85351
    // Starts high atop mountain ridge (Y: 65m) -> drops into steep rock descent (-22%) -> jump ramp (+8%) -> canyon -> finish
    const s = 0.85351;
    return [
      new THREE.Vector3(0 * s, 65, 0 * s),             // 0m (Ridge Peak starting line, Y: 65)
      new THREE.Vector3(35 * s, 62, -50 * s),          // 65m (Ridge roll-in, Y: 62)
      new THREE.Vector3(75 * s, 49, -110 * s),         // 145m (Entering steep gully -20%, Y: 49)
      new THREE.Vector3(55 * s, 33, -185 * s),         // 230m (Steep rocky hairpin switchback -22%, Y: 33)
      new THREE.Vector3(-10 * s, 24, -250 * s),        // 310m (Ridge edge trail, Y: 24)
      new THREE.Vector3(-60 * s, 20, -320 * s),        // 390m (Jump lip ramp +8% kicker, Y: 20)
      new THREE.Vector3(-95 * s, 13, -400 * s),        // 480m (Smooth air landing run-out, Y: 13)
      new THREE.Vector3(-110 * s, 8, -490 * s),        // 580m (Winding canyon S-bend, Y: 8)
      new THREE.Vector3(-75 * s, 4.5, -580 * s),       // 670m (Canyon exit, Y: 4.5)
      new THREE.Vector3(-20 * s, 2.0, -670 * s),       // 730m (High speed dirt sprint, Y: 2.0)
      new THREE.Vector3(35 * s, 0.5, -740 * s),        // 770m (Final straight, Y: 0.5)
      new THREE.Vector3(70 * s, 0.0, -800 * s),        // 800m (Finish arena at base of mountain, Y: 0)
    ];
  }
  if (trackId === 'hill_climb') {
    // Undulating uphill highway with realistic slope physics (Target 600.0m) - Scale XZ: 0.98476
    // Climb (+14%) -> Downhill Valley (-9%) -> Second Mountain Climb to Summit (+16%)
    const s = 0.98476;
    return [
      new THREE.Vector3(0 * s, 0, 0 * s),             // 0m (Y: 0m)
      new THREE.Vector3(30 * s, 2.5, -40 * s),        // 50m (Y: 2.5m)
      new THREE.Vector3(75 * s, 7.5, -75 * s),        // 110m (Y: 7.5m) - base of mountain
      new THREE.Vector3(95 * s, 16.0, -130 * s),      // 175m (Y: 16m) - steep climb (+14%)
      new THREE.Vector3(60 * s, 26.0, -180 * s),      // 240m (Y: 26m) - near first peak
      new THREE.Vector3(15 * s, 29.5, -205 * s),      // 275m (Y: 29.5m) - crest
      new THREE.Vector3(-35 * s, 23.5, -225 * s),     // 325m (Y: 23.5m) - downhill descent (-9%)
      new THREE.Vector3(-80 * s, 20.0, -210 * s),     // 365m (Y: 20m) - valley bottom
      new THREE.Vector3(-115 * s, 28.5, -165 * s),    // 425m (Y: 28.5m) - second mountain climb (+15%)
      new THREE.Vector3(-125 * s, 38.5, -115 * s),    // 485m (Y: 38.5m) - steep switchback (+16%)
      new THREE.Vector3(-95 * s, 43.5, -65 * s),      // 545m (Y: 43.5m) - summit
      new THREE.Vector3(-55 * s, 42.0, -30 * s),      // 600m (Y: 42m) - mountain top finish line
    ];
  }
  if (trackId === 'endurance_route') {
    // Rolling hills figure-8 circuit (Target 400.0m per lap, 1,200m 3 laps) - Scale XZ: 0.70338
    const s = 0.70338;
    return [
      new THREE.Vector3(0 * s, 0, 0 * s),
      new THREE.Vector3(50 * s, 2, -40 * s),
      new THREE.Vector3(100 * s, 4, -20 * s),
      new THREE.Vector3(135 * s, 2, -60 * s),
      new THREE.Vector3(105 * s, 5, -110 * s),
      new THREE.Vector3(50 * s, 7, -130 * s),
      new THREE.Vector3(0 * s, 4, -100 * s),
      new THREE.Vector3(-50 * s, 2, -70 * s),
      new THREE.Vector3(-80 * s, 0, -30 * s),
      new THREE.Vector3(-50 * s, 1, 10 * s),
    ];
  }
  // flat_sprint — smooth highway oval with gentle 3D elevation camber (Target 400.0m) - Scale XZ: 0.67591
  const s = 0.67591;
  return [
    new THREE.Vector3(0 * s, 0, 0 * s),
    new THREE.Vector3(45 * s, 0.3, -5 * s),
    new THREE.Vector3(95 * s, 0.7, -10 * s),
    new THREE.Vector3(145 * s, 1.1, -25 * s),
    new THREE.Vector3(180 * s, 1.4, -60 * s),
    new THREE.Vector3(175 * s, 1.6, -105 * s),
    new THREE.Vector3(135 * s, 1.3, -135 * s),
    new THREE.Vector3(85 * s, 0.9, -145 * s),
    new THREE.Vector3(30 * s, 0.5, -135 * s),
    new THREE.Vector3(-20 * s, 0.2, -105 * s),
    new THREE.Vector3(-45 * s, 0.1, -65 * s),
    new THREE.Vector3(-25 * s, 0.0, -25 * s),
  ];
}

// ─── Cyclist Parts & IK Interface ──────────────────────────────────────────

interface CyclistParts {
  group: THREE.Group;
  rollPivot: THREE.Group;
  steerPivot: THREE.Group;
  forkSuspensionGroup: THREE.Group;
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
  updateKinematics: (
    crankAngle: number,
    speedMps: number,
    dt: number,
    slopePercent?: number,
    isBraking?: boolean
  ) => void;
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

  // Fork crown
  const forkCrown = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.09, 8), chromeMat);
  forkCrown.rotation.z = Math.PI / 2;
  forkCrown.position.set(0, -0.06, 0);
  steerPivot.add(forkCrown);

  // Upper stanchions (fixed to fork crown)
  [-0.035, 0.035].forEach((sideX) => {
    const stanchion = createTube(
      new THREE.Vector3(sideX, -0.06, 0),
      new THREE.Vector3(sideX, frontAxleLocal.y * 0.55, frontAxleLocal.z * 0.55),
      chromeMat,
      0.016
    );
    steerPivot.add(stanchion);
  });

  // Telescopic Suspension Slider Group (Compresses dynamically on downhill bumps & braking)
  const forkSuspensionGroup = new THREE.Group();
  steerPivot.add(forkSuspensionGroup);

  // Lower fork sliders (Anodized MTB suspension look)
  [-0.035, 0.035].forEach((sideX) => {
    const slider = createTube(
      new THREE.Vector3(sideX, frontAxleLocal.y * 0.50, frontAxleLocal.z * 0.50),
      new THREE.Vector3(sideX, frontAxleLocal.y, frontAxleLocal.z),
      isTechGirl ? goldMat : darkMat,
      0.022
    );
    forkSuspensionGroup.add(slider);
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

  // Front wheel is placed in frontWheelPivot under forkSuspensionGroup so it turns with steering and compresses
  const frontWheelPivot = new THREE.Group();
  frontWheelPivot.position.copy(frontAxleLocal);
  forkSuspensionGroup.add(frontWheelPivot);

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

  // DeepSeek V4 Pro Full Organic Cyclist Kinematics, Weight Shift & Two-Bone IK Update
  const updateKinematics = (
    crankAngle: number,
    speedMps: number,
    dt: number,
    slopePercent: number = 0,
    isBraking: boolean = false
  ) => {
    const activity = THREE.MathUtils.clamp(speedMps / 3.0, 0.0, 1.0);
    const s = Math.sin(crankAngle);
    const c = Math.cos(crankAngle);
    const down = 0.5 - 0.5 * Math.cos(2 * crankAngle);

    // Dynamic Weight Shift (MX Offroad Master inspired):
    // On Downhill (slope < 0): rider shifts weight back (Lean Back) over rear wheel to prevent over-the-bars!
    // On Steep Uphill (slope > 0): rider shifts weight forward to keep front wheel planted
    const slopeFactor = THREE.MathUtils.clamp(slopePercent / 20.0, -1.0, 1.0);
    const weightShiftZ = slopeFactor < 0
      ? -slopeFactor * 0.09   // Shifting hips back up to +9cm on -20% descent
      : -slopeFactor * 0.04;  // Shifting forward up to -4cm on +20% climb
    const weightShiftY = slopeFactor < 0 ? -0.024 * Math.abs(slopeFactor) : 0.008 * slopeFactor;

    // 1. Pelvis Dynamic Sway & Heave
    const pelvicHeave = -0.016 * down * activity + weightShiftY;
    const pelvicSway = 0.008 * s * activity;
    const pelvicRoll = -0.035 * s * activity;
    const pelvicYaw = -0.022 * c * activity;
    const pelvicPitch = 0.008 * down * activity + (slopeFactor < 0 ? 0.12 * -slopeFactor : -0.06 * slopeFactor);

    pelvisGroup.position.copy(pelvisBasePos);
    pelvisGroup.position.y += pelvicHeave;
    pelvisGroup.position.x += pelvicSway;
    pelvisGroup.position.z += weightShiftZ;
    pelvisGroup.rotation.set(pelvicPitch, pelvicYaw, pelvicRoll, 'YXZ');

    // 2. Torso Dynamic Effort Bobbing, Counter-Roll & Lateral Sway
    const torsoCounterPitch = slopeFactor < 0 ? -0.26 * Math.abs(slopeFactor) : 0.14 * slopeFactor;
    const torsoPitch = torsoBaseLean + 0.038 * down * activity + torsoCounterPitch;
    const torsoRoll = -pelvicRoll * 0.65 + 0.012 * s * activity;
    const torsoYaw = -pelvicYaw * 0.35 + 0.015 * s * activity;
    const torsoLateral = 0.006 * s * activity;

    torsoGroup.position.set(torsoLateral, 0.06, 0.02);
    torsoGroup.rotation.set(torsoPitch, torsoYaw, torsoRoll, 'YXZ');

    // 3. Telescopic Suspension Compression & Brake Dive
    const brakeDive = isBraking ? 0.032 : 0.0;
    const bumpVibe = activity > 0.1 ? Math.sin(crankAngle * 3.5) * 0.006 * activity : 0.0;
    const targetSuspension = THREE.MathUtils.clamp(brakeDive + bumpVibe, 0.0, 0.045);
    forkSuspensionGroup.position.set(0, targetSuspension * 0.985, -targetSuspension * 0.174);

    // 4. Head & Neck Gaze Stabilization + subtle nod
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
    forkSuspensionGroup,
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
  slopePercent?: number;
  isRegenActive?: boolean;
}

export class Racing3DRenderer {
  private container: HTMLDivElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private cyclists: Map<string, CyclistParts> = new Map();
  private envGroup: THREE.Group = new THREE.Group();
  private batteryPickups: Map<string, BatteryPickupVisual> = new Map();
  private batteryPickupsGroup: THREE.Group = new THREE.Group();

  // Track
  private trackCurve!: THREE.CatmullRomCurve3;
  private trackArcLength: number = 0;
  private gameTrackLength: number;
  private trackId: string;
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
  private smoothFov: number = BASE_FOV;

  // Time & animations
  private elapsedTime = 0;
  private resizeObserver: ResizeObserver;
  private customBikeModel: THREE.Group | null = null;
  private currentWidth = 0;
  private currentHeight = 0;

  // 3D Starting Traffic Lights
  private startLights: {
    redMat: THREE.MeshBasicMaterial;
    amberMat: THREE.MeshBasicMaterial;
    greenMat: THREE.MeshBasicMaterial;
  } | null = null;

  // Collision impact visual effects
  private cameraShake: number = 0;
  private collisionShockwave: THREE.Mesh | null = null;
  private shockwaveLife: number = 0;

  // Sky, stadium blimp & drifting clouds
  private clouds: THREE.Group[] = [];
  private stadiumBlimp: THREE.Group | null = null;
  private trackCenterX: number = 0;
  private trackCenterZ: number = 0;
  private trackSpanX: number = 100;
  private trackSpanZ: number = 100;

  constructor(
    container: HTMLDivElement,
    trackId: string,
    gameTrackLength: number,
    laps: number = 1
  ) {
    this.container = container;
    this.gameTrackLength = gameTrackLength;
    this.trackId = trackId;
    this.laps = laps;
    this.isClosedTrack = trackId !== 'hill_climb' && trackId !== 'offroad_downhill';

    // Try loading custom Blender GLB model for player bike
    this.loadCustomBikeModel();

    // ── 1. Scene & Atmosphere ──
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x38bdf8); // Radiant sunny sky blue (matching reference stadium image)
    this.scene.fog = new THREE.Fog(0x38bdf8, 280, 1600); // Soft atmospheric horizon haze matching sky color

    // ── 2. Camera ──
    const w = container.clientWidth || 800;
    const h = container.clientHeight || 600;
    this.currentWidth = w;
    this.currentHeight = h;
    this.camera = new THREE.PerspectiveCamera(BASE_FOV, w / h, 0.1, 2500);
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

    // ── 6. Battery Energy Pickups ──
    this.scene.add(this.batteryPickupsGroup);
    this.buildBatteryPickups(trackId);

    // ── 7. Collision Impact Visual Decal (Reusable, zero-recompile) ──
    const shockwaveGeo = new THREE.RingGeometry(0.3, 0.85, 24);
    const shockwaveMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.collisionShockwave = new THREE.Mesh(shockwaveGeo, shockwaveMat);
    this.collisionShockwave.rotation.x = Math.PI / 2;
    this.collisionShockwave.position.set(0, -9999, 0);
    this.scene.add(this.collisionShockwave);

    // ── 8. Environment & Scenery ──
    this.buildEnvironment(trackId);

    // ── 9. Resize Observer ──
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
    const fallbackRef = new THREE.Vector3(0, 0, 1);

    for (let i = 0; i <= TRACK_SAMPLES; i++) {
      const u = i / TRACK_SAMPLES;
      const pos = this.trackCurve.getPointAt(u);
      pos.y += DECK_LIFT; // Elevate road deck above terrain to eliminate clipping

      const tan = this.trackCurve.getTangentAt(u).normalize();
      
      // DeepSeek V4 Pro: Lateral Right Vector R = normalize(Tangent x UP)
      // Intrinsically oriented to rider's true right-hand side across all angles and track loops.
      // Left button steers Left, Right button steers Right consistently on every track.
      let normal: THREE.Vector3;
      if (Math.abs(tan.dot(up)) > 0.999) {
        normal = new THREE.Vector3().crossVectors(fallbackRef, up).normalize();
      } else {
        normal = new THREE.Vector3().crossVectors(tan, up).normalize();
      }

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

    const isOffroad = this.trackId === 'offroad_downhill';

    // 1. Surface Strip (Asphalt Highway or Offroad Mountain Dirt Trail)
    addStrip(asphaltLeft, asphaltRight, (i) => {
      if (isOffroad) {
        const isAlt = Math.floor(i / 5) % 2 === 0;
        return isAlt ? [0.38, 0.26, 0.16] : [0.32, 0.22, 0.13]; // Warm mountain dirt/gravel trail
      }
      const isAlt = Math.floor(i / 6) % 2 === 0;
      const c = isAlt ? 0.16 : 0.13;
      return [c, c, c + 0.015];
    });

    // 2. Left Kerb (Red/White or Weathered Mountain Stone)
    addStrip(kerbLeftOuter, asphaltLeft, (i) => {
      if (isOffroad) {
        const isStone = Math.floor(i / 4) % 2 === 0;
        return isStone ? [0.45, 0.40, 0.35] : [0.30, 0.26, 0.22];
      }
      const isRed = Math.floor(i / 6) % 2 === 0;
      return isRed ? [0.95, 0.15, 0.15] : [0.95, 0.95, 0.95];
    });

    // 3. Right Kerb (Red/White or Weathered Mountain Stone)
    addStrip(asphaltRight, kerbRightOuter, (i) => {
      if (isOffroad) {
        const isStone = Math.floor(i / 4) % 2 === 0;
        return isStone ? [0.45, 0.40, 0.35] : [0.30, 0.26, 0.22];
      }
      const isRed = Math.floor(i / 6) % 2 === 0;
      return isRed ? [0.95, 0.15, 0.15] : [0.95, 0.95, 0.95];
    });

    // 4. Outer Shoulders
    addStrip(shoulderLeftOuter, kerbLeftOuter, () =>
      isOffroad ? [0.24, 0.18, 0.12] : [0.22, 0.22, 0.24]
    );
    addStrip(kerbRightOuter, shoulderRightOuter, () =>
      isOffroad ? [0.24, 0.18, 0.12] : [0.22, 0.22, 0.24]
    );

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

    // Road Lane Markings & Optical Flow Features
    this.buildLaneMarkings();
  }

  // ─── High-Contrast Road Lane Markings (DeepSeek Optical Flow) ─────────────

  private buildLaneMarkings() {
    const isOffroad = this.trackId === 'offroad_downhill';
    if (isOffroad) {
      this.buildOffroadTracksAndDashes();
    } else {
      this.buildPavedMarkings();
    }
  }

  private buildPavedMarkings() {
    // 1. Bright Golden-Yellow Dashed Center Line (3 samples dash / 3 samples gap ~ 3m/3m)
    // High contrast optical flow at 40+ km/h
    const dashPositions: number[] = [];
    const dashIndices: number[] = [];
    let dVertIdx = 0;
    const hw = 0.09; // 0.18m wide stripe

    for (let i = 0; i < TRACK_SAMPLES; i++) {
      const isDash = Math.floor(i / 3) % 2 === 0;
      if (!isDash) continue;

      const nextI = (i + 1) >= TRACK_SAMPLES ? (this.isClosedTrack ? 0 : TRACK_SAMPLES) : (i + 1);
      if (nextI >= this.sampledPositions.length) continue;

      const pos1 = this.sampledPositions[i];
      const pos2 = this.sampledPositions[nextI];
      const normal1 = this.sampledNormals[i];
      const normal2 = this.sampledNormals[nextI];

      dashPositions.push(
        pos1.x + normal1.x * hw, pos1.y + 0.035, pos1.z + normal1.z * hw,
        pos1.x - normal1.x * hw, pos1.y + 0.035, pos1.z - normal1.z * hw,
        pos2.x + normal2.x * hw, pos2.y + 0.035, pos2.z + normal2.z * hw,
        pos2.x - normal2.x * hw, pos2.y + 0.035, pos2.z - normal2.z * hw
      );
      dashIndices.push(
        dVertIdx, dVertIdx + 1, dVertIdx + 2,
        dVertIdx + 1, dVertIdx + 3, dVertIdx + 2
      );
      dVertIdx += 4;
    }

    const dashGeo = new THREE.BufferGeometry();
    dashGeo.setAttribute('position', new THREE.Float32BufferAttribute(dashPositions, 3));
    dashGeo.setIndex(dashIndices);
    dashGeo.computeVertexNormals();
    const dashMat = new THREE.MeshBasicMaterial({
      color: 0xffe066,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    this.scene.add(new THREE.Mesh(dashGeo, dashMat));

    // 2. Continuous Solid White Outer Lane Lines along both edges of asphalt deck
    const edgePositions: number[] = [];
    const edgeIndices: number[] = [];
    let eVertIdx = 0;
    const edgeLineWidth = 0.08;
    const edgeOffset = ROAD_HALF_WIDTH - 0.15; // Placed right along asphalt edge inside kerbs

    [-1, 1].forEach((side) => {
      for (let i = 0; i < TRACK_SAMPLES; i++) {
        const nextI = (i + 1) >= TRACK_SAMPLES ? (this.isClosedTrack ? 0 : TRACK_SAMPLES) : (i + 1);
        if (nextI >= this.sampledPositions.length) continue;

        const pos1 = this.sampledPositions[i];
        const pos2 = this.sampledPositions[nextI];
        const norm1 = this.sampledNormals[i];
        const norm2 = this.sampledNormals[nextI];

        const center1 = pos1.clone().addScaledVector(norm1, side * edgeOffset);
        const center2 = pos2.clone().addScaledVector(norm2, side * edgeOffset);

        edgePositions.push(
          center1.x + norm1.x * edgeLineWidth, center1.y + 0.03, center1.z + norm1.z * edgeLineWidth,
          center1.x - norm1.x * edgeLineWidth, center1.y + 0.03, center1.z - norm1.z * edgeLineWidth,
          center2.x + norm2.x * edgeLineWidth, center2.y + 0.03, center2.z + norm2.z * edgeLineWidth,
          center2.x - norm2.x * edgeLineWidth, center2.y + 0.03, center2.z - norm2.z * edgeLineWidth
        );
        edgeIndices.push(
          eVertIdx, eVertIdx + 1, eVertIdx + 2,
          eVertIdx + 1, eVertIdx + 3, eVertIdx + 2
        );
        eVertIdx += 4;
      }
    });

    const edgeGeo = new THREE.BufferGeometry();
    edgeGeo.setAttribute('position', new THREE.Float32BufferAttribute(edgePositions, 3));
    edgeGeo.setIndex(edgeIndices);
    edgeGeo.computeVertexNormals();
    const edgeMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -1.5,
      polygonOffsetUnits: -1.5,
    });
    this.scene.add(new THREE.Mesh(edgeGeo, edgeMat));
  }

  private buildOffroadTracksAndDashes() {
    // 1. Dual Compacted Dirt Tire Grooves (creates prominent visual stream of texture)
    const groovePositions: number[] = [];
    const grooveIndices: number[] = [];
    let gVertIdx = 0;
    const grooveWidth = 0.28;

    [-1.1, 1.1].forEach((wheelOffset) => {
      for (let i = 0; i < TRACK_SAMPLES; i++) {
        const nextI = (i + 1) >= TRACK_SAMPLES ? (this.isClosedTrack ? 0 : TRACK_SAMPLES) : (i + 1);
        if (nextI >= this.sampledPositions.length) continue;

        const pos1 = this.sampledPositions[i];
        const pos2 = this.sampledPositions[nextI];
        const norm1 = this.sampledNormals[i];
        const norm2 = this.sampledNormals[nextI];

        const center1 = pos1.clone().addScaledVector(norm1, wheelOffset);
        const center2 = pos2.clone().addScaledVector(norm2, wheelOffset);

        groovePositions.push(
          center1.x + norm1.x * grooveWidth, center1.y + 0.025, center1.z + norm1.z * grooveWidth,
          center1.x - norm1.x * grooveWidth, center1.y + 0.025, center1.z - norm1.z * grooveWidth,
          center2.x + norm2.x * grooveWidth, center2.y + 0.025, center2.z + norm2.z * grooveWidth,
          center2.x - norm2.x * grooveWidth, center2.y + 0.025, center2.z - norm2.z * grooveWidth
        );
        grooveIndices.push(
          gVertIdx, gVertIdx + 1, gVertIdx + 2,
          gVertIdx + 1, gVertIdx + 3, gVertIdx + 2
        );
        gVertIdx += 4;
      }
    });

    const grooveGeo = new THREE.BufferGeometry();
    grooveGeo.setAttribute('position', new THREE.Float32BufferAttribute(groovePositions, 3));
    grooveGeo.setIndex(grooveIndices);
    grooveGeo.computeVertexNormals();
    const grooveMat = new THREE.MeshPhongMaterial({
      color: 0x22130a, // Dark compacted damp canyon dirt
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -1.5,
      polygonOffsetUnits: -1.5,
    });
    this.scene.add(new THREE.Mesh(grooveGeo, grooveMat));

    // 2. Offroad Trail Center Limestone / Chalk Navigation Markers (every 3m)
    const markerPositions: number[] = [];
    const markerIndices: number[] = [];
    let mVertIdx = 0;
    const mw = 0.10;

    for (let i = 0; i < TRACK_SAMPLES; i++) {
      const isMark = Math.floor(i / 3) % 2 === 0;
      if (!isMark) continue;

      const nextI = (i + 1) >= TRACK_SAMPLES ? (this.isClosedTrack ? 0 : TRACK_SAMPLES) : (i + 1);
      if (nextI >= this.sampledPositions.length) continue;

      const pos1 = this.sampledPositions[i];
      const pos2 = this.sampledPositions[nextI];
      const norm1 = this.sampledNormals[i];
      const norm2 = this.sampledNormals[nextI];

      markerPositions.push(
        pos1.x + norm1.x * mw, pos1.y + 0.03, pos1.z + norm1.z * mw,
        pos1.x - norm1.x * mw, pos1.y + 0.03, pos1.z - norm1.z * mw,
        pos2.x + norm2.x * mw, pos2.y + 0.03, pos2.z + norm2.z * mw,
        pos2.x - norm2.x * mw, pos2.y + 0.03, pos2.z - norm2.z * mw
      );
      markerIndices.push(
        mVertIdx, mVertIdx + 1, mVertIdx + 2,
        mVertIdx + 1, mVertIdx + 3, mVertIdx + 2
      );
      mVertIdx += 4;
    }

    const markerGeo = new THREE.BufferGeometry();
    markerGeo.setAttribute('position', new THREE.Float32BufferAttribute(markerPositions, 3));
    markerGeo.setIndex(markerIndices);
    markerGeo.computeVertexNormals();
    const markerMat = new THREE.MeshBasicMaterial({
      color: 0xecd9c6, // Weathered limestone trail marking
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    this.scene.add(new THREE.Mesh(markerGeo, markerMat));
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

  // ─── Crisp Mathematically-Aligned Road Checkered Timing Line ───────────────

  private createCheckeredLineMesh(sampleIdx: number): THREE.Mesh {
    const pos = this.sampledPositions[sampleIdx];
    const normal = this.sampledNormals[sampleIdx];
    const tangent = this.sampledTangents[sampleIdx];
    const surfaceUp = new THREE.Vector3().crossVectors(normal, tangent).normalize();

    const roadWidth = ROAD_HALF_WIDTH * 2;
    const depthMeters = 1.4;

    // High-resolution crisp canvas texture with 16 cols x 4 rows
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    const cols = 16;
    const rows = 4;
    const cw = canvas.width / cols;
    const rh = canvas.height / rows;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const isWhite = (c + r) % 2 === 0;
        ctx.fillStyle = isWhite ? '#ffffff' : '#0f172a';
        ctx.fillRect(c * cw, r * rh, cw, rh);
      }
    }

    // Gold finish timing borders on leading & trailing edges
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(0, 0, canvas.width, 8);
    ctx.fillRect(0, canvas.height - 8, canvas.width, 8);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;

    // DeepSeek V4 Pro: PlaneGeometry(width, height)
    // Local +X = width (along normal across road)
    // Local +Y = height (along tangent along road length)
    // Local +Z = normal to plane (along surfaceUp out of road)
    // Normal x Tangent = surfaceUp (right-handed, det = +1)
    const geo = new THREE.PlaneGeometry(roadWidth, depthMeters);
    const rotMat = new THREE.Matrix4().makeBasis(normal, tangent, surfaceUp);

    const mat = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.DoubleSide,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -4,
      polygonOffsetUnits: -4,
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.quaternion.setFromRotationMatrix(rotMat);
    mesh.position.copy(pos).addScaledVector(surfaceUp, 0.025);
    return mesh;
  }

  // ─── Finish Line & Gantries ────────────────────────────────────────────────

  private buildFinishLine() {
    // If point-to-point track (Hill Climb, MX Offroad Downhill), erect 3D Finish Line & Arch at summit/arena
    // (For closed circuit tracks, start gantry already acts as official start/finish timing gate)
    if (!this.isClosedTrack) {
      const finishCheckeredMesh = this.createCheckeredLineMesh(TRACK_SAMPLES);
      this.scene.add(finishCheckeredMesh);
      this.buildFinishGantry();
    }
  }

  private buildFinishGantry() {
    const finishIdx = TRACK_SAMPLES;
    const pos = this.sampledPositions[finishIdx];
    const normal = this.sampledNormals[finishIdx];
    const tangent = this.sampledTangents[finishIdx];

    const spanW = (ROAD_HALF_WIDTH + KERB_WIDTH + SHOULDER_WIDTH) * 2;
    const gantry = new THREE.Group();

    const pillarMat = new THREE.MeshPhongMaterial({ color: 0x0f172a, shininess: 80 });
    const beamMat = new THREE.MeshPhongMaterial({ color: 0x1e293b, shininess: 60 });
    const accentMat = new THREE.MeshPhongMaterial({ color: 0x10b981, shininess: 90 });

    // Twin structural pylon uprights on both shoulders
    [-1, 1].forEach((side) => {
      const pylonPos = pos.clone().addScaledVector(normal, side * (spanW / 2 + 0.6));
      
      // Concrete foundation block
      const foot = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.8, 1.6), pillarMat);
      foot.position.set(pylonPos.x, pos.y + 0.4, pylonPos.z);
      gantry.add(foot);

      // Steel truss pillar
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.48, 8.8, 12), pillarMat);
      pillar.position.set(pylonPos.x, pos.y + 4.8, pylonPos.z);
      gantry.add(pillar);

      // Accent ring
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.08, 8, 16), accentMat);
      ring.position.set(pylonPos.x, pos.y + 8.4, pylonPos.z);
      ring.rotation.x = Math.PI / 2;
      gantry.add(ring);

      // Checkered finish flag waving at top of pylon
      const flagPole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.2, 8), accentMat);
      flagPole.position.set(pylonPos.x, pos.y + 10.2, pylonPos.z);
      gantry.add(flagPole);

      const flagCanvas = document.createElement('canvas');
      flagCanvas.width = 128;
      flagCanvas.height = 80;
      const fctx = flagCanvas.getContext('2d')!;
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 8; c++) {
          fctx.fillStyle = (r + c) % 2 === 0 ? '#ffffff' : '#0f172a';
          fctx.fillRect(c * 16, r * 16, 16, 16);
        }
      }
      const flagTex = new THREE.CanvasTexture(flagCanvas);
      const flagMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(1.4, 0.9),
        new THREE.MeshBasicMaterial({ map: flagTex, side: THREE.DoubleSide })
      );
      flagMesh.position.set(pylonPos.x + side * 0.7, pos.y + 10.5, pylonPos.z);
      flagMesh.rotation.y = side > 0 ? 0.3 : -0.3;
      gantry.add(flagMesh);
    });

    // Overhead heavy crossbeam aligned with road normal
    const beam = new THREE.Mesh(new THREE.BoxGeometry(spanW + 2.4, 1.4, 1.4), beamMat);
    beam.position.copy(pos);
    beam.position.y += 8.6;
    beam.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), normal.clone());
    gantry.add(beam);

    // Glowing FINISH Banner (facing approaching riders coming from -tangent)
    const bannerCanvas = document.createElement('canvas');
    bannerCanvas.width = 512;
    bannerCanvas.height = 128;
    const bctx = bannerCanvas.getContext('2d')!;

    // Background gradient
    const grad = bctx.createLinearGradient(0, 0, 512, 0);
    grad.addColorStop(0, '#090d16');
    grad.addColorStop(0.5, '#064e3b');
    grad.addColorStop(1, '#090d16');
    bctx.fillStyle = grad;
    bctx.fillRect(0, 0, 512, 128);

    // Checkered border on top & bottom
    for (let c = 0; c < 32; c++) {
      bctx.fillStyle = c % 2 === 0 ? '#ffffff' : '#0f172a';
      bctx.fillRect(c * 16, 0, 16, 12);
      bctx.fillRect(c * 16, 116, 16, 12);
    }

    // Glowing border & header text
    bctx.strokeStyle = '#10b981';
    bctx.lineWidth = 4;
    bctx.strokeRect(4, 14, 504, 100);

    bctx.fillStyle = '#facc15';
    bctx.font = '900 20px sans-serif';
    bctx.textAlign = 'center';
    bctx.fillText('⚡ BATTERY QUEST GRAND PRIX ⚡', 256, 38);

    bctx.fillStyle = '#34d399';
    bctx.font = '900 56px sans-serif';
    bctx.fillText('🏁 FINISH 🏁', 256, 92);

    const bannerTex = new THREE.CanvasTexture(bannerCanvas);
    const bannerMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(spanW * 0.70, 2.4),
      new THREE.MeshBasicMaterial({ map: bannerTex, side: THREE.DoubleSide })
    );
    bannerMesh.position.copy(pos);
    bannerMesh.position.y += 8.6;
    bannerMesh.position.addScaledVector(tangent, -0.75); // Slightly upstream facing incoming riders
    bannerMesh.lookAt(bannerMesh.position.clone().sub(tangent));
    gantry.add(bannerMesh);

    // Overhead floodlight on finish line
    const finishLight = new THREE.PointLight(0x34d399, 1.8, 25);
    finishLight.position.copy(pos);
    finishLight.position.y += 8.0;
    gantry.add(finishLight);

    this.scene.add(gantry);
  }

  private buildStartGantry() {
    // Starting arch positioned right at start station (sample index 2 ~= 3.0m)
    // Riders start lined up behind the arch (z = 0 to -2m) and blast right through the arch on GO!
    const gantryIdx = Math.min(2, TRACK_SAMPLES);
    const pos = this.sampledPositions[gantryIdx];
    const normal = this.sampledNormals[gantryIdx];
    const tangent = this.sampledTangents[gantryIdx];

    const spanW = (ROAD_HALF_WIDTH + KERB_WIDTH + SHOULDER_WIDTH) * 2;
    const gantry = new THREE.Group();

    const pillarMat = new THREE.MeshPhongMaterial({ color: 0x0f172a, shininess: 80 });
    const beamMat = new THREE.MeshPhongMaterial({ color: 0x1e293b, shininess: 60 });
    const goldMat = new THREE.MeshPhongMaterial({ color: 0xf59e0b, shininess: 90 });

    // Twin structural pylon uprights (5.4m height to frame camera view perfectly)
    [-1, 1].forEach((side) => {
      const pylonPos = pos.clone().addScaledVector(normal, side * (spanW / 2 + 0.4));

      const foot = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.6, 1.4), pillarMat);
      foot.position.set(pylonPos.x, pos.y + 0.3, pylonPos.z);
      gantry.add(foot);

      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.42, 5.4, 12), pillarMat);
      pillar.position.set(pylonPos.x, pos.y + 2.7, pylonPos.z);
      gantry.add(pillar);

      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.07, 8, 16), goldMat);
      ring.position.set(pylonPos.x, pos.y + 5.1, pylonPos.z);
      ring.rotation.x = Math.PI / 2;
      gantry.add(ring);
    });

    // Overhead heavy crossbeam at y = pos.y + 5.2
    const beam = new THREE.Mesh(new THREE.BoxGeometry(spanW + 2.0, 0.9, 0.9), beamMat);
    beam.position.copy(pos);
    beam.position.y += 5.2;
    beam.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), normal.clone());
    gantry.add(beam);

    // Glowing Banner facing approaching riders / starting grid
    const bannerCanvas = document.createElement('canvas');
    bannerCanvas.width = 512;
    bannerCanvas.height = 128;
    const bctx = bannerCanvas.getContext('2d')!;

    const grad = bctx.createLinearGradient(0, 0, 512, 0);
    grad.addColorStop(0, '#090d16');
    grad.addColorStop(0.5, '#78350f');
    grad.addColorStop(1, '#090d16');
    bctx.fillStyle = grad;
    bctx.fillRect(0, 0, 512, 128);

    // Checkered border
    for (let c = 0; c < 32; c++) {
      bctx.fillStyle = c % 2 === 0 ? '#ffffff' : '#0f172a';
      bctx.fillRect(c * 16, 0, 16, 12);
      bctx.fillRect(c * 16, 116, 16, 12);
    }

    bctx.strokeStyle = '#f59e0b';
    bctx.lineWidth = 4;
    bctx.strokeRect(4, 14, 504, 100);

    bctx.fillStyle = '#38bdf8';
    bctx.font = '900 18px sans-serif';
    bctx.textAlign = 'center';
    bctx.fillText('⚡ BATTERY QUEST GRAND PRIX ⚡', 256, 36);

    bctx.fillStyle = '#facc15';
    bctx.font = '900 46px sans-serif';
    bctx.fillText(this.isClosedTrack ? '🏁 START / FINISH 🏁' : '⚡ START ⚡', 256, 88);

    const bannerTex = new THREE.CanvasTexture(bannerCanvas);
    const bannerMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(spanW * 0.65, 1.8),
      new THREE.MeshBasicMaterial({ map: bannerTex, side: THREE.DoubleSide })
    );
    bannerMesh.position.copy(pos);
    bannerMesh.position.y += 5.2;
    bannerMesh.position.addScaledVector(tangent, -0.5);
    bannerMesh.lookAt(bannerMesh.position.clone().sub(tangent));
    gantry.add(bannerMesh);

    // ─── 3D Starting Traffic Light Cluster (ไฟจราจรแสดงสัญญาณให้ออกตัว) ───
    const lightBoxGroup = new THREE.Group();
    const boxGeo = new THREE.BoxGeometry(2.2, 0.75, 0.45);
    const boxMat = new THREE.MeshPhongMaterial({ color: 0x050508, shininess: 40 });
    const boxMesh = new THREE.Mesh(boxGeo, boxMat);
    lightBoxGroup.add(boxMesh);

    // Suspension cables connecting box to crossbeam
    const cableMat = new THREE.MeshBasicMaterial({ color: 0x64748b });
    [-0.75, 0.75].forEach((cx) => {
      const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.9, 6), cableMat);
      cable.position.set(cx, 0.8, 0);
      lightBoxGroup.add(cable);
    });

    // 3 Lamps: Red (Left), Amber (Center), Green (Right)
    const redMat = new THREE.MeshBasicMaterial({ color: 0xff1111 });
    const amberMat = new THREE.MeshBasicMaterial({ color: 0x221100 });
    const greenMat = new THREE.MeshBasicMaterial({ color: 0x002211 });

    const lampGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.12, 16);
    lampGeo.rotateX(Math.PI / 2);

    const redMesh = new THREE.Mesh(lampGeo, redMat);
    redMesh.position.set(-0.65, 0, 0.20);
    lightBoxGroup.add(redMesh);

    const amberMesh = new THREE.Mesh(lampGeo, amberMat);
    amberMesh.position.set(0, 0, 0.20);
    lightBoxGroup.add(amberMesh);

    const greenMesh = new THREE.Mesh(lampGeo, greenMat);
    greenMesh.position.set(0.65, 0, 0.20);
    lightBoxGroup.add(greenMesh);

    // Visor hoods
    const visorMat = new THREE.MeshPhongMaterial({ color: 0x090d16 });
    [-0.65, 0, 0.65].forEach((lx) => {
      const visor = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.035, 6, 16, Math.PI), visorMat);
      visor.position.set(lx, 0.04, 0.22);
      visor.rotation.z = Math.PI;
      lightBoxGroup.add(visor);
    });

    // Position light box in the 3D scene facing incoming riders
    lightBoxGroup.position.copy(pos);
    lightBoxGroup.position.y += 3.8;
    lightBoxGroup.position.addScaledVector(tangent, -0.55);
    lightBoxGroup.lookAt(lightBoxGroup.position.clone().sub(tangent));
    gantry.add(lightBoxGroup);

    this.startLights = { redMat, amberMat, greenMat };

    // Crisp, perfectly aligned Checkerboard starting line on road deck right under the arch
    const startCheckeredMesh = this.createCheckeredLineMesh(gantryIdx);
    gantry.add(startCheckeredMesh);

    this.scene.add(gantry);
  }

  // ─── 3D Starting Traffic Lights Countdown Control ─────────────────────────

  public setStartCountdown(stage: 3 | 2 | 1 | 'go' | 'off') {
    if (!this.startLights) return;
    if (stage === 3) {
      this.startLights.redMat.color.setHex(0xff1111);
      this.startLights.amberMat.color.setHex(0x221100);
      this.startLights.greenMat.color.setHex(0x002211);
    } else if (stage === 2) {
      this.startLights.redMat.color.setHex(0xff1111);
      this.startLights.amberMat.color.setHex(0xffaa00);
      this.startLights.greenMat.color.setHex(0x002211);
    } else if (stage === 1) {
      this.startLights.redMat.color.setHex(0x330000);
      this.startLights.amberMat.color.setHex(0xffaa00);
      this.startLights.greenMat.color.setHex(0x002211);
    } else if (stage === 'go') {
      this.startLights.redMat.color.setHex(0x330000);
      this.startLights.amberMat.color.setHex(0x221100);
      this.startLights.greenMat.color.setHex(0x10b981);
    } else if (stage === 'off') {
      this.startLights.redMat.color.setHex(0x330000);
      this.startLights.amberMat.color.setHex(0x221100);
      this.startLights.greenMat.color.setHex(0x002211);
    }
  }

  // ─── Racer Collision Impulse & Impact Effect (DeepSeek V4 Pro) ────────────

  public triggerCollisionEffect(z: number, x: number) {
    this.cameraShake = 0.45;
    if (this.collisionShockwave) {
      const { position, normal, tangent } = this.getTrackPosition(z, x);
      const surfaceUp = new THREE.Vector3().crossVectors(normal, tangent).normalize();
      this.collisionShockwave.position.copy(position).addScaledVector(surfaceUp, 0.15);
      this.collisionShockwave.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), surfaceUp);
      this.shockwaveLife = 1.0;
    }
  }

  // ─── Battery Energy Pickups (DeepSeek V4 Pro Procedural 3D Assets) ─────────

  private buildBatteryPickups(trackId: string) {
    this.batteryPickupsGroup.clear();
    this.batteryPickups.clear();

    const items = getStageBatteryItems(trackId);
    for (const item of items) {
      const { position, tangent, normal } = this.getTrackPosition(item.z, item.x);
      const surfaceUp = new THREE.Vector3().crossVectors(normal, tangent).normalize();
      // Elevate slightly above road deck (0.75m)
      const basePos = position.clone().addScaledVector(surfaceUp, 0.75);

      const group = new THREE.Group();
      group.position.copy(basePos);

      // Core: 21700 lithium battery cell (horizontal cylinder, emerald glow)
      const coreGeo = new THREE.CylinderGeometry(0.10, 0.10, 0.36, 16);
      const coreMat = new THREE.MeshStandardMaterial({
        color: 0x052e16,
        emissive: 0x10b981,
        emissiveIntensity: 2.2,
        metalness: 0.85,
        roughness: 0.25,
      });
      const core = new THREE.Mesh(coreGeo, coreMat);
      core.rotation.z = Math.PI / 2;
      group.add(core);

      // Brass terminal caps (positive & negative terminals)
      const capGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.05, 16);
      const capMat = new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        metalness: 0.9,
        roughness: 0.2,
        emissive: 0xd97706,
        emissiveIntensity: 0.5,
      });
      const capL = new THREE.Mesh(capGeo, capMat);
      capL.rotation.z = Math.PI / 2;
      capL.position.x = -0.20;
      const capR = capL.clone();
      capR.position.x = 0.20;
      group.add(capL, capR);

      // Pulsing energy torus ring (cyan)
      const ringGeo = new THREE.TorusGeometry(0.32, 0.03, 12, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x06b6d4,
        transparent: true,
        opacity: 0.88,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
      group.add(ring);

      // Soft glow aura (sphere with additive blending)
      const auraGeo = new THREE.SphereGeometry(0.50, 12, 12);
      const auraMat = new THREE.MeshBasicMaterial({
        color: 0x10b981,
        transparent: true,
        opacity: 0.16,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const aura = new THREE.Mesh(auraGeo, auraMat);
      group.add(aura);

      // Soft ground illumination glow disc (replaces PointLight to eliminate WebGL shader recompiles and frame drops)
      const glowGeo = new THREE.CircleGeometry(0.70, 16);
      const glowMat = new THREE.MeshBasicMaterial({
        color: 0x10b981,
        transparent: true,
        opacity: 0.35,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const groundGlow = new THREE.Mesh(glowGeo, glowMat);
      groundGlow.rotation.x = Math.PI / 2;
      groundGlow.position.y = -0.73;
      group.add(groundGlow);

      this.batteryPickupsGroup.add(group);

      this.batteryPickups.set(item.id, {
        id: item.id,
        config: item,
        group,
        core,
        ring,
        aura,
        groundGlow,
        basePos,
        surfaceUp,
        phase: Math.random() * Math.PI * 2,
        collected: false,
        collectT: 0,
      });
    }
  }

  public collectPickup(id: string) {
    const visual = this.batteryPickups.get(id);
    if (visual && !visual.collected) {
      visual.collected = true;
      visual.collectT = 0;
    }
  }

  public resetPickups() {
    this.batteryPickups.forEach((visual) => {
      visual.collected = false;
      visual.collectT = 0;
      visual.group.position.copy(visual.basePos);
      visual.group.scale.set(1, 1, 1);
      (visual.ring.material as THREE.MeshBasicMaterial).opacity = 0.88;
      (visual.aura.material as THREE.MeshBasicMaterial).opacity = 0.16;
      (visual.groundGlow.material as THREE.MeshBasicMaterial).opacity = 0.35;
      (visual.core.material as THREE.MeshStandardMaterial).emissiveIntensity = 2.2;
    });
  }

  // ─── Environment & Mountain Background ────────────────────────────────────

  private buildEnvironment(trackId: string) {
    const isOffroad = trackId === 'offroad_downhill';

    // 1. Terrain Ground Plane centered on track bounds
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const p of this.sampledPositions) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.z < minZ) minZ = p.z;
      if (p.z > maxZ) maxZ = p.z;
    }
    const centerX = (minX + maxX) * 0.5;
    const centerZ = (minZ + maxZ) * 0.5;
    const spanX = Math.max(80, (maxX - minX) * 0.5);
    const spanZ = Math.max(80, (maxZ - minZ) * 0.5);

    this.trackCenterX = centerX;
    this.trackCenterZ = centerZ;
    this.trackSpanX = spanX;
    this.trackSpanZ = spanZ;

    const groundGeo = new THREE.PlaneGeometry(4000, 4000);
    const groundMat = new THREE.MeshPhongMaterial({
      color: isOffroad ? 0x9a5b32 : 0x22542a, // Warm sunlit canyon terra or lush green stadium meadow
      shininess: 8,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(centerX, -0.05, centerZ);
    ground.receiveShadow = true;
    this.scene.add(ground);

    // 2. Scenic Mountain Horizon (Gentle rolling mountain silhouettes placed >= 480m away)
    this.addMountainRange();

    // 3. Roadside Vegetation (Pine & palm trees planted safely beside shoulders)
    this.addRoadsideVegetation();

    // 4. Stadium Grandstands & Cheering Spectator Bleachers (อัฒจันทร์ผู้ชมการแข่งขัน)
    this.addStadiumGrandstands();

    // 5. Puffy 3D Sky Clouds (ก้อนเมฆลอยฟ้า)
    this.addSkyClouds();

    // 6. Floating Goodyear-style Stadium Airship Blimp (เรือเหาะลอยฟ้า)
    this.addStadiumBlimp();

    this.scene.add(this.envGroup);
  }

  private addMountainRange() {
    const isOffroad = this.trackId === 'offroad_downhill';

    // Natural scenic mountain materials (alpine emerald or sunlit canyon ridges)
    const mtnMat = new THREE.MeshPhongMaterial({
      color: isOffroad ? 0x854d0e : 0x166534,
      flatShading: true,
      shininess: 4,
    });
    const secondaryMtnMat = new THREE.MeshPhongMaterial({
      color: isOffroad ? 0xa16207 : 0x14532d,
      flatShading: true,
      shininess: 4,
    });
    const capMat = new THREE.MeshPhongMaterial({
      color: isOffroad ? 0xd97706 : 0xf8fafc,
      flatShading: true,
      shininess: 12,
    });

    const numMountains = 20;
    for (let i = 0; i < numMountains; i++) {
      const angle = (i / numMountains) * Math.PI * 2;
      const baseDistX = this.trackSpanX + 520 + (i % 4) * 80;
      const baseDistZ = this.trackSpanZ + 520 + ((i * 3) % 4) * 80;
      const mx = this.trackCenterX + Math.cos(angle) * baseDistX;
      const mz = this.trackCenterZ + Math.sin(angle) * baseDistZ;
      const radius = 140 + ((i * 13) % 80);
      const height = 150 + ((i * 19) % 110);

      const mat = i % 2 === 0 ? mtnMat : secondaryMtnMat;
      const mtnGeo = new THREE.SphereGeometry(radius, 20, 14);
      mtnGeo.scale(1.3, height / radius, 1.3);
      const mtn = new THREE.Mesh(mtnGeo, mat);
      mtn.position.set(mx, -radius * 0.45, mz);
      this.envGroup.add(mtn);

      // Distant summit cap
      const capGeo = new THREE.SphereGeometry(radius * 0.42, 16, 10);
      capGeo.scale(1.2, (height * 0.35) / (radius * 0.42), 1.2);
      const cap = new THREE.Mesh(capGeo, capMat);
      cap.position.set(mx, -radius * 0.45 + height * 0.55, mz);
      this.envGroup.add(cap);
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

  // ─── Stadium Grandstands & Spectator Seating (อัฒจันทร์ผู้เข้าชมการแข่งขัน) ────

  private addStadiumGrandstands() {
    const grandstandGroup = new THREE.Group();

    // Bleacher Materials (Shared across all grandstands)
    const concreteMat = new THREE.MeshPhongMaterial({ color: 0x94a3b8, shininess: 25 });
    const seatColors = [0xef4444, 0x3b82f6, 0xf59e0b, 0x10b981, 0x8b5cf6, 0xf8fafc, 0x06b6d4];
    const seatMaterials = seatColors.map((c) => new THREE.MeshPhongMaterial({ color: c, shininess: 30 }));
    const roofMat = new THREE.MeshPhongMaterial({ color: 0x1e293b, shininess: 60 });
    const trussMat = new THREE.MeshPhongMaterial({ color: 0x475569, shininess: 50 });
    const skinMat = new THREE.MeshPhongMaterial({ color: 0xfed7aa, shininess: 10 });

    // Sponsor Banners (Canvas Textures)
    const createBannerTexture = (brand: string, sub: string, bgColor: string, txtColor: string) => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 128;
      const ctx = canvas.getContext('2d')!;

      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, 512, 128);

      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      for (let i = 0; i < 512; i += 28) {
        ctx.fillRect(i, 0, 14, 128);
      }

      ctx.fillStyle = '#ffffff';
      for (let c = 0; c < 32; c++) {
        ctx.fillRect(c * 16, 0, 8, 8);
        ctx.fillRect(c * 16 + 8, 120, 8, 8);
      }

      ctx.fillStyle = txtColor;
      ctx.font = '900 48px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(brand, 256, 56);

      ctx.fillStyle = '#f8fafc';
      ctx.font = '700 16px sans-serif';
      ctx.fillText(sub, 256, 102);

      const tex = new THREE.CanvasTexture(canvas);
      tex.wrapS = THREE.ClampToEdgeWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      return tex;
    };

    const banners = [
      createBannerTexture('PIRELLI', 'OFFICIAL MOTORSPORTS TYRE', '#dc2626', '#fef08a'),
      createBannerTexture('GOODYEAR', 'HIGH PERFORMANCE RACING', '#1e3a8a', '#facc15'),
      createBannerTexture('MONSTER', 'UNLEASH THE BEAST ⚡', '#090d16', '#22c55e'),
      createBannerTexture('KWANJAI POWER', 'BATTERY QUEST CHAMPIONSHIP', '#047857', '#a7f3d0'),
      createBannerTexture('BATTERY QUEST GP', 'POWER RACING ACADEMY', '#4338ca', '#fde047'),
    ];

    // Shared spectator box & sphere geometries
    const bodyGeo = new THREE.BoxGeometry(0.38, 0.46, 0.34);
    const headGeo = new THREE.SphereGeometry(0.13, 8, 8);
    const capGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.05, 8);

    // DeepSeek V4 Pro: Rock-solid right-handed basis with perfect track clearance
    // side = 1 (Right): Local +Z = normal (away from track), Local +X = tangent (along track), Local +Y = surfaceUp
    // side = -1 (Left): Local +Z = -normal (away from track), Local +X = -tangent, Local +Y = surfaceUp
    // In both cases, local -Z points TOWARDS the race track!
    const buildGrandstandSegment = (stationZ: number, side: number, length: number = 20) => {
      const { position, normal, tangent } = this.getTrackPosition(stationZ, 0);
      const surfaceUp = new THREE.Vector3().crossVectors(normal, tangent).normalize();

      // Safe clearance: 8.2m from center (3.8m outside the road shoulder)
      const lateralDist = side * (ROAD_HALF_WIDTH + KERB_WIDTH + SHOULDER_WIDTH + 3.8);
      const basePos = position.clone().addScaledVector(normal, lateralDist);

      const stand = new THREE.Group();
      stand.position.copy(basePos);

      const xVec = side === 1 ? tangent.clone() : tangent.clone().negate();
      const yVec = surfaceUp.clone();
      const zVec = side === 1 ? normal.clone() : normal.clone().negate();
      const rotMat = new THREE.Matrix4().makeBasis(xVec, yVec, zVec);
      stand.quaternion.setFromRotationMatrix(rotMat);

      const numTiers = 4;
      const tierDepth = 1.1;
      const tierHeight = 0.55;
      const standWidth = length;

      // 1. Concrete Stepped Tiers (Ascending along +Z and +Y)
      for (let t = 0; t < numTiers; t++) {
        const stepH = (t + 1) * tierHeight;
        const step = new THREE.Mesh(
          new THREE.BoxGeometry(standWidth, stepH, tierDepth),
          concreteMat
        );
        step.position.set(0, stepH * 0.5, t * tierDepth + tierDepth * 0.5);
        stand.add(step);

        // Cheering Spectators on this tier (12 per tier, facing -Z toward road)
        const spectatorsInTier = 12;
        for (let s = 0; s < spectatorsInTier; s++) {
          const seatMat = seatMaterials[(t * 3 + s) % seatMaterials.length];
          const specGroup = new THREE.Group();

          const body = new THREE.Mesh(bodyGeo, seatMat);
          body.position.y = 0.23;
          specGroup.add(body);

          const head = new THREE.Mesh(headGeo, skinMat);
          head.position.y = 0.55;
          specGroup.add(head);

          const cap = new THREE.Mesh(capGeo, seatMat);
          cap.position.y = 0.66;
          specGroup.add(cap);

          // Rotate 180 deg so spectators face -Z (towards the race track)
          specGroup.rotation.y = Math.PI;

          const sx = -standWidth * 0.42 + (s / Math.max(1, spectatorsInTier - 1)) * (standWidth * 0.84);
          specGroup.position.set(sx, (t + 1) * tierHeight, t * tierDepth + tierDepth * 0.5);
          stand.add(specGroup);
        }
      }

      // 2. Overhanging Cantilevered Canopy Roof
      const totalDepth = numTiers * tierDepth;
      const roofMesh = new THREE.Mesh(
        new THREE.BoxGeometry(standWidth + 1.0, 0.22, totalDepth + 1.8),
        roofMat
      );
      roofMesh.position.set(0, numTiers * tierHeight + 2.7, totalDepth * 0.45);
      roofMesh.rotation.x = 0.08; // Slanted down towards track (-Z)
      stand.add(roofMesh);

      // Support steel pillars at the back
      [-standWidth * 0.45, 0, standWidth * 0.45].forEach((px) => {
        const pillar = new THREE.Mesh(
          new THREE.CylinderGeometry(0.14, 0.18, numTiers * tierHeight + 2.7, 8),
          trussMat
        );
        pillar.position.set(px, (numTiers * tierHeight + 2.7) * 0.5, totalDepth + 0.2);
        stand.add(pillar);
      });

      // 3. Trackside Sponsor Billboard facing road at Z = 0
      const bannerTex = banners[Math.floor(Math.random() * banners.length)];
      const bannerMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(standWidth, 1.3),
        new THREE.MeshBasicMaterial({ map: bannerTex, side: THREE.DoubleSide })
      );
      bannerMesh.position.set(0, 0.75, 0);
      bannerMesh.rotation.y = Math.PI; // Face -Z towards track
      stand.add(bannerMesh);

      // 4. Stadium Floodlight Tower at back center
      const floodTower = new THREE.Group();
      const mastHeight = numTiers * tierHeight + 7.5;
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.34, mastHeight, 8), trussMat);
      mast.position.y = mastHeight * 0.5;
      floodTower.add(mast);

      const lampHead = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.0, 0.5), roofMat);
      lampHead.position.set(0, mastHeight, 0);
      lampHead.rotation.x = 0.22; // Angled down towards track (-Z)
      floodTower.add(lampHead);

      floodTower.position.set(0, 0, totalDepth + 0.9);
      stand.add(floodTower);

      grandstandGroup.add(stand);
    };

    // User Requirement: ONLY at Start Straight (ออกตัว) and Finish (เข้าเส้นชัยนิดนึง)
    // 1. Start straight grandstands (Left & Right, safe from any curve)
    buildGrandstandSegment(16, -1, 20);
    buildGrandstandSegment(16, 1, 20);

    // 2. Finish straight grandstands
    if (!this.isClosedTrack) {
      // Point-to-point finish summit arena (Hill Climb, MX Offroad Downhill)
      const finishZ = Math.max(25, this.gameTrackLength - 16);
      buildGrandstandSegment(finishZ, -1, 18);
      buildGrandstandSegment(finishZ, 1, 18);
    } else {
      // Closed circuit approach straight
      const approachZ = this.gameTrackLength - 18;
      if (approachZ > 45) {
        buildGrandstandSegment(approachZ, -1, 18);
        buildGrandstandSegment(approachZ, 1, 18);
      }
    }

    this.envGroup.add(grandstandGroup);
  }

  // ─── 3D Puffy Sky Clouds (ก้อนเมฆ 3 มิติลอยฟ้า) ───────────────────────────────

  private addSkyClouds() {
    const cloudMat = new THREE.MeshLambertMaterial({
      color: 0xffffff,
      flatShading: true,
      transparent: true,
      opacity: 0.94,
    });

    const numClouds = 28;
    for (let i = 0; i < numClouds; i++) {
      const cloud = new THREE.Group();
      const numPuffs = 6 + (i % 4);
      for (let p = 0; p < numPuffs; p++) {
        const radius = 18 + ((p * 7 + i * 5) % 18);
        const puffGeo = new THREE.DodecahedronGeometry(radius, 1);
        const puff = new THREE.Mesh(puffGeo, cloudMat);
        puff.position.set(
          (p - numPuffs * 0.5) * (radius * 0.75),
          ((p % 3) - 1) * 4.0,
          (((p * 2) % 3) - 1) * (radius * 0.5)
        );
        cloud.add(puff);
      }

      // Distribute clouds across the racing arena
      const angle = (i / numClouds) * Math.PI * 2;
      const dist = 140 + (i % 6) * 75;
      const cx = this.trackCenterX + Math.cos(angle) * (this.trackSpanX + dist);
      const cz = this.trackCenterZ + Math.sin(angle) * (this.trackSpanZ + dist);
      const cy = 90 + (i % 5) * 24;

      cloud.position.set(cx, cy, cz);
      this.clouds.push(cloud);
      this.envGroup.add(cloud);
    }
  }

  // ─── Floating Goodyear-style Stadium Airship Blimp (เรือเหาะลอยฟ้า) ───────────

  private addStadiumBlimp() {
    const blimpGroup = new THREE.Group();

    // Hull (Pristine White aerodynamic zeppelin shape with bold Goodyear livery)
    const hullMat = new THREE.MeshPhongMaterial({
      color: 0xffffff,
      shininess: 95,
      specular: 0x99ccff,
    });
    const bellyMat = new THREE.MeshPhongMaterial({ color: 0x1e3a8a, shininess: 85 }); // Goodyear Deep Navy Blue
    const finMat = new THREE.MeshPhongMaterial({ color: 0xfacc15, shininess: 90, side: THREE.DoubleSide }); // Racing Yellow

    // Main Upper Hull
    const hullGeo = new THREE.SphereGeometry(10.0, 24, 16);
    hullGeo.scale(1.0, 1.0, 3.4);
    const hull = new THREE.Mesh(hullGeo, hullMat);
    blimpGroup.add(hull);

    // Deep Navy Blue bottom belly shell
    const bellyGeo = new THREE.SphereGeometry(10.05, 24, 16, 0, Math.PI * 2, Math.PI * 0.46, Math.PI * 0.54);
    bellyGeo.scale(1.0, 1.0, 3.4);
    const belly = new THREE.Mesh(bellyGeo, bellyMat);
    blimpGroup.add(belly);

    // 4 Tail Fins in Cross (+) Layout
    const finGeo = new THREE.BoxGeometry(0.25, 6.0, 6.5);

    // Top & Bottom Fins
    const topFin = new THREE.Mesh(finGeo, finMat);
    topFin.position.set(0, 9.2, -22);
    blimpGroup.add(topFin);
    const btmFin = new THREE.Mesh(finGeo, finMat);
    btmFin.position.set(0, -9.2, -22);
    blimpGroup.add(btmFin);

    // Left & Right Fins
    const horizFinGeo = new THREE.BoxGeometry(6.0, 0.25, 6.5);
    const leftFin = new THREE.Mesh(horizFinGeo, finMat);
    leftFin.position.set(9.2, 0, -22);
    blimpGroup.add(leftFin);
    const rightFin = new THREE.Mesh(horizFinGeo, finMat);
    rightFin.position.set(-9.2, 0, -22);
    blimpGroup.add(rightFin);

    // Passenger / Pilot Gondola underneath
    const gondolaMat = new THREE.MeshPhongMaterial({ color: 0x0f172a, shininess: 80 });
    const gondola = new THREE.Mesh(new THREE.BoxGeometry(3.0, 2.4, 11.0), gondolaMat);
    gondola.position.set(0, -10.5, 1.0);
    blimpGroup.add(gondola);

    // Glowing Cabin Windows
    const windowMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    const winGeo = new THREE.BoxGeometry(3.05, 0.8, 9.0);
    const cabinWin = new THREE.Mesh(winGeo, windowMat);
    cabinWin.position.set(0, -10.3, 1.0);
    blimpGroup.add(cabinWin);

    // Glowing electronic sponsor board on side of hull (like GOODYEAR in reference photo)
    const boardCvs = document.createElement('canvas');
    boardCvs.width = 512;
    boardCvs.height = 128;
    const bctx = boardCvs.getContext('2d')!;
    bctx.fillStyle = '#1e3a8a';
    bctx.fillRect(0, 0, 512, 128);
    bctx.lineWidth = 6;
    bctx.strokeStyle = '#facc15';
    bctx.strokeRect(4, 4, 504, 120);
    bctx.fillStyle = '#facc15';
    bctx.font = '900 46px sans-serif';
    bctx.textAlign = 'center';
    bctx.textBaseline = 'middle';
    bctx.fillText('⚡ GOODYEAR RACING ⚡', 256, 64);
    const boardTex = new THREE.CanvasTexture(boardCvs);

    [-1, 1].forEach((side) => {
      const banner = new THREE.Mesh(
        new THREE.PlaneGeometry(22, 5.8),
        new THREE.MeshBasicMaterial({ map: boardTex, side: THREE.DoubleSide })
      );
      banner.position.set(side * 10.1, 0, 0);
      banner.rotation.y = (side * Math.PI) / 2;
      blimpGroup.add(banner);
    });

    // Hover altitude and initial position centered over track
    blimpGroup.position.set(this.trackCenterX + 60, 95, this.trackCenterZ - 40);
    this.stadiumBlimp = blimpGroup;
    this.envGroup.add(blimpGroup);
  }

  // ─── Custom Blender/glTF GLB Bike Loader ─────────────────────────────────────────

  private loadCustomBikeModel() {
    const loader = new GLTFLoader();
    const candidatePaths = [
      '/assets/models/porter_ebike_concept__lumelectrics.glb',
      '/assets/models/ebike.glb',
      '/assets/models/E_BYCLYCE.glb',
      '/assets/models/bike.glb',
    ];

    const tryLoad = (idx: number) => {
      if (idx >= candidatePaths.length) return;
      loader.load(
        candidatePaths[idx],
        (gltf) => {
          const model = gltf.scene;
          const box = new THREE.Box3().setFromObject(model);
          const size = box.getSize(new THREE.Vector3());

          // Realistic Scale: Total length 1.82m matching 26" fat tire e-bike wheelbase
          const targetLength = 1.82;
          const scale = targetLength / Math.max(size.x, 0.001);
          model.scale.setScalar(scale);

          // If modeled lengthways along X, align with forward +Z race track tangent vector
          if (size.x > size.z) {
            model.rotation.y = -Math.PI / 2;
          }
          model.updateMatrixWorld(true);

          const recomputedBox = new THREE.Box3().setFromObject(model);
          const center = recomputedBox.getCenter(new THREE.Vector3());

          // Center X and Z (offset Z slightly so bottom bracket aligns with cyclist crank)
          model.position.x = -center.x;
          model.position.z = -center.z + 0.04;

          // LAW OF NATURE: Lowest contact point of tires touches road surface at Y = 0 exactly!
          model.position.y = -recomputedBox.min.y;

          model.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              const mesh = child as THREE.Mesh;
              mesh.castShadow = true;
              mesh.receiveShadow = true;
            }
          });

          this.customBikeModel = model;

          // Equip realistic custom e-bike on ALL racers across all race tracks
          this.cyclists.forEach((cyclist, id) => {
            this.equipCustomBike(cyclist, id === 'player');
          });
        },
        undefined,
        () => tryLoad(idx + 1)
      );
    };

    tryLoad(0);
  }

  // ─── Cyclist Custom Bike Equipping (Player & Competitors) ─────────────────

  private equipCustomBike(cyclist: CyclistParts, isPlayer: boolean, bikeColor?: string) {
    if (!this.customBikeModel) return;

    // Clear procedural frame tubes and replace with high-fidelity GLB e-bike model
    cyclist.frame.clear();
    const bikeClone = this.customBikeModel.clone();

    // Hide procedural duplicate wheels since GLB contains full detailed wheels & disc brakes
    cyclist.frontWheel.visible = false;
    cyclist.rearWheel.visible = false;

    // Tint frame details for AI competitors so each team has distinct racing livery
    if (!isPlayer && bikeColor) {
      bikeClone.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          if (mesh.material && (mesh.name.includes('frame') || mesh.name.includes('det'))) {
            const mat = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material).clone();
            if ('color' in mat) {
              (mat as THREE.MeshStandardMaterial).color.set(bikeColor);
              mesh.material = mat;
            }
          }
        }
      });
    }

    cyclist.frame.add(bikeClone);
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

    // If custom 3D model is loaded, equip on every racer entering the track
    if (this.customBikeModel) {
      this.equipCustomBike(cyclist, isPlayer, bikeColor);
    }

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
      // In local bike coords (+Z forward, +X left, -X right):
      // Moving right (dx > 0) steers handlebars toward -X (negative rotation angle)
      const lateralSteer = -0.55 * Math.atan2(dx, Math.max(2.0, v));
      const maxSteer = THREE.MathUtils.degToRad(24);
      const targetSteer = THREE.MathUtils.clamp(kinematicSteer + lateralSteer, -maxSteer, maxSteer);

      // Smooth exponential damping for realistic handlebar steering inertia
      const steerAlpha = 1 - Math.exp(-14.0 * dt);
      cyclist.currentSteer += (targetSteer - cyclist.currentSteer) * steerAlpha;

      // Rotate steerPivot along head tube axis (leaning back ~10 deg rake)
      const steerAxis = new THREE.Vector3(0, 0.985, -0.174).normalize();
      cyclist.steerPivot.quaternion.setFromAxisAngle(steerAxis, cyclist.currentSteer);

      // 2. Dynamic Centripetal + Lateral Banking Lean
      // In local bike coords, rollPivot.rotation.z > 0 leans toward -X (right lean)
      const centripetalLean = -Math.atan((v * v * kappaLat) / 9.81);
      const steeringLean = 0.12 * THREE.MathUtils.clamp(dx, -2.5, 2.5);
      const maxLean = THREE.MathUtils.degToRad(24);
      const targetLean = THREE.MathUtils.clamp(centripetalLean + steeringLean, -maxLean, maxLean);

      const leanAlpha = 1 - Math.exp(-8.0 * dt);
      cyclist.currentLean += (targetLean - cyclist.currentLean) * leanAlpha;

      // 3. DeepSeek V4 Pro Rolling Kinematics: Pedaling crank cadence linked to ground speed
      // omega_c = v / (i_g * r_w) with i_g = 2.85 gear ratio, r_w = 0.34m wheel radius
      if (racer.isPedaling && racer.speedMps > 0.4) {
        const crankCadence = racer.speedMps / (2.85 * 0.34);
        cyclist.crankGroup.rotation.x += crankCadence * dt;
      }

      // 4. Pure Rolling without slip: wheel angular velocity omega_w = v / r_w
      const wheelSpeed = racer.speedMps / 0.34;
      cyclist.frontWheel.rotation.x += wheelSpeed * dt;
      cyclist.rearWheel.rotation.x += wheelSpeed * dt;

      // 5. DeepSeek V4 Pro Full Organic Cyclist Kinematics & Weight Shift (Pelvis, Torso, Gaze, Arms, Legs)
      const crankAngle = cyclist.crankGroup.rotation.x;
      cyclist.updateKinematics(
        crankAngle,
        racer.speedMps,
        dt,
        racer.slopePercent || 0,
        racer.isBraking || false
      );

      // 6. DeepSeek V4 Pro Realistic Bicycle Frame Sway & Rocking Kinematics
      // In real-world cycling, alternate downward foot strokes rock the bike frame laterally.
      // Dynamic frame rocking couples roll (Z), micro-yaw (Y), and lateral sway (X) in sync with crank cadence:
      let pedalingIntensity = 0;
      if (v > 0.4 && !racer.isBraking) {
        const baseEffort = racer.isPedaling ? 1.0 : (v > 2.0 ? 0.30 : 0.0);
        const speedFactor = THREE.MathUtils.clamp(v / 7.0, 0.45, 1.25);
        const slopeBoost = (racer.slopePercent || 0) > 4 ? 1.35 : 1.0;
        pedalingIntensity = baseEffort * speedFactor * slopeBoost;
      }

      // Roll rocking: alternating left-right lean (+/- 2.8 degrees)
      const bikeRollRock = 0.048 * Math.sin(crankAngle) * pedalingIntensity;
      // Handlebar & frame yaw oscillation (+/- 1.1 degrees)
      const bikeYawWobble = 0.020 * Math.cos(crankAngle) * pedalingIntensity;
      // Lateral wheel contact translation (+/- 2.6 cm)
      const bikeLateralSway = 0.026 * Math.sin(crankAngle) * pedalingIntensity;

      cyclist.rollPivot.rotation.z = cyclist.currentLean + bikeRollRock;
      cyclist.rollPivot.rotation.y = bikeYawWobble;
      cyclist.rollPivot.position.x = bikeLateralSway;

      // Motor glow effect & Regenerative energy pulse (KERS)
      if (racer.isRegenActive) {
        cyclist.motorGlow.intensity = 2.8 + Math.sin(this.elapsedTime * 16) * 0.8;
        cyclist.motorGlow.color.setHex(0x10b981); // Emerald green for KERS regeneration
      } else if (racer.isMotorActive && racer.batteryPct > 1) {
        cyclist.motorGlow.intensity = 2.2 + Math.sin(this.elapsedTime * 12) * 0.6;
        cyclist.motorGlow.color.setHex(0x38bdf8); // Cyan for motor boost
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

    // ── Animate Battery Energy Pickups ──
    this.batteryPickups.forEach((v) => {
      if (v.collected) {
        if (v.collectT < 1.0) {
          v.collectT += dt / 0.35;
          const k = Math.min(v.collectT, 1.0);
          const scale = (1.0 + k * 1.8) * (1.0 - k);
          v.group.scale.setScalar(Math.max(0.001, scale));
          (v.ring.material as THREE.MeshBasicMaterial).opacity = 0.88 * (1 - k);
          (v.aura.material as THREE.MeshBasicMaterial).opacity = 0.16 * (1 - k);
          (v.groundGlow.material as THREE.MeshBasicMaterial).opacity = 0.35 * (1 - k);
          (v.core.material as THREE.MeshStandardMaterial).emissiveIntensity = 2.2 * (1 - k);
          if (k >= 1.0) {
            v.group.position.y = -9999;
          }
        }
        return;
      }

      // Continuous rotation along vertical axis
      v.group.rotation.y += dt * 2.2;

      // Vertical floating bobbing along road normal
      const bob = Math.sin(this.elapsedTime * 2.5 + v.phase) * 0.14;
      v.group.position.copy(v.basePos).addScaledVector(v.surfaceUp, bob);

      // Energy ring breathing & pulse
      const ringPulse = 0.88 + Math.sin(this.elapsedTime * 4.2 + v.phase) * 0.14;
      v.ring.scale.setScalar(ringPulse);
      (v.ring.material as THREE.MeshBasicMaterial).opacity = 0.65 + ringPulse * 0.23;

      // Soft aura breathing
      const auraPulse = 0.14 + Math.sin(this.elapsedTime * 3.0 + v.phase) * 0.05;
      (v.aura.material as THREE.MeshBasicMaterial).opacity = auraPulse;
    });

    // ── Smooth Spring-Arm Chase Camera Follow with Horizon Banking & Apex Anticipation (DeepSeek V4 Pro) ──
    if (playerPos && playerTangent && playerNormal) {
      const lastPlayer = racers.find((r) => r.isPlayer);
      const playerCyclist = lastPlayer ? this.cyclists.get(lastPlayer.id) : null;
      const playerSpeed = lastPlayer?.speedMps || 0;
      const isBoosting = !!(lastPlayer?.isMotorActive && lastPlayer.batteryPct > 1);

      // Re-orthogonalize track vectors (fixes curvature drift and slope tilting)
      const forward = playerTangent.clone().normalize();
      const lateralRight = playerNormal.clone().normalize();
      // Upward vector normal to the road deck (Right x Forward = Up)
      const surfaceUp = new THREE.Vector3().crossVectors(lateralRight, forward).normalize();

      // Normalized speed 0..1
      const speed01 = THREE.MathUtils.clamp(playerSpeed / TOP_SPEED, 0, 1);

      // 1. Independent lateral smoothing (prevents rigid snapping when turning left/right)
      const targetLateral = lastPlayer ? lastPlayer.x : 0;
      const lateralAlpha = 1 - Math.exp(-3.5 * dt);
      this.smoothCamLateral += (targetLateral - this.smoothCamLateral) * lateralAlpha;

      // 2. Base camera offset: closely behind (-forward) and above (+surfaceUp)
      // Bike fills 25-30% screen, providing immediate 2.3x higher optical flow
      const targetCamPos = playerPos.clone()
        .addScaledVector(forward, -CAM_DIST)
        .addScaledVector(surfaceUp, CAM_HEIGHT)
        .addScaledVector(lateralRight, this.smoothCamLateral * 0.90);

      // 3. Apex look-ahead: looks further down the trail (+forward) with corner apex anticipation
      const lapLen = this.gameTrackLength / this.laps;
      const trackFrac = this.isClosedTrack
        ? (((lastPlayer?.z || 0) % lapLen) / lapLen)
        : Math.min(1, Math.max(0, (lastPlayer?.z || 0) / this.gameTrackLength));
      const sampleIdx = Math.min(
        TRACK_SAMPLES,
        Math.max(0, Math.floor(trackFrac * TRACK_SAMPLES))
      );
      const kappaLat = this.sampledCurvatures[sampleIdx] || 0;
      const apexOffset = THREE.MathUtils.clamp(kappaLat * 16.0, -2.0, 2.0);

      const targetLookAt = playerPos.clone()
        .addScaledVector(forward, CAM_LOOKAHEAD)
        .addScaledVector(surfaceUp, CAM_LOOK_UP)
        .addScaledVector(lateralRight, apexOffset + this.smoothCamLateral * 0.35);

      // 4. Frame-rate independent exponential smoothing (snappy & solid)
      const posAlpha = 1 - Math.exp(-9.0 * dt);
      const lookAlpha = 1 - Math.exp(-12.0 * dt);
      this.smoothCamPos.lerp(targetCamPos, posAlpha);
      this.smoothCamTarget.lerp(targetLookAt, lookAlpha);

      this.camera.position.copy(this.smoothCamPos);

      // 5. Subtle camera micro-shake at high speed + collision impact impulse
      const highSpeedShake = 0.012 * speed01 * speed01;
      let totalShakeX = (Math.random() - 0.5) * highSpeedShake;
      let totalShakeY = (Math.random() - 0.5) * highSpeedShake;

      if (this.cameraShake > 0.005) {
        totalShakeX += (Math.random() - 0.5) * this.cameraShake * 0.45;
        totalShakeY += (Math.random() - 0.5) * this.cameraShake * 0.45;
        this.cameraShake = Math.max(0, this.cameraShake - dt * 3.5);
      }
      this.camera.position.x += totalShakeX;
      this.camera.position.y += totalShakeY;

      // 6. Dutch roll / horizon banking: camera tilts with bicycle bank angle
      const targetCamRoll = (playerCyclist?.currentLean || 0) * 0.20;
      const rollAlpha = 1 - Math.exp(-4.5 * dt);
      this.smoothCamRoll += (targetCamRoll - this.smoothCamRoll) * rollAlpha;

      const viewDir = new THREE.Vector3().subVectors(this.smoothCamTarget, this.smoothCamPos).normalize();
      if (viewDir.lengthSq() > 0.001) {
        const camUp = surfaceUp.clone().applyAxisAngle(viewDir, this.smoothCamRoll);
        this.camera.up.copy(camUp.normalize());
      }
      this.camera.lookAt(this.smoothCamTarget);

      // 7. Dynamic FOV kick: expands peripheral vision from 68° to 82° at top speed
      const targetFov = BASE_FOV + (MAX_FOV_KICK * (speed01 * speed01)) + (isBoosting ? 4 : 0);
      const fovAlpha = 1 - Math.exp(-4.0 * dt);
      this.smoothFov += (targetFov - this.smoothFov) * fovAlpha;
      if (Math.abs(this.camera.fov - this.smoothFov) > 0.05) {
        this.camera.fov = this.smoothFov;
        this.camera.updateProjectionMatrix();
      }
    }

    // ── Update Collision Shockwave ──
    if (this.collisionShockwave && this.shockwaveLife > 0) {
      this.shockwaveLife = Math.max(0, this.shockwaveLife - dt * 3.5);
      const k = 1.0 - this.shockwaveLife;
      const s = 0.35 + k * 2.8;
      this.collisionShockwave.scale.set(s, s, s);
      (this.collisionShockwave.material as THREE.MeshBasicMaterial).opacity = this.shockwaveLife * 0.85;
      if (this.shockwaveLife <= 0) {
        this.collisionShockwave.position.y = -9999;
      }
    }

    // ── Animate Sky Clouds & Floating Stadium Blimp ──
    for (const c of this.clouds) {
      c.position.x += dt * 2.2;
      const maxX = this.trackCenterX + this.trackSpanX + 380;
      const minX = this.trackCenterX - this.trackSpanX - 380;
      if (c.position.x > maxX) c.position.x = minX;
    }

    if (this.stadiumBlimp) {
      const blimpT = this.elapsedTime * 0.05;
      const orbitR_X = Math.max(85, this.trackSpanX * 0.55);
      const orbitR_Z = Math.max(85, this.trackSpanZ * 0.55);
      this.stadiumBlimp.position.x = this.trackCenterX + Math.cos(blimpT) * orbitR_X;
      this.stadiumBlimp.position.z = this.trackCenterZ + Math.sin(blimpT) * orbitR_Z;
      this.stadiumBlimp.position.y = 85 + Math.sin(this.elapsedTime * 0.18) * 4.0;
      this.stadiumBlimp.rotation.y = -blimpT + Math.PI / 2;
    }

    // Render Scene
    this.renderer.render(this.scene, this.camera);
  }

  // ─── Window Resize & Cleanup ──────────────────────────────────────────────

  private handleResize() {
    const w = this.container.clientWidth || 800;
    const h = this.container.clientHeight || 600;
    // Guard against non-dimension changes: prevents costly WebGL framebuffer reallocation and frame stutter
    if (Math.abs(this.currentWidth - w) < 2 && Math.abs(this.currentHeight - h) < 2) return;
    this.currentWidth = w;
    this.currentHeight = h;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  dispose() {
    this.resizeObserver?.disconnect();
    this.cyclists.clear();
    this.batteryPickups.clear();
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
