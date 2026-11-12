# 🔋 Battery Pickup System — Complete Spec & Implementation

**Gaming Kwanjai · DeepSeek V4 Pro · Physics & Balance Engine**

---

## 1. STAGE ITEM BUDGET & SPATIAL DISTRIBUTION

### 1.1 Core Balance Model

Let me define the energy economy first, then derive item counts from it.

**Battery constants:**
```
totalCapacityMah = 10000 mAh  (assumed; scale-invariant)
startCharge      = 0.50       (50%)
itemValue        = 0.05 – 0.10 (5–10% per pickup)
cap              = 1.00
```

**Consumption model (per stage, from existing sim):**
- Base drain: `~0.55 %/s` at cruise (throttle 0.6)
- Boost drain: `~1.40 %/s` at full throttle (throttle 1.0)
- Regen (offroad KERS): `+0.30 %/s` while braking downhill

**Design rule (the "aggressive line" invariant):**
> A player who collects **≥ 70%** of items on the optimal racing line must be able to run **full throttle for the entire stage** and finish with **≥ 15%** battery remaining.
> A player who collects **0%** of items must be forced to **coast / pedal** for the final **25–40%** of the stage.

This gives us the target energy budget per stage:

```
E_needed_full_throttle = drain_boost × duration
E_available            = startCharge + Σ(items_collected × itemValue)
```

### 1.2 Per-Stage Derivation

#### Stage 1 — `flat_sprint` (400 m, ~40 s @ 10 m/s avg)

| Quantity | Value |
|---|---|
| Duration (full throttle) | 40 s |
| Boost drain | 1.40 %/s → **56% consumed** |
| Start | 50% |
| **Deficit to cover** | **6%** (to finish at 0% w/ full throttle) |
| Target finish (aggressive) | ≥ 15% → need **+21%** from items |
| **N items** | **3** |
| Item value | **7% each** → 21% total |
| 70% collection rule | 2 items = 14% → finish ~8% (tight but alive) |

**Placement (400 m):**
```
Item 1: z =  90 m, x = -0.55  (inside line, first gentle left)
Item 2: z = 210 m, x = +0.60  (apex of right sweeper)
Item 3: z = 330 m, x =  0.00  (center slalom, pre-finish)
```
Rationale: 3 items spaced ~120 m apart = one every ~12 s. Forces a **slalom rhythm** (left → right → center) that rewards smooth steering. The center item at 330 m is the "greedy" pickup — taking it costs a slight line deviation right before the finish straight.

---

#### Stage 2 — `hill_climb` (600 m, ~55 s, heavy drain)

| Quantity | Value |
|---|---|
| Duration | 55 s |
| Boost drain (uphill ×1.25 penalty) | 1.75 %/s → **96% consumed** |
| Start | 50% |
| **Deficit** | **46%** — this is the "stall stage" |
| Target finish (aggressive) | ≥ 15% → need **+61%** from items |
| **N items** | **8** |
| Item value | **7–8%** (avg 7.6%) → 61% total |
| 70% collection rule | 6 items ≈ 46% → finish ~0% (survivable, no boost) |
| 0% collection | **stalls at ~z=290 m** (50% / 1.75 %/s ≈ 28 s ≈ 290 m) ✅ |

**Placement (600 m) — clustered on climb sections, sparse on descents:**
```
#  z(m)   x      value   section
1   60   -0.70   8%      base of first climb (reward early commitment)
2  130   +0.65   8%      switchback apex (right)
3  200   -0.60   7%      mid-climb, left apex
4  270   +0.70   8%      summit approach — CRITICAL (stall zone)
5  340   -0.50   7%      summit crest
6  410   +0.55   8%      descent entry (regen assist)
7  490   -0.65   7%      valley floor
8  560   +0.60   8%      final climb to finish
```
Rationale: **Item #4 at z=270 is the "lifeline"** — a player who skipped items 1–3 will stall right around 290 m; item #4 is the last chance to recover. This creates genuine risk/reward tension. Descents (z≈340–490) get fewer items because KERS regen partially covers drain.

---

#### Stage 3 — `endurance_route` (1,200 m = 3 × 400 m laps, ~110 s)

| Quantity | Value |
|---|---|
| Duration | 110 s |
| Boost drain | 1.40 %/s → **154% consumed** |
| Start | 50% |
| **Deficit** | **104%** — impossible without items |
| Target finish (aggressive) | ≥ 15% → need **+119%** from items |
| **N items per lap** | **5** (× 3 laps = 15 total pickups) |
| Item value | **8% each** → 40% per lap, 120% total |
| 70% collection rule | 3.5 items/lap × 8% × 3 = 84% → finish ~-20%... **too tight** |

