/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Wrench,
  Zap,
  Gauge,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Sparkles,
  Save,
  ShieldCheck,
  ShieldAlert,
  Flame,
  BatteryCharging,
  Play,
  RotateCw,
  AlertTriangle,
  Cpu,
  Layers,
  Scale,
  Mountain,
} from 'lucide-react';
import { useGameState } from '../../context/GameStateContext';
import { AvatarRenderer } from '../common/AvatarRenderer';
import { MOTOR_CATALOG, MotorSpec, MotorVoltageRating } from '../../types/game';

const playTone = (freq: number, type: OscillatorType = 'sine', duration: number = 0.15) => {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch {
    // Ignore audio error
  }
};

interface GaragePack {
  id: string;
  code: string;
  name: string;
  nominalVoltage: number;
  capacityMah: number;
  seriesCount: number;
  parallelCount: number;
  totalCells: number;
  internalResistance: number;
  description: string;
  recommendedForMotorVoltage: MotorVoltageRating;
}

const GARAGE_PACKS: GaragePack[] = [
  {
    id: 'pack_2s4p_6v',
    code: '2S4P (8 ก้อน - โควตาเต็ม)',
    name: 'ชุดผสมความจุสูง 2S4P (6.0V 8,000mAh)',
    nominalVoltage: 6.0,
    capacityMah: 8000,
    seriesCount: 2,
    parallelCount: 4,
    totalCells: 8,
    internalResistance: 0.08,
    description: 'ต่อขนาน 4 แถว ความจุสูงถึง 8,000mAh แบตอึดมาก ไม่มีวันหมดกลางทาง เหมาะกับมอเตอร์ 6V',
    recommendedForMotorVoltage: 6,
  },
  {
    id: 'pack_4s2p_12v',
    code: '4S2P (8 ก้อน - โควตาเต็ม)',
    name: 'ชุดผสมสมดุล 4S2P (12.0V 4,000mAh)',
    nominalVoltage: 12.0,
    capacityMah: 4000,
    seriesCount: 4,
    parallelCount: 2,
    totalCells: 8,
    internalResistance: 0.15,
    description: 'สมดุลยอดเยี่ยม 12V ความจุ 4,000mAh จ่ายกำลังได้สม่ำเสมอ เหมาะกับมอเตอร์ 12V',
    recommendedForMotorVoltage: 12,
  },
  {
    id: 'pack_8s1p_24v',
    code: '8S1P (8 ก้อน - โควตาเต็ม)',
    name: 'ชุดอนุกรมแรงบิดสูง 8S1P (24.0V 2,000mAh)',
    nominalVoltage: 24.0,
    capacityMah: 2000,
    seriesCount: 8,
    parallelCount: 1,
    totalCells: 8,
    internalResistance: 0.35,
    description: 'แรงดันสูงสุด 24V เพื่อพลังปีนเขา แต่ความจุมีเพียง 2,000mAh แบตเตอรี่จะหมดเร็วมากหากเร่งสปรินต์ต่อเนื่อง!',
    recommendedForMotorVoltage: 24,
  },
  {
    id: 'pack_2s2p_6v',
    code: '2S2P (4 ก้อน - ครึ่งโควตา)',
    name: 'ชุดประหยัด 2S2P (6.0V 4,000mAh)',
    nominalVoltage: 6.0,
    capacityMah: 4000,
    seriesCount: 2,
    parallelCount: 2,
    totalCells: 4,
    internalResistance: 0.16,
    description: 'ชุดทดสอบ 4 ก้อน น้ำหนักเบาแต่แรงดัน 6V เหมาะสำหรับการทดสอบขั้นต้น',
    recommendedForMotorVoltage: 6,
  },
];

