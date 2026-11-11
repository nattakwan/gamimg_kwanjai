/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type SceneId =
  | 'splash'
  | 'main_menu'
  | 'character_creator'
  | 'volt_tutorial'
  | 'mission_map'
  | 'basic_circuit_lab'
  | 'series_lab'
  | 'parallel_lab'
  | 'mixed_lab'
  | 'motor_test'
  | 'bike_garage'
  | 'race_prep'
  | 'racing'
  | 'race_results'
  | 'learning_reflection';

export interface SceneMeta {
  id: SceneId;
  title: string;
  category: 'menu' | 'tutorial' | 'lab' | 'garage' | 'race' | 'education';
  description: string;
}

export interface CharacterState {
  name: string;
  avatarId: string;
  gender: 'cadet_boy' | 'cadet_girl' | 'cadet_robot';
  bodyType: 'boy' | 'girl';
  hairStyle: 'spiky' | 'sleek_bob' | 'ponytail' | 'curly' | 'short_crop' | 'adventurer' | 'side_braid' | 'wild_scientist';
  hairColor: string;
  skinTone: string;
  faceStyle?: number;
  outfitStyle?: number;
  jacketStyle: 'speed_jumpsuit' | 'lab_coat' | 'cyber_armor' | 'flight_bomber' | 'adventurer_shirt' | 'tech_hoodie' | 'tweed_professor';
  trousersStyle: 'cargo_tech' | 'sleek_racer' | 'thermal_pants';
  gogglesStyle: 'none' | 'cyber_visor' | 'brass_round' | 'twin_tech';
  outfitColor: string;
  suitColor: string;
  helmetStyle: 'aerodynamic' | 'speedster' | 'cyber' | 'classic';
  title: string;
  archetype?: 'adventurer' | 'tech_girl' | 'professor';
  hasGoggles?: boolean;
  hasGlasses?: boolean;
  hasMustache?: boolean;
  hasTablet?: boolean;
  hasPetHamster?: boolean;
}

export type CellType = 'AA_1_5V' | 'LiFePO4_3_2V' | 'LiIon_3_7V' | 'LeadAcid_2_0V';

export interface CellChemistryInfo {
  type: CellType;
  name: string;
  category: 'primary' | 'secondary';
  nominalVoltage: number; // V
  capacityMah: number; // mAh
  internalResistance: number; // Ohm
  energyDensityWhKg: number;
  maxCRate: number;
  safetyRating: 'high' | 'medium' | 'requires_bms';
  description: string;
}

export const BATTERY_CHEMISTRIES: Record<CellType, CellChemistryInfo> = {
  AA_1_5V: {
    type: 'AA_1_5V',
    name: 'ถ่านอัลคาไลน์ (Alkaline AA 1.5V)',
    category: 'primary',
    nominalVoltage: 1.5,
    capacityMah: 2000,
    internalResistance: 0.15,
    energyDensityWhKg: 85,
    maxCRate: 1.0,
    safetyRating: 'high',
    description: 'เซลล์ปฐมภูมิ (ชาร์จซ้ำไม่ได้) ปลอดภัย ใช้งานทั่วไปในรีโมทและของเล่น',
  },
  LiFePO4_3_2V: {
    type: 'LiFePO4_3_2V',
    name: 'ลิเธียมไอออนฟอสเฟต (LiFePO4 3.2V)',
    category: 'secondary',
    nominalVoltage: 3.2,
    capacityMah: 3200,
    internalResistance: 0.02,
    energyDensityWhKg: 130,
    maxCRate: 3.0,
    safetyRating: 'high',
    description: 'เซลล์ทุติยภูมิ (ชาร์จซ้ำได้ >2000 รอบ) ปลอดภัยสูง ทนความร้อนสูง เหมาะกับยานยนต์ไฟฟ้า (e-Bike)',
  },
  LiIon_3_7V: {
    type: 'LiIon_3_7V',
    name: 'ลิเธียมไอออนทรงกระบอก (Li-ion 18650 3.7V)',
    category: 'secondary',
    nominalVoltage: 3.7,
    capacityMah: 2600,
    internalResistance: 0.035,
    energyDensityWhKg: 240,
    maxCRate: 2.5,
    safetyRating: 'requires_bms',
    description: 'เซลล์ทุติยภูมิความหนาแน่นพลังงานสูง น้ำหนักเบา ต้องใช้วงจร BMS ควบคุมอุณหภูมิและสมดุลเซลล์',
  },
  LeadAcid_2_0V: {
    type: 'LeadAcid_2_0V',
    name: 'ตะกั่ว-กรดดีฟไซเคิล (Lead-Acid 2.0V/Cell)',
    category: 'secondary',
    nominalVoltage: 2.0,
    capacityMah: 7000,
    internalResistance: 0.08,
    energyDensityWhKg: 35,
    maxCRate: 1.5,
    safetyRating: 'medium',
    description: 'เซลล์ทุติยภูมิแบบคลาสสิก ทนทาน กระแสสตาร์ทสูง น้ำหนักมาก นิยมในรถมอเตอร์ไซค์/รถยนต์',
  },
};

