# 🏔️ Gaming Kwanjai — "Frozen Screen at 44 km/h" Full Diagnosis & Fix

---

## 1. Why the scene looks completely static

There are **five compounding bugs**, and any one of them alone would freeze the visual. Together they produce a perfectly static image.

### Bug A — The React rAF loop is self-destructing every frame (THE KILLER)

```tsx
useEffect(() => {
  const tick = (t) => {
    const dt = (t - lastTickTimeRef.current) / 1000;
    lastTickTimeRef.current = t;
    setPlayerZ(z => z + speed * dt);   // ← state change
    setPlayerSpeedMps(...);            // ← state change
    setRaceTimeSeconds(...);           // ← state change
    rafRef.current = requestAnimationFrame(tick);
  };
  rafRef.current = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(rafRef.current);
}, [playerZ, playerSpeedMps, raceTimeSeconds]);  // ← DEPENDENCY ARRAY
```

Every `setState` re-renders → the effect's deps changed → React **cancels the rAF and remounts the effect** → `lastTickTimeRef.current = performance.now()` is reset **inside the new closure** → the next `dt` is measured from the *remount time*, not the last frame.

Result: `dt ≈ 0` on nearly every frame. `playerZ` advances by `speed × ~0.0001s ≈ 0.001 m/frame`. At 44 km/h (12.2 m/s) you move **~1 cm per second of wall-clock time**. The camera lerp `smoothCamPos.lerp(target, posAlpha)` also gets `posAlpha ≈ 0`, so the camera never catches up either. **The world is frozen.**

### Bug B — `dt` is never clamped, and `posAlpha`/`lookAlpha` are frame-rate dependent

Even if the loop were fixed, `lerp(target, posAlpha)` with a fixed alpha is **frame-rate dependent**. On a 144 Hz monitor the camera snaps; on a 30 Hz monitor it lags. And a single long frame (tab switch, GC pause) produces a huge `dt` → the bike teleports 50 m → camera lerp overshoots → visual pop.

### Bug C — Camera is too far, too high, too flat, and looks *ahead* of the bike

```
camDist = 8.2, camHeight = 3.6, lookAt = pos + tangent*6.5
```
- The bike is **8.2 m away** and **3.6 m up** → it occupies a tiny fraction of the screen.
- `lookAt` is **6.5 m ahead** of the bike, so the bike sits in the lower third and the camera stares at empty road.
- FOV is (presumably) 60–75°. At 12 m/s with an 8 m camera distance, the **angular velocity of the road texture** is tiny. Optical flow ∝ `v / distance`. Doubling `v` or halving `distance` doubles the flow. You have both wrong.
- No FOV kick, no camera shake, no roll into corners → zero speed sensation.

### Bug D — The road has **zero high-frequency features**

An 11 m wide flat brown strip with **no center line, no dashes, no posts, no texture scroll** is a *featureless plane*. Human speed perception is driven almost entirely by **high-contrast features passing the camera at high angular velocity**. A uniform brown ribbon at 44 km/h looks identical to a uniform brown ribbon at 0 km/h. This is the single biggest *perceptual* reason it "looks frozen" even when it isn't.

### Bug E — `getTrackPosition` sampling is fine, but the tangent/normal lerp is not re-orthogonalized

`tangent.lerp(...).normalize()` and `normal.lerp(...).normalize()` are **not guaranteed perpendicular** after lerp. Over 800 samples of a curving downhill, the accumulated drift makes `normal` tilt, which tilts the camera's lateral offset and the bike's `lookAt` — subtle, but it contributes to a "dead" feel because the horizon doesn't roll with the descent.

---

## 2. Fix the React game loop — `dt` never crushed, runs 0 → 800 m

**Rule: the rAF loop must have an empty dependency array and must never call `setState` for per-frame values.** Use refs for the simulation, and push to React state at a throttled rate (or not at all — let the 3D layer read refs directly).

