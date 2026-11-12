/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Zap,
  RotateCw,
  Gauge,
  Flame,
  CheckCircle2,
  AlertTriangle,
  Play,
  Pause,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Save,
  HelpCircle,
  ShieldAlert,
  Layers,
  Scale,
  BatteryCharging,
  Clock,
  Undo2,
  RotateCcw,
  Sliders,
  Check,
  Info,
} from 'lucide-react';
import { useGameState } from '../../context/GameStateContext';
import { CircuitWire } from '../../types/game';
import { VoltDialog } from '../common/VoltDialog';
import { DigitalMultimeter, TestPoint } from '../common/DigitalMultimeter';
import { DCMotor3D, BatteryCell3D, KnifeSwitch3D, Wire3DRenderer } from '../circuit3d';

const playTone = (freq: number, type: OscillatorType = 'sine', duration: number = 0.15) => {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch {
    // Ignore audio error
  }
};

interface BatteryPackOption {
  id: string;
  name: string;
  code: string;
  nominalVoltage: number;
  capacityMah: number;
  internalResistance: number;
  description: string;
  isRecommended?: boolean;
}

const AVAILABLE_PACKS: BatteryPackOption[] = [
  {
    id: 'pack_2s2p',
    name: 'ชุดผสม 2S2P (4 ก้อน)',
    code: '2S2P (3.0V 4000mAh)',
    nominalVoltage: 3.0,
    capacityMah: 4000,
    internalResistance: 0.15,
    description: 'ชุดแบตเตอรี่มาตรฐานจากการทดลอง LAB-04 แรงดัน 3.0V ความต้านทานภายในต่ำเพียง 0.15Ω',
    isRecommended: true,
  },
  {
    id: 'pack_2s1p',
    name: 'ชุดอนุกรม 2S1P (2 ก้อน)',
    code: '2S1P (3.0V 2000mAh)',
    nominalVoltage: 3.0,
    capacityMah: 2000,
    internalResistance: 0.30,
    description: 'ชุดอนุกรมจาก LAB-02 แรงดัน 3.0V แต่ความต้านทานภายใน 0.30Ω ทำให้เกิดแรงดันตกคร่อมมากกว่า',
  },
  {
    id: 'pack_1s2p',
    name: 'ชุดแรงดันต่ำ 1S (1.5V)',
    code: '1S2P (1.5V 4000mAh)',
    nominalVoltage: 1.5,
    capacityMah: 4000,
    internalResistance: 0.075,
    description: 'ชุดแรงดัน 1.5V สำหรับทดสอบแรงบิดเริ่มต้นไม่เพียงพอ (Stall Motor Test)',
  },
  {
    id: 'pack_4s1p',
    name: 'ชุดแรงดันเกิน 4S (6.0V)',
    code: '4S1P (6.0V 2000mAh)',
    nominalVoltage: 6.0,
    capacityMah: 2000,
    internalResistance: 0.60,
    description: 'ชุดแรงดัน 6.0V สำหรับทดสอบระบบตัดไฟฉุกเฉินเมื่อเกิด Overvoltage เกินพิกัด 3V',
  },
];

