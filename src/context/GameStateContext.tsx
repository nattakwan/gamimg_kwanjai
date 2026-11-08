/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  GameState,
  SceneId,
  CharacterState,
  BatteryPackSetup,
  BikeSetup,
  Mission,
} from '../types/game';

const STORAGE_KEY = 'battery_quest_academy_state_v1';

const INITIAL_CHARACTER: CharacterState = {
  name: 'กัปตันสายฟ้า',
  avatarId: 'cadet_leo',
  gender: 'cadet_boy',
  bodyType: 'boy',
  hairStyle: 'spiky',
  hairColor: '#f59e0b',
  skinTone: '#fed7aa',
  jacketStyle: 'speed_jumpsuit',
  trousersStyle: 'cargo_tech',
  gogglesStyle: 'cyber_visor',
  outfitColor: '#0284c7',
  suitColor: '#0284c7',
  helmetStyle: 'aerodynamic',
  title: 'นักเรียนฝึกหัด (Cadet Novice)',
};

const INITIAL_MISSIONS: Mission[] = [
  {
    id: 'm1',
    code: 'MISSION 01',
    title: 'วงจรปิดพื้นฐาน (Basic Circuit)',
    targetScene: 'basic_circuit_lab',
    objective: 'ต่อเซลล์ AA 1.5V เข้ากับสวิตช์และหลอดไฟ 1.5V ให้กระแสไฟฟ้าไหลครบวงจร หลอดไฟสว่างตามปกติ',
    requiredVoltageMin: 1.4,
    requiredVoltageMax: 1.6,
    requiredCapacityMin: 2000,
    isUnlocked: true,
    isCompleted: false,
    stars: 0,
    rewardExp: 100,
    highestScore: 0,
    equipment: ['ถ่าน AA 1.5V (1 ก้อน)', 'สวิตช์ควบคุม', 'หลอดไฟ 1.5V', 'สายไฟทองแดง'],
  },
  {
    id: 'm2',
    code: 'MISSION 02',
    title: 'วงจรอนุกรม (Series Circuit)',
    targetScene: 'series_lab',
    objective: 'ต่อเซลล์แบบอนุกรม 2 ก้อน (+ ชน -) เพิ่มแรงดันเป็น 3.0V ขับเคลื่อนหลอดไฟ 3.0V ให้สว่างเต็มที่',
    requiredVoltageMin: 2.8,
    requiredVoltageMax: 3.2,
    requiredCapacityMin: 2000,
    isUnlocked: false,
    isCompleted: false,
    stars: 0,
    rewardExp: 150,
    highestScore: 0,
    prerequisiteTitle: 'วงจรปิดพื้นฐาน (Basic Circuit)',
    equipment: ['ถ่าน AA 1.5V (2 ก้อน)', 'รางต่ออนุกรม', 'โวลต์มิเตอร์วัดโวลต์', 'หลอดไฟ 3.0V'],
  },
  {
    id: 'm3',
    code: 'MISSION 03',
    title: 'วงจรขนาน (Parallel Circuit)',
    targetScene: 'parallel_lab',
    objective: 'ต่อเซลล์แบบขนาน (+ ชน +, - ชน -) เพิ่มความจุเป็น 4000mAh โดยที่แรงดันคงที่ 1.5V เพื่อการจ่ายไฟยาวนาน 2 เท่า',
    requiredVoltageMin: 1.4,
    requiredVoltageMax: 1.6,
    requiredCapacityMin: 4000,
    isUnlocked: false,
    isCompleted: false,
    stars: 0,
    rewardExp: 200,
    highestScore: 0,
    prerequisiteTitle: 'วงจรอนุกรม (Series Circuit)',
    equipment: ['ถ่าน AA 1.5V (2 ก้อน)', 'บัสบาร์ขั้วร่วม', 'ตัวจับเวลาระยะจ่ายกระแส', 'หลอดไฟ 1.5V'],
  },
  {
    id: 'm4',
    code: 'MISSION 04',
    title: 'วงจรผสมแพ็กแบตเตอรี่ (Mixed Battery Pack)',
    targetScene: 'mixed_lab',
    objective: 'ออกแบบแพ็ก 4S 2P (8 ก้อน) ให้ได้แรงดัน 6.0V และความจุ 4000mAh สำหรับติดตั้งลงจักรยานแข่ง',
    requiredVoltageMin: 5.8,
    requiredVoltageMax: 6.2,
    requiredCapacityMin: 4000,
    isUnlocked: false,
    isCompleted: false,
    stars: 0,
    rewardExp: 300,
    highestScore: 0,
    prerequisiteTitle: 'วงจรขนาน (Parallel Circuit)',
    equipment: ['ถ่าน AA 1.5V (8 ก้อน)', 'แผงจัดเรียงเมทริกซ์ 4S 2P', 'กล่องยึดแบตเตอรี่'],
  },
  {
    id: 'm5',
    code: 'MISSION 05',
    title: 'มอเตอร์กระแสตรง (DC Motor Test)',
    targetScene: 'motor_test',
    objective: 'ทดสอบต่อแพ็กแบตเตอรี่เข้ากับมอเตอร์ วัดรอบ RPM แรงบิด และรักษาอุณหภูมิปลอดภัย',
    requiredVoltageMin: 5.5,
    requiredVoltageMax: 12.0,
    requiredCapacityMin: 2000,
    isUnlocked: false,
    isCompleted: false,
    stars: 0,
    rewardExp: 250,
    highestScore: 0,
    prerequisiteTitle: 'วงจรผสมแพ็กแบตเตอรี่ (Mixed Battery Pack)',
    equipment: ['มอเตอร์กระแสตรง 6.0V', 'แท่นไดนาโมมิเตอร์', 'เซนเซอร์วัดความร้อน'],
  },
  {
    id: 'm6',
    code: 'MISSION 06',
    title: 'การแข่งขันชิงแชมป์จักรยาน (Bicycle Championship)',
    targetScene: 'racing',
    objective: 'ลงแข่งขันจริงในสนามกรังด์ปรีซ์ 400 เมตร บริหารคันเร่งและพลังงานแบตเตอรี่เข้าเส้นชัยเป็นอันดับ 1',
    requiredVoltageMin: 3.0,
    requiredVoltageMax: 12.0,
    requiredCapacityMin: 2000,
    isUnlocked: false,
    isCompleted: false,
    stars: 0,
    rewardExp: 500,
    highestScore: 0,
    prerequisiteTitle: 'มอเตอร์กระแสตรง (DC Motor Test)',
    equipment: ['จักรยานแข่งขันประจำตัว', 'มอเตอร์พาวเวอร์ 6V', 'แพ็กแบตเตอรี่ที่ผ่านการรับรอง'],
  },
];

