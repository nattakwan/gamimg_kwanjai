/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, CheckCircle2, ChevronRight, Compass } from 'lucide-react';
import { useGameState } from '../../context/GameStateContext';
import { SCENES_METADATA } from '../../data/scenesMetadata';
import { SceneId } from '../../types/game';

interface SceneNavigationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SceneNavigationDrawer: React.FC<SceneNavigationDrawerProps> = ({
  isOpen,
  onClose,
}) => {
  const { state, goToScene } = useGameState();

  if (!isOpen) return null;

  const sceneKeys = Object.keys(SCENES_METADATA) as SceneId[];

  const handleSelect = (s: SceneId) => {
    goToScene(s);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex justify-end animate-in fade-in">
      <div className="w-full max-w-md bg-slate-900 border-l border-slate-800 h-full p-5 flex flex-col justify-between shadow-2xl space-y-4 overflow-y-auto">
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 text-white font-extrabold text-sm sm:text-base">
              <Compass className="w-5 h-5 text-sky-400" />
              <span>แผนผัง 15 ฉากสถาบันนักซิ่ง</span>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 text-sm font-bold"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-1.5">
            {sceneKeys.map((key, idx) => {
              const meta = SCENES_METADATA[key];
              const isCurrent = state.currentScene === key;

              return (
                <button
                  key={key}
                  onClick={() => handleSelect(key)}
                  className={`w-full p-3 rounded-xl border text-left flex items-center justify-between gap-3 transition-all cursor-pointer ${
                    isCurrent
                      ? 'bg-sky-950/80 border-sky-400 text-white shadow-md'
                      : 'bg-slate-950/60 hover:bg-slate-800/80 border-slate-800 text-slate-300'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-amber-400 font-bold">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <h4 className="text-xs font-bold truncate">{meta.title}</h4>
                    </div>
                    <p className="text-[10px] text-slate-400 line-clamp-1">{meta.description}</p>
                  </div>

                  <ChevronRight className={`w-4 h-4 shrink-0 ${isCurrent ? 'text-sky-400' : 'text-slate-600'}`} />
                </button>
              );
            })}
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
        >
          ปิดเมนูนำทาง
        </button>
      </div>
    </div>
  );
};