export const MotorTestScreen: React.FC = () => {
  const { state, goToScene, updateBikeSetup, completeMission } = useGameState();

  // Selected battery pack
  const [selectedPackId, setSelectedPackId] = useState<string>('pack_2s2p');
  const selectedPack = useMemo(() => {
    return AVAILABLE_PACKS.find((p) => p.id === selectedPackId) || AVAILABLE_PACKS[0];
  }, [selectedPackId]);

  // Motor testing bench states
  const [isSwitchClosed, setIsSwitchClosed] = useState<boolean>(true);
  const [isMotorRunning, setIsMotorRunning] = useState<boolean>(true);
  const [mechanicalLoadFactor, setMechanicalLoadFactor] = useState<number>(1.0); // 0.5 to 2.0x load

  // Wiring states
  // Default: pack_pos -> motor_pos, pack_neg -> motor_neg
  const [wires, setWires] = useState<CircuitWire[]>([
    { id: 'w_m_pos', fromTerminalId: 'pack_pos', toTerminalId: 'motor_pos', color: '#ef4444' },
    { id: 'w_m_neg', fromTerminalId: 'pack_neg', toTerminalId: 'motor_neg', color: '#3b82f6' },
  ]);
  const [activeTerminalId, setActiveTerminalId] = useState<string | null>(null);
  const [history, setHistory] = useState<CircuitWire[][]>([]);

  // Telemetry accumulation
  const [energyConsumedMah, setEnergyConsumedMah] = useState<number>(0);
  const [testTimeSeconds, setTestTimeSeconds] = useState<number>(0);
  const [rotationAngle, setRotationAngle] = useState<number>(0);

  // Modals & UI toasts
  const [showCompareModal, setShowCompareModal] = useState<boolean>(false);
  const [showHintModal, setShowHintModal] = useState<boolean>(false);
  const [showCelebration, setShowCelebration] = useState<boolean>(false);
  const [showMultimeter, setShowMultimeter] = useState<boolean>(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);

  const workbenchRef = useRef<HTMLDivElement | null>(null);
  const [terminalCoords, setTerminalCoords] = useState<Record<string, { x: number; y: number }>>({});

  // Motor specification constants
  const motorRatedVoltage = 3.0; // V
  const motorWindingResistance = 1.0; // Ohm (R_w)
  const motorKv = 800; // RPM/V (velocity constant)
  const motorKt = 0.012; // Nm/A (torque constant)
  const baseFrictionTorque = 0.007; // Nm
  const breakawayTorque = 0.014; // Nm

  // Graph connection check
  const isDirectShort = useMemo(() => {
    return wires.some(
      (w) =>
        (w.fromTerminalId === 'pack_pos' && w.toTerminalId === 'pack_neg') ||
        (w.fromTerminalId === 'pack_neg' && w.toTerminalId === 'pack_pos') ||
        (w.fromTerminalId === 'motor_pos' && w.toTerminalId === 'motor_neg') ||
        (w.fromTerminalId === 'motor_neg' && w.toTerminalId === 'motor_pos')
    );
  }, [wires]);

  const isConnectedForward = useMemo(() => {
    const hasPos = wires.some(
      (w) =>
        (w.fromTerminalId === 'pack_pos' && w.toTerminalId === 'motor_pos') ||
        (w.fromTerminalId === 'motor_pos' && w.toTerminalId === 'pack_pos')
    );
    const hasNeg = wires.some(
      (w) =>
        (w.fromTerminalId === 'pack_neg' && w.toTerminalId === 'motor_neg') ||
        (w.fromTerminalId === 'motor_neg' && w.toTerminalId === 'pack_neg')
    );
    return hasPos && hasNeg;
  }, [wires]);

  const isConnectedReverse = useMemo(() => {
    const hasPosToNeg = wires.some(
      (w) =>
        (w.fromTerminalId === 'pack_pos' && w.toTerminalId === 'motor_neg') ||
        (w.fromTerminalId === 'motor_neg' && w.toTerminalId === 'pack_pos')
    );
    const hasNegToPos = wires.some(
      (w) =>
        (w.fromTerminalId === 'pack_neg' && w.toTerminalId === 'motor_pos') ||
        (w.fromTerminalId === 'motor_pos' && w.toTerminalId === 'pack_neg')
    );
    return hasPosToNeg && hasNegToPos;
  }, [wires]);

  const isCircuitClosed = (isConnectedForward || isConnectedReverse) && isSwitchClosed && !isDirectShort;

  // Electrical & Mechanical Simulation Equations
  const simulation = useMemo(() => {
    if (!isCircuitClosed || isDirectShort) {
      return {
        rpm: 0,
        terminalVoltage: selectedPack.nominalVoltage,
        currentAmps: isDirectShort ? 25.0 : 0,
        powerWatts: 0,
        backEmf: 0,
        torqueNm: 0,
        isStalled: false,
        isOvervoltage: false,
        isReverse: false,
        statusMessage: isDirectShort
          ? 'อันตราย! เกิดไฟฟ้าลัดวงจรขั้วแบตเตอรี่โดยตรง! กรุณาตัดสายไฟลัดวงจรออกทันที'
          : !isSwitchClosed
          ? 'สวิตช์เปิดอยู่ (OFF): วงจรเปิด กระแสไฟฟ้ายังไม่ไหลเข้าสู่มอเตอร์'
          : 'วงจรยังไม่เชื่อมต่อ: ลากสายไฟเชื่อมระหว่างขั้วบวก/ลบของแบตเตอรี่เข้ากับขั้วมอเตอร์',
        alertType: isDirectShort ? ('danger' as const) : ('normal' as const),
      };
    }

    const Voc = selectedPack.nominalVoltage;
    const Rbat = selectedPack.internalResistance;
    const Rw = motorWindingResistance;
    const isReverse = isConnectedReverse;

    // Overvoltage Protection Check (> 4.5V for a 3V rated motor)
    if (Voc > motorRatedVoltage * 1.5) {
      return {
        rpm: 0,
        terminalVoltage: Voc,
        currentAmps: 0,
        powerWatts: 0,
        backEmf: 0,
        torqueNm: 0,
        isStalled: false,
        isOvervoltage: true,
        isReverse,
        statusMessage: `ระบบตัดไฟฉุกเฉิน (Overvoltage Trip)! แบตเตอรี่ ${Voc.toFixed(1)}V สูงเกินพิกัดมอเตอร์ 3.0V (เกิน 150%) เพื่อป้องกันขดลวดไหม้`,
        alertType: 'danger' as const,
      };
    }

    // Check starting torque vs mechanical load friction
    const totalR = Rw + Rbat;
    const stallCurrent = Voc / totalR;
    const stallTorque = stallCurrent * motorKt;
    const requiredBreakaway = breakawayTorque * mechanicalLoadFactor;

    // If starting torque is insufficient (e.g. 1.5V pack with heavy friction load)
    if (stallTorque < requiredBreakaway) {
      const vTerm = Voc - stallCurrent * Rbat;
      return {
        rpm: 0,
        terminalVoltage: Number(vTerm.toFixed(2)),
        currentAmps: Number(stallCurrent.toFixed(2)),
        powerWatts: Number((vTerm * stallCurrent).toFixed(2)),
        backEmf: 0,
        torqueNm: Number(stallTorque.toFixed(3)),
        isStalled: true,
        isOvervoltage: false,
        isReverse,
        statusMessage: `แรงดัน ${Voc.toFixed(1)}V ต่ำเกินไป! แรงบิดเริ่มต้น (${(stallTorque * 1000).toFixed(1)} mNm) ไม่พอที่จะเอาชนะแรงเสียดทานของโหลด (${(requiredBreakaway * 1000).toFixed(1)} mNm) มอเตอร์ติดค้าง (Stall) ที่ 0 RPM และกินกระแสสูงสะสมความร้อน!`,
        alertType: 'warning' as const,
      };
    }

    // Steady State Running Calculation:
    // Torque balance: T_motor = Kt * I = T_load
    const runLoadTorque = baseFrictionTorque * mechanicalLoadFactor;
    const iLoad = runLoadTorque / motorKt + 0.12; // load current + no-load eddy losses
    const currentAmps = Number(Math.min(stallCurrent, Math.max(0.2, iLoad)).toFixed(2));

    // Terminal voltage with battery internal resistance voltage sag
    const vTerm = Math.max(0, Voc - currentAmps * Rbat);

    // Back EMF: E_b = V_term - I * R_w
    const backEmf = Math.max(0, vTerm - currentAmps * Rw);

    // RPM = Back EMF * Kv
    const steadyRpm = Math.round(backEmf * motorKv);
    const powerWatts = Number((vTerm * currentAmps).toFixed(2));
    const torqueNm = Number((currentAmps * motorKt).toFixed(3));

    let statusMessage = `มอเตอร์หมุนทำงานเสถียรที่ ${steadyRpm.toLocaleString()} RPM กำลังไฟ ${powerWatts}W`;
    if (isReverse) {
      statusMessage += ' (หมุนทวนเข็มนาฬิกา - ต่อสลับขั้ว)';
    } else if (selectedPack.id === 'pack_2s2p') {
      statusMessage += ' [แพ็ก 2S2P มีความต้านทานภายในต่ำเพียง 0.15Ω ทำให้แรงดันตกคร่อมน้อย มอเตอร์จึงหมุนได้เร็วกว่า 2S1P]';
    }

    return {
      rpm: steadyRpm,
      terminalVoltage: Number(vTerm.toFixed(2)),
      currentAmps,
      powerWatts,
      backEmf: Number(backEmf.toFixed(2)),
      torqueNm,
      isStalled: false,
      isOvervoltage: false,
      isReverse,
      statusMessage,
      alertType: 'success' as const,
    };
  }, [
    isCircuitClosed,
    isDirectShort,
    isSwitchClosed,
    isConnectedReverse,
    selectedPack,
    mechanicalLoadFactor,
  ]);

  // Vocational Electrical Metrics (สมรรถนะ ปวช.)
  const voltageSag = Math.max(0, selectedPack.nominalVoltage - simulation.terminalVoltage);
  const cRate = Number((simulation.currentAmps / (selectedPack.capacityMah / 1000)).toFixed(2));
  const heatLossWatts = Number((Math.pow(simulation.currentAmps, 2) * selectedPack.internalResistance).toFixed(2));

  const testPoints: TestPoint[] = useMemo(() => {
    const voc = selectedPack.nominalVoltage;
    const vTerm = simulation.terminalVoltage;
    const eb = simulation.backEmf;
    return [
      { id: 'tp_pack_oc', name: `แรงดันเปิดวงจรแบตเตอรี่ Voc (${voc.toFixed(1)}V)`, voltagePotential: voc },
      { id: 'tp_motor_pos', name: `ขั้วบวกมอเตอร์ขณะมีโหลด (${vTerm.toFixed(2)}V)`, voltagePotential: vTerm },
      { id: 'tp_back_emf', name: `แรงเคลื่อนไฟฟ้าย้อนกลับ Back-EMF (${eb.toFixed(2)}V)`, voltagePotential: eb },
      { id: 'tp_ground', name: 'ขั้วลบกราวด์ 0V', voltagePotential: 0.0, isGround: true },
    ];
  }, [selectedPack, simulation]);

  // Terminal Metadata
  const terminalMeta: Record<string, { label: string; componentName: string; color: string }> = {
    pack_pos: {
      label: 'ขั้วบวก (+)',
      componentName: `ชุดแบตเตอรี่ (${selectedPack.code})`,
      color: 'bg-rose-500 text-white border-rose-300 ring-rose-500/50',
    },
    pack_neg: {
      label: 'ขั้วลบ (-)',
      componentName: `ชุดแบตเตอรี่ (${selectedPack.code})`,
      color: 'bg-blue-500 text-white border-blue-300 ring-blue-500/50',
    },
    motor_pos: {
      label: 'ขั้วบวก (+)',
      componentName: 'มอเตอร์ DC 3V',
      color: 'bg-rose-600 text-white border-rose-300 ring-rose-500/50',
    },
    motor_neg: {
      label: 'ขั้วลบ (-)',
      componentName: 'มอเตอร์ DC 3V',
      color: 'bg-blue-600 text-white border-blue-300 ring-blue-500/50',
    },
  };

  const updateTerminalPositions = () => {
    if (!workbenchRef.current) return;
    const wbRect = workbenchRef.current.getBoundingClientRect();
    const newCoords: Record<string, { x: number; y: number }> = {};

    Object.keys(terminalMeta).forEach((tId) => {
      const el = document.getElementById(`dyno-term-${tId}`);
      if (el) {
        const rect = el.getBoundingClientRect();
        newCoords[tId] = {
          x: rect.left - wbRect.left + rect.width / 2,
          y: rect.top - wbRect.top + rect.height / 2,
        };
      }
    });

    setTerminalCoords(newCoords);
  };

  useEffect(() => {
    updateTerminalPositions();
    window.addEventListener('resize', updateTerminalPositions);
    const timer = setTimeout(updateTerminalPositions, 200);
    return () => {
      window.removeEventListener('resize', updateTerminalPositions);
      clearTimeout(timer);
    };
  }, [wires, selectedPackId]);

  // Shaft rotation animation loop & energy consumption tracking
  useEffect(() => {
    if (!isMotorRunning || simulation.rpm === 0) return;

    const interval = setInterval(() => {
      // Rotation angle
      const deltaDeg = (simulation.rpm / 60) * 360 * 0.05 * (simulation.isReverse ? -1 : 1);
      setRotationAngle((prev) => (prev + deltaDeg) % 360);

      // Energy consumption (0.05s tick)
      // mAh = (current Amps * 1000 * hours)
      const deltaMah = (simulation.currentAmps * 1000 * 0.05) / 3600;
      setEnergyConsumedMah((prev) => prev + deltaMah);
      setTestTimeSeconds((prev) => Number((prev + 0.05).toFixed(1)));
    }, 50);

    return () => clearInterval(interval);
  }, [isMotorRunning, simulation.rpm, simulation.currentAmps, simulation.isReverse]);

  const handleTerminalClick = (terminalId: string) => {
    playTone(520, 'sine', 0.08);

    if (!activeTerminalId) {
      setActiveTerminalId(terminalId);
      return;
    }

    if (activeTerminalId === terminalId) {
      setActiveTerminalId(null);
      return;
    }

    const wireExists = wires.some(
      (w) =>
        (w.fromTerminalId === activeTerminalId && w.toTerminalId === terminalId) ||
        (w.fromTerminalId === terminalId && w.toTerminalId === activeTerminalId)
    );

    if (wireExists) {
      playTone(280, 'square', 0.15);
      setActiveTerminalId(null);
      return;
    }

    setHistory((prev) => [...prev, [...wires]]);

    let wireColor = '#10b981';
    if (activeTerminalId.includes('pos') || terminalId.includes('pos')) wireColor = '#ef4444';
    if (activeTerminalId.includes('neg') || terminalId.includes('neg')) wireColor = '#3b82f6';

    const newWire: CircuitWire = {
      id: `w_dyno_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      fromTerminalId: activeTerminalId,
      toTerminalId: terminalId,
      color: wireColor,
    };

    setWires((prev) => [...prev, newWire]);
    setActiveTerminalId(null);
    playTone(660, 'triangle', 0.12);
  };

  const removeWire = (wireId: string) => {
    playTone(330, 'square', 0.1);
    setHistory((prev) => [...prev, [...wires]]);
    setWires((prev) => prev.filter((w) => w.id !== wireId));
  };

  const handleQuickConnect = () => {
    playTone(600, 'triangle', 0.12);
    setHistory((prev) => [...prev, [...wires]]);
    setWires([
      { id: 'w_m_pos', fromTerminalId: 'pack_pos', toTerminalId: 'motor_pos', color: '#ef4444' },
      { id: 'w_m_neg', fromTerminalId: 'pack_neg', toTerminalId: 'motor_neg', color: '#3b82f6' },
    ]);
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    playTone(400, 'sine', 0.1);
    const prev = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setWires(prev);
    setActiveTerminalId(null);
  };

  const handleResetWires = () => {
    playTone(300, 'sawtooth', 0.15);
    setHistory((prev) => [...prev, [...wires]]);
    setWires([]);
    setActiveTerminalId(null);
  };

  const handleToggleSwitch = () => {
    playTone(isSwitchClosed ? 350 : 700, 'square', 0.1);
    setIsSwitchClosed((prev) => !prev);
  };

  const handleSaveTest = () => {
    if (simulation.rpm === 0 && !simulation.isOvervoltage) {
      playTone(280, 'square', 0.2);
      setSaveToast('คำเตือน: มอเตอร์ยังไม่หมุนทำงาน กรุณาต่อวงจรและสับสวิตช์ลง');
      setTimeout(() => setSaveToast(null), 3000);
      return;
    }

    if (simulation.isOvervoltage) {
      playTone(200, 'sawtooth', 0.3);
      setSaveToast('ไม่สามารถบันทึกได้เนื่องจากแรงดันเกินพิกัด มอเตอร์เสี่ยงชำรุด!');
      setTimeout(() => setSaveToast(null), 3000);
      return;
    }

    playTone(600, 'sine', 0.15);
    updateBikeSetup({
      motorId: 'dc_3v_tuned',
      motorName: `DC Motor 3V (${simulation.rpm} RPM)`,
      motorRatedVoltage: 3.0,
      motorMaxRpm: simulation.rpm,
      motorType: 'tuned_dc_brushed',
      maxRpm: simulation.rpm,
    });

    completeMission('m5', 100);
    completeMission('mission_5', 100);
    setSaveToast(`บันทึกผลการทดสอบมอเตอร์ (${simulation.rpm} RPM) เข้าสู่ระบบเรียบร้อยแล้ว!`);
    setTimeout(() => setSaveToast(null), 3500);
  };

  const handleContinueToGarage = () => {
    handleSaveTest();
    goToScene('bike_garage');
  };

  // Tachometer gauge angle (-110 deg to +110 deg)
  const maxDisplayRpm = 3000;
  const tachAngle = Math.min(110, Math.max(-110, (simulation.rpm / maxDisplayRpm) * 220 - 110));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-sky-50 to-indigo-50/40 text-slate-800 flex flex-col font-sans select-none pb-12">
      {/* Top Header */}
      <div className="bg-white/95 border-b border-slate-200/90 shadow-sm px-4 py-3 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button
            onClick={() => goToScene('mission_map')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 transition active:scale-95 min-h-[40px] cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-emerald-600" />
            <span>แผนที่ภารกิจ</span>
          </button>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-sm text-white shadow-sm">
              05
            </div>
            <div>
              <h1 className="text-sm md:text-base font-black text-slate-900 flex items-center gap-2">
                <span>LAB-05: แท่นทดสอบมอเตอร์ไฟฟ้ากระแสตรง (DC Motor Dyno Test Bench)</span>
                <span className="text-[10px] font-bold bg-cyan-100 text-cyan-800 px-2 py-0.5 rounded-full border border-cyan-200">
                  ฉากที่ 10
                </span>
              </h1>
              <p className="text-[11px] text-slate-500">
                ทดสอบมอเตอร์ DC พิกัด 3.0V ด้วยทาโคมิเตอร์จำลอง แอมมิเตอร์ และสมการ Back EMF ใต้โหลดเชิงกล
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleUndo}
            disabled={history.length === 0}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 disabled:opacity-40 text-slate-700 text-xs font-semibold border border-slate-200 transition min-h-[38px] cursor-pointer"
            title="ย้อนกลับการกระทำล่าสุด"
          >
            <Undo2 className="w-3.5 h-3.5 text-indigo-600" />
            <span className="hidden sm:inline">ย้อนกลับ</span>
          </button>

          <button
            onClick={handleResetWires}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-700 hover:text-rose-700 text-xs font-semibold border border-slate-200 hover:border-rose-300 transition min-h-[38px] cursor-pointer"
            title="ลบสายไฟทั้งหมด"
          >
            <RotateCcw className="w-3.5 h-3.5 text-rose-500" />
            <span className="hidden sm:inline">รีเซ็ตสาย</span>
          </button>

          <button
            type="button"
            onClick={() => setShowMultimeter(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold border border-amber-200 transition min-h-[38px] cursor-pointer shadow-sm"
            title="เปิดมัลติมิเตอร์วัดแรงดัน"
          >
            <span>🎛️ มัลติมิเตอร์ (DMM)</span>
          </button>

          <button
            onClick={() => setShowCompareModal(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 text-xs font-bold border border-purple-200 transition min-h-[38px] cursor-pointer"
          >
            <Scale className="w-3.5 h-3.5 text-purple-600" />
            <span>เปรียบเทียบ 2S1P vs 2S2P</span>
          </button>

          <button
            onClick={() => setShowHintModal(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 transition min-h-[38px] cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5 text-amber-500" />
            <span>คำใบ้</span>
          </button>

          <button
            onClick={handleSaveTest}
            className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200 transition min-h-[38px] cursor-pointer"
          >
            <Save className="w-3.5 h-3.5 text-emerald-600" />
            <span>บันทึกผลทดสอบ</span>
          </button>

          <button
            onClick={handleContinueToGarage}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 via-teal-600 to-emerald-600 hover:brightness-105 text-white text-xs font-black shadow-md shadow-cyan-600/20 active:scale-95 transition min-h-[38px] cursor-pointer"
          >
            <span>ต่อไปยังโรงเก็บจักรยาน</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 p-4 max-w-7xl mx-auto w-full">
        {/* Left Column: Interactive Dyno Test Bench (8 Cols) */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <div
            ref={workbenchRef}
            className="relative flex-1 min-h-[500px] rounded-3xl bg-white/95 border border-slate-200/90 p-4 md:p-6 shadow-sm flex flex-col justify-between overflow-hidden"
          >
            {/* Grid Pattern Background */}
            <div
              className="absolute inset-0 opacity-15 pointer-events-none"
              style={{
                backgroundImage:
                  'radial-gradient(circle at 10px 10px, #0891b2 1.5px, transparent 0)',
                backgroundSize: '24px 24px',
              }}
            />

            {/* Instruction Banner */}
            <div className="relative z-10 flex flex-wrap items-center justify-between bg-white/90 border border-slate-200/90 rounded-xl px-4 py-2.5 shadow-sm backdrop-blur-md gap-2">
              <div className="flex items-center gap-2 text-xs">
                <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
                <span className="text-slate-700">
                  {activeTerminalId ? (
                    <span className="text-amber-800 font-bold">
                      เลือกขั้วปลายทาง (กำลังเชื่อมจาก: {terminalMeta[activeTerminalId]?.componentName} {terminalMeta[activeTerminalId]?.label})
                    </span>
                  ) : (
                    'เชื่อมต่อขั้วแบตเตอรี่เข้ากับขั้วมอเตอร์ DC 3V แล้วสับสวิตช์ลงเพื่อเริ่มทดสอบ'
                  )}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleQuickConnect}
                  className="px-2.5 py-1 rounded-lg bg-cyan-50 hover:bg-cyan-100 text-[11px] font-bold text-cyan-800 border border-cyan-200 transition cursor-pointer shadow-sm"
                >
                  ⚡ ต่อสายด่วน
                </button>
                <span className="text-[11px] text-cyan-800 font-mono font-bold bg-cyan-50 px-2 py-0.5 rounded-md border border-cyan-200">
                  สายไฟ: {wires.length} เส้น
                </span>
              </div>
            </div>

            {/* 3D Wire & Connectors Overlay */}
            <Wire3DRenderer
              wires={wires}
              terminalCoords={terminalCoords}
              isEnergized={simulation.rpm > 0}
              isShortCircuit={isDirectShort}
              onRemoveWire={removeWire}
            />

            {/* Test Bench Component Area */}
            <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-5 my-auto pt-2 items-center">
              {/* Left Side: Selectable Battery Pack Unit (5 Cols) */}
              <div className="md:col-span-5 bg-slate-50/90 border border-slate-200/90 rounded-2xl p-4 shadow-inner flex flex-col gap-3">
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                  <span className="text-xs font-black text-amber-800 flex items-center gap-1.5 uppercase">
                    <BatteryCharging className="w-4 h-4 text-amber-600" />
                    ชุดแบตเตอรี่จ่ายไฟ (Selected Battery Pack)
                  </span>
                </div>

                {/* Battery Pack Selector Buttons */}
                <div className="flex flex-col gap-1.5">
                  {AVAILABLE_PACKS.map((pack) => {
                    const isSelected = selectedPackId === pack.id;
                    return (
                      <button
                        key={pack.id}
                        onClick={() => {
                          playTone(550, 'sine', 0.08);
                          setSelectedPackId(pack.id);
                        }}
                        className={`p-2 rounded-xl border text-left text-xs transition-all flex items-center justify-between cursor-pointer ${
                          isSelected
                            ? 'bg-amber-50 border-amber-400 text-amber-950 font-bold shadow-sm ring-1 ring-amber-300'
                            : 'bg-white border-slate-200/90 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                        }`}
                      >
                        <div>
                          <div className="font-bold flex items-center gap-1.5">
                            <span>{pack.code}</span>
                            {pack.isRecommended && (
                              <span className="text-[9px] bg-emerald-100 text-emerald-800 border border-emerald-200 px-1.5 py-0.2 rounded font-mono font-bold">
                                แนะนำ
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500">R_in: {pack.internalResistance}Ω</div>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-amber-600 shrink-0" />}
                      </button>
                    );
                  })}
                </div>

                {/* 3D Battery Pack Preview */}
                <div className="w-full bg-white rounded-xl border border-slate-200/90 p-1.5 shadow-sm">
                  <BatteryCell3D
                    voltage={selectedPack.nominalVoltage}
                    label={selectedPack.code}
                    isActive={simulation.rpm > 0}
                    size="sm"
                  />
                </div>

                {/* Battery Pack Output Terminals */}
                <div className="bg-white p-3 rounded-xl border border-slate-200/90 flex items-center justify-between mt-1 shadow-sm">
                  <div className="flex flex-col items-center gap-1">
                    <button
                      id="dyno-term-pack_pos"
                      onClick={() => handleTerminalClick('pack_pos')}
                      className={`w-10 h-10 rounded-full bg-rose-600 text-white font-bold text-sm ring-4 transition-all shadow-sm ${
                        activeTerminalId === 'pack_pos'
                          ? 'ring-cyan-400 scale-110'
                          : 'ring-rose-200 hover:ring-rose-300'
                      }`}
                    >
                      +
                    </button>
                    <span className="text-[10px] text-rose-700 font-bold">PACK (+)</span>
                  </div>

                  <div className="text-center">
                    <span className="text-xs font-mono font-bold text-slate-800 block">
                      {selectedPack.nominalVoltage.toFixed(1)}V
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {selectedPack.capacityMah} mAh (R_in: {selectedPack.internalResistance}Ω)
                    </span>
                  </div>

                  <div className="flex flex-col items-center gap-1">
                    <button
                      id="dyno-term-pack_neg"
                      onClick={() => handleTerminalClick('pack_neg')}
                      className={`w-10 h-10 rounded-full bg-blue-600 text-white font-bold text-sm ring-4 transition-all shadow-sm ${
                        activeTerminalId === 'pack_neg'
                          ? 'ring-cyan-400 scale-110'
                          : 'ring-blue-200 hover:ring-blue-300'
                      }`}
                    >
                      -
                    </button>
                    <span className="text-[10px] text-blue-700 font-bold">PACK (-)</span>
                  </div>
                </div>
              </div>

              {/* Middle: 3D Knife Switch Control (2 Cols) */}
              <div className="md:col-span-2 flex flex-col items-center justify-center">
                <div className="bg-slate-50/90 border border-slate-200/90 rounded-2xl p-2.5 shadow-inner flex flex-col items-center text-center w-full">
                  <span className="text-[10px] font-bold text-slate-700 mb-1">สวิตช์ไดโน 3 มิติ</span>
                  <div className="w-full">
                    <KnifeSwitch3D
                      isClosed={isSwitchClosed}
                      isActive={simulation.rpm > 0}
                      isShortCircuit={isDirectShort}
                      size="sm"
                      onToggle={handleToggleSwitch}
                    />
                  </div>
                </div>
              </div>

              {/* Right Side: DC Motor Rated 3V & Rotating Shaft (5 Cols) */}
              <div className="md:col-span-5 bg-slate-50/90 border border-slate-200/90 rounded-2xl p-4 shadow-inner flex flex-col items-center justify-between">
                <div className="w-full flex items-center justify-between border-b border-slate-200/80 pb-2 mb-2">
                  <span className="text-xs font-black text-cyan-800 flex items-center gap-1.5 uppercase">
                    <Gauge className="w-4 h-4 text-cyan-600" />
                    มอเตอร์ไฟฟ้า DC ไฮทอร์ก 3 มิติ (DC 130 Racing)
                  </span>
                  <span className="text-[9px] font-mono bg-cyan-100 text-cyan-800 px-2 py-0.5 rounded-full border border-cyan-200 font-bold">
                    Rw = 1.0Ω | Kv = 800
                  </span>
                </div>

                {/* 3D High-Detail DC Motor with live RPM & Spinning Pinion Gear */}
                <div className="w-full my-1">
                  <DCMotor3D
                    rpm={simulation.rpm}
                    isRunning={simulation.rpm > 0}
                    voltage={simulation.terminalVoltage}
                    hasFan={true}
                    size="md"
                  />
                </div>

                {/* Motor Terminals */}
                <div className="w-full flex items-center justify-between px-3 pt-2 border-t border-slate-200/80">
                  <div className="flex flex-col items-center gap-1">
                    <button
                      id="dyno-term-motor_pos"
                      onClick={() => handleTerminalClick('motor_pos')}
                      className={`w-9 h-9 rounded-full bg-rose-600 text-white font-bold text-xs ring-4 transition-all shadow-sm ${
                        activeTerminalId === 'motor_pos'
                          ? 'ring-cyan-400 scale-110'
                          : 'ring-rose-200 hover:ring-rose-300'
                      }`}
                    >
                      +
                    </button>
                    <span className="text-[10px] text-rose-700 font-bold">MOTOR (+)</span>
                  </div>

                  <span className="text-[10px] text-slate-500 font-mono">ขั้วมอเตอร์ DC</span>

                  <div className="flex flex-col items-center gap-1">
                    <button
                      id="dyno-term-motor_neg"
                      onClick={() => handleTerminalClick('motor_neg')}
                      className={`w-9 h-9 rounded-full bg-blue-600 text-white font-bold text-xs ring-4 transition-all shadow-sm ${
                        activeTerminalId === 'motor_neg'
                          ? 'ring-cyan-400 scale-110'
                          : 'ring-blue-200 hover:ring-blue-300'
                      }`}
                    >
                      -
                    </button>
                    <span className="text-[10px] text-blue-700 font-bold">MOTOR (-)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Live Safety Feedback Bar */}
            <div
              className={`relative z-10 mt-3 p-3 rounded-2xl border flex items-center gap-3 transition-colors shadow-sm ${
                simulation.alertType === 'danger'
                  ? 'bg-rose-50 border-rose-200 text-rose-800'
                  : simulation.alertType === 'warning'
                  ? 'bg-amber-50 border-amber-200 text-amber-800'
                  : simulation.alertType === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-white border-slate-200 text-slate-700'
              }`}
            >
              {simulation.alertType === 'danger' ? (
                <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
              ) : simulation.alertType === 'warning' ? (
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              ) : simulation.alertType === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <Info className="w-5 h-5 text-cyan-600 shrink-0" />
              )}
              <div className="text-xs">
                <span className="font-bold mr-1">สถานะไดนาโมมิเตอร์:</span>
                <span>{simulation.statusMessage}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Simulated Tachometer, Ammeter & Scientific Readouts (4 Cols) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          {/* Simulated Analog / Digital Tachometer */}
          <div className="bg-white/95 border border-slate-200/90 rounded-3xl p-4 shadow-sm flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-xs font-black text-cyan-800 flex items-center gap-1.5 uppercase">
                <Gauge className="w-4 h-4 text-cyan-600" />
                ทาโคมิเตอร์จำลอง (Simulated Tachometer)
              </span>
              <span className="text-[10px] font-mono font-bold text-cyan-800 bg-cyan-50 border border-cyan-200 px-2 py-0.5 rounded-full">
                0 - 3,000 RPM
              </span>
            </div>

            {/* Tachometer Visual Dial */}
            <div className="h-32 bg-slate-50 rounded-2xl border border-slate-200/90 relative flex flex-col items-center justify-end pb-3 overflow-hidden shadow-inner">
              {/* Dial Arc */}
              <svg viewBox="0 0 200 110" className="w-48 h-28">
                {/* Safe zone arc */}
                <path
                  d="M 25 100 A 75 75 0 0 1 175 100"
                  fill="none"
                  stroke="#e2e8f0"
                  strokeWidth="12"
                  strokeLinecap="round"
                />
                <path
                  d="M 40 85 A 75 75 0 0 1 140 40"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="6"
                  strokeLinecap="round"
                />
                <path
                  d="M 140 40 A 75 75 0 0 1 175 100"
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="6"
                  strokeLinecap="round"
                />
                {/* Center Hub */}
                <circle cx="100" cy="100" r="10" fill="#0284c7" stroke="#38bdf8" strokeWidth="2" />
                {/* Needle */}
                <line
                  x1="100"
                  y1="100"
                  x2="100"
                  y2="30"
                  stroke="#d97706"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  style={{
                    transformOrigin: '100px 100px',
                    transform: `rotate(${tachAngle}deg)`,
                    transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  }}
                />
              </svg>

              <div className="absolute bottom-2 text-center">
                <span className="text-xl font-black font-mono text-cyan-950">
                  {simulation.rpm.toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-500 block -mt-0.5 font-semibold">RPM (รอบต่อนาที)</span>
              </div>
            </div>

            {/* Electrical Telemetry Parameters (Voltmeter, Ammeter, Wattmeter) */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-amber-50/70 p-2.5 rounded-xl border border-amber-200/80">
                <span className="text-amber-700 block text-[10px] font-semibold">โวลต์มิเตอร์ (V_term)</span>
                <span className="font-mono font-black text-amber-900 text-base">
                  {simulation.terminalVoltage.toFixed(2)} V
                </span>
                <span className="text-[9px] text-amber-600 block">แรงดันตกคร่อมใต้โหลด</span>
              </div>

              <div className="bg-cyan-50/70 p-2.5 rounded-xl border border-cyan-200/80">
                <span className="text-cyan-700 block text-[10px] font-semibold">แอมมิเตอร์ (Current I)</span>
                <span className="font-mono font-black text-cyan-900 text-base">
                  {simulation.currentAmps.toFixed(2)} A
                </span>
                <span className="text-[9px] text-cyan-600 block">กระแสขดลวดมอเตอร์</span>
              </div>

              <div className="bg-purple-50/70 p-2.5 rounded-xl border border-purple-200/80">
                <span className="text-purple-700 block text-[10px] font-semibold">กำลังไฟฟ้า (Power P_in)</span>
                <span className="font-mono font-black text-purple-900 text-base">
                  {simulation.powerWatts.toFixed(2)} W
                </span>
                <span className="text-[9px] text-purple-600 block">V_term × I</span>
              </div>

              <div className="bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-200/80">
                <span className="text-emerald-700 block text-[10px] font-semibold">แรงเคลื่อนย้อนกลับ (Back EMF)</span>
                <span className="font-mono font-black text-emerald-900 text-base">
                  {simulation.backEmf.toFixed(2)} V
                </span>
                <span className="text-[9px] text-emerald-600 block">Eb = V_term - I×Rw</span>
              </div>

              {/* Vocational Battery Electrical Metrics (มาตรฐานช่าง ปวช.) */}
              <div className="bg-slate-50/90 p-2.5 rounded-2xl border border-slate-200/90 col-span-2 space-y-1.5 shadow-inner">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-800">
                  <span>⚡ สมรรถนะแบตเตอรี่ช่างไฟฟ้า (Battery Analysis)</span>
                  <span className="font-mono text-[10px] font-bold bg-white px-2 py-0.5 rounded-md border border-slate-200 text-slate-700">
                    Ri = {selectedPack.internalResistance}Ω
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1.5 text-[10px] font-mono text-center">
                  <div className="bg-white p-1.5 rounded-xl border border-slate-200/90 shadow-sm">
                    <span className="text-slate-500 block text-[9px] font-semibold">แรงดันตก Sag</span>
                    <span className="font-black text-rose-600">-{voltageSag.toFixed(2)} V</span>
                  </div>
                  <div className="bg-white p-1.5 rounded-xl border border-slate-200/90 shadow-sm">
                    <span className="text-slate-500 block text-[9px] font-semibold">อัตรา C-Rate</span>
                    <span className="font-black text-cyan-700">{cRate} C</span>
                  </div>
                  <div className="bg-white p-1.5 rounded-xl border border-slate-200/90 shadow-sm">
                    <span className="text-slate-500 block text-[9px] font-semibold">ความร้อน I²Ri</span>
                    <span className="font-black text-amber-700">{heatLossWatts} W</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50/90 p-2.5 rounded-xl border border-slate-200/90 col-span-2 flex items-center justify-between">
                <div>
                  <span className="text-slate-500 block text-[10px] font-semibold">พลังงานสะสมที่ใช้ไป</span>
                  <span className="font-mono font-bold text-slate-800 text-sm">
                    {energyConsumedMah.toFixed(1)} mAh (เวลา: {testTimeSeconds} วิ)
                  </span>
                </div>
                <div className="text-right text-[10px] text-slate-500 font-mono">
                  <span>เหลือ ~{Math.max(0, Math.round(selectedPack.capacityMah - energyConsumedMah))} mAh</span>
                </div>
              </div>
            </div>

            {/* Mechanical Load Friction Slider */}
            <div className="bg-slate-50/90 p-3 rounded-2xl border border-slate-200/90 flex flex-col gap-1.5 shadow-inner">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-700">โหลดเชิงกล / แรงเสียดทาน: {mechanicalLoadFactor.toFixed(1)}x</span>
                <span className="text-[10px] font-mono font-bold text-cyan-800 bg-cyan-50 px-2 py-0.5 rounded-md border border-cyan-200">
                  แรงบิด: {(simulation.torqueNm * 1000).toFixed(1)} mNm
                </span>
              </div>
              <input
                type="range"
                min="0.5"
                max="2.5"
                step="0.1"
                value={mechanicalLoadFactor}
                onChange={(e) => setMechanicalLoadFactor(Number(e.target.value))}
                className="w-full accent-cyan-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
              />
              <span className="text-[9px] text-slate-500">
                ปรับแรงต้านทานของลูกปืนและน้ำหนักเพื่อทดสอบสมรรถนะของมอเตอร์ภายใต้ภาระจริง
              </span>
            </div>
          </div>

          {/* VOLT Tutor */}
          <VoltDialog
            mood={
              simulation.isOvervoltage
                ? 'alarm'
                : simulation.isStalled
                ? 'warning'
                : simulation.rpm > 0
                ? 'celebrate'
                : 'thinking'
            }
            message={
              simulation.isOvervoltage
                ? 'แรงดันสูงเกินไปครับ! มอเตอร์นี้รับได้สูงสุด 3.0V หากใช้ 6.0V ขดลวดจะไหม้ ระบบจึงตัดไฟฉุกเฉินครับ'
                : simulation.isStalled
                ? 'เห็นไหมครับ? แรงดัน 1.5V ให้แรงบิดเริ่มต้นไม่พอ มอเตอร์จึงติดค้าง (Stall) ทำให้กระแสค้างที่ 1.3A และเกิดความร้อนสูงสะสม ต้องใช้ชุด 3.0V (2S1P หรือ 2S2P) ครับ!'
                : simulation.rpm > 0
                ? `ความเร็วรอบ ${simulation.rpm.toLocaleString()} RPM สมบูรณ์แบบมากครับ! แพ็ก 2S2P มีความต้านทานภายในต่ำเพียง 0.15Ω ทำให้ได้รอบสูงและวิ่งได้ยาวนานครับ!`
                : 'ลากสายไฟเชื่อมขั้วบวก/ลบของแบตเตอรี่เข้าขั้วมอเตอร์ แล้วสับสวิตช์ลงเพื่อเริ่มทดสอบครับ'
            }
          />
        </div>
      </div>

      {/* Comparison Modal (2S1P vs 2S2P) */}
      {showCompareModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-purple-600" />
                <h3 className="font-black text-sm text-slate-800">
                  เปรียบเทียบขับมอเตอร์ 3V: แพ็ก 2S1P vs แพ็ก 2S2P
                </h3>
              </div>
              <button
                onClick={() => setShowCompareModal(false)}
                className="text-slate-500 hover:text-slate-800 text-xs px-2.5 py-1 rounded-xl bg-slate-100 border border-slate-200 cursor-pointer"
              >
                ปิด
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              {/* 2S1P */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 flex flex-col gap-2">
                <span className="font-bold text-indigo-900">แบบ 2S1P (อนุกรม 2 ก้อน)</span>
                <div className="text-[11px] text-slate-600 space-y-1">
                  <div>ความต้านทานภายใน: <span className="font-mono font-bold text-amber-700">0.30 Ω</span></div>
                  <div>แรงดันตกคร่อมใต้โหลด: <span className="font-mono font-bold text-cyan-700">~2.79 V</span></div>
                  <div>ความเร็วรอบ: <span className="font-mono font-bold text-slate-800">~1,670 RPM</span></div>
                  <div>ความจุ: <span className="font-mono font-bold text-purple-700">2,000 mAh</span></div>
                  <div>ระยะเวลาวิ่งต่อเนื่อง: <span className="text-amber-700 font-bold">~2.8 ชั่วโมง</span></div>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  เนื่องจากความต้านทานภายในสูงกว่า แรงดันจึงตกลงมากกว่า ทำให้รอบตกและหมดเร็วกว่า
                </p>
              </div>

              {/* 2S2P */}
              <div className="bg-emerald-50/70 p-3.5 rounded-2xl border-2 border-emerald-400 flex flex-col gap-2">
                <span className="font-bold text-emerald-950">แบบ 2S2P (ชุดผสม 4 ก้อน) 🔥</span>
                <div className="text-[11px] text-emerald-900 space-y-1">
                  <div>ความต้านทานภายใน: <span className="font-mono text-emerald-700 font-bold">0.15 Ω (ต่ำกว่าครึ่ง!)</span></div>
                  <div>แรงดันตกคร่อมใต้โหลด: <span className="font-mono text-cyan-700 font-bold">~2.90 V (เสถียรกว่า)</span></div>
                  <div>ความเร็วรอบ: <span className="font-mono text-emerald-700 font-bold">~1,760 RPM (+90 RPM!)</span></div>
                  <div>ความจุ: <span className="font-mono text-purple-700 font-bold">4,000 mAh (2 เท่า!)</span></div>
                  <div>ระยะเวลาวิ่งต่อเนื่อง: <span className="text-emerald-700 font-bold">~5.7 ชั่วโมง (นาน 2 เท่า!)</span></div>
                </div>
                <p className="text-[10px] text-emerald-700 mt-1">
                  การขนานช่วยลดความต้านทานภายในลงครึ่งหนึ่ง ทำให้แรงดันไม่ตก มอเตอร์หมุนเร็วกว่าและวิ่งได้นานขึ้นเท่าตัว!
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowCompareModal(false)}
              className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-sm transition cursor-pointer"
            >
              เข้าใจแล้ว
            </button>
          </div>
        </div>
      )}

      {/* Hint Modal */}
      {showHintModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-2 text-amber-800 font-black text-sm">
              <HelpCircle className="w-5 h-5 text-amber-600" />
              <span>คำใบ้จากหุ่นยนต์ VOLT</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              1. เลือกชุดแบตเตอรี่ <strong>2S2P (3.0V 4000mAh)</strong> เพื่อให้ได้สมรรถนะสูงสุดและเสถียรที่สุด<br />
              2. ลากสายไฟเชื่อมจาก <strong>PACK (+)</strong> ไปยัง <strong>MOTOR (+)</strong><br />
              3. ลากสายไฟเชื่อมจาก <strong>PACK (-)</strong> ไปยัง <strong>MOTOR (-)</strong><br />
              4. สับสวิตช์ลง (ON) เพื่อเริ่มการทดสอบ จากนั้นกดปุ่ม <strong>"บันทึกผลทดสอบ"</strong> เพื่อผ่านด่านครับ!
            </p>
            <button
              onClick={() => setShowHintModal(false)}
              className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-sm transition cursor-pointer"
            >
              รับทราบคำใบ้
            </button>
          </div>
        </div>
      )}

      {/* Save Toast */}
      {saveToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white font-bold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 text-xs animate-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{saveToast}</span>
        </div>
      )}

      {/* Digital Multimeter Simulator */}
      <DigitalMultimeter
        isOpen={showMultimeter}
        onClose={() => setShowMultimeter(false)}
        testPoints={testPoints}
        circuitIsClosed={isCircuitClosed && isSwitchClosed}
      />
    </div>
  );
};