const INITIAL_BATTERY_PACK: BatteryPackSetup = {
  id: 'pack_default_4s2p',
  name: 'Standard Academy Pack (4S 2P)',
  configType: 'mixed_series_parallel',
  seriesCount: 4,
  parallelCount: 2,
  totalCells: 8,
  nominalVoltage: 6.0,
  nominalCapacityMah: 4000,
  internalResistance: 0.3,
  isValidated: true,
  notes: 'ชุดแบตเตอรี่มาตรฐานประจำสถาบัน: 4 เซลล์อนุกรม x 2 แถวขนาน (6.0V, 4000mAh)',
};

const INITIAL_BIKE: BikeSetup = {
  frameId: 'cadet_light',
  frameName: 'Cadet Striker Light',
  weightKg: 12.5,
  motorId: 'power_6v',
  motorName: 'Pro Torque 6V',
  motorRatedVoltage: 6.0,
  motorMaxRpm: 3200,
  tireType: 'grip_slick',
  aerodynamics: 0.85,
};

const INITIAL_STATE: GameState = {
  currentScene: 'splash',
  soundEnabled: true,
  musicEnabled: true,
  textSize: 'normal',
  character: INITIAL_CHARACTER,
  missions: INITIAL_MISSIONS,
  batteryPack: INITIAL_BATTERY_PACK,
  bike: INITIAL_BIKE,
  bikeSetup: INITIAL_BIKE,
  raceData: {
    rank: 1,
    totalTimeSeconds: 45.0,
    topSpeedKmh: 35,
    averageSpeedKmh: 28,
    energyUsedMah: 580,
  },
  learning: {
    totalStars: 0,
    expPoints: 0,
    academyRank: 'นักเรียนฝึกหัด (Cadet Novice)',
    completedQuizzesCount: 0,
    conceptsUnderstood: [],
  },
  raceHistory: [],
};

interface GameContextType {
  state: GameState;
  goToScene: (scene: SceneId) => void;
  goBack: () => void;
  toggleSound: () => void;
  toggleMusic: () => void;
  setTextSize: (size: 'normal' | 'large') => void;
  updateCharacter: (updates: Partial<CharacterState>) => void;
  updateBatteryPack: (updates: Partial<BatteryPackSetup>) => void;
  updateBike: (updates: Partial<BikeSetup>) => void;
  updateBikeSetup: (updates: Partial<BikeSetup>) => void;
  updateRaceData: (updates: Partial<any>) => void;
  completeMission: (missionId: string, stars: number, score?: number) => void;
  resetAllProgress: () => void;
}

