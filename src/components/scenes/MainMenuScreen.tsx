/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * MainMenuScreen — Modern Sci-Fi "ELECTRIO" Academy Hub
 * Blends:
 * 1. Image 1 Theme: Epic Time-Warp Electric Bike Adventure — Ancient Pyramids to Neon Metropolis
 * 2. Image 3 Theme: High-tech PCB circuit grid, (+) Red & (-) Blue Battery Ions with crackling lightning,
 *    and the Glowing Hexagonal Play Button (⬡ ▶ ⬡).
 */

import React, { useState } from 'react';
import {
  RotateCcw,
  Settings,
  HelpCircle,
  MapPin,
  Sparkles,
  User,
  Zap,
  Wrench,
  Cpu,
  Trophy,
} from 'lucide-react';
import { useGameState } from '../../context/GameStateContext';
import { AvatarRenderer } from '../common/AvatarRenderer';

export const MainMenuScreen: React.FC = () => {
  const {
    state,
    goToScene,
    resetAllProgress,
    toggleSound,
    toggleMusic,
    setTextSize,
  } = useGameState();

  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [isHexHovered, setIsHexHovered] = useState(false);

  const hasSavedProgress =
    state.missions.some((m) => m.isCompleted) || state.learning.totalStars > 0;

  const handleContinueOrPlay = () => {
    // If has progress, go to mission map; otherwise jump straight into tutorial/circuit lab
    if (hasSavedProgress) {
      goToScene('mission_map');
    } else {
      goToScene('volt_tutorial');
    }
  };

  const handleNewGame = () => {
    if (hasSavedProgress) {
      setShowConfirmReset(true);
    } else {
      goToScene('character_creator');
    }
  };

  const confirmResetAndStart = () => {
    resetAllProgress();
    setShowConfirmReset(false);
    goToScene('character_creator');
  };

  return (
    <div className="relative min-h-[calc(100vh-3.5rem)] w-full flex flex-col justify-between p-3 sm:p-5 md:p-6 font-sans select-none overflow-hidden bg-slate-950 text-white">
      {/* ── Background: Subtle PCB Circuit Traces & Glow ── */}
      <div className="absolute inset-0 pointer-events-none">
        <svg className="absolute inset-0 w-full h-full opacity-15" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="main-pcb" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#22c55e" strokeWidth="0.8" opacity="0.4" />
              <circle cx="60" cy="0" r="2.5" fill="#22c55e" opacity="0.7" />
              <circle cx="0" cy="60" r="2.5" fill="#06b6d4" opacity="0.7" />
              <path d="M 30 0 L 30 30 L 60 30" fill="none" stroke="#06b6d4" strokeWidth="0.5" strokeDasharray="3 3" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#main-pcb)" />
        </svg>

        <div className="absolute -top-32 -left-32 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto w-full space-y-4 sm:space-y-6">
        {/* ── 🌟 Hero Card: Image 1 Theme (Pyramids -> Quantum Rift -> Neon Metropolis) ── */}
        <div className="relative rounded-3xl border border-emerald-500/30 overflow-hidden shadow-2xl bg-slate-900/90 backdrop-blur-xl">
          {/* Hero Image Backdrop with Time-Warp Portal */}
          <div
            className="absolute inset-0 bg-cover bg-center opacity-30 md:opacity-40"
            style={{ backgroundImage: `url('/assets/hero_time_rift.jpg')` }}
          />

          {/* High-tech gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/85 to-emerald-950/75" />

          {/* Card Content */}
          <div className="relative z-10 p-5 sm:p-7 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-3 text-center md:text-left">
              {/* Academy Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-400/40 text-emerald-300 text-xs font-mono font-bold shadow-md">
                <Sparkles className="w-3.5 h-3.5 text-lime-400 animate-spin" style={{ animationDuration: '6s' }} />
                <span>ELECTRIO · สถาบันวิศวกรรมไฟฟ้าและความเร็ว</span>
              </div>

              {/* Title */}
              <div>
                <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight drop-shadow-md">
                  BATTERY QUEST
                </h1>
                <p className="text-xs sm:text-sm text-lime-300 font-bold uppercase tracking-wider mt-0.5">
                  Quantum Electric Bicycle Grand Prix
                </p>
              </div>

              <p className="text-xs sm:text-sm text-slate-300 max-w-md leading-relaxed">
                การเดินทางข้ามกาลเวลาจากมหาพีระมิดสู่นครไฮเทค! ออกแบบเซลล์แบตเตอรี่
                ทดสอบมอเตอร์ และปั่นจักรยานไฟฟ้าน้องขวัญใจเพื่อชิงความเป็นที่หนึ่ง
              </p>

              {/* Ranks & Stars Badges */}
              <div className="flex flex-wrap items-center gap-2 pt-1 justify-center md:justify-start">
                <span className="text-xs text-slate-400">ยศนักแข่ง:</span>
                <span className="px-3 py-1 rounded-xl bg-slate-950/90 text-cyan-300 border border-cyan-500/40 text-xs font-black font-mono shadow-sm">
                  ⚡ {state.learning.academyRank}
                </span>
                <span className="px-3 py-1 rounded-xl bg-amber-950/80 text-amber-300 border border-amber-500/40 text-xs font-black font-mono shadow-sm">
                  ⭐ {state.learning.totalStars} ดาว
                </span>
              </div>
            </div>

            {/* ── Cadet Avatar Preview with Quick Studio Link ── */}
            <div className="flex flex-col items-center gap-2 shrink-0">
              <div className="w-28 h-32 sm:w-32 sm:h-36 rounded-2xl bg-slate-950/90 border-2 border-emerald-500/40 p-2 shadow-2xl flex items-center justify-center relative group">
                <AvatarRenderer avatar={state.character} size="md" mode="3d" />
                <button
                  type="button"
                  onClick={() => goToScene('character_creator')}
                  className="absolute inset-0 bg-emerald-950/70 backdrop-blur-xs opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-1 rounded-2xl transition-all cursor-pointer text-xs font-bold text-lime-300"
                >
                  <User className="w-5 h-5 text-lime-400" />
                  <span>ปรับแต่งตัวละคร</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => goToScene('character_creator')}
                className="text-xs font-bold text-lime-400 hover:text-lime-300 flex items-center gap-1 bg-slate-900/80 px-2.5 py-0.5 rounded-full border border-slate-700 transition"
              >
                <span>{state.character.name}</span>
                <span className="text-[10px] text-slate-400">✏️</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── 🌟 Image 3 Feature: Battery Energy & Ion Arcs Telemetry Bar ── */}
        <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-3 sm:p-4 backdrop-blur-md flex flex-wrap items-center justify-between gap-4 shadow-lg">
          <div className="flex items-center gap-3">
            {/* (+) Positive Ion Mini Orb */}
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-rose-600 to-red-400 border border-rose-200 flex items-center justify-center font-black text-white text-base shadow-[0_0_12px_rgba(239,68,68,0.8)]">
              +
            </div>

            {/* Voltage Spark Meter */}
            <div>
              <div className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-lime-400" />
                <span>สถานะพลังงานควอนตัม (Battery Energy Grid)</span>
              </div>
              <div className="text-xs sm:text-sm font-mono font-black text-lime-400">
                {state.batteryPack.nominalVoltage.toFixed(1)}V · {(state.batteryPack.nominalCapacityMah / 1000).toFixed(1)}Ah ({state.batteryPack.seriesCount}S {state.batteryPack.parallelCount}P · {state.batteryPack.totalCells} เซลล์)
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <div className="text-[10px] text-slate-400 font-mono">มอเตอร์ไฟฟ้า</div>
              <div className="text-xs font-mono font-bold text-cyan-300">
                {state.bike.motorName || 'มอเตอร์ดีซีมาตรฐาน'} ({state.bike.motorRatedVoltage || 6}V)
              </div>
            </div>

            {/* (-) Negative Ion Mini Orb */}
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-400 border border-cyan-200 flex items-center justify-center font-black text-white text-base shadow-[0_0_12px_rgba(14,165,233,0.8)]">
              −
            </div>
          </div>
        </div>

        {/* ── 🌟 Image 3 Iconic Centerpiece: Glowing Hexagonal Play CTA ── */}
        <div className="flex flex-col items-center justify-center py-2 sm:py-3">
          <button
            type="button"
            onClick={handleContinueOrPlay}
            onMouseEnter={() => setIsHexHovered(true)}
            onMouseLeave={() => setIsHexHovered(false)}
            className="group flex flex-col items-center gap-2 cursor-pointer transition-transform duration-200 active:scale-95"
          >
            {/* Hexagonal Button Graphic */}
            <div className="w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center relative">
              {/* Outer Glowing Hexagon */}
              <svg
                className={`absolute inset-0 w-full h-full fill-emerald-950/95 stroke-lime-400 stroke-[3] transition-all duration-300 ${
                  isHexHovered
                    ? 'drop-shadow-[0_0_35px_rgba(163,230,53,1)] stroke-lime-300 stroke-[4] scale-105'
                    : 'drop-shadow-[0_0_20px_rgba(34,197,94,0.7)] animate-pulse'
                }`}
                viewBox="0 0 100 100"
              >
                <polygon points="50 4, 92 25, 92 75, 50 96, 8 75, 8 25" />
              </svg>

              {/* Inner Emerald Gradient Hexagon */}
              <svg
                className="absolute inset-2 w-[calc(100%-16px)] h-[calc(100%-16px)] stroke-emerald-400 stroke-1"
                viewBox="0 0 100 100"
              >
                <defs>
                  <linearGradient id="mainHexGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#22c55e" stopOpacity="0.9" />
                    <stop offset="60%" stopColor="#15803d" stopOpacity="0.95" />
                    <stop offset="100%" stopColor="#052e16" stopOpacity="0.95" />
                  </linearGradient>
                </defs>
                <polygon points="50 5, 90 25, 90 75, 50 95, 10 75, 10 25" fill="url(#mainHexGrad)" />
              </svg>

              {/* Golden Play Arrow */}
              <div className="relative z-10 translate-x-1">
                <svg
                  className="w-10 h-10 sm:w-12 sm:h-12 fill-lime-300 drop-shadow-[0_0_10px_rgba(190,242,100,0.9)] group-hover:fill-white transition-colors"
                  viewBox="0 0 24 24"
                >
                  <polygon points="6,3 20,12 6,21" />
                </svg>
              </div>
            </div>

            <div className="text-center">
              <span className="text-base sm:text-lg font-black text-lime-300 tracking-wide drop-shadow-md group-hover:text-white transition-colors">
                {hasSavedProgress ? 'เข้าสู่ภารกิจ (Continue Quest)' : 'เริ่มการผจญภัย (Start Adventure)'}
              </span>
              <p className="text-[11px] text-slate-400 font-mono">
                แตะเพื่อเข้าสู่สนามแข่งและการทดลอง
              </p>
            </div>
          </button>
        </div>

        {/* ── Modern Navigation Grid: Game Modules ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {/* 1. Mission Map */}
          <button
            type="button"
            onClick={() => goToScene('mission_map')}
            className="p-3.5 sm:p-4 rounded-2xl bg-slate-900/80 hover:bg-slate-850 border border-slate-800 hover:border-cyan-500/50 text-white flex flex-col gap-2 transition-all shadow-lg active:scale-95 cursor-pointer text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center group-hover:bg-cyan-500/20 transition">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-bold text-white group-hover:text-cyan-300 transition">
                แผนที่ภารกิจ
              </div>
              <div className="text-[10px] text-slate-400">15 ภารกิจรอบเกาะ</div>
            </div>
          </button>

          {/* 2. Circuit Lab */}
          <button
            type="button"
            onClick={() => goToScene('basic_circuit_lab')}
            className="p-3.5 sm:p-4 rounded-2xl bg-slate-900/80 hover:bg-slate-850 border border-slate-800 hover:border-emerald-500/50 text-white flex flex-col gap-2 transition-all shadow-lg active:scale-95 cursor-pointer text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center group-hover:bg-emerald-500/20 transition">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-bold text-white group-hover:text-emerald-300 transition">
                ห้องทดลองวงจร
              </div>
              <div className="text-[10px] text-slate-400">อนุกรม ขนาน ผสม</div>
            </div>
          </button>

          {/* 3. EV Bike Garage */}
          <button
            type="button"
            onClick={() => goToScene('bike_garage')}
            className="p-3.5 sm:p-4 rounded-2xl bg-slate-900/80 hover:bg-slate-850 border border-slate-800 hover:border-amber-500/50 text-white flex flex-col gap-2 transition-all shadow-lg active:scale-95 cursor-pointer text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center group-hover:bg-amber-500/20 transition">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-bold text-white group-hover:text-amber-300 transition">
                โรงซ่อมจักรยาน
              </div>
              <div className="text-[10px] text-slate-400">ติดตั้งแบต & มอเตอร์</div>
            </div>
          </button>

          {/* 4. Racing Grand Prix */}
          <button
            type="button"
            onClick={() => goToScene('racing')}
            className="p-3.5 sm:p-4 rounded-2xl bg-slate-900/80 hover:bg-slate-850 border border-slate-800 hover:border-rose-500/50 text-white flex flex-col gap-2 transition-all shadow-lg active:scale-95 cursor-pointer text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center group-hover:bg-rose-500/20 transition">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-bold text-white group-hover:text-rose-300 transition">
                สนามแข่ง 3D
              </div>
              <div className="text-[10px] text-slate-400">ปั่นจริง ชิงแชมป์</div>
            </div>
          </button>
        </div>

        {/* ── Sub Toolbar: New Game, Settings, How to Play ── */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
          <button
            type="button"
            onClick={handleNewGame}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-sky-400" />
            <span>เริ่มเกมใหม่ (New Game)</span>
          </button>

          <button
            type="button"
            onClick={() => setShowSettings(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5 text-amber-400" />
            <span>ตั้งค่า (Settings)</span>
          </button>

          <button
            type="button"
            onClick={() => setShowHowToPlay(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span>คู่มือการเล่น (Guide)</span>
          </button>
        </div>
      </div>

      {/* ── Modals: Reset, Settings, How to Play ── */}
      {showConfirmReset && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">ยืนยันการเริ่มเกมใหม่?</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              การเริ่มเกมใหม่จะรีเซ็ตความก้าวหน้าทั้งหมด รวมถึงดาวและแพ็กแบตเตอรี่ที่ประกอบไว้ คุณแน่ใจหรือไม่?
            </p>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmReset(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={confirmResetAndStart}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs cursor-pointer"
              >
                ยืนยันเริ่มใหม่
              </button>
            </div>
          </div>
        </div>
      )}

      {showSettings && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-amber-400" />
                <span>การตั้งค่าระบบ (Settings)</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                className="text-slate-400 hover:text-white text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span>เสียงเอฟเฟกต์ (Sound FX)</span>
                <button
                  type="button"
                  onClick={toggleSound}
                  className={`px-3 py-1.5 rounded-lg font-bold cursor-pointer ${
                    state.soundEnabled ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {state.soundEnabled ? 'เปิด (ON)' : 'ปิด (OFF)'}
                </button>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span>ดนตรีประกอบ (Music BGM)</span>
                <button
                  type="button"
                  onClick={toggleMusic}
                  className={`px-3 py-1.5 rounded-lg font-bold cursor-pointer ${
                    state.musicEnabled ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {state.musicEnabled ? 'เปิด (ON)' : 'ปิด (OFF)'}
                </button>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span>ขนาดตัวอักษร (Text Size)</span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setTextSize('normal')}
                    className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer ${
                      state.textSize === 'normal'
                        ? 'bg-sky-500 text-slate-950'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    ปกติ
                  </button>
                  <button
                    type="button"
                    onClick={() => setTextSize('large')}
                    className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer ${
                      state.textSize === 'large'
                        ? 'bg-sky-500 text-slate-950'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    ใหญ่
                  </button>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowSettings(false)}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs cursor-pointer"
            >
              บันทึกและปิด
            </button>
          </div>
        </div>
      )}

      {showHowToPlay && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-sky-400" />
                <span>วิธีเล่น Battery Quest (How to Play)</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowHowToPlay(false)}
                className="text-slate-400 hover:text-white text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="font-bold text-amber-300">1. การเรียนรู้ในห้องทดลอง (Labs):</span>
                <p>
                  เรียนรู้การต่อวงจรปิดพื้นฐาน, การต่ออนุกรมเพื่อเพิ่มแรงดัน, การต่อขนานเพื่อเพิ่มความจุ,
                  และการประกอบแพ็กผสม 4S 2P
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="font-bold text-sky-300">2. การประกอบจักรยานแข่ง (Garage):</span>
                <p>
                  เลือกเฟรมรถ มอเตอร์ และนำแพ็กแบตเตอรี่ที่ผ่านการรับรองมาติดตั้งลงบนจักรยานแข่งประจำตัว
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="font-bold text-emerald-300">3. การแข่งขันจริง (Racing):</span>
                <p>
                  ควบคุมคันเร่ง บริหารความร้อนของมอเตอร์และพลังงานคงเหลือ เพื่อแซงคู่แข่งเข้าเส้นชัยเป็นอันดับ 1
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowHowToPlay(false)}
              className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-slate-950 font-bold text-xs cursor-pointer"
            >
              เข้าใจแล้ว เริ่มผจญภัยเลย
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
