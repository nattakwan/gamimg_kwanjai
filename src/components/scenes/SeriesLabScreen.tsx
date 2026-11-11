/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Zap,
  RotateCw,
  Lightbulb,
  ToggleLeft,
  ToggleRight,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  Sparkles,
  Undo2,
  HelpCircle,
  Save,
  ArrowRight,
  ArrowLeft,
  Flame,
  ShieldAlert,
  Gauge,
  Layers,
  Info,
  Scale,
} from 'lucide-react';
import { useGameState } from '../../context/GameStateContext';
import {
  validateSeriesCircuit,
  SeriesCircuitValidation,
} from '../../engine/circuitSimulator';
import { CircuitComponent, CircuitWire } from '../../types/game';
import { VoltDialog } from '../common/VoltDialog';
import { DigitalMultimeter, TestPoint } from '../common/DigitalMultimeter';
import { BatteryCell3D, KnifeSwitch3D, LightBulb3D, Wire3DRenderer } from '../circuit3d';

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
    // Ignore audio errors
  }
};

export const SeriesLabScreen: React.FC = () => {
  const { goToScene, completeMission } = useGameState();

  const [isSwitchClosed, setIsSwitchClosed] = useState<boolean>(true);
  const [c1Reversed, setC1Reversed] = useState<boolean>(false);
  const [c2Reversed, setC2Reversed] = useState<boolean>(false);

  // Default wiring: cell_1_pos -> cell_2_neg (series bridge), cell_2_pos -> sw_1_in, sw_1_out -> bulb_1_a, bulb_1_b -> cell_1_neg
  const [wires, setWires] = useState<CircuitWire[]>([
    { id: 'w_bridge', fromTerminalId: 'cell_1_pos', toTerminalId: 'cell_2_neg', color: '#10b981' },
    { id: 'w_sw', fromTerminalId: 'cell_2_pos', toTerminalId: 'sw_1_in', color: '#ef4444' },
    { id: 'w_bulb', fromTerminalId: 'sw_1_out', toTerminalId: 'bulb_1_a', color: '#f59e0b' },
    { id: 'w_ret', fromTerminalId: 'bulb_1_b', toTerminalId: 'cell_1_neg', color: '#3b82f6' },
  ]);

  const [history, setHistory] = useState<CircuitWire[][]>([]);
  const [activeTerminalId, setActiveTerminalId] = useState<string | null>(null);

  const [hasTested, setHasTested] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<SeriesCircuitValidation | null>(null);
  const [showCelebration, setShowCelebration] = useState<boolean>(false);
  const [showHintModal, setShowHintModal] = useState<boolean>(false);
  const [showCompareModal, setShowCompareModal] = useState<boolean>(false);
  const [showMultimeter, setShowMultimeter] = useState<boolean>(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);

  const testPoints: TestPoint[] = useMemo(() => {
    const v1 = c1Reversed ? -1.5 : 1.5;
    const v2 = c2Reversed ? -1.5 : 1.5;
    const vTotal = v1 + v2;
    return [
      { id: 'tp_c1_neg', name: 'ขั้วลบก้อน 1 (-) กราวด์', voltagePotential: 0.0, isGround: true },
      { id: 'tp_c1_pos', name: 'ขั้วบวกก้อน 1 (+)', voltagePotential: v1 },
      { id: 'tp_bridge', name: 'จุดเชื่อมบริดจ์อนุกรม', voltagePotential: v1 },
      { id: 'tp_c2_pos', name: `ขั้วบวกก้อน 2 (แรงดันรวม ${vTotal.toFixed(1)}V)`, voltagePotential: vTotal },
      { id: 'tp_sw_out', name: 'ขั้วสวิตช์ขาออก', voltagePotential: isSwitchClosed ? vTotal : 0.0 },
      { id: 'tp_bulb_in', name: 'ขั้วหลอดไฟ 3.0V', voltagePotential: isSwitchClosed ? vTotal : 0.0 },
    ];
  }, [c1Reversed, c2Reversed, isSwitchClosed]);

  const [terminalCoords, setTerminalCoords] = useState<Record<string, { x: number; y: number }>>({});
  const workbenchRef = useRef<HTMLDivElement | null>(null);

  const activeComponents = useMemo<CircuitComponent[]>(() => {
    return [
      {
        id: 'cell_1',
        type: 'battery_cell',
        name: 'ถ่าน AA ก้อนที่ 1',
        x: 0,
        y: 0,
        terminals: [
          { id: 'cell_1_pos', componentId: 'cell_1', label: '+', polarity: 'positive', x: 0, y: 0 },
          { id: 'cell_1_neg', componentId: 'cell_1', label: '-', polarity: 'negative', x: 0, y: 0 },
        ],
        properties: { voltage: 1.5, capacityMah: 2000, isReversed: c1Reversed },
      },
      {
        id: 'cell_2',
        type: 'battery_cell',
        name: 'ถ่าน AA ก้อนที่ 2',
        x: 0,
        y: 0,
        terminals: [
          { id: 'cell_2_pos', componentId: 'cell_2', label: '+', polarity: 'positive', x: 0, y: 0 },
          { id: 'cell_2_neg', componentId: 'cell_2', label: '-', polarity: 'negative', x: 0, y: 0 },
        ],
        properties: { voltage: 1.5, capacityMah: 2000, isReversed: c2Reversed },
      },
      {
        id: 'sw_1',
        type: 'switch',
        name: 'สวิตช์ควบคุม',
        x: 0,
        y: 0,
        terminals: [
          { id: 'sw_1_in', componentId: 'sw_1', label: 'IN', polarity: 'neutral', x: 0, y: 0 },
          { id: 'sw_1_out', componentId: 'sw_1', label: 'OUT', polarity: 'neutral', x: 0, y: 0 },
        ],
        properties: { isClosed: isSwitchClosed },
      },
      {
        id: 'bulb_1',
        type: 'light_bulb',
        name: 'หลอดไฟ 3.0V',
        x: 0,
        y: 0,
        terminals: [
          { id: 'bulb_1_a', componentId: 'bulb_1', label: 'A', polarity: 'neutral', x: 0, y: 0 },
          { id: 'bulb_1_b', componentId: 'bulb_1', label: 'B', polarity: 'neutral', x: 0, y: 0 },
        ],
        properties: { resistance: 6.0, ratedVoltage: 3.0 },
      },
    ];
  }, [c1Reversed, c2Reversed, isSwitchClosed]);

  const liveValidation = useMemo<SeriesCircuitValidation>(() => {
    return validateSeriesCircuit(activeComponents, wires);
  }, [activeComponents, wires]);

  const terminalMeta: Record<string, { label: string; componentName: string; color: string }> = {
    cell_1_pos: {
      label: c1Reversed ? 'ขั้วลบ (-)' : 'ขั้วบวก (+)',
      componentName: 'ถ่าน AA #1',
      color: 'bg-rose-500 text-white border-rose-300 ring-rose-500/50',
    },
    cell_1_neg: {
      label: c1Reversed ? 'ขั้วบวก (+)' : 'ขั้วลบ (-)',
      componentName: 'ถ่าน AA #1',
      color: 'bg-blue-500 text-white border-blue-300 ring-blue-500/50',
    },
    cell_2_pos: {
      label: c2Reversed ? 'ขั้วลบ (-)' : 'ขั้วบวก (+)',
      componentName: 'ถ่าน AA #2',
      color: 'bg-rose-500 text-white border-rose-300 ring-rose-500/50',
    },
    cell_2_neg: {
      label: c2Reversed ? 'ขั้วบวก (+)' : 'ขั้วลบ (-)',
      componentName: 'ถ่าน AA #2',
      color: 'bg-blue-500 text-white border-blue-300 ring-blue-500/50',
    },
    sw_1_in: {
      label: 'ขั้วเข้า (IN)',
      componentName: 'สวิตช์',
      color: 'bg-amber-500 text-white border-amber-300 ring-amber-500/50',
    },
    sw_1_out: {
      label: 'ขั้วออก (OUT)',
      componentName: 'สวิตช์',
      color: 'bg-amber-600 text-white border-amber-300 ring-amber-600/50',
    },
    bulb_1_a: {
      label: 'ขั้วเข้า A',
      componentName: 'หลอดไฟ 3.0V',
      color: 'bg-yellow-500 text-slate-900 border-yellow-200 ring-yellow-400/50',
    },
    bulb_1_b: {
      label: 'ขั้วออก B',
      componentName: 'หลอดไฟ 3.0V',
      color: 'bg-yellow-600 text-slate-900 border-yellow-200 ring-yellow-400/50',
    },
  };

  const updateTerminalPositions = () => {
    if (!workbenchRef.current) return;
    const wbRect = workbenchRef.current.getBoundingClientRect();
    const newCoords: Record<string, { x: number; y: number }> = {};

    Object.keys(terminalMeta).forEach((tId) => {
      const el = document.getElementById(`terminal-node-${tId}`);
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
  }, [wires, c1Reversed, c2Reversed]);

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

    // Check if wire already exists
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

    // Color code
    let wireColor = '#10b981';
    if (activeTerminalId.includes('pos') || terminalId.includes('pos')) wireColor = '#ef4444';
    if (activeTerminalId.includes('neg') || terminalId.includes('neg')) wireColor = '#3b82f6';
    if (activeTerminalId.includes('sw') || terminalId.includes('sw')) wireColor = '#f59e0b';

    const newWire: CircuitWire = {
      id: `w_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
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
    setHasTested(false);
    setTestResult(null);
  };

  const handleToggleSwitch = () => {
    playTone(isSwitchClosed ? 350 : 700, 'square', 0.1);
    setIsSwitchClosed((prev) => !prev);
  };

  const handleFlipCell1 = () => {
    playTone(440, 'triangle', 0.1);
    setC1Reversed((prev) => !prev);
  };

  const handleFlipCell2 = () => {
    playTone(480, 'triangle', 0.1);
    setC2Reversed((prev) => !prev);
  };

  const handleTestCircuit = () => {
    const result = liveValidation;
    setHasTested(true);
    setTestResult(result);

    if (result.isSuccess) {
      playTone(880, 'sine', 0.3);
      setShowCelebration(true);
      completeMission('mission_2', 100);
    } else if (result.isShortCircuit) {
      playTone(180, 'sawtooth', 0.4);
    } else {
      playTone(260, 'square', 0.25);
    }
  };

  const handleSaveCircuit = () => {
    playTone(600, 'sine', 0.15);
    setSaveToast('บันทึกวงจรอนุกรมลงในระบบทดลองเรียบร้อยแล้ว!');
    setTimeout(() => setSaveToast(null), 3000);
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
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-sm shadow-md">
              02
            </div>
            <div>
              <h1 className="text-sm md:text-base font-black text-indigo-200">
                LAB-02: ห้องทดลองวงจรอนุกรม (Series Circuit Lab)
              </h1>
              <p className="text-[11px] text-slate-400">
                ต่อถ่าน AA 2 ก้อนแบบหัวต่อท้าย (+ ชน -) เพื่อเพิ่มแรงดันเป็น 3.0V ขับหลอดไฟ 3.0V
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
            type="button"
            onClick={() => setShowMultimeter(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold border border-amber-500/40 transition min-h-[44px] cursor-pointer active:scale-95 shadow"
            title="เปิดมัลติมิเตอร์วัดแรงดัน"
          >
            <span>🎛️ มัลติมิเตอร์ (DMM)</span>
          </button>

          <button
            onClick={() => setShowCompareModal(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-900/60 hover:bg-indigo-800/80 text-indigo-300 text-xs font-semibold border border-indigo-700 transition min-h-[44px]"
          >
            <Scale className="w-4 h-4 text-amber-400" />
            <span>เปรียบเทียบ (1 ก้อน vs 2 ก้อน)</span>
          </button>

          <button
            onClick={() => setShowHintModal(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 text-xs font-semibold border border-amber-700/60 transition min-h-[44px]"
          >
            <HelpCircle className="w-4 h-4 text-amber-400" />
            <span>คำใบ้</span>
          </button>

          <button
            onClick={handleSaveCircuit}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 text-xs font-semibold border border-emerald-700/60 transition min-h-[44px]"
          >
            <Save className="w-4 h-4 text-emerald-400" />
            <span>บันทึกวงจร</span>
          </button>

          <button
            onClick={handleTestCircuit}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs font-black shadow-lg shadow-emerald-500/20 active:scale-95 transition min-h-[44px]"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>ทดสอบวงจร</span>
          </button>
        </div>
      </div>

      {/* Main Workspace (Split View) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 p-4 max-w-7xl mx-auto w-full">
        {/* Left Workbench (8 Cols) */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <div
            ref={workbenchRef}
            className="relative flex-1 min-h-[420px] rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-950 border border-indigo-500/30 p-4 md:p-6 shadow-2xl flex flex-col justify-between overflow-hidden"
          >
            {/* Grid Pattern Background */}
            <div
              className="absolute inset-0 opacity-10 pointer-events-none"
              style={{
                backgroundImage:
                  'radial-gradient(circle at 10px 10px, #818cf8 1.5px, transparent 0)',
                backgroundSize: '24px 24px',
              }}
            />

            {/* Instruction Banner */}
            <div className="relative z-10 flex items-center justify-between bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 backdrop-blur-md">
              <div className="flex items-center gap-2 text-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-slate-300">
                  {activeTerminalId ? (
                    <span className="text-amber-300 font-bold">
                      เลือกขั้วปลายทางเพื่อเชื่อมสายไฟ (กำลังเชื่อมจาก: {terminalMeta[activeTerminalId]?.componentName} {terminalMeta[activeTerminalId]?.label})
                    </span>
                  ) : (
                    'แตะที่ "ขั้วต่อวงกลม" เพื่อลากสายไฟเชื่อมต่ออุปกรณ์เข้าด้วยกัน'
                  )}
                </span>
              </div>
              <span className="text-[11px] text-indigo-400 font-mono">
                สายไฟในวงจร: {wires.length} เส้น
              </span>
            </div>

            {/* 3D Wire & Connectors Overlay */}
            <Wire3DRenderer
              wires={wires}
              terminalCoords={terminalCoords}
              isEnergized={liveValidation.isLampLit}
              isShortCircuit={liveValidation.isShortCircuit}
              onRemoveWire={removeWire}
            />

            {/* Component Placement Area */}
            <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6 my-auto pt-4">
              {/* Column 1: Dual Battery Pack (Cell 1 & Cell 2) */}
              <div className="flex flex-col gap-4">
                {/* Cell 1 */}
                <div className="bg-slate-900/90 border border-slate-700/80 rounded-xl p-3 shadow-lg relative group">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      ถ่าน AA #1 (1.5V)
                    </span>
                    <button
                      onClick={handleFlipCell1}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition text-[10px] flex items-center gap-1"
                      title="สลับขั้วถ่าน"
                    >
                      <RotateCw className="w-3 h-3 text-indigo-400" />
                      <span>กลับขั้ว</span>
                    </button>
                  </div>

                  <BatteryCell3D
                    voltage={1.5}
                    label="AA #1 1.5V"
                    isReversed={c1Reversed}
                    isActive={liveValidation.isLampLit}
                    size="sm"
                    onFlip={handleFlipCell1}
                  />

                  {/* Terminal Nodes */}
                  <div className="flex items-center justify-between px-2 pt-2">
                    <div className="flex flex-col items-center gap-1">
                      <button
                        id="terminal-node-cell_1_pos"
                        onClick={() => handleTerminalClick('cell_1_pos')}
                        className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all ring-4 ${
                          activeTerminalId === 'cell_1_pos'
                            ? 'ring-white scale-110'
                            : 'ring-rose-500/30 hover:ring-rose-400/60'
                        } ${c1Reversed ? 'bg-blue-600 text-white' : 'bg-rose-600 text-white'}`}
                      >
                        {c1Reversed ? '-' : '+'}
                      </button>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {c1Reversed ? 'ขั้วลบ' : 'ขั้วบวก'}
                      </span>
                    </div>

                    <div className="flex flex-col items-center gap-1">
                      <button
                        id="terminal-node-cell_1_neg"
                        onClick={() => handleTerminalClick('cell_1_neg')}
                        className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all ring-4 ${
                          activeTerminalId === 'cell_1_neg'
                            ? 'ring-white scale-110'
                            : 'ring-blue-500/30 hover:ring-blue-400/60'
                        } ${c1Reversed ? 'bg-rose-600 text-white' : 'bg-blue-600 text-white'}`}
                      >
                        {c1Reversed ? '+' : '-'}
                      </button>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {c1Reversed ? 'ขั้วบวก' : 'ขั้วลบ'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Cell 2 */}
                <div className="bg-slate-900/90 border border-slate-700/80 rounded-xl p-3 shadow-lg relative group">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      ถ่าน AA #2 (1.5V)
                    </span>
                    <button
                      onClick={handleFlipCell2}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition text-[10px] flex items-center gap-1"
                      title="สลับขั้วถ่าน"
                    >
                      <RotateCw className="w-3 h-3 text-indigo-400" />
                      <span>กลับขั้ว</span>
                    </button>
                  </div>

                  <BatteryCell3D
                    voltage={1.5}
                    label="AA #2 1.5V"
                    isReversed={c2Reversed}
                    isActive={liveValidation.isLampLit}
                    size="sm"
                    onFlip={handleFlipCell2}
                  />

                  {/* Terminal Nodes */}
                  <div className="flex items-center justify-between px-2 pt-2">
                    <div className="flex flex-col items-center gap-1">
                      <button
                        id="terminal-node-cell_2_pos"
                        onClick={() => handleTerminalClick('cell_2_pos')}
                        className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all ring-4 ${
                          activeTerminalId === 'cell_2_pos'
                            ? 'ring-white scale-110'
                            : 'ring-rose-500/30 hover:ring-rose-400/60'
                        } ${c2Reversed ? 'bg-blue-600 text-white' : 'bg-rose-600 text-white'}`}
                      >
                        {c2Reversed ? '-' : '+'}
                      </button>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {c2Reversed ? 'ขั้วลบ' : 'ขั้วบวก'}
                      </span>
                    </div>

                    <div className="flex flex-col items-center gap-1">
                      <button
                        id="terminal-node-cell_2_neg"
                        onClick={() => handleTerminalClick('cell_2_neg')}
                        className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all ring-4 ${
                          activeTerminalId === 'cell_2_neg'
                            ? 'ring-white scale-110'
                            : 'ring-blue-500/30 hover:ring-blue-400/60'
                        } ${c2Reversed ? 'bg-rose-600 text-white' : 'bg-blue-600 text-white'}`}
                      >
                        {c2Reversed ? '+' : '-'}
                      </button>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {c2Reversed ? 'ขั้วบวก' : 'ขั้วลบ'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Column 2: 3D Knife Switch Component */}
              <div className="flex flex-col justify-center">
                <div className="bg-slate-900/90 border border-slate-700/80 rounded-xl p-4 shadow-lg flex flex-col items-center text-center">
                  <div className="flex items-center justify-between w-full mb-2">
                    <span className="text-xs font-bold text-slate-300">สวิตช์ตัดต่อวงจร 3 มิติ</span>
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded ${
                        isSwitchClosed ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                      }`}
                    >
                      {isSwitchClosed ? 'ON (สับลง)' : 'OFF (ยกขึ้น)'}
                    </span>
                  </div>

                  <div className="w-full">
                    <KnifeSwitch3D
                      isClosed={isSwitchClosed}
                      isActive={liveValidation.isLampLit}
                      isShortCircuit={liveValidation.isShortCircuit}
                      size="lg"
                      onToggle={handleToggleSwitch}
                    />
                  </div>

                  {/* Terminals IN & OUT */}
                  <div className="flex items-center justify-between w-full mt-3 px-2">
                    <div className="flex flex-col items-center gap-1">
                      <button
                        id="terminal-node-sw_1_in"
                        onClick={() => handleTerminalClick('sw_1_in')}
                        className={`w-9 h-9 rounded-full bg-amber-600 text-white font-bold text-xs ring-4 transition ${
                          activeTerminalId === 'sw_1_in'
                            ? 'ring-white scale-110'
                            : 'ring-amber-500/30 hover:ring-amber-400/60'
                        }`}
                      >
                        IN
                      </button>
                      <span className="text-[10px] text-slate-400">ขั้วเข้า</span>
                    </div>

                    <div className="flex flex-col items-center gap-1">
                      <button
                        id="terminal-node-sw_1_out"
                        onClick={() => handleTerminalClick('sw_1_out')}
                        className={`w-9 h-9 rounded-full bg-amber-700 text-white font-bold text-xs ring-4 transition ${
                          activeTerminalId === 'sw_1_out'
                            ? 'ring-white scale-110'
                            : 'ring-amber-500/30 hover:ring-amber-400/60'
                        }`}
                      >
                        OUT
                      </button>
                      <span className="text-[10px] text-slate-400">ขั้วออก</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Column 3: 3.0V Light Bulb */}
              <div className="flex flex-col justify-center">
                <div className="bg-slate-900/90 border border-slate-700/80 rounded-xl p-4 shadow-lg flex flex-col items-center text-center relative overflow-hidden">
                  <div className="flex items-center justify-between w-full mb-2">
                    <span className="text-xs font-bold text-slate-300">หลอดไฟโหลด (3.0V) 3 มิติ</span>
                    <span className="text-[10px] text-indigo-400 font-mono">พิกัด: 3.0V 0.5A</span>
                  </div>

                  <div className="w-full">
                    <LightBulb3D
                      brightness={liveValidation.bulbBrightness}
                      voltage={liveValidation.measuredVoltage}
                      ratedVoltage={3.0}
                      size="lg"
                    />
                  </div>

                  <span className="text-xs font-bold mt-2">
                    {liveValidation.isLampLit
                      ? liveValidation.bulbBrightness >= 0.8
                        ? '🔥 สว่างเต็มที่ 100% (3.0V / 1.50W)'
                        : '💡 สว่างสลัว 40% (1.5V / 0.38W)'
                      : 'ดับสนิท (0.0V)'}
                  </span>

                  {/* Bulb Terminals */}
                  <div className="flex items-center justify-between w-full mt-3 px-2">
                    <div className="flex flex-col items-center gap-1">
                      <button
                        id="terminal-node-bulb_1_a"
                        onClick={() => handleTerminalClick('bulb_1_a')}
                        className={`w-9 h-9 rounded-full bg-yellow-500 text-slate-950 font-bold text-xs ring-4 transition ${
                          activeTerminalId === 'bulb_1_a'
                            ? 'ring-white scale-110'
                            : 'ring-yellow-400/30 hover:ring-yellow-400/60'
                        }`}
                      >
                        A
                      </button>
                      <span className="text-[10px] text-slate-400">ขั้ว A</span>
                    </div>

                    <div className="flex flex-col items-center gap-1">
                      <button
                        id="terminal-node-bulb_1_b"
                        onClick={() => handleTerminalClick('bulb_1_b')}
                        className={`w-9 h-9 rounded-full bg-yellow-600 text-slate-950 font-bold text-xs ring-4 transition ${
                          activeTerminalId === 'bulb_1_b'
                            ? 'ring-white scale-110'
                            : 'ring-yellow-400/30 hover:ring-yellow-400/60'
                        }`}
                      >
                        B
                      </button>
                      <span className="text-[10px] text-slate-400">ขั้ว B</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Live Feedback Bar */}
            <div
              className={`relative z-10 mt-4 p-3 rounded-xl border flex items-center gap-3 transition-colors ${
                liveValidation.alertType === 'danger'
                  ? 'bg-rose-950/70 border-rose-600/80 text-rose-200'
                  : liveValidation.alertType === 'warning'
                  ? 'bg-amber-950/70 border-amber-600/80 text-amber-200'
                  : liveValidation.alertType === 'success'
                  ? 'bg-emerald-950/70 border-emerald-600/80 text-emerald-200'
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
                <span className="font-bold mr-1">สถานะวงจรสด:</span>
                <span>{liveValidation.statusMessage}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel: Voltmeter & Scientific Analysis (4 Cols) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          {/* Voltmeter Instrument Box */}
          <div className="bg-slate-900/90 border border-indigo-500/30 rounded-2xl p-4 shadow-xl flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-black text-indigo-300 flex items-center gap-1.5 uppercase tracking-wider">
                <Gauge className="w-4 h-4 text-emerald-400" />
                โวลต์มิเตอร์วัดแรงดันสะสม (Pack Voltmeter)
              </span>
              <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded">
                DIGITAL MULTIMETER
              </span>
            </div>

            {/* Big LED Display */}
            <div className="bg-slate-950 rounded-xl p-3 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-400 block font-medium">
                  แรงดันไฟฟ้าที่วัดได้ (V_pack)
                </span>
                <div className="text-3xl font-black font-mono text-emerald-400 tracking-wider">
                  {liveValidation.measuredVoltage.toFixed(2)}
                  <span className="text-base font-normal ml-1 text-emerald-500">V</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-slate-400 block font-medium">
                  เซลล์ในระบบ
                </span>
                <span className="text-sm font-bold text-indigo-300">
                  {liveValidation.cellsInCircuitCount} ก้อน (AA 1.5V)
                </span>
              </div>
            </div>

            {/* Electrical Parameters Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 block text-[10px]">กระแสไฟฟ้า (I = V/R)</span>
                <span className="font-mono font-bold text-amber-300 text-sm">
                  {liveValidation.currentAmps.toFixed(2)} A
                </span>
              </div>
              <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 block text-[10px]">กำลังไฟฟ้า (P = V×I)</span>
                <span className="font-mono font-bold text-purple-300 text-sm">
                  {liveValidation.powerWatts.toFixed(2)} W
                </span>
              </div>
              <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 block text-[10px]">ความต้านทานโหลด</span>
                <span className="font-mono font-bold text-slate-300 text-sm">
                  {liveValidation.resistance} Ω
                </span>
              </div>
              <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 block text-[10px]">ความจุรวม (mAh)</span>
                <span className="font-mono font-bold text-cyan-300 text-sm">
                  2000 mAh
                </span>
              </div>
            </div>
          </div>

          {/* Scientific Principle Card */}
          <div className="bg-gradient-to-br from-indigo-950/60 to-slate-900 border border-indigo-500/20 rounded-2xl p-4 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-indigo-300 font-bold text-xs">
              <Layers className="w-4 h-4 text-indigo-400" />
              <span>หลักการฟิสิกส์: วงจรอนุกรม (Series Connection)</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              เมื่อต่อถ่านแบบหัวต่อท้าย (+ ของก้อนหนึ่งต่อกับ - ของอีกก้อนหนึ่ง) แรงดันไฟฟ้าของเซลล์จะถูกนำมารวมกัน:
            </p>
            <div className="bg-slate-950/80 p-2.5 rounded-lg border border-indigo-900/60 font-mono text-center text-xs text-emerald-400 font-bold">
              V_total = V1 + V2 = 1.5V + 1.5V = 3.0V
            </div>
            <p className="text-[11px] text-slate-400">
              *ข้อควรจำ: การต่ออนุกรมเพิ่มแรงดันไฟฟ้า แต่ความจุรวม (mAh) ยังคงเท่ากับเซลล์เดี่ยวคือ 2000 mAh
            </p>
          </div>

          {/* VOLT Robot Tutor Dialog */}
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
                ? 'ยอดเยี่ยมมากครับ! ต่ออนุกรม 2 ก้อนได้แรงดัน 3.0V พอดิบพอดีกับหลอดไฟ 3.0V สว่างเต็มพิกัด 100% เลย!'
                : liveValidation.hint
            }
          />
        </div>
      </div>

      {/* Comparison Modal */}
      {showCompareModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-indigo-500/40 rounded-2xl max-w-lg w-full p-6 shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-amber-400" />
                <h3 className="font-black text-sm text-indigo-200">
                  การเปรียบเทียบ: ใช้ถ่าน 1 ก้อน VS ใช้ถ่าน 2 ก้อนอนุกรม
                </h3>
              </div>
              <button
                onClick={() => setShowCompareModal(false)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded bg-slate-800"
              >
                ปิด
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              {/* Option A: 1 Cell */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-col gap-2">
                <span className="font-bold text-amber-400">แบบ 1 ก้อน (1.5V)</span>
                <div className="text-[11px] text-slate-300 space-y-1">
                  <div>แรงดัน: <span className="font-mono text-emerald-400">1.5V</span></div>
                  <div>กระแส (I = V/R): <span className="font-mono text-amber-400">0.25A</span></div>
                  <div>กำลังไฟ: <span className="font-mono text-purple-400">0.38W</span></div>
                  <div>ความสว่าง: <span className="text-amber-500">สลัว (40%)</span></div>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  แรงดันไม่ถึงพิกัด 3.0V ของหลอดไฟ ทำให้กระแสไหลไม่พอ ไส้หลอดจึงไม่ร้อนจนสว่างเต็มที่
                </p>
              </div>

              {/* Option B: 2 Cells Series */}
              <div className="bg-slate-950 p-3 rounded-xl border border-emerald-500/40 flex flex-col gap-2">
                <span className="font-bold text-emerald-400">แบบ 2 ก้อนอนุกรม (3.0V)</span>
                <div className="text-[11px] text-slate-300 space-y-1">
                  <div>แรงดัน: <span className="font-mono text-emerald-400">3.0V</span> (1.5V + 1.5V)</div>
                  <div>กระแส (I = V/R): <span className="font-mono text-amber-400">0.50A</span></div>
                  <div>กำลังไฟ: <span className="font-mono text-purple-400">1.50W</span> (4 เท่า!)</div>
                  <div>ความสว่าง: <span className="text-yellow-300">สว่างเต็ม 100%</span></div>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  กำลังไฟ P แปรผันตาม V² (เมื่อแรงดันเพิ่ม 2 เท่า กำลังไฟสว่างจะเพิ่มขึ้นเป็น 4 เท่า!)
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowCompareModal(false)}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition"
            >
              เข้าใจแล้ว
            </button>
          </div>
        </div>
      )}

      {/* Hint Modal */}
      {showHintModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/40 rounded-2xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-2 text-amber-400 font-black text-sm">
              <HelpCircle className="w-5 h-5" />
              <span>คำใบ้จากหุ่นยนต์ VOLT</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              1. ลากสายไฟเชื่อมระหว่าง <strong>ขั้วบวก (+) ของถ่านก้อนที่ 1</strong> ไปยัง <strong>ขั้วลบ (-) ของถ่านก้อนที่ 2</strong> เพื่อทำสะพานอนุกรม<br />
              2. ลากสายไฟจาก <strong>ขั้วบวก (+) ของถ่านก้อนที่ 2</strong> ไปยัง <strong>ขั้วเข้า (IN) ของสวิตช์</strong><br />
              3. ลากสายไฟจาก <strong>ขั้วออก (OUT) ของสวิตช์</strong> ไปยัง <strong>ขั้ว A ของหลอดไฟ</strong><br />
              4. ลากสายไฟจาก <strong>ขั้ว B ของหลอดไฟ</strong> กลับมายัง <strong>ขั้วลบ (-) ของถ่านก้อนที่ 1</strong>
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

      {/* Success Celebration Overlay */}
      {showCelebration && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-gradient-to-b from-slate-900 to-indigo-950 border-2 border-emerald-400/80 rounded-3xl max-w-md w-full p-6 shadow-2xl text-center flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/30">
              <Sparkles className="w-8 h-8" />
            </div>

            <div>
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/20 px-3 py-1 rounded-full">
                ภารกิจสำเร็จ! +100 EXP
              </span>
              <h2 className="text-xl font-black text-white mt-2">
                ผ่านการทดลองวงจรอนุกรมแล้ว!
              </h2>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                คุณได้พิสูจน์แล้วว่าการต่อถ่านแบบหัวต่อท้าย (+ ชน -) นำแรงดัน 1.5V มารวมกันเป็น 3.0V ทำให้หลอดไฟขนาด 3.0V ติดสว่างเต็มที่ พร้อมปลดล็อกภารกิจถัดไป: <strong>วงจรขนาน (Parallel Lab)</strong>!
              </p>
            </div>

            <div className="w-full flex flex-col gap-2 mt-2">
              <button
                onClick={() => goToScene('parallel_lab')}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2 transition"
              >
                <span>ไปต่อที่ LAB-03: วงจรขนาน</span>
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

      {/* Digital Multimeter Simulator */}
      <DigitalMultimeter
        isOpen={showMultimeter}
        onClose={() => setShowMultimeter(false)}
        testPoints={testPoints}
        circuitIsClosed={isSwitchClosed}
      />
    </div>
  );
};
