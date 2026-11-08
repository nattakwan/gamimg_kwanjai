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
  hairStyle: 'spiky' | 'sleek_bob' | 'ponytail' | 'curly' | 'short_crop';
  hairColor: string;
  skinTone: string;
  jacketStyle: 'speed_jumpsuit' | 'lab_coat' | 'cyber_armor' | 'flight_bomber';
  trousersStyle: 'cargo_tech' | 'sleek_racer' | 'thermal_pants';
  gogglesStyle: 'none' | 'cyber_visor' | 'brass_round' | 'twin_tech';
  outfitColor: string;
  suitColor: string;
  helmetStyle: 'aerodynamic' | 'speedster' | 'cyber' | 'classic';
  title: string;
}

export type CellType = 'AA_1_5V';

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

export interface BikeSetup {
  frameId?: string;
  frameName?: string;
  weightKg?: number;
  motorId?: string;
  motorName?: string;
  motorRatedVoltage?: number;
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
  selectedTrackId?: 'flat_sprint' | 'hill_climb' | 'endurance_route';
  trackName?: string;
  trackDistanceMeters?: number;
  competitorResults?: CompetitorFinishResult[];
  raceScoreOutOf30?: number;
  bestRaceScore?: number;
  scoringBreakdown?: ScoringBreakdown;
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
