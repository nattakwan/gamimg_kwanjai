# DeepSeek V4 Pro — Kinematics Answer Sheet

All notation: curve $C(u)$, $u\in[0,1]$, world up $\hat{U}=(0,1,0)$, rider lateral offset $x\in[-1,+1]$, track half-width $w$.

---

## 1. INVERTED STEERING — Correct Right Vector

**Root cause of inversion:** using `cross(UP, tangent)` on some segments and `cross(tangent, UP)` on others, or `curve.getTangent().negate()` after hairpins, flips handedness. The sign flip depends on **loop orientation** and whether the tangent points "forward" along increasing or decreasing $u$.

### Correct formula (viewpoint-relative, never inverts)

Let tangent $\hat{T}(u) = \dfrac{C'(u)}{\lVert C'(u)\rVert}$.

$$\boxed{\hat{R}(u) = \mathrm{normalize}\!\left(\hat{T}(u) \times \hat{U}\right)}$$

Wait — this gives the **left** in a right-handed system. For a rider facing $\hat{T}$ with head at $\hat{U}$, their **right hand** points along $\hat{U}\times\hat{T}$... let's verify concretely in Three.js (right-handed, Y-up):

- If rider faces $+Z$ ($\hat T=(0,0,1)$), their right is $+X$.
- $\hat T \times \hat U = (0,0,1)\times(0,1,0) = (-1,0,0)$. Wrong sign.
- $\hat U \times \hat T = (0,1,0)\times(0,0,1) = (1,0,0)$. ✅

$$\boxed{\;\hat{R}(u) = \mathrm{normalize}\big(\hat{U} \times \hat{T}(u)\big)\;}$$

**Player world position:**

$$P(u,x) = C(u) + w\,x\,\hat{R}(u) + h\,\hat{U}$$

with $x=+1$ → right shoulder, $x=-1$ → left shoulder. **No sign flip is ever needed**, because $\hat U\times\hat T$ is intrinsically oriented to the rider's viewpoint for any tangent direction.

### Hairpin/loop proof (why it stays correct)

At a 180° hairpin, $\hat T \to -\hat T$, so $\hat R \to -\hat R$. The rider's body also rotates 180° with the tangent (via `quaternion.setFromUnitVectors(FORWARD, T)`), so $+x$ still maps to their real-world right hand. **Inversion was a frame-mismatch bug**, not a math one — the road normal was computed in world frame but steering was applied in a stale local frame.

### When tangent ∥ UP (vertical loop)

Guard: if $|\hat T\cdot\hat U| > 0.999$, fall back to previous frame's $\hat R$ (parallel-transport) or use a reference like $\hat U'=(0,0,1)$. For flat kart tracks this never triggers — but include it for safety:

```js
function lateralRight(T, U = new THREE.Vector3(0,1,0)) {
  if (Math.abs(T.dot(U)) > 0.999) {         // tangent ⟂ ground plane
    const ref = new THREE.Vector3(0, 0, 1); // fallback world axis
    return new THREE.Vector3().crossVectors(U, ref).normalize();
  }
  return new THREE.Vector3().crossVectors(U, T).normalize();
}
```

### Steering → lateral target

$$\dot x = k_{steer}\cdot\mathrm{steerInput}\quad (k_{steer}\approx 1.2\,\text{s}^{-1}),\quad x\leftarrow\mathrm{clamp}(x+\dot x\,\Delta t,\,-1,\,+1)$$

Where `steerInput ∈ {-1,0,+1}` maps directly to world-left/straight/world-right via $\hat R$. **No cross product on the input — the mapping is fixed in the rider's frame.**

---

## 2. SPEED SYNCHRONIZATION (v, ω_wheel, ω_crank, s(t))

### Chain of definitions

| Symbol | Meaning | Units |
|---|---|---|
| $v(t)$ | scalar bike speed | m/s |
| $r_w$ | wheel radius | m |
| $i_g$ | gear ratio (chainring→cassette) | — |
| $s(t)$ | arc-length progressed | m |
| $u(t)$ | spline parameter | — |
| $\omega_w$ | wheel angular speed | rad/s |
| $\omega_c$ | crank (pedal) angular speed | rad/s |

### Core rolling constraint (kart/bike)

The wheel rolls without slipping, so distance progressed = wheel rotation × radius:

$$v = \omega_w\, r_w \quad\Longrightarrow\quad \boxed{\omega_w = \dfrac{v}{r_w}}$$

### Cadence (crank) is gear-linked:

$$v = \omega_c \, i_g \, r_w \quad\Longrightarrow\quad \boxed{\omega_c = \dfrac{v}{i_g\, r_w} = \dfrac{\omega_w}{i_g}}$$

(For a kart with CVT, replace $i_g$ with instantaneous $i_g(t)$ from the belt model. Speedometer shows $v$; tach shows $\omega_w$; cadence display shows $\omega_c$ — all three are one scalar $v$ under two constants.)

### Spline arc-length progression — the key line

CatmullRomCurve3 is parameterized by $u$, not arclength. Precompute cumulative lengths `L[i]` from `curve.getLengths(divisions)` (or analytic $L(u)=\int_0^u\|C'(\tau)\|d\tau$). Then:

$$\Delta s = v\,\Delta t \;\Rightarrow\; s_{n+1}=s_n+\Delta s$$

Invert $L(u)=s$ via binary search on the cumulative table → $\boxed{u_{n+1} = L^{-1}(s_{n+1})}$.

Then:

$$\text{position} = C(u_{n+1}),\quad \text{yaw} = \hat T(u_{n+1})$$

### Spline speed consistency rule (crucial)

If you also animate **scenery / minimap / distance markers** using $s$ directly, they use the *same* $s(t)$ integral → **they cannot drift from the speedometer** (same scalar, same integrator). Never drive scenery from a separate `clock.getElapsedTime()` timer.

### Wheel visual sync

To make wheel rotation $= \omega_w$ exactly in Three.js:

```js
wheel.rotation.x += (v / r_w) * dt;   // radians, matches ω_w
crank.rotation.x += (v / (i_g * r_w)) * dt;
```

Since wheel is parented to the bike (whose yaw follows $\hat T$), the rotation is **local around the axle** — equivalent to $\omega_w \hat R(u)$ in world space. Do not apply world-space angular velocity to the mesh.

### Sub-step coupling (order matters)

Compute in this order each frame (fixed timestep sub-steps strongly recommended):

1. Update inputs → $v \mathrel{+}= a(v,\text{input})\,\Delta t$, clamp.
2. $s \mathrel{+}= v\,\Delta t$.
3. $u = L^{-1}(s)$, wrap if closed loop ($s \bmod L_{total}$).
4. $\omega_w = v/r_w$, $\omega_c = v/(i_g r_w)$.
5. Integrate wheel/crank angles, place scene objects at $s$.

Because steps 2–5 all consume identical $s$ and $v$, **visual scenery speed == speedometer speed by construction**, not by tuning.

---

## 3. START & FINISH ARCHES

An arch spans the road laterally. Its local axes are:

- width axis $= \hat R(u_0)$ (right vector from §1)
- height axis $= \hat U$
- depth axis $= \hat T(u_0)$

### Orientation quaternion

Build an