```tsx
// RacingScreen.tsx
import { useEffect, useRef, useState } from 'react';

const TRACK_LENGTH = 800;
const MAX_DT = 1 / 20;          // clamp: never simulate more than 50 ms in one step
const HUD_HZ = 10;              // push HUD state 10×/sec, not 60×

export function RacingScreen() {
  // ---- Simulation lives in refs, NOT state ----
  const simRef = useRef({
    z: 0,
    speedMps: 0,
    time: 0,
    finished: false,
  });

  // ---- HUD state is throttled ----
  const [hud, setHud] = useState({ z: 0, speedMps: 0, time: 0, finished: false });

  const rafRef = useRef<number>(0);
  const lastTickRef = useRef<number>(0);
  const lastHudRef = useRef<number>(0);

  useEffect(() => {
    // Reset clock ONCE, at mount. Never inside the tick.
    lastTickRef.current = performance.now();
    lastHudRef.current = performance.now();

    const tick = (now: number) => {
      // --- 1. dt with clamp ---
      let dt = (now - lastTickRef.current) / 1000;
      lastTickRef.current = now;
      if (dt > MAX_DT) dt = MAX_DT;   // tab-switch / GC guard
      if (dt < 0) dt = 0;             // clock skew guard

      const s = simRef.current;

      if (!s.finished) {
        // --- 2. Integrate physics in refs ---
        // (replace with your real pedal/gravity model)
        s.speedMps = Math.min(s.speedMps + 4.0 * dt, 12.5); // accelerate to ~45 km/h
        s.z += s.speedMps * dt;
        s.time += dt;

        if (s.z >= TRACK_LENGTH) {
          s.z = TRACK_LENGTH;
          s.finished = true;
        }
      }

      // --- 3. Hand the ref to the 3D layer (no React re-render) ---
      // The Three.js renderer reads simRef.current every frame.
      renderer3D.update(s.z, s.speedMps, s.time, dt);

      // --- 4. Throttled HUD push ---
      if (now - lastHudRef.current > 1000 / HUD_HZ) {
        lastHudRef.current = now;
        setHud({ z: s.z, speedMps: s.speedMps, time: s.time, finished: s.finished });
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);   // ← EMPTY. The loop is created once and lives forever.

  // ... render HUD from `hud` ...
}
```

**Key points:**
- `[]` dependency array → the effect runs **once**. No remount, no clock reset.
- `lastTickRef` is set **once at mount**, never inside `tick`.
- `dt` is clamped to `1/20 s`. A 2-second stall advances the sim by 50 ms, not 2 s.
- Per-frame values live in `simRef.current`; the Three.js layer reads them directly. React state is only for the HUD, throttled to 10 Hz.
- The finish line is a **state transition inside the sim** (`s.finished`), not a React effect. It fires exactly once.

If you *must* keep `playerZ` in React state (e.g. for other components), use a **ref + `useSyncExternalStore`** or a tiny event emitter — never put it in the rAF effect's deps.

---

## 3. Camera — make the bike feel fast, dynamic, and prominent

### The math of speed perception

Optical flow angular velocity for a feature at distance `d` from the camera, moving at speed `v`:

```
ω ≈ v / d        (rad/s, for features near the optical axis)
```

At `v = 12.2 m/s`:
- `d = 8.2 m` (your current camDist) → `ω ≈ 1.49 rad/s`
- `d = 3.5 m` (proposed) → `ω ≈ 3.49 rad/s` → **2.3× more flow**

Also, the bike's **screen-space size** ∝ `1/d`. At 8.2 m the bike is tiny; at 3.5 m it's prominent.

### New camera rig

```ts
// Camera constants
const CAM_DIST      = 3.6;    // was 8.2  — bike is now big & close
const CAM_HEIGHT    = 1.55;   // was 3.6  — near rider eye level, not a drone
const CAM_LOOKAHEAD = 9.0;    // was 6.5  — look further down the trail
const CAM_LOOK_UP   = 0.55;   // was 0.9  — lower aim, more road in frame
const BASE_FOV      = 68;     // was ~60–75; we'll modulate it
const MAX_FOV_KICK  = 14;     // +14° at top speed
const TOP_SPEED     = 12.5;   // m/s (~45 km/h)

// Frame-rate-independent smoothing:
//   alpha = 1 - exp(-k * dt)   ← correct exponential smoothing
const camPosK   = 9.0;   // higher = snappier
const camLookK  = 12.0;
const fovK      = 4.0;

update(playerZ, speedMps, time, dt) {
  const { position, tangent, normal } = this.getTrackPosition(playerZ, this.lateralX);

  // --- Re-orthogonalize (fixes Bug E) ---
  const t = tangent.clone().normalize();
  const n = normal.clone().sub(t.clone().multiplyScalar(normal.dot(t))).normalize();
  const binormal = new THREE.Vector3().crossVectors(t, n).normalize();

  // --- Speed factor 0..1 ---
  const speed01 = THREE.MathUtils.clamp(speedMps / TOP_SPEED, 0, 1);

  // --- Camera target position: behind, above, slightly offset ---
  const targetCamPos = position.clone()
    .addScaledVector(t, -CAM_DIST)
    .addScaledVector(n, CAM_HEIGHT)
    .addScaledVector(binormal, this.smoothCamLateral * 0.9);

  // --- Look-at: further ahead, lower, with apex offset ---
  const targetLookAt = position.clone()
    .addScaledVector(t, CAM_LOOKAHEAD)
    .addScaledVector(n, CAM_LOOK_UP)
    .addScaledVector(binormal, this.apexOffset + this.smoothCamLateral * 0.35);

  // --- Exponential smoothing (frame-rate independent) ---
  const aPos  = 1 - Math.exp(-camPosK  * dt);
  const aLook = 1 - Math.exp(-camLookK * dt);
  this.smoothCamPos.lerp(targetCamPos, aPos);
  this.smoothCamTarget.lerp(targetLookAt, aLook);

  this.camera.position.copy(this.smoothCamPos);
  this.camera.lookAt(this.smoothCamTarget);

  // --- FOV kick: widens with speed → radial blur feel ---
  const targetFov = BASE_FOV + MAX_FOV_KICK * speed01 * speed01;
  this.camera.fov += (targetFov - this.camera.fov) * (1 - Math.exp(-fovK * dt));
  this.camera.updateProjectionMatrix();

  // --- Subtle camera shake at high speed (adds "alive" feel) ---
  const shake = 0.012 * speed01 * speed01;
  this.camera.position.x += (Math.random() - 0.5) * shake;
  this.camera.position.y += (Math.random() - 0.5) * shake;

  // --- Roll into corners (banking) ---
  // Compute curvature from tangent change; roll camera slightly.
  const roll = this.computeBankRoll(t, dt) * speed01;
  this.camera.rotateZ(roll);
}
```