**Adjustment:** Endurance needs **respawn per lap** with slightly higher value:
```
N per lap     = 5
itemValue     = 8%  (fixed, no variance — endurance = consistency)
per-lap yield = 40%
3-lap total   = 120% (if 100% collected)
70% rule      = 3.5/lap → 84% → finish at 50+84-154 = -20% ❌
```

**Fix:** Reduce boost drain assumption OR add regen. Since endurance is a **closed circuit** (no downhill), we add a **coast-regen**: `+0.15 %/s` when throttle < 0.3. Recompute:
```
Effective drain (mixed throttle) ≈ 1.15 %/s × 110 s = 126%
70% collection = 84% → finish = 50 + 84 - 126 = +8% ✅ (tight, exciting)
100% collection = 120% → finish = 50 + 120 - 126 = +44% ✅ (dominant)
0% collection = stalls at ~43 s ≈ 470 m (lap 2) ✅
```

**Placement per lap (400 m loop, respawns each lap):**
```
#  z(m)   x      note
1   70   -0.60   exit of turn 1 (inside)
2  150   +0.65   apex of turn 2 (outside-then-in)
3  230   -0.55   chicane left
4  310   +0.60   chicane right
5  370    0.00   start/finish straight center (greedy)
```
**Respawn rule:** Items reset to `active=true` when `lapIndex` increments. Use a `lapId` field on each item; pickup check requires `item.lapId === currentLap`. This prevents "collect once, never again" and keeps the endurance economy consistent.

---

#### Stage 4 — `offroad_downhill` (800 m, ~50 s, KERS regen)

| Quantity | Value |
|---|---|
| Duration | 50 s |
| Boost drain | 1.40 %/s → 70% |
| KERS regen (avg, downhill) | +0.35 %/s → **-17.5%** |
| Net consumption | **52.5%** |
| Start | 50% |
| **Deficit** | **2.5%** — nearly self-sustaining |
| Target finish (aggressive) | ≥ 20% → need **+22.5%** |
| **N items** | **4** |
| Item value | **6% each** → 24% total |
| 70% collection | 3 items = 18% → finish ~15.5% ✅ |
| 0% collection | finish ~-2.5% → **stalls on final jump** ✅ |

**Placement (800 m) — sparse, on jump approaches (reward airtime lines):**
```
#  z(m)   x      value   note
1  120   -0.70   6%      before first jump (left launch line)
2  310   +0.65   6%      mid-canyon, right apex
3  520   -0.60   6%      before big jump (left)
4  700   +0.55   6%      final descent to finish
```
Rationale: Offroad is **regen-rich**, so items are **lower value (6%)** and **sparser (4)**. They're placed on **jump approach lines** — collecting them requires committing to a specific launch angle, which is the skill expression of this stage.

---

### 1.3 Summary Table

| Stage | N | Value | Total Yield | Start | Net Drain | Aggressive Finish | 0% Finish |
|---|---|---|---|---|---|---|---|
| flat_sprint | 3 | 7% | 21% | 50% | 56% | **+15%** | -6% (coast) |
| hill_climb | 8 | 7–8% | 61% | 50% | 96% | **+15%** | stall @290m |
| endurance_route | 5/lap ×3 | 8% | 120% | 50% | 126% | **+8%** | stall @470m |
| offroad_downhill | 4 | 6% | 24% | 50% | 52.5% | **+21.5%** | stall @final jump |

---

## 2. 3D VISUAL ASSET — Procedural Glowing Battery Pickup

