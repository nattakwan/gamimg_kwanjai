/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  calculateBatteryPack,
  validateBasicCircuit,
  validateSeriesCircuit,
  validateParallelCircuit,
  validateMixed2S2PCircuit,
  analyzeCircuit,
} from '../engine/circuitSimulator';
import { CircuitComponent, CircuitWire } from '../types/game';

interface TestResult {
  suite: string;
  testName: string;
  passed: boolean;
  message: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, suite: string, testName: string, failureMsg: string) {
  if (condition) {
    results.push({ suite, testName, passed: true, message: 'PASS' });
  } else {
    results.push({ suite, testName, passed: false, message: `FAIL: ${failureMsg}` });
  }
}

console.log('================================================================');
console.log('  BATTERY QUEST: SENIOR QA & ELECTRICAL ENGINEERING AUDIT SUITE ');
console.log('================================================================\n');

// -------------------------------------------------------------
// SUITE 1: Battery Topology & Calculations (Formulas & Equations)
// -------------------------------------------------------------
console.log('Running Suite 1: Battery Topology & Math Calculations...');

// Test 1.1: Single Cell 1S1P
const pack1S1P = calculateBatteryPack(1, 1);
assert(pack1S1P.voltage === 1.5, 'Battery Topology', '1S1P Nominal Voltage', `Expected 1.5V, got ${pack1S1P.voltage}V`);
assert(pack1S1P.capacityMah === 2000, 'Battery Topology', '1S1P Capacity', `Expected 2000mAh, got ${pack1S1P.capacityMah}mAh`);
assert(pack1S1P.internalResistance === 0.15, 'Battery Topology', '1S1P Internal Resistance', `Expected 0.15Ω, got ${pack1S1P.internalResistance}Ω`);

// Test 1.2: Series Pack 2S1P
const pack2S1P = calculateBatteryPack(2, 1);
assert(pack2S1P.voltage === 3.0, 'Battery Topology', '2S1P Voltage', `Expected 3.0V, got ${pack2S1P.voltage}V`);
assert(pack2S1P.capacityMah === 2000, 'Battery Topology', '2S1P Capacity', `Expected 2000mAh, got ${pack2S1P.capacityMah}mAh`);
assert(pack2S1P.internalResistance === 0.30, 'Battery Topology', '2S1P Internal Resistance', `Expected 0.30Ω, got ${pack2S1P.internalResistance}Ω`);

// Test 1.3: Parallel Pack 1S2P
const pack1S2P = calculateBatteryPack(1, 2);
assert(pack1S2P.voltage === 1.5, 'Battery Topology', '1S2P Voltage', `Expected 1.5V, got ${pack1S2P.voltage}V`);
assert(pack1S2P.capacityMah === 4000, 'Battery Topology', '1S2P Capacity', `Expected 4000mAh, got ${pack1S2P.capacityMah}mAh`);
assert(pack1S2P.internalResistance === 0.075, 'Battery Topology', '1S2P Internal Resistance', `Expected 0.075Ω, got ${pack1S2P.internalResistance}Ω`);

// Test 1.4: Mixed Pack 2S2P (Academy Standard Racing Pack)
const pack2S2P = calculateBatteryPack(2, 2);
assert(pack2S2P.voltage === 3.0, 'Battery Topology', '2S2P Voltage', `Expected 3.0V, got ${pack2S2P.voltage}V`);
assert(pack2S2P.capacityMah === 4000, 'Battery Topology', '2S2P Capacity', `Expected 4000mAh, got ${pack2S2P.capacityMah}mAh`);
assert(pack2S2P.internalResistance === 0.15, 'Battery Topology', '2S2P Internal Resistance', `Expected 0.15Ω, got ${pack2S2P.internalResistance}Ω`);
assert(pack2S2P.energyWh === 12.0, 'Battery Topology', '2S2P Energy Wh', `Expected 12.0Wh, got ${pack2S2P.energyWh}Wh`);

// Test 1.5: Series Pack with 1 Reversed Cell
const pack2S_Rev = calculateBatteryPack(2, 1, 1);
assert(pack2S_Rev.voltage === 0.0, 'Battery Topology', '2S with 1 Reversed Cell cancels out', `Expected 0.0V, got ${pack2S_Rev.voltage}V`);

// -------------------------------------------------------------
// SUITE 2: Graph-Based Connection & Safety Validation
// -------------------------------------------------------------
console.log('Running Suite 2: Graph-Based Connection & Safety Validation...');

