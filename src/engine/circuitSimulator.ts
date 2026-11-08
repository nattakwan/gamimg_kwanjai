/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  CircuitComponent,
  CircuitWire,
  CircuitAnalysisResult,
  BatteryPackSetup,
} from '../types/game';

/**
 * Calculates battery pack electrical parameters from series (S) and parallel (P) topology.
 * AA Cell standard: Nominal 1.5V, 2000mAh, Internal Resistance ~0.15 Ohm
 */
export function calculateBatteryPack(
  seriesCount: number,
  parallelCount: number,
  reversedInSeries: number = 0
): {
  voltage: number;
  capacityMah: number;
  energyWh: number;
  internalResistance: number;
  maxContinuousAmps: number;
  notes: string;
} {
  const S = Math.max(1, seriesCount);
  const P = Math.max(1, parallelCount);
  const cellVoltage = 1.5;
  const cellCapacity = 2000; // mAh
  const cellResistance = 0.15; // Ohm

  // Effective positive cells minus reversed cells in series string
  const effectiveSeries = Math.max(0, S - 2 * reversedInSeries);
  const voltage = effectiveSeries * cellVoltage;
  const capacityMah = P * cellCapacity;
  const energyWh = (voltage * capacityMah) / 1000;
  // In series-parallel: R_total = (S * r_cell) / P
  const internalResistance = Number(((S * cellResistance) / P).toFixed(3));
  // Continuous discharge limit (~2C for good alkaline/NiMH AA)
  const maxContinuousAmps = Number((P * 2.0).toFixed(1));

  let notes = `แบตเตอรี่แบบ ${S}S ${P}P (${S * P} ก้อน): แรงดัน ${voltage.toFixed(1)}V, ความจุ ${capacityMah} mAh`;
  if (reversedInSeries > 0) {
    notes += ` [คำเตือน: พบถ่านสลับขั้ว ${reversedInSeries} ก้อน! ทำให้แรงดันลดลงและเกิดความร้อนสะสม]`;
  }

  return {
    voltage,
    capacityMah,
    energyWh,
    internalResistance,
    maxContinuousAmps,
    notes,
  };
}

export interface BasicCircuitValidation {
  isSuccess: boolean;
  isClosedCircuit: boolean;
  isShortCircuit: boolean;
  isSwitchClosed: boolean;
  isSwitchInCircuit: boolean;
  isLampInCircuit: boolean;
  isBatteryConnected: boolean;
  isLampLit: boolean;
  voltage: number;
  currentAmps: number;
  resistance: number;
  powerWatts: number;
  statusMessage: string;
  scientificExplanation: string;
  hint: string;
  alertType: 'normal' | 'warning' | 'danger' | 'success';
}

/**
 * Validates the connection graph specifically for the Basic Circuit Lab:
 * Requirements:
 * 1. An AA 1.5V cell (pos & neg terminals)
 * 2. A switch (IN & OUT terminals)
 * 3. A 1.5V lamp (A & B terminals)
 * 4. Must form a closed series loop: Battery -> Switch -> Lamp -> Battery (in any sequence)
 * 5. Detects short circuits (direct connection between pos and neg without lamp load)
 * 6. Lamp only lights if loop is closed, switch is closed, and no short circuit.
 */
export function validateBasicCircuit(
  components: CircuitComponent[],
  wires: CircuitWire[]
): BasicCircuitValidation {
  const cell = components.find((c) => c.type === 'battery_cell');
  const sw = components.find((c) => c.type === 'switch');
  const bulb = components.find((c) => c.type === 'light_bulb');

  if (!cell || !bulb || !sw) {
    return {
      isSuccess: false,
      isClosedCircuit: false,
      isShortCircuit: false,
      isSwitchClosed: false,
      isSwitchInCircuit: false,
      isLampInCircuit: false,
      isBatteryConnected: false,
      isLampLit: false,
      voltage: 0,
      currentAmps: 0,
      resistance: Infinity,
      powerWatts: 0,
      statusMessage: 'อุปกรณ์บนโต๊ะทดลองยังไม่ครบ: กรุณาวางถ่าน AA, สวิตช์ และหลอดไฟลงบนบอร์ด',
      scientificExplanation: 'วงจรไฟฟ้าพื้นฐานต้องประกอบด้วย 3 ส่วนหลัก: แหล่งกำเนิด (ถ่านไฟฉาย), ตัวควบคุม (สวิตช์), และโหลดที่ใช้พลังงาน (หลอดไฟ)',
      hint: 'ลากอุปกรณ์ทั้ง 3 ชิ้นจากถาดด้านล่างมาวางลงบนโต๊ะทดลองให้ครบ',
      alertType: 'normal',
    };
  }

  const isSwitchClosed = sw.properties?.isClosed ?? false;
  const isBatteryReversed = cell.properties?.isReversed ?? false;
  const cellVoltage = isBatteryReversed ? -1.5 : 1.5;

  const posId = cell.terminals.find((t) => t.polarity === 'positive')?.id || 'cell_1_pos';
  const negId = cell.terminals.find((t) => t.polarity === 'negative')?.id || 'cell_1_neg';
  const swInId = sw.terminals.find((t) => t.label === 'IN' || t.id.includes('in'))?.id || 'sw_1_in';
  const swOutId = sw.terminals.find((t) => t.label === 'OUT' || t.id.includes('out'))?.id || 'sw_1_out';
  const bulbAId = bulb.terminals[0]?.id || 'bulb_1_a';
  const bulbBId = bulb.terminals[1]?.id || 'bulb_1_b';

  // Build adjacency graph for wires
  const wireAdj = new Map<string, string[]>();
  const addEdge = (u: string, v: string) => {
    if (!wireAdj.has(u)) wireAdj.set(u, []);
    if (!wireAdj.has(v)) wireAdj.set(v, []);
    wireAdj.get(u)!.push(v);
    wireAdj.get(v)!.push(u);
  };

  wires.forEach((w) => addEdge(w.fromTerminalId, w.toTerminalId));

  // Helper: find connected component or path
  const findPath = (
    start: string,
    target: string,
    allowedTransitions: (curr: string) => string[]
  ): string[] | null => {
    const queue: string[][] = [[start]];
    const visited = new Set<string>([start]);

    while (queue.length > 0) {
      const path = queue.shift()!;
      const curr = path[path.length - 1];
      if (curr === target) return path;

      const neighbors = allowedTransitions(curr);
      for (const n of neighbors) {
        if (!visited.has(n)) {
          visited.add(n);
          queue.push([...path, n]);
        }
      }
    }
    return null;
  };

  // Short circuit check: Can we reach neg from pos using ONLY wires and closed switches (NO bulb)?
  const shortCircuitTransitions = (curr: string): string[] => {
    const nexts = [...(wireAdj.get(curr) || [])];
    if (isSwitchClosed) {
      if (curr === swInId) nexts.push(swOutId);
      if (curr === swOutId) nexts.push(swInId);
    }
    return nexts;
  };

  const shortPath = findPath(posId, negId, shortCircuitTransitions);
  if (shortPath) {
    return {
      isSuccess: false,
      isClosedCircuit: true,
      isShortCircuit: true,
      isSwitchClosed,
      isSwitchInCircuit: shortPath.includes(swInId) || shortPath.includes(swOutId),
      isLampInCircuit: false,
      isBatteryConnected: true,
      isLampLit: false,
      voltage: 0,
      currentAmps: 15.0,
      resistance: 0.05,
      powerWatts: 0,
      statusMessage: 'อันตราย! ตรวจพบไฟฟ้าลัดวงจร (Short Circuit) ขั้วบวกต่อตรงกับขั้วลบโดยไม่ผ่านโหลด แบตเตอรี่ร้อนจัด! ระบบตัดไฟฉุกเฉิน!',
      scientificExplanation: 'ไฟฟ้าลัดวงจรเกิดขึ้นเมื่อความต้านทานในวงจรใกล้ศูนย์ (R ≈ 0) ทำให้กระแสไฟฟ้าพุ่งสูงเกินขีดจำกัด เกิดความร้อนสูงจนเซลล์เสียหายหรือระเบิดได้',
      hint: 'นำสายไฟที่ต่อตรงระหว่างขั้วบวกและลบออก แล้วต่อผ่านหลอดไฟเพื่อสร้างโหลดต้านทาน',
      alertType: 'danger',
    };
  }

  // Check full series loop transitions: wires + switch (if closed) + bulb filament
  const fullLoopTransitions = (curr: string): string[] => {
    const nexts = [...(wireAdj.get(curr) || [])];
    if (isSwitchClosed) {
      if (curr === swInId) nexts.push(swOutId);
      if (curr === swOutId) nexts.push(swInId);
    }
    // Bulb filament conducts both ways
    if (curr === bulbAId) nexts.push(bulbBId);
    if (curr === bulbBId) nexts.push(bulbAId);
    return nexts;
  };

  const fullPath = findPath(posId, negId, fullLoopTransitions);

  // Check whether bulb and switch are reached regardless of switch open/closed
  const openSwitchTransitions = (curr: string): string[] => {
    const nexts = [...(wireAdj.get(curr) || [])];
    // Allow switch through for structural topology check
    if (curr === swInId) nexts.push(swOutId);
    if (curr === swOutId) nexts.push(swInId);
    if (curr === bulbAId) nexts.push(bulbBId);
    if (curr === bulbBId) nexts.push(bulbAId);
    return nexts;
  };

  const structuralPath = findPath(posId, negId, openSwitchTransitions);

  const isSwitchInCircuit =
    structuralPath ? (structuralPath.includes(swInId) || structuralPath.includes(swOutId)) : false;
  const isLampInCircuit =
    structuralPath ? (structuralPath.includes(bulbAId) || structuralPath.includes(bulbBId)) : false;

  // Case 1: Structurally connected through both switch and lamp, but switch is open
  if (structuralPath && isSwitchInCircuit && isLampInCircuit && !isSwitchClosed) {
    return {
      isSuccess: false,
      isClosedCircuit: false,
      isShortCircuit: false,
      isSwitchClosed: false,
      isSwitchInCircuit: true,
      isLampInCircuit: true,
      isBatteryConnected: true,
      isLampLit: false,
      voltage: 1.5,
      currentAmps: 0,
      resistance: Infinity,
      powerWatts: 0,
      statusMessage: 'วงจรเปิด (Open Circuit): สายไฟต่อครบแล้ว แต่สวิตช์ยังยกขึ้น (OFF) กระแสไฟฟ้าจึงยังไม่สามารถไหลผ่านได้',
      scientificExplanation: 'สวิตช์ทำหน้าที่ตัด-ต่อวงจร เมื่อสวิตช์เปิดอยู่ ช่องว่างของอากาศมีความต้านทานสูงมาก (อนันต์) อิเล็กตรอนจึงไม่สามารถกระโดดข้ามไปได้',
      hint: 'แตะที่ตัวสวิตช์เพื่อสับสวิตช์ลง (ON) แล้วสังเกตว่าหลอดไฟจะติดหรือไม่',
      alertType: 'warning',
    };
  }

  // Case 2: Complete valid circuit with switch closed!
  if (fullPath && isSwitchInCircuit && isLampInCircuit && isSwitchClosed) {
    const resistance = 3.0; // Bulb resistance
    const current = Number((1.5 / resistance).toFixed(2)); // 0.50 A
    const power = Number((1.5 * current).toFixed(2)); // 0.75 W

    return {
      isSuccess: true,
      isClosedCircuit: true,
      isShortCircuit: false,
      isSwitchClosed: true,
      isSwitchInCircuit: true,
      isLampInCircuit: true,
      isBatteryConnected: true,
      isLampLit: true,
      voltage: 1.5,
      currentAmps: current,
      resistance,
      powerWatts: power,
      statusMessage: 'สำเร็จ! วงจรปิดสมบูรณ์ (Closed Circuit): กระแสไฟฟ้า 0.50A ไหลครบวงจร หลอดไฟสว่างตามปกติ!',
      scientificExplanation: 'ตามกฎของโอห์ม (I = V / R) แรงดัน 1.5V จากถ่าน AA ผลักดันกระแสไฟฟ้า 0.5A ไหลผ่านสวิตช์ที่ปิด เข้าสู่ไส้หลอดไฟที่มีความต้านทาน 3Ω พลังงานไฟฟ้าเปลี่ยนเป็นความร้อนและแสงสว่างครบวงจร',
      hint: 'กดปุ่ม "ทดสอบวงจร" เพื่อยืนยันผลการทดลองและผ่านด่านสู่ LAB-02 ได้เลยครับ!',
      alertType: 'success',
    };
  }

  // Case 3: Lamp connected directly without switch
  if (fullPath && isLampInCircuit && !isSwitchInCircuit) {
    return {
      isSuccess: false,
      isClosedCircuit: true,
      isShortCircuit: false,
      isSwitchClosed,
      isSwitchInCircuit: false,
      isLampInCircuit: true,
      isBatteryConnected: true,
      isLampLit: true,
      voltage: 1.5,
      currentAmps: 0.5,
      resistance: 3.0,
      powerWatts: 0.75,
      statusMessage: 'หลอดไฟติดแล้ว แต่ยังขาด "สวิตช์ควบคุม" ในสายวงจร กรุณาต่อสวิตช์แบบอนุกรมด้วยครับ',
      scientificExplanation: 'ในอุปกรณ์ไฟฟ้าจริง การมีสวิตช์ควบคุมเป็นสิ่งจำเป็นเพื่อตัดต่อกระแสและประหยัดพลังงานเมื่อไม่ใช้งาน',
      hint: 'ตัดสายไฟเส้นหนึ่ง แล้วนำสวิตช์มาต่อคั่นกลางระหว่างถ่านกับหลอดไฟ',
      alertType: 'warning',
    };
  }

  // Case 4: Incomplete wiring
  return {
    isSuccess: false,
    isClosedCircuit: false,
    isShortCircuit: false,
    isSwitchClosed,
    isSwitchInCircuit,
    isLampInCircuit,
    isBatteryConnected: wires.length > 0,
    isLampLit: false,
    voltage: wires.length > 0 ? 1.5 : 0,
    currentAmps: 0,
    resistance: Infinity,
    powerWatts: 0,
    statusMessage: 'วงจรยังไม่ครบวงจร: ลากสายไฟเชื่อมต่อระหว่างขั้วให้ครบเป็นวงรอบ (ถ่าน AA → สวิตช์ → หลอดไฟ → ถ่าน AA)',
    scientificExplanation: 'กระแสไฟฟ้าจะไหลได้ก็ต่อเมื่อมีเส้นทางเชื่อมโยงต่อเนื่องจากขั้วบวกกลับมายังขั้วลบของแหล่งกำเนิดโดยไม่ขาดตอน',
    hint: 'แตะที่ขั้วต่อ (+) ของถ่าน แล้วลากไปแตะขั้ว IN ของสวิตช์ จากนั้นต่อขั้ว OUT ไปหลอดไฟ และต่อขั้วอีกข้างของหลอดไฟกลับมาที่ขั้ว (-) ของถ่าน',
    alertType: 'normal',
  };
}