```typescript
// Racing3DRenderer.ts — add to renderer class

import * as THREE from 'three';

export interface BatteryPickupVisual {
  group: THREE.Group;
  core: THREE.Mesh;
  ring: THREE.Mesh;
  aura: THREE.Mesh;
  baseY: number;
  phase: number;      // random phase for bobbing desync
  collected: boolean;
  collectT: number;   // 0..1 fade-out timer
}

export function createBatteryPickupMesh(): BatteryPickupVisual {
  const group = new THREE.Group();

  // --- Core: 21700 battery cell (cylinder, brass terminals) ---
  const coreGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.32, 16);
  const coreMat = new THREE.MeshStandardMaterial({
    color: 0x0a2a1a,
    emissive: 0x00ffaa,
    emissiveIntensity: 2.2,
    metalness: 0.85,
    roughness: 0.25,
  });
  const core = new THREE.Mesh(coreGeo, coreMat);
  core.rotation.z = Math.PI / 2; // lay horizontal (battery cell orientation)
  group.add(core);

  // --- Brass terminals (two small caps) ---
  const capGeo = new THREE.CylinderGeometry(0.10, 0.10, 0.04, 16);
  const capMat = new THREE.MeshStandardMaterial({
    color: 0xd4a017, metalness: 1.0, roughness: 0.15,
    emissive: 0x553300, emissiveIntensity: 0.4,
  });
  const capL = new THREE.Mesh(capGeo, capMat);
  capL.rotation.z = Math.PI / 2;
  capL.position.x = -0.18;
  const capR = capL.clone();
  capR.position.x = 0.18;
  group.add(capL, capR);

  // --- Pulsing energy ring (torus, cyan) ---
  const ringGeo = new THREE.TorusGeometry(0.28, 0.025, 8, 32);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x00ffff, transparent: true, opacity: 0.9,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = Math.PI / 2;
  group.add(ring);

  // --- Soft aura (sprite-like billboard glow) ---
  const auraGeo = new THREE.SphereGeometry(0.45, 12, 12);
  const auraMat = new THREE.MeshBasicMaterial({
    color: 0x00ffcc, transparent: true, opacity: 0.12,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const aura = new THREE.Mesh(auraGeo, auraMat);
  group.add(aura);

  // --- Point light for local glow on road ---
  const light = new THREE.PointLight(0x00ffaa, 1.2, 4.0, 2.0);
  group.add(light);

  return {
    group, core, ring, aura,
    baseY: 0.75,
    phase: Math.random() * Math.PI * 2,
    collected: false,
    collectT: 0,
  };
}

// --- Per-frame animation (call from render loop) ---
export function animateBatteryPickup(
  v: BatteryPickupVisual,
  t: number,
  dt: number,
): void {
  if (v.collected) {
    // Collection burst: scale up + fade out over 0.35s
    v.collectT += dt / 0.35;
    const k = Math.min(v.collectT, 1);
    const scale = 1 + k * 1.8;
    v.group.scale.setScalar(scale);
    (v.ring.material as THREE.MeshBasicMaterial).opacity = 0.9 * (1 - k);
    (v.aura.material as THREE.MeshBasicMaterial).opacity = 0.12 * (1 - k);
    (v.core.material as THREE.MeshStandardMaterial).emissiveIntensity = 2.2 * (1 - k);
    if (k >= 1) v.group.visible = false;
    return;
  }

  // Continuous Y-rotation
  v.group.rotation.y += dt * 1.8;

  // Vertical bobbing: 0.6m – 0.9m above road
  const bob = Math.sin(t * 2.2 + v.phase) * 0.15;
  v.group.position.y = v.baseY + bob;

  // Ring pulse
  const pulse = 0.85 + Math.sin(t * 4.0 + v.phase) * 0.15;
  v.ring.scale.setScalar(pulse);
  (v.ring.material as THREE.MeshBasicMaterial).opacity = 0.6 + pulse * 0.3;

  // Aura breathing
  (v.aura.material as THREE.MeshBasicMaterial).opacity =
    0.08 + Math.sin(t * 3.0 + v.phase) * 0.05;
}
```

**Visual design notes:**
- **Cyan/emerald palette** (`0x00ffaa`, `0x00ffff`) reads as "energy" and contrasts with the warm road/horizon.
- **Horizontal cell orientation** (rotated Z) makes it read as a battery, not a coin.
- **Additive blending** on ring + aura gives the "high-tech glow" without needing post-processing bloom.
- **PointLight** (range 4m) casts a subtle green pool on the road — critical for readability at speed.
- **Collection burst** scales 1→2.8× while fading over 350ms — feels punchy without lingering.

---

## 3. COLLISION / HITBOX MATH

### 3.1 Coordinate Mapping

The sim uses **normalized lateral** `playerX ∈ [-1, +1]` and **world longitudinal** `playerZ` (meters). Items are authored in the same space:

```typescript
export interface BatteryItem {
  id: string;
  z: number;          // meters along track
  x: number;          // normalized lateral [-1, +1]
  value: number;      // 0.05 – 0.10 (fraction of capacity)
  lapId: number;      // for endurance respawn (0 = all laps)
  active: boolean;
  visual: BatteryPickupVisual;
}
```

### 3.2 Tolerances

```typescript
// Longitudinal: at 12 m/s and 60 FPS, player moves 0.2 m/frame.
// Use 2.5 m tolerance → ~12 frames of overlap window. Generous but fair.
const PICKUP_DZ = 2.5;   // meters

// Lateral: playerX is normalized. Road half-width = 3.2 m.
// 1.0 normalized = 3.2 m. Item radius ~0.3 m + bike ~0.4 m = 0.7 m.
// 0.7 / 3.2 ≈ 0.22 normalized. Use