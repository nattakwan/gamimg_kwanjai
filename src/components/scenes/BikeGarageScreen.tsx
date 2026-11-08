/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Wrench,
  Zap,
  Gauge,
  Palette,
  Layers,
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
  Sliders,
  Check,
  Play,
  RotateCw,
  HelpCircle,
  AlertTriangle,
} from 'lucide-react';
import { useGameState } from '../../context/GameStateContext';
import { AvatarRenderer } from '../common/AvatarRenderer';
import { VoltDialog } from '../common/VoltDialog';

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

interface AvailablePack {
  id: string;
  code: string;
  name: string;
  nominalVoltage: number;
  capacityMah: number;
  seriesCount: number;
  parallelCount: number;
  isCompatible: boolean;
  statusText: string;
  rejectionReason?: string;
  isRecommended?: boolean;
}

const GARAGE_PACKS: AvailablePack[] = [
  {
    id: 'pack_2s2p',
    code: '2S2P (4 ก้อน)',
    name: 'ชุดผสม 2S2P (3.0V 4000mAh)',
    nominalVoltage: 3.0,
    capacityMah: 4000,
    seriesCount: 2,
    parallelCount: 2,
    isCompatible: true,
    statusText: 'เข้ากันได้อย่างสมบูรณ์ (แรงดัน 3.0V พอดิบพอดีกับมอเตอร์)',
    isRecommended: true,
  },
  {
    id: 'pack_2s1p',
    code: '2S1P (2 ก้อน)',
    name: 'ชุดอนุกรม 2S1P (3.0V 2000mAh)',
    nominalVoltage: 3.0,
    capacityMah: 2000,
    seriesCount: 2,
    parallelCount: 1,
    isCompatible: true,
    statusText: 'เข้ากันได้ (แรงดัน 3.0V ความจุ 2000mAh)',
  },
  {
    id: 'pack_3s_unregulated',
    code: '3S Unregulated (3 ก้อน)',
    name: 'ชุดแรงดันสูง 3S (4.5V 2000mAh)',
    nominalVoltage: 4.5,
    capacityMah: 2000,
    seriesCount: 3,
    parallelCount: 1,
    isCompatible: false,
    statusText: 'อันตราย! แรงดัน 4.5V เกินพิกัดมอเตอร์ 3.0V',
    rejectionReason:
      'ระบบความปลอดภัยตัดการติดตั้งอัตโนมัติ! แบตเตอรี่ 4.5V เกินพิกัดมอเตอร์ 3.0V ถึง 150% ขดลวดมอเตอร์จะร้อนจัดและไหม้เสียหายทันที',
  },
  {
    id: 'pack_1s2p',
    code: '1S2P (2 ก้อน)',
    name: 'ชุดแรงดันต่ำ 1S (1.5V 4000mAh)',
    nominalVoltage: 1.5,
    capacityMah: 4000,
    seriesCount: 1,
    parallelCount: 2,
    isCompatible: false,
    statusText: 'ไม่แนะนำ (แรงดัน 1.5V ต่ำเกินไป มอเตอร์หมุนไม่ไหว)',
    rejectionReason:
      'แรงดัน 1.5V ไม่เพียงพอที่จะสร้างแรงบิดเอาชนะแรงเสียดทานของระบบขับเคลื่อนจักรยาน มอเตอร์จะติดค้าง (Stall)',
  },
];

