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
  Trash2,
  Scissors,
  Star,
  Info,
} from 'lucide-react';
import { useGameState } from '../../context/GameStateContext';
import {
  validateBasicCircuit,
  BasicCircuitValidation,
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
    // Ignore audio error
  }
};

export const BasicCircuitLabScreen: React.FC = () => {
  const { goToScene, completeMission } = useGameState();

  const [placedComponents, setPlacedComponents] = useState<Record<string, boolean>>({
    cell_1: true,
    sw_1: true,
    bulb_1: true,
  });

  const [isSwitchClosed, setIsSwitchClosed] = useState<boolean>(true);
  const [isBatteryReversed, setIsBatteryReversed] = useState<boolean>(false);

  const [wires, setWires] = useState<CircuitWire[]>([
    { id: 'w1', fromTerminalId: 'cell_1_pos', toTerminalId: 'sw_1_in', color: '#ef4444' },
    { id: 'w2', fromTerminalId: 'sw_1_out', toTerminalId: 'bulb_1_a', color: '#f59e0b' },
    { id: 'w3', fromTerminalId: 'bulb_1_b', toTerminalId: 'cell_1_neg', color: '#3b82f6' },
  ]);

  const [history, setHistory] = useState<CircuitWire[][]>([]);
  const [activeTerminalId, setActiveTerminalId] = useState<string | null>(null);

  const [hasTested, setHasTested] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<BasicCircuitValidation | null>(null);
  const [showCelebration, setShowCelebration] = useState<boolean>(false);
  const [showHintModal, setShowHintModal] = useState<boolean>(false);
  const [showMultimeter, setShowMultimeter] = useState<boolean>(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);

  const testPoints: TestPoint[] = useMemo(() => {
    const vBatt = isBatteryReversed ? -1.5 : 1.5;
    return [
      { id: 'tp_cell_pos', name: 'ขั้วบวกเซลล์ (+)', voltagePotential: vBatt },
      { id: 'tp_sw_in', name: 'ขาสวิตช์ขาเข้า (Switch In)', voltagePotential: vBatt },
      { id: 'tp_sw_out', name: 'ขาสวิตช์ขาออก (Switch Out)', voltagePotential: isSwitchClosed ? vBatt : 0.0 },
      { id: 'tp_bulb_in', name: 'ขั้วหลอดไฟ (Lamp In)', voltagePotential: isSwitchClosed ? vBatt : 0.0 },
      { id: 'tp_cell_neg', name: 'ขั้วลบเซลล์ (-) กราวด์', voltagePotential: 0.0, isGround: true },
    ];
  }, [isBatteryReversed, isSwitchClosed]);

  const [terminalCoords, setTerminalCoords] = useState<Record<string, { x: number; y: number }>>({});
  const workbenchRef = useRef<HTMLDivElement | null>(null);

  const activeComponents = useMemo<CircuitComponent[]>(() => {
    const list: CircuitComponent[] = [];
    if (placedComponents.cell_1) {
      list.push({
        id: 'cell_1',
        type: 'battery_cell',
        name: 'เซลล์ AA 1.5V',
        x: 100,
        y: 100,
        terminals: [
          { id: 'cell_1_pos', componentId: 'cell_1', label: '+', polarity: 'positive', x: 0, y: 0 },
          { id: 'cell_1_neg', componentId: 'cell_1', label: '-', polarity: 'negative', x: 0, y: 0 },
        ],
        properties: {
          voltage: 1.5,
          capacityMah: 2000,
          isReversed: isBatteryReversed,
        },
      });
    }
    if (placedComponents.sw_1) {
      list.push({
        id: 'sw_1',
        type: 'switch',
        name: 'สวิตช์ควบคุม',
        x: 200,
        y: 100,
        terminals: [
          { id: 'sw_1_in', componentId: 'sw_1', label: 'IN', polarity: 'neutral', x: 0, y: 0 },
          { id: 'sw_1_out', componentId: 'sw_1', label: 'OUT', polarity: 'neutral', x: 0, y: 0 },
        ],
        properties: {
          isClosed: isSwitchClosed,
        },
      });
    }
    if (placedComponents.bulb_1) {
      list.push({
        id: 'bulb_1',
        type: 'light_bulb',
        name: 'หลอดไฟ 1.5V',
        x: 300,
        y: 100,
        terminals: [
          { id: 'bulb_1_a', componentId: 'bulb_1', label: 'A', polarity: 'neutral', x: 0, y: 0 },
          { id: 'bulb_1_b', componentId: 'bulb_1', label: 'B', polarity: 'neutral', x: 0, y: 0 },
        ],
        properties: {
          resistance: 3.0,
          ratedVoltage: 1.5,
        },
      });
    }
    return list;
  }, [placedComponents, isBatteryReversed, isSwitchClosed]);

  const liveValidation = useMemo<BasicCircuitValidation>(() => {
    return validateBasicCircuit(activeComponents, wires);
  }, [activeComponents, wires]);

  const terminalMeta: Record<string, { label: string; componentName: string; color: string }> = {
    cell_1_pos: {
      label: isBatteryReversed ? 'ขั้วลบ (-)' : 'ขั้วบวก (+)',
      componentName: 'ถ่าน AA',
      color: 'bg-rose-500 text-white border-rose-300 ring-rose-500/50',
    },
    cell_1_neg: {
      label: isBatteryReversed ? 'ขั้วบวก (+)' : 'ขั้วลบ (-)',
      componentName: 'ถ่าน AA',
      color: 'bg-blue-500 text-white border-blue-300 ring-blue-500/50',
    },
    sw_1_in: {
      label: 'ขั้ว IN',
      componentName: 'สวิตช์',
      color: 'bg-amber-500 text-slate-950 border-amber-300 ring-amber-500/50',
    },
    sw_1_out: {
      label: 'ขั้ว OUT',
      componentName: 'สวิตช์',
      color: 'bg-amber-500 text-slate-950 border-amber-300 ring-amber-500/50',
    },
    bulb_1_a: {
      label: 'ขั้ว A',
      componentName: 'หลอดไฟ',
      color: 'bg-emerald-500 text-white border-emerald-300 ring-emerald-500/50',
    },
    bulb_1_b: {
      label: 'ขั้ว B',
      componentName: 'หลอดไฟ',
      color: 'bg-emerald-500 text-white border-emerald-300 ring-emerald-500/50',
    },
  };

  const updateTerminalPositions = () => {
    if (!workbenchRef.current) return;
    const wbRect = workbenchRef.current.getBoundingClientRect();
    const newCoords: Record<string, { x: number; y: number }> = {};
    const terminalElements = workbenchRef.current.querySelectorAll<HTMLElement>('[data-terminal-id]');
    terminalElements.forEach((el) => {
      const id = el.getAttribute('data-terminal-id');
      if (id) {
        const rect = el.getBoundingClientRect();
        newCoords[id] = {
          x: rect.left + rect.width / 2 - wbRect.left,
          y: rect.top + rect.height / 2 - wbRect.top,
        };
      }
    });
    setTerminalCoords(newCoords);
  };

  useEffect(() => {
    updateTerminalPositions();
    window.addEventListener('resize', updateTerminalPositions);
    const timer = setTimeout(updateTerminalPositions, 100);
    return () => {
      window.removeEventListener('resize', updateTerminalPositions);
      clearTimeout(timer);
    };
  }, [placedComponents, wires, isSwitchClosed, isBatteryReversed]);

  const handleTerminalClick = (terminalId: string) => {
    if (!activeTerminalId) {
      setActiveTerminalId(terminalId);
      playTone(440, 'sine', 0.08);
      return;
    }
    if (activeTerminalId === terminalId) {
      setActiveTerminalId(null);
      return;
    }
    const exists = wires.some(
      (w) =>
        (w.fromTerminalId === activeTerminalId && w.toTerminalId === terminalId) ||
        (w.fromTerminalId === terminalId && w.toTerminalId === activeTerminalId)
    );
    if (exists) {
      setActiveTerminalId(null);
      return;
    }

    setHistory((prev) => [...prev, wires]);

    let wireColor = '#f59e0b';
    if (activeTerminalId.includes('pos') || terminalId.includes('pos')) wireColor = '#ef4444';
    else if (activeTerminalId.includes('neg') || terminalId.includes('neg')) wireColor = '#3b82f6';

    const newWire: CircuitWire = {
      id: `w_${Date.now()}`,
      fromTerminalId: activeTerminalId,
      toTerminalId: terminalId,
      color: wireColor,
    };

    setWires((prev) => [...prev, newWire]);
    setActiveTerminalId(null);
    playTone(660, 'sine', 0.12);
  };

  const handleRemoveWire = (wireId: string) => {
    setHistory((prev) => [...prev, wires]);
    setWires((prev) => prev.filter((w) => w.id !== wireId));
    playTone(330, 'triangle', 0.1);
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));
    setWires(previous);
    playTone(400, 'sine', 0.08);
  };

  const handleReset = () => {
    setHistory((prev) => [...prev, wires]);
    setWires([]);
    setActiveTerminalId(null);
    setHasTested(false);
    playTone(280, 'sine', 0.15);
  };

  const handleToggleSwitch = () => {
    setIsSwitchClosed((prev) => !prev);
    playTone(isSwitchClosed ? 350 : 580, 'square', 0.08);
  };

  const handleFlipBattery = () => {
    setIsBatteryReversed((prev) => !prev);
    playTone(500, 'triangle', 0.1);
  };

  const handleTestCircuit = () => {
    setHasTested(true);
    setTestResult(liveValidation);
    if (liveValidation.isShortCircuit) {
      playTone(150, 'sawtooth', 0.4);
      return;
    }
    if (liveValidation.isSuccess && liveValidation.isLampLit) {
      playTone(880, 'sine', 0.25);
      setTimeout(() => playTone(1100, 'sine', 0.35), 150);
      completeMission('m1', 3);
      setShowCelebration(true);
    } else {
      playTone(300, 'triangle', 0.2);
    }
  };

  const handleSaveCircuit = () => {
    try {
      const snapshot = {
        wires,
        isSwitchClosed,
        isBatteryReversed,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem('battery_quest_lab01_saved_circuit', JSON.stringify(snapshot));
      setSaveToast('บันทึกแบบจำลองวงจรสำเร็จเรียบร้อย!');
      setTimeout(() => setSaveToast(null), 3000);
      playTone(750, 'sine', 0.12);
    } catch {
      setSaveToast('ไม่สามารถบันทึกลงในหน่วยความจำได้');
      setTimeout(() => setSaveToast(null), 3000);
    }
  };

  const isLampGlow = liveValidation.isLampLit && !liveValidation.isShortCircuit;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-sky-50 to-indigo-50/40 text-slate-800 p-3 sm:p-5 space-y-4 font-sans select-none pb-12">
      {/* Header */}
      <div className="max-w-7xl mx-auto bg-white/95 border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => goToScene('mission_map')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-all text-xs sm:text-sm font-semibold active:scale-95 shrink-0 cursor-pointer"
            title="กลับสู่แผนที่ภารกิจ"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>แผนที่ภารกิจ</span>
          </button>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200">
                ฉากที่ 6 · LAB-01
              </span>
              <span className="text-[11px] text-slate-500 font-medium">วงจรไฟฟ้ากระแสตรงพื้นฐาน</span>
            </div>
            <h1 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2 mt-0.5">
              <Zap className="w-5 h-5 text-amber-500 shrink-0" />
              <span>ห้องทดลองวงจรปิดพื้นฐาน (Basic Circuit Lab)</span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
          <button
            type="button"
            onClick={() => setShowMultimeter(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold transition shadow-sm cursor-pointer active:scale-95"
            title="เปิดมัลติมิเตอร์วัดแรงดัน"
          >
            <span>🎛️ มัลติมิเตอร์ (DMM)</span>
          </button>

          <button
            onClick={() => setShowHintModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold transition-all cursor-pointer"
          >
            <HelpCircle className="w-4 h-4 text-amber-500" />
            <span>คำใบ้</span>
          </button>

          <button
            onClick={() => goToScene('series_lab')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs font-bold shadow-sm shadow-sky-500/20 transition-all cursor-pointer"
          >
            <span>Lab 2: วงจรอนุกรม</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {saveToast && (
        <div className="max-w-7xl mx-auto p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center justify-between shadow-sm">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            {saveToast}
          </span>
          <button onClick={() => setSaveToast(null)} className="text-emerald-700 font-bold ml-2">✕</button>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        <VoltDialog
          mood={
            liveValidation.isShortCircuit
              ? 'warning'
              : isLampGlow
              ? 'excited'
              : !isSwitchClosed && liveValidation.isLampInCircuit
              ? 'thinking'
              : 'idea'
          }
          title={
            liveValidation.isShortCircuit
              ? 'VOLT ตรวจพบไฟฟ้าลัดวงจร!'
              : isLampGlow
              ? 'VOLT ชื่นชม: วงจรทำงานสมบูรณ์แบบ!'
              : 'VOLT แนะนำการต่อวงจร'
          }
          message={liveValidation.statusMessage}
          hint={liveValidation.hint}
        />
      </div>

      {/* Main Grid: Workbench + Telemetry */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <div className="lg:col-span-8 space-y-3">
          <div className="bg-white/95 border border-slate-200/90 rounded-2xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs shadow-sm">
            <div className="flex items-center gap-2 text-slate-700 font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>โต๊ะทดลองวิศวกรรมไฟฟ้า (Interactive Electronics Workbench)</span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={handleUndo}
                disabled={history.length === 0}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 border border-slate-200 transition font-medium"
              >
                <Undo2 className="w-3.5 h-3.5" />
                <span>เลิกทำ</span>
              </button>

              <button
                onClick={handleReset}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition font-medium"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>รีเซ็ต</span>
              </button>

              <button
                onClick={handleSaveCircuit}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition font-bold"
              >
                <Save className="w-3.5 h-3.5" />
                <span>บันทึก</span>
              </button>
            </div>
          </div>

          {activeTerminalId && (
            <div className="p-2.5 rounded-xl bg-amber-100 border border-amber-300 text-amber-900 text-xs flex items-center justify-between animate-pulse">
              <span>
                เลือกต้นทางแล้ว: <strong>{terminalMeta[activeTerminalId]?.label}</strong> &rarr; แตะขั้วปลายทางเพื่อต่อสายไฟ
              </span>
              <button
                onClick={() => setActiveTerminalId(null)}
                className="px-2 py-0.5 rounded bg-white text-slate-700 text-[10px] font-bold border border-slate-300"
              >
                ยกเลิก
              </button>
            </div>
          )}

          {/* Workbench Canvas Mat */}
          <div
            ref={workbenchRef}
            className={`relative w-full min-h-[380px] rounded-3xl border-2 transition-all overflow-hidden p-4 sm:p-6 flex flex-col justify-between select-none ${
              liveValidation.isShortCircuit
                ? 'bg-gradient-to-b from-rose-50 to-white border-rose-400 shadow-md'
                : isLampGlow
                ? 'bg-gradient-to-b from-amber-50/60 to-white border-amber-300 shadow-md'
                : 'bg-white/95 border-slate-200 shadow-sm'
            }`}
          >
            <div className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-widest pointer-events-none">
              CIRCUIT WORKBENCH · DC 1.5V MAX · RESISTANCE BOARD
            </div>

            {liveValidation.isShortCircuit && (
              <div className="absolute inset-0 bg-rose-500/20 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center p-4 pointer-events-none">
                <div className="bg-white border-2 border-rose-500 text-slate-800 p-4 rounded-2xl max-w-md text-center shadow-xl space-y-2">
                  <div className="flex items-center justify-center gap-2 text-rose-600 font-black text-base">
                    <Flame className="w-6 h-6 text-rose-500 animate-bounce" />
                    <span>ตรวจพบไฟฟ้าลัดวงจร (SHORT CIRCUIT!)</span>
                  </div>
                  <p className="text-xs text-slate-600 font-medium">
                    ขั้วบวกต่อตรงกับขั้วลบโดยไม่มีหลอดไฟคั่น ระบบนิรภัยได้ตัดการทำงานชั่วคราว
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10 my-auto py-4">
              {/* 3D Battery Cell */}
              <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-50/90 border border-slate-200/90 shadow-sm space-y-2">
                <div className="text-xs font-bold text-slate-700">เซลล์ AA 1.5V (2000 mAh)</div>
                <div className="w-full">
                  <BatteryCell3D
                    voltage={1.5}
                    label="AA 1.50V"
                    isReversed={isBatteryReversed}
                    isActive={isLampGlow}
                    size="md"
                    onFlip={handleFlipBattery}
                  />
                </div>

                <div className="flex items-center justify-between w-full px-2 pt-1">
                  <button
                    data-terminal-id="cell_1_pos"
                    onClick={() => handleTerminalClick('cell_1_pos')}
                    className={`px-3 py-2 rounded-xl text-xs font-extrabold border-2 transition-all ${
                      activeTerminalId === 'cell_1_pos'
                        ? 'bg-rose-500 text-white border-white ring-2 ring-rose-500'
                        : 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100'
                    }`}
                  >
                    <span>{isBatteryReversed ? '(-)' : '(+)'}</span>
                  </button>

                  <button
                    onClick={handleFlipBattery}
                    className="p-1.5 rounded-lg bg-white hover:bg-slate-100 text-amber-700 text-[10px] font-bold flex items-center gap-1 border border-slate-200 shadow-sm"
                  >
                    <RotateCw className="w-3 h-3" />
                    <span>กลับขั้ว</span>
                  </button>

                  <button
                    data-terminal-id="cell_1_neg"
                    onClick={() => handleTerminalClick('cell_1_neg')}
                    className={`px-3 py-2 rounded-xl text-xs font-extrabold border-2 transition-all ${
                      activeTerminalId === 'cell_1_neg'
                        ? 'bg-blue-500 text-white border-white ring-2 ring-blue-500'
                        : 'bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100'
                    }`}
                  >
                    <span>{isBatteryReversed ? '(+)' : '(-)'}</span>
                  </button>
                </div>
              </div>

              {/* 3D Knife Switch */}
              <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-50/90 border border-slate-200/90 shadow-sm space-y-2">
                <div className="text-xs font-bold text-slate-700">สวิตช์ควบคุม (Knife Switch 3D)</div>
                <div className="w-full">
                  <KnifeSwitch3D
                    isClosed={isSwitchClosed}
                    isActive={isLampGlow}
                    isShortCircuit={liveValidation.isShortCircuit}
                    size="md"
                    onToggle={handleToggleSwitch}
                  />
                </div>

                <div className="flex items-center justify-between w-full px-2 pt-1">
                  <button
                    data-terminal-id="sw_1_in"
                    onClick={() => handleTerminalClick('sw_1_in')}
                    className={`px-3 py-2 rounded-xl text-xs font-extrabold border-2 transition-all ${
                      activeTerminalId === 'sw_1_in'
                        ? 'bg-amber-500 text-slate-950 border-white ring-2 ring-amber-500'
                        : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                    }`}
                  >
                    IN
                  </button>
                  <span className="text-[11px] text-slate-400 font-mono">⟷</span>
                  <button
                    data-terminal-id="sw_1_out"
                    onClick={() => handleTerminalClick('sw_1_out')}
                    className={`px-3 py-2 rounded-xl text-xs font-extrabold border-2 transition-all ${
                      activeTerminalId === 'sw_1_out'
                        ? 'bg-amber-500 text-slate-950 border-white ring-2 ring-amber-500'
                        : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                    }`}
                  >
                    OUT
                  </button>
                </div>
              </div>

              {/* 3D Lamp Bulb */}
              <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-50/90 border border-slate-200/90 shadow-sm space-y-2">
                <div className="text-xs font-bold text-slate-700">หลอดไฟทดสอบ (Light Bulb 3D)</div>
                <div className="w-full">
                  <LightBulb3D
                    brightness={isLampGlow ? 1.0 : 0.0}
                    voltage={1.5}
                    ratedVoltage={1.5}
                    size="md"
                  />
                </div>

                <div className="flex items-center justify-between w-full px-2 pt-1">
                  <button
                    data-terminal-id="bulb_1_a"
                    onClick={() => handleTerminalClick('bulb_1_a')}
                    className={`px-3 py-2 rounded-xl text-xs font-extrabold border-2 transition-all ${
                      activeTerminalId === 'bulb_1_a'
                        ? 'bg-emerald-500 text-white border-white ring-2 ring-emerald-500'
                        : 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                    }`}
                  >
                    ขั้ว A
                  </button>
                  <span className="text-[11px] text-slate-400 font-mono">ไส้หลอด</span>
                  <button
                    data-terminal-id="bulb_1_b"
                    onClick={() => handleTerminalClick('bulb_1_b')}
                    className={`px-3 py-2 rounded-xl text-xs font-extrabold border-2 transition-all ${
                      activeTerminalId === 'bulb_1_b'
                        ? 'bg-emerald-500 text-white border-white ring-2 ring-emerald-500'
                        : 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                    }`}
                  >
                    ขั้ว B
                  </button>
                </div>
              </div>
            </div>

            {/* 3D Wires & Connectors Overlay */}
            <Wire3DRenderer
              wires={wires}
              terminalCoords={terminalCoords}
              isEnergized={isLampGlow}
              isShortCircuit={liveValidation.isShortCircuit}
              onRemoveWire={handleRemoveWire}
            />

            {/* Wire Management Strip */}
            {wires.length > 0 && (
              <div className="relative z-20 flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200 text-[11px]">
                <span className="text-slate-500 font-semibold flex items-center gap-1">
                  <Scissors className="w-3.5 h-3.5" />
                  <span>สายไฟในวงจร ({wires.length} เส้น):</span>
                </span>
                {wires.map((wire, idx) => {
                  const fromMeta = terminalMeta[wire.fromTerminalId]?.label || wire.fromTerminalId;
                  const toMeta = terminalMeta[wire.toTerminalId]?.label || wire.toTerminalId;
                  return (
                    <button
                      key={wire.id}
                      onClick={() => handleRemoveWire(wire.id)}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-600 border border-slate-200 hover:border-rose-300 flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: wire.color || '#f59e0b' }} />
                      <span className="font-mono text-[10px] font-bold">{fromMeta} &rarr; {toMeta}</span>
                      <Trash2 className="w-3 h-3 text-rose-500 ml-0.5" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Multimeter / Telemetry */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white/95 border border-slate-200/90 rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wider">
                มัลติมิเตอร์วัดค่าไฟฟ้า (Multimeter)
              </h3>
              <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                REALTIME
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="p-3 rounded-2xl bg-amber-50/80 border border-amber-200">
                <span className="text-[10px] text-amber-800 font-bold block mb-0.5">แรงดันไฟฟ้า (V)</span>
                <span className="font-mono font-black text-amber-900 text-xl">
                  {liveValidation.isShortCircuit ? '0.00' : liveValidation.voltage.toFixed(2)} V
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-sky-50/80 border border-sky-200">
                <span className="text-[10px] text-sky-800 font-bold block mb-0.5">กระแสไฟฟ้า (I = V/R)</span>
                <span className="font-mono font-black text-sky-900 text-xl">
                  {liveValidation.currentAmps.toFixed(2)} A
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-500 font-bold block mb-0.5">ความต้านทาน (R)</span>
                <span className="font-mono font-bold text-slate-800 text-base">
                  {liveValidation.resistance === Infinity ? '∞ Ω' : `${liveValidation.resistance.toFixed(1)} Ω`}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-emerald-50/80 border border-emerald-200">
                <span className="text-[10px] text-emerald-800 font-bold block mb-0.5">กำลังไฟฟ้า (P = VI)</span>
                <span className="font-mono font-bold text-emerald-900 text-base">
                  {liveValidation.powerWatts.toFixed(2)} W
                </span>
              </div>
            </div>

            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-sky-600" />
                <span>หลักการทางวิทยาศาสตร์ (Ohm's Law)</span>
              </label>
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 leading-relaxed font-medium">
                <p>{liveValidation.scientificExplanation}</p>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={handleTestCircuit}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-black text-sm flex items-center justify-center gap-2 shadow-md shadow-amber-500/20 active:scale-98 transition-all cursor-pointer"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>ทดสอบวงจร (Test Circuit)</span>
              </button>
            </div>

            {hasTested && testResult && (
              <div
                className={`p-3 rounded-2xl border text-xs space-y-1 ${
                  testResult.isSuccess && testResult.isLampLit
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                    : testResult.isShortCircuit
                    ? 'bg-rose-50 border-rose-300 text-rose-900'
                    : 'bg-amber-50 border-amber-300 text-amber-900'
                }`}
              >
                <div className="font-black flex items-center gap-1.5">
                  {testResult.isSuccess && testResult.isLampLit ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>ผ่านเกณฑ์การทดสอบ 100%!</span>
                    </>
                  ) : testResult.isShortCircuit ? (
                    <>
                      <ShieldAlert className="w-4 h-4 text-rose-600" />
                      <span>ไม่ผ่าน: ลัดวงจรไม่ปลอดภัย!</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <span>ไม่ผ่าน: วงจรยังไม่สมบูรณ์</span>
                    </>
                  )}
                </div>
                <p className="text-[11px] leading-relaxed font-medium">{testResult.statusMessage}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {showCelebration && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border-2 border-emerald-400 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-center space-y-5 animate-in zoom-in-95">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-sm">
              <Sparkles className="w-8 h-8" />
            </div>
            <div>
              <div className="text-xs font-mono font-bold text-amber-600 tracking-wider">ภารกิจสำเร็จ</div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">ผ่านการทดสอบ LAB-01 แล้ว!</h2>
              <p className="text-xs text-slate-600 mt-2 font-medium">
                คุณต่อวงจรปิดสมบูรณ์สำเร็จ หลอดไฟสว่างตามพิกัด 1.5V และเข้าใจการไหลของกระแสไฟฟ้าแล้ว
              </p>
            </div>
            <div className="flex items-center justify-center gap-2">
              {[1, 2, 3].map((s) => (
                <Star key={s} className="w-7 h-7 fill-amber-400 text-amber-400 drop-shadow-sm" />
              ))}
            </div>
            <div className="flex flex-col gap-2.5 pt-2">
              <button
                onClick={() => goToScene('series_lab')}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-black text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer"
              >
                <span>เข้าสู่ LAB-02: วงจรอนุกรม</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => goToScene('mission_map')}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 transition-all cursor-pointer"
              >
                กลับสู่แผนที่ภารกิจ
              </button>
            </div>
          </div>
        </div>
      )}

      {showHintModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-amber-500" />
                <span>คำใบ้และขั้นตอนจาก VOLT</span>
              </h3>
              <button onClick={() => setShowHintModal(false)} className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer">✕</button>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              ต่อสายไฟจากขั้วบวก (+) ของถ่านไปยังขั้ว IN ของสวิตช์ จากนั้นต่อจากขั้ว OUT ไปยังหลอดไฟ และต่อจากหลอดไฟกลับมายังขั้วลบ (-) ของถ่าน จากนั้นสับสวิตช์ลงแล้วกดปุ่มทดสอบ
            </p>
            <button
              onClick={() => setShowHintModal(false)}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer shadow-sm"
            >
              เข้าใจแล้ว
            </button>
          </div>
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