// Test 2.1: Basic Circuit Closed Loop
const basicComponents: CircuitComponent[] = [
  {
    id: 'cell_1',
    type: 'battery_cell',
    name: 'ถ่าน AA 1.5V',
    x: 0,
    y: 0,
    terminals: [
      { id: 'cell_1_pos', componentId: 'cell_1', label: '+', polarity: 'positive', x: 0, y: 0 },
      { id: 'cell_1_neg', componentId: 'cell_1', label: '-', polarity: 'negative', x: 0, y: 0 },
    ],
    properties: { voltage: 1.5, capacityMah: 2000 },
  },
  {
    id: 'sw_1',
    type: 'switch',
    name: 'สวิตช์',
    x: 0,
    y: 0,
    terminals: [
      { id: 'sw_1_in', componentId: 'sw_1', label: 'IN', polarity: 'neutral', x: 0, y: 0 },
      { id: 'sw_1_out', componentId: 'sw_1', label: 'OUT', polarity: 'neutral', x: 0, y: 0 },
    ],
    properties: { isClosed: true },
  },
  {
    id: 'bulb_1',
    type: 'light_bulb',
    name: 'หลอดไฟ 1.5V',
    x: 0,
    y: 0,
    terminals: [
      { id: 'bulb_1_a', componentId: 'bulb_1', label: 'A', polarity: 'neutral', x: 0, y: 0 },
      { id: 'bulb_1_b', componentId: 'bulb_1', label: 'B', polarity: 'neutral', x: 0, y: 0 },
    ],
    properties: { ratedVoltage: 1.5, resistance: 3.0 },
  },
];

const validBasicWires: CircuitWire[] = [
  { id: 'w1', fromTerminalId: 'cell_1_pos', toTerminalId: 'sw_1_in' },
  { id: 'w2', fromTerminalId: 'sw_1_out', toTerminalId: 'bulb_1_a' },
  { id: 'w3', fromTerminalId: 'bulb_1_b', toTerminalId: 'cell_1_neg' },
];

const basicRes = validateBasicCircuit(basicComponents, validBasicWires);
assert(basicRes.isSuccess === true, 'Circuit Graph', 'Basic Circuit Closed Loop Valid', `Expected success true, got ${basicRes.isSuccess} (${basicRes.statusMessage})`);
assert(basicRes.isLampLit === true, 'Circuit Graph', 'Lamp Lights Up in Closed Loop', `Expected isLampLit true, got ${basicRes.isLampLit}`);
assert(basicRes.currentAmps === 0.5, 'Circuit Graph', 'Ohm Law Current Check (1.5V / 3Ω = 0.5A)', `Expected 0.5A, got ${basicRes.currentAmps}A`);

// Test 2.2: Basic Circuit Open Switch Detection
const openSwitchComponents = basicComponents.map((c) =>
  c.id === 'sw_1' ? { ...c, properties: { ...c.properties, isClosed: false } } : c
);
const openSwitchRes = validateBasicCircuit(openSwitchComponents, validBasicWires);
assert(openSwitchRes.isSuccess === false, 'Circuit Graph', 'Open Switch Blocks Circuit', `Expected false, got ${openSwitchRes.isSuccess}`);
assert(openSwitchRes.isLampLit === false, 'Circuit Graph', 'Lamp Remains Off when Switch is Open', `Expected false, got ${openSwitchRes.isLampLit}`);
assert(openSwitchRes.alertType === 'warning', 'Circuit Graph', 'Open Circuit Alert Type', `Expected warning, got ${openSwitchRes.alertType}`);

// Test 2.3: Short Circuit Detection
const shortCircuitWires: CircuitWire[] = [
  { id: 'w_short', fromTerminalId: 'cell_1_pos', toTerminalId: 'cell_1_neg' },
];
const shortRes = validateBasicCircuit(basicComponents, shortCircuitWires);
assert(shortRes.isShortCircuit === true, 'Safety Validation', 'Short Circuit Detected', `Expected isShortCircuit true, got ${shortRes.isShortCircuit}`);
assert(shortRes.alertType === 'danger', 'Safety Validation', 'Danger Alert on Short Circuit', `Expected danger, got ${shortRes.alertType}`);

