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
      bg: 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200',
      iconBg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
      badge: 'text-emerald-400',
      Icon: Sparkles,
    },
    celebrate: {
      bg: 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200',
      iconBg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
      badge: 'text-emerald-400',
      Icon: Sparkles,
    },
    idea: {
      bg: 'bg-sky-950/40 border-sky-500/40 text-sky-200',
      iconBg: 'bg-sky-500/20 text-sky-400 border-sky-500/40',
      badge: 'text-sky-400',
      Icon: Lightbulb,
    },
    warning: {
      bg: 'bg-rose-950/50 border-rose-500/50 text-rose-200',
      iconBg: 'bg-rose-500/20 text-rose-400 border-rose-500/40',
      badge: 'text-rose-400',
      Icon: AlertTriangle,
    },
    alarm: {
      bg: 'bg-rose-950/50 border-rose-500/50 text-rose-200',
      iconBg: 'bg-rose-500/20 text-rose-400 border-rose-500/40',
      badge: 'text-rose-400',
      Icon: AlertTriangle,
    },
    thinking: {
      bg: 'bg-amber-950/40 border-amber-500/40 text-amber-200',
      iconBg: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
      badge: 'text-amber-400',
      Icon: HelpCircle,
    },
    excited: {
      bg: 'bg-purple-950/40 border-purple-500/40 text-purple-200',
      iconBg: 'bg-purple-500/20 text-purple-400 border-purple-500/40',
      badge: 'text-purple-400',
      Icon: Bot,
    },
  }[mood];

  const IconComp = moodConfig.Icon;

  return (
    <div
      className={`rounded-2xl border p-3.5 sm:p-4 shadow-lg backdrop-blur flex items-start gap-3 sm:gap-3.5 transition-all ${moodConfig.bg} ${className}`}
    >
      <div
        className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 shadow-md ${moodConfig.iconBg}`}
      >
        <IconComp className="w-5 h-5 animate-pulse" />
      </div>

      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-extrabold uppercase tracking-wider ${moodConfig.badge}`}>
            {title}
          </span>
          <span className="text-[10px] text-slate-500 font-mono">ROBOT TUTOR</span>
        </div>

        <p className="text-xs sm:text-sm leading-relaxed text-slate-200">{message}</p>

        {hint && (
          <div className="text-[11px] text-amber-300/90 font-medium pt-1 flex items-center gap-1.5 border-t border-slate-800/80 mt-1.5">
            <Lightbulb className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>คำแนะนำ: {hint}</span>
          </div>
        )}
      </div>
    </div>
  );
};
