/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Play,
  RotateCcw,
  Settings,
  HelpCircle,
  MapPin,
  Sparkles,
  Bot,
  User,
  Zap,
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

  const hasSavedProgress =
    state.missions.some((m) => m.isCompleted) || state.learning.totalStars > 0;

  const handleContinue = () => {
    // Navigate to mission map or current active mission
    goToScene('mission_map');
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
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Academy Hero Card */}
      <div className="bg-gradient-to-r from-sky-950 via-slate-900 to-amber-950/60 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-3 text-center md:text-left z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>สถาบันวิศวกรรมไฟฟ้าและความเร็ว</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            BATTERY QUEST
          </h1>

          <p className="text-xs sm:text-sm text-slate-300 max-w-md leading-relaxed">
            ยินดีต้อนรับสู่สถาบันนักซิ่งพลังไฟฟ้า! เรียนรู้ทฤษฎีวงจรไฟฟ้า
            ออกแบบแบตเตอรี่ และแข่งขันจักรยานเพื่อก้าวสู่แชมป์ประจำสถาบัน
          </p>

          <div className="flex flex-wrap items-center gap-2 pt-1 justify-center md:justify-start">
            <span className="text-xs text-slate-400">ยศปัจจุบัน:</span>
            <span className="px-2.5 py-0.5 rounded-lg bg-slate-950 text-sky-300 border border-slate-800 text-xs font-bold font-mono">
              {state.learning.academyRank}
            </span>
            <span className="text-xs text-amber-400 font-mono font-bold">
              ⭐ {state.learning.totalStars} ดาว
            </span>
          </div>
        </div>

        {/* Cadet Avatar Preview */}
        <div className="flex flex-col items-center gap-2 z-10 shrink-0">
          <div className="w-28 h-32 rounded-2xl bg-slate-950/80 border-2 border-slate-700 p-2 shadow-xl flex items-center justify-center">
            <AvatarRenderer avatar={state.character} size="md" mode="3d" />
          </div>
          <button
            onClick={() => goToScene('character_creator')}
            className="text-[11px] font-bold text-sky-400 hover:text-sky-300 flex items-center gap-1"
          >
            <User className="w-3 h-3" />
            <span>{state.character.name}</span>
          </button>
        </div>
      </div>

      {/* Main Buttons Menu */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Continue Button */}
        <button
          onClick={handleContinue}
          className={`p-5 rounded-2xl border flex items-center justify-between transition-all text-left shadow-lg cursor-pointer ${
            hasSavedProgress
              ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 border-amber-300 shadow-amber-500/20 active:scale-98'
              : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-slate-950/30 flex items-center justify-center font-bold">
              <Play className="w-6 h-6 fill-current" />
            </div>
            <div>
              <div className="text-base font-extrabold">เล่นต่อ (Continue)</div>
              <div className="text-xs opacity-80">
                {hasSavedProgress ? 'เข้าสู่แผนที่ภารกิจล่าสุด' : 'เริ่มภารกิจฝึกสอน'}
              </div>
            </div>
          </div>
          <span className="font-bold text-lg">&rarr;</span>
        </button>

        {/* New Game Button */}
        <button
          onClick={handleNewGame}
          className="p-5 rounded-2xl bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-white flex items-center justify-between transition-all text-left shadow-lg cursor-pointer active:scale-98"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold">
              <RotateCcw className="w-6 h-6" />
            </div>
            <div>
              <div className="text-base font-extrabold">เริ่มเกมใหม่ (New Game)</div>
              <div className="text-xs text-slate-400">สร้างตัวละครใหม่และเริ่มตั้งแต่ต้น</div>
            </div>
          </div>
          <span className="font-bold text-lg text-slate-500">&rarr;</span>
        </button>

        {/* Settings Button */}
        <button
          onClick={() => setShowSettings(true)}
          className="p-4 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-200 flex items-center gap-3 transition-all cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center">
            <Settings className="w-5 h-5" />
          </div>
          <div className="text-left">
            <div className="text-sm font-bold text-white">ตั้งค่า (Settings)</div>
            <div className="text-[11px] text-slate-400">เสียง, เพลง, และขนาดตัวอักษร</div>
          </div>
        </button>

        {/* How To Play Button */}
        <button
          onClick={() => setShowHowToPlay(true)}
          className="p-4 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-200 flex items-center gap-3 transition-all cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div className="text-left">
            <div className="text-sm font-bold text-white">วิธีเล่น (How to Play)</div>
            <div className="text-[11px] text-slate-400">คู่มือสถาบันและกฎการแข่ง</div>
          </div>
        </button>
      </div>

      {/* Quick Mission Map shortcut */}
      <div className="flex justify-center pt-2">
        <button
          onClick={() => goToScene('mission_map')}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold transition-all"
        >
          <MapPin className="w-4 h-4 text-sky-400" />
          <span>เข้าสู่แผนที่ภารกิจ (Mission Map)</span>
        </button>
      </div>

      {/* Confirmation Modal for Reset Progress */}
      {showConfirmReset && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">ยืนยันการเริ่มเกมใหม่?</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              การเริ่มเกมใหม่จะรีเซ็ตความก้าวหน้าทั้งหมด รวมถึงดาวและแพ็กแบตเตอรี่ที่ประกอบไว้ คุณแน่ใจหรือไม่?
            </p>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowConfirmReset(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
              >
                ยกเลิก
              </button>
              <button
                onClick={confirmResetAndStart}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs"
              >
                ยืนยันเริ่มใหม่
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-amber-400" />
                <span>การตั้งค่าระบบ (Settings)</span>
              </h3>
              <button
                onClick={() => setShowSettings(false)}
                className="text-slate-400 hover:text-white text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Sound FX */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span>เสียงเอฟเฟกต์ (Sound FX)</span>
                <button
                  onClick={toggleSound}
                  className={`px-3 py-1.5 rounded-lg font-bold ${
                    state.soundEnabled ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {state.soundEnabled ? 'เปิด (ON)' : 'ปิด (OFF)'}
                </button>
              </div>

              {/* Music */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span>ดนตรีประกอบ (Music BGM)</span>
                <button
                  onClick={toggleMusic}
                  className={`px-3 py-1.5 rounded-lg font-bold ${
                    state.musicEnabled ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {state.musicEnabled ? 'เปิด (ON)' : 'ปิด (OFF)'}
                </button>
              </div>

              {/* Text Size */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span>ขนาดตัวอักษร (Text Size)</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setTextSize('normal')}
                    className={`px-2.5 py-1 rounded-lg font-bold ${
                      state.textSize === 'normal'
                        ? 'bg-sky-500 text-slate-950'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    ปกติ
                  </button>
                  <button
                    onClick={() => setTextSize('large')}
                    className={`px-2.5 py-1 rounded-lg font-bold ${
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
              onClick={() => setShowSettings(false)}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs"
            >
              บันทึกและปิด
            </button>
          </div>
        </div>
      )}

      {/* How to Play Modal */}
      {showHowToPlay && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-sky-400" />
                <span>วิธีเล่น Battery Quest (How to Play)</span>
              </h3>
              <button
                onClick={() => setShowHowToPlay(false)}
                className="text-slate-400 hover:text-white text-sm font-bold"
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
              onClick={() => setShowHowToPlay(false)}
              className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-slate-950 font-bold text-xs"
            >
              เข้าใจแล้ว เริ่มผจญภัยเลย
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