/**
 * General circuit analysis across any lab
 */
export function analyzeCircuit(
  components: CircuitComponent[],
  wires: CircuitWire[]
): CircuitAnalysisResult {
  if (components.length === 0 || wires.length === 0) {
    return {
      isClosedCircuit: false,
      isShortCircuit: false,
      hasReversedCells: false,
      totalVoltage: 0,
      totalCapacityMah: 0,
      effectiveResistance: Infinity,
      currentAmps: 0,
      powerWatts: 0,
      motorRpm: 0,
      bulbBrightness: 0,
      isSafe: true,
      statusMessage: 'วงจรยังไม่สมบูรณ์: กรุณาเชื่อมต่อสายไฟระหว่างขั้วอุปกรณ์',
      alertType: 'normal',
    };
  }

  const validation = validateBasicCircuit(components, wires);
  if (components.some((c) => c.type === 'light_bulb') && components.some((c) => c.type === 'switch')) {
    return {
      isClosedCircuit: validation.isClosedCircuit,
      isShortCircuit: validation.isShortCircuit,
      hasReversedCells: false,
      totalVoltage: validation.voltage,
      totalCapacityMah: 2000,
      effectiveResistance: validation.resistance,
      currentAmps: validation.currentAmps,
      powerWatts: validation.powerWatts,
      motorRpm: 0,
      bulbBrightness: validation.isLampLit ? 1.0 : 0,
      isSafe: !validation.isShortCircuit,
      statusMessage: validation.statusMessage,
      alertType: validation.alertType,
    };
  }

  // Fallback for Series Lab / Motor Test
  const powerSources = components.filter(
    (c) => c.type === 'battery_cell' || c.type === 'battery_pack'
  );
  const switches = components.filter((c) => c.type === 'switch');
  const loads = components.filter(
    (c) => c.type === 'light_bulb' || c.type === 'dc_motor' || c.type === 'resistor'
  );

  let anyOpenSwitch = false;
  for (const sw of switches) {
    if (sw.properties.isClosed === false) anyOpenSwitch = true;
  }

  let grossVoltage = 0;
  let grossCapacity = 0;
  let hasReversed = false;

  powerSources.forEach((src) => {
    const isRev = src.properties.isReversed || false;
    if (isRev) hasReversed = true;
    const v = src.properties.voltage || 1.5;
    grossVoltage += isRev ? -v : v;
    grossCapacity += src.properties.capacityMah || 2000;
  });

  grossVoltage = Math.max(0, grossVoltage);

  if (anyOpenSwitch) {
    return {
      isClosedCircuit: false,
      isShortCircuit: false,
      hasReversedCells: hasReversed,
      totalVoltage: grossVoltage,
      totalCapacityMah: grossCapacity,
      effectiveResistance: Infinity,
      currentAmps: 0,
      powerWatts: 0,
      motorRpm: 0,
      bulbBrightness: 0,
      isSafe: true,
      statusMessage: 'วงจรเปิด (Open Circuit): สวิตช์ยังไม่ถูกสับลง กระแสไฟฟ้าจึงยังไม่ไหล',
      alertType: 'normal',
    };
  }

  let loadResistance = 0;
  loads.forEach((ld) => {
    if (ld.type === 'light_bulb') loadResistance += ld.properties.resistance || 3.0;
    else if (ld.type === 'dc_motor') loadResistance += ld.properties.resistance || 2.0;
    else if (ld.type === 'resistor') loadResistance += ld.properties.resistance || 10.0;
  });

  if (loadResistance === 0) loadResistance = 2.5;

  const internalR = powerSources.length * 0.15;
  const effectiveResistance = Number((loadResistance + internalR).toFixed(2));
  const currentAmps = Number((grossVoltage / effectiveResistance).toFixed(2));
  const powerWatts = Number((grossVoltage * currentAmps).toFixed(2));

  let bulbBrightness = 0;
  let motorRpm = 0;
  let isSafe = true;
  let statusMessage = 'วงจรทำงานปกติ: กระแสไฟฟ้าไหลครบวงจรตามกฎของโอห์ม (I = V / R)';
  let alertType: 'normal' | 'warning' | 'danger' | 'success' = 'success';

  const bulb = loads.find((l) => l.type === 'light_bulb');
  if (bulb) {
    if (grossVoltage <= 0.2) {
      bulbBrightness = 0;
      statusMessage = 'แรงดันไฟฟ้าต่ำเกินไป หลอดไฟไม่สว่าง';
      alertType = 'warning';
    } else if (grossVoltage <= 3.5) {
      bulbBrightness = Math.min(1, grossVoltage / 3.0);
      statusMessage = `หลอดไฟสว่างระดับ ${(bulbBrightness * 100).toFixed(0)}% (แรงดัน ${grossVoltage.toFixed(1)}V)`;
      alertType = 'success';
    } else if (grossVoltage <= 5.0) {
      bulbBrightness = 1.0;
      statusMessage = 'หลอดไฟสว่างจ้ามากเกินพิกัด ระวังไส้หลอดขาด!';
      alertType = 'warning';
    } else {
      bulbBrightness = 0;
      isSafe = false;
      statusMessage = 'ไส้หลอดไฟขาดแล้ว! (Burned Out) เนื่องจากแรงดันไฟฟ้าเกินค่าที่กำหนด';
      alertType = 'danger';
    }
  }

  const motor = loads.find((l) => l.type === 'dc_motor');
  if (motor) {
    const ratedV = motor.properties.ratedVoltage || 6.0;
    const kv = 500;
    motorRpm = Math.round(grossVoltage * kv);

    if (grossVoltage > ratedV * 1.6) {
      isSafe = false;
      statusMessage = `อันตราย! แรงดัน ${grossVoltage.toFixed(1)}V เกินขีดจำกัดมอเตอร์ (${ratedV}V) มอเตอร์ร้อนจัดเสี่ยงไหม้!`;
      alertType = 'danger';
    } else if (grossVoltage < 1.0) {
      motorRpm = 0;
      statusMessage = 'แรงดันไม่พอที่จะหมุนแกนมอเตอร์ (แรงบิดเริ่มต้นไม่เพียงพอ)';
      alertType = 'warning';
    } else {
      statusMessage = `มอเตอร์หมุนทำงานที่ความเร็วรอบ ${motorRpm.toLocaleString()} RPM กำลังไฟ ${powerWatts}W`;
      alertType = 'success';
    }
  }

  return {
    isClosedCircuit: true,
    isShortCircuit: false,
    hasReversedCells: hasReversed,
    totalVoltage: grossVoltage,
    totalCapacityMah: grossCapacity,
    effectiveResistance,
    currentAmps,
    powerWatts,
    motorRpm,
    bulbBrightness,
    isSafe,
    statusMessage,
    alertType,
  };
}

