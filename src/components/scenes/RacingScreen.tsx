/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Zap,
  Gauge,
  BatteryCharging,
  Flag,
  ArrowRight,
  RotateCcw,
  Sparkles,
  Trophy,
  Mountain,
  Milestone,
  Pause,
  Play,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Volume2,
  VolumeX,
  AlertTriangle,
  Scale,
  ShieldAlert,
} from 'lucide-react';
import { useGameState } from '../../context/GameStateContext';
import { AvatarRenderer } from '../common/AvatarRenderer';
import { Racing3DRenderer, RacerUpdate } from '../../racing3d/Racing3DRenderer';
import { getStageBatteryItems, BatteryPickupConfig } from '../../racing3d/batteryPickupsConfig';

// Web Audio sound generator for racing immersion
const playRacingTone = (
  type: 'pedal' | 'motor_hum' | 'brake' | 'boost' | 'rank_change' | 'finish' | 'regen' | 'pickup',
  freq: number = 440,
  duration: number = 0.12
) => {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    if (type === 'motor_hum') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    } else if (type === 'brake') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, ctx.currentTime);
      gain.gain.setValueAtTime(0.09, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    } else if (type === 'regen') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(420, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(840, ctx.currentTime + duration);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    } else if (type === 'boost') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(260, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(620, ctx.currentTime + duration);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    } else if (type === 'finish') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime);
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.15);
      osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7);
    } else if (type === 'rank_change') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    } else if (type === 'pickup') {
      // Crystal energy pickup chime (ascending D5 -> A5)
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880.0, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
    } else {
      // pedal click
      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, ctx.currentTime);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
    }

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + (type === 'finish' ? 0.7 : duration));
  } catch {
    // Ignore audio errors in restricted browser states
  }
};

interface AIRiderState {
  id: string;
  name: string;
  shortName: string;
  icon: string;
  color: string;
  z: number; // distance along track in meters
  x: number; // lateral offset (-1 left to +1 right)
  speedMps: number;
  batteryRemainingMah: number;
  totalCapacityMah: number;
  internalResistance: number;
  stamina: number; // 0 - 100
  targetLaneX: number;
  strategy: 'sprint_burst' | 'steady_pacing' | 'hill_power';
  isFinished: boolean;
  finishTimeSeconds: number | null;
}