export const BikeGarageScreen: React.FC = () => {
  const { state, goToScene, updateBikeSetup, updateBatteryPack } = useGameState();

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
  const [accentColor, setAccentColor] = useState<string>('#f59e0b');

  // Battery Selection & Animated Installation
  const [selectedPackId, setSelectedPackId] = useState<string>('pack_2s2p');
  const [isBatteryInstalled, setIsBatteryInstalled] = useState<boolean>(true);
  const [isInstalling, setIsInstalling] = useState<boolean>(false);
  const [installationError, setInstallationError] = useState<string | null>(null);

  // Bench Test Run Simulation
  const [isTestSpinning, setIsTestSpinning] = useState<boolean>(false);
  const [wheelRotation, setWheelRotation] = useState<number>(0);

  // Modals & Feedback
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const [showSafetyModal, setShowSafetyModal] = useState<boolean>(false);

  const selectedPack =
    GARAGE_PACKS.find((p) => p.id === selectedPackId) || GARAGE_PACKS[0];

  // Motor Specification
  const motorRatedVoltage = 3.0; // V
  const motorMaxRpm = 1760;

  // Stored Energy Calculation
  const storedEnergyWh = Number(
    ((selectedPack.nominalVoltage * selectedPack.capacityMah) / 1000).toFixed(1)
  );

  // Expected Operating Limits
  const topSpeedKmh = selectedPack.isCompatible
    ? selectedPack.id === 'pack_2s2p'
      ? 32
      : 28
    : 0;
  const accelSeconds = selectedPack.isCompatible
    ? selectedPack.id === 'pack_2s2p'
      ? 3.8
      : 4.6
    : 99;
  const rangeKm = selectedPack.isCompatible
    ? Number(((selectedPack.capacityMah / 1000) * 5.5).toFixed(1))
    : 0;

  // Wheel rotation animation loop when bench testing
  useEffect(() => {
    if (!isTestSpinning) return;
    const interval = setInterval(() => {
      setWheelRotation((prev) => (prev + 36) % 360);
    }, 40);
    return () => clearInterval(interval);
  }, [isTestSpinning]);

  // Handle Battery Selection
  const handleSelectPack = (pack: AvailablePack) => {
    playTone(500, 'sine', 0.08);
    setSelectedPackId(pack.id);
    setIsBatteryInstalled(false);
    setInstallationError(null);
  };

  // Handle Animated Battery Installation Action
  const handleInstallBattery = () => {
    if (!selectedPack.isCompatible) {
      playTone(180, 'sawtooth', 0.35);
      setInstallationError(
        selectedPack.rejectionReason || 'ชุดแบตเตอรี่นี้ไม่เข้ากันกับมอเตอร์ 3V!'
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
      setSaveToast(`ติดตั้ง ${selectedPack.name} ลงในโครงจักรยานเรียบร้อยและล็อกแน่นหนา!`);
      setTimeout(() => setSaveToast(null), 3000);
    }, 600);
  };

  // Handle Test Setup Run
  const handleTestSetup = () => {
    if (!isBatteryInstalled) {
      playTone(280, 'square', 0.2);
      setSaveToast('กรุณาติดตั้งชุดแบตเตอรี่ที่เข้ากันได้ลงในโครงจักรยานก่อนทดสอบ!');
      setTimeout(() => setSaveToast(null), 3000);
      return;
    }

    playTone(650, 'sawtooth', 0.2);
    setIsTestSpinning(true);
    setSaveToast(`กำลังทดสอบการหมุนของล้อและมอเตอร์: ความเร็วสูงสุด ${topSpeedKmh} กม./ชม.!`);

    setTimeout(() => {
      setIsTestSpinning(false);
      setTimeout(() => setSaveToast(null), 2500);
    }, 2200);
  };

  // Handle Save
  const handleSaveAll = () => {
    if (!isBatteryInstalled) {
      playTone(280, 'square', 0.2);
      setSaveToast('กรุณาติดตั้งแบตเตอรี่ให้ถูกต้องก่อนบันทึก');
      setTimeout(() => setSaveToast(null), 3000);
      return;
    }

    playTone(600, 'sine', 0.15);

    // Save to GameState
    updateBatteryPack({
      id: selectedPack.id,
      name: selectedPack.name,
      configType: selectedPack.parallelCount > 1 ? 'mixed_series_parallel' : 'series',
      seriesCount: selectedPack.seriesCount,
      parallelCount: selectedPack.parallelCount,
      nominalVoltage: selectedPack.nominalVoltage,
      nominalCapacityMah: selectedPack.capacityMah,
      totalVoltage: selectedPack.nominalVoltage,
      totalCapacityMah: selectedPack.capacityMah,
      isValidated: true,
      notes: `ติดตั้งในจักรยานแข่ง: ${selectedPack.name}`,
    });

    updateBikeSetup({
      frameType,
      frameColor,
      tireType,
      topSpeedKmh,
      accelSeconds,
      rangeKm,
      motorRatedVoltage: 3.0,
      motorMaxRpm,
    });

    setSaveToast('บันทึกการปรับแต่งจักรยานแข่งและชุดแบตเตอรี่เรียบร้อยแล้ว!');
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
                ติดตั้งชุดแบตเตอรี่ ปรับแต่งสีตัวถัง และตรวจสอบความปลอดภัยตามพิกัดมอเตอร์ 3.0V
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
            <span>ทดสอบระบบ (Test Setup)</span>
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
        {/* Left Column: Visual Hangar with Avatar & Cartoon E-Bike (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="bg-slate-900/95 border border-indigo-500/30 rounded-2xl p-5 shadow-2xl flex flex-col justify-between min-h-[500px] relative overflow-hidden">
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
              <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800">
                MOTOR: DC 3.0V (RATED)
              </span>
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

                  {/* Rear Hub Motor (DC 3V Motor) */}
                  <circle cx="60" cy="125" r="14" fill="#0f172a" stroke="#06b6d4" strokeWidth="2.5" />
                  <text x="60" y="128" fill="#06b6d4" fontSize="6" fontWeight="bold" textAnchor="middle">
                    3V MOTOR
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
                    x="152"
                    y="76"
                    width="46"
                    height="22"
                    rx="5"
                    fill="#020617"
                    stroke="#475569"
                    strokeWidth="1.5"
                    strokeDasharray={isBatteryInstalled ? 'none' : '3 2'}
                  />

                  {/* Battery Pack Graphic (Sliding / Installed) */}
                  {isBatteryInstalled && (
                    <g className={isInstalling ? 'animate-bounce' : ''}>
                      <rect
                        x="154"
                        y="78"
                        width="42"
                        height="18"
                        rx="4"
                        fill={selectedPack.isCompatible ? '#10b981' : '#f43f5e'}
                        stroke="#ffffff"
                        strokeWidth="1.5"
                      />
                      <text x="175" y="90" fill="#022c22" fontSize="7.5" fontWeight="black" textAnchor="middle">
                        ⚡ {selectedPack.nominalVoltage.toFixed(1)}V
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
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    }`}
                  >
                    {isBatteryInstalled ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>ติดตั้งแล้ว: {selectedPack.name}</span>
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
                  {selectedPack.isCompatible ? `${accelSeconds} วิ` : '-'}
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

        {/* Right Column: Battery Selector, Installation & Safety Checklist (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* Battery Pack Selection Card */}
          <div className="bg-slate-900/95 border border-indigo-500/30 rounded-2xl p-4 shadow-xl flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-black text-amber-300 flex items-center gap-1.5 uppercase">
                <BatteryCharging className="w-4 h-4 text-amber-400" />
                เลือกชุดแบตเตอรี่ที่ผ่านการทดสอบ (Select Battery Pack)
              </span>
            </div>

            {/* Pack Options List */}
            <div className="space-y-2">
              {GARAGE_PACKS.map((pack) => {
                const isSelected = selectedPackId === pack.id;
                return (
                  <button
                    key={pack.id}
                    onClick={() => handleSelectPack(pack)}
                    className={`w-full p-2.5 rounded-xl border text-left transition flex items-center justify-between ${
                      isSelected
                        ? pack.isCompatible
                          ? 'bg-emerald-950/60 border-emerald-500 text-white shadow-md'
                          : 'bg-rose-950/60 border-rose-500 text-white shadow-md'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs">{pack.name}</span>
                        {pack.isRecommended && (
                          <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.2 rounded font-mono font-bold">
                            แนะนำ
                          </span>
                        )}
                        {!pack.isCompatible && (
                          <span className="text-[9px] bg-rose-500/20 text-rose-300 px-1.5 py-0.2 rounded font-mono font-bold">
                            ห้ามใช้!
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        {pack.statusText}
                      </span>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-mono text-xs font-bold text-amber-300 block">
                        {pack.nominalVoltage.toFixed(1)}V
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        {pack.capacityMah} mAh
                      </span>
                    </div>
                  </button>
                );
              })}
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
                    <span>กำลังติดตั้งและล็อกสลัก...</span>
                  </>
                ) : isBatteryInstalled ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>ติดตั้งในโครงจักรยานเรียบร้อยแล้ว (คลิกเพื่อเปลี่ยน)</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 fill-current" />
                    <span>คลิกเพื่อติดตั้งชุดแบตเตอรี่ที่เลือก</span>
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
                รายการตรวจสอบความปลอดภัย (Safety Checklist)
              </span>
            </div>

            <div className="space-y-1.5 text-xs">
              {/* Check 1: Voltage Compatibility */}
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800">
                <span className="flex items-center gap-2 text-slate-300">
                  {selectedPack.nominalVoltage <= motorRatedVoltage ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-400" />
                  )}
                  <span>พิกัดแรงดันไฟฟ้า (Pack Voltage ≤ 3.0V):</span>
                </span>
                <span
                  className={`font-mono font-bold ${
                    selectedPack.nominalVoltage <= motorRatedVoltage
                      ? 'text-emerald-400'
                      : 'text-rose-400'
                  }`}
                >
                  {selectedPack.nominalVoltage.toFixed(1)}V / 3.0V
                </span>
              </div>

              {/* Check 2: Overvoltage Hazard */}
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800">
                <span className="flex items-center gap-2 text-slate-300">
                  {selectedPack.nominalVoltage <= motorRatedVoltage ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-400" />
                  )}
                  <span>ป้องกันมอเตอร์ไหม้ (No Overvoltage):</span>
                </span>
                <span
                  className={`font-mono font-bold ${
                    selectedPack.nominalVoltage <= motorRatedVoltage
                      ? 'text-emerald-400'
                      : 'text-rose-400'
                  }`}
                >
                  {selectedPack.nominalVoltage <= motorRatedVoltage ? 'ปลอดภัย (Safe)' : 'อันตราย (Hazard)'}
                </span>
              </div>

              {/* Check 3: Physical Lock */}
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800">
                <span className="flex items-center gap-2 text-slate-300">
                  {isBatteryInstalled ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-amber-400" />
                  )}
                  <span>สลักล็อกแบตเตอรี่บนโครง (Downtube Lock):</span>
                </span>
                <span
                  className={`font-mono font-bold ${
                    isBatteryInstalled ? 'text-emerald-400' : 'text-amber-400'
                  }`}
                >
                  {isBatteryInstalled ? 'ล็อกสมบูรณ์' : 'ยังไม่ล็อก'}
                </span>
              </div>
            </div>
          </div>

          {/* Cosmetics: Bicycle Paint Selector */}
          <div className="bg-slate-900/95 border border-indigo-500/30 rounded-2xl p-4 shadow-xl flex flex-col gap-3">
            <span className="text-xs font-black text-indigo-300 flex items-center gap-1.5 uppercase border-b border-slate-800 pb-2">
              <Palette className="w-4 h-4 text-indigo-400" />
              สีตัวถังจักรยาน (Bicycle Paint Color)
            </span>

            <div className="flex items-center gap-3">
              {[
                { color: '#06b6d4', name: 'ไซยานนีออน' },
                { color: '#f59e0b', name: 'ส้มทองซูเปอร์ชาร์จ' },
                { color: '#ef4444', name: 'แดงเรซซิ่ง' },
                { color: '#10b981', name: 'เขียวมรกต' },
                { color: '#8b5cf6', name: 'ม่วงไซเบอร์' },
                { color: '#e2e8f0', name: 'เงินไททาเนียม' },
              ].map((c) => (
                <button
                  key={c.color}
                  onClick={() => {
                    playTone(600, 'sine', 0.05);
                    setFrameColor(c.color);
                  }}
                  className={`w-9 h-9 rounded-full transition-all ring-2 ${
                    frameColor === c.color
                      ? 'ring-white scale-110 shadow-lg shadow-white/20'
                      : 'ring-transparent opacity-75 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c.color }}
                  title={c.name}
                />
              ))}
            </div>
          </div>

          {/* VOLT Tutor Guidance */}
          <VoltDialog
            mood={selectedPack.isCompatible ? 'celebrate' : 'warning'}
            message={
              selectedPack.isCompatible
                ? `รถแข่งของคุณพร้อมแล้วครับ! ติดตั้งชุด ${selectedPack.name} พิกัดแรงดัน 3.0V ปลอดภัยตามเกณฑ์ของมอเตอร์ 3V และวิ่งได้ไกลถึง ${rangeKm} กม. กดปุ่ม 'ต่อไปสนามแข่ง' ได้เลยครับ!`
                : 'ระวังครับ! มอเตอร์พิกัด 3.0V ไม่สามารถรับแบตเตอรี่ 4.5V หรือแรงดันเกินได้ เพราะกระแสจะล้นจนขดลวดละลาย กรุณาเลือกชุด 2S2P หรือ 2S1P ครับ!'
            }
          />
        </div>
      </div>

      {/* Save Toast Notification */}
      {saveToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-slate-950 font-bold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 text-xs animate-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{saveToast}</span>
        </div>
      )}
    </div>
  );
};
