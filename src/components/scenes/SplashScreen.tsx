/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * SplashScreen — High-Tech Sci-Fi "ELECTRIO" Title Screen
 * Incorporates:
 * 1. Image 1 Theme: Hero boy speeding on neon-green e-bike across the Quantum Time-Warp Rift
 *    between Ancient Pyramids and Neon Metropolis (/assets/hero_time_rift.jpg).
 * 2. Image 3 Theme: Modern ELECTRIO branding, floating (+) Positive and (-) Negative Ion Orbs
 *    with electric lightning arcs, and the iconic Glowing Hexagonal Play Button (⬡ ▶ ⬡).
 */

import React, { useEffect, useState } from 'react';
import { Volume2, VolumeX, SkipForward, Sparkles } from 'lucide-react';
import { useGameState } from '../../context/GameStateContext';

export const SplashScreen: React.FC = () => {
  const { goToScene, toggleSound, state } = useGameState();
  const [secondsLeft, setSecondsLeft] = useState(10);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          goToScene('main_menu');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [goToScene]);

  const handleStart = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    goToScene('main_menu');
  };

  return (
    <div
      onClick={() => handleStart()}
      className="relative min-h-[92vh] flex flex-col items-center justify-between p-4 sm:p-6 cursor-pointer select-none overflow-hidden bg-slate-950 text-white font-sans"
    >
      {/* ── Background: Image 1 Quantum Time-Warp Rift with Vignette & PCB Overlays ── */}
      <div className="absolute inset-0 pointer-events-none">
        {/* High-res Hero Backdrop */}
        <div
          className="absolute inset-0 bg-cover bg-center opacity-45 sm:opacity-55 scale-105 transition-transform duration-1000 ease-out"
          style={{ backgroundImage: `url('/assets/hero_time_rift.jpg')` }}
        />

        {/* High-tech PCB circuit grid gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/85 via-emerald-950/40 to-slate-950/90" />

        {/* Radial vignette spotlighting the center rift */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_20%,_rgba(2,6,23,0.95)_80%)]" />

        {/* Cyber circuit lines accent (Image 3 inspired) */}
        <svg className="absolute inset-0 w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="pcb-grid" width="80" height="80" patternUnits="userSpaceOnUse">
              <path d="M 80 0 L 0 0 0 80" fill="none" stroke="#22c55e" strokeWidth="0.7" opacity="0.4" />
              <circle cx="80" cy="0" r="2.5" fill="#22c55e" opacity="0.6" />
              <circle cx="0" cy="80" r="2.5" fill="#06b6d4" opacity="0.6" />
              <path d="M 40 0 L 40 40 L 80 40" fill="none" stroke="#06b6d4" strokeWidth="0.5" strokeDasharray="3 3" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#pcb-grid)" />
        </svg>

        {/* Ambient cyan energy rift beam */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 sm:w-80 h-full bg-gradient-to-b from-cyan-400/25 via-teal-400/10 to-transparent blur-3xl pointer-events-none animate-pulse" />
      </div>

      {/* ── Top Bar: Image 3 Hexagonal Sound Toggle + Skip ── */}
      <div className="w-full max-w-5xl flex items-center justify-between z-20 pt-1">
        {/* Hexagonal Sound Button (Matching Image 3 Top-Left) */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggleSound();
          }}
          className="relative group p-1 transition-transform active:scale-95 cursor-pointer"
          title={state.soundEnabled ? 'ปิดเสียง' : 'เปิดเสียง'}
        >
          {/* Hexagonal SVG Border */}
          <div className="w-12 h-12 flex items-center justify-center relative">
            <svg
              className="absolute inset-0 w-full h-full fill-emerald-950/80 stroke-lime-400 stroke-2 drop-shadow-[0_0_8px_rgba(132,204,22,0.8)] group-hover:stroke-lime-300 transition-all"
              viewBox="0 0 100 100"
            >
              <polygon points="50 5, 90 25, 90 75, 50 95, 10 75, 10 25" />
            </svg>
            <div className="relative z-10 text-lime-300 group-hover:text-white transition-colors">
              {state.soundEnabled ? (
                <Volume2 className="w-5 h-5 drop-shadow" />
              ) : (
                <VolumeX className="w-5 h-5 text-slate-400" />
              )}
            </div>
          </div>
        </button>

        {/* Center Academy Badge */}
        <div className="hidden sm:flex items-center gap-2 text-xs font-mono font-bold text-cyan-300 bg-slate-900/80 px-4 py-1.5 rounded-full border border-cyan-500/30 backdrop-blur-md shadow-lg shadow-cyan-950/50">
          <Sparkles className="w-4 h-4 text-amber-400 animate-spin" style={{ animationDuration: '6s' }} />
          <span>QUANTUM ELECTRIC RACING ACADEMY</span>
        </div>

        {/* Skip Countdown Button */}
        <button
          type="button"
          onClick={handleStart}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 hover:text-white text-xs font-bold border border-slate-700/80 backdrop-blur-md transition-all shadow-md active:scale-95 cursor-pointer"
        >
          <span>ข้าม ({secondsLeft}s)</span>
          <SkipForward className="w-4 h-4 text-cyan-400" />
        </button>
      </div>

      {/* ── Main Centerpiece: ELECTRIO Branding & Floating Ion Orbs ── */}
      <div className="flex flex-col items-center text-center my-auto z-20 max-w-2xl px-2">
        {/* Floating Battery Ions + Lightning Arc Banner (Image 3 inspired) */}
        <div className="relative flex items-center justify-center gap-4 sm:gap-8 mb-4">
          {/* Positive Ion (+) Red Glowing Orb */}
          <div className="relative group animate-bounce" style={{ animationDuration: '3s' }}>
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-tr from-rose-700 via-red-500 to-rose-300 border-2 border-rose-200 flex items-center justify-center shadow-[0_0_25px_rgba(239,68,68,0.8)] font-black text-white text-2xl sm:text-3xl">
              +
            </div>
            <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[9px] font-mono font-black text-rose-300 tracking-wider">
              ANODE (+)
            </span>
          </div>

          {/* Crackling Electric Lightning SVG between Ions */}
          <div className="w-24 sm:w-40 h-8 flex items-center justify-center relative overflow-hidden">
            <svg className="w-full h-8" viewBox="0 0 160 30" fill="none">
              <path
                d="M 5 15 L 35 15 L 45 4 L 75 26 L 85 8 L 115 22 L 125 15 L 155 15"
                stroke="#38bdf8"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="drop-shadow-[0_0_8px_rgba(56,189,248,1)] animate-pulse"
              />
              <path
                d="M 20 15 L 50 15 L 60 7 L 80 23 L 95 10 L 115 20 L 140 15"
                stroke="#a7f3d0"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="opacity-80"
              />
            </svg>
          </div>

          {/* Negative Ion (-) Blue Glowing Orb */}
          <div className="relative group animate-bounce" style={{ animationDuration: '3.4s' }}>
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-tr from-blue-700 via-sky-500 to-cyan-300 border-2 border-cyan-200 flex items-center justify-center shadow-[0_0_25px_rgba(14,165,233,0.8)] font-black text-white text-2xl sm:text-3xl">
              −
            </div>
            <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[9px] font-mono font-black text-cyan-300 tracking-wider">
              CATHODE (−)
            </span>
          </div>
        </div>

        {/* 🌟 ELECTRIO 3D Modern Logo (Image 3 reference) */}
        <div className="space-y-1 relative">
          <h1 className="text-5xl sm:text-7xl md:text-8xl font-black tracking-tight text-white drop-shadow-[0_8px_25px_rgba(0,0,0,0.9)] select-none">
            <span className="bg-gradient-to-b from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
              ELECTRI
            </span>
            <span className="text-lime-400 drop-shadow-[0_0_20px_rgba(163,230,53,0.8)]">
              O
            </span>
          </h1>

          <div className="text-sm sm:text-xl font-black tracking-widest text-transparent bg-gradient-to-r from-amber-300 via-yellow-200 to-cyan-300 bg-clip-text uppercase">
            สถาบันนักซิ่งพลังไฟฟ้า · QUANTUM BATTERY QUEST
          </div>

          <p className="text-xs sm:text-sm text-slate-300 max-w-lg mx-auto pt-2 leading-relaxed drop-shadow-md">
            ทะลุมิติตั้งแต่มหาพีระมิดโบราณ สู่มหานครไซเบอร์แห่งอนาคต!
            เรียนรู้ทฤษฎีวงจรไฟฟ้า ปั้นจักรยาน และซิ่งคว้าแชมป์ความเร็ว
          </p>
        </div>

        {/* 🌟 Glowing Hexagonal Play Button (Image 3 Iconic Centerpiece) */}
        <div className="pt-8 sm:pt-10 flex flex-col items-center">
          <button
            type="button"
            onClick={handleStart}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className="relative group cursor-pointer transition-transform duration-200 hover:scale-105 active:scale-95"
            title="กดเพื่อเริ่มเกม (PLAY)"
          >
            {/* Hexagonal Container */}
            <div className="w-28 h-28 sm:w-32 sm:h-32 flex items-center justify-center relative">
              {/* Outer Glowing Hexagon Pulsing Border */}
              <svg
                className={`absolute inset-0 w-full h-full fill-emerald-950/90 stroke-lime-400 stroke-[3] transition-all duration-300 ${
                  isHovered
                    ? 'drop-shadow-[0_0_30px_rgba(163,230,53,1)] stroke-lime-300 stroke-[4]'
                    : 'drop-shadow-[0_0_18px_rgba(34,197,94,0.7)] animate-pulse'
                }`}
                viewBox="0 0 100 100"
              >
                <polygon points="50 4, 92 25, 92 75, 50 96, 8 75, 8 25" />
              </svg>

              {/* Inner Hexagon with Emerald Green Neon Gradient */}
              <svg
                className="absolute inset-2 w-[calc(100%-16px)] h-[calc(100%-16px)] fill-gradient stroke-emerald-400 stroke-1"
                viewBox="0 0 100 100"
              >
                <defs>
                  <linearGradient id="hexGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#22c55e" stopOpacity="0.85" />
                    <stop offset="50%" stopColor="#15803d" stopOpacity="0.95" />
                    <stop offset="100%" stopColor="#052e16" stopOpacity="0.95" />
                  </linearGradient>
                </defs>
                <polygon points="50 5, 90 25, 90 75, 50 95, 10 75, 10 25" fill="url(#hexGrad)" />
              </svg>

              {/* Golden Bright Play Triangle */}
              <div className="relative z-10 translate-x-1">
                <svg
                  className="w-12 h-12 sm:w-14 sm:h-14 fill-lime-300 drop-shadow-[0_0_12px_rgba(190,242,100,0.9)] group-hover:fill-white transition-colors"
                  viewBox="0 0 24 24"
                >
                  <polygon points="6,3 20,12 6,21" />
                </svg>
              </div>
            </div>
          </button>

          <span className="mt-2 text-xs font-mono font-bold text-lime-300/90 tracking-widest uppercase animate-pulse">
            แตะเพื่อเริ่ม (TAP TO PLAY)
          </span>
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="w-full max-w-4xl flex items-center justify-between text-[11px] text-slate-400 font-mono z-20 pt-2 border-t border-slate-800/80">
        <span className="flex items-center gap-1.5 text-cyan-400/90">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          Quantum Engine 2.0 Ready
        </span>
        <span className="text-right text-slate-500">
          Google AI Studio Academy Edition · ภาษาไทย 100%
        </span>
      </div>
    </div>
  );
};