export interface BatteryCell {
  id: string;
  type: CellType;
  voltageNominal: number; // 1.5V
  capacityNominal: number; // 2000 mAh
  internalResistance: number; // 0.15 ohm
  chargeState: number; // 0 to 1 (100%)
  health: number; // 0 to 100%
  isReversed?: boolean;
}

export type BatteryConfigType = 'single' | 'series' | 'parallel' | 'mixed_series_parallel' | 'custom';

export interface BatteryPackSetup {
  id: string;
  name: string;
  configType: BatteryConfigType;
  seriesCount: number; // e.g. 4S
  parallelCount: number; // e.g. 2P
  totalCells: number; // seriesCount * parallelCount
  nominalVoltage: number; // V
  nominalCapacityMah: number; // mAh
  totalVoltage?: number; // alias
  totalCapacityMah?: number; // alias
  internalResistance: number; // Ohms
  isValidated: boolean;
  notes: string;
  // Vocational & Safety additions
  cellType?: CellType;
  hasBms?: boolean;
  fuseRatingAmps?: number;
  isFuseBlown?: boolean;
  isBalanced?: boolean;
  voltageSag?: number;
}

export interface CircuitTerminal {
  id: string;
  componentId: string;
  label: string;
  polarity: 'positive' | 'negative' | 'neutral';
  x: number;
  y: number;
}

export interface CircuitComponent {
  id: string;
  type:
    | 'battery_cell'
    | 'battery_pack'
    | 'switch'
    | 'light_bulb'
    | 'dc_motor'
    | 'resistor'
    | 'voltmeter'
    | 'ammeter';
  name: string;
  x: number;
  y: number;
  terminals: CircuitTerminal[];
  properties: {
    voltage?: number;
    capacityMah?: number;
    resistance?: number;
    ratedVoltage?: number;
    isClosed?: boolean;
    isReversed?: boolean;
  };
}

export interface CircuitWire {
  id: string;
  fromTerminalId: string;
  toTerminalId: string;
  color?: string;
}

export interface CircuitAnalysisResult {
  isClosedCircuit: boolean;
  isShortCircuit: boolean;
  hasReversedCells: boolean;
  totalVoltage: number;
  totalCapacityMah: number;
  effectiveResistance: number;
  currentAmps: number;
  powerWatts: number;
  motorRpm: number;
  bulbBrightness: number;
  isSafe: boolean;
  statusMessage: string;
  alertType: 'normal' | 'warning' | 'danger' | 'success';
}

export type MotorVoltageRating = 6 | 12 | 24;

export interface MotorSpec {
  id: string;
  name: string;
  ratedVoltage: MotorVoltageRating;
  powerWatts: number;
  torqueNm: number;
  maxRpm: number;
  currentFullLoadA: number;
  efficiencyPct: number;
  recommendedTrack: string;
  recommendedPack: string;
  description: string;
}

export const MOTOR_CATALOG: Record<string, MotorSpec> = {
  motor_6v: {
    id: 'motor_6v',
    name: 'มอเตอร์ประหยัดพลังงาน Eco (6V 200W)',
    ratedVoltage: 6,
    powerWatts: 200,
    torqueNm: 0.8,
    maxRpm: 1800,
    currentFullLoadA: 3.5,
    efficiencyPct: 88,
    recommendedTrack: 'ทางราบ (Flat Sprint) และ ทางไกล (Endurance)',
    recommendedPack: 'แพ็ก 2S 4P หรือ 4S 2P (ความจุสูง 4000-8000mAh)',
    description: 'กินกระแสน้อยมาก ไม่เปลืองแบตเตอรี่ วิ่งทางไกลได้ดีเยี่ยม แต่แรงบิดปีนเขาชันมีจำกัด',
  },
  motor_12v: {
    id: 'motor_12v',
    name: 'มอเตอร์สปอร์ตสมดุล Sport (12V 450W)',
    ratedVoltage: 12,
    powerWatts: 450,
    torqueNm: 1.6,
    maxRpm: 2600,
    currentFullLoadA: 4.2,
    efficiencyPct: 85,
    recommendedTrack: 'ทางเนินเขาปานกลาง และ สนามกรังด์ปรีซ์ผสม',
    recommendedPack: 'แพ็ก 4S 2P (ความจุ 4000mAh, แรงดัน 12V)',
    description: 'สมดุลยอดเยี่ยมระหว่างแรงบิดปีนเขาและความเร็วปลาย ใช้วิ่งขึ้นเขาได้ดีโดยแบตเตอรี่ไม่หมดเร็วเกินไป',
  },
  motor_24v: {
    id: 'motor_24v',
    name: 'มอเตอร์พลังแรงบิดสูง Monster (24V 800W)',
    ratedVoltage: 24,
    powerWatts: 800,
    torqueNm: 2.8,
    maxRpm: 3400,
    currentFullLoadA: 6.8,
    efficiencyPct: 82,
    recommendedTrack: 'ทางขึ้นเขาชันสูงจัด (Steep Hill Climb)',
    recommendedPack: 'แพ็ก 8S 1P (แรงดัน 24V, ความจุ 2000mAh)',
    description: 'แรงบิดมหาศาล ปีนเขาชัน 15-20% ได้เร็วที่สุด แต่กินพลังงานสูงมาก ภายใต้โควตา 8 เซลล์ แบตเตอรี่จะหมดเร็ว ต้องบริหารคันเร่งอย่างระมัดระวัง!',
  },
};

