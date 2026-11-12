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
    // 400m High Speed Sprint: 3 items (7% each = 21% total yield)
    // Left curve apex -> Right sweeper apex -> Pre-finish straight center
    return [
      { id: 'fs_1', z: 90, x: -0.55, valuePct: 0.07, sectionName: 'ทางโค้งซ้ายแรก' },
      { id: 'fs_2', z: 210, x: 0.60, valuePct: 0.07, sectionName: 'เอเปกโค้งขวากว้าง' },
      { id: 'fs_3', z: 330, x: 0.00, valuePct: 0.07, sectionName: 'สปรินต์ก่อนเส้นชัย' },
    ];
  }

  if (trackId === 'hill_climb') {
    // 600m Steep Hill Climb: 8 items (7-8% each = 61% total yield)
    // Clustered heavily on steep climbing switchbacks to reward hill pacing
    return [
      { id: 'hc_1', z: 60, x: -0.70, valuePct: 0.08, sectionName: 'ฐานเนินแรก (+14%)' },
      { id: 'hc_2', z: 130, x: 0.65, valuePct: 0.08, sectionName: 'หักศอกขวาไต่เขา' },
      { id: 'hc_3', z: 200, x: -0.60, valuePct: 0.07, sectionName: 'โค้งซ้ายกลางเขา' },
      { id: 'hc_4', z: 270, x: 0.70, valuePct: 0.08, sectionName: 'กู้ชีพก่อนยอดเขาชัน' }, // Lifeline before stall zone
      { id: 'hc_5', z: 340, x: -0.50, valuePct: 0.07, sectionName: 'สันยอดเขาแรก' },
      { id: 'hc_6', z: 410, x: 0.55, valuePct: 0.08, sectionName: 'ก่อนไต่เขาลูกที่สอง' },
      { id: 'hc_7', z: 490, x: -0.65, valuePct: 0.07, sectionName: 'โค้งชันหักศอก (+16%)' },
      { id: 'hc_8', z: 560, x: 0.60, valuePct: 0.08, sectionName: 'พุ่งสู่ยอดเส้นชัย' },
    ];
  }

  if (trackId === 'endurance_route') {
    // 1,200m Endurance Circuit (3 laps of 400m): 5 items per lap (8% each = 40% per lap, 120% total)
    // Placed strategically across the rolling figure-8 loop
    return [
      // Lap 1 (0 - 400m)
      { id: 'end_l1_1', z: 70, x: -0.60, valuePct: 0.08, sectionName: 'รอบ 1: ทางออกโค้ง 1' },
      { id: 'end_l1_2', z: 150, x: 0.65, valuePct: 0.08, sectionName: 'รอบ 1: เอเปกโค้ง 2' },
      { id: 'end_l1_3', z: 230, x: -0.55, valuePct: 0.08, sectionName: 'รอบ 1: ชิเคนซ้าย' },
      { id: 'end_l1_4', z: 310, x: 0.60, valuePct: 0.08, sectionName: 'รอบ 1: ชิเคนขวา' },
      { id: 'end_l1_5', z: 375, x: 0.00, valuePct: 0.08, sectionName: 'รอบ 1: ทางตรงผ่านพิท' },

      // Lap 2 (400 - 800m)
      { id: 'end_l2_1', z: 470, x: -0.60, valuePct: 0.08, sectionName: 'รอบ 2: ทางออกโค้ง 1' },
      { id: 'end_l2_2', z: 550, x: 0.65, valuePct: 0.08, sectionName: 'รอบ 2: เอเปกโค้ง 2' },
      { id: 'end_l2_3', z: 630, x: -0.55, valuePct: 0.08, sectionName: 'รอบ 2: ชิเคนซ้าย' },
      { id: 'end_l2_4', z: 710, x: 0.60, valuePct: 0.08, sectionName: 'รอบ 2: ชิเคนขวา' },
      { id: 'end_l2_5', z: 775, x: 0.00, valuePct: 0.08, sectionName: 'รอบ 2: ทางตรงผ่านพิท' },

      // Lap 3 (800 - 1200m)
      { id: 'end_l3_1', z: 870, x: -0.60, valuePct: 0.08, sectionName: 'รอบ 3: ทางออกโค้ง 1' },
      { id: 'end_l3_2', z: 950, x: 0.65, valuePct: 0.08, sectionName: 'รอบ 3: เอเปกโค้ง 2' },
      { id: 'end_l3_3', z: 1030, x: -0.55, valuePct: 0.08, sectionName: 'รอบ 3: ชิเคนซ้าย' },
      { id: 'end_l3_4', z: 1110, x: 0.60, valuePct: 0.08, sectionName: 'รอบ 3: ชิเคนขวา' },
      { id: 'end_l3_5', z: 1175, x: 0.00, valuePct: 0.08, sectionName: 'รอบ 3: สปรินต์รอบสุดท้าย' },
    ];
  }

  // offroad_downhill (800m): 4 items (6% each = 24% total yield)
  // Lower yield + sparser spacing because downhill KERS regen provides free recharge
  return [
    { id: 'off_1', z: 120, x: -0.70, valuePct: 0.06, sectionName: 'ทางเข้าเนินโดด 1' },
    { id: 'off_2', z: 310, x: 0.65, valuePct: 0.06, sectionName: 'เอเปกหุบเขาแคนยอน' },
    { id: 'off_3', z: 520, x: -0.60, valuePct: 0.06, sectionName: 'ก่อนเนินบิ๊กจัมป์' },
    { id: 'off_4', z: 700, x: 0.55, valuePct: 0.06, sectionName: 'ทางลาดลงแคนยอนสุดท้าย' },
  ];
}