export interface SeriesCircuitValidation {
  isSuccess: boolean;
  isClosedCircuit: boolean;
  isShortCircuit: boolean;
  isSeriesConnected: boolean;
  isReversedCell: boolean;
  isSwitchClosed: boolean;
  isSwitchInCircuit: boolean;
  isLampInCircuit: boolean;
  isLampLit: boolean;
  bulbBrightness: number;
  cellsInCircuitCount: number;
  measuredVoltage: number;
  currentAmps: number;
  resistance: number;
  powerWatts: number;
  statusMessage: string;
  scientificExplanation: string;
  hint: string;
  alertType: 'normal' | 'warning' | 'danger' | 'success';
}

/**
 * Validates connection graph specifically for Scene 07: Series Circuit Lab.
 * Requirements:
 * 1. Two AA 1.5V cells (cell_1 and cell_2)
 * 2. Series head-to-tail bridge: (+) of one cell connected to (-) of the other cell
 * 3. A 3.0V rated lamp
 * 4. A switch in the series loop
 * 5. Voltmeter measuring 3.0V pack voltage
 * 6. Detects reversed cells (+ to + or - to -) causing voltage cancellation (0V)
 * 7. Detects short circuits and blocks simulation
 */
export function validateSeriesCircuit(
  components: CircuitComponent[],
  wires: CircuitWire[]
): SeriesCircuitValidation {
  const cell1 = components.find((c) => c.id === 'cell_1');
  const cell2 = components.find((c) => c.id === 'cell_2');
  const sw = components.find((c) => c.type === 'switch');
  const bulb = components.find((c) => c.type === 'light_bulb');

  if (!cell1 || !cell2 || !sw || !bulb) {
    return {
      isSuccess: false,
      isClosedCircuit: false,
      isShortCircuit: false,
      isSeriesConnected: false,
      isReversedCell: false,
      isSwitchClosed: false,
      isSwitchInCircuit: false,
      isLampInCircuit: false,
      isLampLit: false,
      bulbBrightness: 0,
      cellsInCircuitCount: 0,
      measuredVoltage: 0,
      currentAmps: 0,
      resistance: 6.0,
      powerWatts: 0,
      statusMessage: 'อุปกรณ์บนโต๊ะยังไม่ครบ: วางถ่าน AA ทั้ง 2 ก้อน, สวิตช์ และหลอดไฟ 3.0V',
      scientificExplanation: 'การทดลองวงจรอนุกรมต้องใช้เซลล์ไฟฟ้า 2 ก้อนต่อเรียงกันเพื่อสร้างแรงดัน 3.0V',
      hint: 'นำถ่าน AA ก้อนที่ 1 และก้อนที่ 2, สวิตช์ และหลอดไฟมาวางบนโต๊ะทดลองให้ครบ',
      alertType: 'normal',
    };
  }

  const isSwitchClosed = sw.properties?.isClosed ?? false;
  const isC1Rev = cell1.properties?.isReversed ?? false;
  const isC2Rev = cell2.properties?.isReversed ?? false;

  const c1Pos = isC1Rev ? 'cell_1_neg' : 'cell_1_pos';
  const c1Neg = isC1Rev ? 'cell_1_pos' : 'cell_1_neg';
  const c2Pos = isC2Rev ? 'cell_2_neg' : 'cell_2_pos';
  const c2Neg = isC2Rev ? 'cell_2_pos' : 'cell_2_neg';

  const swInId = 'sw_1_in';
  const swOutId = 'sw_1_out';
  const bulbAId = 'bulb_1_a';
  const bulbBId = 'bulb_1_b';

  // Build adjacency
  const wireAdj = new Map<string, string[]>();
  const addEdge = (u: string, v: string) => {
    if (!wireAdj.has(u)) wireAdj.set(u, []);
    if (!wireAdj.has(v)) wireAdj.set(v, []);
    wireAdj.get(u)!.push(v);
    wireAdj.get(v)!.push(u);
  };
  wires.forEach((w) => addEdge(w.fromTerminalId, w.toTerminalId));

  const findPath = (
    start: string,
    target: string,
    allowedTransitions: (curr: string) => string[]
  ): string[] | null => {
    const queue: string[][] = [[start]];
    const visited = new Set<string>([start]);
    while (queue.length > 0) {
      const path = queue.shift()!;
      const curr = path[path.length - 1];
      if (curr === target) return path;
      for (const n of allowedTransitions(curr)) {
        if (!visited.has(n)) {
          visited.add(n);
          queue.push([...path, n]);
        }
      }
    }
    return null;
  };

  // 1. Short Circuit Check across cell 1, cell 2, or both (without bulb)
  const shortTransitions = (curr: string): string[] => {
    const nexts = [...(wireAdj.get(curr) || [])];
    if (isSwitchClosed) {
      if (curr === swInId) nexts.push(swOutId);
      if (curr === swOutId) nexts.push(swInId);
    }
    return nexts;
  };

  const isShortC1 = findPath(c1Pos, c1Neg, shortTransitions);
  const isShortC2 = findPath(c2Pos, c2Neg, shortTransitions);
  if (isShortC1 || isShortC2) {
    return {
      isSuccess: false,
      isClosedCircuit: true,
      isShortCircuit: true,
      isSeriesConnected: false,
      isReversedCell: false,
      isSwitchClosed,
      isSwitchInCircuit: false,
      isLampInCircuit: false,
      isLampLit: false,
      bulbBrightness: 0,
      cellsInCircuitCount: 2,
      measuredVoltage: 0,
      currentAmps: 20.0,
      resistance: 0.05,
      powerWatts: 0,
      statusMessage: 'อันตราย! เกิดไฟฟ้าลัดวงจร (Short Circuit) มีสายไฟต่อตรงระหว่างขั้วบวกและลบโดยไม่ผ่านหลอดไฟ แบตเตอรี่ร้อนจัด!',
      scientificExplanation: 'เมื่อขั้วบวกต่อตรงกับขั้วลบโดยไม่มีความต้านทานของหลอดไฟ กระแสไฟฟ้าจะพุ่งสูงเกินขีดจำกัด เกิดอันตรายต่อเซลล์แบตเตอรี่',
      hint: 'ตัดสายไฟที่ต่อตรงระหว่างขั้วถ่านออก แล้วต่อผ่านหลอดไฟเพื่อสร้างโหลดต้านทาน',
      alertType: 'danger',
    };
  }

  // 2. Check bridge connection between Cell 1 and Cell 2
  // Proper series aiding: c1Pos connects to c2Neg, OR c1Neg connects to c2Pos
  const bridgeAiding1 = findPath(c1Pos, c2Neg, (c) => wireAdj.get(c) || []);
  const bridgeAiding2 = findPath(c1Neg, c2Pos, (c) => wireAdj.get(c) || []);
  const isSeriesAiding = Boolean(bridgeAiding1 || bridgeAiding2);

  // Reversed/Opposing connection: c1Pos connects to c2Pos, OR c1Neg connects to c2Neg
  const bridgeOpposing1 = findPath(c1Pos, c2Pos, (c) => wireAdj.get(c) || []);
  const bridgeOpposing2 = findPath(c1Neg, c2Neg, (c) => wireAdj.get(c) || []);
  const isOpposing = Boolean(bridgeOpposing1 || bridgeOpposing2);

  // Determine outer terminals of the 2-cell combo
  let packOuterPos = '';
  let packOuterNeg = '';
  if (bridgeAiding1) {
    packOuterPos = c2Pos;
    packOuterNeg = c1Neg;
  } else if (bridgeAiding2) {
    packOuterPos = c1Pos;
    packOuterNeg = c2Neg;
  }

  // 3. Check loop through switch and bulb
  const loopTransitions = (curr: string): string[] => {
    const nexts = [...(wireAdj.get(curr) || [])];
    if (isSwitchClosed) {
      if (curr === swInId) nexts.push(swOutId);
      if (curr === swOutId) nexts.push(swInId);
    }
    if (curr === bulbAId) nexts.push(bulbBId);
    if (curr === bulbBId) nexts.push(bulbAId);
    return nexts;
  };

  const openSwitchTransitions = (curr: string): string[] => {
    const nexts = [...(wireAdj.get(curr) || [])];
    if (curr === swInId) nexts.push(swOutId);
    if (curr === swOutId) nexts.push(swInId);
    if (curr === bulbAId) nexts.push(bulbBId);
    if (curr === bulbBId) nexts.push(bulbAId);
    return nexts;
  };

  // Case A: Opposing polarity (+ to + or - to -)
  if (isOpposing) {
    return {
      isSuccess: false,
      isClosedCircuit: false,
      isShortCircuit: false,
      isSeriesConnected: false,
      isReversedCell: true,
      isSwitchClosed,
      isSwitchInCircuit: false,
      isLampInCircuit: false,
      isLampLit: false,
      bulbBrightness: 0,
      cellsInCircuitCount: 2,
      measuredVoltage: 0.0,
      currentAmps: 0,
      resistance: 6.0,
      powerWatts: 0,
      statusMessage: 'ระวัง! ต่อถ่านกลับขั้วกัน (ขั้วเหมือนกันชนกัน + ชน + หรือ - ชน -) ทำให้แรงดันไฟฟ้าหักล้างกันเหลือ 0.0V หลอดไฟจึงไม่ติด!',
      scientificExplanation: 'เมื่อขั้วบวกต่อกับขั้วบวก แรงดันไฟฟ้าของเซลล์ทั้งสองจะผลักกระแสในทิศทางตรงกันข้าม ทำให้แรงดันสุทธิเป็นศูนย์ (V_total = 1.5V - 1.5V = 0V)',
      hint: 'สลับขั้วถ่าน หรือต่อสายไฟใหม่โดยให้ขั้วบวก (+) ของก้อนแรกต่อกับขั้วลบ (-) ของก้อนที่สอง (แบบหัวต่อท้าย)',
      alertType: 'warning',
    };
  }

  // Case B: Proper series connection (3.0V pack)
  if (isSeriesAiding && packOuterPos && packOuterNeg) {
    // Check short circuit across outer terminals
    const outerShort = findPath(packOuterPos, packOuterNeg, shortTransitions);
    if (outerShort) {
      return {
        isSuccess: false,
        isClosedCircuit: true,
        isShortCircuit: true,
        isSeriesConnected: true,
        isReversedCell: false,
        isSwitchClosed,
        isSwitchInCircuit: false,
        isLampInCircuit: false,
        isLampLit: false,
        bulbBrightness: 0,
        cellsInCircuitCount: 2,
        measuredVoltage: 0,
        currentAmps: 20.0,
        resistance: 0.05,
        powerWatts: 0,
        statusMessage: 'อันตราย! เกิดไฟฟ้าลัดวงจรข้ามชุดถ่านอนุกรม (3.0V Short Circuit) แบตเตอรี่ร้อนจัด!',
        scientificExplanation: 'ไฟฟ้าลัดวงจรข้ามชุดอนุกรมจะทำให้เกิดความร้อนสูงมากเนื่องจากแรงดัน 3.0V ขับกระแสผ่านสายไฟที่มีความต้านทานต่ำมาก',
        hint: 'นำสายไฟที่ต่อลัดวงจรออก แล้วต่อผ่านสวิตช์และหลอดไฟ',
        alertType: 'danger',
      };
    }

    const structuralPath = findPath(packOuterPos, packOuterNeg, openSwitchTransitions);
    const fullActivePath = findPath(packOuterPos, packOuterNeg, loopTransitions);

    const hasSwitch = structuralPath
      ? structuralPath.includes(swInId) || structuralPath.includes(swOutId)
      : false;
    const hasBulb = structuralPath
      ? structuralPath.includes(bulbAId) || structuralPath.includes(bulbBId)
      : false;

    if (structuralPath && hasBulb) {
      if (!isSwitchClosed && hasSwitch) {
        return {
          isSuccess: false,
          isClosedCircuit: false,
          isShortCircuit: false,
          isSeriesConnected: true,
          isReversedCell: false,
          isSwitchClosed: false,
          isSwitchInCircuit: true,
          isLampInCircuit: true,
          isLampLit: false,
          bulbBrightness: 0,
          cellsInCircuitCount: 2,
          measuredVoltage: 3.0,
          currentAmps: 0,
          resistance: Infinity,
          powerWatts: 0,
          statusMessage: 'วงจรเปิด (Open Circuit): ต่ออนุกรม 3.0V ครบแล้ว แต่วิตช์ยังยกขึ้น (OFF) กรุณาสับสวิตช์ลงเพื่อเริ่มจ่ายไฟ',
          scientificExplanation: 'สวิตช์เปิดอยู่ทำให้วงจรขาด กระแสไฟฟ้าจึงยังไม่สามารถไหลผ่านหลอดไฟได้ แม้ว่าแรงดันสะสมจะพร้อมจ่าย 3.0V ก็ตาม',
          hint: 'แตะที่สวิตช์เพื่อสับสวิตช์ลง (ON)',
          alertType: 'warning',
        };
      }

      if (fullActivePath && hasSwitch) {
        // Full series circuit complete!
        const resistance = 6.0; // 3V lamp resistance
        const current = Number((3.0 / resistance).toFixed(2)); // 0.50 A
        const power = Number((3.0 * current).toFixed(2)); // 1.50 W

        return {
          isSuccess: true,
          isClosedCircuit: true,
          isShortCircuit: false,
          isSeriesConnected: true,
          isReversedCell: false,
          isSwitchClosed: true,
          isSwitchInCircuit: true,
          isLampInCircuit: true,
          isLampLit: true,
          bulbBrightness: 1.0,
          cellsInCircuitCount: 2,
          measuredVoltage: 3.0,
          currentAmps: current,
          resistance,
          powerWatts: power,
          statusMessage: 'สำเร็จ! วงจรอนุกรมสมบูรณ์แบบ: แรงดันไฟฟ้ารวมเพิ่มเป็น 3.0V (1.5V + 1.5V) หลอดไฟสว่างเต็มพิกัด 100%!',
          scientificExplanation: 'การต่อเซลล์แบบอนุกรม (+ ชน -) นำแรงดันของแต่ละเซลล์มารวมกันตามสูตร V_total = V1 + V2 = 1.5V + 1.5V = 3.0V ทำให้หลอดไฟ 3.0V ได้รับกำลังไฟฟ้าเต็มที่ 1.50W!',
          hint: 'กดปุ่ม "ทดสอบวงจร" เพื่อยืนยันผลการทดลองและปลดล็อกด่าน LAB-03: วงจรขนาน ได้เลยครับ!',
          alertType: 'success',
        };
      }
    }
  }

  // Case C: Single cell connected into the loop (other cell missing or isolated)
  const c1Loop = findPath(c1Pos, c1Neg, loopTransitions);
  const c2Loop = findPath(c2Pos, c2Neg, loopTransitions);
  if (c1Loop || c2Loop) {
    const singleV = 1.5;
    const current = Number((singleV / 6.0).toFixed(2)); // 0.25 A
    const power = Number((singleV * current).toFixed(2)); // 0.38 W

    return {
      isSuccess: false,
      isClosedCircuit: true,
      isShortCircuit: false,
      isSeriesConnected: false,
      isReversedCell: false,
      isSwitchClosed,
      isSwitchInCircuit: true,
      isLampInCircuit: true,
      isLampLit: isSwitchClosed,
      bulbBrightness: isSwitchClosed ? 0.4 : 0,
      cellsInCircuitCount: 1,
      measuredVoltage: 1.5,
      currentAmps: isSwitchClosed ? current : 0,
      resistance: 6.0,
      powerWatts: isSwitchClosed ? power : 0,
      statusMessage: 'หลอดไฟ 3.0V สว่างเพียงสลัวๆ (40%) เนื่องจากใช้ถ่านเพียงก้อนเดียว (1.5V) กรุณาต่อถ่านก้อนที่ 2 แบบอนุกรมเพื่อเพิ่มเป็น 3.0V!',
      scientificExplanation: 'เมื่อแรงดันจ่ายเพียง 1.5V ให้กับหลอดไฟขนาด 3.0V กระแสไฟฟ้าจะไหลเพียง 0.25A ทำให้กำลังไฟฟ้าลดลงเหลือเพียง 1/4 (0.38W) ของพิกัดปกติ',
      hint: 'ต่อขั้วบวกของถ่านก้อนที่ 1 เข้ากับขั้วลบของถ่านก้อนที่ 2 แล้วนำขั้วที่เหลือต่อเข้ากับสวิตช์และหลอดไฟ',
      alertType: 'warning',
    };
  }

  // Case D: Incomplete
  return {
    isSuccess: false,
    isClosedCircuit: false,
    isShortCircuit: false,
    isSeriesConnected: isSeriesAiding,
    isReversedCell: false,
    isSwitchClosed,
    isSwitchInCircuit: false,
    isLampInCircuit: false,
    isLampLit: false,
    bulbBrightness: 0,
    cellsInCircuitCount: isSeriesAiding ? 2 : 0,
    measuredVoltage: isSeriesAiding ? 3.0 : 0.0,
    currentAmps: 0,
    resistance: Infinity,
    powerWatts: 0,
    statusMessage: isSeriesAiding
      ? 'ต่อถ่านอนุกรมได้ 3.0V แล้ว! กรุณาต่อสายไฟจากขั้วที่เหลือเข้าสวิตช์และหลอดไฟ 3.0V ให้ครบวงจร'
      : 'กรุณาต่ออนุกรมถ่าน 2 ก้อน: ลากสายไฟเชื่อมระหว่างขั้วบวก (+) ของก้อนหนึ่ง ไปยังขั้วลบ (-) ของอีกก้อนหนึ่ง',
    scientificExplanation: 'หัวใจของการต่ออนุกรมคือการเชื่อมต่อแบบหัวต่อท้าย (+ ชน -) เพื่อให้แรงเคลื่อนไฟฟ้าส่งต่อเสริมกันอย่างต่อเนื่อง',
    hint: 'แตะที่ขั้วบวกของถ่านก้อนที่ 1 แล้วลากไปแตะขั้วลบของถ่านก้อนที่ 2 เพื่อสร้างสะพานเชื่อมอนุกรม',
    alertType: 'normal',
  };
}