export interface BikeSetup {
  frameId?: string;
  frameName?: string;
  weightKg?: number;
  motorId?: string;
  motorName?: string;
  motorRatedVoltage?: number;
  motorVoltageRating?: MotorVoltageRating;
  motorPowerWatts?: number;
  motorTorqueNm?: number;
  batteryCellBudget?: number; // e.g. 8 cells quota
  motorMaxRpm?: number;
  tireType?: string;
  aerodynamics?: number;
  frameType?: string;
  frameColor?: string;
  gearRatio?: number;
  topSpeedKmh?: number;
  accelSeconds?: number;
  rangeKm?: number;
  motorType?: string;
  maxRpm?: number;
}

export interface Mission {
  id: string;
  code: string;
  title: string;
  targetScene: SceneId;
  objective: string;
  requiredVoltageMin: number;
  requiredVoltageMax: number;
  requiredCapacityMin: number;
  isUnlocked: boolean;
  isCompleted: boolean;
  stars: number;
  rewardExp: number;
  highestScore?: number;
  equipment?: string[];
  prerequisiteTitle?: string;
}

export interface RaceTelemetry {
  distanceMeters: number;
  speedKmh: number;
  batteryPercentage: number;
  motorTempC: number;
  elapsedSeconds: number;
  positionRank: number;
  isFinished: boolean;
}

export interface CompetitorFinishResult {
  id: string;
  name: string;
  isPlayer: boolean;
  avatarIcon: string;
  color: string;
  bikeDesc: string;
  finishTimeSeconds: number;
  rank: number;
  averageSpeedKmh: number;
  gapSeconds: number;
}

export interface ScoringBreakdown {
  rankPoints: number; // Max 12 pts (1st: 12, 2nd: 9, 3rd: 6, 4th: 3)
  speedPacingPoints: number; // Max 10 pts
  batteryEfficiencyPoints: number; // Max 8 pts
  totalPoints: number; // Max 30 pts
}

export interface RaceData {
  rank?: number;
  totalTimeSeconds?: number;
  topSpeedKmh?: number;
  averageSpeedKmh?: number;
  energyUsedMah?: number;
  remainingEnergyMah?: number;
  batteryPercentageRemaining?: number;
  selectedTrackId?: 'flat_sprint' | 'hill_climb' | 'endurance_route' | 'offroad_downhill';
  trackName?: string;
  trackDistanceMeters?: number;
  competitorResults?: CompetitorFinishResult[];
  raceScoreOutOf30?: number;
  bestRaceScore?: number;
  scoringBreakdown?: ScoringBreakdown;
  // Vocational Physics & Battery Tradeoff Reflections
  batteryExhaustedMidway?: boolean;
  stalledOnHill?: boolean;
  motorVoltageMatchRatio?: number;
  maxSlopeEncountered?: number;
  downhillEnergySavedWh?: number;
  regeneratedEnergyMah?: number;
  maxRegenPowerW?: number;
  chosenMotorVoltage?: number;
  chosenPackVoltage?: number;
}

export interface ReflectionScores {
  circuitCorrectnessOutOf30: number; // Max 30
  batterySuitabilityOutOf20: number; // Max 20
  racePerformanceOutOf30: number; // Max 30
  learningExplanationOutOf20: number; // Max 20
  totalScoreOutOf100: number; // Max 100
}

export interface LearningState {
  totalStars: number;
  expPoints: number;
  academyRank: string;
  completedQuizzesCount: number;
  conceptsUnderstood: string[];
  savedReflections?: Record<number, number>;
  evaluationScores?: ReflectionScores;
}

export interface GameState {
  currentScene: SceneId;
  previousScene?: SceneId;
  soundEnabled: boolean;
  musicEnabled: boolean;
  textSize: 'normal' | 'large';
  character: CharacterState;
  missions: Mission[];
  batteryPack: BatteryPackSetup;
  bike: BikeSetup;
  bikeSetup?: BikeSetup; // alias
  raceData?: RaceData;
  learning: LearningState;
  raceHistory: RaceTelemetry[];
}
