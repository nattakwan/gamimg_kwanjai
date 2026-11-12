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
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-sky-50 to-indigo-50/40 text-slate-800 p-4 sm:p-6 flex flex-col font-sans select-none pb-12">
      <div className="max-w-4xl mx-auto w-full space-y-6">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white flex items-center justify-center font-bold shadow-sm">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                บทเรียนหุ่นยนต์ VOLT: พื้นฐานวงจรไฟฟ้า
              </h1>
              <p className="text-[11px] font-bold text-sky-700">ก้าวแรกสู่การเป็นวิศวกรไฟฟ้านักซิ่ง (ฉากที่ 4)</p>
            </div>
          </div>

          <button
            onClick={() => goToScene('mission_map')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 text-xs font-bold border border-slate-200 shadow-sm transition-all cursor-pointer"
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
              className={`h-2.5 rounded-full transition-all ${
                idx < currentStepIdx
                  ? 'bg-emerald-500 shadow-sm shadow-emerald-500/30'
                  : idx === currentStepIdx
                  ? 'bg-sky-500 animate-pulse ring-2 ring-sky-300'
                  : 'bg-slate-200'
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

        {/* Interactive Step Card with Visual Infographic */}
        <div className="bg-white/95 border border-slate-200/90 rounded-3xl p-6 shadow-sm space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <span className="text-xs font-mono font-bold text-sky-700 bg-sky-50 px-2.5 py-1 rounded-full border border-sky-200">
              {step.title}
            </span>
            <span className="text-xs text-slate-400 font-bold">เลือกคำตอบที่ถูกต้องเพื่อดำเนินการต่อ</span>
          </div>

          {/* Visual Battery / Circuit Schematics Infographic */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-50 to-sky-50/50 border border-slate-200/80 flex items-center justify-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-20 rounded-xl bg-gradient-to-b from-amber-400 via-amber-500 to-amber-600 border-2 border-amber-600 shadow-md relative flex flex-col items-center justify-between p-1">
                {/* Positive Anode Nipple */}
                <div className="w-4 h-2 bg-slate-200 rounded-t-sm -mt-2.5 border-t border-x border-slate-400 flex items-center justify-center">
                  <span className="text-[7px] font-black text-rose-600 leading-none">+</span>
                </div>
                <span className="text-[9px] font-black text-slate-900 tracking-tighter">AA 1.5V</span>
                {/* Negative Flat Cathode */}
                <div className="w-full text-center">
                  <span className="text-[8px] font-black text-blue-900 leading-none">-</span>
                </div>
              </div>

              <div className="space-y-1 text-left">
                <div className="flex items-center gap-1.5 text-xs font-bold text-rose-600">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  <span>ขั้วบวก (+) = หัวปุ่มนูน ศักย์ไฟฟ้าสูง</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-blue-600">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  <span>ขั้วลบ (-) = ก้นแบนราบ กระแสไหลกลับ</span>
                </div>
              </div>
            </div>
          </div>

          {/* Options List */}
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
                        ? 'bg-emerald-50 border-emerald-400 text-emerald-900 ring-2 ring-emerald-400/40 shadow-sm'
                        : 'bg-rose-50 border-rose-400 text-rose-900 ring-2 ring-rose-400/40 shadow-sm'
                      : 'bg-white hover:bg-sky-50/50 border-slate-200 text-slate-800 shadow-sm hover:border-sky-300'
                  }`}
                >
                  <span className="text-xs sm:text-sm font-bold flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-xs text-slate-600 font-mono">
                      {opt.id.charAt(0).toUpperCase()}
                    </span>
                    <span>{opt.label}</span>
                  </span>
                  {isSelected && (
                    <div>
                      {opt.isCorrect ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-rose-600" />
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Action Controls */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <button
              onClick={handleReplay}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>เริ่มบทเรียนใหม่</span>
            </button>

            {isCorrect && (
              <button
                onClick={handleNextStep}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-black text-xs sm:text-sm flex items-center gap-2 shadow-md shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer"
              >
                <span>{isLastStep ? 'เข้าสู่แผนที่ภารกิจ' : 'ขั้นตอนถัดไป'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