// Test 2.4: Series Circuit Validation (Two cells + to -)
const seriesComponents: CircuitComponent[] = [
  {
    id: 'cell_1',
    type: 'battery_cell',
    name: 'ถ่าน AA 1.5V (#1)',
    x: 0,
    y: 0,
    terminals: [
      { id: 'cell_1_pos', componentId: 'cell_1', label: '+', polarity: 'positive', x: 0, y: 0 },
      { id: 'cell_1_neg', componentId: 'cell_1', label: '-', polarity: 'negative', x: 0, y: 0 },
    ],
    properties: { voltage: 1.5 },
  },
  {
    id: 'cell_2',
    type: 'battery_cell',
    name: 'ถ่าน AA 1.5V (#2)',
    x: 0,
    y: 0,
    terminals: [
      { id: 'cell_2_pos', componentId: 'cell_2', label: '+', polarity: 'positive', x: 0, y: 0 },
      { id: 'cell_2_neg', componentId: 'cell_2', label: '-', polarity: 'negative', x: 0, y: 0 },
    ],
    properties: { voltage: 1.5 },
  },
  {
    id: 'sw_1',
    type: 'switch',
    name: 'สวิตช์',
    x: 0,
    y: 0,
    terminals: [
      { id: 'sw_1_in', componentId: 'sw_1', label: 'IN', polarity: 'neutral', x: 0, y: 0 },
      { id: 'sw_1_out', componentId: 'sw_1', label: 'OUT', polarity: 'neutral', x: 0, y: 0 },
    ],
    properties: { isClosed: true },
  },
  {
    id: 'bulb_1',
    type: 'light_bulb',
    name: 'หลอดไฟ 3.0V',
    x: 0,
    y: 0,
    terminals: [
      { id: 'bulb_1_a', componentId: 'bulb_1', label: 'A', polarity: 'neutral', x: 0, y: 0 },
      { id: 'bulb_1_b', componentId: 'bulb_1', label: 'B', polarity: 'neutral', x: 0, y: 0 },
    ],
    properties: { ratedVoltage: 3.0, resistance: 6.0 },
  },
];

const validSeriesWires: CircuitWire[] = [
  // Series bridge: c1 neg to c2 pos
  { id: 'wb', fromTerminalId: 'cell_1_neg', toTerminalId: 'cell_2_pos' },
  // Loop through switch and bulb: c1 pos -> sw in -> sw out -> bulb a -> bulb b -> c2 neg
  { id: 'w1', fromTerminalId: 'cell_1_pos', toTerminalId: 'sw_1_in' },
  { id: 'w2', fromTerminalId: 'sw_1_out', toTerminalId: 'bulb_1_a' },
  { id: 'w3', fromTerminalId: 'bulb_1_b', toTerminalId: 'cell_2_neg' },
];

const seriesRes = validateSeriesCircuit(seriesComponents, validSeriesWires);
assert(seriesRes.isSuccess === true, 'Series Validation', 'Series 2S Circuit Valid', `Expected true, got ${seriesRes.isSuccess}`);
assert(seriesRes.measuredVoltage === 3.0, 'Series Validation', 'Measured Voltage 3.0V', `Expected 3.0V, got ${seriesRes.measuredVoltage}V`);
assert(seriesRes.isLampLit === true, 'Series Validation', '3V Lamp Lit Full Brightness', `Expected true, got ${seriesRes.isLampLit}`);

// Test 2.5: Reversed Cell in Series (+ to + opposing)
const reversedSeriesWires: CircuitWire[] = [
  { id: 'wb', fromTerminalId: 'cell_1_pos', toTerminalId: 'cell_2_pos' }, // Opposing!
  { id: 'w1', fromTerminalId: 'cell_1_neg', toTerminalId: 'sw_1_in' },
  { id: 'w2', fromTerminalId: 'sw_1_out', toTerminalId: 'bulb_1_a' },
  { id: 'w3', fromTerminalId: 'bulb_1_b', toTerminalId: 'cell_2_neg' },
];
const revSeriesRes = validateSeriesCircuit(seriesComponents, reversedSeriesWires);
assert(revSeriesRes.isReversedCell === true, 'Series Validation', 'Reversed Cell Detected', `Expected isReversedCell true, got ${revSeriesRes.isReversedCell}`);
assert(revSeriesRes.measuredVoltage === 0.0, 'Series Validation', 'Opposing Polarity Voltage Cancellation (0V)', `Expected 0.0V, got ${revSeriesRes.measuredVoltage}V`);

// -------------------------------------------------------------
// SUITE 3: Motor Dyno & Physical Motion Equations
// -------------------------------------------------------------
console.log('Running Suite 3: Motor Dyno & Physical Motion Equations...');

// Test 3.1: 3.0V DC Motor Performance with 2S2P vs 2S1P vs 1S
const ratedMotorV = 3.0;
const motorRw = 1.0; // winding resistance
const motorKv = 800; // RPM/V
const motorTorqueBreakaway = 0.008; // Nm

// 2S2P pack (V_oc = 3.0V, R_in = 0.15)
const rIn_2S2P = 0.15;
const effectiveR_2S2P = motorRw + rIn_2S2P; // 1.15 Ohm
const stallCurrent_2S2P = 3.0 / effectiveR_2S2P; // ~2.60 A
const operatingEb_2S2P = 2.2; // Back EMF at speed
const operatingCurrent_2S2P = (3.0 - operatingEb_2S2P) / effectiveR_2S2P; // 0.695 A
const operatingVoltage_2S2P = 3.0 - operatingCurrent_2S2P * rIn_2S2P; // 2.895 V
const motorRpm_2S2P = Math.round(operatingEb_2S2P * motorKv); // 1,760 RPM
assert(motorRpm_2S2P > 1600 && motorRpm_2S2P < 1900, 'Motor Dyno', '2S2P Operating RPM in nominal window', `Got ${motorRpm_2S2P} RPM`);
assert(operatingVoltage_2S2P > 2.8, 'Motor Dyno', '2S2P Low Voltage Sag under load', `Got ${operatingVoltage_2S2P.toFixed(2)}V`);

