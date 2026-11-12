/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  ArrowLeft,
  Volume2,
  VolumeX,
  Compass,
  Zap,
} from 'lucide-react';
import { useGameState } from '../../context/GameStateContext';
import { SCENES_METADATA } from '../../data/scenesMetadata';
import { AvatarRenderer } from '../common/AvatarRenderer';

interface GameHeaderProps {
  onOpenSceneDrawer?: () => void;
}

export const GameHeader: React.FC<GameHeaderProps> = ({ onOpenSceneDrawer }) => {
  const { state, goToScene, goBack, toggleSound } = useGameState();
  const currentMeta = SCENES_METADATA[state.currentScene] || SCENES_METADATA.splash;

  if (state.currentScene === 'splash') {
    return null;
  }

  const isHome = state.currentScene === 'main_menu';
  const isLightScene = [
    'volt_tutorial',
    'mission_map',
    'basic_circuit_lab',
    'series_lab',
    'parallel_lab',
    'mixed_lab',
    'motor_test',
    'bike_garage',
    'race_prep',
    'race_results',
    'learning_reflection',
    'character_creator',
  ].includes(state.currentScene);

  return (
    <header
      className={`sticky top-0 z-40 backdrop-blur-md border-b px-3 py-2 sm:px-6 sm:py-2.5 transition-colors ${
        isLightScene
          ? 'bg-white/90 border-slate-200/90 text-slate-800 shadow-sm'
          : 'bg-slate-900/90 border-slate-800 text-slate-100 shadow-lg'
      }`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
        {/* Navigation Controls & Title */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {!isHome && (
            <button
              onClick={goBack}
              className={`p-1.5 sm:p-2 rounded-xl border transition-colors flex items-center gap-1 text-xs font-semibold cursor-pointer ${
                isLightScene
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border-slate-700'
              }`}
              title="ย้อนกลับ"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">กลับ</span>
            </button>
          )}

          <button
            onClick={() => goToScene('main_menu')}
            className="flex items-center gap-2 text-left group cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 font-bold shadow-md shadow-amber-500/20 group-hover:scale-105 transition-transform">
              <Zap className="w-5 h-5 fill-slate-950 text-slate-950" />
            </div>
            <div>
              <div
                className={`text-xs sm:text-sm font-extrabold tracking-tight flex items-center gap-1 leading-tight ${
                  isLightScene ? 'text-slate-900' : 'text-white'
                }`}
              >
                <span>สถาบันนักซิ่งพลังไฟฟ้า</span>
              </div>
              <div
                className={`text-[10px] font-bold truncate max-w-[150px] sm:max-w-xs ${
                  isLightScene ? 'text-sky-700' : 'text-amber-400'
                }`}
              >
                {currentMeta.title}
              </div>
            </div>
          </button>
        </div>

        {/* Right side controls: Sound, Scene Navigator Drawer, Cadet chip */}
        <div className="flex items-center gap-2">
          {/* Sound toggle */}
          <button
            onClick={toggleSound}
            className={`p-2 rounded-xl border transition-all cursor-pointer ${
              state.soundEnabled
                ? isLightScene
                  ? 'bg-amber-50 text-amber-700 border-amber-300'
                  : 'bg-slate-800 text-amber-400 border-slate-700'
                : isLightScene
                ? 'bg-slate-100 text-slate-400 border-slate-200'
                : 'bg-slate-900 text-slate-500 border-slate-800'
            }`}
            title={state.soundEnabled ? 'ปิดเสียง' : 'เปิดเสียง'}
          >
            {state.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Scene Drawer trigger */}
          {onOpenSceneDrawer && (
            <button
              onClick={onOpenSceneDrawer}
              className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                isLightScene
                  ? 'bg-slate-100 hover:bg-slate-200 text-sky-800 border-slate-200'
                  : 'bg-slate-800 hover:bg-slate-700 text-sky-300 border-slate-700'
              }`}
              title="เลือกฉากทั้งหมด 15 หน้า"
            >
              <Compass className={`w-4 h-4 ${isLightScene ? 'text-sky-600' : 'text-sky-400'}`} />
              <span className="hidden md:inline">15 ฉาก</span>
            </button>
          )}

          {/* Cadet Avatar Chip */}
          <button
            onClick={() => goToScene('character_creator')}
            className={`flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-xl border transition-colors text-left cursor-pointer ${
              isLightScene
                ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-900'
                : 'bg-slate-950/80 hover:bg-slate-800 border-slate-800 text-white'
            }`}
            title="ปรับแต่งตัวละคร"
          >
            <div className="w-7 h-7 rounded-lg overflow-hidden bg-slate-200 border border-slate-300 shrink-0">
              <AvatarRenderer avatar={state.character} size="sm" mode="2d" />
            </div>
            <div className="hidden sm:block">
              <div
                className={`text-[11px] font-black truncate max-w-[100px] ${
                  isLightScene ? 'text-slate-900' : 'text-white'
                }`}
              >
                {state.character.name}
              </div>
              <div
                className={`text-[9px] font-mono font-bold ${
                  isLightScene ? 'text-amber-600' : 'text-amber-400'
                }`}
              >
                ⭐ {state.learning.totalStars} ดวง
              </div>
            </div>
          </button>
        </div>
      </div>
    </header>
  );
};
