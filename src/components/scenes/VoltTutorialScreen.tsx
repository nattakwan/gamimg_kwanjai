/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Bot,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  SkipForward,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Zap,
} from 'lucide-react';
import { useGameState } from '../../context/GameStateContext';
import { VoltDialog } from '../common/VoltDialog';

interface TutorialStep {
  id: number;
  title: string;
  question: string;
  hint: string;
  options: { id: string; label: string; isCorrect: boolean; feedback: string }[];
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 1,
    title: 'ขั้นตอนที่ 1: ขั้วบวก (+) ของแบตเตอรี่',
    question: 'จุดใดบนถ่าน AA 1.5V คือ "ขั้วบวก (Positive Terminal)" ที่มีศักย์ไฟฟ้าสูงกว่า?',
    hint: 'ขั้วบวกมักเป็นปุ่มนูนโลหะยื่นออกมาที่ส่วนหัวของถ่านไฟฉาย',
    options: [
      { id: 'pos_nipple', label: 'ปุ่มนูนโลหะด้านบน (+)', isCorrect: true, feedback: 'ถูกต้องครับ! ปุ่มนูนคือขั้วบวก (Anode) ของถ่าน AA' },
      { id: 'neg_flat', label: 'แผ่นโลหะเรียบด้านล่าง (-)', isCorrect: false, feedback: 'ยังไม่ใช่ครับ ด้านเรียบคือขั้วลบ (Cathode)' },
      { id: 'label_mid', label: 'แถบฉลากตรงกลาง', isCorrect: false, feedback: 'ตรงกลางคือตัวถังหุ้มฉนวน ไม่ใช่ขั้วไฟฟ้าครับ' },
    ],
  },
  {
    id: 2,
    title: 'ขั้นตอนที่ 2: ขั้วลบ (-) ของแบตเตอรี่',
    question: 'จุดใดบนถ่าน AA 1.5V คือ "ขั้วลบ (Negative Terminal)" สำหรับการไหลกลับของกระแส?',
    hint: 'ขั้วลบจะเป็นฐานเรียบโลหะด้านล่างของก้อนถ่าน',
    options: [
      { id: 'opt_flat', label: 'ฐานโลหะเรียบด้านล่าง (-)', isCorrect: true, feedback: 'ถูกต้องครับ! ฐานเรียบด้านล่างคือขั้วลบ' },
      { id: 'opt_nipple', label: 'ปุ่มนูนด้านบน (+)', isCorrect: false, feedback: 'ปุ่มนูนคือขั้วบวกครับ' },
      { id: 'opt_insulator', label: 'พลาสติกหุ้มรอบข้าง', isCorrect: false, feedback: 'พลาสติกเป็นฉนวนป้องกันการลัดวงจรครับ' },
    ],
  },
  {
    id: 3,
    title: 'ขั้นตอนที่ 3: ปลายสายไฟและตัวนำไฟฟ้า',
    question: 'เมื่อต่อสายไฟจากขั้วบวกเข้าสู่อุปกรณ์ หากสายไฟขาดช่วงจะเกิดอะไรขึ้น?',
    hint: 'กระแสไฟฟ้าต้องไหลเป็นวงรอบต่อเนื่องเท่านั้น',
    options: [
      { id: 'open_circuit', label: 'กลายเป็นวงจรเปิด (กระแสไม่ไหล หลอดไฟดับ)', isCorrect: true, feedback: 'แม่นยำมากครับ! วงจรเปิด (Open Circuit) ทำให้อิเล็กตรอนหยุดไหลทันที' },
      { id: 'more_power', label: 'หลอดไฟจะสว่างขึ้นเป็นสองเท่า', isCorrect: false, feedback: 'ไม่ถูกต้องครับ วงจรขาดกระแสจะไม่ไหลเลย' },
      { id: 'short_circuit', label: 'เกิดการระเบิดของแบตเตอรี่', isCorrect: false, feedback: 'วงจรขาดไม่มีกระแสไหล จึงไม่เกิดความร้อนหรือระเบิดครับ' },
    ],
  },
  {
    id: 4,
    title: 'ขั้นตอนที่ 4: การทำงานของสวิตช์ปิด-เปิด',
    question: 'เมื่อเราต้องการให้หลอดไฟสว่าง เราต้องทำอย่างไรกับสวิตช์ในวงจร?',
    hint: 'ในทางไฟฟ้า "สับสวิตช์ลง (Close Switch)" คือการทำให้วงจรปิดเชื่อมต่อกัน',
    options: [
      { id: 'close_switch', label: 'สับสวิตช์ลง เพื่อให้เป็น "วงจรปิด" (Closed Circuit)', isCorrect: true, feedback: 'ถูกต้องที่สุดครับ! วงจรปิดทำให้กระแสไฟฟ้าไหลครบวงจร หลอดไฟจึงสว่าง' },
      { id: 'open_switch', label: 'ยกสวิตช์ขึ้นเพื่อตัดการเชื่อมต่อ', isCorrect: false, feedback: 'การยกขึ้นทำให้วงจรเปิด ไฟจะดับครับ' },
      { id: 'reverse_cell', label: 'ถอดสลับขั้วถ่านกลับไปกลับมา', isCorrect: false, feedback: 'การสลับขั้วไม่ได้ช่วยให้วงจรปิดครับ' },
    ],
  },
];