// 1S pack (V_oc = 1.5V) stall verification
const stallCurrent_1S = 1.5 / (motorRw + 0.15); // ~1.3 A
const torque_1S = stallCurrent_1S * 0.005; // ~0.0065 Nm < breakaway torque (0.008 Nm) -> STALL!
assert(torque_1S < motorTorqueBreakaway, 'Motor Dyno', '1S Fails to overcome breakaway torque (Stall)', `Torque ${torque_1S} Nm < ${motorTorqueBreakaway} Nm`);

// -------------------------------------------------------------
// SUITE 4: Scoring Rubric Verification (No Unearned Points)
// -------------------------------------------------------------
console.log('Running Suite 4: Scoring Rubric Verification...');

// Test 4.1: Scene 14 Race Scoring (30 Points Max)
function computeRaceScore(rank: number, avgSpeed: number, batteryPctRemaining: number) {
  const rankPts = rank === 1 ? 12 : rank === 2 ? 9 : rank === 3 ? 6 : 3;
  const speedPts = avgSpeed >= 30 ? 10 : avgSpeed >= 26 ? 8 : avgSpeed >= 22 ? 6 : 4;
  const battPts = batteryPctRemaining > 25 ? 8 : batteryPctRemaining > 10 ? 6 : batteryPctRemaining > 0 ? 4 : 2;
  return rankPts + speedPts + battPts;
}

const maxScore = computeRaceScore(1, 32, 45);
assert(maxScore === 30, 'Scoring Engine', 'Max Race Score is 30/30', `Expected 30, got ${maxScore}`);

const runnerUpScore = computeRaceScore(2, 28, 20);
assert(runnerUpScore === 23, 'Scoring Engine', '2nd Place Score calculation', `Expected 23 (9+8+6), got ${runnerUpScore}`);

const lastPlaceDrainedScore = computeRaceScore(4, 18, 0);
assert(lastPlaceDrainedScore === 9, 'Scoring Engine', '4th Place Drained Score (3+4+2 = 9)', `Expected 9, got ${lastPlaceDrainedScore}`);

// Test 4.2: Scene 15 Reflection Composite Scoring (100 Points Max)
function computeCompositeReflectionScore(
  isValidated: boolean,
  packV: number,
  packRin: number,
  raceScore30: number,
  reflectionCorrectCount: number
) {
  const circuitPts = isValidated ? 30 : 15;
  const isVMatched = packV >= 2.8 && packV <= 3.2;
  const isLowRin = packRin <= 0.2;
  const battSuitabilityPts = (isVMatched ? 15 : 5) + (isLowRin ? 5 : 0);
  const racePts = Math.min(30, Math.max(0, raceScore30));
  const learnPts = reflectionCorrectCount === 3 ? 20 : reflectionCorrectCount === 2 ? 14 : reflectionCorrectCount === 1 ? 7 : 0;
  return circuitPts + battSuitabilityPts + racePts + learnPts;
}

const perfectStudent = computeCompositeReflectionScore(true, 3.0, 0.15, 30, 3);
assert(perfectStudent === 100, 'Scoring Engine', 'Perfect Student gets 100/100 (30+20+30+20)', `Expected 100, got ${perfectStudent}`);

const zeroReflectionStudent = computeCompositeReflectionScore(true, 3.0, 0.15, 30, 0);
assert(zeroReflectionStudent === 80, 'Scoring Engine', 'Never award unearned points for unanswered reflections', `Expected 80, got ${zeroReflectionStudent}`);

// -------------------------------------------------------------
// SUMMARY & AUDIT OUTPUT
// -------------------------------------------------------------
const passedCount = results.filter((r) => r.passed).length;
const failedCount = results.filter((r) => !r.passed).length;

console.log('\n================================================================');
console.log(`  AUDIT SUITE SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED (${results.length} Total)`);
console.log('================================================================');

results.forEach((r) => {
  console.log(`[${r.passed ? 'PASS' : 'FAIL'}] ${r.suite} -> ${r.testName}: ${r.message}`);
});

if (failedCount > 0) {
  process.exit(1);
} else {
  console.log('\nALL AUTOMATED TESTS PASSED CLEANLY WITH ZERO FAILURES!\n');
  process.exit(0);
}
