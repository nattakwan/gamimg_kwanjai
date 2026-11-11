/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * BikeGarageScreen — Electric-Assist Bike Garage & Assembly Bay (Scene 11).
 * Redesigned with:
 * 1. Bright modern workshop/laboratory showroom aesthetic (Light Theme).
 * 2. Visual infographics and icons, zero redundant stacked headers.
 * 3. Side-by-side 3D Showroom:
 *    - Left: Player's customized character from Character Creator (Character3DViewer).
 *    - Right: Enlarged 3D Electric Bicycle (Bike3DViewer) with exact wheel-ground contact and zero overlay obstruction.
 * 4. 8-Cell Battery quota infographic with instant 1-click installation on pack selection.
 */

import React, { useState } from 'react';
import {
  Wrench,
  Zap,
  Gauge,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Sparkles,
  Save,
  ShieldCheck,
  ShieldAlert,
  BatteryCharging,
  Play,
  AlertTriangle,
  Cpu,
  Timer,
  Compass,
  Battery,
  Check,
} from 'lucide-react';
import { useGameState } from '../../context/GameStateContext';
import { Character3DViewer } from '../character/Character3DViewer';
import { Bike3DViewer } from '../garage/Bike3DViewer';
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
  circuitTag: string;
  nominalVoltage: number;
  capacityMah: number;
  seriesCount: number;
  parallelCount: number;
  totalCells: number;
  internalResistance: number;
  tagline: string;
  recommendedForMotorVoltage: MotorVoltageRating;
}