export const BikeGarageScreen: React.FC = () => {
  const { state, goToScene, updateBikeSetup, updateBatteryPack } = useGameState();

  // Selected Motor: 6V, 12V, 24V
  const [selectedMotorId, setSelectedMotorId] = useState<string>(() => {
    if (state.bikeSetup?.motorId && MOTOR_CATALOG[state.bikeSetup.motorId]) {
      return state.bikeSetup.motorId;
    }
    if (state.bikeSetup?.motorVoltageRating === 24) return 'motor_24v';
    if (state.bikeSetup?.motorVoltageRating === 6) return 'motor_6v';
    return 'motor_12v';
  });

  const selectedMotor: MotorSpec = MOTOR_CATALOG[selectedMotorId] || MOTOR_CATALOG.motor_12v;

  // Cosmetics
  const [frameType, setFrameType] = useState<string>(
    state.bikeSetup?.frameType || 'lightning_cruiser'
  );
  const [frameColor, setFrameColor] = useState<string>(
    state.bikeSetup?.frameColor || '#06b6d4'
  );
  const [tireType, setTireType] = useState<string>(
    state.bikeSetup?.tireType || 'slick_street'
  );

  // Battery Selection & Animated Installation
  const [selectedPackId, setSelectedPackId] = useState<string>(() => {
    if (selectedMotor.ratedVoltage === 24) return 'pack_8s1p_24v';
    if (selectedMotor.ratedVoltage === 6) return 'pack_2s4p_6v';
    return 'pack_4s2p_12v';
  });

  const [isBatteryInstalled, setIsBatteryInstalled] = useState<boolean>(true);
  const [isInstalling, setIsInstalling] = useState<boolean>(false);
  const [installationError, setInstallationError] = useState<string | null>(null);

  // Bench Test Run Simulation
  const [isTestSpinning, setIsTestSpinning] = useState<boolean>(false);
  const [wheelRotation, setWheelRotation] = useState<number>(0);

  // Modals & Feedback
  const [saveToast, setSaveToast] = useState<string | null>(null);

  const selectedPack =
    GARAGE_PACKS.find((p) => p.id === selectedPackId) || GARAGE_PACKS[1];

  // Engineering Compatibility Logic
  const isVoltageMatch = selectedPack.nominalVoltage === selectedMotor.ratedVoltage;
  const isOverVoltage = selectedPack.nominalVoltage > selectedMotor.ratedVoltage;
  const isUnderVoltage = selectedPack.nominalVoltage < selectedMotor.ratedVoltage;

  const isCompatible = !isOverVoltage; // Overvoltage is prohibited to prevent motor blowout
  const voltageRatio = Number((selectedPack.nominalVoltage / selectedMotor.ratedVoltage).toFixed(2));

  // Stored Energy Calculation (Wh = V * Ah)
  const storedEnergyWh = Number(
    ((selectedPack.nominalVoltage * selectedPack.capacityMah) / 1000).toFixed(1)
  );

  // Expected Operating Limits based on Motor + Pack Match
  let topSpeedKmh = 0;
  let accelSeconds = 99;
  let rangeKm = 0;

  if (isVoltageMatch) {
    if (selectedMotor.ratedVoltage === 24) {
      topSpeedKmh = 42;
      accelSeconds = 2.4;
      rangeKm = Number(((selectedPack.capacityMah / 1000) * 3.2).toFixed(1)); // Drains fast!
    } else if (selectedMotor.ratedVoltage === 12) {
      topSpeedKmh = 35;
      accelSeconds = 3.4;
      rangeKm = Number(((selectedPack.capacityMah / 1000) * 4.8).toFixed(1));
    } else {
      topSpeedKmh = 27;
      accelSeconds = 4.8;
      rangeKm = Number(((selectedPack.capacityMah / 1000) * 6.5).toFixed(1)); // Very long range
    }
  } else if (isUnderVoltage) {
    // Severely degraded performance under undervoltage
    const powerScale = Math.pow(voltageRatio, 2);
    topSpeedKmh = Math.max(12, Math.round(30 * powerScale));
    accelSeconds = Math.min(15, Number((5.0 / powerScale).toFixed(1)));
    rangeKm = Number(((selectedPack.capacityMah / 1000) * 5.0).toFixed(1));
  }

  // Wheel rotation animation loop when bench testing
  useEffect(() => {
    if (!isTestSpinning) return;
    const interval = setInterval(() => {
      setWheelRotation((prev) => (prev + 36) % 360);
    }, 40);
    return () => clearInterval(interval);
  }, [isTestSpinning]);

  // Handle Motor Selection
  const handleSelectMotor = (motorId: string) => {
    playTone(520, 'sine', 0.1);
    setSelectedMotorId(motorId);
    const motor = MOTOR_CATALOG[motorId];
    if (motor) {
      // Auto-suggest optimal pack for this motor
      if (motor.ratedVoltage === 24) setSelectedPackId('pack_8s1p_24v');
      else if (motor.ratedVoltage === 12) setSelectedPackId('pack_4s2p_12v');
      else setSelectedPackId('pack_2s4p_6v');
    }
    setIsBatteryInstalled(false);
    setInstallationError(null);
  };

  // Handle Battery Selection
  const handleSelectPack = (pack: GaragePack) => {
    playTone(500, 'sine', 0.08);
    setSelectedPackId(pack.id);
    setIsBatteryInstalled(false);
    setInstallationError(null);
  };

  // Handle Animated Battery Installation Action
  const handleInstallBattery = () => {
    if (isOverVoltage) {
      playTone(180, 'sawtooth', 0.35);
      setInstallationError(
        `อันตรายร้ายแรง! แรงดันแบตเตอรี่ ${selectedPack.nominalVoltage}V เกินพิกัดมอเตอร์ ${selectedMotor.ratedVoltage}V (${Math.round((selectedPack.nominalVoltage / selectedMotor.ratedVoltage) * 100)}%) ขดลวดมอเตอร์จะไหม้เสียหายทันที ระบบตัดการติดตั้งอัตโนมัติ!`
      );
      setIsBatteryInstalled(false);
      return;
    }

    setInstallationError(null);
    setIsInstalling(true);
    playTone(450, 'sine', 0.1);

    setTimeout(() => {
      playTone(880, 'triangle', 0.2);
      setIsInstalling(false);
      setIsBatteryInstalled(true);
      setSaveToast(`ติดตั้ง ${selectedPack.name} กับมอเตอร์ ${selectedMotor.name} เรียบร้อยแล้ว!`);
      setTimeout(() => setSaveToast(null), 3000);
    }, 500);
  };

  // Handle Test Setup Run
  const handleTestSetup = () => {
    if (!isBatteryInstalled) {
      playTone(280, 'square', 0.2);
      setSaveToast('กรุณาติดตั้งชุดแบตเตอรี่ลงในโครงจักรยานก่อนทดสอบ!');
      setTimeout(() => setSaveToast(null), 3000);
      return;
    }

    playTone(650, 'sawtooth', 0.2);
    setIsTestSpinning(true);
    setSaveToast(
      isVoltageMatch
        ? `กำลังทดสอบมอเตอร์ ${selectedMotor.ratedVoltage}V: รอบหมุน ${selectedMotor.maxRpm} RPM ความเร็วสูงสุดประเมิน ${topSpeedKmh} กม./ชม.!`
        : `คำเตือนการทดสอบ: แรงดัน ${selectedPack.nominalVoltage}V ไม่ตรงพิกัดมอเตอร์ ${selectedMotor.ratedVoltage}V มอเตอร์ทำงานได้เพียง ${Math.round(Math.pow(voltageRatio, 2) * 100)}% ของกำลังสูงสุด!`
    );

    setTimeout(() => {
      setIsTestSpinning(false);
      setTimeout(() => setSaveToast(null), 3000);
    }, 2200);
  };

  // Handle Save
  const handleSaveAll = () => {
    if (!isBatteryInstalled) {
      playTone(280, 'square', 0.2);
      setSaveToast('กรุณาติดตั้งแบตเตอรี่ให้เรียบร้อยก่อนบันทึก');
      setTimeout(() => setSaveToast(null), 3000);
      return;
    }

    playTone(600, 'sine', 0.15);

    // Save Battery Pack Setup to GameState
    updateBatteryPack({
      id: selectedPack.id,
      name: selectedPack.name,
      configType: selectedPack.parallelCount > 1 ? 'mixed_series_parallel' : 'series',
      seriesCount: selectedPack.seriesCount,
      parallelCount: selectedPack.parallelCount,
      totalCells: selectedPack.totalCells,
      nominalVoltage: selectedPack.nominalVoltage,
      nominalCapacityMah: selectedPack.capacityMah,
      totalVoltage: selectedPack.nominalVoltage,
      totalCapacityMah: selectedPack.capacityMah,
      internalResistance: selectedPack.internalResistance,
      isValidated: true,
      notes: `ติดตั้งในจักรยานแข่ง: มอเตอร์ ${selectedMotor.ratedVoltage}V คู่กับ ${selectedPack.name}`,
    });

    // Save Bike Setup to GameState
    updateBikeSetup({
      motorId: selectedMotor.id,
      motorName: selectedMotor.name,
      motorRatedVoltage: selectedMotor.ratedVoltage,
      motorVoltageRating: selectedMotor.ratedVoltage,
      motorPowerWatts: selectedMotor.powerWatts,
      motorTorqueNm: selectedMotor.torqueNm,
      motorMaxRpm: selectedMotor.maxRpm,
      batteryCellBudget: 8,
      frameType,
      frameColor,
      tireType,
      topSpeedKmh,
      accelSeconds,
      rangeKm,
    });

    setSaveToast('บันทึกการปรับแต่งจักรยาน มอเตอร์ และชุดแบตเตอรี่ 8 ก้อนเรียบร้อยแล้ว!');
    setTimeout(() => setSaveToast(null), 3500);
  };

  const handleContinue = () => {
    handleSaveAll();
    goToScene('race_prep');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950 text-white flex flex-col font-sans select-none">
      {/* Header */}
      <div className="bg-slate-900/90 border-b border-indigo-500/30 backdrop-blur-md px-4 py-3 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button
            onClick={() => goToScene('motor_test')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition active:scale-95 min-h-[44px]"
          >
            <ArrowLeft className="w-4 h-4 text-emerald-400" />
            <span>ย้อนกลับไปแล็บ (Back to Lab)</span>
          </button>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-sm shadow-md">
              <Wrench className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm md:text-base font-black text-indigo-200">
                โรงเก็บจักรยานพาวเวอร์ไบค์ (Electric-Assist Bike Garage)
              </h1>
              <p className="text-[11px] text-slate-400">
                เลือกพิกัดมอเตอร์ (6V / 12V / 24V) และบริหารโควตาเซลล์แบตเตอรี่ 8 ก้อน
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleTestSetup}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-900/60 hover:bg-indigo-800/80 text-indigo-300 text-xs font-bold border border-indigo-700 transition min-h-[44px]"
          >
            <Play className={`w-4 h-4 ${isTestSpinning ? 'animate-spin' : ''}`} />
            <span>ทดสอบระบบ (Test Bench)</span>
          </button>

          <button
            onClick={handleSaveAll}
            className="flex items-center gap-1 px-3.5 py-1.5 rounded-lg bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 text-xs font-bold border border-emerald-700/60 transition min-h-[44px]"
          >
            <Save className="w-4 h-4 text-emerald-400" />
            <span>บันทึกการแต่งรถ</span>
          </button>

          <button
            onClick={handleContinue}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400 hover:brightness-110 text-slate-950 text-xs font-black shadow-lg shadow-emerald-500/20 active:scale-95 transition min-h-[44px]"
          >
            <span>ต่อไปสนามแข่ง (Continue)</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 p-4 max-w-7xl mx-auto w-full">
        {/* Left Column: Motor Selector + Visual Hangar (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {/* Motor Selection Bar (6V / 12V / 24V) */}
          <div className="bg-slate-900/95 border border-indigo-500/30 rounded-2xl p-4 shadow-xl">
            <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
              <span className="text-xs font-black text-cyan-300 flex items-center gap-1.5 uppercase">
                <Cpu className="w-4 h-4 text-cyan-400" />
                เลือกขนาดมอเตอร์ขับเคลื่อน (Electric Motor Rating)
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                จำกัดโควตาแบตเตอรี่เท่ากันที่ 8 ก้อน
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {Object.values(MOTOR_CATALOG).map((motor) => {
                const isSelected = selectedMotorId === motor.id;
                return (
                  <button
                    key={motor.id}
                    onClick={() => handleSelectMotor(motor.id)}
                    className={`p-3 rounded-xl border text-left transition relative flex flex-col justify-between ${
                      isSelected
                        ? 'bg-cyan-950/70 border-cyan-400 text-white shadow-lg ring-2 ring-cyan-500/40'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-cyan-200">{motor.ratedVoltage}V</span>
                        <span className="text-[10px] font-mono font-bold text-amber-400">
                          {motor.powerWatts}W
                        </span>
                      </div>
                      <span className="text-[11px] font-bold text-white block mt-0.5">
                        {motor.name.split('(')[0]}
                      </span>
                      <p className="text-[10px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                        {motor.description}
                      </p>
                    </div>

                    <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono">
                      <span className="text-emerald-400">แรงบิด {motor.torqueNm} Nm</span>
                      <span className="text-slate-400">{motor.maxRpm} RPM</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Visual Hangar with Avatar & E-Bike */}
          <div className="bg-slate-900/95 border border-indigo-500/30 rounded-2xl p-5 shadow-2xl flex flex-col justify-between min-h-[460px] relative overflow-hidden">
            {/* Background Studio Lights */}
            <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-indigo-500/10 to-transparent pointer-events-none" />

            {/* Hangar Header Status */}
            <div className="relative z-10 flex items-center justify-between text-xs border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-black text-indigo-300">
                  อู่ประกอบยานยนต์ไฟฟ้า (Electric Vehicle Assembly Bay)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/80 px-2.5 py-0.5 rounded border border-cyan-800 font-bold">
                  MOTOR: {selectedMotor.ratedVoltage}V ({selectedMotor.powerWatts}W)
                </span>
                <span className="text-[10px] font-mono text-purple-400 bg-purple-950/80 px-2.5 py-0.5 rounded border border-purple-800 font-bold">
                  BUDGET: 8 CELLS
                </span>
              </div>
            </div>

            {/* Stage: Player's Avatar standing beside the Cartoon Electric-Assist Bike */}
            <div className="relative z-10 flex flex-col sm:flex-row items-center justify-center gap-6 my-auto py-4">
              {/* Cadet Avatar */}
              <div className="flex flex-col items-center shrink-0">
                <div className="w-32 h-44 drop-shadow-[0_10px_15px_rgba(0,0,0,0.5)]">
                  <AvatarRenderer avatar={state.character} size="lg" mode="3d" />
                </div>
                <div className="mt-1 bg-slate-950/80 px-2.5 py-0.5 rounded-full border border-slate-800 text-center">
                  <span className="text-[11px] font-bold text-emerald-400">
                    {state.character.name}
                  </span>
                  <span className="text-[9px] text-slate-400 block -mt-0.5">นักประดิษฐ์ประจำรถ</span>
                </div>
              </div>

              {/* Cartoon Electric-Assist Bicycle Graphic */}
              <div className="relative flex-1 max-w-sm flex flex-col items-center">
                <svg viewBox="0 0 320 180" className="w-full h-auto drop-shadow-2xl">
                  {/* Floor Shadow */}
                  <ellipse cx="160" cy="165" rx="140" ry="8" fill="#020617" opacity="0.6" />

                  {/* Rear Wheel */}
                  <g style={{ transformOrigin: '60px 125px', transform: `rotate(${wheelRotation}deg)` }}>
                    <circle cx="60" cy="125" r="38" stroke="#1e293b" strokeWidth="10" fill="none" />
                    <circle cx="60" cy="125" r="33" stroke="#475569" strokeWidth="2" fill="none" />
                    {/* Spokes */}
                    <line x1="60" y1="92" x2="60" y2="158" stroke="#94a3b8" strokeWidth="1.5" />
                    <line x1="27" y1="125" x2="93" y2="125" stroke="#94a3b8" strokeWidth="1.5" />
                    <circle cx="60" cy="125" r="7" fill="#64748b" />
                  </g>

                  {/* Front Wheel */}
                  <g style={{ transformOrigin: '260px 125px', transform: `rotate(${wheelRotation}deg)` }}>
                    <circle cx="260" cy="125" r="38" stroke="#1e293b" strokeWidth="10" fill="none" />
                    <circle cx="260" cy="125" r="33" stroke="#475569" strokeWidth="2" fill="none" />
                    <line x1="260" y1="92" x2="260" y2="158" stroke="#94a3b8" strokeWidth="1.5" />
                    <line x1="227" y1="125" x2="293" y2="125" stroke="#94a3b8" strokeWidth="1.5" />
                    <circle cx="260" cy="125" r="7" fill="#64748b" />
                  </g>

                  {/* Rear Hub Motor */}
                  <circle cx="60" cy="125" r="16" fill="#0f172a" stroke="#06b6d4" strokeWidth="2.5" />
                  <text x="60" y="127" fill="#06b6d4" fontSize="6.5" fontWeight="bold" textAnchor="middle">
                    {selectedMotor.ratedVoltage}V
                  </text>
                  <text x="60" y="134" fill="#38bdf8" fontSize="5" fontWeight="bold" textAnchor="middle">
                    {selectedMotor.powerWatts}W
                  </text>

                  {/* Frame Tubes */}
                  <polyline
                    points="60,125 140,125 210,65 115,65 60,125"
                    stroke={frameColor}
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                  {/* Seat tube */}
                  <line x1="140" y1="125" x2="115" y2="50" stroke={frameColor} strokeWidth="7" strokeLinecap="round" />
                  {/* Front fork */}
                  <line x1="260" y1="125" x2="230" y2="45" stroke={frameColor} strokeWidth="7" strokeLinecap="round" />
                  {/* Downtube */}
                  <line x1="140" y1="125" x2="230" y2="45" stroke={frameColor} strokeWidth="8" strokeLinecap="round" />

                  {/* Handlebars */}
                  <path d="M225 45 L245 40 L255 52" stroke="#e2e8f0" strokeWidth="5" strokeLinecap="round" fill="none" />
                  <circle cx="255" cy="52" r="3" fill="#0284c7" />

                  {/* Saddle */}
                  <path d="M102 50 C110 46, 128 46, 134 52" stroke="#0f172a" strokeWidth="9" strokeLinecap="round" />

                  {/* Battery Downtube Mounting Bracket */}
                  <rect
                    x="150"
                    y="74"
                    width="50"
                    height="26"
                    rx="5"
                    fill="#020617"
                    stroke="#475569"
                    strokeWidth="1.5"
                    strokeDasharray={isBatteryInstalled ? 'none' : '3 2'}
                  />

                  {/* Battery Pack Graphic */}
                  {isBatteryInstalled && (
                    <g className={isInstalling ? 'animate-bounce' : ''}>
                      <rect
                        x="152"
                        y="76"
                        width="46"
                        height="22"
                        rx="4"
                        fill={isVoltageMatch ? '#10b981' : isUnderVoltage ? '#f59e0b' : '#f43f5e'}
                        stroke="#ffffff"
                        strokeWidth="1.5"
                      />
                      <text x="175" y="87" fill="#022c22" fontSize="7" fontWeight="black" textAnchor="middle">
                        ⚡ {selectedPack.nominalVoltage.toFixed(1)}V
                      </text>
                      <text x="175" y="94" fill="#022c22" fontSize="5.5" fontWeight="bold" textAnchor="middle">
                        {selectedPack.capacityMah}mAh
                      </text>
                    </g>
                  )}

                  {!isBatteryInstalled && (
                    <text x="175" y="90" fill="#94a3b8" fontSize="6.5" textAnchor="middle">
                      (แท่นแบตเตอรี่ว่าง)
                    </text>
                  )}
                </svg>

                {/* Battery Mount Status Tag */}
                <div className="flex items-center gap-2 mt-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                      isBatteryInstalled
                        ? isVoltageMatch
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    {isBatteryInstalled ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>
                          ติดตั้งแล้ว: {selectedPack.name} (คู่กับมอเตอร์ {selectedMotor.ratedVoltage}V)
                        </span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                        <span>ยังไม่ได้ติดตั้งชุดแบตเตอรี่</span>
                      </>
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Expected Operating Limits Dashboard */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs bg-slate-950/80 p-3 rounded-xl border border-slate-800">
              <div className="text-center">
                <span className="text-[10px] text-slate-400 block">ความเร็วสูงสุดประเมิน</span>
                <span className="font-mono font-black text-emerald-400 text-sm">
                  {topSpeedKmh} กม./ชม.
                </span>
              </div>
              <div className="text-center">
                <span className="text-[10px] text-slate-400 block">อัตราเร่ง 0-30 กม./ชม.</span>
                <span className="font-mono font-black text-amber-400 text-sm">
                  {accelSeconds < 90 ? `${accelSeconds} วิ` : '-'}
                </span>
              </div>
              <div className="text-center">
                <span className="text-[10px] text-slate-400 block">ระยะทางวิ่งต่อเนื่อง</span>
                <span className="font-mono font-black text-cyan-400 text-sm">
                  ~{rangeKm} กม.
                </span>
              </div>
              <div className="text-center">
                <span className="text-[10px] text-slate-400 block">พลังงานสะสม (Stored)</span>
                <span className="font-mono font-black text-purple-400 text-sm">
                  {storedEnergyWh} Wh
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: 8-Cell Budget Pack Selector & Engineering Trade-Offs (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* Battery Pack Selection Card */}
          <div className="bg-slate-900/95 border border-indigo-500/30 rounded-2xl p-4 shadow-xl flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-black text-amber-300 flex items-center gap-1.5 uppercase">
                <BatteryCharging className="w-4 h-4 text-amber-400" />
                โควตาแบตเตอรี่ 8 ก้อน (8-Cell Budget Quota)
              </span>
              <span className="text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30">
                เซลล์: {selectedPack.totalCells}/8 ก้อน
              </span>
            </div>

            {/* Pack Options List */}
            <div className="space-y-2">
              {GARAGE_PACKS.map((pack) => {
                const isSelected = selectedPackId === pack.id;
                const matchesCurrentMotor = pack.recommendedForMotorVoltage === selectedMotor.ratedVoltage;
                const isPackOver = pack.nominalVoltage > selectedMotor.ratedVoltage;

                return (
                  <button
                    key={pack.id}
                    onClick={() => handleSelectPack(pack)}
                    className={`w-full p-3 rounded-xl border text-left transition flex items-start justify-between gap-2 ${
                      isSelected
                        ? matchesCurrentMotor
                          ? 'bg-emerald-950/70 border-emerald-500 text-white shadow-md ring-1 ring-emerald-500/50'
                          : isPackOver
                          ? 'bg-rose-950/70 border-rose-500 text-white shadow-md'
                          : 'bg-amber-950/60 border-amber-500 text-white shadow-md'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-xs text-slate-100">{pack.name}</span>
                        {matchesCurrentMotor && (
                          <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.2 rounded font-mono font-bold">
                            คู่มอเตอร์ {pack.recommendedForMotorVoltage}V
                          </span>
                        )}
                        {isPackOver && (
                          <span className="text-[9px] bg-rose-500/20 text-rose-300 px-1.5 py-0.2 rounded font-mono font-bold">
                            แรงดันเกิน!
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 block mt-1 leading-relaxed">
                        {pack.description}
                      </span>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-mono text-xs font-bold text-amber-300 block">
                        {pack.nominalVoltage.toFixed(1)}V
                      </span>
                      <span className="text-[10px] font-mono text-cyan-400 block">
                        {pack.capacityMah} mAh
                      </span>
                      <span className="text-[9px] font-mono text-slate-500 block">
                        {pack.totalCells} ก้อน
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Strategic Vocational Trade-off Guidance Card */}
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-[11px] space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-indigo-300">
                <Scale className="w-3.5 h-3.5 text-indigo-400" />
                <span>หลักการคราฟต์แบตเตอรี่ตามกฎไฟฟ้า (Vocational Physics):</span>
              </div>
              <p className="text-slate-300 leading-relaxed text-[10px]">
                {selectedMotor.ratedVoltage === 24 && selectedPack.nominalVoltage === 24 ? (
                  <span className="text-amber-300">
                    ⚡ <strong>คำเตือนกลยุทธ์ 24V (8S 1P):</strong> ได้แรงบิดสูงสุด 2.8 Nm ไต่เขาชันเร็วที่สุด แต่ความจุเหลือเพียง <strong>2,000 mAh</strong> เพราะต้องอนุกรมทั้ง 8 ก้อน! หากกด Boost แช่ตลอดทาง แบตเตอรี่จะหมดก่อนถึงยอดเขา! ต้องอาศัยแรงคนปั่นผสมและปล่อยไหลลงเขา
                  </span>
                ) : selectedMotor.ratedVoltage === 12 && selectedPack.nominalVoltage === 12 ? (
                  <span className="text-emerald-300">
                    ⚖️ <strong>ความสมดุล 12V (4S 2P):</strong> อนุกรม 4 ก้อน (12V) และขนาน 2 แถว ได้ความจุ <strong>4,000 mAh</strong> สมดุลทั้งแรงบิดขึ้นเขาและระยะทางวิ่ง ไม่หมดกลางทางง่ายๆ
                  </span>
                ) : selectedMotor.ratedVoltage === 6 && selectedPack.nominalVoltage === 6 ? (
                  <span className="text-cyan-300">
                    🔋 <strong>ความจุสูงสุด 6V (2S 4P):</strong> ขนาน 4 แถว ความจุมหาศาลถึง <strong>8,000 mAh</strong> วิ่งได้ไกลสุดยอด แต่แรงบิด 0.8 Nm อาจไต่เขาชัน 15% ได้ช้ามาก
                  </span>
                ) : isUnderVoltage ? (
                  <span className="text-rose-300">
                    ⚠️ <strong>แรงดันตกพิกัด (Undervoltage):</strong> มอเตอร์ {selectedMotor.ratedVoltage}V ทำงานด้วยไฟ {selectedPack.nominalVoltage}V กำลังขับลดลงเหลือ {Math.round(Math.pow(voltageRatio, 2) * 100)}% รถจะติดค้าง (Stall) บนเนินชัน!
                  </span>
                ) : (
                  <span className="text-rose-400">
                    ⛔ <strong>แรงดันเกินพิกัด (Overvoltage):</strong> มอเตอร์ไม่สามารถรับแรงดันนี้ได้ เสี่ยงต่อการลุกไหม้
                  </span>
                )}
              </p>
            </div>

            {/* Installation Action Button */}
            <div className="mt-1">
              <button
                onClick={handleInstallBattery}
                disabled={isInstalling}
                className={`w-full py-3 rounded-xl font-black text-xs shadow-lg flex items-center justify-center gap-2 transition active:scale-95 ${
                  isBatteryInstalled
                    ? 'bg-slate-800 text-emerald-400 border border-emerald-500/40'
                    : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:brightness-110 text-slate-950 shadow-emerald-500/30'
                }`}
              >
                {isInstalling ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin" />
                    <span>กำลังติดตั้งและเชื่อมต่อขั้วสาย...</span>
                  </>
                ) : isBatteryInstalled ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>ติดตั้งเรียบร้อยแล้ว (คลิกเพื่อสลับแพ็ก)</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 fill-current" />
                    <span>คลิกเพื่อติดตั้งชุดแบตเตอรี่ลงในโครงจักรยาน</span>
                  </>
                )}
              </button>
            </div>

            {/* Rejection Error Alert if Incompatible */}
            {installationError && (
              <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-600 text-rose-200 text-xs flex items-start gap-2.5 animate-in fade-in">
                <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div className="leading-relaxed">{installationError}</div>
              </div>
            )}
          </div>

          {/* Safety Checklist Card */}
          <div className="bg-slate-900/95 border border-indigo-500/30 rounded-2xl p-4 shadow-xl flex flex-col gap-2.5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-black text-emerald-300 flex items-center gap-1.5 uppercase">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                การตรวจสอบความเข้ากันได้ทางวิศวกรรม (Engineering Check)
              </span>
            </div>

            <div className="space-y-1.5 text-xs">
              {/* Check 1: Voltage Compatibility */}
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800">
                <span className="flex items-center gap-2 text-slate-300">
                  {isVoltageMatch ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : isUnderVoltage ? (
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-400" />
                  )}
                  <span>ความเข้ากันได้ของแรงดัน (Voltage Matching):</span>
                </span>
                <span
                  className={`font-mono font-bold ${
                    isVoltageMatch
                      ? 'text-emerald-400'
                      : isUnderVoltage
                      ? 'text-amber-400'
                      : 'text-rose-400'
                  }`}
                >
                  {selectedPack.nominalVoltage.toFixed(1)}V / {selectedMotor.ratedVoltage.toFixed(1)}V
                </span>
              </div>

              {/* Check 2: 8-Cell Budget Quota */}
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800">
                <span className="flex items-center gap-2 text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>โควตาเซลล์ไม่เกิน 8 ก้อน (Cell Budget):</span>
                </span>
                <span className="font-mono font-bold text-emerald-400">
                  {selectedPack.totalCells} / 8 เซลล์ (ผ่าน)
                </span>
              </div>

              {/* Check 3: Current Capacity */}
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800">
                <span className="flex items-center gap-2 text-slate-300">
                  <BatteryCharging className="w-4 h-4 text-cyan-400" />
                  <span>ความจุเพื่อความต่อเนื่อง (Capacity):</span>
                </span>
                <span className="font-mono font-bold text-cyan-400">
                  {selectedPack.capacityMah} mAh
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Save Toast */}
      {saveToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border-2 border-emerald-500 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4">
          <Sparkles className="w-5 h-5 text-emerald-400 animate-spin" />
          <span className="text-xs font-bold">{saveToast}</span>
        </div>
      )}
    </div>
  );
};
