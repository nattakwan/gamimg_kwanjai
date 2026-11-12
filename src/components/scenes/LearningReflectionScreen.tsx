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
  AlertTriangle,
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
  category: 'series' | 'parallel' | 'quota_tradeoff' | 'slope_physics' | 'multimeter' | 'safety_bms';
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
      'เมื่อนำเซลล์แบตเตอรี่มาต่อกันแบบ "อนุกรม" (+ ชน -) เหตุใดแรงดันรวมจึงเพิ่มขึ้น แต่ความจุรวมยังคงเท่าเดิม และส่งผลต่อมอเตอร์อย่างไร?',
    options: [
      'ประจุไฟฟ้าไหลผ่านเซลล์เดียว มอเตอร์จึงหมุนช้าลงและแรงดันตก',
      'แรงดันไฟฟ้า (งานต่อหนึ่งหน่วยประจุ) จากแต่ละเซลล์นำมารวมกัน ผลักดันให้มอเตอร์หมุนด้วยความเร็วรอบ (RPM) สูงขึ้น ขณะที่ความจุรวมยังเท่ากับเซลล์แถวเดียว',
      'ความต้านทานกลายเป็นศูนย์ทำให้เกิดไฟฟ้าลัดวงจร',
      'แรงดันของทั้งสองเซลล์จะหักล้างกันจนเหลือ 0V',
    ],
    correctIndex: 1,
    points: 3,
    hint: 'ทางเดินของประจุไฟฟ้ามีเพียงเส้นเดียว (Single Loop) แรงดัน V รวมกัน แต่กระแสไหลผ่านแถวเดียว!',
    explanation:
      'ถูกต้องครับ! การต่ออนุกรมจะเพิ่มแรงดันไฟฟ้า (V_total = V1 + V2 + ...) ส่งผลให้มอเตอร์ทำความเร็วรอบ RPM ได้สูงขึ้น แต่ความจุรวมยังคงเท่ากับความจุของเซลล์แถวเดียว',
  },
  {
    id: 2,
    category: 'parallel',
    topicTitle: '2. หลักการวงจรขนาน (Parallel Circuit Principle)',
    question:
      'การนำเซลล์ไฟฟ้ามาต่อขนานกัน (+ ชน +, - ชน -) ช่วยแบ่งเบาภาระกระแสไฟฟ้าและลดความต้านทานภายใน (R_in) อย่างไร และส่งผลดีต่อจักรยานไฟฟ้าอย่างไร?',
    options: [
      'ทำให้แรงดันไฟฟ้าเพิ่มขึ้นเป็น 2 เท่าทันที',
      'ช่วยแบ่งกระแสไฟฟ้าออกเป็นหลายแถวขนาน ทำให้ความต้านทานภายในลดลง เกิดแรงดันตกคร่อมน้อยลง (Low Sag) และความจุรวมเพิ่มขึ้นตามจำนวนแถวขนาน ใช้งานได้นานขึ้น',
      'ทำให้มอเตอร์กลับทิศทางการหมุนถอยหลังอัตโนมัติ',
      'ตัดกระแสไฟฟ้าไม่ให้ไหลผ่านมอเตอร์เพื่อประหยัดไฟ',
    ],
    correctIndex: 1,
    points: 3,
    hint: 'การต่อขนานเหมือนการเพิ่มเลนถนนคู่ขนานครับ! กระแสแบ่งไหลได้หลายทาง และความต้านทานรวมจะลดลงเสมอ!',
    explanation:
      'ถูกต้องครับ! การต่อขนานเพิ่มพื้นที่ทางเดินของกระแสไฟฟ้า ทำให้ความต้านทานภายในลดลง เกิดแรงดันตกคร่อม (Voltage Sag = I × R_in) น้อยลง และความจุรวมเพิ่มขึ้นตามจำนวนแถว (C_total = C1 + C2 + ...)',
  },
  {
    id: 3,
    category: 'quota_tradeoff',
    topicTitle: '3. การจัดสรรโควตาแบตเตอรี่ 8 ก้อน (8-Cell Budget Quota Trade-Off)',
    question:
      'ภายใต้กติกาจำกัดโควตาแบตเตอรี่ไม่เกิน 8 เซลล์ หากช่างไฟฟ้าเลือกมอเตอร์ขนาดใหญ่ 24V (800W) และต่อเซลล์แบบ 8S 1P (24V 2000mAh) เหตุใดแบตเตอรี่จึงหมดเร็วกว่าชุด 4S 2P (12V 4000mAh) อย่างมาก และส่งผลอย่างไรในการแข่งขัน?',
    options: [
      'เพราะการต่อ 8S ต้องนำเซลล์ทั้ง 8 ก้อนมาอนุกรมกันทั้งหมด ทำให้ได้แรงดัน 24V แต่ความจุเหลือเพียง 2,000 mAh (1P) ขณะที่มอเตอร์ 800W กินกระแสสูงถึง 6.8A แบตเตอรี่จึงหมดลงอย่างรวดเร็ว (t = C/I) หากไม่ปล่อยไหลลงเขาเพื่อประหยัดไฟ แบตจะหมดกลางทางและแพ้การแข่งขัน',
      'เพราะมอเตอร์ 24V มีแรงเสียดทานเชิงกลมากกว่ามอเตอร์ 12V เสมอ',
      'เพราะเซลล์ 8 ก้อนสร้างสนามแม่เหล็กดูดพลังงานทิ้งไปในอากาศ',
      'เพราะกติกาสนามบังคับให้ชุด 8S จ่ายไฟทิ้ง 50% เสมอ',
    ],
    correctIndex: 0,
    points: 4,
    hint: 'พิจารณาความสัมพันธ์ t = Capacity / Current และการจำกัด 8 เซลล์: ถ้าอนุกรมหมดทั้ง 8 ก้อน จะไม่มีเซลล์เหลือมาต่อขนานเพื่อเพิ่มความจุ!',
    explanation:
      'ยอดเยี่ยมที่สุดครับ! การจำกัดโควตา 8 ก้อนสร้างโจทย์วิศวกรรมที่สมจริง: มอเตอร์ 24V ต้องการ 8S1P ได้แรงบิดมหาศาลแต่ความจุเหลือเพียง 2,000 mAh มอเตอร์ 800W กินกระแสสูงมาก หากกดคันเร่ง Boost ต่อเนื่อง แบตเตอรี่จะหมดก่อนถึงยอดเขา! ต่างจาก 4S2P (12V) ที่มีขนาน 2 แถว ได้ความจุ 4,000 mAh วิ่งได้นานกว่า 2 เท่า',
  },
  {
    id: 4,
    category: 'slope_physics',
    topicTitle: '4. ฟิสิกส์ความลาดชัน ขึ้นเขา-ลงเขา (Slope Physics & Energy Coasting)',
    question:
      'ในการแข่งขันบนสนามฮิลล์ไคลมบ์ที่มีทั้งทางขึ้นเขาชัน (+14% ถึง +16%) สลับทางลงเขาชัน (-9%) กฎฟิสิกส์และการบริหารพลังงานไฟฟ้าข้อใดถูกต้องที่สุด?',
    options: [
      'ตอนขึ้นเขา แรงโน้มถ่วง F = mg*sin(θ) มีทิศต้านการเคลื่อนที่ ต้องใช้แรงบิดมอเตอร์สูง ส่วนตอนลงเขา แรงโน้มถ่วงจะช่วยส่งกำลังผลักรถไปข้างหน้า ช่างไฟฟ้าจึงควรปิดระบบมอเตอร์ช่วยปั่น (0W) เพื่อปล่อยไหลฟรี (Coasting) ประหยัดประจุไฟฟ้าไว้พิชิตยอดเขาสุดท้าย',
      'ตอนลงเขาควรเปิดมอเตอร์เต็ม 100% เพื่อปั่นแข่งกับแรงโน้มถ่วง',
      'ความลาดชันไม่มีผลต่อการกินกระแสของมอเตอร์ไฟฟ้า',
      'รถจะถอยหลังเสมอเมื่อเจอกับทางลงเขา',
    ],
    correctIndex: 0,
    points: 4,
    hint: 'ตอนลงเขา เวกเตอร์แรงโน้มถ่วง mg*sin(θ) ชี้ไปข้างหน้าในทิศเดียวกับการเคลื่อนที่ รถเคลื่อนที่ได้เองโดยไม่ต้องจ่ายกระแสไฟฟ้าจากแบตเตอรี่ครับ!',
    explanation:
      'ถูกต้องแม่นยำตามหลักกลศาสตร์และวิศวกรรมไฟฟ้าครับ! ตอนขึ้นเขา แรงโน้มถ่วงต้านการเคลื่อนที่ (F_slope = mg*sin(θ)) ต้องอาศัยแรงขับมอเตอร์สูง แต่ตอนลงเขา แรงโน้มถ่วงกลายเป็นแรงขับเคลื่อนข้างหน้า (+F_slope) ช่วยให้รถไหลไปข้างหน้าได้เร็ว การปิดมอเตอร์ช่วยปั่นจะทำให้กินพลังงาน 0 วัตต์ (Coasting) ประหยัดประจุสะสมไว้ใช้ไต่ยอดเขาชันลูกสุดท้าย',
  },
  {
    id: 5,
    category: 'multimeter',
    topicTitle: '5. การใช้เครื่องมือวัดดิจิทัลมัลติมิเตอร์ (DMM Measurement)',
    question:
      'ในการใช้ดิจิทัลมัลติมิเตอร์เพื่อวัดแรงดันตกคร่อมของเซลล์แบตเตอรี่ ช่างไฟฟ้าต้องตั้งย่านวัดใด และหากหน้าจอแสดงค่าติดลบ (-) บ่งชี้ถึงสิ่งใด?',
    options: [
      'ตั้งย่าน DCV 20V (สำหรับการวัดแบตเตอรี่แรงดันต่ำกว่า 20V) และค่าติดลบ (-) หมายถึงจิ้มสายวัดโพรบสลับขั้ว (สายแดงแตะขั้วลบ, สายดำแตะขั้วบวก)',
      'ตั้งย่าน ACV 750V และค่าติดลบหมายถึงมิเตอร์แบตเตอรี่หมด',
      'ตั้งย่าน DCA 10A และนำสายวัดไปจิ้มคร่อมขั้วแบตเตอรี่โดยตรงเพื่อวัดแอมป์',
      'ตั้งย่านความต้านทานโอห์ม (Ω) ขณะที่วงจรเปิดและกำลังจ่ายไฟอยู่',
    ],
    correctIndex: 0,
    points: 3,
    hint: 'แบตเตอรี่จ่ายไฟฟ้ากระแสตรง (DC) และสายสีแดงคือขั้วบวก สายสีดำคือขั้วลบ (COM) ครับ!',
    explanation:
      'ถูกต้องแม่นยำมากครับ! ในงานช่างไฟฟ้า แบตเตอรี่เป็นไฟฟ้ากระแสตรง ต้องตั้งย่าน DCV (แนะนำ 20V เพื่อความละเอียด 2 ตำแหน่ง) และเครื่องหมายลบแสดงว่าโพรบสีแดงสัมผัสจุดที่มีศักย์ไฟฟ้าต่ำกว่าโพรบสีดำ (สลับขั้ว)',
  },
  {
    id: 6,
    category: 'safety_bms',
    topicTitle: '6. ระบบความปลอดภัย ฟิวส์ และวงจร BMS (Safety & BMS Protection)',
    question:
      'ในการประกอบแพ็กแบตเตอรี่ลิเธียมสำหรับจักรยานไฟฟ้า เหตุใดช่างไฟฟ้าจึงต้องติดตั้งแผงวงจร BMS และฟิวส์ป้องกันกระแสเกินเสมอ?',
    options: [
      'เพื่อทำหน้าที่ปรับสมดุลแรงดันระหว่างเซลล์ (Cell Balancing), ป้องกันการชาร์จ/คายประจุเกินพิกัด, และตัดวงจรทันทีเมื่อเกิดไฟฟ้าลัดวงจร ป้องกันความร้อนสะสมและเพลิงไหม้',
      'เพื่อเปลี่ยนไฟฟ้ากระแสตรงให้กลายเป็นกระแสสลับ',
      'เพื่อเพิ่มน้ำหนักของตัวรถให้ทรงตัวได้ดีขึ้นขณะเลี้ยวโค้ง',
      'เพื่อบังคับให้แบตเตอรี่จ่ายไฟได้เฉพาะตอนกลางวันเท่านั้น',
    ],
    correctIndex: 0,
    points: 3,
    hint: 'BMS ย่อมาจาก Battery Management System ทำหน้าที่ควบคุมดูแลเซลล์แต่ละก้อน และฟิวส์คือด่านแรกในการตัดวงจรเมื่อลัดวงจรครับ!',
    explanation:
      'ถูกต้องที่สุดตามมาตรฐานช่างไฟฟ้าครับ! วงจร BMS จำเป็นอย่างยิ่งในการเกลี่ยประจุแต่ละเซลล์ให้เท่ากัน ป้องกัน Overcharge/Over-discharge และฟิวส์จะหลอมละลายตัดวงจรทันทีเมื่อกระแสเกินพิกัด ป้องกันความร้อนลุกไหม้ (Thermal Runaway)',
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
  // - Pack voltage matches chosen motor voltage (6V / 12V / 24V): 15 pts
  // - Low internal resistance (R_in <= 0.25): 5 pts
  const chosenMotorV = race?.chosenMotorVoltage || state.bikeSetup?.motorVoltageRating || 12;
  const isVoltageMatched = Math.abs(packV - chosenMotorV) <= chosenMotorV * 0.15;
  const isLowRin = packRin <= 0.25;
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
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-sky-50 to-indigo-50/40 text-slate-800 flex flex-col font-sans select-none p-3 md:p-6 pb-12">
      {/* Top Header */}
      <div className="bg-white/95 border border-slate-200/90 shadow-sm px-4 py-3 rounded-3xl flex flex-wrap items-center justify-between gap-3 max-w-6xl mx-auto w-full mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-600 to-emerald-500 flex items-center justify-center font-bold text-base shadow-sm">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base md:text-lg font-black text-slate-900 flex items-center gap-2">
              <span>ถอดบทเรียนและประเมินผลการเรียนรู้ (Learning Reflection Dashboard)</span>
              <span className="text-[10px] bg-indigo-50 text-indigo-800 border border-indigo-200 px-2 py-0.5 rounded-full font-bold">
                ฉากที่ 15
              </span>
            </h1>
            <p className="text-[11px] text-slate-500">
              วิเคราะห์วงจร แบตเตอรี่ ผลการทดสอบ และการแข่งขัน พร้อมตอบคำถามสะท้อนคิดเพื่อรับใบประกาศนียบัตร
            </p>
          </div>
        </div>

        {/* Total Score Pill */}
        <div className="flex items-center gap-3">
          <div className="bg-amber-50/80 px-3.5 py-1.5 rounded-2xl border border-amber-200 flex items-center gap-2 shadow-sm">
            <Award className="w-4 h-4 text-amber-600" />
            <div className="flex flex-col">
              <span className="text-[9px] text-amber-700 uppercase font-mono font-bold">คะแนนประเมินรวม</span>
              <span className="text-sm font-black font-mono text-amber-900">
                {totalCompositeScore} <span className="text-[10px] text-amber-600 font-normal">/ 100</span>
              </span>
            </div>
            <span className="text-xs font-black font-mono text-amber-800 bg-amber-200/80 px-2 py-0.5 rounded-full">
              {gradeInfo.grade}
            </span>
          </div>

          <button
            onClick={() => goToScene('main_menu')}
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 transition flex items-center gap-1.5 min-h-[40px] cursor-pointer"
          >
            <Home className="w-4 h-4 text-slate-500" />
            <span className="hidden sm:inline">เมนูหลัก</span>
          </button>
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="max-w-6xl mx-auto w-full flex-1 flex flex-col gap-5">
        {/* Row 1: Educational Summary Dashboard (Saved Config, Dyno Test, Race Performance) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Saved Battery Configuration */}
          <div className="bg-white/95 border border-slate-200/90 rounded-3xl p-4 shadow-sm flex flex-col justify-between gap-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-xs font-black text-amber-800 uppercase flex items-center gap-1.5">
                <BatteryCharging className="w-4 h-4 text-amber-600" />
                ชุดแบตเตอรี่ที่บันทึกไว้ (Saved Pack)
              </span>
              <span className="text-[10px] font-mono text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">
                VALIDATED
              </span>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-700">
                <span className="text-slate-500">ชื่อโครงแบบ:</span>
                <span className="font-bold text-slate-900">{pack.name || 'ชุดผสม 2S2P (4 ก้อน)'}</span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span className="text-slate-500">แรงดันพิกัด (Nominal V):</span>
                <span className="font-mono font-bold text-amber-800">{packV.toFixed(1)} โวลต์</span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span className="text-slate-500">ความจุประจุ (Capacity):</span>
                <span className="font-mono font-bold text-teal-800">{packMah} mAh</span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span className="text-slate-500">ความต้านทานภายใน (R_in):</span>
                <span className="font-mono font-bold text-emerald-800">{packRin.toFixed(2)} โอห์ม</span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span className="text-slate-500">พลังงานสะสมทฤษฎี:</span>
                <span className="font-mono font-bold text-purple-800">
                  {((packV * packMah) / 1000).toFixed(1)} Wh
                </span>
              </div>
            </div>

            <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200 text-[11px] text-slate-600 shadow-inner">
              💡 2S (อนุกรม 2 ก้อน) รวมแรงดันเป็น 3.0V และ 2P (ขนาน 2 แถว) รวมความจุเป็น 4000mAh
            </div>
          </div>

          {/* Card 2: Motor Dyno Test Outcomes */}
          <div className="bg-white/95 border border-slate-200/90 rounded-3xl p-4 shadow-sm flex flex-col justify-between gap-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-xs font-black text-cyan-800 uppercase flex items-center gap-1.5">
                <Gauge className="w-4 h-4 text-cyan-600" />
                การจับคู่มอเตอร์กับชุดแบตเตอรี่ (Engineering Match)
              </span>
              <span className="text-[10px] font-mono text-cyan-800 bg-cyan-50 border border-cyan-200 px-2 py-0.5 rounded-full font-bold">
                DC {chosenMotorV}V MOTOR
              </span>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-700">
                <span className="text-slate-500">พิกัดมอเตอร์ไฟฟ้า:</span>
                <span className="font-bold text-slate-900">DC {chosenMotorV}V ({chosenMotorV === 24 ? '800W' : chosenMotorV === 12 ? '450W' : '200W'})</span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span className="text-slate-500">แรงดันแบตเตอรี่ที่จ่าย:</span>
                <span className="font-mono font-bold text-amber-800">{packV.toFixed(1)} โวลต์</span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span className="text-slate-500">อัตราส่วนการจับคู่ (Match Ratio):</span>
                <span className="font-mono font-bold text-cyan-800">{Math.round((packV / chosenMotorV) * 100)}%</span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span className="text-slate-500">โควตาเซลล์ที่ใช้:</span>
                <span className="font-mono font-bold text-purple-800">{pack.totalCells || 8} / 8 เซลล์</span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span className="text-slate-500">สถานะความปลอดภัย:</span>
                <span className={`font-bold flex items-center gap-1 ${
                  packV <= chosenMotorV * 1.05 ? 'text-emerald-700' : 'text-rose-700'
                }`}>
                  {packV <= chosenMotorV * 1.05 ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> ไม่เกินพิกัด
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600" /> แรงดันเกินพิกัด!
                    </>
                  )}
                </span>
              </div>
            </div>

            <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200 text-[11px] text-slate-600 shadow-inner">
              🛡️ {packV === chosenMotorV ? `แรงดัน ${packV}V ตรงพิกัดมอเตอร์ ${chosenMotorV}V สมบูรณ์แบบ` : packV < chosenMotorV ? `แรงดันต่ำกว่าพิกัด มอเตอร์สูญเสียกำลังขับ` : `แรงดันเกินพิกัด มอเตอร์เสี่ยงชำรุด`}
            </div>
          </div>

          {/* Card 3: Race Performance Telemetry */}
          <div className="bg-white/95 border border-slate-200/90 rounded-3xl p-4 shadow-sm flex flex-col justify-between gap-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-xs font-black text-emerald-800 uppercase flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-emerald-600" />
                ผลงานการแข่งขันจริง (Race Telemetry)
              </span>
              <span className="text-[10px] font-mono text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full font-bold">
                RANK #{raceRank}
              </span>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-700">
                <span className="text-slate-500">สนามแข่งขัน:</span>
                <span className="font-bold text-slate-900 truncate max-w-[150px]">{trackName.split('(')[0]}</span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span className="text-slate-500">เวลาเข้าเส้นชัยรวม:</span>
                <span className="font-mono font-bold text-emerald-800">{raceTimeSec.toFixed(1)} วิ</span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span className="text-slate-500">ความเร็วเฉลี่ย:</span>
                <span className="font-mono font-bold text-cyan-800">{raceAvgSpeed} กม./ชม.</span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span className="text-slate-500">ความเร็วสูงสุด:</span>
                <span className="font-mono font-bold text-cyan-800">{raceTopSpeed} กม./ชม.</span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span className="text-slate-500">ประจุที่ใช้ / คงเหลือ:</span>
                <span className="font-mono font-bold text-amber-800">
                  {raceEnergyUsed} / {raceEnergyRemaining} mAh ({raceEnergyPct}%)
                </span>
              </div>
            </div>

            <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200 text-[11px] text-slate-600 shadow-inner">
              🏁 สถิติการแข่งจริง: เข้าเส้นชัยอันดับ #{raceRank} พร้อมพลังงานคงเหลือ {raceEnergyPct}%
            </div>
          </div>
        </div>

        {/* Row 2: Strict Scoring Breakdown Card (100 Points Total) */}
        <div className="bg-white/95 border-2 border-indigo-200/90 rounded-3xl p-4 shadow-sm flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-2 gap-2">
            <div>
              <span className="text-xs font-black text-amber-800 uppercase flex items-center gap-1.5">
                <Award className="w-4 h-4 text-amber-600" />
                ตารางแจกแจงคะแนนประเมินอย่างเป็นทางการ (Scoring Rubric - 100 Points Max)
              </span>
              <p className="text-[11px] text-slate-500">
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
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 flex flex-col justify-between gap-1 shadow-inner">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-700">1. ความถูกต้องวงจร</span>
                <span className="font-mono font-black text-amber-800 text-sm">{circuitCorrectnessScore} / 30</span>
              </div>
              <span className="text-[10px] text-slate-500 leading-relaxed">
                {isValidated ? 'ผ่านเกณฑ์: ตรวจสอบวงจรปิด ไม่มีการต่อกลับขั้วหรือลัดวงจร' : 'ไม่ผ่านเกณฑ์วงจร'}
              </span>
              <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-1">
                <div
                  className="bg-amber-500 h-full rounded-full"
                  style={{ width: `${(circuitCorrectnessScore / 30) * 100}%` }}
                />
              </div>
            </div>

            {/* Metric 2 */}
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 flex flex-col justify-between gap-1 shadow-inner">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-700">2. ความเหมาะสมแบตเตอรี่</span>
                <span className="font-mono font-black text-cyan-800 text-sm">{batterySuitabilityScore} / 20</span>
              </div>
              <span className="text-[10px] text-slate-500 leading-relaxed">
                {isVoltageMatched ? 'แรงดัน 3.0V ตรงพิกัดมอเตอร์ DC 3V + R_in 0.15Ω ต่ำ' : 'แรงดันไม่ตรงพิกัด'}
              </span>
              <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-1">
                <div
                  className="bg-cyan-500 h-full rounded-full"
                  style={{ width: `${(batterySuitabilityScore / 20) * 100}%` }}
                />
              </div>
            </div>

            {/* Metric 3 */}
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 flex flex-col justify-between gap-1 shadow-inner">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-700">3. ผลงานการแข่งขัน</span>
                <span className="font-mono font-black text-emerald-800 text-sm">{racePerformanceScore} / 30</span>
              </div>
              <span className="text-[10px] text-slate-500 leading-relaxed">
                อิงจากอันดับ #{raceRank}, ความเร็ว {raceAvgSpeed} กม./ชม., และประจุคงเหลือ {raceEnergyPct}%
              </span>
              <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-1">
                <div
                  className="bg-emerald-500 h-full rounded-full"
                  style={{ width: `${(racePerformanceScore / 30) * 100}%` }}
                />
              </div>
            </div>

            {/* Metric 4 */}
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 flex flex-col justify-between gap-1 shadow-inner">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-700">4. การสะท้อนคิดวิชาการ</span>
                <span className="font-mono font-black text-purple-800 text-sm">
                  {learningExplanationScore} / 20
                </span>
              </div>
              <span className="text-[10px] text-slate-500 leading-relaxed">
                ตอบถูก {learningExplanationScore === 20 ? '3/3 ข้อครบถ้วน' : `${Math.floor(learningExplanationScore / 7)}/3 ข้อ`} (ข้อละ 6–7 คะแนน)
              </span>
              <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-1">
                <div
                  className="bg-purple-500 h-full rounded-full"
                  style={{ width: `${(learningExplanationScore / 20) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Row 3: Three Short Thai Reflection Questions */}
        <div className="bg-white/95 border border-slate-200/90 rounded-3xl p-5 shadow-sm flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-xs font-black text-amber-800 uppercase flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-amber-600" />
              คำถามสะท้อนคิดทางวิศวกรรมไฟฟ้า 3 ข้อ (3 Interactive Reflection Questions)
            </span>
            <span className="text-xs font-mono bg-indigo-50 text-indigo-700 border border-indigo-200 px-3 py-0.5 rounded-full font-bold">
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
                  className="bg-slate-50/90 p-4 rounded-2xl border border-slate-200 flex flex-col gap-3 shadow-inner"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-black uppercase text-amber-600 tracking-wider">
                        {q.topicTitle} ({q.points} คะแนน)
                      </span>
                      <h3 className="text-xs md:text-sm font-bold text-slate-800 mt-0.5 leading-relaxed">
                        {q.question}
                      </h3>
                    </div>

                    <button
                      onClick={() => {
                        playReflectionTone('hint');
                        setActiveHintId(isHintActive ? null : q.id);
                      }}
                      className="px-2.5 py-1 rounded-xl bg-white hover:bg-slate-100 text-amber-700 text-[10px] font-bold border border-slate-200 shadow-sm transition flex items-center gap-1 shrink-0"
                    >
                      <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                      <span>{isHintActive ? 'ปิดคำใบ้' : 'ขอคำใบ้'}</span>
                    </button>
                  </div>

                  {/* Hint Box */}
                  {isHintActive && (
                    <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-xl text-xs text-amber-800 flex items-start gap-2 animate-in fade-in">
                      <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <span>{q.hint}</span>
                    </div>
                  )}

                  {/* Options */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                    {q.options.map((opt, optIdx) => {
                      const isThisSelected = selectedIdx === optIdx;
                      let btnStyle = 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-sm';

                      if (isAnswered) {
                        if (optIdx === q.correctIndex) {
                          btnStyle = 'bg-emerald-50 border-emerald-400 text-emerald-800 font-bold shadow-sm';
                        } else if (isThisSelected && !isCorrect) {
                          btnStyle = 'bg-rose-50 border-rose-400 text-rose-800 line-through';
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
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 ml-2" />
                          )}
                          {isAnswered && isThisSelected && !isCorrect && (
                            <XCircle className="w-4 h-4 text-rose-600 shrink-0 ml-2" />
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
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                          : 'bg-amber-50 border-amber-300 text-amber-900'
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
                className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-black text-sm shadow-md flex items-center justify-center gap-2 transition active:scale-95"
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
            className="py-3.5 px-3 rounded-2xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-2 transition min-h-[46px] border border-slate-200 active:scale-95 shadow-sm"
          >
            <Wrench className="w-4 h-4 text-amber-500" />
            <span>ทบทวนห้องแล็บ (Review Lab)</span>
          </button>

          {/* 2. Retry Race */}
          <button
            onClick={() => goToScene('racing')}
            className="py-3.5 px-3 rounded-2xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-2 transition min-h-[46px] border border-slate-200 active:scale-95 shadow-sm"
          >
            <RotateCcw className="w-4 h-4 text-cyan-600" />
            <span>แข่งใหม่อีกครั้ง (Retry Race)</span>
          </button>

          {/* 3. Next Mission / Mission Map */}
          <button
            onClick={() => goToScene('mission_map')}
            className="py-3.5 px-3 rounded-2xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-2 transition min-h-[46px] border border-slate-200 active:scale-95 shadow-sm"
          >
            <Milestone className="w-4 h-4 text-emerald-600" />
            <span>แผนที่ภารกิจ (Mission Map)</span>
          </button>

          {/* 4. Main Menu */}
          <button
            onClick={() => goToScene('main_menu')}
            className="py-3.5 px-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-black text-xs shadow-md flex items-center justify-center gap-2 transition min-h-[46px] active:scale-95"
          >
            <Home className="w-4 h-4" />
            <span>กลับสู่เมนูหลัก (Main Menu)</span>
          </button>
        </div>
      </div>

      {/* Graduation Certificate & Vocational Competency Assessment Modal */}
      {showCertificate && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in overflow-y-auto">
          <div className="bg-white border-4 border-amber-400 rounded-3xl max-w-xl w-full p-5 sm:p-7 shadow-2xl text-center flex flex-col items-center gap-3.5 relative text-slate-800">
            {/* Top Seal & Avatar */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-16 bg-slate-100 rounded-2xl p-1 border-2 border-amber-400 overflow-hidden shadow-sm flex items-center justify-center">
                <AvatarRenderer avatar={state.character} size="sm" mode="2d" />
              </div>
              <div className="w-14 h-14 rounded-2xl bg-amber-50 border-2 border-amber-400 flex items-center justify-center text-amber-600 shadow-sm">
                <Award className="w-8 h-8" />
              </div>
            </div>

            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 block font-mono">
                สถาบันการอาชีวศึกษา · VOCATIONAL EDUCATION EDITION
              </span>
              <h2 className="text-lg sm:text-xl font-black text-slate-800 mt-0.5">
                ใบรายงานผลการประเมินสมรรถนะวิชาชีพ
              </h2>
              <p className="text-[11px] text-indigo-600 font-mono font-bold">
                รายวิชา: งานไฟฟ้าและอิเล็กทรอนิกส์เบื้องต้น (หน่วย: แบตเตอรี่และวงจรไฟฟ้า)
              </p>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 my-2 text-left space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">ชื่อนักศึกษา:</span>
                  <span className="font-black text-amber-700 text-sm">คุณ {state.character.name}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">ยศ / ระดับช่าง:</span>
                  <span className="font-mono text-cyan-700 font-bold">{state.learning.academyRank}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">สถานะสมรรถนะ:</span>
                  <span className="font-mono font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    ผ่านเกณฑ์มาตรฐานช่าง (COMPETENT)
                  </span>
                </div>
              </div>

              {/* 3 Competency Domains (พุทธิพิสัย, ทักษะพิสัย, จิตพิสัย) */}
              <div className="grid grid-cols-3 gap-2 w-full text-[10px] font-mono text-slate-700 bg-slate-50 p-2.5 rounded-2xl border border-slate-200 text-left">
                <div className="space-y-0.5">
                  <span className="text-amber-700 font-bold block">1. พุทธิพิสัย (30%)</span>
                  <span className="text-slate-500 text-[9px] block">ทฤษฎี V, I, R, สูตรอนุกรม-ขนาน</span>
                  <strong className="text-slate-900 text-xs">{circuitCorrectnessScore} / 30</strong>
                </div>

                <div className="space-y-0.5">
                  <span className="text-cyan-700 font-bold block">2. ทักษะพิสัย (40%)</span>
                  <span className="text-slate-500 text-[9px] block">ใช้มัลติมิเตอร์ DCV & แพ็ก 2S2P</span>
                  <strong className="text-slate-900 text-xs">{(batterySuitabilityScore + (racePerformanceScore / 30) * 20).toFixed(0)} / 40</strong>
                </div>

                <div className="space-y-0.5">
                  <span className="text-emerald-700 font-bold block">3. จิตพิสัย (30%)</span>
                  <span className="text-slate-500 text-[9px] block">ฟิวส์, BMS & เซฟตี้ลัดวงจร</span>
                  <strong className="text-slate-900 text-xs">{(learningExplanationScore / 20 * 30).toFixed(0)} / 30</strong>
                </div>
              </div>

              {/* Total Score & Grade */}
              <div className="flex items-center justify-center gap-3 mt-3">
                <span className="text-sm font-mono font-black text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                  เกรดประเมิน: {gradeInfo.grade} ({totalCompositeScore} / 100)
                </span>
                <span className="text-xs font-mono font-bold text-amber-700">
                  {gradeInfo.text.split('(')[0]}
                </span>
              </div>
            </div>

            {/* Signature Seal */}
            <div className="w-full flex items-center justify-between border-t border-slate-200 pt-2 text-[10px] text-slate-500 font-mono">
              <span>อาจารย์ผู้ประเมิน: ศ.ดร.วัตต์ (Prof. Watt)</span>
              <span>ระบบตรวจสอบอัตโนมัติ AI-DMM Certified</span>
            </div>

            <div className="w-full flex flex-col sm:flex-row gap-2 mt-1">
              <button
                type="button"
                onClick={() => window.print()}
                className="py-2.5 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-amber-700 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer border border-slate-200"
              >
                <span>🖨️ พิมพ์ / แคปเจอร์ส่งครูผู้สอน</span>
              </button>

              <button
                type="button"
                onClick={() => setShowCertificate(false)}
                className="py-2.5 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition cursor-pointer border border-slate-200"
              >
                ปิดหน้าต่าง
              </button>

              <button
                type="button"
                onClick={() => goToScene('mission_map')}
                className="flex-1 py-2.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-xs font-black transition shadow-md cursor-pointer"
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
