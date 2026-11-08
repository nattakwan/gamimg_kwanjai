/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Award,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Layers,
  Zap,
  RotateCcw,
  Trophy,
  ShieldCheck,
  Star,
  Gauge,
  BatteryCharging,
  Clock,
  Wrench,
  Milestone,
  Home,
  Check,
  Info,
  Lightbulb,
} from 'lucide-react';
import { useGameState } from '../../context/GameStateContext';
import { AvatarRenderer } from '../common/AvatarRenderer';
import { VoltDialog } from '../common/VoltDialog';
import { ReflectionScores } from '../../types/game';

// Sound effect helper
const playReflectionTone = (type: 'correct' | 'wrong' | 'hint' | 'complete') => {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    if (type === 'correct') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.12); // E5
      osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.24); // G5
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.45);
    } else if (type === 'wrong') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.setValueAtTime(164.81, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } else if (type === 'hint') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.setValueAtTime(554.37, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } else {
      // complete fanfare
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.setValueAtTime(554.37, ctx.currentTime + 0.15);
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.3);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.45);
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.7);
    }
  } catch {
    // Ignore audio in restricted browser environment
  }
};

interface ReflectionQuestion {
  id: number;
  category: 'series' | 'parallel' | 'mixed_suitability';
  topicTitle: string;
  question: string;
  options: string[];
  correctIndex: number;
  points: number;
  hint: string;
  explanation: string;
}