const GARAGE_PACKS: GaragePack[] = [
  {
    id: 'pack_2s4p_6v',
    code: '2S 4P',
    name: 'ชุดผสมความจุสูง',
    circuitTag: '2S 4P (อนุกรม 2 ขนาน 4)',
    nominalVoltage: 6.0,
    capacityMah: 8000,
    seriesCount: 2,
    parallelCount: 4,
    totalCells: 8,
    internalResistance: 0.08,
    tagline: 'ความจุสูง 8,000 mAh วิ่งไกล แบตอึดสุด',
    recommendedForMotorVoltage: 6,
  },
  {
    id: 'pack_4s2p_12v',
    code: '4S 2P',
    name: 'ชุดผสมสมดุลลงตัว',
    circuitTag: '4S 2P (อนุกรม 4 ขนาน 2)',
    nominalVoltage: 12.0,
    capacityMah: 4000,
    seriesCount: 4,
    parallelCount: 2,
    totalCells: 8,
    internalResistance: 0.15,
    tagline: 'สมดุล 12V 4,000 mAh กำลังขับสม่ำเสมอ',
    recommendedForMotorVoltage: 12,
  },
  {
    id: 'pack_8s1p_24v',
    code: '8S 1P',
    name: 'ชุดอนุกรมแรงบิดสูง',
    circuitTag: '8S 1P (อนุกรม 8 ล้วน)',
    nominalVoltage: 24.0,
    capacityMah: 2000,
    seriesCount: 8,
    parallelCount: 1,
    totalCells: 8,
    internalResistance: 0.35,
    tagline: 'แรงบิดสูงสุด 24V พลังปีนเขาชัน แต่คายประจุเร็ว',
    recommendedForMotorVoltage: 24,
  },
  {
    id: 'pack_2s2p_6v',
    code: '2S 2P',
    name: 'ชุดประหยัดน้ำหนักเบา',
    circuitTag: '2S 2P (อนุกรม 2 ขนาน 2)',
    nominalVoltage: 6.0,
    capacityMah: 4000,
    seriesCount: 2,
    parallelCount: 2,
    totalCells: 4,
    internalResistance: 0.16,
    tagline: 'ชุด 4 ก้อน เบา คล่องตัว เหมาะทดสอบ',
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
  const [frameType] = useState<string>(
    state.bikeSetup?.frameType || 'lightning_cruiser'
  );
  const [frameColor] = useState<string>(
    state.bikeSetup?.frameColor || '#06b6d4'
  );
  const [tireType] = useState<string>(
    state.bikeSetup?.tireType || 'slick_street'
  );

  // Battery Selection (Instant 1-Click Installation)
  const [selectedPackId, setSelectedPackId] = useState<string>(() => {
    if (selectedMotor.ratedVoltage === 24) return 'pack_8s1p_24v';
    if (selectedMotor.ratedVoltage === 6) return 'pack_2s4p_6v';
    return 'pack_4s2p_12v';
  });

  const [isBatteryInstalled, setIsBatteryInstalled] = useState<boolean>(true);
  const [installationError, setInstallationError] = useState<string | null>(null);

  // Bench Test Run Simulation
  const [isTestSpinning, setIsTestSpinning] = useState<boolean>(false);

  // Toast Feedback
  const [saveToast, setSaveToast] = useState<string | null>(null);

  const selectedPack =
    GARAGE_PACKS.find((p) => p.id === selectedPackId) || GARAGE_PACKS[1];

  // Engineering Compatibility Logic
  const isVoltageMatch = selectedPack.nominalVoltage === selectedMotor.ratedVoltage;
  const isOverVoltage = selectedPack.nominalVoltage > selectedMotor.ratedVoltage;
  const isUnderVoltage = selectedPack.nominalVoltage < selectedMotor.ratedVoltage;
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
      rangeKm = Number(((selectedPack.capacityMah / 1000) * 3.2).toFixed(1));
    } else if (selectedMotor.ratedVoltage === 12) {
      topSpeedKmh = 35;
      accelSeconds = 3.4;
      rangeKm = Number(((selectedPack.capacityMah / 1000) * 4.8).toFixed(1));
    } else {
      topSpeedKmh = 27;
      accelSeconds = 4.8;
      rangeKm = Number(((selectedPack.capacityMah / 1000) * 6.5).toFixed(1));
    }
  } else if (isUnderVoltage) {
    const powerScale = Math.pow(voltageRatio, 2);
    topSpeedKmh = Math.max(12, Math.round(30 * powerScale));
    accelSeconds = Math.min(15, Number((5.0 / powerScale).toFixed(1)));
    rangeKm = Number(((selectedPack.capacityMah / 1000) * 5.0).toFixed(1));
  }

  // Handle Motor Selection (Auto-matches recommended pack & installs immediately)
  const handleSelectMotor = (motorId: string) => {
    playTone(520, 'sine', 0.1);
    setSelectedMotorId(motorId);
    const motor = MOTOR_CATALOG[motorId];
    if (motor) {
      if (motor.ratedVoltage === 24) setSelectedPackId('pack_8s1p_24v');
      else if (motor.ratedVoltage === 12) setSelectedPackId('pack_4s2p_12v');
      else setSelectedPackId('pack_2s4p_6v');
    }
    setIsBatteryInstalled(true);
    setInstallationError(null);
  };

  // Handle Battery Selection (Instant 1-Click Installation into Bicycle Frame)
  const handleSelectPack = (pack: GaragePack) => {
    setSelectedPackId(pack.id);
    if (pack.nominalVoltage > selectedMotor.ratedVoltage) {
      playTone(180, 'sawtooth', 0.35);
      setIsBatteryInstalled(false);
      setInstallationError(
        `อันตราย! แรงดันแบตเตอรี่ (${pack.nominalVoltage}V) เกินพิกัดมอเตอร์ (${selectedMotor.ratedVoltage}V) ขดลวดมอเตอร์จะไหม้เสียหาย ระบบตัดการติดตั้งอัตโนมัติ!`
      );
    } else {
      playTone(550, 'sine', 0.1);
      setIsBatteryInstalled(true);
      setInstallationError(null);
      setSaveToast(`ติดตั้ง ${pack.code} (${pack.nominalVoltage}V) เข้ากับมอเตอร์ ${selectedMotor.ratedVoltage}V เรียบร้อย!`);
      setTimeout(() => setSaveToast(null), 2500);
    }
  };

  // Handle Test Setup Run
  const handleTestSetup = () => {
    if (!isBatteryInstalled) {
      playTone(280, 'square', 0.2);
      setSaveToast('กรุณาเลือกชุดแบตเตอรี่ที่เข้ากันได้ก่อนทดสอบ!');
      setTimeout(() => setSaveToast(null), 3000);
      return;
    }

    playTone(650, 'sawtooth', 0.2);
    setIsTestSpinning(true);
    setSaveToast(
      isVoltageMatch
        ? `ทดสอบมอเตอร์ ${selectedMotor.ratedVoltage}V: ความเร็วสูงสุด ${topSpeedKmh} กม./ชม. ระบบสมบูรณ์พร้อมแข่ง!`
        : `คำเตือน: แรงดัน ${selectedPack.nominalVoltage}V จ่ายไฟให้มอเตอร์ ${selectedMotor.ratedVoltage}V ได้เพียง ${Math.round(Math.pow(voltageRatio, 2) * 100)}%`
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
      setSaveToast('กรุณาเลือกชุดแบตเตอรี่ที่เข้ากันได้ก่อนบันทึก');
      setTimeout(() => setSaveToast(null), 3000);
      return;
    }

    playTone(600, 'sine', 0.15);

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

    setSaveToast('บันทึกการปรับแต่งจักรยาน มอเตอร์ และชุดแบตเตอรี่เรียบร้อยแล้ว!');
    setTimeout(() => setSaveToast(null), 3000);
  };

  const handleContinue = () => {
    handleSaveAll();
    goToScene('race_prep');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-sky-50 to-indigo-50/40 text-slate-800 flex flex-col font-sans select-none pb-8">
      {/* ─── Sleek Workshop Toolbar (Integrated, No Duplicate Header Bar) ──── */}
      <div className="max-w-7xl mx-auto w-full px-4 pt-4 pb-2 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white flex items-center justify-center font-bold shadow-sm">
            <Wrench className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>อู่ประกอบและปรับจูนจักรยานไฟฟ้า (E-Bike Assembly & Tuning)</span>
              <span className="text-[10px] font-bold bg-sky-100 text-sky-800 px-2 py-0.5 rounded-full border border-sky-200">
                ฉากที่ 11
              </span>
            </h2>
            <p className="text-[11px] text-slate-500">
              แมตช์พิกัดแรงดันมอเตอร์คู่กับโควตาเซลล์แบตเตอรี่ 8 ก้อนเพื่อเตรียมลงสนามแข่ง
            </p>
          </div>
        </div>

        {/* Action Controls Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleTestSetup}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white hover:bg-sky-50 text-sky-700 text-xs font-bold border border-sky-200 transition min-h-[38px] shadow-sm active:scale-95 cursor-pointer"
            title="ทดสอบหมุนล้อจำลองรอบมอเตอร์"
          >
            <Play className={`w-3.5 h-3.5 text-sky-600 ${isTestSpinning ? 'animate-spin' : ''}`} />
            <span>ทดสอบระบบ (Test Bench)</span>
          </button>

          <button
            onClick={handleSaveAll}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white hover:bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200 transition min-h-[38px] shadow-sm active:scale-95 cursor-pointer"
            title="บันทึกการตั้งค่าลงเกม"
          >
            <Save className="w-3.5 h-3.5 text-emerald-600" />
            <span>บันทึกการแต่งรถ</span>
          </button>

          <button
            onClick={handleContinue}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:brightness-105 text-white text-xs font-black shadow-md shadow-emerald-500/25 active:scale-95 transition min-h-[38px] cursor-pointer"
            title="ไปต่อยังหน้าเตรียมตัวเข้าสู่สนามแข่ง"
          >
            <span>ต่อไปสนามแข่ง (Continue)</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ─── Main Content Grid ─────────────────────────────────────────── */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 p-4 max-w-7xl mx-auto w-full">
        {/* Left Column: Motor Selection + 3D Showroom Stage (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col gap-5">
          {/* 1. Motor Selector Infographic Cards */}
          <section className="bg-white/90 border border-slate-200/90 rounded-2xl p-4 shadow-sm backdrop-blur-md">
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2.5">
              <span className="text-xs font-black text-slate-800 flex items-center gap-2 uppercase tracking-wide">
                <Cpu className="w-4 h-4 text-sky-600" />
                เลือกพิกัดมอเตอร์ขับเคลื่อน (Electric Motor Rating)
              </span>
              <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                โควตาแบต 8 เซลล์เท่ากัน
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {Object.values(MOTOR_CATALOG).map((motor) => {
                const isSelected = selectedMotorId === motor.id;
                const isEco = motor.ratedVoltage === 6;
                const isSport = motor.ratedVoltage === 12;
                const isMonster = motor.ratedVoltage === 24;

                return (
                  <button
                    key={motor.id}
                    onClick={() => handleSelectMotor(motor.id)}
                    className={`p-3.5 rounded-xl border text-left transition relative flex flex-col justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-gradient-to-b from-sky-50 to-white border-sky-500 ring-2 ring-sky-400/30 shadow-md'
                        : 'bg-slate-50/70 border-slate-200 text-slate-600 hover:bg-slate-100/80 hover:border-slate-300'
                    }`}
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center justify-between mb-1.5">
                        <span
                          className={`px-2 py-0.5 rounded-lg text-xs font-black font-mono ${
                            isMonster
                              ? 'bg-rose-100 text-rose-700 border border-rose-200'
                              : isSport
                              ? 'bg-sky-100 text-sky-700 border border-sky-200'
                              : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {motor.ratedVoltage}V
                        </span>
                        <span className="text-xs font-bold font-mono text-amber-600 flex items-center gap-0.5">
                          <Zap className="w-3.5 h-3.5 fill-current" />
                          {motor.powerWatts}W
                        </span>
                      </div>

                      {/* Motor Title */}
                      <span className="text-xs font-black text-slate-900 block">
                        {isEco ? '🌱 มอเตอร์ Eco' : isSport ? '⚡ มอเตอร์ Sport' : '🚀 มอเตอร์ Monster'}
                      </span>
                      <span className="text-[11px] text-slate-500 block">
                        {isEco ? 'ประหยัดไฟ วิ่งไกล' : isSport ? 'สมดุลรอบด้าน' : 'แรงบิดสูงสุด เนินชัน'}
                      </span>
                    </div>

                    {/* Infographic Specs Bar */}
                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-mono">
                      <span className="font-bold text-emerald-700 flex items-center gap-1">
                        <Gauge className="w-3 h-3" />
                        {motor.torqueNm} Nm
                      </span>
                      <span className="text-slate-500 font-bold">
                        {motor.maxRpm} RPM
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* 2. Visual Showroom Stage: 3D Character (Kwanjai) + 3D E-Bike (Blender GLB) */}
          <section className="bg-white/95 border border-slate-200/90 rounded-2xl p-4 md:p-5 shadow-lg flex flex-col justify-between min-h-[490px] relative overflow-hidden backdrop-blur-md">
            {/* Soft Ambient Workshop Lighting Flare */}
            <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-sky-100/60 via-emerald-50/20 to-transparent pointer-events-none" />

            {/* Showroom Header */}
            <div className="relative z-10 flex items-center justify-between text-xs border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-black text-slate-800 uppercase tracking-wide">
                  โซนประกอบและปรับแต่งยานยนต์ (Vehicle Showcase & Assembly)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded-lg border border-sky-200">
                  MOTOR: {selectedMotor.ratedVoltage}V ({selectedMotor.powerWatts}W)
                </span>
                <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                  BUDGET: 8 เซลล์
                </span>
              </div>
            </div>

            {/* Split Stage: Character (Scene 2) & Bicycle (Scene 11) */}
            <div className="relative z-10 grid grid-cols-1 sm:grid-cols-12 gap-3 my-auto py-2 items-stretch">
              {/* Left Stage (4 Cols): Customized 3D Character from Character Creator */}
              <div className="sm:col-span-4 flex flex-col items-center justify-between bg-gradient-to-b from-sky-50/70 via-emerald-50/40 to-slate-50/80 rounded-2xl border border-slate-200/80 p-2 shadow-inner relative overflow-hidden min-h-[300px]">
                {/* Character Name & Role Badge */}
                <div className="w-full flex items-center justify-between px-2 pt-1 z-10">
                  <span className="text-[11px] font-black text-slate-800 bg-white/90 px-2.5 py-0.5 rounded-full border border-slate-200 shadow-sm">
                    {state.character.name || 'ขวัญใจ (Kwanjai)'}
                  </span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full border border-emerald-200">
                    นักปั่น & วิศวกร
                  </span>
                </div>

                {/* 3D Character Viewer (Same model as CharacterCreatorScreen, No obscuring text) */}
                <div className="w-full flex-1 flex items-center justify-center my-1 relative">
                  <Character3DViewer character={state.character} className="w-full h-[255px]" />
                </div>
              </div>

              {/* Right Stage (8 Cols): 3D Bicycle Viewer (100% Unobstructed Full Bike View) */}
              <div className="sm:col-span-8 flex flex-col items-center justify-between bg-gradient-to-b from-white via-slate-50/50 to-sky-50/30 rounded-2xl border border-slate-200/80 p-2 shadow-inner relative overflow-hidden min-h-[320px]">
                {/* 3D E-Bike Canvas (Clear view from handlebar to tires) */}
                <div className="w-full flex-1 flex items-center justify-center relative">
                  <Bike3DViewer
                    frameColor={frameColor}
                    motorVoltage={selectedMotor.ratedVoltage}
                    batteryPackName={isBatteryInstalled ? selectedPack.name : undefined}
                  />
                </div>

                {/* Mounted Battery Status Indicator Pill */}
                <div className="w-full flex items-center justify-between px-3 py-1.5 bg-white/90 border-t border-slate-100 rounded-b-xl z-10">
                  <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                    <Battery className="w-3.5 h-3.5 text-sky-600" />
                    สถานะการติดตั้ง:
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold flex items-center gap-1 ${
                      isBatteryInstalled
                        ? isVoltageMatch
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-amber-100 text-amber-800 border border-amber-300'
                        : 'bg-rose-100 text-rose-700 border border-rose-300'
                    }`}
                  >
                    {isBatteryInstalled ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                        พร้อมแข่ง: {selectedPack.code} ({selectedPack.nominalVoltage.toFixed(1)}V {selectedPack.capacityMah}mAh)
                      </>
                    ) : (
                      'ตัดการทำงาน (แรงดันไม่เข้ากัน)'
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* 3. Performance Dashboard Infographic (Bottom Banner) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/90 p-3.5 rounded-2xl border border-slate-200/90 mt-2">
              {/* Top Speed */}
              <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 text-center shadow-sm">
                <span className="text-[10px] font-bold text-slate-500 flex items-center justify-center gap-1">
                  <Gauge className="w-3.5 h-3.5 text-emerald-600" />
                  ความเร็วประเมิน
                </span>
                <span className="font-mono font-black text-emerald-700 text-base md:text-lg block mt-0.5">
                  {topSpeedKmh} <span className="text-xs font-sans text-slate-500 font-bold">กม./ชม.</span>
                </span>
              </div>

              {/* 0-30 Accel */}
              <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 text-center shadow-sm">
                <span className="text-[10px] font-bold text-slate-500 flex items-center justify-center gap-1">
                  <Timer className="w-3.5 h-3.5 text-amber-600" />
                  อัตราเร่ง 0-30
                </span>
                <span className="font-mono font-black text-amber-700 text-base md:text-lg block mt-0.5">
                  {accelSeconds < 90 ? accelSeconds : '-'} <span className="text-xs font-sans text-slate-500 font-bold">วิ</span>
                </span>
              </div>

              {/* Range */}
              <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 text-center shadow-sm">
                <span className="text-[10px] font-bold text-slate-500 flex items-center justify-center gap-1">
                  <Compass className="w-3.5 h-3.5 text-sky-600" />
                  ระยะทางวิ่ง
                </span>
                <span className="font-mono font-black text-sky-700 text-base md:text-lg block mt-0.5">
                  ~{rangeKm} <span className="text-xs font-sans text-slate-500 font-bold">กม.</span>
                </span>
              </div>

              {/* Stored Energy */}
              <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 text-center shadow-sm">
                <span className="text-[10px] font-bold text-slate-500 flex items-center justify-center gap-1">
                  <BatteryCharging className="w-3.5 h-3.5 text-indigo-600" />
                  พลังงานรวม (Stored)
                </span>
                <span className="font-mono font-black text-indigo-700 text-base md:text-lg block mt-0.5">
                  {storedEnergyWh} <span className="text-xs font-sans text-slate-500 font-bold">Wh</span>
                </span>
              </div>
            </div>
          </section>
        </div>

        {/* Right Column: 8-Cell Budget Quota & Engineering Checks (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          {/* 1. Battery Pack Quota Infographic Card */}
          <section className="bg-white/95 border border-slate-200/90 rounded-2xl p-4 md:p-5 shadow-lg flex flex-col gap-3.5 backdrop-blur-md">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <span className="text-xs font-black text-slate-800 flex items-center gap-2 uppercase tracking-wide">
                <BatteryCharging className="w-4 h-4 text-amber-600" />
                โควตาแบตเตอรี่ 8 ก้อน (8-Cell Quota)
              </span>
              <span className="text-[10px] font-mono font-bold bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full border border-amber-300">
                เซลล์ที่ใช้: {selectedPack.totalCells}/8 ก้อน
              </span>
            </div>

            {/* Visual 8-Cell Battery Bank Infographic */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between text-[10px] text-slate-600 font-bold mb-2">
                <span>แผนผังช่องใส่เซลล์แบตเตอรี่ (Cell Slots):</span>
                <span className="font-mono text-sky-700 font-bold">{selectedPack.circuitTag}</span>
              </div>
              <div className="grid grid-cols-8 gap-1.5">
                {Array.from({ length: 8 }).map((_, idx) => {
                  const isOccupied = idx < selectedPack.totalCells;
                  return (
                    <div
                      key={idx}
                      className={`h-9 rounded-lg flex flex-col items-center justify-center text-[10px] font-mono font-bold transition-all shadow-sm ${
                        isOccupied
                          ? isVoltageMatch
                            ? 'bg-gradient-to-b from-emerald-400 to-emerald-600 text-white shadow-emerald-500/20'
                            : 'bg-gradient-to-b from-amber-400 to-amber-600 text-white'
                          : 'bg-slate-200 text-slate-400 border border-dashed border-slate-300'
                      }`}
                    >
                      <span>🔋</span>
                      <span className="text-[8px] -mt-1 font-sans">{idx + 1}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Pack Options List (Visual Cards with Instant 1-Click Installation) */}
            <div className="space-y-2.5">
              {GARAGE_PACKS.map((pack) => {
                const isSelected = selectedPackId === pack.id;
                const matchesCurrentMotor = pack.recommendedForMotorVoltage === selectedMotor.ratedVoltage;
                const isPackOver = pack.nominalVoltage > selectedMotor.ratedVoltage;

                return (
                  <button
                    key={pack.id}
                    onClick={() => handleSelectPack(pack)}
                    className={`w-full p-3 rounded-xl border text-left transition flex items-center justify-between gap-3 cursor-pointer ${
                      isSelected
                        ? matchesCurrentMotor
                          ? 'bg-emerald-50/90 border-emerald-500 ring-2 ring-emerald-400/40 shadow-md'
                          : isPackOver
                          ? 'bg-rose-50/90 border-rose-500 ring-2 ring-rose-400/40 shadow-md'
                          : 'bg-amber-50/90 border-amber-500 ring-2 ring-amber-400/40 shadow-md'
                        : 'bg-slate-50/70 border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-xs text-slate-900">{pack.name}</span>
                        <span className="text-[10px] font-mono font-bold bg-white text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                          {pack.code}
                        </span>
                        {isSelected && matchesCurrentMotor && (
                          <span className="text-[9px] bg-emerald-600 text-white px-2 py-0.5 rounded-full font-bold flex items-center gap-1 shadow-sm">
                            <Check className="w-3 h-3 stroke-[3]" />
                            ติดตั้งใช้งาน
                          </span>
                        )}
                        {isPackOver && (
                          <span className="text-[9px] bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full font-bold">
                            แรงดันเกิน!
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-500 block mt-1">
                        {pack.tagline}
                      </span>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-mono text-xs font-black text-slate-900 block">
                        {pack.nominalVoltage.toFixed(1)}V
                      </span>
                      <span className="text-[11px] font-mono font-bold text-sky-700 block">
                        {pack.capacityMah} mAh
                      </span>
                      <span className="text-[10px] font-mono text-slate-400 block">
                        {pack.totalCells} ก้อน
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Vocational Strategy Callout (Visual Tip) */}
            <div className="bg-sky-50/80 p-3 rounded-xl border border-sky-200 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-sky-900 mb-1">
                <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                <span>คำแนะนำกลยุทธ์ช่างยนต์:</span>
              </div>
              <p className="text-slate-700 text-[11px] leading-relaxed">
                {selectedMotor.ratedVoltage === 24 && selectedPack.nominalVoltage === 24 ? (
                  <span>
                    ⚡ <strong>อนุกรม 8 ก้อน (24V 2,000mAh):</strong> แรงบิดมหาศาล 2.8 Nm ไต่เขาชันเร็วที่สุด แต่ความจุคายเร็ว แนะนำกด Boost สั้นๆ แล้วปล่อยไหลลงเขา
                  </span>
                ) : selectedMotor.ratedVoltage === 12 && selectedPack.nominalVoltage === 12 ? (
                  <span>
                    ⚖️ <strong>ผสมสมดุล (12V 4,000mAh):</strong> อนุกรม 4 ก้อน ขนาน 2 แถว ได้ทั้งแรงบิดขึ้นเขาและความจุวิ่งต่อเนื่อง เหมาะกับสนามแข่งทุกรูปแบบ
                  </span>
                ) : selectedMotor.ratedVoltage === 6 && selectedPack.nominalVoltage === 6 ? (
                  <span>
                    🔋 <strong>ขนานความจุสูงสุด (6V 8,000mAh):</strong> ขนาน 4 แถว ความจุมหาศาล วิ่งไกลสุด ไม่หมดกลางทางแน่นอน
                  </span>
                ) : isUnderVoltage ? (
                  <span className="text-amber-800">
                    ⚠️ <strong>แรงดันตกพิกัด:</strong> มอเตอร์ {selectedMotor.ratedVoltage}V ได้ไฟ {selectedPack.nominalVoltage}V ทำให้กำลังตกเหลือ {Math.round(Math.pow(voltageRatio, 2) * 100)}%
                  </span>
                ) : (
                  <span className="text-rose-700 font-bold">
                    ⛔ <strong>แรงดันเกินพิกัด:</strong> อันตราย! มอเตอร์เสี่ยงต่อการลุกไหม้ ห้ามติดตั้ง
                  </span>
                )}
              </p>
            </div>

            {/* Incompatibility Alert if Selected Pack is Overvoltage */}
            {installationError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-xs flex items-start gap-2.5 animate-in fade-in">
                <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed font-bold">{installationError}</div>
              </div>
            )}
          </section>

          {/* 2. Engineering Compatibility Checklist Card */}
          <section className="bg-white/95 border border-slate-200/90 rounded-2xl p-4 md:p-5 shadow-lg flex flex-col gap-3 backdrop-blur-md">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <span className="text-xs font-black text-slate-800 flex items-center gap-2 uppercase tracking-wide">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                การตรวจสอบความเข้ากันได้ (Engineering Check)
              </span>
            </div>

            <div className="space-y-2 text-xs">
              {/* Check 1: Voltage Match */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="flex items-center gap-2 text-slate-700 font-bold">
                  {isVoltageMatch ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : isUnderVoltage ? (
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-600" />
                  )}
                  <span>ความเข้ากันได้ของแรงดัน (Voltage Matching):</span>
                </span>
                <span
                  className={`font-mono font-black ${
                    isVoltageMatch
                      ? 'text-emerald-700'
                      : isUnderVoltage
                      ? 'text-amber-700'
                      : 'text-rose-700'
                  }`}
                >
                  {selectedPack.nominalVoltage.toFixed(1)}V / {selectedMotor.ratedVoltage.toFixed(1)}V
                </span>
              </div>

              {/* Check 2: Cell Quota */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="flex items-center gap-2 text-slate-700 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>โควตาเซลล์ไม่เกิน 8 ก้อน (Cell Budget):</span>
                </span>
                <span className="font-mono font-black text-emerald-700">
                  {selectedPack.totalCells} / 8 เซลล์ (ผ่าน)
                </span>
              </div>

              {/* Check 3: Capacity */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="flex items-center gap-2 text-slate-700 font-bold">
                  <BatteryCharging className="w-4 h-4 text-sky-600" />
                  <span>ความจุเพื่อความต่อเนื่อง (Capacity):</span>
                </span>
                <span className="font-mono font-black text-sky-700">
                  {selectedPack.capacityMah} mAh
                </span>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Floating Save Toast */}
      {saveToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-white/95 border-2 border-emerald-500 text-slate-900 px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 backdrop-blur-md animate-in fade-in slide-in-from-bottom-4">
          <Sparkles className="w-5 h-5 text-emerald-600 animate-spin" />
          <span className="text-xs font-black">{saveToast}</span>
        </div>
      )}
    </div>
  );
};