export const RacingScreen: React.FC = () => {
  const { state, goToScene, updateRaceData, completeMission } = useGameState();

  // Track setup determined in RacePrepScreen
  const trackId = state.raceData?.selectedTrackId || 'flat_sprint';
  const isHillClimb = trackId === 'hill_climb';
  const isEndurance = trackId === 'endurance_route';
  const isOffroadDownhill = trackId === 'offroad_downhill';

  const totalTrackLength =
    state.raceData?.trackDistanceMeters ||
    (trackId === 'hill_climb'
      ? 600
      : trackId === 'endurance_route'
      ? 1200
      : trackId === 'offroad_downhill'
      ? 800
      : 400);

  const trackName =
    state.raceData?.trackName ||
    (trackId === 'hill_climb'
      ? 'ฮิลล์ ไคลมบ์ (Hill Climb - 600m)'
      : trackId === 'endurance_route'
      ? 'เอนดูรานซ์ รูท (Endurance Route - 1,200m)'
      : trackId === 'offroad_downhill'
      ? 'เอ็มเอ็กซ์ ออฟโรด ดาวน์ฮิลล์ (MX Downhill - 800m)'
      : 'แฟลต สปรินต์ (Flat Sprint - 400m)');

  const totalLaps = isEndurance ? 3 : 1;
  const lapLength = totalTrackLength / totalLaps;

  // Real saved battery pack & motor specs from GameState
  const nominalPackV = state.batteryPack.nominalVoltage || state.batteryPack.totalVoltage || 12.0;
  const totalCapacityMah = state.batteryPack.nominalCapacityMah || state.batteryPack.totalCapacityMah || 4000;
  // DeepSeek V4 Pro Balance: Starting battery charge fixed at 50% across all race stages
  const initialBatteryMah = Math.round(totalCapacityMah * 0.50);
  const internalResistance =
    state.batteryPack.internalResistance || (state.batteryPack.parallelCount === 2 ? 0.15 : 0.30);
  const bikeColor = state.bike?.frameColor || state.bikeSetup?.frameColor || '#0284c7';

  // Chosen Motor Rating (6V, 12V, 24V)
  const chosenMotorVoltage =
    state.bikeSetup?.motorVoltageRating || state.bikeSetup?.motorRatedVoltage || 12;
  const motorName = state.bikeSetup?.motorName || `มอเตอร์ ${chosenMotorVoltage}V`;

  // Battery Energy Pickups Setup
  const stagePickupsConfig = useRef(getStageBatteryItems(trackId));
  const totalPickupsAvailable = stagePickupsConfig.current.length;
  const [itemsCollectedCount, setItemsCollectedCount] = useState<number>(0);
  const [pickupToast, setPickupToast] = useState<{ id: number; text: string } | null>(null);
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  const showPickupToast = useCallback((text: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setPickupToast({ id: Date.now(), text });
    toastTimerRef.current = setTimeout(() => {
      setPickupToast(null);
    }, 1800);
  }, []);

  // Game flow states
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [raceFinished, setRaceFinished] = useState<boolean>(false);
  const [raceTimeSeconds, setRaceTimeSeconds] = useState<number>(0);
  const [playerRank, setPlayerRank] = useState<number>(2);

  // Failure & Tradeoff States
  const [hasBatteryExhausted, setHasBatteryExhausted] = useState<boolean>(false);
  const [isStalledOnHill, setIsStalledOnHill] = useState<boolean>(false);
  const [downhillSavedWh, setDownhillSavedWh] = useState<number>(0);

  // Controls input state (touch and keyboard)
  const [isPedaling, setIsPedaling] = useState<boolean>(false);
  const [isBraking, setIsBraking] = useState<boolean>(false);
  const [isSteeringLeft, setIsSteeringLeft] = useState<boolean>(false);
  const [isSteeringRight, setIsSteeringRight] = useState<boolean>(false);
  const [isMotorAssistActive, setIsMotorAssistActive] = useState<boolean>(false);

  // Player physics state
  const [playerZ, setPlayerZ] = useState<number>(0); // distance in meters
  const [playerX, setPlayerX] = useState<number>(0); // lateral offset (-1 to +1)
  const [playerSpeedMps, setPlayerSpeedMps] = useState<number>(0); // m/s
  const [batteryRemainingMah, setBatteryRemainingMah] = useState<number>(initialBatteryMah);
  const [topSpeedKmhRecorded, setTopSpeedKmhRecorded] = useState<number>(0);
  const [playerFinishTime, setPlayerFinishTime] = useState<number | null>(null);

  // Electrical HUD states
  const [loadedVoltageV, setLoadedVoltageV] = useState<number>(nominalPackV);
  const [motorCurrentA, setMotorCurrentA] = useState<number>(0);
  const [motorPowerW, setMotorPowerW] = useState<number>(0);
  const [humanPowerW, setHumanPowerW] = useState<number>(0);
  const [pedalCadenceRpm, setPedalCadenceRpm] = useState<number>(0);

  // Regenerative Braking (KERS) States
  const [totalRegeneratedMah, setTotalRegeneratedMah] = useState<number>(0);
  const [regenCurrentA, setRegenCurrentA] = useState<number>(0);
  const [regenPowerW, setRegenPowerW] = useState<number>(0);
  const [isRegenActive, setIsRegenActive] = useState<boolean>(false);

  // 3 AI Opponents (Starting with 50% battery capacity)
  const [aiRiders, setAiRiders] = useState<AIRiderState[]>([
    {
      id: 'racer_tina',
      name: 'เทอร์โบ ทีน่า (Turbo Tina)',
      shortName: 'ทีน่า',
      icon: '🚀',
      color: '#a855f7',
      z: 0,
      x: -0.6,
      speedMps: 0,
      batteryRemainingMah: 2000,
      totalCapacityMah: 4000,
      internalResistance: 0.15,
      stamina: 100,
      targetLaneX: -0.6,
      strategy: 'steady_pacing',
      isFinished: false,
      finishTimeSeconds: null,
    },
    {
      id: 'racer_sam',
      name: 'สปีดี้ แซม (Speedy Sam)',
      shortName: 'แซม',
      icon: '⚡',
      color: '#ef4444',
      z: 0,
      x: 0.5,
      speedMps: 0,
      batteryRemainingMah: 1000,
      totalCapacityMah: 2000,
      internalResistance: 0.30,
      stamina: 100,
      targetLaneX: 0.5,
      strategy: 'sprint_burst',
      isFinished: false,
      finishTimeSeconds: null,
    },
    {
      id: 'racer_captain',
      name: 'กัปตัน บิ๊กบล็อก (Captain Big-Block)',
      shortName: 'บิ๊กบล็อก',
      icon: '🛡️',
      color: '#f59e0b',
      z: 0,
      x: 0.85,
      speedMps: 0,
      batteryRemainingMah: 3000,
      totalCapacityMah: 6000,
      internalResistance: 0.12,
      stamina: 100,
      targetLaneX: 0.85,
      strategy: 'hill_power',
      isFinished: false,
      finishTimeSeconds: null,
    },
  ]);

  const container3dRef = useRef<HTMLDivElement | null>(null);
  const renderer3dRef = useRef<Racing3DRenderer | null>(null);
  const prevRankRef = useRef<number>(playerRank);

  // Authoritative simulation state stored in ref: never triggers React effect teardowns or dt crushing
  const simRef = useRef({
    playerZ: 0,
    playerX: 0,
    playerSpeedMps: 0,
    batteryRemainingMah: initialBatteryMah,
    pickups: getStageBatteryItems(trackId).map((item) => ({ ...item, collected: false })),
    itemsCollectedCount: 0,
    batteryEnergyRecoveredMah: 0,
    raceTimeSeconds: 0,
    topSpeedKmhRecorded: 0,
    playerFinishTime: null as number | null,
    raceFinished: false,
    isPaused: false,
    isStalledOnHill: false,
    hasBatteryExhausted: false,
    downhillSavedWh: 0,
    totalRegeneratedMah: 0,
    humanPowerW: 0,
    pedalCadenceRpm: 0,
    loadedVoltageV: nominalPackV,
    motorCurrentA: 0,
    motorPowerW: 0,
    regenCurrentA: 0,
    regenPowerW: 0,
    isRegenActive: false,
    isPedaling: false,
    isBraking: false,
    isSteeringLeft: false,
    isSteeringRight: false,
    isMotorAssistActive: false,
    playerRank: 2,
    aiRiders: [
      {
        id: 'racer_tina',
        name: 'เทอร์โบ ทีน่า (Turbo Tina)',
        shortName: 'ทีน่า',
        icon: '🚀',
        color: '#a855f7',
        z: 0,
        x: -0.6,
        speedMps: 0,
        batteryRemainingMah: 2000,
        totalCapacityMah: 4000,
        internalResistance: 0.15,
        stamina: 100,
        targetLaneX: -0.6,
        strategy: 'steady_pacing' as const,
        isFinished: false,
        finishTimeSeconds: null as number | null,
      },
      {
        id: 'racer_sam',
        name: 'สปีดี้ แซม (Speedy Sam)',
        shortName: 'แซม',
        icon: '⚡',
        color: '#ef4444',
        z: 0,
        x: 0.5,
        speedMps: 0,
        batteryRemainingMah: 1000,
        totalCapacityMah: 2000,
        internalResistance: 0.30,
        stamina: 100,
        targetLaneX: 0.5,
        strategy: 'sprint_burst' as const,
        isFinished: false,
        finishTimeSeconds: null as number | null,
      },
      {
        id: 'racer_captain',
        name: 'กัปตัน บิ๊กบล็อก (Captain Big-Block)',
        shortName: 'บิ๊กบล็อก',
        icon: '🛡️',
        color: '#f59e0b',
        z: 0,
        x: 0.85,
        speedMps: 0,
        batteryRemainingMah: 3000,
        totalCapacityMah: 6000,
        internalResistance: 0.12,
        stamina: 100,
        targetLaneX: 0.85,
        strategy: 'hill_power' as const,
        isFinished: false,
        finishTimeSeconds: null as number | null,
      },
    ],
  });

  // Track slope computation based on trackId and distance z
  const getTrackSlopePercent = useCallback(
    (z: number) => {
      if (isOffroadDownhill) {
        if (z < 65) return -4;   // Ridge roll-in (-4%)
        if (z < 180) return -20; // Steep gully descent (-20%)
        if (z < 280) return -22; // Extreme technical rock downhill (-22%)
        if (z < 380) return 8;   // Jump kicker ramp (+8%)
        if (z < 460) return -16; // Air landing slope (-16%)
        if (z < 600) return -9;  // Winding canyon descent (-9%)
        if (z < 720) return -3;  // Flattening dirt run (-3%)
        return 0;                // Finish arena (0%)
      }
      if (isHillClimb) {
        if (z < 100) return 5;
        if (z < 250) return 14; // Steep climb 1 (+14%)
        if (z < 360) return -9; // Downhill valley (-9%)
        if (z < 510) return 16; // Steep climb 2 to summit (+16%)
        return -2;              // Crest to finish (-2%)
      }
      if (isEndurance) {
        return Math.sin((z / 90) * Math.PI) * 4.5;
      }
      return 0; // Flat sprint
    },
    [isHillClimb, isEndurance, isOffroadDownhill]
  );

  // Control Actions (Synchronously updates simRef and sets React state for HUD / button highlights)
  const handlePedalStart = useCallback(() => {
    simRef.current.isPedaling = true;
    setIsPedaling(true);
    playRacingTone('pedal');
  }, []);

  const handlePedalEnd = useCallback(() => {
    simRef.current.isPedaling = false;
    setIsPedaling(false);
  }, []);

  const handleBrakeStart = useCallback(() => {
    simRef.current.isBraking = true;
    setIsBraking(true);
    playRacingTone(simRef.current.isRegenActive ? 'regen' : 'brake');
  }, []);

  const handleBrakeEnd = useCallback(() => {
    simRef.current.isBraking = false;
    setIsBraking(false);
  }, []);

  const handleSteerLeftStart = useCallback(() => {
    simRef.current.isSteeringLeft = true;
    setIsSteeringLeft(true);
  }, []);

  const handleSteerLeftEnd = useCallback(() => {
    simRef.current.isSteeringLeft = false;
    setIsSteeringLeft(false);
  }, []);

  const handleSteerRightStart = useCallback(() => {
    simRef.current.isSteeringRight = true;
    setIsSteeringRight(true);
  }, []);

  const handleSteerRightEnd = useCallback(() => {
    simRef.current.isSteeringRight = false;
    setIsSteeringRight(false);
  }, []);

  const handleToggleMotor = useCallback(() => {
    if (simRef.current.batteryRemainingMah <= 5) return;
    const next = !simRef.current.isMotorAssistActive;
    simRef.current.isMotorAssistActive = next;
    setIsMotorAssistActive(next);
    if (next) playRacingTone('boost');
  }, []);

  const handleTogglePause = useCallback(() => {
    const next = !simRef.current.isPaused;
    simRef.current.isPaused = next;
    setIsPaused(next);
  }, []);

  const handleRestartRace = useCallback(() => {
    const sim = simRef.current;
    sim.playerZ = 0;
    sim.playerX = 0;
    sim.playerSpeedMps = 0;
    sim.raceTimeSeconds = 0;
    const initialBatt = Math.round(totalCapacityMah * 0.50);
    sim.batteryRemainingMah = initialBatt;
    sim.topSpeedKmhRecorded = 0;
    sim.playerFinishTime = null;
    sim.raceFinished = false;
    sim.isPaused = false;
    sim.isStalledOnHill = false;
    sim.hasBatteryExhausted = false;
    sim.downhillSavedWh = 0;
    sim.totalRegeneratedMah = 0;
    sim.playerRank = 2;
    sim.pickups = getStageBatteryItems(trackId).map((item) => ({ ...item, collected: false }));
    sim.itemsCollectedCount = 0;
    sim.batteryEnergyRecoveredMah = 0;
    renderer3dRef.current?.resetPickups();
    sim.aiRiders = sim.aiRiders.map((ai) => ({
      ...ai,
      z: 0,
      x: ai.targetLaneX,
      speedMps: 0,
      isFinished: false,
      finishTimeSeconds: null,
      batteryRemainingMah: Math.round(ai.totalCapacityMah * 0.50),
    }));
    setPlayerZ(0);
    setPlayerSpeedMps(0);
    setRaceTimeSeconds(0);
    setBatteryRemainingMah(initialBatt);
    setItemsCollectedCount(0);
    setPlayerRank(2);
    setIsPaused(false);
    setRaceFinished(false);
    setIsStalledOnHill(false);
    setHasBatteryExhausted(false);
  }, [totalCapacityMah, trackId]);

  // Keyboard controls listener (Registered once at mount; reads/writes directly to simRef)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
        handleTogglePause();
        return;
      }
      if (simRef.current.isPaused || simRef.current.raceFinished) return;

      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        simRef.current.isPedaling = true;
        setIsPedaling(true);
      }
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        simRef.current.isBraking = true;
        setIsBraking(true);
      }
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        simRef.current.isSteeringLeft = true;
        setIsSteeringLeft(true);
      }
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        simRef.current.isSteeringRight = true;
        setIsSteeringRight(true);
      }
      if (e.key === ' ' || e.key === 'Shift') {
        if (!e.repeat) {
          handleToggleMotor();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        simRef.current.isPedaling = false;
        setIsPedaling(false);
      }
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        simRef.current.isBraking = false;
        setIsBraking(false);
      }
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        simRef.current.isSteeringLeft = false;
        setIsSteeringLeft(false);
      }
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        simRef.current.isSteeringRight = false;
        setIsSteeringRight(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleTogglePause, handleToggleMotor]);

  // ----------------- AUTHORITATIVE GAME & RENDER LOOP (DeepSeek V4 Pro) -----------------
  // Single requestAnimationFrame loop: integrates physics + AI at 60 FPS, updates 3D scene directly,
  // and throttles React HUD state pushes to 20 Hz (50ms). Never remounts or resets dt during race!
  useEffect(() => {
    if (!container3dRef.current) return;
    const renderer = new Racing3DRenderer(
      container3dRef.current,
      trackId,
      totalTrackLength,
      totalLaps
    );
    renderer3dRef.current = renderer;

    let animId: number;
    let lastTick = performance.now();
    let lastHud = performance.now();

    const gameLoop = (now: number) => {
      let dt = (now - lastTick) / 1000;
      lastTick = now;

      // DeepSeek clamp: never simulate more than 50ms in one step (guards against tab-switch & GC pauses)
      if (dt > 0.05) dt = 0.05;
      if (dt < 0.001) dt = 0.001;

      const sim = simRef.current;

      if (!sim.isPaused && !sim.raceFinished) {
        sim.raceTimeSeconds += dt;

        // ----------------- PLAYER PHYSICS -----------------
        const totalMassKg = 82; // rider (70kg) + bicycle & battery (12kg)
        const gravity = 9.81;
        const currentSlope = getTrackSlopePercent(sim.playerZ);
        const slopeRadians = Math.atan(currentSlope / 100);

        // 1. Forces resisting motion
        const rollingResistanceN = 0.004 * totalMassKg * gravity * Math.cos(slopeRadians);
        const aeroDragN = 0.5 * 1.225 * 0.36 * Math.pow(sim.playerSpeedMps, 2);
        const slopeForceN = totalMassKg * gravity * Math.sin(slopeRadians);
        const brakeForceN = sim.isBraking ? 200 : 0;

        // 2. Human Pedaling Force
        let humanPower = 0;
        let humanForceN = 0;
        if (sim.isPedaling && !sim.isBraking) {
          humanPower = 245 + Math.sin(now * 0.008) * 25;
          humanForceN = Math.min(130, humanPower / Math.max(sim.playerSpeedMps, 2.0));
        } else if (!sim.isBraking) {
          humanPower = 115 + Math.sin(now * 0.005) * 15;
          humanForceN = Math.min(60, humanPower / Math.max(sim.playerSpeedMps, 2.5));
        }
        sim.humanPowerW = Math.round(humanPower);
        sim.pedalCadenceRpm = sim.isPedaling
          ? Math.round(75 + sim.playerSpeedMps * 3.5)
          : sim.playerSpeedMps > 0.5
          ? Math.round(45 + sim.playerSpeedMps * 2.5)
          : 0;

        // 3. Electric Motor Assist Force
        let motorThrustForceN = 0;
        let motorCurrent = 0;
        let loadedVoltage = nominalPackV;
        let motorPower = 0;

        const hasBatteryJuice = sim.batteryRemainingMah > 5;
        if (!hasBatteryJuice && !sim.hasBatteryExhausted) {
          sim.hasBatteryExhausted = true;
        }

        const maxMotorCurrentA = chosenMotorVoltage === 24 ? 6.8 : chosenMotorVoltage === 12 ? 4.2 : 3.5;
        const voltageMatchRatio = Math.min(1.0, nominalPackV / chosenMotorVoltage);
        const powerEfficiency = Math.pow(voltageMatchRatio, 2);

        if (sim.isMotorAssistActive && hasBatteryJuice && !sim.isBraking) {
          const openCircuitV = nominalPackV * (0.95 + 0.05 * (sim.batteryRemainingMah / totalCapacityMah));
          const motorBackEmfV = Math.min(openCircuitV * 0.85, sim.playerSpeedMps * (chosenMotorVoltage * 0.035));
          const motorWindingR = chosenMotorVoltage === 24 ? 0.45 : chosenMotorVoltage === 12 ? 0.65 : 0.85;

          const effectiveCurrent = Math.max(
            0.6,
            (openCircuitV - motorBackEmfV) / (motorWindingR + internalResistance)
          );
          motorCurrent = Math.min(maxMotorCurrentA, effectiveCurrent);
          loadedVoltage = Math.max(1.2, openCircuitV - motorCurrent * internalResistance);

          const elecPower = loadedVoltage * motorCurrent;
          motorPower = Math.round(
            elecPower * (chosenMotorVoltage === 24 ? 5.8 : chosenMotorVoltage === 12 ? 9.5 : 18) * powerEfficiency
          );

          const speedFactor = Math.max(sim.playerSpeedMps, 2.0);
          const maxThrust = chosenMotorVoltage === 24 ? 125 : chosenMotorVoltage === 12 ? 85 : 55;
          motorThrustForceN = Math.min(maxThrust, (motorPower * 0.88) / speedFactor) * voltageMatchRatio;

          const drainMultiplier = chosenMotorVoltage === 24 ? 4.8 : 4.2;
          const drainMah = (motorCurrent * 1000 * dt * drainMultiplier) / 3600;
          sim.batteryRemainingMah = Math.max(0, sim.batteryRemainingMah - drainMah);
        } else if (sim.isMotorAssistActive && !hasBatteryJuice) {
          sim.isMotorAssistActive = false;
          setIsMotorAssistActive(false);
        }

        if (currentSlope < 0 && !sim.isMotorAssistActive && sim.playerSpeedMps > 2.5) {
          sim.downhillSavedWh += (chosenMotorVoltage * 3.5 * dt) / 3600;
        }

        // 3.1 Regenerative Braking (KERS)
        let regenCurrent = 0;
        let regenPower = 0;
        let regenBrakingForceN = 0;
        const isRegenCandidate =
          (sim.isBraking && sim.playerSpeedMps > 1.8) ||
          (currentSlope < -8 && sim.playerSpeedMps > 4.5 && !sim.isMotorAssistActive);

        if (isRegenCandidate && sim.batteryRemainingMah < totalCapacityMah) {
          const genKvFactor = chosenMotorVoltage * 0.052;
          const inducedGenV = sim.playerSpeedMps * genKvFactor;

          if (inducedGenV > nominalPackV * 0.55 || sim.isBraking) {
            const rawRegenA = Math.max(
              0,
              (inducedGenV - nominalPackV * 0.5) / (0.55 + internalResistance)
            );
            regenCurrent = Math.min(5.2, rawRegenA * (sim.isBraking ? 1.0 : 0.65));

            if (regenCurrent > 0.15) {
              regenPower = Math.round(nominalPackV * regenCurrent);
              regenBrakingForceN = Math.min(130, (regenPower * 0.95) / Math.max(sim.playerSpeedMps, 1.5));
              const rechargeMah = (regenCurrent * 1000 * dt * 0.75) / 3600;
              sim.batteryRemainingMah = Math.min(totalCapacityMah, sim.batteryRemainingMah + rechargeMah);
              sim.totalRegeneratedMah += rechargeMah;
              sim.isRegenActive = true;
            } else {
              sim.isRegenActive = false;
            }
          } else {
            sim.isRegenActive = false;
          }
        } else {
          sim.isRegenActive = false;
        }

        sim.regenCurrentA = Number(regenCurrent.toFixed(2));
        sim.regenPowerW = regenPower;
        sim.motorCurrentA = Number(motorCurrent.toFixed(2));
        sim.loadedVoltageV = Number(loadedVoltage.toFixed(2));
        sim.motorPowerW = Math.round(motorPower);

        // 4. Net acceleration
        const netForceN =
          humanForceN +
          motorThrustForceN -
          aeroDragN -
          rollingResistanceN -
          slopeForceN -
          brakeForceN -
          regenBrakingForceN;
        const accelerationMps2 = netForceN / totalMassKg;

        // 5. Update speed
        sim.playerSpeedMps = Math.max(0, sim.playerSpeedMps + accelerationMps2 * dt);
        const speedKmh = sim.playerSpeedMps * 3.6;
        sim.topSpeedKmhRecorded = Math.max(sim.topSpeedKmhRecorded, Math.round(speedKmh));

        // Stall detection on steep uphill
        if (isHillClimb && currentSlope >= 10 && sim.playerSpeedMps <= 0.25 && sim.playerZ > 50 && !sim.isStalledOnHill) {
          if (!hasBatteryJuice || voltageMatchRatio < 0.6) {
            sim.isStalledOnHill = true;
            playRacingTone('brake');
          }
        }

        // 6. Update distance
        sim.playerZ += sim.playerSpeedMps * dt;
        if (sim.playerZ >= totalTrackLength) {
          sim.playerZ = totalTrackLength;
          if (!sim.raceFinished) {
            sim.playerFinishTime = sim.raceTimeSeconds;
            sim.raceFinished = true;
            setRaceFinished(true);
            setPlayerFinishTime(sim.raceTimeSeconds);
            playRacingTone('finish');
          }
        }

        // 7. Update Steering (Lateral Position X: -1.0 to +1.0)
        let lateralVelocity = 0;
        if (sim.isSteeringLeft) lateralVelocity -= 2.0;
        if (sim.isSteeringRight) lateralVelocity += 2.0;
        sim.playerX = Math.max(-1.0, Math.min(1.0, sim.playerX + lateralVelocity * dt));

        // 8. Battery Energy Pickups Collision (DeepSeek V4 Pro)
        for (const item of sim.pickups) {
          if (item.collected) continue;
          const dz = Math.abs(sim.playerZ - item.z);
          const dx = Math.abs(sim.playerX - item.x);
          // Collision tolerance: 2.5m longitudinal window, 0.40 normalized lateral window (~1.28m)
          if (dz <= 2.5 && dx <= 0.40) {
            item.collected = true;
            sim.itemsCollectedCount += 1;
            const addedMah = Math.round(totalCapacityMah * item.valuePct);
            sim.batteryRemainingMah = Math.min(totalCapacityMah, sim.batteryRemainingMah + addedMah);
            sim.batteryEnergyRecoveredMah += addedMah;
            renderer3dRef.current?.collectPickup(item.id);
            playRacingTone('pickup');
            const pctText = Math.round(item.valuePct * 100);
            showPickupToast(`+${pctText}% แบตเตอรี่ (+${addedMah} mAh)`);
          }
        }

        // ----------------- AI OPPONENTS PHYSICS -----------------
        sim.aiRiders = sim.aiRiders.map((ai) => {
          if (ai.isFinished) return ai;

          const aiSlope = getTrackSlopePercent(ai.z);
          const aiSlopeRad = Math.atan(aiSlope / 100);
          const aiSlopeForce = 82 * gravity * Math.sin(aiSlopeRad);
          const aiDrag = 0.5 * 1.225 * 0.36 * Math.pow(ai.speedMps, 2);
          const aiRoll = 0.004 * 82 * gravity;

          let aiTotalForwardWatts = 220;
          if (ai.strategy === 'sprint_burst') {
            if (ai.z < totalTrackLength * 0.32) {
              aiTotalForwardWatts = 340;
            } else if (ai.z < totalTrackLength * 0.65) {
              aiTotalForwardWatts = 230;
            } else {
              aiTotalForwardWatts = 195;
            }
            if (aiSlope > 4) aiTotalForwardWatts = Math.max(210, aiTotalForwardWatts);
          } else if (ai.strategy === 'steady_pacing') {
            aiTotalForwardWatts = aiSlope > 4 ? 310 : 270;
          } else if (ai.strategy === 'hill_power') {
            aiTotalForwardWatts = aiSlope > 4 ? 350 : 230;
          }

          const cap = aiSlope > 4 ? 185 : 95;
          const minSpeedForThrust = aiSlope > 4 ? 1.0 : 2.4;
          const aiThrustForce = Math.min(cap, aiTotalForwardWatts / Math.max(ai.speedMps, minSpeedForThrust));
          const aiNetForce = aiThrustForce - aiDrag - aiRoll - aiSlopeForce;
          const aiAccel = aiNetForce / 82;
          const newAiSpeed = Math.max(0, ai.speedMps + aiAccel * dt);

          let newAiZ = ai.z + newAiSpeed * dt;
          let isAiDone: boolean = ai.isFinished;
          let aiDoneTime: number | null = ai.finishTimeSeconds;

          if (newAiZ >= totalTrackLength) {
            newAiZ = totalTrackLength;
            isAiDone = true;
            aiDoneTime = aiDoneTime ?? sim.raceTimeSeconds;
          }

          const laneSway = Math.sin(now * 0.002 + ai.z * 0.05) * 0.15;
          const targetX = Math.max(-0.9, Math.min(0.9, ai.targetLaneX + laneSway));
          const aiDrain = (1.5 * dt * 4.2 * 1000) / 3600;

          return {
            ...ai,
            z: newAiZ,
            x: targetX,
            speedMps: newAiSpeed,
            batteryRemainingMah: Math.max(0, ai.batteryRemainingMah - aiDrain),
            isFinished: isAiDone,
            finishTimeSeconds: aiDoneTime,
          };
        });

        // Compute Live Ranking
        let rank = 1;
        sim.aiRiders.forEach((ai) => {
          if (ai.isFinished && !sim.playerFinishTime) {
            rank++;
          } else if (ai.isFinished && sim.playerFinishTime) {
            if (ai.finishTimeSeconds! < sim.playerFinishTime) rank++;
          } else if (ai.z > sim.playerZ) {
            rank++;
          }
        });

        if (rank !== prevRankRef.current) {
          if (rank < prevRankRef.current) {
            playRacingTone('rank_change', 650);
          } else {
            playRacingTone('rank_change', 320);
          }
          prevRankRef.current = rank;
        }
        sim.playerRank = rank;
      }

      // ─── Direct Synchronous 3D Rendering Update (No React delay) ───
      if (renderer3dRef.current) {
        const playerBattPct = Math.round((sim.batteryRemainingMah / totalCapacityMah) * 100);
        const racerUpdates: RacerUpdate[] = [
          {
            id: 'player',
            name: `${state.character.name} (คุณ)`,
            z: sim.playerZ,
            x: sim.playerX,
            speedMps: sim.playerSpeedMps,
            isPedaling: sim.isPedaling,
            isMotorActive: sim.isMotorAssistActive && sim.batteryRemainingMah > 5 && !sim.isBraking,
            isBraking: sim.isBraking,
            batteryPct: playerBattPct,
            color: bikeColor,
            isPlayer: true,
            jerseyColor: state.character.outfitColor || '#0284c7',
            bikeColor: bikeColor,
            character: state.character,
            slopePercent: getTrackSlopePercent(sim.playerZ),
            isRegenActive: sim.isRegenActive,
          },
          ...sim.aiRiders.map((ai) => ({
            id: ai.id,
            name: ai.name,
            z: ai.z,
            x: ai.x,
            speedMps: ai.speedMps,
            isPedaling: ai.speedMps > 0.5,
            isMotorActive: ai.batteryRemainingMah > 20,
            isBraking: false,
            slopePercent: getTrackSlopePercent(ai.z),
            isRegenActive: false,
            batteryPct: Math.round((ai.batteryRemainingMah / ai.totalCapacityMah) * 100),
            color: ai.color,
            isPlayer: false,
            jerseyColor: ai.color,
            bikeColor: ai.color,
            character: (ai.id === 'racer_sam' || ai.id === 'ai_speedy') ? {
              name: 'Speedy Sam',
              gender: 'cadet_boy' as const,
              bodyType: 'boy' as const,
              hairStyle: 'spiky' as const,
              hairColor: '#ea580c',
              skinTone: '#fed7aa',
              jacketStyle: 'speed_jumpsuit' as const,
              outfitColor: '#ea580c',
              suitColor: '#ea580c',
              avatarId: 'cadet_boy',
              trousersStyle: 'sleek_racer' as const,
              gogglesStyle: 'cyber_visor' as const,
              helmetStyle: 'speedster' as const,
              title: 'Speed Specialist',
            } : (ai.id === 'racer_tina' || ai.id === 'ai_tina') ? {
              name: 'Turbo Tina',
              gender: 'cadet_girl' as const,
              bodyType: 'girl' as const,
              hairStyle: 'ponytail' as const,
              hairColor: '#ec4899',
              skinTone: '#ffedd5',
              jacketStyle: 'speed_jumpsuit' as const,
              outfitColor: '#a855f7',
              suitColor: '#a855f7',
              avatarId: 'cadet_girl',
              trousersStyle: 'sleek_racer' as const,
              gogglesStyle: 'none' as const,
              helmetStyle: 'aerodynamic' as const,
              title: 'Aero Specialist',
            } : {
              name: 'Captain Big-Block',
              gender: 'cadet_boy' as const,
              bodyType: 'boy' as const,
              hairStyle: 'short_crop' as const,
              hairColor: '#78350f',
              skinTone: '#d97706',
              faceStyle: 3,
              jacketStyle: 'cyber_armor' as const,
              outfitColor: '#eab308',
              suitColor: '#eab308',
              avatarId: 'cadet_boy',
              trousersStyle: 'cargo_tech' as const,
              gogglesStyle: 'twin_tech' as const,
              helmetStyle: 'cyber' as const,
              title: 'Torque Monster',
            },
          })),
        ];
        renderer3dRef.current.update(racerUpdates, dt);
      }

      // ─── Throttled React HUD State Push (~20 Hz / 50ms) ───
      if (now - lastHud >= 50) {
        lastHud = now;
        setPlayerZ(sim.playerZ);
        setPlayerSpeedMps(sim.playerSpeedMps);
        setRaceTimeSeconds(Number(sim.raceTimeSeconds.toFixed(1)));
        setBatteryRemainingMah(sim.batteryRemainingMah);
        setPlayerRank(sim.playerRank);
        setHumanPowerW(sim.humanPowerW);
        setPedalCadenceRpm(sim.pedalCadenceRpm);
        setMotorPowerW(sim.motorPowerW);
        setMotorCurrentA(sim.motorCurrentA);
        setLoadedVoltageV(sim.loadedVoltageV);
        setTopSpeedKmhRecorded(sim.topSpeedKmhRecorded);
        setRegenCurrentA(sim.regenCurrentA);
        setRegenPowerW(sim.regenPowerW);
        setIsRegenActive(sim.isRegenActive);
        setIsStalledOnHill(sim.isStalledOnHill);
        setHasBatteryExhausted(sim.hasBatteryExhausted);
        setDownhillSavedWh(sim.downhillSavedWh);
        setTotalRegeneratedMah(sim.totalRegeneratedMah);
        setAiRiders(sim.aiRiders);
        setItemsCollectedCount(sim.itemsCollectedCount);
      }

      animId = requestAnimationFrame(gameLoop);
    };

    animId = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animId);
      renderer.dispose();
      renderer3dRef.current = null;
    };
  }, [trackId, totalTrackLength, totalLaps, nominalPackV, chosenMotorVoltage, totalCapacityMah, internalResistance, isHillClimb, getTrackSlopePercent, bikeColor, state.character]);

  // Complete and transition to Race Results with real 4-racer finish order
  const handleProceedToResults = () => {
    const sim = simRef.current;
    const finalPlayerTime = Number((sim.playerFinishTime || sim.raceTimeSeconds || 1).toFixed(1));
    const avgSpeed = Math.round((totalTrackLength / Math.max(1, finalPlayerTime)) * 3.6);
    const energyUsed = Math.round(totalCapacityMah - sim.batteryRemainingMah);
    const remainingEnergy = Math.max(0, Math.round(sim.batteryRemainingMah));
    const remainingPct = Math.round((remainingEnergy / totalCapacityMah) * 100);

    // Build list of all 4 racers with actual finish timestamps
    const rawCompetitors = [
      {
        id: 'player',
        name: `${state.character.name} (คุณ)`,
        isPlayer: true,
        avatarIcon: '⚡',
        color: bikeColor,
        bikeDesc: state.batteryPack.name || `แบตเตอรี่ ${nominalPackV.toFixed(1)}V (${totalCapacityMah}mAh)`,
        finishTimeSeconds: finalPlayerTime,
        averageSpeedKmh: avgSpeed,
        topSpeedKmh: sim.topSpeedKmhRecorded,
      },
      ...sim.aiRiders.map((ai) => {
        let aiTime = ai.finishTimeSeconds;
        if (!aiTime) {
          // If race stopped right when player finished, extrapolate remaining distance with ai speed
          const distRemaining = Math.max(0, totalTrackLength - ai.z);
          const timeRemaining = ai.speedMps > 1 ? distRemaining / ai.speedMps : 4;
          aiTime = Number((sim.raceTimeSeconds + timeRemaining).toFixed(1));
        } else {
          aiTime = Number(aiTime.toFixed(1));
        }

        const aiAvgSpeed = Math.round((totalTrackLength / Math.max(1, aiTime)) * 3.6);
        return {
          id: ai.id,
          name: ai.name,
          isPlayer: false,
          avatarIcon: ai.icon,
          color: ai.color,
          bikeDesc: ai.strategy === 'sprint_burst' ? '2S1P (3.0V 2000mAh)' : ai.strategy === 'steady_pacing' ? '2S2P (3.0V 4000mAh)' : '2S3P High-Grip',
          finishTimeSeconds: aiTime,
          averageSpeedKmh: aiAvgSpeed,
          topSpeedKmh: Math.round(aiAvgSpeed * 1.15),
        };
      }),
    ];

    // Sort strictly by finish time ascending
    rawCompetitors.sort((a, b) => a.finishTimeSeconds - b.finishTimeSeconds);

    const leaderTime = rawCompetitors[0].finishTimeSeconds;
    const finalCompetitorResults = rawCompetitors.map((c, idx) => ({
      ...c,
      rank: idx + 1,
      gapSeconds: Number((c.finishTimeSeconds - leaderTime).toFixed(1)),
    }));

    const playerEntry = finalCompetitorResults.find((c) => c.isPlayer);
    const finalRank = sim.isStalledOnHill ? 4 : (playerEntry ? playerEntry.rank : sim.playerRank);

    // Documented Scoring Rule out of 30:
    // 1. Rank Points (Max 12): 1st = 12, 2nd = 9, 3rd = 6, 4th = 3
    const rankPoints = finalRank === 1 ? 12 : finalRank === 2 ? 9 : finalRank === 3 ? 6 : 3;
    // 2. Speed / Pacing Points (Max 10): >= 30 km/h: 10, >= 26: 8, >= 22: 6, < 22: 4
    const speedPoints = avgSpeed >= 30 ? 10 : avgSpeed >= 26 ? 8 : avgSpeed >= 22 ? 6 : 4;
    // 3. Battery Efficiency Points (Max 8): remaining > 25%: 8, > 10%: 6, > 0%: 4, 0%: 2
    const batteryPoints = remainingPct > 25 ? 8 : remainingPct > 10 ? 6 : remainingPct > 0 ? 4 : 2;
    const totalScore30 = sim.isStalledOnHill ? 8 : (rankPoints + speedPoints + batteryPoints);

    const prevBestScore = state.raceData?.bestRaceScore || 0;
    const newBestScore = Math.max(prevBestScore, totalScore30);

    const voltageMatchRatio = Number((Math.min(1.0, nominalPackV / chosenMotorVoltage)).toFixed(2));

    updateRaceData({
      rank: finalRank,
      totalTimeSeconds: finalPlayerTime,
      topSpeedKmh: sim.topSpeedKmhRecorded,
      averageSpeedKmh: avgSpeed,
      energyUsedMah: energyUsed,
      remainingEnergyMah: remainingEnergy,
      batteryPercentageRemaining: remainingPct,
      selectedTrackId: trackId,
      trackName,
      trackDistanceMeters: totalTrackLength,
      competitorResults: finalCompetitorResults,
      raceScoreOutOf30: totalScore30,
      bestRaceScore: newBestScore,
      scoringBreakdown: {
        rankPoints: sim.isStalledOnHill ? 3 : rankPoints,
        speedPacingPoints: sim.isStalledOnHill ? 3 : speedPoints,
        batteryEfficiencyPoints: sim.isStalledOnHill ? 2 : batteryPoints,
        totalPoints: totalScore30,
      },
      // Vocational Physics & Battery Tradeoff Reflections
      batteryExhaustedMidway: sim.hasBatteryExhausted || remainingEnergy <= 5,
      stalledOnHill: sim.isStalledOnHill,
      motorVoltageMatchRatio: voltageMatchRatio,
      maxSlopeEncountered: isOffroadDownhill ? 22 : 16,
      downhillEnergySavedWh: Math.round(sim.downhillSavedWh * 10) / 10,
      regeneratedEnergyMah: Math.round(sim.totalRegeneratedMah * 10) / 10,
      maxRegenPowerW: Math.round(nominalPackV * 4.8),
      chosenMotorVoltage,
      chosenPackVoltage: nominalPackV,
      batteryPickupsCollected: sim.itemsCollectedCount,
      totalPickupsAvailable: sim.pickups.length,
      pickupEnergyRecoveredMah: sim.batteryEnergyRecoveredMah,
    });

    const earnedStars = finalRank === 1 ? 3 : finalRank === 2 ? 2 : 1;
    const missionScore = Math.round((totalScore30 / 30) * 1000);
    completeMission('mission_6', earnedStars, missionScore);

    goToScene('race_results');
  };

  const currentSpeedKmh = Math.round(playerSpeedMps * 3.6);
  const batteryPct = Math.round((batteryRemainingMah / totalCapacityMah) * 100);
  const trackProgressPct = Math.min(100, Math.round((playerZ / totalTrackLength) * 100));
  const currentSlope = getTrackSlopePercent(playerZ);
  const currentLap = Math.min(totalLaps, Math.floor(playerZ / lapLength) + 1);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950 text-white flex flex-col font-sans select-none overflow-hidden">
      {/* Top Telemetry HUD */}
      <div className="bg-slate-900/95 border-b border-indigo-500/40 backdrop-blur-md px-3 md:px-5 py-2 flex items-center justify-between gap-2 md:gap-4 sticky top-0 z-40 shadow-xl">
        {/* Left: Rank & Lap / Slope */}
        <div className="flex items-center gap-2 md:gap-3">
          {/* Pause / Resume Button */}
          <button
            onClick={handleTogglePause}
            className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 border border-slate-700 flex items-center justify-center transition shadow-md"
            title={isPaused ? 'เล่นต่อ' : 'หยุดชั่วคราว'}
          >
            {isPaused ? <Play className="w-5 h-5 text-emerald-400 fill-current" /> : <Pause className="w-5 h-5 text-amber-400" />}
          </button>

          {/* Live Position Rank */}
          <div
            className={`px-3 py-1 rounded-xl font-black font-mono flex items-center gap-1.5 shadow-lg ${
              playerRank === 1
                ? 'bg-amber-400 text-slate-950 shadow-amber-400/40'
                : playerRank === 2
                ? 'bg-slate-200 text-slate-950'
                : playerRank === 3
                ? 'bg-amber-700 text-white'
                : 'bg-slate-800 text-slate-300'
            }`}
          >
            <Trophy className="w-4 h-4" />
            <span className="text-base md:text-lg">#{playerRank}</span>
          </div>

          {/* Time & Lap */}
          <div className="hidden sm:flex flex-col">
            <span className="text-[10px] text-slate-400 uppercase font-mono">เวลาแข่งขัน</span>
            <span className="text-sm font-mono font-bold text-emerald-400">{raceTimeSeconds.toFixed(1)} วิ</span>
          </div>

          {isEndurance && (
            <div className="bg-purple-950/70 border border-purple-500/40 px-2.5 py-1 rounded-lg text-purple-300 text-xs font-mono font-bold flex items-center gap-1">
              <Milestone className="w-3.5 h-3.5" />
              <span>รอบ {currentLap}/{totalLaps}</span>
            </div>
          )}

          {(isHillClimb || isOffroadDownhill) && (
            <div
              className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold flex items-center gap-1 border ${
                currentSlope > 0
                  ? 'bg-amber-950/70 border-amber-500/40 text-amber-300'
                  : currentSlope < 0
                  ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300 animate-pulse shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                  : 'bg-slate-900 border-slate-700 text-slate-300'
              }`}
            >
              <Mountain className="w-3.5 h-3.5" />
              <span>
                {currentSlope > 0
                  ? `ขึ้นเขา: +${currentSlope}%`
                  : currentSlope < 0
                  ? `ลงเขาชัน: ${currentSlope}% (KERS ชาร์จไฟกลับ!)`
                  : 'ทางราบ'}
              </span>
            </div>
          )}
        </div>

        {/* Center: Distance Progress Bar */}
        <div className="flex-1 max-w-xs md:max-w-md hidden sm:flex flex-col gap-1">
          <div className="flex justify-between text-[11px] font-mono text-slate-400">
            <span>{Math.round(playerZ)} ม.</span>
            <span className="text-amber-300 font-bold">{trackName.split('(')[0]}</span>
            <span>{totalTrackLength} ม.</span>
          </div>
          <div className="h-2.5 bg-slate-950 rounded-full border border-slate-800 overflow-hidden relative">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 transition-all duration-100"
              style={{ width: `${trackProgressPct}%` }}
            />
          </div>
        </div>

        {/* Right: Speedometer & Battery */}
        <div className="flex items-center gap-2 md:gap-3">
          {/* Speedometer */}
          <div className="bg-slate-950 px-3 py-1 rounded-xl border border-cyan-500/50 flex items-center gap-1.5 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
            <Gauge className="w-4 h-4 text-cyan-400" />
            <span className="text-xl md:text-2xl font-black font-mono text-cyan-300">{currentSpeedKmh}</span>
            <span className="text-[10px] text-slate-400 font-normal">กม./ชม.</span>
          </div>

          {/* Battery State */}
          <div className="bg-slate-950 px-3 py-1 rounded-xl border border-slate-800 flex items-center gap-1.5">
            <BatteryCharging
              className={`w-4 h-4 ${batteryPct < 20 ? 'text-rose-400 animate-pulse' : 'text-emerald-400'}`}
            />
            <div className="flex flex-col">
              <span className="text-xs font-mono font-bold text-emerald-400">{batteryPct}%</span>
              <span className="text-[9px] font-mono text-slate-400 hidden md:inline">
                {Math.round(batteryRemainingMah)} mAh
              </span>
            </div>
          </div>

          {/* Battery Pickups Collected Counter */}
          <div className="bg-slate-950 px-2.5 py-1 rounded-xl border border-emerald-500/50 flex items-center gap-1.5 shadow-[0_0_12px_rgba(16,185,129,0.2)]">
            <span className="text-sm">🔋</span>
            <div className="flex flex-col">
              <span className="text-xs font-mono font-bold text-emerald-300">
                {itemsCollectedCount}/{totalPickupsAvailable}
              </span>
              <span className="text-[8px] font-mono text-emerald-400/80 leading-none">เก็บไอเทม</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main 2.5D Race Track View */}
      <div className="relative flex-1 w-full overflow-hidden bg-slate-950 flex flex-col justify-end">
        <div ref={container3dRef} className="w-full h-full block absolute inset-0 cursor-crosshair overflow-hidden" />

        {/* Floating Battery Pickup Toast */}
        {pickupToast && (
          <div className="absolute top-4 right-4 z-30 pointer-events-none animate-bounce flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-slate-900/90 border border-emerald-400/80 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.5)] backdrop-blur-md transition-all">
            <span className="text-xl">🔋</span>
            <div className="flex flex-col text-left">
              <span className="font-bold text-xs tracking-wide text-white">{pickupToast.text}</span>
              <span className="text-[10px] text-emerald-400 font-mono">ชาร์จพลังงานสำเร็จ!</span>
            </div>
          </div>
        )}

        {/* Electrical & Motor Status Ribbon (Above Controls) */}
        <div className="relative z-20 px-4 py-1.5 bg-slate-900/80 backdrop-blur-md border-t border-indigo-500/30 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-slate-300">
              <span className="text-slate-400">แรงปั่น (Human):</span>
              <strong className="text-emerald-400">{humanPowerW} W</strong> ({pedalCadenceRpm} RPM)
            </span>

            <span className="flex items-center gap-1 text-slate-300">
              <span className="text-slate-400">มอเตอร์ (Motor):</span>
              <strong className={isMotorAssistActive && batteryRemainingMah > 5 ? 'text-cyan-400' : 'text-slate-500'}>
                {motorPowerW} W ({motorCurrentA} A @ {loadedVoltageV} V)
              </strong>
            </span>

            {isRegenActive && (
              <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/60 text-emerald-300 animate-pulse font-bold shadow-[0_0_12px_rgba(16,185,129,0.35)]">
                <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" />
                <span>KERS ชาร์จกลับ:</span>
                <strong className="text-emerald-300">+{regenPowerW} W (+{regenCurrentA} A)</strong>
              </span>
            )}
          </div>

          <div className="text-[11px] text-slate-400 hidden sm:inline">
            💡 กดค้างเพื่อปั่น (Pedal) + กดปุ่มไฟฟ้าช่วยปั่น (Motor) หรือกดเบรกหน่วงชาร์จไฟกลับ (KERS Regen)
          </div>
        </div>

        {/* Touch Controls Cockpit (Pedal, Motor Assist, Brake, Left, Right) */}
        <div className="relative z-30 bg-slate-950/95 border-t border-slate-800 p-3 md:p-4 grid grid-cols-12 gap-2 md:gap-4 items-center">
          {/* Steering Controls (Left & Right Buttons - 4 Cols) */}
          <div className="col-span-4 flex items-center gap-2">
            <button
              onMouseDown={handleSteerLeftStart}
              onMouseUp={handleSteerLeftEnd}
              onTouchStart={(e) => {
                e.preventDefault();
                handleSteerLeftStart();
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                handleSteerLeftEnd();
              }}
              className={`flex-1 py-4 md:py-5 rounded-2xl font-black text-sm md:text-base flex flex-col items-center justify-center gap-0.5 transition active:scale-95 border min-h-[58px] ${
                isSteeringLeft
                  ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-lg shadow-cyan-500/40'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-700'
              }`}
            >
              <ChevronLeft className="w-6 h-6" />
              <span className="text-[10px] md:text-xs">เลี้ยวซ้าย</span>
            </button>

            <button
              onMouseDown={handleSteerRightStart}
              onMouseUp={handleSteerRightEnd}
              onTouchStart={(e) => {
                e.preventDefault();
                handleSteerRightStart();
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                handleSteerRightEnd();
              }}
              className={`flex-1 py-4 md:py-5 rounded-2xl font-black text-sm md:text-base flex flex-col items-center justify-center gap-0.5 transition active:scale-95 border min-h-[58px] ${
                isSteeringRight
                  ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-lg shadow-cyan-500/40'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-700'
              }`}
            >
              <ChevronRight className="w-6 h-6" />
              <span className="text-[10px] md:text-xs">เลี้ยวขวา</span>
            </button>
          </div>

          {/* Brake / KERS Regen Button (2 Cols) */}
          <div className="col-span-2">
            <button
              onMouseDown={handleBrakeStart}
              onMouseUp={handleBrakeEnd}
              onTouchStart={(e) => {
                e.preventDefault();
                handleBrakeStart();
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                handleBrakeEnd();
              }}
              className={`w-full py-4 md:py-5 rounded-2xl font-black text-xs md:text-sm flex flex-col items-center justify-center gap-0.5 transition active:scale-95 border min-h-[58px] ${
                isBraking
                  ? isRegenActive
                    ? 'bg-emerald-500 text-slate-950 border-emerald-300 shadow-lg shadow-emerald-500/50'
                    : 'bg-rose-500 text-white border-rose-400 shadow-lg shadow-rose-500/40'
                  : isRegenActive
                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/50 animate-pulse'
                  : 'bg-slate-900 hover:bg-slate-800 text-rose-300 border-rose-900/60'
              }`}
            >
              <span className="text-base md:text-lg">{isRegenActive ? '⚡' : '🛑'}</span>
              <span>{isRegenActive ? 'REGEN' : 'เบรก'}</span>
            </button>
          </div>

          {/* Motor Assist Button (3 Cols) */}
          <div className="col-span-3">
            <button
              onClick={handleToggleMotor}
              disabled={batteryRemainingMah <= 5}
              className={`w-full py-4 md:py-5 rounded-2xl font-black text-xs md:text-sm flex flex-col items-center justify-center gap-0.5 transition active:scale-95 shadow-xl min-h-[58px] cursor-pointer ${
                isMotorAssistActive
                  ? 'bg-cyan-400 text-slate-950 ring-4 ring-cyan-300/50 shadow-cyan-400/50 scale-[0.98]'
                  : batteryRemainingMah > 5
                  ? 'bg-gradient-to-r from-cyan-600 via-teal-600 to-emerald-500 hover:brightness-110 text-white shadow-cyan-600/30'
                  : 'bg-slate-900 text-slate-600 border border-slate-800 cursor-not-allowed'
              }`}
            >
              <Zap className="w-5 h-5 fill-current" />
              <span>{isMotorAssistActive ? '⚡ มอเตอร์: เปิด (ON)' : '🔌 กดเปิดมอเตอร์ (Assist)'}</span>
            </button>
          </div>

          {/* Hold to Pedal Button (3 Cols) */}
          <div className="col-span-3">
            <button
              onMouseDown={handlePedalStart}
              onMouseUp={handlePedalEnd}
              onTouchStart={(e) => {
                e.preventDefault();
                handlePedalStart();
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                handlePedalEnd();
              }}
              onClick={() => {
                handlePedalStart();
                setTimeout(handlePedalEnd, 400);
              }}
              className={`w-full py-4 md:py-5 rounded-2xl font-black text-xs md:text-sm flex flex-col items-center justify-center gap-0.5 transition active:scale-95 shadow-xl min-h-[58px] cursor-pointer ${
                isPedaling
                  ? 'bg-amber-400 text-slate-950 ring-4 ring-amber-300/50 shadow-amber-400/50 scale-[0.98]'
                  : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:brightness-110 text-slate-950 shadow-amber-500/30'
              }`}
            >
              <span className="text-base md:text-lg">🚴‍♂️</span>
              <span>{isPedaling ? '🔥 สปรินต์ปั่นเต็มแรง!' : 'กดค้างสปรินต์ (SPRINT)'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Pause Menu Modal */}
      {isPaused && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border-2 border-indigo-500/40 rounded-3xl max-w-sm w-full p-6 shadow-2xl flex flex-col items-center text-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-400 flex items-center justify-center text-amber-400">
              <Pause className="w-7 h-7" />
            </div>

            <div>
              <h2 className="text-xl font-black text-white">หยุดการแข่งขันชั่วคราว (PAUSED)</h2>
              <p className="text-xs text-slate-300 mt-1">
                สนาม: {trackName} | อันดับปัจจุบัน: #{playerRank}
              </p>
            </div>

            <div className="w-full flex flex-col gap-2 pt-2">
              <button
                onClick={() => {
                  simRef.current.isPaused = false;
                  setIsPaused(false);
                }}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:brightness-110 text-slate-950 font-black text-xs shadow-lg flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>เล่นการแข่งขันต่อ (Resume)</span>
              </button>

              <button
                onClick={handleRestartRace}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4 text-cyan-400" />
                <span>เริ่มแข่งใหม่ตั้งแต่ต้น (Restart)</span>
              </button>

              <button
                onClick={() => goToScene('race_prep')}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-slate-700 flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4 text-amber-400" />
                <span>กลับจุดปล่อยตัว (Back to Prep)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Race Finished Overlay Modal */}
      {raceFinished && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-gradient-to-b from-slate-900 to-indigo-950 border-2 border-emerald-400 rounded-3xl max-w-md w-full p-6 md:p-8 shadow-2xl text-center flex flex-col items-center gap-5">
            <div
              className={`w-20 h-20 rounded-3xl flex items-center justify-center shadow-xl border-2 ${
                playerRank === 1
                  ? 'bg-amber-500/20 border-amber-400 text-amber-400 shadow-amber-500/30'
                  : playerRank === 2
                  ? 'bg-slate-300/20 border-slate-300 text-slate-300'
                  : 'bg-amber-700/20 border-amber-600 text-amber-600'
              }`}
            >
              <Trophy className="w-10 h-10" />
            </div>

            <div>
              <span className="text-xs font-black uppercase tracking-wider text-amber-400 bg-amber-500/20 px-3 py-1 rounded-full">
                🏁 เข้าเส้นชัยอย่างเป็นทางการ!
              </span>
              <h2 className="text-2xl md:text-3xl font-black text-white mt-2">
                คุณเข้าเส้นชัยเป็นอันดับที่ #{playerRank}!
              </h2>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                เวลาเข้าเส้นชัย: <strong>{(playerFinishTime || raceTimeSeconds).toFixed(1)} วินาที</strong> | ความเร็วสูงสุด:{' '}
                <strong>{topSpeedKmhRecorded} กม./ชม.</strong>
              </p>
            </div>

            {/* Quick Stat Highlights */}
            <div className="grid grid-cols-4 gap-2 w-full text-xs font-mono">
              <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
                <span className="text-[9px] text-slate-400 block font-sans">พลังงานที่ใช้</span>
                <span className="text-amber-400 font-bold text-xs">
                  {Math.round(totalCapacityMah - batteryRemainingMah)} mAh
                </span>
              </div>
              <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
                <span className="text-[9px] text-slate-400 block font-sans">ความเร็วเฉลี่ย</span>
                <span className="text-cyan-400 font-bold text-xs">
                  {Math.round((totalTrackLength / (playerFinishTime || raceTimeSeconds)) * 3.6)} กม./ชม.
                </span>
              </div>
              <div className="bg-slate-950 p-2 rounded-xl border border-emerald-500/40">
                <span className="text-[9px] text-slate-400 block font-sans">ไอเทมแบต</span>
                <span className="text-emerald-300 font-bold text-xs">
                  {itemsCollectedCount}/{totalPickupsAvailable}
                </span>
              </div>
              <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
                <span className="text-[9px] text-slate-400 block font-sans">ดาวรางวัล</span>
                <span className="text-emerald-400 font-bold text-xs">
                  {playerRank === 1 ? '⭐⭐⭐' : playerRank === 2 ? '⭐⭐' : '⭐'}
                </span>
              </div>
            </div>

            <button
              onClick={handleProceedToResults}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400 hover:brightness-110 text-slate-950 font-black text-sm shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2 transition"
            >
              <span>ดูสรุปผลการแข่งขันและตารางอันดับ</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Stalled on Hill / Depleted Battery Modal */}
      {isStalledOnHill && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-gradient-to-b from-slate-900 to-rose-950 border-2 border-rose-500 rounded-3xl max-w-md w-full p-6 shadow-2xl text-center flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border-2 border-rose-500 flex items-center justify-center text-rose-400">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div>
              <span className="text-[11px] font-black uppercase tracking-wider text-rose-400 bg-rose-500/20 px-3 py-1 rounded-full">
                ⚠️ การแข่งขันสิ้นสุด: รถติดค้างบนเนิน (STALLED ON HILL)
              </span>
              <h2 className="text-xl md:text-2xl font-black text-white mt-2">
                {hasBatteryExhausted ? 'แบตเตอรี่หมดกลางทาง!' : 'แรงดันตกพิกัด แรงบิดไม่พอ!'}
              </h2>
              <p className="text-xs text-rose-200 mt-2 leading-relaxed">
                {hasBatteryExhausted
                  ? `พลังงานแบตเตอรี่หมดลงที่ระยะ ${Math.round(playerZ)} เมตร บนเนินชัน ${currentSlope}% แรงปั่นคนอย่างเดียว (~60N) ไม่สามารถต้านทานแรงโน้มถ่วง F = mg*sin(θ) (~120N) ได้!`
                  : `แรงดันแบตเตอรี่ ${nominalPackV}V ต่ำกว่าพิกัดมอเตอร์ ${chosenMotorVoltage}V ทำให้สูญเสียกำลังขับและติดค้างบนเนินชัน`}
              </p>
            </div>

            <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 text-[11px] text-left w-full space-y-1.5 text-slate-300">
              <span className="font-bold text-amber-300 block">💡 บทเรียนทางวิศวกรรมไฟฟ้า:</span>
              <p className="text-[10px] leading-relaxed">
                ภายใต้โควตา 8 ก้อน หากเลือกมอเตอร์กำลังสูง 24V (800W) แต่ต่อแบบ 8S 1P ความจุจะเหลือเพียง 2,000 mAh หากไม่ปล่อยไหลลงเขา (Coasting) แบตเตอรี่จะหมดก่อนถึงยอดเขา!
              </p>
            </div>

            <button
              onClick={handleProceedToResults}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 hover:brightness-110 text-slate-950 font-black text-xs md:text-sm shadow-xl active:scale-95 transition flex items-center justify-center gap-2"
            >
              <span>ดูผลวิเคราะห์และสะท้อนคิด (Reflection)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
