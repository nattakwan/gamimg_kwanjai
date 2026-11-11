/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DigitalMultimeter — Interactive DMM simulator for Vocational Electrical Students (ปวช.)
 * Features:
 * 1. Realistic LCD 7-segment digital display with backlight
 * 2. Rotary Selector Knob (OFF, DCV 20V, DCV 200V, DCA 10A, Continuity Beep)
 * 3. Red (+) and Black (-) Probe Selection to test points
 * 4. Reverse polarity detection (shows '-' sign)
 * 5. Audio continuity buzzer for circuit continuity tests
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  Volume2,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Activity,
  Layers,
  RotateCw,
} from 'lucide-react';
import { DigitalMultimeter3D } from '../circuit3d/DigitalMultimeter3D';

export interface TestPoint {
  id: string;
  name: string;
  voltagePotential: number; // relative to circuit ground (0V)
  isGround?: boolean;
}

interface DigitalMultimeterProps {
  isOpen: boolean;
  onClose: () => void;
  testPoints: TestPoint[];
  circuitIsClosed?: boolean;
}

const playBuzzer = () => {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(2400, ctx.currentTime);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  } catch {
    // Ignore audio
  }
};

export const DigitalMultimeter: React.FC<DigitalMultimeterProps> = ({
  isOpen,
  onClose,
  testPoints,
  circuitIsClosed = true,
}) => {
  const [knobSetting, setKnobSetting] = useState<'OFF' | 'DCV_20' | 'DCV_200' | 'DCA_10' | 'CONTINUITY'>('DCV_20');
  const [redProbeId, setRedProbeId] = useState<string>(testPoints[0]?.id || '');
  const [blackProbeId, setBlackProbeId] = useState<string>(testPoints[1]?.id || '');
  const [isBacklightOn, setIsBacklightOn] = useState<boolean>(true);
  const [show3DModel, setShow3DModel] = useState<boolean>(true);

  // Default initial probes when test points change
  useEffect(() => {
    if (testPoints.length >= 2) {
      if (!redProbeId || !testPoints.some((p) => p.id === redProbeId)) {
        setRedProbeId(testPoints[0].id);
      }
      if (!blackProbeId || !testPoints.some((p) => p.id === blackProbeId)) {
        setBlackProbeId(testPoints[1].id);
      }
    }
  }, [testPoints, redProbeId, blackProbeId]);

  if (!isOpen) return null;

  // Calculate measurement
  const redPoint = testPoints.find((p) => p.id === redProbeId);
  const blackPoint = testPoints.find((p) => p.id === blackProbeId);

  let displayReading = '0.00';
  let unit = 'V';
  let isReverse = false;
  let isContinuityBeep = false;

  if (knobSetting === 'OFF') {
    displayReading = '';
    unit = '';
  } else if (!redPoint || !blackPoint) {
    displayReading = '0.00';
  } else if (knobSetting === 'DCV_20' || knobSetting === 'DCV_200') {
    const diff = (redPoint.voltagePotential - blackPoint.voltagePotential);
    const maxRange = knobSetting === 'DCV_20' ? 20.0 : 200.0;

    if (Math.abs(diff) > maxRange) {
      displayReading = 'O.L'; // Overload
    } else {
      isReverse = diff < -0.001;
      displayReading = diff.toFixed(knobSetting === 'DCV_20' ? 2 : 1);
      unit = 'V';
    }
  } else if (knobSetting === 'DCA_10') {
    // Current measurement
    unit = 'A';
    if (!circuitIsClosed) {
      displayReading = '0.00';
    } else {
      const diff = Math.abs(redPoint.voltagePotential - blackPoint.voltagePotential);
      // approximate current
      displayReading = (diff / 1.5).toFixed(2);
    }
  } else if (knobSetting === 'CONTINUITY') {
    unit = 'Ω';
    // If measuring between connected points
    const potentialDiff = Math.abs(redPoint.voltagePotential - blackPoint.voltagePotential);
    if (potentialDiff < 0.05 && redPoint.id !== blackPoint.id) {
      displayReading = '0.2';
      isContinuityBeep = true;
    } else if (redPoint.id === blackPoint.id) {
      displayReading = '0.0';
      isContinuityBeep = true;
    } else {
      displayReading = 'O.L';
    }
  }

  const handleTestBeep = () => {
    if (isContinuityBeep) {
      playBuzzer();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 select-none">
      <div className="relative w-full max-w-lg bg-[#f59e0b] border-4 border-[#b45309] rounded-3xl p-5 shadow-[0_20px_50px_rgba(0,0,0,0.8)] text-slate-900 font-sans flex flex-col gap-4">
        {/* Multimeter Top Brand Bar */}
        <div className="flex items-center justify-between border-b-2 border-amber-600/40 pb-2">
          <div className="flex items-center gap-2">
            <span className="bg-slate-950 text-amber-400 px-2 py-0.5 rounded-lg text-xs font-black font-mono tracking-wider">
              DMM-3000
            </span>
            <span className="text-xs font-black text-slate-900 tracking-wide">
              TRUE RMS MULTIMETER · เครื่องมือวัดมาตรฐานช่าง
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShow3DModel((prev) => !prev)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer ${
                show3DModel
                  ? 'bg-slate-950 text-cyan-300 border border-cyan-500/50 shadow'
                  : 'bg-amber-700/30 text-amber-950 hover:bg-amber-700/50'
              }`}
              title="สลับโหมดโมเดล 3D เสมือนจริง"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>{show3DModel ? 'ซ่อนโมเดล 3D' : 'แสดงโมเดล 3D'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-full bg-slate-900/10 hover:bg-slate-900/20 text-slate-950 font-black cursor-pointer transition"
              title="ปิดหน้าต่างมัลติมิเตอร์"
            >
              <X className="w-5 h-5 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* ── Interactive 3D Multimeter Inspection Model ── */}
        {show3DModel && (
          <div className="bg-slate-950/90 rounded-2xl p-2 border-2 border-amber-600/40 shadow-inner">
            <DigitalMultimeter3D
              reading={displayReading}
              unit={unit}
              mode={knobSetting === 'OFF' ? 'OFF' : 'DCV'}
              size="sm"
            />
          </div>
        )}

        {/* ── LCD Screen Display ── */}
        <div
          className={`w-full rounded-2xl p-4 border-4 border-slate-700 transition-colors shadow-inner flex flex-col justify-between h-36 ${
            knobSetting === 'OFF'
              ? 'bg-[#1e293b] text-slate-600'
              : isBacklightOn
              ? 'bg-[#67e8f9]/90 text-slate-950 shadow-[0_0_20px_rgba(103,232,249,0.5)]'
              : 'bg-[#94a3b8] text-slate-950'
          }`}
        >
          {/* LCD Indicators top row */}
          <div className="flex items-center justify-between text-xs font-mono font-bold">
            <div className="flex items-center gap-2">
              <span>{knobSetting !== 'OFF' ? 'AUTO' : ''}</span>
              <span>{knobSetting.startsWith('DC') ? 'DC' : ''}</span>
              {isContinuityBeep && (
                <span className="flex items-center gap-1 text-emerald-900 font-black animate-pulse">
                  <Volume2 className="w-3.5 h-3.5" /> BEEP
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsBacklightOn((prev) => !prev)}
              className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-black/15 hover:bg-black/25 cursor-pointer"
            >
              💡 ไฟหน้าจอ
            </button>
          </div>

          {/* Main 7-Segment Value */}
          <div className="text-right font-mono font-black tracking-widest text-4xl sm:text-5xl my-auto">
            {knobSetting === 'OFF' ? (
              <span className="text-slate-600 text-2xl">OFF</span>
            ) : (
              <div className="flex items-baseline justify-end gap-2">
                <span>{displayReading}</span>
                <span className="text-2xl font-bold">{unit}</span>
              </div>
            )}
          </div>

          {/* LCD Bottom Status */}
          <div className="flex items-center justify-between text-[11px] font-mono">
            <span>
              {knobSetting === 'DCV_20' && 'ย่านวัด: DC 20.00V (สำหรับแบตเตอรี่)'}
              {knobSetting === 'DCV_200' && 'ย่านวัด: DC 200.0V'}
              {knobSetting === 'DCA_10' && 'ย่านวัด: DC 10.00A (ต่ออนุกรมกับโหลด)'}
              {knobSetting === 'CONTINUITY' && 'โหมด: ตรวจสอบความต่อเนื่อง (Beeper)'}
              {knobSetting === 'OFF' && 'ปิดเครื่องเพื่อประหยัดแบตเตอรี่มิเตอร์'}
            </span>
            {isReverse && (
              <span className="bg-rose-900 text-white px-2 py-0.2 rounded font-bold animate-pulse">
                ขั้วกลับ (-)
              </span>
            )}
          </div>
        </div>

        {/* ── Rotary Selector Knob ── */}
        <div className="bg-slate-900 rounded-2xl p-3 border-2 border-slate-800 text-white flex flex-col gap-2">
          <div className="text-[11px] font-mono font-bold text-amber-400 flex items-center justify-between">
            <span>หมุนซีเลกเตอร์ (Range Selector)</span>
            <span className="text-slate-400 text-[10px]">เลือกย่านวัดให้เหมาะสมกับงาน</span>
          </div>

          <div className="grid grid-cols-5 gap-1.5 text-xs font-mono font-bold">
            <button
              type="button"
              onClick={() => setKnobSetting('OFF')}
              className={`py-2 rounded-xl border transition-all cursor-pointer ${
                knobSetting === 'OFF'
                  ? 'bg-rose-600 text-white border-rose-400 shadow-md font-black'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              OFF
            </button>

            <button
              type="button"
              onClick={() => setKnobSetting('DCV_20')}
              className={`py-2 rounded-xl border transition-all cursor-pointer ${
                knobSetting === 'DCV_20'
                  ? 'bg-emerald-600 text-white border-emerald-400 shadow-md font-black'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              DCV 20V
            </button>

            <button
              type="button"
              onClick={() => setKnobSetting('DCV_200')}
              className={`py-2 rounded-xl border transition-all cursor-pointer ${
                knobSetting === 'DCV_200'
                  ? 'bg-emerald-600 text-white border-emerald-400 shadow-md font-black'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              DCV 200V
            </button>

            <button
              type="button"
              onClick={() => setKnobSetting('DCA_10')}
              className={`py-2 rounded-xl border transition-all cursor-pointer ${
                knobSetting === 'DCA_10'
                  ? 'bg-sky-600 text-white border-sky-400 shadow-md font-black'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              DCA 10A
            </button>

            <button
              type="button"
              onClick={() => {
                setKnobSetting('CONTINUITY');
                handleTestBeep();
              }}
              className={`py-2 rounded-xl border transition-all cursor-pointer ${
                knobSetting === 'CONTINUITY'
                  ? 'bg-amber-600 text-white border-amber-400 shadow-md font-black'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              BEEP (Ω)
            </button>
          </div>
        </div>

        {/* ── Test Probes Selection (Red & Black Lead Jacks) ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-900/90 rounded-2xl p-3 border-2 border-slate-800">
          {/* Red Lead (+) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded-full bg-rose-600 border border-white inline-block" />
              <span>สายวัดสีแดง (ขั้วบวก + / V-Ω Jack)</span>
            </label>
            <select
              value={redProbeId}
              onChange={(e) => setRedProbeId(e.target.value)}
              className="w-full bg-slate-800 text-white border border-rose-500/50 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-rose-500 cursor-pointer"
            >
              {testPoints.map((tp) => (
                <option key={tp.id} value={tp.id}>
                  {tp.name} ({tp.voltagePotential.toFixed(1)}V)
                </option>
              ))}
            </select>
          </div>

          {/* Black Lead (-) COM */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded-full bg-slate-950 border border-white inline-block" />
              <span>สายวัดสีดำ (ขั้วลบ - / COM Jack)</span>
            </label>
            <select
              value={blackProbeId}
              onChange={(e) => setBlackProbeId(e.target.value)}
              className="w-full bg-slate-800 text-white border border-slate-500/50 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-slate-400 cursor-pointer"
            >
              {testPoints.map((tp) => (
                <option key={tp.id} value={tp.id}>
                  {tp.name} ({tp.voltagePotential.toFixed(1)}V)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ── Vocational Instruction Note ── */}
        <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-700/50 text-[11px] text-amber-950 font-medium space-y-1">
          <div className="font-bold flex items-center gap-1 text-amber-900">
            <HelpCircle className="w-4 h-4 text-amber-800" />
            <span>คำแนะนำมาตรฐานช่างไฟฟ้า (ปวช.):</span>
          </div>
          <p className="leading-relaxed">
            1. การวัดแรงดันตกคร่อมแบตเตอรี่ ต้องต่อแบบ <strong>ขนาน (Parallel)</strong> กับจุดที่ต้องการวัด<br />
            2. สายดำเสียบช่อง <strong>COM</strong> เสมอ และสายแดงเสียบช่อง <strong>V/Ω</strong><br />
            3. หากหน้าจอแสดงเครื่องหมายลบ <strong>(-)</strong> แสดงว่าจิ้มสายวัดสลับขั้วไฟฟ้า
          </p>
        </div>

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs transition cursor-pointer shadow-md"
        >
          กลับสู่โต๊ะทดลอง (Close Meter)
        </button>
      </div>
    </div>
  );
};