export interface ParallelCircuitValidation {
  isSuccess: boolean;
  isClosedCircuit: boolean;
  isShortCircuit: boolean;
  isParallelConnected: boolean;
  isSeriesConnected: boolean;
  isSwitchClosed: boolean;
  isSwitchInCircuit: boolean;
  isLampInCircuit: boolean;
  isLampLit: boolean;
  bulbBrightness: number;
  cellsInCircuitCount: number;
  measuredVoltage: number;
  nominalCapacityMah: number;
  currentAmps: number;
  currentPerCellAmps: number;
  resistance: number;
  powerWatts: number;
  estimatedRuntimeHours: number;
  statusMessage: string;
  scientificExplanation: string;
  hint: string;
  alertType: 'normal' | 'warning' | 'danger' | 'success';
}

/**
 * Validates connection graph specifically for Scene 08: Parallel Circuit Lab.
 * Requirements:
 * 1. Two identical AA 1.5V cells (cell_1 and cell_2)
 * 2. Parallel battery connections: positive-to-positive and negative-to-negative
 * 3. 1.5V rated lamp (3.0 ohms)
 * 4. Switch and meter readouts
 * 5. Demonstrates nominal voltage 1.5V and estimated capacity 4000mAh (vs 2000mAh single cell)
 * 6. Detects series connection (+ to -) or incompatible configurations
 * 7. Blocks short circuits
 */
