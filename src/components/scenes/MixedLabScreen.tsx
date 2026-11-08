/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Zap,
  RotateCw,
  Layers,
  Gauge,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Info,
  Play,
  RotateCcw,
  Sparkles,
  Undo2,
  HelpCircle,
  Save,
  ArrowRight,
  ArrowLeft,
  Flame,
  Scale,
  BatteryCharging,
  Cpu,
} from 'lucide-react';
import { useGameState } from '../../context/GameStateContext';
import {
  validateMixed2S2PCircuit,
  Mixed2S2PValidation,
} from '../../engine/circuitSimulator';
import { CircuitComponent, CircuitWire } from '../../types/game';
import { VoltDialog } from '../common/VoltDialog';

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

export const MixedLabScreen: React.FC = () => {
  const { goToScene, updateBatteryPack, completeMission } = useGameState();

  // Cell reversals to allow hands-on polarity experiments
  const [c1Rev, setC1Rev] = useState<boolean>(false);
  const [c2Rev, setC2Rev] = useState<boolean>(false);
  const [c3Rev, setC3Rev] = useState<boolean>(false);
  const [c4Rev, setC4Rev] = useState<boolean>(false);

  // Default wiring: Valid 2S2P setup
  // String A: cell_1_pos -> cell_2_neg (series bridge A)
  // String B: cell_3_pos -> cell_4_neg (series bridge B)
  // Parallel positives: cell_2_pos -> cell_4_pos -> bus_pos
  // Parallel negatives: cell_1_neg -> cell_3_neg -> bus_neg
  const [wires, setWires] = useState<CircuitWire[]>([
    { id: 'w_br_a', fromTerminalId: 'cell_1_pos', toTerminalId: 'cell_2_neg', color: '#10b981' },
    { id: 'w_br_b', fromTerminalId: 'cell_3_pos', toTerminalId: 'cell_4_neg', color: '#10b981' },
    { id: 'w_par_pos', fromTerminalId: 'cell_2_pos', toTerminalId: 'cell_4_pos', color: '#ef4444' },
    { id: 'w_par_neg', fromTerminalId: 'cell_1_neg', toTerminalId: 'cell_3_neg', color: '#3b82f6' },
    { id: 'w_out_pos', fromTerminalId: 'cell_4_pos', toTerminalId: 'bus_pos', color: '#ef4444' },
    { id: 'w_out_neg', fromTerminalId: 'cell_3_neg', toTerminalId: 'bus_neg', color: '#3b82f6' },
  ]);

  const [history, setHistory] = useState<CircuitWire[][]>([]);
  const [activeTerminalId, setActiveTerminalId] = useState<string | null>(null);

  const [showCelebration, setShowCelebration] = useState<boolean>(false);
  const [showHintModal, setShowHintModal] = useState<boolean>(false);
  const [showCompareModal, setShowCompareModal] = useState<boolean>(false);
  const [showDiagramModal, setShowDiagramModal] = useState<boolean>(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);

  const [terminalCoords, setTerminalCoords] = useState<Record<string, { x: number; y: number }>>({});
  const workbenchRef = useRef<HTMLDivElement | null>(null);

  const activeComponents = useMemo<CircuitComponent[]>(() => {
    return [
      {
        id: 'cell_1',
        type: 'battery_cell',
        name: 'ถ่าน AA ก้อน 1 (สตริง A)',
        x: 0,
        y: 0,
        terminals: [
          { id: 'cell_1_pos', componentId: 'cell_1', label: '+', polarity: 'positive', x: 0, y: 0 },
          { id: 'cell_1_neg', componentId: 'cell_1', label: '-', polarity: 'negative', x: 0, y: 0 },
        ],
        properties: { voltage: 1.5, capacityMah: 2000, isReversed: c1Rev },
      },
      {
        id: 'cell_2',
        type: 'battery_cell',
        name: 'ถ่าน AA ก้อน 2 (สตริง A)',
        x: 0,
        y: 0,
        terminals: [
          { id: 'cell_2_pos', componentId: 'cell_2', label: '+', polarity: 'positive', x: 0, y: 0 },
          { id: 'cell_2_neg', componentId: 'cell_2', label: '-', polarity: 'negative', x: 0, y: 0 },
        ],
        properties: { voltage: 1.5, capacityMah: 2000, isReversed: c2Rev },
      },
      {
        id: 'cell_3',
        type: 'battery_cell',
        name: 'ถ่าน AA ก้อน 3 (สตริง B)',
        x: 0,
        y: 0,
        terminals: [
          { id: 'cell_3_pos', componentId: 'cell_3', label: '+', polarity: 'positive', x: 0, y: 0 },
          { id: 'cell_3_neg', componentId: 'cell_3', label: '-', polarity: 'negative', x: 0, y: 0 },
        ],
        properties: { voltage: 1.5, capacityMah: 2000, isReversed: c3Rev },
      },
      {
        id: 'cell_4',
        type: 'battery_cell',
        name: 'ถ่าน AA ก้อน 4 (สตริง B)',
        x: 0,
        y: 0,
        terminals: [
          { id: 'cell_4_pos', componentId: 'cell_4', label: '+', polarity: 'positive', x: 0, y: 0 },
          { id: 'cell_4_neg', componentId: 'cell_4', label: '-', polarity: 'negative', x: 0, y: 0 },
        ],
        properties: { voltage: 1.5, capacityMah: 2000, isReversed: c4Rev },
      },
    ];
  }, [c1Rev, c2Rev, c3Rev, c4Rev]);

  const liveValidation = useMemo<Mixed2S2PValidation>(() => {
    return validateMixed2S2PCircuit(activeComponents, wires);
  }, [activeComponents, wires]);

  const terminalMeta: Record<string, { label: string; componentName: string }> = {
    cell_1_pos: { label: c1Rev ? 'ขั้วลบ (-)' : 'ขั้วบวก (+)', componentName: 'สตริง A - ถ่าน #1' },
    cell_1_neg: { label: c1Rev ? 'ขั้วบวก (+)' : 'ขั้วลบ (-)', componentName: 'สตริง A - ถ่าน #1' },
    cell_2_pos: { label: c2Rev ? 'ขั้วลบ (-)' : 'ขั้วบวก (+)', componentName: 'สตริง A - ถ่าน #2' },
    cell_2_neg: { label: c2Rev ? 'ขั้วบวก (+)' : 'ขั้วลบ (-)', componentName: 'สตริง A - ถ่าน #2' },
    cell_3_pos: { label: c3Rev ? 'ขั้วลบ (-)' : 'ขั้วบวก (+)', componentName: 'สตริง B - ถ่าน #3' },
    cell_3_neg: { label: c3Rev ? 'ขั้วบวก (+)' : 'ขั้วลบ (-)', componentName: 'สตริง B - ถ่าน #3' },
    cell_4_pos: { label: c4Rev ? 'ขั้วลบ (-)' : 'ขั้วบวก (+)', componentName: 'สตริง B - ถ่าน #4' },
    cell_4_neg: { label: c4Rev ? 'ขั้วบวก (+)' : 'ขั้วลบ (-)', componentName: 'สตริง B - ถ่าน #4' },
    bus_pos: { label: 'ขั้วบวกหลัก (+)', componentName: 'บัสบาร์เอาต์พุต (Pack [+] Bus)' },
    bus_neg: { label: 'ขั้วลบหลัก (-)', componentName: 'บัสบาร์เอาต์พุต (Pack [-] Bus)' },
  };

  const updateTerminalPositions = () => {
    if (!workbenchRef.current) return;
    const wbRect = workbenchRef.current.getBoundingClientRect();
    const newCoords: Record<string, { x: number; y: number }> = {};

    Object.keys(terminalMeta).forEach((tId) => {
      const el = document.getElementById(`mixed-term-${tId}`);
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
  }, [wires, c1Rev, c2Rev, c3Rev, c4Rev]);

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
      id: `w_m_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
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

  const handleUndo = () => {
    if (history.length === 0) return;
    playTone(400, 'sine', 0.1);
    const prev = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setWires(prev);
    setActiveTerminalId(null);
  };

  const handleReset = () => {
    playTone(300, 'sawtooth', 0.15);
    setHistory((prev) => [...prev, [...wires]]);
    setWires([]);
    setActiveTerminalId(null);
  };

  const handleSavePack = () => {
    if (!liveValidation.isSuccess) {
      playTone(280, 'square', 0.2);
      setSaveToast('คำเตือน: โครงสร้าง 2S2P ยังไม่สมบูรณ์! กรุณาตรวจสอบการต่อสายไฟ');
      setTimeout(() => setSaveToast(null), 3000);
      return;
    }

    playTone(600, 'sine', 0.15);
    updateBatteryPack({
      id: 'pack_2s2p_academy',
      name: 'Custom 2S2P Power Pack (3.0V 4000mAh)',
      configType: 'mixed_series_parallel',
      seriesCount: 2,
      parallelCount: 2,
      totalCells: 4,
      nominalVoltage: 3.0,
      nominalCapacityMah: 4000,
      totalVoltage: 3.0,
      totalCapacityMah: 4000,
      internalResistance: 0.15,
      isValidated: true,
      notes: 'ชุดแบตเตอรี่ 2S2P (4 ก้อน): 2 สตริงอนุกรม (3.0V) ขนานกันเพิ่มความจุเป็น 4000mAh (12.0 Wh)',
    });
    setSaveToast('บันทึกชุดแบตเตอรี่ 2S2P เข้าสู่ระบบยานยนต์เรียบร้อยแล้ว!');
    setTimeout(() => setSaveToast(null), 3500);
  };

  const handleTestPack = () => {
    if (liveValidation.isSuccess) {
      playTone(880, 'sine', 0.35);
      handleSavePack();
      completeMission('m4', 100);
      completeMission('mission_4', 100);
      setShowCelebration(true);
    } else if (liveValidation.isShortCircuit || liveValidation.hasCirculatingCurrent) {
      playTone(180, 'sawtooth', 0.45);
    } else {
      playTone(260, 'square', 0.25);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950 text-white flex flex-col font-sans select-none">
      {/* Top Header */}
      <div className="bg-slate-900/90 border-b border-indigo-500/30 backdrop-blur-md px-4 py-3 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button
            onClick={() => goToScene('mission_map')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition active:scale-95 min-h-[44px]"
          >
            <ArrowLeft className="w-4 h-4 text-emerald-400" />
            <span>แผนที่ภารกิจ</span>
          </button>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 via-orange-500 to-purple-600 flex items-center justify-center font-bold text-sm shadow-md">
              04
            </div>
            <div>
              <h1 className="text-sm md:text-base font-black text-amber-200">
                LAB-04: ห้องทดลองแบตเตอรี่ผสม (2S2P Mixed Circuit Lab)
              </h1>
              <p className="text-[11px] text-slate-400">
                สร้างชุดแบตเตอรี่ 2S2P จากถ่าน AA 4 ก้อน: 2 สตริงอนุกรม (3.0V) ขนานกันเพื่อรวมความจุเป็น 4,000 mAh
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleUndo}
            disabled={history.length === 0}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 text-xs font-medium border border-slate-700 transition min-h-[44px]"
            title="ย้อนกลับการกระทำล่าสุด"
          >
            <Undo2 className="w-4 h-4 text-indigo-400" />
            <span className="hidden sm:inline">ย้อนกลับ</span>
          </button>

          <button
            onClick={handleReset}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/60 text-slate-300 hover:text-rose-300 text-xs font-medium border border-slate-700 transition min-h-[44px]"
            title="ลบสายไฟทั้งหมด"
          >
            <RotateCcw className="w-4 h-4 text-rose-400" />
            <span className="hidden sm:inline">รีเซ็ต</span>
          </button>

          <button
            onClick={() => setShowDiagramModal(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-900/60 hover:bg-indigo-800/80 text-indigo-300 text-xs font-semibold border border-indigo-700 transition min-h-[44px]"
          >
            <Layers className="w-4 h-4 text-indigo-400" />
            <span>ผังวงจร 2S2P</span>
          </button>

          <button
            onClick={() => setShowCompareModal(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-purple-900/50 hover:bg-purple-800/70 text-purple-300 text-xs font-semibold border border-purple-700 transition min-h-[44px]"
          >
            <Scale className="w-4 h-4 text-amber-400" />
            <span>เปรียบเทียบ S vs P vs 2S2P</span>
          </button>

          <button
            onClick={() => setShowHintModal(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 text-xs font-semibold border border-amber-700/60 transition min-h-[44px]"
          >
            <HelpCircle className="w-4 h-4 text-amber-400" />
            <span>คำใบ้</span>
          </button>

          <button
            onClick={handleSavePack}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 text-xs font-semibold border border-emerald-700/60 transition min-h-[44px]"
          >
            <Save className="w-4 h-4 text-emerald-400" />
            <span>บันทึกแพ็ก</span>
          </button>

          <button
            onClick={handleTestPack}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 via-orange-500 to-emerald-500 hover:brightness-110 text-slate-950 text-xs font-black shadow-lg shadow-amber-500/20 active:scale-95 transition min-h-[44px]"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>ทดสอบชุดแบตเตอรี่</span>
          </button>
        </div>
      </div>

      {/* Main Workbench Grid (Split View) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 p-4 max-w-7xl mx-auto w-full">
        {/* Left Workbench (8 Cols) */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <div
            ref={workbenchRef}
            className="relative flex-1 min-h-[500px] rounded-2xl bg-gradient-to-b from-slate-900/95 to-slate-950 border border-amber-500/30 p-4 md:p-6 shadow-2xl flex flex-col justify-between overflow-hidden"
          >
            {/* Grid Pattern Background */}
            <div
              className="absolute inset-0 opacity-10 pointer-events-none"
              style={{
                backgroundImage:
                  'radial-gradient(circle at 10px 10px, #f59e0b 1.5px, transparent 0)',
                backgroundSize: '24px 24px',
              }}
            />

            {/* Instruction Banner */}
            <div className="relative z-10 flex items-center justify-between bg-slate-950/85 border border-slate-800 rounded-xl px-4 py-2.5 backdrop-blur-md">
              <div className="flex items-center gap-2 text-xs">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-slate-300">
                  {activeTerminalId ? (
                    <span className="text-amber-300 font-bold">
                      เลือกขั้วปลายทาง (กำลังเชื่อมจาก: {terminalMeta[activeTerminalId]?.componentName} {terminalMeta[activeTerminalId]?.label})
                    </span>
                  ) : (
                    'เชื่อมต่อ 2 สตริงอนุกรม (ก้อน 1-2 และ 3-4) แล้วนำขั้วทั้งสองสตริงมาขนานกันเข้าสู่บัสบาร์เอาต์พุต'
                  )}
                </span>
              </div>
              <span className="text-[11px] text-amber-400 font-mono">
                สายไฟในวงจร: {wires.length} เส้น
              </span>
            </div>

            {/* SVG Interactive Wires Layer */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none z-20"
              style={{ overflow: 'visible' }}
            >
              {wires.map((wire) => {
                const start = terminalCoords[wire.fromTerminalId];
                const end = terminalCoords[wire.toTerminalId];
                if (!start || !end) return null;

                const dx = end.x - start.x;
                const dy = end.y - start.y;
                const cx1 = start.x + dx * 0.2;
                const cy1 = start.y + dy * 0.8 + 20;
                const cx2 = start.x + dx * 0.8;
                const cy2 = start.y + dy * 0.2 - 20;

                const pathD = `M ${start.x} ${start.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${end.x} ${end.y}`;

                return (
                  <g key={wire.id} className="group pointer-events-auto">
                    <path
                      d={pathD}
                      fill="none"
                      stroke={liveValidation.isSuccess ? wire.color : '#475569'}
                      strokeWidth="10"
                      strokeOpacity="0.2"
                      strokeLinecap="round"
                    />
                    <path
                      d={pathD}
                      fill="none"
                      stroke={wire.color}
                      strokeWidth="4"
                      strokeLinecap="round"
                      className="cursor-pointer transition-all hover:stroke-white"
                      onClick={() => removeWire(wire.id)}
                    />
                    {liveValidation.isSuccess && (
                      <circle r="4" fill="#fef08a">
                        <animateMotion path={pathD} dur="1.3s" repeatCount="indefinite" />
                      </circle>
                    )}
                  </g>
                );
              })}
            </svg>

            {/* Component Layout: 2 Separate Series Strings + Output Bus Bar */}
            <div className="relative z-10 flex flex-col gap-5 my-auto pt-3">
              {/* String A (Row 1): Cell 1 and Cell 2 in Series */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5 shadow-lg relative">
                <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span className="text-xs font-black text-emerald-300 uppercase tracking-wider">
                      สตริง A (Series String A): เซลล์ #1 + เซลล์ #2
                    </span>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                    แรงดันสตริง A: {liveValidation.stringAVoltage.toFixed(1)}V
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Cell 1 */}
                  <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-700/80 flex items-center justify-between">
                    <div className="flex flex-col items-center gap-1">
                      <button
                        id="mixed-term-cell_1_pos"
                        onClick={() => handleTerminalClick('cell_1_pos')}
                        className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs ring-4 transition-all ${
                          activeTerminalId === 'cell_1_pos'
                            ? 'ring-white scale-110'
                            : 'ring-rose-500/30 hover:ring-rose-400/60'
                        } ${c1Rev ? 'bg-blue-600 text-white' : 'bg-rose-600 text-white'}`}
                      >
                        {c1Rev ? '-' : '+'}
                      </button>
                      <span className="text-[9px] text-slate-400 font-mono">
                        {c1Rev ? 'ขั้วลบ' : 'ขั้วบวก'}
                      </span>
                    </div>

                    <div className="flex-1 mx-2.5 h-10 rounded-md bg-gradient-to-r from-amber-500 to-amber-600 flex flex-col items-center justify-center shadow-inner relative overflow-hidden">
                      <span className="text-[10px] font-black text-slate-950">เซลล์ #1 (1.5V)</span>
                      <button
                        onClick={() => setC1Rev((r) => !r)}
                        className="text-[9px] text-slate-900 bg-amber-400/80 hover:bg-white px-1.5 py-0.2 rounded font-bold transition flex items-center gap-0.5"
                      >
                        <RotateCw className="w-2.5 h-2.5" />
                        <span>สลับ</span>
                      </button>
                    </div>

                    <div className="flex flex-col items-center gap-1">
                      <button
                        id="mixed-term-cell_1_neg"
                        onClick={() => handleTerminalClick('cell_1_neg')}
                        className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs ring-4 transition-all ${
                          activeTerminalId === 'cell_1_neg'
                            ? 'ring-white scale-110'
                            : 'ring-blue-500/30 hover:ring-blue-400/60'
                        } ${c1Rev ? 'bg-rose-600 text-white' : 'bg-blue-600 text-white'}`}
                      >
                        {c1Rev ? '+' : '-'}
                      </button>
                      <span className="text-[9px] text-slate-400 font-mono">
                        {c1Rev ? 'ขั้วบวก' : 'ขั้วลบ'}
                      </span>
                    </div>
                  </div>

                  {/* Cell 2 */}
                  <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-700/80 flex items-center justify-between">
                    <div className="flex flex-col items-center gap-1">
                      <button
                        id="mixed-term-cell_2_pos"
                        onClick={() => handleTerminalClick('cell_2_pos')}
                        className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs ring-4 transition-all ${
                          activeTerminalId === 'cell_2_pos'
                            ? 'ring-white scale-110'
                            : 'ring-rose-500/30 hover:ring-rose-400/60'
                        } ${c2Rev ? 'bg-blue-600 text-white' : 'bg-rose-600 text-white'}`}
                      >
                        {c2Rev ? '-' : '+'}
                      </button>
                      <span className="text-[9px] text-slate-400 font-mono">
                        {c2Rev ? 'ขั้วลบ' : 'ขั้วบวก'}
                      </span>
                    </div>

                    <div className="flex-1 mx-2.5 h-10 rounded-md bg-gradient-to-r from-amber-500 to-amber-600 flex flex-col items-center justify-center shadow-inner relative overflow-hidden">
                      <span className="text-[10px] font-black text-slate-950">เซลล์ #2 (1.5V)</span>
                      <button
                        onClick={() => setC2Rev((r) => !r)}
                        className="text-[9px] text-slate-900 bg-amber-400/80 hover:bg-white px-1.5 py-0.2 rounded font-bold transition flex items-center gap-0.5"
                      >
                        <RotateCw className="w-2.5 h-2.5" />
                        <span>สลับ</span>
                      </button>
                    </div>

                    <div className="flex flex-col items-center gap-1">
                      <button
                        id="mixed-term-cell_2_neg"
                        onClick={() => handleTerminalClick('cell_2_neg')}
                        className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs ring-4 transition-all ${
                          activeTerminalId === 'cell_2_neg'
                            ? 'ring-white scale-110'
                            : 'ring-blue-500/30 hover:ring-blue-400/60'
                        } ${c2Rev ? 'bg-rose-600 text-white' : 'bg-blue-600 text-white'}`}
                      >
                        {c2Rev ? '+' : '-'}
                      </button>
                      <span className="text-[9px] text-slate-400 font-mono">
                        {c2Rev ? 'ขั้วบวก' : 'ขั้วลบ'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* String B (Row 2): Cell 3 and Cell 4 in Series */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5 shadow-lg relative">
                <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-400" />
                    <span className="text-xs font-black text-cyan-300 uppercase tracking-wider">
                      สตริง B (Series String B): เซลล์ #3 + เซลล์ #4
                    </span>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800">
                    แรงดันสตริง B: {liveValidation.stringBVoltage.toFixed(1)}V
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Cell 3 */}
                  <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-700/80 flex items-center justify-between">
                    <div className="flex flex-col items-center gap-1">
                      <button
                        id="mixed-term-cell_3_pos"
                        onClick={() => handleTerminalClick('cell_3_pos')}
                        className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs ring-4 transition-all ${
                          activeTerminalId === 'cell_3_pos'
                            ? 'ring-white scale-110'
                            : 'ring-rose-500/30 hover:ring-rose-400/60'
                        } ${c3Rev ? 'bg-blue-600 text-white' : 'bg-rose-600 text-white'}`}
                      >
                        {c3Rev ? '-' : '+'}
                      </button>
                      <span className="text-[9px] text-slate-400 font-mono">
                        {c3Rev ? 'ขั้วลบ' : 'ขั้วบวก'}
                      </span>
                    </div>

                    <div className="flex-1 mx-2.5 h-10 rounded-md bg-gradient-to-r from-teal-500 to-teal-600 flex flex-col items-center justify-center shadow-inner relative overflow-hidden">
                      <span className="text-[10px] font-black text-slate-950">เซลล์ #3 (1.5V)</span>
                      <button
                        onClick={() => setC3Rev((r) => !r)}
                        className="text-[9px] text-slate-900 bg-teal-400/80 hover:bg-white px-1.5 py-0.2 rounded font-bold transition flex items-center gap-0.5"
                      >
                        <RotateCw className="w-2.5 h-2.5" />
                        <span>สลับ</span>
                      </button>
                    </div>

                    <div className="flex flex-col items-center gap-1">
                      <button
                        id="mixed-term-cell_3_neg"
                        onClick={() => handleTerminalClick('cell_3_neg')}
                        className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs ring-4 transition-all ${
                          activeTerminalId === 'cell_3_neg'
                            ? 'ring-white scale-110'
                            : 'ring-blue-500/30 hover:ring-blue-400/60'
                        } ${c3Rev ? 'bg-rose-600 text-white' : 'bg-blue-600 text-white'}`}
                      >
                        {c3Rev ? '+' : '-'}
                      </button>
                      <span className="text-[9px] text-slate-400 font-mono">
                        {c3Rev ? 'ขั้วบวก' : 'ขั้วลบ'}
                      </span>
                    </div>
                  </div>

                  {/* Cell 4 */}
                  <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-700/80 flex items-center justify-between">
                    <div className="flex flex-col items-center gap-1">
                      <button
                        id="mixed-term-cell_4_pos"
                        onClick={() => handleTerminalClick('cell_4_pos')}
                        className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs ring-4 transition-all ${
                          activeTerminalId === 'cell_4_pos'
                            ? 'ring-white scale-110'
                            : 'ring-rose-500/30 hover:ring-rose-400/60'
                        } ${c4Rev ? 'bg-blue-600 text-white' : 'bg-rose-600 text-white'}`}
                      >
                        {c4Rev ? '-' : '+'}
                      </button>
                      <span className="text-[9px] text-slate-400 font-mono">
                        {c4Rev ? 'ขั้วลบ' : 'ขั้วบวก'}
                      </span>
                    </div>

                    <div className="flex-1 mx-2.5 h-10 rounded-md bg-gradient-to-r from-teal-500 to-teal-600 flex flex-col items-center justify-center shadow-inner relative overflow-hidden">
                      <span className="text-[10px] font-black text-slate-950">เซลล์ #4 (1.5V)</span>
                      <button
                        onClick={() => setC4Rev((r) => !r)}
                        className="text-[9px] text-slate-900 bg-teal-400/80 hover:bg-white px-1.5 py-0.2 rounded font-bold transition flex items-center gap-0.5"
                      >
                        <RotateCw className="w-2.5 h-2.5" />
                        <span>สลับ</span>
                      </button>
                    </div>

                    <div className="flex flex-col items-center gap-1">
                      <button
                        id="mixed-term-cell_4_neg"
                        onClick={() => handleTerminalClick('cell_4_neg')}
                        className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs ring-4 transition-all ${
                          activeTerminalId === 'cell_4_neg'
                            ? 'ring-white scale-110'
                            : 'ring-blue-500/30 hover:ring-blue-400/60'
                        } ${c4Rev ? 'bg-rose-600 text-white' : 'bg-blue-600 text-white'}`}
                      >
                        {c4Rev ? '+' : '-'}
                      </button>
                      <span className="text-[9px] text-slate-400 font-mono">
                        {c4Rev ? 'ขั้วบวก' : 'ขั้วลบ'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Main Pack Output Bus Bar */}
              <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-2 border-amber-500/40 rounded-2xl p-4 shadow-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-amber-400 animate-ping" />
                  <div>
                    <span className="text-xs font-black text-amber-300">
                      บัสบาร์จ่ายไฟหลักของแพ็ก 2S2P (Main Output Bus)
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      จุดรวมสายไฟขนานจากทั้งสตริง A และ B เพื่อส่งพลังงานเข้ามอเตอร์
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  {/* Bus Positive */}
                  <div className="flex flex-col items-center gap-1">
                    <button
                      id="mixed-term-bus_pos"
                      onClick={() => handleTerminalClick('bus_pos')}
                      className={`w-11 h-11 rounded-full bg-rose-600 text-white font-black text-sm ring-4 transition-all ${
                        activeTerminalId === 'bus_pos'
                          ? 'ring-white scale-110'
                          : 'ring-rose-500/40 hover:ring-rose-300'
                      }`}
                    >
                      +
                    </button>
                    <span className="text-[10px] text-rose-300 font-bold">BUS (+)</span>
                  </div>

                  {/* Bus Negative */}
                  <div className="flex flex-col items-center gap-1">
                    <button
                      id="mixed-term-bus_neg"
                      onClick={() => handleTerminalClick('bus_neg')}
                      className={`w-11 h-11 rounded-full bg-blue-600 text-white font-black text-sm ring-4 transition-all ${
                        activeTerminalId === 'bus_neg'
                          ? 'ring-white scale-110'
                          : 'ring-blue-500/40 hover:ring-blue-300'
                      }`}
                    >
                      -
                    </button>
                    <span className="text-[10px] text-blue-300 font-bold">BUS (-)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Live Safety Feedback Bar */}
            <div
              className={`relative z-10 mt-3 p-3 rounded-xl border flex items-center gap-3 transition-colors ${
                liveValidation.alertType === 'danger'
                  ? 'bg-rose-950/80 border-rose-600 text-rose-200'
                  : liveValidation.alertType === 'warning'
                  ? 'bg-amber-950/80 border-amber-600 text-amber-200'
                  : liveValidation.alertType === 'success'
                  ? 'bg-emerald-950/80 border-emerald-600 text-emerald-200'
                  : 'bg-slate-900/80 border-slate-700 text-slate-300'
              }`}
            >
              {liveValidation.alertType === 'danger' ? (
                <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
              ) : liveValidation.alertType === 'warning' ? (
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
              ) : liveValidation.alertType === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <Info className="w-5 h-5 text-indigo-400 shrink-0" />
              )}
              <div className="text-xs">
                <span className="font-bold mr-1">สถานะความปลอดภัย:</span>
                <span>{liveValidation.statusMessage}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel: Digital Telemetry, Chemistry Specs & VOLT (4 Cols) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          {/* Main 2S2P Multimeter Instrument */}
          <div className="bg-slate-900/90 border border-amber-500/30 rounded-2xl p-4 shadow-xl flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-black text-amber-300 flex items-center gap-1.5 uppercase">
                <Gauge className="w-4 h-4 text-amber-400" />
                มาตรวัดแพ็ก 2S2P (Pack Dyno Multimeter)
              </span>
              <span className="text-[10px] font-mono bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded">
                2S 2P MATRIX
              </span>
            </div>

            {/* Voltage & Capacity Readouts */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-slate-950 rounded-xl p-3 border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-medium">แรงดันพิกัด (Pack Voltage)</span>
                <div className="text-2xl font-black font-mono text-amber-400 tracking-wider">
                  {liveValidation.totalVoltage.toFixed(1)}{' '}
                  <span className="text-sm font-normal text-slate-400">V</span>
                </div>
                <span className="text-[10px] text-emerald-400 font-semibold">
                  {liveValidation.isSuccess ? '2S Series Aided' : 'รอการต่อ'}
                </span>
              </div>

              <div className="bg-slate-950 rounded-xl p-3 border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-medium">ความจุพิกัด (Capacity)</span>
                <div className="text-2xl font-black font-mono text-teal-400 tracking-wider">
                  {liveValidation.nominalCapacityMah}{' '}
                  <span className="text-xs font-normal text-slate-400">mAh</span>
                </div>
                <span className="text-[10px] text-cyan-400 font-semibold">
                  {liveValidation.isParallelTied ? '2P Paralleled' : '2000 mAh'}
                </span>
              </div>
            </div>

            {/* Secondary Electrical Specs */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 block text-[10px]">พลังงานรวม (Energy)</span>
                <span className="font-mono font-bold text-purple-300 text-sm">
                  {liveValidation.totalEnergyWh.toFixed(1)} Wh
                </span>
                <span className="text-[9px] text-slate-500 block">3.0V × 4.0Ah</span>
              </div>

              <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 block text-[10px]">ความต้านทานภายใน (R_in)</span>
                <span className="font-mono font-bold text-emerald-400 text-sm">
                  {liveValidation.internalResistance.toFixed(2)} Ω
                </span>
                <span className="text-[9px] text-slate-500 block">ลดลงเหลือครึ่งหนึ่ง</span>
              </div>

              <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800 col-span-2 flex items-center justify-between">
                <div>
                  <span className="text-slate-400 block text-[10px]">ขีดจำกัดการจ่ายกระแสต่อเนื่อง</span>
                  <span className="font-mono font-black text-amber-300 text-sm">
                    4.0 A (Max ~8.0A Pulse)
                  </span>
                </div>
                <div className="text-right text-[10px] text-slate-400">
                  <span>เพียงพอสำหรับมอเตอร์ DC 6V</span>
                </div>
              </div>
            </div>
          </div>

          {/* Scientific Principle Card */}
          <div className="bg-gradient-to-br from-amber-950/40 to-slate-900 border border-amber-500/20 rounded-2xl p-4 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
              <Cpu className="w-4 h-4 text-amber-400" />
              <span>หลักการผสม (2S2P Series-Parallel Topology)</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              การต่ออนุกรม 2 เซลล์ในแต่ละสตริงทำให้ได้แรงดัน <strong>3.0V</strong> (1.5V + 1.5V) และการนำ 2 สตริงที่แรงดันเท่ากันมาขนานกัน จะทำให้ความจุรวมเพิ่มเป็น <strong>4,000 mAh</strong> (2,000 + 2,000 mAh)
            </p>
            <div className="bg-slate-950/80 p-2 rounded-lg border border-slate-800 text-center font-mono text-xs text-emerald-400 font-bold">
              V = 2 × 1.5V = 3.0V | C = 2 × 2000mAh = 4000mAh
            </div>
          </div>

          {/* VOLT Tutor */}
          <VoltDialog
            mood={
              liveValidation.isSuccess
                ? 'celebrate'
                : liveValidation.alertType === 'danger'
                ? 'alarm'
                : liveValidation.alertType === 'warning'
                ? 'thinking'
                : 'happy'
            }
            message={
              liveValidation.isSuccess
                ? 'ยอดเยี่ยมสมบูรณ์แบบครับ! แพ็ก 2S2P มีแรงดัน 3.0V และความจุ 4000mAh สมดุลกันทั้งสองสตริง พร้อมจ่ายพลังงานให้มอเตอร์แล้ว!'
                : liveValidation.hint
            }
          />
        </div>
      </div>

      {/* Schematic Diagram Modal */}
      {showDiagramModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/40 rounded-3xl max-w-lg w-full p-6 shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-amber-400" />
                <h3 className="font-black text-sm text-amber-200">
                  ผังวงจรเชื่อมต่อ 2S2P (Connection Diagram)
                </h3>
              </div>
              <button
                onClick={() => setShowDiagramModal(false)}
                className="text-slate-400 hover:text-white text-xs px-2.5 py-1 rounded-lg bg-slate-800"
              >
                ปิด
              </button>
            </div>

            {/* Clear Visual Schematic Illustration */}
            <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800 flex flex-col items-center gap-3">
              <svg viewBox="0 0 360 200" className="w-full h-auto">
                {/* String A */}
                <rect x="20" y="30" width="80" height="35" rx="4" fill="#d97706" />
                <text x="60" y="52" fill="#000" fontSize="10" fontWeight="bold" textAnchor="middle">
                  เซลล์ #1 (1.5V)
                </text>
                <line x1="100" y1="47" x2="140" y2="47" stroke="#10b981" strokeWidth="4" />

                <rect x="140" y="30" width="80" height="35" rx="4" fill="#d97706" />
                <text x="180" y="52" fill="#000" fontSize="10" fontWeight="bold" textAnchor="middle">
                  เซลล์ #2 (1.5V)
                </text>

                {/* String B */}
                <rect x="20" y="110" width="80" height="35" rx="4" fill="#0d9488" />
                <text x="60" y="132" fill="#000" fontSize="10" fontWeight="bold" textAnchor="middle">
                  เซลล์ #3 (1.5V)
                </text>
                <line x1="100" y1="127" x2="140" y2="127" stroke="#10b981" strokeWidth="4" />

                <rect x="140" y="110" width="80" height="35" rx="4" fill="#0d9488" />
                <text x="180" y="132" fill="#000" fontSize="10" fontWeight="bold" textAnchor="middle">
                  เซลล์ #4 (1.5V)
                </text>

                {/* Parallel Buses */}
                {/* Negative bus line */}
                <line x1="20" y1="47" x2="20" y2="127" stroke="#3b82f6" strokeWidth="4" />
                <line x1="20" y1="87" x2="5" y2="87" stroke="#3b82f6" strokeWidth="5" />
                <circle cx="5" cy="87" r="5" fill="#3b82f6" />
                <text x="15" y="99" fill="#60a5fa" fontSize="9" fontWeight="bold">
                  BUS (-)
                </text>

                {/* Positive bus line */}
                <line x1="220" y1="47" x2="220" y2="127" stroke="#ef4444" strokeWidth="4" />
                <line x1="220" y1="87" x2="280" y2="87" stroke="#ef4444" strokeWidth="5" />
                <circle cx="280" cy="87" r="5" fill="#ef4444" />
                <text x="290" y="91" fill="#f87171" fontSize="10" fontWeight="bold">
                  BUS (+) 3.0V
                </text>
                <text x="290" y="104" fill="#34d399" fontSize="9" fontWeight="bold">
                  4000 mAh
                </text>
              </svg>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              <strong>สรุปขั้นตอน:</strong><br />
              1. ต่อ <strong>ขั้วบวกเซลล์ 1 เข้าขั้วลบเซลล์ 2</strong> เพื่อทำสตริง A (3.0V)<br />
              2. ต่อ <strong>ขั้วบวกเซลล์ 3 เข้าขั้วลบเซลล์ 4</strong> เพื่อทำสตริง B (3.0V)<br />
              3. เชื่อม <strong>ขั้วบวกสตริง A เข้าขั้วบวกสตริง B</strong> แล้วต่อเข้า <strong>BUS (+)</strong><br />
              4. เชื่อม <strong>ขั้วลบสตริง A เข้าขั้วลบสตริง B</strong> แล้วต่อเข้า <strong>BUS (-)</strong>
            </p>

            <button
              onClick={() => setShowDiagramModal(false)}
              className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs transition"
            >
              เข้าใจแล้ว เริ่มต่อวงจร
            </button>
          </div>
        </div>
      )}

      {/* Comparison Modal */}
      {showCompareModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-purple-500/40 rounded-3xl max-w-lg w-full p-6 shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-purple-400" />
                <h3 className="font-black text-sm text-purple-200">
                  เปรียบเทียบการจัดเรียง 4 รูปแบบ (1S1P, 2S1P, 1S2P, 2S2P)
                </h3>
              </div>
              <button
                onClick={() => setShowCompareModal(false)}
                className="text-slate-400 hover:text-white text-xs px-2.5 py-1 rounded-lg bg-slate-800"
              >
                ปิด
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <span className="font-bold text-slate-300 block">1S 1P (เซลล์เดี่ยว 1 ก้อน)</span>
                <span className="text-[10px] text-slate-400">แรงดัน 1.5V | ความจุ 2000mAh</span>
                <span className="text-[10px] text-amber-400 block mt-1">พลังงาน: 3.0 Wh</span>
              </div>

              <div className="bg-slate-950 p-2.5 rounded-xl border border-indigo-800">
                <span className="font-bold text-indigo-300 block">2S 1P (อนุกรม 2 ก้อน)</span>
                <span className="text-[10px] text-slate-400">แรงดัน 3.0V | ความจุ 2000mAh</span>
                <span className="text-[10px] text-indigo-400 block mt-1">พลังงาน: 6.0 Wh</span>
              </div>

              <div className="bg-slate-950 p-2.5 rounded-xl border border-teal-800">
                <span className="font-bold text-teal-300 block">1S 2P (ขนาน 2 ก้อน)</span>
                <span className="text-[10px] text-slate-400">แรงดัน 1.5V | ความจุ 4000mAh</span>
                <span className="text-[10px] text-teal-400 block mt-1">พลังงาน: 6.0 Wh</span>
              </div>

              <div className="bg-slate-950 p-2.5 rounded-xl border-2 border-emerald-500">
                <span className="font-bold text-emerald-300 block">2S 2P (ชุดผสม 4 ก้อน) 🔥</span>
                <span className="text-[10px] text-slate-300">แรงดัน 3.0V | ความจุ 4000mAh</span>
                <span className="text-[10px] text-emerald-400 block mt-1 font-bold">พลังงาน: 12.0 Wh (4 เท่า!)</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              ชุดผสม 2S2P รวมข้อดีทั้งสองอย่างเข้าด้วยกัน: ได้ทั้งแรงดัน 3.0V สำหรับหมุนมอเตอร์เร็วขึ้น และได้ความจุ 4000mAh สำหรับขับขี่ระยะทางไกลขึ้น!
            </p>

            <button
              onClick={() => setShowCompareModal(false)}
              className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition"
            >
              รับทราบ
            </button>
          </div>
        </div>
      )}

      {/* Hint Modal */}
      {showHintModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/40 rounded-3xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-2 text-amber-400 font-black text-sm">
              <HelpCircle className="w-5 h-5" />
              <span>คำใบ้จากหุ่นยนต์ VOLT</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              1. <strong>ทำสตริง A:</strong> เชื่อมขั้วบวก (+) ถ่าน 1 เข้าขั้วลบ (-) ถ่าน 2<br />
              2. <strong>ทำสตริง B:</strong> เชื่อมขั้วบวก (+) ถ่าน 3 เข้าขั้วลบ (-) ถ่าน 4<br />
              3. <strong>ขนานขั้วบวก:</strong> เชื่อมขั้วบวก (+) ถ่าน 2 เข้าขั้วบวก (+) ถ่าน 4 แล้วต่อเข้า BUS (+)<br />
              4. <strong>ขนานขั้วลบ:</strong> เชื่อมขั้วลบ (-) ถ่าน 1 เข้าขั้วลบ (-) ถ่าน 3 แล้วต่อเข้า BUS (-)<br />
              *ระวังอย่าให้มีถ่านกลับขั้ว เพราะจะทำให้เกิดกระแสไหลวนย้อนกลับ (Circulating Current)!
            </p>
            <button
              onClick={() => setShowHintModal(false)}
              className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs transition"
            >
              รับทราบคำใบ้
            </button>
          </div>
        </div>
      )}

      {/* Celebration Modal */}
      {showCelebration && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-gradient-to-b from-slate-900 to-amber-950 border-2 border-emerald-400 rounded-3xl max-w-md w-full p-6 shadow-2xl text-center flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-emerald-400 shadow-xl shadow-emerald-500/30">
              <Sparkles className="w-8 h-8" />
            </div>

            <div>
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/20 px-3 py-1 rounded-full">
                ภารกิจสำเร็จ! +100 EXP
              </span>
              <h2 className="text-xl font-black text-white mt-2">
                สร้างชุดแบตเตอรี่ 2S2P สำเร็จ!
              </h2>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                คุณได้สร้างชุดแบตเตอรี่แบบ 2S2P พิกัด <strong>3.0V และความจุ 4,000 mAh</strong> ที่มีความสมดุลและปลอดภัยอย่างสมบูรณ์แบบ ข้อมูลชุดแบตเตอรี่นี้ถูกบันทึกเข้าสู่ยานยนต์แข่งขันแล้ว พร้อมปลดล็อกภารกิจถัดไป: <strong>แท่นทดสอบมอเตอร์ (DC Motor Test Dyno)</strong>!
              </p>
            </div>

            <div className="w-full flex flex-col gap-2 mt-2">
              <button
                onClick={() => goToScene('motor_test')}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400 hover:brightness-110 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2 transition"
              >
                <span>ไปต่อที่ LAB-05: ทดสอบมอเตอร์ไฟฟ้า</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => setShowCelebration(false)}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition"
              >
                ทดลองสำรวจต่อในห้องนี้
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Notification Toast */}
      {saveToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-slate-950 font-bold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 text-xs animate-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{saveToast}</span>
        </div>
      )}
    </div>
  );
};