**Why this works:**
- `CAM_DIST 3.6` + `CAM_HEIGHT 1.55` → the bike fills ~25–30% of the screen height and the road rushes past at 2.3× the angular velocity.
- `CAM_LOOKAHEAD 9.0` → you see the trail ahead, so the *approaching* features are visible and their motion is readable.
- **FOV kick** `68° → 82°` at top speed: this is the classic "speed warp" — peripheral features stretch radially, which the brain reads as *fast*.
- **Exponential smoothing** `1 - exp(-k·dt)` is the mathematically correct frame-rate-independent lerp. Your old fixed `posAlpha` was frame-rate dependent.
- **Bank roll** makes the horizon tilt in corners — a huge immersion cue on a downhill.
- **Micro-shake** at speed adds high-frequency motion that the eye reads as vibration.

---

## 4. Road geometry — intense optical flow

The road must have **high-contrast, high-frequency features** that pass the camera at high angular velocity. Three layers:

### 4a. Narrow the road + add a shoulder

```ts
const ROAD_HALF_WIDTH = 3.2;   // was 5.5 → 6.4 m wide (single-lane downhill trail)
const SHOULDER_WIDTH  = 1.2;   // dirt shoulder each side
```

An 11 m road at 3.6 m camera distance is *too wide* — the edges are far off-screen and the center is featureless. A 6.4 m trail with visible edges gives strong **converging edge lines** (the strongest optical-flow cue in racing games).

### 4b. Dashed center line — animated by `gameZ`

Build the center line as **instanced quads** placed along the track, and scroll them by `gameZ` so they always appear to move toward the camera. Better: place them at **fixed world positions** along the track and let the camera move past them — that's physically correct and gives perfect optical flow.

```ts
// Build once: dashes every 6 m along the 800 m track
const DASH_LEN   = 3.0;
const DASH_GAP   = 3.0;
const DASH_PERIOD = DASH_LEN + DASH_GAP;   // 6 m
const NUM_DASHES = Math.floor(TRACK_LENGTH / DASH_PERIOD);

const dashGeo = new THREE.PlaneGeometry(0.18, DASH_LEN);
const dashMat = new THREE.MeshBasicMaterial({
  color: 0xffe066,
  polygonOffset: true,
  polygonOffsetFactor: -2,   // prevent z-fighting with road
});

const dashes = new THREE.InstancedMesh(dashGeo, dashMat, NUM_DASHES);
const m = new THREE.Matrix4();
const q = new THREE.Quaternion();
const up = new THREE.Vector3(0, 1, 0);

for (let i = 0; i < NUM_DASHES; i++) {
  const z = i * DASH_PERIOD + DASH_LEN * 0.5;
  const { position, tangent, normal } = getTrackPosition(z, 0);

  // Orient the dash flat on the road, aligned with tangent
  const t = tangent.clone().normalize();
  const n = normal.clone().normalize();
  const b = new THREE.Vector3().crossVectors(t, n).normalize();

  // Build a basis: X = binormal (across road), Y = normal (up), Z = tangent
  const basis = new THREE.Matrix4().makeBasis(b, n, t);
  q.setFromRotationMatrix(basis);

  // PlaneGeometry lies in XY; rotate so its long axis (Y) aligns with tangent (Z)
  const rotX = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0), -Math.PI/2);
  q.multiply(rotX);

  m.compose(position.clone().addScaledVector(n, 0.02), q, new THREE.Vector3(1,1,1));
  dashes.setMatrixAt(i, m);
}
dashes.instanceMatrix.needsUpdate = true;
scene.add(dashes);
```

**Why this gives optical flow:** each dash is a **3 m long, 0.18 m wide, bright yellow** object at a known world position. As the camera moves at 12 m/s, a dash 3.6 m ahead passes the camera in `3.6/12 = 0.3 s` — that's a **3.3 Hz flicker** of high-contrast features. The eye cannot perceive that as static. This alone fixes the "f