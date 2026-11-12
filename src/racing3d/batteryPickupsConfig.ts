/**
 * Battery Energy Pickups Configuration for Racing Stages
 * 
 * Tuned with DeepSeek V4 Pro Physics & Gameplay Balance Engine:
 * - Starting battery charge: 50%
 * - Item energy value: 5% - 10% (scaled by track difficulty & slope)
 * - Optimal racing lines: Placed along inside apices, exit chicanes, and climb lifelines
 */

export interface BatteryPickupConfig {
  id: string;
  z: number;        // Track distance station (meters)
  x: number;        // Lateral road position (-1.0 left to +1.0 right)
  valuePct: number; // Fraction of battery restored (0.05 - 0.10)
  sectionName?: string;
}

export function getStageBatteryItems(trackId: string): BatteryPickupConfig[] {
  if (trackId === 'flat_sprint') {
    // 400m Sprint: 2 items (reduced by ~50% from 3, placed at mid-curve and home straight)
    return [
      { id: 'fs_1', z: 140, x: -0.60, valuePct: 0.08, sectionName: 'โค้งซ้ายความเร็วสูง' },
      { id: 'fs_2', z: 280, x: 0.55, valuePct: 0.08, sectionName: 'สปรินต์ก่อนทางตรง' },
    ];
  }

  if (trackId === 'hill_climb') {
    // 600m Hill Climb: 4 items (reduced 50% from 8, placed at critical steep ascent checkpoints)
    return [
      { id: 'hc_1', z: 120, x: 0.65, valuePct: 0.10, sectionName: 'กู้ชีพทางชันแรก (+14%)' },
      { id: 'hc_2', z: 260, x: -0.60, valuePct: 0.10, sectionName: 'ก่อนยอดเขาลูกแรก (+14%)' },
      { id: 'hc_3', z: 400, x: 0.55, valuePct: 0.10, sectionName: 'แอ่งพักก่อนไต่ระห่ำ (+16%)' },
      { id: 'hc_4', z: 520, x: -0.65, valuePct: 0.10, sectionName: 'พลังงานเฮือกสุดท้ายสู่เส้นชัย' },
    ];
  }

  if (trackId === 'endurance_route') {
    // 1,200m Endurance Circuit: 6 items total (reduced 60% from 15; 2 items per lap)
    return [
      // Lap 1 (0 - 400m)
      { id: 'end_l1_1', z: 150, x: 0.60, valuePct: 0.09, sectionName: 'รอบ 1: เอเปกโค้ง 2' },
      { id: 'end_l1_2', z: 320, x: -0.55, valuePct: 0.09, sectionName: 'รอบ 1: ทางตรงผ่านพิท' },

      // Lap 2 (400 - 800m)
      { id: 'end_l2_1', z: 550, x: 0.60, valuePct: 0.09, sectionName: 'รอบ 2: เอเปกโค้ง 2' },
      { id: 'end_l2_2', z: 720, x: -0.55, valuePct: 0.09, sectionName: 'รอบ 2: ทางตรงผ่านพิท' },

      // Lap 3 (800 - 1200m)
      { id: 'end_l3_1', z: 950, x: 0.60, valuePct: 0.09, sectionName: 'รอบ 3: เอเปกโค้ง 2' },
      { id: 'end_l3_2', z: 1120, x: -0.55, valuePct: 0.09, sectionName: 'รอบ 3: สปรินต์รอบสุดท้าย' },
    ];
  }

  // offroad_downhill (800m): 2 items (reduced 50% from 4; supplemented by KERS downhill regen)
  return [
    { id: 'off_1', z: 260, x: 0.65, valuePct: 0.08, sectionName: 'เอเปกหุบเขาแคนยอน' },
    { id: 'off_2', z: 580, x: -0.60, valuePct: 0.08, sectionName: 'ก่อนเนินบิ๊กจัมป์' },
  ];
}