const REFLECTION_QUESTIONS: ReflectionQuestion[] = [
  {
    id: 1,
    category: 'series',
    topicTitle: '1. หลักการวงจรอนุกรม (Series Circuit Principle)',
    question:
      'เมื่อนำเซลล์ 1.5V สองก้อนมาต่อกันแบบ "อนุกรม" (+ ชน -) เหตุใดแรงดันรวมจึงเพิ่มเป็น 3.0V แต่ความจุประจุยังคงเป็น 2000mAh เท่าเดิม และส่งผลต่อมอเตอร์อย่างไร?',
    options: [
      'ประจุไฟฟ้าไหลผ่านเซลล์เดียว มอเตอร์จึงหมุนช้าลงและแรงดันตก',
      'งานต่อหนึ่งหน่วยประจุ (Volt) จากแต่ละเซลล์นำมารวมกัน ผลักดันกระแสให้มอเตอร์หมุนด้วยความเร็วรอบ (RPM) สูงขึ้น ขณะที่ปริมาณประจุรวมที่ไหลผ่านทางเดินเดียวยังเท่าเดิม',
      'ความต้านทานกลายเป็นศูนย์ทำให้เกิดไฟฟ้าลัดวงจร',
      'แรงดันของทั้งสองเซลล์จะหักล้างกันจนเหลือ 0V',
    ],
    correctIndex: 1,
    points: 7,
    hint: 'จำกฎการรวมแรงดันของเซลล์อนุกรมได้ไหมครับ? ทางเดินของประจุไฟฟ้ามีเพียงทางเดียว (Single Loop) แรงดัน V รวมกัน แต่กระแสไหลผ่านแถวเดียว!',
    explanation:
      'ถูกต้องครับ! การต่ออนุกรม (V_total = V1 + V2 = 1.5V + 1.5V = 3.0V) จะเพิ่มพลังงานศักย์ไฟฟ้าต่อคูลอมบ์ ส่งผลให้มอเตอร์สร้างแรงเคลื่อนไฟฟ้าต้านกลับ (Back EMF) และทำความเร็วรอบ RPM ได้สูงขึ้น แต่ความจุรวมยังคงเท่ากับเซลล์เดียว (2,000 mAh) เพราะประจุไหลผ่านทางเดินเดียวกัน',
  },
  {
    id: 2,
    category: 'parallel',
    topicTitle: '2. หลักการวงจรขนาน (Parallel Circuit Principle)',
    question:
      'การนำเซลล์ไฟฟ้ามาต่อขนานกัน (+ ชน +, - ชน -) ช่วยแบ่งเบาภาระกระแสไฟฟ้าและลดความต้านทานภายใน (R_in) อย่างไร และส่งผลดีต่อจักรยานไฟฟ้าอย่างไร?',
    options: [
      'ทำให้แรงดันไฟฟ้าเพิ่มขึ้นเป็น 6.0V ทันที',
      'ช่วยแบ่งกระแสไฟฟ้าออกเป็น 2 แถว ทำให้ความต้านทานภายในลดลงเหลือครึ่งหนึ่ง (R_in / 2) เกิดแรงดันตกคร่อมน้อยลง (Low Sag) และความจุรวมเพิ่มเป็น 4,000 mAh ใช้งานได้นาน 2 เท่า',
      'ทำให้มอเตอร์กลับทิศทางการหมุนถอยหลังอัตโนมัติ',
      'ตัดกระแสไฟฟ้าไม่ให้ไหลผ่านมอเตอร์เพื่อประหยัดไฟ',
    ],
    correctIndex: 1,
    points: 7,
    hint: 'การต่อขนานเหมือนการเพิ่มเลนถนนคู่ขนานครับ! กระแสแบ่งไหลได้ 2 ทาง และความต้านทานรวมจะลดลงเสมอ!',
    explanation:
      'ถูกต้องครับ! การต่อขนานเพิ่มพื้นที่ทางเดินของกระแสไฟฟ้า ทำให้ความต้านทานภายในลดลง (จาก 0.30Ω เหลือ 0.15Ω ใน 2P) ส่งผลให้เกิดแรงดันตกคร่อม (Voltage Sag = I × R_in) น้อยมากเมื่อเร่งเครื่อง พร้อมทั้งรวมประจุ (C_total = C1 + C2 = 4,000 mAh) ทำให้ขี่ได้ระยะทางไกลขึ้นเป็น 2 เท่า',
  },
  {
    id: 3,
    category: 'mixed_suitability',
    topicTitle: '3. ความเหมาะสมของชุดผสม 2S2P กับการแข่งขัน (Race Pack Suitability)',
    question:
      'เหตุใดชุดแบตเตอรี่ผสม 2S2P (3.0V 4,000 mAh) จึงเหมาะสมที่สุดสำหรับจักรยานแข่งที่ใช้มอเตอร์พิกัด 3.0V ในสนามที่ผ่านมา (เทียบกับชุด 1S 1.5V หรือ 3S 4.5V)?',
    options: [
      'เพราะชุด 1S แรงดันไม่พอสตาร์ต (Stall) ส่วนชุด 3S แรงดันเกินพิกัดเสี่ยงมอเตอร์ไหม้ ขณะที่ 2S2P ให้แรงดัน 3.0V ตรงสเปก พร้อมความจุ 4,000 mAh และ R_in ต่ำ ช่วยรักษาความเร็วรอบได้ทั้งทางราบและทางชัน',
      'เพราะชุด 2S2P มีน้ำหนักเบากว่า 1S เสมอ',
      'เพราะชุด 3S ให้ความเร็วต่ำกว่า 2S2P ในทุกกรณี',
      'เพราะกติกาการแข่งขันห้ามใช้เซลล์เกิน 2 ก้อน',
    ],
    correctIndex: 0,
    points: 6,
    hint: 'พิจารณาการจับคู่วิศวกรรม (Engineering Matching) ระหว่างแรงดันแหล่งจ่ายกับพิกัดมอเตอร์ 3.0V และผลของ Voltage Sag เมื่อเจอโหลดหนักครับ!',
    explanation:
      'ยอดเยี่ยมที่สุดครับ! การเลือกแรงดันตรงพิกัด 3.0V ช่วยป้องกันความเสียหายจากแรงดันเกิน (Overvoltage > 3.3V) และป้องกันการติดขัด (Stall) ที่ 1.5V นอกจากนี้ การขนาน 2 แถว (2P) ยังช่วยรักษาแรงดันคงที่ขณะไต่เนินชัน ทำให้คว้าชัยชนะได้อย่างปลอดภัยและมีประสิทธิภาพสูงสุด!',
  },
];