const GameStateContext = createContext<GameContextType | undefined>(undefined);

export const GameStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<GameState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...INITIAL_STATE,
          ...parsed,
          missions: INITIAL_MISSIONS.map((m) => {
            const savedM = parsed.missions?.find((sm: Mission) => sm.id === m.id);
            return savedM ? { ...m, ...savedM } : m;
          }),
        };
      }
    } catch {
      // Fallback
    }
    return INITIAL_STATE;
  });

  // Save state on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore
    }
  }, [state]);

  const goToScene = (scene: SceneId) => {
    setState((prev) => ({
      ...prev,
      previousScene: prev.currentScene,
      currentScene: scene,
    }));
  };

  const goBack = () => {
    setState((prev) => ({
      ...prev,
      currentScene: prev.previousScene || 'main_menu',
      previousScene: undefined,
    }));
  };

  const toggleSound = () => {
    setState((prev) => ({ ...prev, soundEnabled: !prev.soundEnabled }));
  };

  const toggleMusic = () => {
    setState((prev) => ({ ...prev, musicEnabled: !prev.musicEnabled }));
  };

  const setTextSize = (textSize: 'normal' | 'large') => {
    setState((prev) => ({ ...prev, textSize }));
  };

  const updateCharacter = (updates: Partial<CharacterState>) => {
    setState((prev) => ({
      ...prev,
      character: { ...prev.character, ...updates },
    }));
  };

  const updateBatteryPack = (updates: Partial<BatteryPackSetup>) => {
    setState((prev) => ({
      ...prev,
      batteryPack: { ...prev.batteryPack, ...updates },
    }));
  };

  const updateBike = (updates: Partial<BikeSetup>) => {
    setState((prev) => {
      const merged = { ...prev.bike, ...updates };
      return {
        ...prev,
        bike: merged,
        bikeSetup: merged,
      };
    });
  };

  const updateBikeSetup = updateBike;

  const updateRaceData = (updates: Partial<any>) => {
    setState((prev) => ({
      ...prev,
      raceData: { ...prev.raceData, ...updates },
    }));
  };

  const completeMission = (missionId: string, stars: number, score: number = 850) => {
    setState((prev) => {
      const normalizedId = missionId.replace('mission_', 'm');
      const missionIdx = prev.missions.findIndex(
        (m) => m.id === missionId || m.id === normalizedId || m.id === `m${missionId}`
      );
      if (missionIdx === -1) return prev;

      const currentM = prev.missions[missionIdx];
      const newMissions = [...prev.missions];
      newMissions[missionIdx] = {
        ...currentM,
        isCompleted: true,
        stars: Math.max(currentM.stars, stars),
        highestScore: Math.max(currentM.highestScore || 0, score),
      };

      // Unlock next mission if available
      if (missionIdx + 1 < newMissions.length) {
        newMissions[missionIdx + 1] = {
          ...newMissions[missionIdx + 1],
          isUnlocked: true,
        };
      }

      const totalStars = newMissions.reduce((acc, m) => acc + (m.stars || 0), 0);
      const earnedExp = currentM.rewardExp || 100;
      const totalExp = prev.learning.expPoints + earnedExp;

      let academyRank = prev.learning.academyRank;
      if (totalStars >= 15) academyRank = 'สุดยอดวิศวกรไฟฟ้ากรังด์ปรีซ์ (Grand Prix Master)';
      else if (totalStars >= 10) academyRank = 'วิศวกรไฟฟ้าอาวุโส (Senior Battery Engineer)';
      else if (totalStars >= 6) academyRank = 'นักออกแบบวงจรชำนาญการ (Circuit Specialist)';
      else if (totalStars >= 3) academyRank = 'นักเรียนช่างระดับกลาง (Cadet Apprentice)';

      return {
        ...prev,
        missions: newMissions,
        learning: {
          ...prev.learning,
          totalStars,
          expPoints: totalExp,
          academyRank,
        },
      };
    });
  };

  const resetAllProgress = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore
    }
    setState(INITIAL_STATE);
  };

  return (
    <GameStateContext.Provider
      value={{
        state,
        goToScene,
        goBack,
        toggleSound,
        toggleMusic,
        setTextSize,
        updateCharacter,
        updateBatteryPack,
        updateBike,
        updateBikeSetup,
        updateRaceData,
        completeMission,
        resetAllProgress,
      }}
    >
      {children}
    </GameStateContext.Provider>
  );
};

export const useGameState = () => {
  const context = useContext(GameStateContext);
  if (!context) {
    throw new Error('useGameState must be used within a GameStateProvider');
  }
  return context;
};
