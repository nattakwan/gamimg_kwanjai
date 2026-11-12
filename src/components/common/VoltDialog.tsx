/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Bot, Lightbulb, AlertTriangle, Sparkles, HelpCircle } from 'lucide-react';

interface VoltDialogProps {
  mood?: 'happy' | 'idea' | 'warning' | 'thinking' | 'excited' | 'celebrate' | 'alarm';
  title?: string;
  message: string;
  hint?: string;
  className?: string;
}

export const VoltDialog: React.FC<VoltDialogProps> = ({
  mood = 'idea',
  title = 'VOLT ผู้ช่วยวิศวกรไฟฟ้า',
  message,
  hint,
  className = '',
}) => {
  const moodConfig = {
    happy: {
      bg: 'bg-white/95 border-emerald-200/90 text-slate-800 shadow-sm',
      iconBg: 'bg-emerald-100 text-emerald-600 border-emerald-200',
      badge: 'text-emerald-700',
      hintBg: 'bg-emerald-50 border-emerald-200 text-emerald-900',
      Icon: Sparkles,
    },
    celebrate: {
      bg: 'bg-white/95 border-emerald-200/90 text-slate-800 shadow-sm',
      iconBg: 'bg-emerald-100 text-emerald-600 border-emerald-200',
      badge: 'text-emerald-700',
      hintBg: 'bg-emerald-50 border-emerald-200 text-emerald-900',
      Icon: Sparkles,
    },
    idea: {
      bg: 'bg-white/95 border-sky-200/90 text-slate-800 shadow-sm',
      iconBg: 'bg-sky-100 text-sky-600 border-sky-200',
      badge: 'text-sky-700',
      hintBg: 'bg-sky-50 border-sky-200 text-sky-900',
      Icon: Lightbulb,
    },
    warning: {
      bg: 'bg-white/95 border-rose-200/90 text-slate-800 shadow-sm',
      iconBg: 'bg-rose-100 text-rose-600 border-rose-200',
      badge: 'text-rose-700',
      hintBg: 'bg-rose-50 border-rose-200 text-rose-900',
      Icon: AlertTriangle,
    },
    alarm: {
      bg: 'bg-white/95 border-rose-200/90 text-slate-800 shadow-sm',
      iconBg: 'bg-rose-100 text-rose-600 border-rose-200',
      badge: 'text-rose-700',
      hintBg: 'bg-rose-50 border-rose-200 text-rose-900',
      Icon: AlertTriangle,
    },
    thinking: {
      bg: 'bg-white/95 border-amber-200/90 text-slate-800 shadow-sm',
      iconBg: 'bg-amber-100 text-amber-600 border-amber-200',
      badge: 'text-amber-700',
      hintBg: 'bg-amber-50 border-amber-200 text-amber-900',
      Icon: HelpCircle,
    },
    excited: {
      bg: 'bg-white/95 border-purple-200/90 text-slate-800 shadow-sm',
      iconBg: 'bg-purple-100 text-purple-600 border-purple-200',
      badge: 'text-purple-700',
      hintBg: 'bg-purple-50 border-purple-200 text-purple-900',
      Icon: Bot,
    },
  }[mood];

  const IconComp = moodConfig.Icon;

  return (
    <div
      className={`rounded-2xl border p-3.5 sm:p-4 shadow-sm flex items-start gap-3 sm:gap-3.5 transition-all ${moodConfig.bg} ${className}`}
    >
      <div
        className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 shadow-sm ${moodConfig.iconBg}`}
      >
        <IconComp className="w-5 h-5 animate-pulse" />
      </div>

      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-black uppercase tracking-wider ${moodConfig.badge}`}>
            {title}
          </span>
          <span className="text-[10px] text-slate-400 font-bold bg-slate-100 px-1.5 py-0.5 rounded-full border border-slate-200 font-mono">
            ROBOT TUTOR
          </span>
        </div>

        <p className="text-xs sm:text-sm leading-relaxed text-slate-700 font-medium">{message}</p>

        {hint && (
          <div
            className={`text-xs font-medium p-2 rounded-xl border flex items-center gap-1.5 mt-2 ${moodConfig.hintBg}`}
          >
            <Lightbulb className="w-3.5 h-3.5 shrink-0" />
            <span>
              <strong className="font-bold">เคล็ดลับวิศวกร:</strong> {hint}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