export const VoltTutorialScreen: React.FC = () => {
  const { goToScene } = useGameState();

  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');

  const step = TUTORIAL_STEPS[currentStepIdx];
  const isLastStep = currentStepIdx === TUTORIAL_STEPS.length - 1;

  const handleSelectOption = (opt: TutorialStep['options'][0]) => {
    setSelectedOptionId(opt.id);
    setIsAnswered(true);
    setIsCorrect(opt.isCorrect);
    setFeedbackText(opt.feedback);
  };

  const handleNextStep = () => {
    if (isLastStep) {
      goToScene('mission_map');
    } else {
      setCurrentStepIdx((prev) => prev + 1);
      setSelectedOptionId(null);
      setIsAnswered(false);
      setIsCorrect(false);
      setFeedbackText('');
    }
  };

  const handleReplay = () => {
    setCurrentStepIdx(0);
    setSelectedOptionId(null);
    setIsAnswered(false);
    setIsCorrect(false);
    setFeedbackText('');
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Bot className="w-6 h-6 text-sky-400" />
          <h1 className="text-lg sm:text-xl font-extrabold text-white">
            บทเรียนหุ่นยนต์ VOLT: พื้นฐานวงจรไฟฟ้า
          </h1>
        </div>

        <button
          onClick={() => goToScene('mission_map')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700"
        >
          <span>ข้ามบทเรียน (Skip)</span>
          <SkipForward className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Progress Pills */}
      <div className="grid grid-cols-4 gap-2">
        {TUTORIAL_STEPS.map((s, idx) => (
          <div
            key={s.id}
            className={`h-2 rounded-full transition-all ${
              idx < currentStepIdx
                ? 'bg-emerald-400'
                : idx === currentStepIdx
                ? 'bg-sky-400 animate-pulse'
                : 'bg-slate-800'
            }`}
          />
        ))}
      </div>

      <VoltDialog
        mood={isAnswered ? (isCorrect ? 'happy' : 'warning') : 'idea'}
        title={`VOLT คำถามที่ ${step.id} จาก 4`}
        message={isAnswered ? feedbackText : step.question}
        hint={step.hint}
      />

      {/* Interactive Step Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5">
        <div className="space-y-1">
          <span className="text-xs font-mono font-bold text-amber-400">{step.title}</span>
          <h2 className="text-base sm:text-lg font-bold text-white">{step.question}</h2>
        </div>

        {/* Options */}
        <div className="space-y-2.5">
          {step.options.map((opt) => {
            const isSelected = selectedOptionId === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => handleSelectOption(opt)}
                className={`w-full p-4 rounded-2xl border text-left flex items-center justify-between gap-3 transition-all cursor-pointer ${
                  isSelected
                    ? opt.isCorrect
                      ? 'bg-emerald-950/70 border-emerald-500 text-emerald-200 ring-2 ring-emerald-500/30'
                      : 'bg-rose-950/70 border-rose-500 text-rose-200 ring-2 ring-rose-500/30'
                    : 'bg-slate-950/70 hover:bg-slate-800/80 border-slate-800 text-slate-200'
                }`}
              >
                <span className="text-xs sm:text-sm font-semibold">{opt.label}</span>
                {isSelected && (
                  <div>
                    {opt.isCorrect ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-rose-400" />
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800">
          <button
            onClick={handleReplay}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>เริ่มบทเรียนใหม่</span>
          </button>

          {isCorrect && (
            <button
              onClick={handleNextStep}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-extrabold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-amber-400/20 active:scale-95 transition-all cursor-pointer"
            >
              <span>{isLastStep ? 'เข้าสู่แผนที่ภารกิจ' : 'ขั้นตอนถัดไป'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
