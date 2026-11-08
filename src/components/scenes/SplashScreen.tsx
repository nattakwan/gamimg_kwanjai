/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Zap, Play, SkipForward, Bot, Sparkles } from 'lucide-react';
import { useGameState } from '../../context/GameStateContext';

export const SplashScreen: React.FC = () => {
  const { goToScene } = useGameState();
  const [secondsLeft, setSecondsLeft] = useState(8);

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

  return (
    <div
      onClick={() => goToScene('main_menu')}
      className="relative min-h-[92vh] flex flex-col items-center justify-between p-6 cursor-pointer select-none overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-sky-950 text-white"
    >
      {/* Top Bar with Skip */}
      <div className="w-full max-w-4xl flex items-center justify-between z-10">
        <div className="flex items-center gap-2 text-xs font-mono text-amber-400 bg-slate-900/80 px-3 py-1 rounded-full border border-slate-800">
          <Sparkles className="w-3.5 h-3.5" />
          <span>ผจญภัยในโลกพลังงานไฟฟ้า</span>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            goToScene('main_menu');
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700"
        >
          <span>ข้าม ({secondsLeft}s)</span>
          <SkipForward className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Main Title & Logo */}
      <div className="flex flex-col items-center text-center space-y-6 my-auto z-10 max-w-xl">
        <div className="relative">
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-tr from-amber-500 via-amber-400 to-sky-400 flex items-center justify-center shadow-2xl shadow-amber-500/30 animate-pulse">
            <Zap className="w-14 h-14 sm:w-16 sm:h-16 text-slate-950 fill-slate-950" />
          </div>
          <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-xl bg-sky-600 border-2 border-slate-900 flex items-center justify-center text-white shadow-lg">
            <Bot className="w-6 h-6" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white drop-shadow-md">
            BATTERY QUEST
          </h1>
          <div className="text-sm sm:text-lg font-bold text-amber-300 uppercase tracking-widest">
            สถาบันนักซิ่งพลังไฟฟ้า (Power Racing Academy)
          </div>
          <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto pt-1 leading-relaxed">
            สร้างวงจร ออกแบบแพ็กแบตเตอรี่ และซิ่งจักรยานไฟฟ้าคว้าแชมป์กรังด์ปรีซ์!
          </p>
        </div>

        {/* Tap to start button */}
        <button
          onClick={() => goToScene('main_menu')}
          className="px-8 py-4 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 font-black text-base flex items-center gap-2.5 shadow-xl shadow-amber-400/25 active:scale-95 transition-all cursor-pointer"
        >
          <Play className="w-5 h-5 fill-slate-950" />
          <span>แตะเพื่อเริ่ม (Tap to Start)</span>
        </button>
      </div>

      {/* Footer */}
      <div className="text-[11px] text-slate-500 font-mono text-center z-10">
        Google AI Studio Academy Edition · ภาษาไทย 100%
      </div>
    </div>
  );
};