export function validateParallelCircuit(
  components: CircuitComponent[],
  wires: CircuitWire[]
): ParallelCircuitValidation {
  const cell1 = components.find((c) => c.id === 'cell_1');
  const cell2 = components.find((c) => c.id === 'cell_2');
  const sw = components.find((c) => c.type === 'switch');
  const bulb = components.find((c) => c.type === 'light_bulb');

  if (!cell1 || !cell2 || !sw || !bulb) {
    return {
      isSuccess: false,
      isClosedCircuit: false,
      isShortCircuit: false,
      isParallelConnected: false,
      isSeriesConnected: false,
      isSwitchClosed: false,
      isSwitchInCircuit: false,
      isLampInCircuit: false,
      isLampLit: false,
      bulbBrightness: 0,
      cellsInCircuitCount: 0,
      measuredVoltage: 0,
      nominalCapacityMah: 0,
      currentAmps: 0,
      currentPerCellAmps: 0,
      resistance: 3.0,
      powerWatts: 0,
      estimatedRuntimeHours: 0,
      statusMessage: 'อุปกรณ์บนโต๊ะยังไม่ครบ: กรุณาวางถ่าน AA 2 ก้อน, สวิตช์ และหลอดไฟ 1.5V',
      scientificExplanation: 'การทดลองวงจรขนานต้องใช้เซลล์ไฟฟ้า 2 ก้อนต่อขนานกันเพื่อเพิ่มความจุเป็น 4000mAh',
      hint: 'วางถ่าน AA ทั้งสองก้อน, สวิตช์ และหลอดไฟบนโต๊ะทดลองให้ครบ',
      alertType: 'normal',
    };
  }

  const isSwitchClosed = sw.properties?.isClosed ?? false;
  const isC1Rev = cell1.properties?.isReversed ?? false;
  const isC2Rev = cell2.properties?.isReversed ?? false;

  const c1Pos = isC1Rev ? 'cell_1_neg' : 'cell_1_pos';
  const c1Neg = isC1Rev ? 'cell_1_pos' : 'cell_1_neg';
  const c2Pos = isC2Rev ? 'cell_2_neg' : 'cell_2_pos';
  const c2Neg = isC2Rev ? 'cell_2_pos' : 'cell_2_neg';

  const swInId = 'sw_1_in';
  const swOutId = 'sw_1_out';
  const bulbAId = 'bulb_1_a';
  const bulbBId = 'bulb_1_b';

  // Build adjacency
  const wireAdj = new Map<string, string[]>();
  const addEdge = (u: string, v: string) => {
    if (!wireAdj.has(u)) wireAdj.set(u, []);
    if (!wireAdj.has(v)) wireAdj.set(v, []);
    wireAdj.get(u)!.push(v);
    wireAdj.get(v)!.push(u);
  };
  wires.forEach((w) => addEdge(w.fromTerminalId, w.toTerminalId));

  const findPath = (
    start: string,
    target: string,
    allowedTransitions: (curr: string) => string[]
  ): string[] | null => {
    const queue: string[][] = [[start]];
    const visited = new Set<string>([start]);
    while (queue.length > 0) {
      const path = queue.shift()!;
      const curr = path[path.length - 1];
      if (curr === target) return path;
      for (const n of allowedTransitions(curr)) {
        if (!visited.has(n)) {
          visited.add(n);
          queue.push([...path, n]);
        }
      }
    }
    return null;
  };

  // 1. Short Circuit Check across cell 1, cell 2, or between positive and negative nodes without bulb
  const shortTransitions = (curr: string): string[] => {
    const nexts = [...(wireAdj.get(curr) || [])];
    if (isSwitchClosed) {
      if (curr === swInId) nexts.push(swOutId);
      if (curr === swOutId) nexts.push(swInId);
    }
    return nexts;
  };

  const isShortC1 = findPath(c1Pos, c1Neg, shortTransitions);
  const isShortC2 = findPath(c2Pos, c2Neg, shortTransitions);
  if (isShortC1 || isShortC2) {
    return {
      isSuccess: false,
      isClosedCircuit: true,
      isShortCircuit: true,
      isParallelConnected: false,
      isSeriesConnected: false,
      isSwitchClosed,
      isSwitchInCircuit: false,
      isLampInCircuit: false,
      isLampLit: false,
      bulbBrightness: 0,
      cellsInCircuitCount: 2,
      measuredVoltage: 0,
      nominalCapacityMah: 0,
      currentAmps: 25.0,
      currentPerCellAmps: 12.5,
      resistance: 0.05,
      powerWatts: 0,
      estimatedRuntimeHours: 0,
      statusMessage: 'อันตราย! เกิดไฟฟ้าลัดวงจร (Short Circuit) มีสายไฟต่อตรงระหว่างขั้วบวกและขั้วลบโดยไม่ผ่านหลอดไฟ แบตเตอรี่ร้อนจัด!',
      scientificExplanation: 'ไฟฟ้าลัดวงจรในชุดขนานจะทำให้เกิดกระแสไหลวนมหาศาล แบตเตอรี่จะร้อนจัดและบวมเสียหายอย่างรวดเร็ว',
      hint: 'ตัดสายไฟที่ต่อตรงระหว่างขั้วบวกและลบออก แล้วต่อผ่านหลอดไฟเพื่อสร้างโหลดต้านทาน',
      alertType: 'danger',
    };
  }

  // 2. Parallel Connection Verification
  // Positive-to-Positive: c1Pos connected to c2Pos
  // Negative-to-Negative: c1Neg connected to c2Neg
  const posToPos = findPath(c1Pos, c2Pos, (c) => wireAdj.get(c) || []);
  const negToNeg = findPath(c1Neg, c2Neg, (c) => wireAdj.get(c) || []);
  const isParallel = Boolean(posToPos && negToNeg);

  // Incompatible series check: c1Pos connects to c2Neg or c1Neg connects to c2Pos
  const seriesBridge1 = findPath(c1Pos, c2Neg, (c) => wireAdj.get(c) || []);
  const seriesBridge2 = findPath(c1Neg, c2Pos, (c) => wireAdj.get(c) || []);
  const isSeries = Boolean((seriesBridge1 || seriesBridge2) && !isParallel);

  if (isSeries) {
    return {
      isSuccess: false,
      isClosedCircuit: false,
      isShortCircuit: false,
      isParallelConnected: false,
      isSeriesConnected: true,
      isSwitchClosed,
      isSwitchInCircuit: false,
      isLampInCircuit: false,
      isLampLit: false,
      bulbBrightness: 0,
      cellsInCircuitCount: 2,
      measuredVoltage: 3.0,
      nominalCapacityMah: 2000,
      currentAmps: 0,
      currentPerCellAmps: 0,
      resistance: 3.0,
      powerWatts: 0,
      estimatedRuntimeHours: 0,
      statusMessage: 'ตรวจพบการต่อแบบอนุกรม (+ ชน -)! ซึ่งทำให้แรงดันเพิ่มเป็น 3.0V และอาจทำให้หลอดไฟ 1.5V ขาดได้ ด่านนี้ต้องการการต่อแบบขนาน (+ ชน +, - ชน -) ครับ',
      scientificExplanation: 'การต่ออนุกรมเพิ่มแรงดัน แต่ด่านนี้ต้องการเพิ่มความจุ (mAh) ให้ใช้งานได้นานขึ้น จึงต้องต่อแบบขนานโดยขั้วบวกต่อกับขั้วบวก และขั้วลบต่อกับขั้วลบ',
      hint: 'ย้ายสายไฟให้เชื่อมระหว่างขั้วบวกกับขั้วบวก (+ ชน +) และขั้วลบกับขั้วลบ (- ชน -)',
      alertType: 'warning',
    };
  }

  // 3. Loop Transitions
  const loopTransitions = (curr: string): string[] => {
    const nexts = [...(wireAdj.get(curr) || [])];
    if (isSwitchClosed) {
      if (curr === swInId) nexts.push(swOutId);
      if (curr === swOutId) nexts.push(swInId);
    }
    if (curr === bulbAId) nexts.push(bulbBId);
    if (curr === bulbBId) nexts.push(bulbAId);
    return nexts;
  };

  const openSwitchTransitions = (curr: string): string[] => {
    const nexts = [...(wireAdj.get(curr) || [])];
    if (curr === swInId) nexts.push(swOutId);
    if (curr === swOutId) nexts.push(swInId);
    if (curr === bulbAId) nexts.push(bulbBId);
    if (curr === bulbBId) nexts.push(bulbAId);
    return nexts;
  };

  // Case A: Proper Parallel Pack (4000 mAh, 1.5V)
  if (isParallel) {
    // Check if loop forms between parallel positive bus and parallel negative bus through switch and bulb
    const structuralPath = findPath(c1Pos, c1Neg, openSwitchTransitions);
    const fullActivePath = findPath(c1Pos, c1Neg, loopTransitions);

    const hasSwitch = structuralPath
      ? structuralPath.includes(swInId) || structuralPath.includes(swOutId)
      : false;
    const hasBulb = structuralPath
      ? structuralPath.includes(bulbAId) || structuralPath.includes(bulbBId)
      : false;

    const voltage = 1.5;
    const resistance = 3.0;
    const totalCurrent = Number((voltage / resistance).toFixed(2)); // 0.50 A
    const currentPerCell = Number((totalCurrent / 2).toFixed(2)); // 0.25 A each
    const power = Number((voltage * totalCurrent).toFixed(2)); // 0.75 W
    const capacity = 4000;
    const runtime = Number((capacity / (totalCurrent * 1000)).toFixed(1)); // 8.0 hours

    if (structuralPath && hasBulb) {
      if (!isSwitchClosed && hasSwitch) {
        return {
          isSuccess: false,
          isClosedCircuit: false,
          isShortCircuit: false,
          isParallelConnected: true,
          isSeriesConnected: false,
          isSwitchClosed: false,
          isSwitchInCircuit: true,
          isLampInCircuit: true,
          isLampLit: false,
          bulbBrightness: 0,
          cellsInCircuitCount: 2,
          measuredVoltage: 1.5,
          nominalCapacityMah: 4000,
          currentAmps: 0,
          currentPerCellAmps: 0,
          resistance: 3.0,
          powerWatts: 0,
          estimatedRuntimeHours: runtime,
          statusMessage: 'วงจรเปิด (Open Circuit): ต่อขนาน 4000mAh สำเร็จแล้ว แต่สวิตช์ยังยกขึ้น (OFF) กรุณาสับสวิตช์ลงเพื่อเริ่มทดสอบ',
          scientificExplanation: 'เมื่อต่อขนาน แรงดันไฟฟ้าจะเท่ากับ 1.5V เท่าเดิม แต่ความจุเพิ่มเป็น 2 เท่า (4000mAh) เมื่อเปิดสวิตช์ เซลล์ทั้งสองจะช่วยกันจ่ายกระแสคนละครึ่ง',
          hint: 'แตะที่สวิตช์เพื่อสับสวิตช์ลง (ON)',
          alertType: 'warning',
        };
      }

      if (fullActivePath && hasSwitch) {
        return {
          isSuccess: true,
          isClosedCircuit: true,
          isShortCircuit: false,
          isParallelConnected: true,
          isSeriesConnected: false,
          isSwitchClosed: true,
          isSwitchInCircuit: true,
          isLampInCircuit: true,
          isLampLit: true,
          bulbBrightness: 1.0,
          cellsInCircuitCount: 2,
          measuredVoltage: 1.5,
          nominalCapacityMah: 4000,
          currentAmps: totalCurrent,
          currentPerCellAmps: currentPerCell,
          resistance: 3.0,
          powerWatts: power,
          estimatedRuntimeHours: runtime,
          statusMessage: 'สำเร็จ! วงจรขนานสมบูรณ์แบบ: แรงดันคงที่ 1.5V ความจุรวมเพิ่มเป็น 4000mAh หลอดไฟติดสว่างปกติและใช้งานได้นานขึ้น 2 เท่า (8 ชั่วโมง)!',
          scientificExplanation: 'การต่อเซลล์แบบขนาน (+ ชน +, - ชน -) ไม่เพิ่มแรงดัน (คงที่ 1.5V) แต่เพิ่มความจุรวมเป็น C_total = C1 + C2 = 2000 + 2000 = 4000mAh ทำให้เซลล์แต่ละก้อนจ่ายกระแสเพียง 0.25A หลอดไฟจึงเปิดได้นานขึ้นเป็นสองเท่าโดยไม่เกิดความร้อนสะสม',
          hint: 'กดปุ่ม "ทดสอบวงจรขนาน" เพื่อยืนยันผลการทดลองและปลดล็อกด่าน LAB-04: วงจรผสม ได้เลยครับ!',
          alertType: 'success',
        };
      }
    }

    return {
      isSuccess: false,
      isClosedCircuit: false,
      isShortCircuit: false,
      isParallelConnected: true,
      isSeriesConnected: false,
      isSwitchClosed,
      isSwitchInCircuit: hasSwitch,
      isLampInCircuit: hasBulb,
      isLampLit: false,
      bulbBrightness: 0,
      cellsInCircuitCount: 2,
      measuredVoltage: 1.5,
      nominalCapacityMah: 4000,
      currentAmps: 0,
      currentPerCellAmps: 0,
      resistance: 3.0,
      powerWatts: 0,
      estimatedRuntimeHours: runtime,
      statusMessage: 'ต่อขนานถ่าน 2 ก้อน (+ ชน +, - ชน -) สำเร็จแล้ว! ตอนนี้นำสายไฟต่อเข้ากับสวิตช์และหลอดไฟ 1.5V ให้ครบวงจร',
      scientificExplanation: 'ความจุของชุดถ่านขนานเพิ่มเป็น 4000mAh แล้ว เหลือเพียงต่อเข้ากับโหลดหลอดไฟเพื่อทดสอบการจ่ายกระแส',
      hint: 'ต่อสายไฟจากขั้วบวกร่วมไปยังสวิตช์ แล้วต่อเข้าหลอดไฟ จากนั้นต่อสายขากลับมาที่ขั้วลบร่วม',
      alertType: 'normal',
    };
  }

  // Case B: Only 1 cell in loop (other cell not in parallel)
  const c1Loop = findPath(c1Pos, c1Neg, loopTransitions);
  const c2Loop = findPath(c2Pos, c2Neg, loopTransitions);
  if (c1Loop || c2Loop) {
    const voltage = 1.5;
    const current = 0.50;
    const runtime = 4.0; // 2000mAh / 500mA

    return {
      isSuccess: false,
      isClosedCircuit: true,
      isShortCircuit: false,
      isParallelConnected: false,
      isSeriesConnected: false,
      isSwitchClosed,
      isSwitchInCircuit: true,
      isLampInCircuit: true,
      isLampLit: isSwitchClosed,
      bulbBrightness: isSwitchClosed ? 1.0 : 0,
      cellsInCircuitCount: 1,
      measuredVoltage: 1.5,
      nominalCapacityMah: 2000,
      currentAmps: isSwitchClosed ? current : 0,
      currentPerCellAmps: isSwitchClosed ? current : 0,
      resistance: 3.0,
      powerWatts: isSwitchClosed ? 0.75 : 0,
      estimatedRuntimeHours: runtime,
      statusMessage: 'หลอดไฟติดสว่าง แต่ใชัพลังงานจากถ่านเพียง 1 ก้อน (ความจุ 2000mAh ใช้งานได้ 4 ชั่วโมง) กรุณาต่อขนานถ่านก้อนที่ 2 เพื่อเพิ่มความจุเป็น 4000mAh (8 ชั่วโมง)!',
      scientificExplanation: 'เมื่อใช้ถ่านก้อนเดียว เซลล์ต้องรับภาระกระแสเต็ม 0.50A ทำให้ประจุหมดเร็วกว่า หากต่อขนานจะแบ่งเบากระแสเหลือ 0.25A ต่อก้อน',
      hint: 'ต่อขั้วบวกของก้อน 1 เข้าขั้วบวกของก้อน 2 (+ ชน +) และต่อขั้วลบของก้อน 1 เข้าขั้วลบของก้อน 2 (- ชน -)',
      alertType: 'warning',
    };
  }

  // Case C: Incomplete
  return {
    isSuccess: false,
    isClosedCircuit: false,
    isShortCircuit: false,
    isParallelConnected: false,
    isSeriesConnected: false,
    isSwitchClosed,
    isSwitchInCircuit: false,
    isLampInCircuit: false,
    isLampLit: false,
    bulbBrightness: 0,
    cellsInCircuitCount: 0,
    measuredVoltage: 0.0,
    nominalCapacityMah: 0,
    currentAmps: 0,
    currentPerCellAmps: 0,
    resistance: Infinity,
    powerWatts: 0,
    estimatedRuntimeHours: 0,
    statusMessage: 'กรุณาต่อเซลล์แบบขนาน: นำขั้วบวกต่อกับขั้วบวก (+ ชน +) และขั้วลบต่อกับขั้วลบ (- ชน -) จากนั้นต่อเข้ากับสวิตช์และหลอดไฟ 1.5V',
    scientificExplanation: 'การต่อขนานคือการเชื่อมต่อขั้วที่มีศักย์ไฟฟ้าเท่ากันเข้าด้วยกัน เพื่อรวมปริมาณประจุไฟฟ้า (mAh) โดยไม่เพิ่มแรงดัน',
    hint: 'แตะที่ขั้วบวก (+) ของถ่านก้อนที่ 1 แล้วลากสายไปแตะขั้วบวก (+) ของก้อนที่ 2 จากนั้นทำเช่นเดียวกันกับขั้วลบ (-)',
    alertType: 'normal',
  };
}