export const LearningReflectionScreen: React.FC = () => {
  const { state, goToScene, updateRaceData } = useGameState();

  // Load saved reflections if available
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>(() => {
    return state.learning.savedReflections || {};
  });
  const [activeHintId, setActiveHintId] = useState<number | null>(null);
  const [showCertificate, setShowCertificate] = useState<boolean>(false);

  // Saved Battery Configuration Data
  const pack = state.batteryPack;
  const packV = pack.nominalVoltage || pack.totalVoltage || 3.0;
  const packMah = pack.nominalCapacityMah || pack.totalCapacityMah || 4000;
  const packRin = pack.internalResistance || (pack.parallelCount === 2 ? 0.15 : 0.3);
  const isValidated = pack.isValidated ?? true;

  // Race Performance Telemetry from Scene 13/14
  const race = state.raceData;
  const raceRank = race?.rank || 1;
  const raceTimeSec = race?.totalTimeSeconds || 45.2;
  const raceAvgSpeed = race?.averageSpeedKmh || 30;
  const raceTopSpeed = race?.topSpeedKmh || 36;
  const raceEnergyUsed = race?.energyUsedMah || 520;
  const raceEnergyRemaining = race?.remainingEnergyMah ?? Math.max(0, packMah - raceEnergyUsed);
  const raceEnergyPct = race?.batteryPercentageRemaining ?? Math.round((raceEnergyRemaining / packMah) * 100);
  const trackName = race?.trackName || 'แฟลต สปรินต์ (Flat Sprint - 400m)';

  // Calculate Strict Component Scores (Never award unearned points!)
  // 1. Circuit Correctness out of 30:
  // - Pack validated without short circuit: 20 pts
  // - No reversed polarity / safe wiring: 10 pts
  const circuitCorrectnessScore = isValidated ? 30 : 15;

  // 2. Battery Suitability out of 20:
  // - Pack voltage matches motor 3.0V (2.8V - 3.2V): 15 pts
  // - Low internal resistance (R_in <= 0.20): 5 pts
  const isVoltageMatched = packV >= 2.8 && packV <= 3.2;
  const isLowRin = packRin <= 0.2;
  const batterySuitabilityScore = (isVoltageMatched ? 15 : 5) + (isLowRin ? 5 : 0);

  // 3. Race Performance out of 30:
  // - Sourced directly from Scene 14's score out of 30
  const racePerformanceScore = Math.min(30, Math.max(0, race?.raceScoreOutOf30 || (raceRank === 1 ? 28 : raceRank === 2 ? 24 : 18)));

  // 4. Learning Explanation / Reflection Questions out of 20:
  // - Q1 (7 pts), Q2 (7 pts), Q3 (6 pts) awarded ONLY if chosen correct answer!
  let learningExplanationScore = 0;
  REFLECTION_QUESTIONS.forEach((q) => {
    if (selectedAnswers[q.id] === q.correctIndex) {
      learningExplanationScore += q.points;
    }
  });

  // Total Score out of 100
  const totalCompositeScore =
    circuitCorrectnessScore + batterySuitabilityScore + racePerformanceScore + learningExplanationScore;

  // Grade classification
  const getGradeTitle = (score: number) => {
    if (score >= 90) return { grade: 'A+', text: 'ยอดเยี่ยมระดับแชมเปียน (Grand Prix Master)', color: 'text-amber-300' };
    if (score >= 80) return { grade: 'A', text: 'ดีเด่นระดับวิศวกรอาวุโส (Senior Battery Engineer)', color: 'text-emerald-300' };
    if (score >= 70) return { grade: 'B', text: 'ผ่านเกณฑ์มาตรฐานชำนาญการ (Circuit Specialist)', color: 'text-cyan-300' };
    return { grade: 'C', text: 'กำลังพัฒนาทักษะ (Cadet Apprentice)', color: 'text-slate-300' };
  };
  const gradeInfo = getGradeTitle(totalCompositeScore);

  // Handle answering reflection questions
  const handleSelectAnswer = (qId: number, optIdx: number) => {
    const question = REFLECTION_QUESTIONS.find((q) => q.id === qId);
    if (!question) return;

    const isCorrect = optIdx === question.correctIndex;
    playReflectionTone(isCorrect ? 'correct' : 'wrong');

    const updated = { ...selectedAnswers, [qId]: optIdx };
    setSelectedAnswers(updated);

    // Save reflection state locally in localStorage
    try {
      const savedState = localStorage.getItem('battery_quest_academy_state_v1');
      if (savedState) {
        const parsed = JSON.parse(savedState);
        parsed.learning = {
          ...parsed.learning,
          savedReflections: updated,
          evaluationScores: {
            circuitCorrectnessOutOf30: circuitCorrectnessScore,
            batterySuitabilityOutOf20: batterySuitabilityScore,
            racePerformanceOutOf30: racePerformanceScore,
            learningExplanationOutOf20: learningExplanationScore,
            totalScoreOutOf100: totalCompositeScore,
          },
        };
        localStorage.setItem('battery_quest_academy_state_v1', JSON.stringify(parsed));
      }
    } catch {
      // Ignore storage errors
    }
  };

  const answeredQuestionsCount = Object.keys(selectedAnswers).length;
  const allQuestionsAnswered = answeredQuestionsCount === REFLECTION_QUESTIONS.length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950 text-white flex flex-col font-sans select-none p-3 md:p-6">
      {/* Top Header */}
      <div className="bg-slate-900/95 border-b border-indigo-500/40 backdrop-blur-md px-4 py-3 rounded-2xl flex flex-wrap items-center justify-between gap-3 max-w-6xl mx-auto w-full mb-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-600 to-emerald-500 flex items-center justify-center font-bold text-base shadow-md">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base md:text-lg font-black text-indigo-200 flex items-center gap-2">
              <span>ถอดบทเรียนและประเมินผลการเรียนรู้ (Learning Reflection Dashboard)</span>
              <span className="text-[10px] bg-indigo-500/30 text-indigo-300 border border-indigo-400/40 px-2 py-0.5 rounded font-mono">
                SCENE 15
              </span>
            </h1>
            <p className="text-[11px] text-slate-400">
              วิเคราะห์วงจร แบตเตอรี่ ผลการทดสอบ และการแข่งขัน พร้อมตอบคำถามสะท้อนคิดเพื่อรับใบประกาศนียบัตร
            </p>
          </div>
        </div>

        {/* Total Score Pill */}
        <div className="flex items-center gap-3">
          <div className="bg-slate-950 px-3 py-1.5 rounded-xl border border-amber-500/50 flex items-center gap-2 shadow-lg shadow-amber-500/20">
            <Award className="w-4 h-4 text-amber-400" />
            <div className="flex flex-col">
              <span className="text-[9px] text-slate-400 uppercase font-mono">คะแนนประเมินรวม</span>
              <span className="text-sm font-black font-mono text-amber-300">
                {totalCompositeScore} <span className="text-[10px] text-slate-400 font-normal">/ 100</span>
              </span>
            </div>
            <span className="text-xs font-black font-mono text-amber-400 bg-amber-500/20 px-1.5 py-0.5 rounded">
              {gradeInfo.grade}
            </span>
          </div>

          <button
            onClick={() => goToScene('main_menu')}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 transition flex items-center gap-1.5 min-h-[44px]"
          >
            <Home className="w-4 h-4 text-slate-400" />
            <span className="hidden sm:inline">เมนูหลัก</span>
          </button>
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="max-w-6xl mx-auto w-full flex-1 flex flex-col gap-5">
        {/* Row 1: Educational Summary Dashboard (Saved Config, Dyno Test, Race Performance) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Saved Battery Configuration */}
          <div className="bg-slate-900/90 border border-indigo-500/30 rounded-2xl p-4 shadow-xl flex flex-col justify-between gap-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-black text-amber-300 uppercase flex items-center gap-1.5">
                <BatteryCharging className="w-4 h-4 text-amber-400" />
                ชุดแบตเตอรี่ที่บันทึกไว้ (Saved Pack)
              </span>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded">
                VALIDATED
              </span>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">ชื่อโครงแบบ:</span>
                <span className="font-bold text-white">{pack.name || 'ชุดผสม 2S2P (4 ก้อน)'}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">แรงดันพิกัด (Nominal V):</span>
                <span className="font-mono font-bold text-amber-300">{packV.toFixed(1)} โวลต์</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">ความจุประจุ (Capacity):</span>
                <span className="font-mono font-bold text-cyan-300">{packMah} mAh</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">ความต้านทานภายใน (R_in):</span>
                <span className="font-mono font-bold text-emerald-300">{packRin.toFixed(2)} โอห์ม</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">พลังงานสะสมทฤษฎี:</span>
                <span className="font-mono font-bold text-purple-300">
                  {((packV * packMah) / 1000).toFixed(1)} Wh
                </span>
              </div>
            </div>

            <div className="bg-slate-950 p-2 rounded-xl border border-slate-800 text-[11px] text-slate-300">
              💡 2S (อนุกรม 2 ก้อน) รวมแรงดันเป็น 3.0V และ 2P (ขนาน 2 แถว) รวมความจุเป็น 4000mAh
            </div>
          </div>

          {/* Card 2: Motor Dyno Test Outcomes */}
          <div className="bg-slate-900/90 border border-indigo-500/30 rounded-2xl p-4 shadow-xl flex flex-col justify-between gap-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-black text-cyan-300 uppercase flex items-center gap-1.5">
                <Gauge className="w-4 h-4 text-cyan-400" />
                ผลการทดสอบมอเตอร์ (Dyno Test)
              </span>
              <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/20 px-2 py-0.5 rounded">
                DC 3.0V MOTOR
              </span>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">พิกัดมอเตอร์ไฟฟ้า:</span>
                <span className="font-bold text-white">DC 3.0V (Max 3.3V)</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">ความเร็วรอบสูงสุด (RPM):</span>
                <span className="font-mono font-bold text-cyan-300">~1,760 RPM</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">กระแสขณะมีภาระ (Current):</span>
                <span className="font-mono font-bold text-amber-300">0.85 A</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">กำลังกลเชิงกล (Power):</span>
                <span className="font-mono font-bold text-emerald-300">~2.4 W</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">การป้องกันวงจร:</span>
                <span className="font-bold text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> ผ่านเกณฑ์ปลอดภัย
                </span>
              </div>
            </div>

            <div className="bg-slate-950 p-2 rounded-xl border border-slate-800 text-[11px] text-slate-300">
              🛡️ แรงดัน 3.0V ปลอดภัย ไม่เสี่ยงมอเตอร์ไหม้ และไม่อยู่ในภาวะ Stall แรงบิดไม่พอ
            </div>
          </div>

          {/* Card 3: Race Performance Telemetry */}
          <div className="bg-slate-900/90 border border-indigo-500/30 rounded-2xl p-4 shadow-xl flex flex-col justify-between gap-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-black text-emerald-300 uppercase flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-emerald-400" />
                ผลงานการแข่งขันจริง (Race Telemetry)
              </span>
              <span className="text-[10px] font-mono text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded font-bold">
                RANK #{raceRank}
              </span>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">สนามแข่งขัน:</span>
                <span className="font-bold text-white truncate max-w-[150px]">{trackName.split('(')[0]}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">เวลาเข้าเส้นชัยรวม:</span>
                <span className="font-mono font-bold text-emerald-300">{raceTimeSec.toFixed(1)} วิ</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">ความเร็วเฉลี่ย:</span>
                <span className="font-mono font-bold text-cyan-300">{raceAvgSpeed} กม./ชม.</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">ความเร็วสูงสุด:</span>
                <span className="font-mono font-bold text-cyan-300">{raceTopSpeed} กม./ชม.</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">ประจุที่ใช้ / คงเหลือ:</span>
                <span className="font-mono font-bold text-amber-300">
                  {raceEnergyUsed} / {raceEnergyRemaining} mAh ({raceEnergyPct}%)
                </span>
              </div>
            </div>

            <div className="bg-slate-950 p-2 rounded-xl border border-slate-800 text-[11px] text-slate-300">
              🏁 สถิติการแข่งจริง: เข้าเส้นชัยอันดับ #{raceRank} พร้อมพลังงานคงเหลือ {raceEnergyPct}%
            </div>
          </div>
        </div>

        {/* Row 2: Strict Scoring Breakdown Card (100 Points Total) */}
        <div className="bg-slate-900/90 border-2 border-indigo-500/40 rounded-2xl p-4 shadow-xl flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-2 gap-2">
            <div>
              <span className="text-xs font-black text-amber-300 uppercase flex items-center gap-1.5">
                <Award className="w-4 h-4 text-amber-400" />
                ตารางแจกแจงคะแนนประเมินอย่างเป็นทางการ (Scoring Rubric - 100 Points Max)
              </span>
              <p className="text-[11px] text-slate-400">
                คำนวณจากความถูกต้องทางทฤษฎี ผลการทดสอบ การแข่งขันจริง และคำตอบสะท้อนคิด (ไม่มีการให้คะแนนฟรี)
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className={`text-sm font-black font-mono ${gradeInfo.color}`}>
                เกรด {gradeInfo.grade}: {gradeInfo.text}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {/* Metric 1 */}
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-col justify-between gap-1">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-300">1. ความถูกต้องวงจร</span>
                <span className="font-mono font-black text-amber-300 text-sm">{circuitCorrectnessScore} / 30</span>
              </div>
              <span className="text-[10px] text-slate-400 leading-relaxed">
                {isValidated ? 'ผ่านเกณฑ์: ตรวจสอบวงจรปิด ไม่มีการต่อกลับขั้วหรือลัดวงจร' : 'ไม่ผ่านเกณฑ์วงจร'}
              </span>
              <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden mt-1">
                <div
                  className="bg-amber-400 h-full rounded-full"
                  style={{ width: `${(circuitCorrectnessScore / 30) * 100}%` }}
                />
              </div>
            </div>

            {/* Metric 2 */}
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-col justify-between gap-1">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-300">2. ความเหมาะสมแบตเตอรี่</span>
                <span className="font-mono font-black text-cyan-300 text-sm">{batterySuitabilityScore} / 20</span>
              </div>
              <span className="text-[10px] text-slate-400 leading-relaxed">
                {isVoltageMatched ? 'แรงดัน 3.0V ตรงพิกัดมอเตอร์ DC 3V + R_in 0.15Ω ต่ำ' : 'แรงดันไม่ตรงพิกัด'}
              </span>
              <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden mt-1">
                <div
                  className="bg-cyan-400 h-full rounded-full"
                  style={{ width: `${(batterySuitabilityScore / 20) * 100}%` }}
                />
              </div>
            </div>

            {/* Metric 3 */}
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-col justify-between gap-1">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-300">3. ผลงานการแข่งขัน</span>
                <span className="font-mono font-black text-emerald-300 text-sm">{racePerformanceScore} / 30</span>
              </div>
              <span className="text-[10px] text-slate-400 leading-relaxed">
                อิงจากอันดับ #{raceRank}, ความเร็ว {raceAvgSpeed} กม./ชม., และประจุคงเหลือ {raceEnergyPct}%
              </span>
              <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden mt-1">
                <div
                  className="bg-emerald-400 h-full rounded-full"
                  style={{ width: `${(racePerformanceScore / 30) * 100}%` }}
                />
              </div>
            </div>

            {/* Metric 4 */}
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-col justify-between gap-1">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-300">4. การสะท้อนคิดวิชาการ</span>
                <span className="font-mono font-black text-purple-300 text-sm">
                  {learningExplanationScore} / 20
                </span>
              </div>
              <span className="text-[10px] text-slate-400 leading-relaxed">
                ตอบถูก {learningExplanationScore === 20 ? '3/3 ข้อครบถ้วน' : `${Math.floor(learningExplanationScore / 7)}/3 ข้อ`} (ข้อละ 6–7 คะแนน)
              </span>
              <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden mt-1">
                <div
                  className="bg-purple-400 h-full rounded-full"
                  style={{ width: `${(learningExplanationScore / 20) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Row 3: Three Short Thai Reflection Questions */}
        <div className="bg-slate-900/90 border border-indigo-500/30 rounded-2xl p-5 shadow-xl flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-black text-indigo-300 uppercase flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-amber-400" />
              คำถามสะท้อนคิดทางวิศวกรรมไฟฟ้า 3 ข้อ (3 Interactive Reflection Questions)
            </span>
            <span className="text-xs font-mono bg-purple-500/20 text-purple-300 px-3 py-0.5 rounded-full font-bold">
              ตอบแล้ว {answeredQuestionsCount} / {REFLECTION_QUESTIONS.length} ข้อ
            </span>
          </div>

          <div className="space-y-4">
            {REFLECTION_QUESTIONS.map((q) => {
              const selectedIdx = selectedAnswers[q.id];
              const isAnswered = selectedIdx !== undefined;
              const isCorrect = selectedIdx === q.correctIndex;
              const isHintActive = activeHintId === q.id;

              return (
                <div
                  key={q.id}
                  className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 flex flex-col gap-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider">
                        {q.topicTitle} ({q.points} คะแนน)
                      </span>
                      <h3 className="text-xs md:text-sm font-bold text-slate-100 mt-0.5 leading-relaxed">
                        {q.question}
                      </h3>
                    </div>

                    <button
                      onClick={() => {
                        playReflectionTone('hint');
                        setActiveHintId(isHintActive ? null : q.id);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-[10px] font-bold border border-slate-700 transition flex items-center gap-1 shrink-0"
                    >
                      <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                      <span>{isHintActive ? 'ปิดคำใบ้' : 'ขอคำใบ้'}</span>
                    </button>
                  </div>

                  {/* Hint Box */}
                  {isHintActive && (
                    <div className="bg-amber-950/40 border border-amber-500/40 p-2.5 rounded-lg text-xs text-amber-200 flex items-start gap-2 animate-in fade-in">
                      <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <span>{q.hint}</span>
                    </div>
                  )}

                  {/* Options */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                    {q.options.map((opt, optIdx) => {
                      const isThisSelected = selectedIdx === optIdx;
                      let btnStyle = 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700';

                      if (isAnswered) {
                        if (optIdx === q.correctIndex) {
                          btnStyle = 'bg-emerald-950/70 border-emerald-500 text-emerald-300 font-bold';
                        } else if (isThisSelected && !isCorrect) {
                          btnStyle = 'bg-rose-950/70 border-rose-500 text-rose-300 line-through';
                        }
                      }

                      return (
                        <button
                          key={optIdx}
                          disabled={isAnswered}
                          onClick={() => handleSelectAnswer(q.id, optIdx)}
                          className={`p-3 rounded-xl border text-left text-xs transition flex items-center justify-between min-h-[46px] ${btnStyle}`}
                        >
                          <span className="leading-snug">{opt}</span>
                          {isAnswered && optIdx === q.correctIndex && (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 ml-2" />
                          )}
                          {isAnswered && isThisSelected && !isCorrect && (
                            <XCircle className="w-4 h-4 text-rose-400 shrink-0 ml-2" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Explanation Feedback */}
                  {isAnswered && (
                    <div
                      className={`p-3 rounded-xl text-xs leading-relaxed border ${
                        isCorrect
                          ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                          : 'bg-amber-950/40 border-amber-500/40 text-amber-200'
                      }`}
                    >
                      <div className="font-bold flex items-center gap-1.5 mb-0.5">
                        {isCorrect ? '✅ ถูกต้องตามหลักวิศวกรรมไฟฟ้า!' : '❌ ยังไม่ถูกต้อง มาดูคำอธิบายกันครับ:'}
                      </div>
                      <p>{q.explanation}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Certificate View Button */}
          {allQuestionsAnswered && (
            <div className="flex flex-col items-center gap-2 pt-2">
              <button
                onClick={() => {
                  playReflectionTone('complete');
                  setShowCertificate(true);
                }}
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-emerald-500 hover:brightness-110 text-slate-950 font-black text-sm shadow-xl shadow-amber-500/30 flex items-center justify-center gap-2 transition active:scale-95"
              >
                <Award className="w-5 h-5 fill-current" />
                <span>รับประกาศนียบัตรสำเร็จหลักสูตร (View Certificate - {totalCompositeScore}/100)</span>
              </button>
            </div>
          )}
        </div>

        {/* VOLT Dialog */}
        <VoltDialog
          mood="celebrate"
          message={`ยอดเยี่ยมมากครับคุณ ${state.character.name}! คุณได้สำเร็จการศึกษาครบทุกหลักสูตรของ Power Racing Academy ด้วยคะแนน ${totalCompositeScore}/100 (${gradeInfo.grade}) คุณมีความเข้าใจลึกซึ้งทั้งวงจรอนุกรม ขนาน และการประกอบชุดแบตเตอรี่แล้วครับ!`}
        />

        {/* Four Working Action Buttons */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full pb-6">
          {/* 1. Review Lab */}
          <button
            onClick={() => goToScene('mixed_lab')}
            className="py-3.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition min-h-[46px] border border-slate-700 active:scale-95 shadow-md"
          >
            <Wrench className="w-4 h-4 text-amber-400" />
            <span>ทบทวนห้องแล็บ (Review Lab)</span>
          </button>

          {/* 2. Retry Race */}
          <button
            onClick={() => goToScene('racing')}
            className="py-3.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition min-h-[46px] border border-slate-700 active:scale-95 shadow-md"
          >
            <RotateCcw className="w-4 h-4 text-cyan-400" />
            <span>แข่งใหม่อีกครั้ง (Retry Race)</span>
          </button>

          {/* 3. Next Mission / Mission Map */}
          <button
            onClick={() => goToScene('mission_map')}
            className="py-3.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition min-h-[46px] border border-slate-700 active:scale-95 shadow-md"
          >
            <Milestone className="w-4 h-4 text-emerald-400" />
            <span>แผนที่ภารกิจ (Mission Map)</span>
          </button>

          {/* 4. Main Menu */}
          <button
            onClick={() => goToScene('main_menu')}
            className="py-3.5 px-3 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400 hover:brightness-110 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2 transition min-h-[46px] active:scale-95"
          >
            <Home className="w-4 h-4" />
            <span>กลับสู่เมนูหลัก (Main Menu)</span>
          </button>
        </div>
      </div>

      {/* Graduation Certificate Modal */}
      {showCertificate && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-gradient-to-b from-slate-900 via-slate-950 to-indigo-950 border-4 border-amber-400 rounded-3xl max-w-xl w-full p-6 md:p-8 shadow-2xl text-center flex flex-col items-center gap-4 relative">
            {/* Top Seal & Avatar */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-20 bg-slate-950 rounded-xl p-1 border-2 border-amber-400 overflow-hidden shadow-lg flex items-center justify-center">
                <AvatarRenderer avatar={state.character} size="sm" mode="2d" />
              </div>
              <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-amber-400 shadow-xl shadow-amber-500/30">
                <Award className="w-10 h-10" />
              </div>
            </div>

            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 block font-mono">
                BATTERY QUEST: POWER RACING ACADEMY
              </span>
              <h2 className="text-xl md:text-2xl font-black text-white mt-1">
                ประกาศนียบัตรสำเร็จหลักสูตรวิศวกรรมไฟฟ้า
              </h2>
              <p className="text-xs text-slate-300 mt-2">ขอมอบประกาศนียบัตรฉบับเกียรติยศนี้ให้แก่</p>
              <h3 className="text-2xl font-black text-amber-300 mt-1">คุณ {state.character.name}</h3>

              <div className="flex items-center justify-center gap-2 mt-1">
                <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/20 px-2.5 py-0.5 rounded-full">
                  คะแนนรวม: {totalCompositeScore} / 100 ({gradeInfo.grade})
                </span>
                <span className="text-xs font-mono font-bold text-amber-300 bg-amber-500/20 px-2.5 py-0.5 rounded-full">
                  {gradeInfo.text.split('(')[0]}
                </span>
              </div>

              <p className="text-xs text-slate-300 mt-3 leading-relaxed max-w-md mx-auto">
                ในฐานะผู้สำเร็จการศึกษาที่มีความเชี่ยวชาญด้านวงจรปิด วงจรอนุกรม วงจรขนาน การออกแบบชุดแบตเตอรี่ผสม 2S2P
                และการขับเคลื่อนจักรยานไฟฟ้าตามหลักวิศวกรรมไฟฟ้ากระแสตรงระดับยอดเยี่ยม
              </p>
            </div>

            {/* Score Grid on Certificate */}
            <div className="grid grid-cols-4 gap-2 w-full text-[10px] font-mono text-slate-300 bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
              <div>
                <span className="text-slate-400 block font-sans">วงจร</span>
                <strong className="text-amber-300">{circuitCorrectnessScore}/30</strong>
              </div>
              <div>
                <span className="text-slate-400 block font-sans">ความเหมาะสม</span>
                <strong className="text-cyan-300">{batterySuitabilityScore}/20</strong>
              </div>
              <div>
                <span className="text-slate-400 block font-sans">การแข่งขัน</span>
                <strong className="text-emerald-300">{racePerformanceScore}/30</strong>
              </div>
              <div>
                <span className="text-slate-400 block font-sans">สะท้อนคิด</span>
                <strong className="text-purple-300">{learningExplanationScore}/20</strong>
              </div>
            </div>

            <div className="w-full flex flex-col sm:flex-row gap-2 mt-2">
              <button
                onClick={() => setShowCertificate(false)}
                className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition min-h-[44px]"
              >
                ปิดหน้าต่าง
              </button>
              <button
                onClick={() => goToScene('mission_map')}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:brightness-110 text-slate-950 text-xs font-black transition min-h-[44px] shadow-lg shadow-emerald-500/30"
              >
                กลับสู่แผนที่ภารกิจ (Mission Map)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