export interface Mixed2S2PValidation {
  isSuccess: boolean;
  isClosedCircuit: boolean;
  isShortCircuit: boolean;
  isMismatchedStrings: boolean;
  isStringAValid: boolean;
  isStringBValid: boolean;
  isParallelTied: boolean;
  isReversedCell: boolean;
  hasCirculatingCurrent: boolean;
  stringAVoltage: number;
  stringBVoltage: number;
  totalVoltage: number;
  nominalCapacityMah: number;
  totalEnergyWh: number;
  internalResistance: number;
  statusMessage: string;
  scientificExplanation: string;
  hint: string;
  alertType: 'normal' | 'warning' | 'danger' | 'success';
}

/**
 * Validates connection graph specifically for Scene 09: Mixed Circuit Lab (2S2P Pack).
 * Requirements:
 * 1. Four identical AA cells: cell_1 & cell_2 (String A), cell_3 & cell_4 (String B)
 * 2. Series String A: cell_1 connected in series with cell_2 (+ to -) => 3.0V
 * 3. Series String B: cell_3 connected in series with cell_4 (+ to -) => 3.0V
 * 4. Parallel bus: String A positive tied to String B positive, String A negative tied to String B negative
 * 5. Connected to output bus terminals: bus_pos & bus_neg
 * 6. Detects shorts, reversed cells, and critically: mismatched string voltage circulating currents!
 */
export function validateMixed2S2PCircuit(
  components: CircuitComponent[],
  wires: CircuitWire[]
): Mixed2S2PValidation {
  const c1 = components.find((c) => c.id === 'cell_1');
  const c2 = components.find((c) => c.id === 'cell_2');
  const c3 = components.find((c) => c.id === 'cell_3');
  const c4 = components.find((c) => c.id === 'cell_4');

  if (!c1 || !c2 || !c3 || !c4) {
    return {
      isSuccess: false,
      isClosedCircuit: false,
      isShortCircuit: false,
      isMismatchedStrings: false,
      isStringAValid: false,
      isStringBValid: false,
      isParallelTied: false,
      isReversedCell: false,
      hasCirculatingCurrent: false,
      stringAVoltage: 0,
      stringBVoltage: 0,
      totalVoltage: 0,
      nominalCapacityMah: 0,
      totalEnergyWh: 0,
      internalResistance: 0.15,
      statusMessage: 'อุปกรณ์บนโต๊ะยังไม่ครบ: กรุณาวางถ่าน AA ทั้ง 4 ก้อนลงบนโต๊ะทดลอง',
      scientificExplanation: 'ชุดแบตเตอรี่แบบ 2S2P ต้องใช้ถ่าน AA ทั้งหมด 4 ก้อน (2 เซลล์อนุกรม x 2 แถวขนาน)',
      hint: 'วางถ่าน AA ก้อนที่ 1, 2, 3 และ 4 ให้ครบ',
      alertType: 'normal',
    };
  }

  // Polarity accounting for reversed flags
  const c1Rev = c1.properties?.isReversed ?? false;
  const c2Rev = c2.properties?.isReversed ?? false;
  const c3Rev = c3.properties?.isReversed ?? false;
  const c4Rev = c4.properties?.isReversed ?? false;

  const c1Pos = c1Rev ? 'cell_1_neg' : 'cell_1_pos';
  const c1Neg = c1Rev ? 'cell_1_pos' : 'cell_1_neg';
  const c2Pos = c2Rev ? 'cell_2_neg' : 'cell_2_pos';
  const c2Neg = c2Rev ? 'cell_2_pos' : 'cell_2_neg';

  const c3Pos = c3Rev ? 'cell_3_neg' : 'cell_3_pos';
  const c3Neg = c3Rev ? 'cell_3_pos' : 'cell_3_neg';
  const c4Pos = c4Rev ? 'cell_4_neg' : 'cell_4_pos';
  const c4Neg = c4Rev ? 'cell_4_pos' : 'cell_4_neg';

  const busPosId = 'bus_pos';
  const busNegId = 'bus_neg';

  // Build graph adjacency
  const wireAdj = new Map<string, string[]>();
  const addEdge = (u: string, v: string) => {
    if (!wireAdj.has(u)) wireAdj.set(u, []);
    if (!wireAdj.has(v)) wireAdj.set(v, []);
    wireAdj.get(u)!.push(v);
    wireAdj.get(v)!.push(u);
  };
  wires.forEach((w) => addEdge(w.fromTerminalId, w.toTerminalId));

  const findPath = (start: string, target: string): string[] | null => {
    const queue: string[][] = [[start]];
    const visited = new Set<string>([start]);
    while (queue.length > 0) {
      const path = queue.shift()!;
      const curr = path[path.length - 1];
      if (curr === target) return path;
      for (const n of wireAdj.get(curr) || []) {
        if (!visited.has(n)) {
          visited.add(n);
          queue.push([...path, n]);
        }
      }
    }
    return null;
  };

  // 1. Direct short circuit across any cell
  const short1 = findPath(c1Pos, c1Neg);
  const short2 = findPath(c2Pos, c2Neg);
  const short3 = findPath(c3Pos, c3Neg);
  const short4 = findPath(c4Pos, c4Neg);
  const shortBus = findPath(busPosId, busNegId);

  if (short1 || short2 || short3 || short4 || shortBus) {
    return {
      isSuccess: false,
      isClosedCircuit: true,
      isShortCircuit: true,
      isMismatchedStrings: false,
      isStringAValid: false,
      isStringBValid: false,
      isParallelTied: false,
      isReversedCell: false,
      hasCirculatingCurrent: false,
      stringAVoltage: 0,
      stringBVoltage: 0,
      totalVoltage: 0,
      nominalCapacityMah: 0,
      totalEnergyWh: 0,
      internalResistance: 0.05,
      statusMessage: 'อันตรายร้ายแรง! เกิดไฟฟ้าลัดวงจร (Short Circuit) มีสายไฟต่อตรงระหว่างขั้วบวกและลบโดยตรง แบตเตอรี่ร้อนจัด!',
      scientificExplanation: 'ไฟฟ้าลัดวงจรในชุดแบตเตอรี่ 2S2P มีอันตรายสูงมากเนื่องจากกระแสไฟฟ้าจะพุ่งสูงกว่า 30 แอมแปร์ ทำให้เกิดประกายไฟและเซลล์ระเบิดได้',
      hint: 'ถอดสายไฟที่ต่อคร่อมระหว่างขั้วบวกกับลบของเซลล์เดียวกัน หรือสายที่ต่อคร่อมบัสบาร์ออกทันที',
      alertType: 'danger',
    };
  }

  // 2. Validate String A (Cell 1 & Cell 2 in series)
  const bridgeA1 = findPath(c1Pos, c2Neg); // c1+ to c2-
  const bridgeA2 = findPath(c1Neg, c2Pos); // c1- to c2+
  const isStringASeries = Boolean(bridgeA1 || bridgeA2);

  // Check opposing connection in String A (+ to + or - to -)
  const bridgeAOpp1 = findPath(c1Pos, c2Pos);
  const bridgeAOpp2 = findPath(c1Neg, c2Neg);
  const isStringAOpposing = Boolean(bridgeAOpp1 || bridgeAOpp2);

  let strAPos = '';
  let strANeg = '';
  let strAVoltage = 0;

  if (bridgeA1) {
    strAPos = c2Pos;
    strANeg = c1Neg;
    strAVoltage = 3.0;
  } else if (bridgeA2) {
    strAPos = c1Pos;
    strANeg = c2Neg;
    strAVoltage = 3.0;
  } else if (isStringAOpposing) {
    strAVoltage = 0.0;
  }

  // 3. Validate String B (Cell 3 & Cell 4 in series)
  const bridgeB1 = findPath(c3Pos, c4Neg); // c3+ to c4-
  const bridgeB2 = findPath(c3Neg, c4Pos); // c3- to c4+
  const isStringBSeries = Boolean(bridgeB1 || bridgeB2);

  const bridgeBOpp1 = findPath(c3Pos, c4Pos);
  const bridgeBOpp2 = findPath(c3Neg, c4Neg);
  const isStringBOpposing = Boolean(bridgeBOpp1 || bridgeBOpp2);

  let strBPos = '';
  let strBNeg = '';
  let strBVoltage = 0;

  if (bridgeB1) {
    strBPos = c4Pos;
    strBNeg = c3Neg;
    strBVoltage = 3.0;
  } else if (bridgeB2) {
    strBPos = c3Pos;
    strBNeg = c4Neg;
    strBVoltage = 3.0;
  } else if (isStringBOpposing) {
    strBVoltage = 0.0;
  }

  // Check if strings are tied in parallel
  // Parallel means: String A positive connects to String B positive, AND String A negative connects to String B negative
  const posTied = strAPos && strBPos ? Boolean(findPath(strAPos, strBPos)) : false;
  const negTied = strANeg && strBNeg ? Boolean(findPath(strANeg, strBNeg)) : false;
  const isParallelTied = posTied && negTied;

  // Check cross-connected opposing polarity (+ of string A to - of string B and vice-versa)
  const crossShort1 = strAPos && strBNeg ? Boolean(findPath(strAPos, strBNeg)) : false;
  const crossShort2 = strANeg && strBPos ? Boolean(findPath(strANeg, strBPos)) : false;

  if (crossShort1 || crossShort2) {
    return {
      isSuccess: false,
      isClosedCircuit: true,
      isShortCircuit: true,
      isMismatchedStrings: false,
      isStringAValid: isStringASeries,
      isStringBValid: isStringBSeries,
      isParallelTied: false,
      isReversedCell: true,
      hasCirculatingCurrent: true,
      stringAVoltage: strAVoltage,
      stringBVoltage: strBVoltage,
      totalVoltage: 0,
      nominalCapacityMah: 0,
      totalEnergyWh: 0,
      internalResistance: 0.05,
      statusMessage: 'อันตราย! ตรวจพบการต่อข้ามขั้วระหว่างสตริง (+ ของสตริง 1 ไปชน - ของสตริง 2) เกิดไฟฟ้าลัดวงจรข้ามสตริงรุนแรง!',
      scientificExplanation: 'การขนานสตริงต้องเชื่อมขั้วบวกของทั้งสองสตริงเข้าด้วยกัน และขั้วลบของทั้งสองสตริงเข้าด้วยกัน หากนำขั้วบวกไปต่อขั้วลบจะเกิดวงจรลัดที่มีแรงดันขับถึง 6.0V',
      hint: 'ต่อขั้วบวกของสตริง A เข้าขั้วบวกของสตริง B (+ ชน +) และต่อขั้วลบเข้าขั้วลบ (- ชน -)',
      alertType: 'danger',
    };
  }

  // Check Mismatched string voltage circulating current
  // E.g. String A is 3.0V, but String B has opposing cells (0.0V) or missing a cell, and they are tied together!
  if ((isStringAOpposing || isStringBOpposing) && (posTied || negTied)) {
    return {
      isSuccess: false,
      isClosedCircuit: true,
      isShortCircuit: false,
      isMismatchedStrings: true,
      isStringAValid: isStringASeries && !isStringAOpposing,
      isStringBValid: isStringBSeries && !isStringBOpposing,
      isParallelTied,
      isReversedCell: true,
      hasCirculatingCurrent: true,
      stringAVoltage: strAVoltage,
      stringBVoltage: strBVoltage,
      totalVoltage: 0,
      nominalCapacityMah: 0,
      totalEnergyWh: 0,
      internalResistance: 0.15,
      statusMessage: 'อันตราย! แรงดันระหว่างสองสตริงไม่เท่ากัน (สตริงหนึ่ง 3.0V อีกสตริงหนึ่งกลับขั้วเหลือ 0.0V) เกิดกระแสไหลวนย้อนกลับ (Circulating Current) ข้ามสตริงอย่างรุนแรง!',
      scientificExplanation: 'ตามกฎของเคอร์ชฮอฟฟ์ (KVL) เมื่อขนานสตริงที่มีแรงดันต่างกัน (ΔV = 3.0V - 0.0V = 3.0V) สตริงที่มีแรงดันสูงกว่าจะอัดกระแสไหลวนมหาศาลเข้าสู่อีกสตริง ทำให้เซลล์ร้อนจัดและบวมเสียหาย',
      hint: 'ตรวจสอบถ่านที่มีการกลับขั้วในสตริง ให้ต่อแบบหัวต่อท้าย (+ ชน -) ให้ได้ 3.0V เท่ากันทั้งสองสตริงก่อนนำมาขนานกัน',
      alertType: 'danger',
    };
  }

  // Check if strings are individually opposing without parallel tie
  if (isStringAOpposing || isStringBOpposing) {
    return {
      isSuccess: false,
      isClosedCircuit: false,
      isShortCircuit: false,
      isMismatchedStrings: true,
      isStringAValid: !isStringAOpposing && isStringASeries,
      isStringBValid: !isStringBOpposing && isStringBSeries,
      isParallelTied: false,
      isReversedCell: true,
      hasCirculatingCurrent: false,
      stringAVoltage: strAVoltage,
      stringBVoltage: strBVoltage,
      totalVoltage: 0,
      nominalCapacityMah: 0,
      totalEnergyWh: 0,
      internalResistance: 0.3,
      statusMessage: 'พบการต่อถ่านกลับขั้วในสตริง (+ ชน + หรือ - ชน -) ทำให้แรงดันไฟฟ้าหักล้างกันเหลือ 0.0V',
      scientificExplanation: 'ในแต่ละสตริงอนุกรม เซลล์ต้องต่อแบบหัวต่อท้าย (+ ชน -) เพื่อให้แรงดันเสริมกันเป็น 3.0V',
      hint: 'แก้ไขสะพานอนุกรมให้เป็นขั้วบวกต่อขั้วลบ (+ ชน -)',
      alertType: 'warning',
    };
  }

  // Check connection to main output bus terminals
  const connectedToBusPos = (strAPos && findPath(strAPos, busPosId)) || (strBPos && findPath(strBPos, busPosId));
  const connectedToBusNeg = (strANeg && findPath(strANeg, busNegId)) || (strBNeg && findPath(strBNeg, busNegId));
  const isBusConnected = Boolean(connectedToBusPos && connectedToBusNeg);

  // Perfect 2S2P validation!
  if (isStringASeries && isStringBSeries && isParallelTied && isBusConnected) {
    const totalVoltage = 3.0;
    const nominalCapacityMah = 4000;
    const totalEnergyWh = Number(((totalVoltage * nominalCapacityMah) / 1000).toFixed(1)); // 12.0 Wh
    // R_total = (2 * 0.15) / 2 = 0.15 Ohm
    const internalResistance = 0.15;

    return {
      isSuccess: true,
      isClosedCircuit: true,
      isShortCircuit: false,
      isMismatchedStrings: false,
      isStringAValid: true,
      isStringBValid: true,
      isParallelTied: true,
      isReversedCell: false,
      hasCirculatingCurrent: false,
      stringAVoltage: 3.0,
      stringBVoltage: 3.0,
      totalVoltage,
      nominalCapacityMah,
      totalEnergyWh,
      internalResistance,
      statusMessage: 'สำเร็จสมบูรณ์แบบ! โครงสร้างแบตเตอรี่ 2S2P ถูกต้องตามหลักวิศวกรรม: แรงดัน 3.0V และความจุ 4,000 mAh พร้อมจ่ายพลังงานให้กับมอเตอร์!',
      scientificExplanation: 'ชุดแบตเตอรี่ 2S2P รวมข้อดีทั้งสองแบบ: เซลล์อนุกรม 2 ก้อนในแต่ละสตริงเพิ่มแรงดันเป็น 3.0V (V_total = 1.5V + 1.5V) และการนำ 2 สตริงที่แรงดันเท่ากันมาขนานกัน ช่วยเพิ่มความจุเป็น 2 เท่าคือ 4000mAh (C_total = 2000mAh + 2000mAh) โดยมีความต้านทานภายในเพียง 0.15Ω!',
      hint: 'กดปุ่ม "ทดสอบและบันทึกชุดแบตเตอรี่" เพื่อนำแพ็ก 2S2P นี้ไปติดตั้งลงจักรยานแข่งและไปต่อที่ LAB-05 ได้เลยครับ!',
      alertType: 'success',
    };
  }

  // Partial progress: Both strings valid 3.0V, but not yet paralleled
  if (isStringASeries && isStringBSeries && !isParallelTied) {
    return {
      isSuccess: false,
      isClosedCircuit: false,
      isShortCircuit: false,
      isMismatchedStrings: false,
      isStringAValid: true,
      isStringBValid: true,
      isParallelTied: false,
      isReversedCell: false,
      hasCirculatingCurrent: false,
      stringAVoltage: 3.0,
      stringBVoltage: 3.0,
      totalVoltage: 3.0,
      nominalCapacityMah: 2000,
      totalEnergyWh: 6.0,
      internalResistance: 0.3,
      statusMessage: 'ต่อสตริงอนุกรม 3.0V ทั้งสองแถวสำเร็จแล้ว! ตอนนี้นำขั้วบวกของทั้งสองสตริงมาขนานกัน (+ ชน +) และขั้วลบมาขนานกัน (- ชน -) เข้าสู่บัสบาร์หลัก',
      scientificExplanation: 'ทั้งสองสตริงมีแรงดัน 3.0V เท่ากันแล้ว ปลอดภัยในการขนานกันเพื่อรวมความจุเป็น 4000mAh',
      hint: 'ลากสายไฟเชื่อมระหว่างขั้วบวกของสตริง A กับสตริง B และเชื่อมเข้าขั้วบัสบาร์หลัก (+)',
      alertType: 'normal',
    };
  }

  // Partial progress: Only String A is complete
  if (isStringASeries && !isStringBSeries) {
    return {
      isSuccess: false,
      isClosedCircuit: false,
      isShortCircuit: false,
      isMismatchedStrings: false,
      isStringAValid: true,
      isStringBValid: false,
      isParallelTied: false,
      isReversedCell: false,
      hasCirculatingCurrent: false,
      stringAVoltage: 3.0,
      stringBVoltage: 0,
      totalVoltage: 3.0,
      nominalCapacityMah: 2000,
      totalEnergyWh: 6.0,
      internalResistance: 0.3,
      statusMessage: 'สตริง A ต่ออนุกรม 3.0V ได้แล้ว! กรุณาต่อสตริง B (ถ่านก้อนที่ 3 และ 4) แบบอนุกรมให้ได้ 3.0V เช่นเดียวกัน',
      scientificExplanation: 'ก่อนจะขนานสตริง ทั้งสองสตริงจะต้องสร้างแรงดันให้เท่ากันที่ 3.0V ก่อนเพื่อป้องกันกระแสไหลวน',
      hint: 'เชื่อมขั้วบวกของถ่านก้อน 3 เข้ากับขั้วลบของถ่านก้อน 4 เพื่อทำสตริง B',
      alertType: 'normal',
    };
  }

  // Incomplete
  return {
    isSuccess: false,
    isClosedCircuit: false,
    isShortCircuit: false,
    isMismatchedStrings: false,
    isStringAValid: false,
    isStringBValid: false,
    isParallelTied: false,
    isReversedCell: false,
    hasCirculatingCurrent: false,
    stringAVoltage: 0,
    stringBVoltage: 0,
    totalVoltage: 0,
    nominalCapacityMah: 0,
    totalEnergyWh: 0,
    internalResistance: 0.15,
    statusMessage: 'เริ่มสร้างชุดแบตเตอรี่ 2S2P: ขั้นแรกให้ต่อถ่านเป็น 2 สตริงอนุกรม (ก้อน 1 ต่ออนุกรมกับก้อน 2, และก้อน 3 ต่ออนุกรมกับก้อน 4)',
    scientificExplanation: '2S2P หมายถึง: 2 เซลล์ในอนุกรม (2S = 3.0V) และ 2 แถวขนาน (2P = 4000mAh) รวมใช้ถ่าน 4 ก้อน',
    hint: 'แตะที่ขั้วบวก (+) ของถ่าน #1 ลากไปแตะขั้วลบ (-) ของถ่าน #2 เพื่อสร้างสตริงแรก',
    alertType: 'normal',
  };
}


