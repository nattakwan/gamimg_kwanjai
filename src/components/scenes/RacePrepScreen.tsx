/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Flag,
  Zap,
  Gauge,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  ArrowRight,
  ArrowLeft,
  Users,
  MapPin,
  Flame,
  Award,
  Mountain,
  Milestone,
  Play,
  RotateCcw,
  Sparkles,
  HelpCircle,
  Clock,
  BatteryCharging,
} from 'lucide-react';
import { useGameState } from '../../context/GameStateContext';
import { AvatarRenderer } from '../common/AvatarRenderer';
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
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch {
    // Ignore audio error
  }
};

interface TrackOption {
  id: 'flat_sprint' | 'hill_climb' | 'endurance_route';
  name: string;
  distanceMeters: number;
  elevation: string;
  slopeProfile: string;
  lapCount: number;
  terrainType: string;
  learningObjective: string;
  recommendedStrategy: string;
  gradientBadge: string;
}

const RACE_TRACKS: TrackOption[] = [
  {
    id: 'flat_sprint',
    name: 'แฟลต สปรินต์ (Flat Sprint - 400m)',
    distanceMeters: 400,
    elevation: 'ทางราบเรียบ (0% Slope)',
    slopeProfile: 'ทางตรงความเร็วสูง ไม่มีเนิน เหมาะสำหรับทดสอบอัตราเร่งสูงสุด',
    lapCount: 1,
    terrainType: 'พื้นยางสังเคราะห์ความเร็วสูง (High-Speed Polymer)',
    learningObjective:
      'สังเกตว่าแรงดันพิกัด 3.0V ช่วยให้มอเตอร์ทำความเร็วรอบสูงสุด (RPM) ได้เร็วที่สุดในการแข่งขันระยะสั้น',
    recommendedStrategy: 'เปิดคันเร่งเต็ม 100% พร้อมใช้ไนโตรบูสต์ในช่วง 100 เมตรสุดท้าย',
    gradientBadge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  },
  {
    id: 'hill_climb',
    name: 'ฮิลล์ ไคลมบ์ (Hill Climb - 600m)',
    distanceMeters: 600,
    elevation: 'ทางลาดชันขึ้นเขา (+8% ถึง +12%)',
    slopeProfile: 'ทางไต่เขาชันต่อเนื่อง ต้องใช้แรงบิดมอเตอร์สูงในการเอาชนะแรงโน้มถ่วง',
    lapCount: 1,
    terrainType: 'พื้นคอนกรีตหยาบยึดเกาะสูง (High-Traction Concrete)',
    learningObjective:
      'ศึกษาผลของแรงดันตกคร่อม (Voltage Sag) ใต้ภาระโหลดหนัก: แพ็ก 2S2P (R_in 0.15Ω) จะรักษาแรงดันและไม่ร้อนจัดเท่าแพ็ก 2S1P (R_in 0.30Ω)',
    recommendedStrategy: 'รักษาคันเร่งที่ 80-90% เพื่อหลีกเลี่ยงกระแสโอเวอร์โหลดขณะไต่ทางชัน',
    gradientBadge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  },
  {
    id: 'endurance_route',
    name: 'เอนดูรานซ์ รูท (Endurance Route - 1,200m)',
    distanceMeters: 1200,
    elevation: 'ทางยาวผสมผสาน (3 รอบสนาม)',
    slopeProfile: 'ทางตรงสลับโค้งหักศอกและเนินลอนคลื่น ทดสอบความอึดของประจุแบตเตอรี่',
    lapCount: 3,
    terrainType: 'สนามแข่งแอสฟัลต์มาตรฐานสากล (Academy Grand Prix Circuit)',
    learningObjective:
      'การบริหารประจุแบตเตอรี่ในระยะทางไกล: ชุด 2S2P มีความจุ 4,000 mAh ช่วยให้ไม่หมดพลังงานกลางคันเมื่อเทียบกับชุด 2,000 mAh',
    recommendedStrategy: 'บริหารพลังงานให้สม่ำเสมอ ผ่อนคันเร่งเข้าโค้ง และเร่งเต็มที่ในทางตรง',
    gradientBadge: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
  },
];

interface AIRacer {
  id: string;
  name: string;
  title: string;
  avatarIcon: string;
  batteryInfo: string;
  bikeColor: string;
  strategy: string;
  maxSpeedKmh: number;
}

const AI_RACERS: AIRacer[] = [
  {
    id: 'racer_sam',
    name: 'สปีดี้ แซม (Speedy Sam)',
    title: 'นักซิ่งสายสปรินต์ตัวเบา',
    avatarIcon: '⚡',
    batteryInfo: 'แบตเตอรี่ 2S1P (3.0V 2000mAh)',
    bikeColor: '#ef4444',
    strategy: 'ออกตัวเร็ว น้ำหนักเบา คล่องตัวในระยะสั้น',
    maxSpeedKmh: 28,
  },
  {
    id: 'racer_tina',
    name: 'เทอร์โบ ทีน่า (Turbo Tina)',
    title: 'แชมป์อคาเดมี่ประจำปี',
    avatarIcon: '🚀',
    batteryInfo: 'แบตเตอรี่ 2S2P (3.0V 4000mAh)',
    bikeColor: '#8b5cf6',
    strategy: 'สมดุลทั้งความเร็วรอบและความจุ รักษาเพซสม่ำเสมอ',
    maxSpeedKmh: 31,
  },
  {
    id: 'racer_captain',
    name: 'กัปตัน บิ๊กบล็อก (Captain Big-Block)',
    title: 'ผู้เชี่ยวชาญสนามสมบุกสมบัน',
    avatarIcon: '🛡️',
    batteryInfo: 'แบตเตอรี่ 2S3P High-Grip',
    bikeColor: '#f59e0b',
    strategy: 'เกาะถนนเยี่ยม ไต่เนินแข็งแกร่ง ไม่กลัวทางชัน',
    maxSpeedKmh: 29,
  },
];

export const RacePrepScreen: React.FC = () => {
  const { state, goToScene, updateRaceData } = useGameState();

  const [selectedTrackId, setSelectedTrackId] = useState<'flat_sprint' | 'hill_climb' | 'endurance_route'>('flat_sprint');
  const selectedTrack = RACE_TRACKS.find((t) => t.id === selectedTrackId) || RACE_TRACKS[0];

  // Countdown state
  const [countdownValue, setCountdownValue] = useState<number | null>(null);
  const [countdownText, setCountdownText] = useState<string>('');

  // Installed Pack & Bike Specs
  const packV = state.batteryPack.nominalVoltage || state.batteryPack.totalVoltage || 3.0;
  const packMah = state.batteryPack.nominalCapacityMah || state.batteryPack.totalCapacityMah || 4000;
  const motorRatedV = state.bikeSetup?.motorRatedVoltage || 3.0;
  const bikeTopSpeed = state.bikeSetup?.topSpeedKmh || 32;

  // Validation: Must be 3.0V compatible (<= 3.3V and >= 2.5V)
  const isSetupValid = packV >= 2.5 && packV <= 3.3 && packMah >= 1000;

  // Countdown sequence loop
  useEffect(() => {
    if (countdownValue === null) return;

    if (countdownValue > 0) {
      playTone(440, 'triangle', 0.2);
      setCountdownText(String(countdownValue));
      const timer = setTimeout(() => {
        setCountdownValue((v) => (v !== null ? v - 1 : null));
      }, 900);
      return () => clearTimeout(timer);
    } else if (countdownValue === 0) {
      playTone(880, 'sine', 0.4);
      setCountdownText('ไปเลย! (GO!)');
      const timer = setTimeout(() => {
        // Save selected track info and transition to Racing screen
        updateRaceData({
          selectedTrackId,
          trackName: selectedTrack.name,
          trackDistanceMeters: selectedTrack.distanceMeters,
          rank: 1,
        });
        goToScene('racing');
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [countdownValue, selectedTrackId, selectedTrack, goToScene, updateRaceData]);

  const handleStartCountdown = () => {
    if (!isSetupValid) {
      playTone(180, 'sawtooth', 0.3);
      return;
    }
    setCountdownValue(3);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950 text-white flex flex-col font-sans select-none">
      {/* Top Header */}
      <div className="bg-slate-900/90 border-b border-indigo-500/30 backdrop-blur-md px-4 py-3 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button
            onClick={() => goToScene('bike_garage')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition active:scale-95 min-h-[44px]"
          >
            <ArrowLeft className="w-4 h-4 text-emerald-400" />
            <span>กลับโรงเก็บจักรยาน (Back to Garage)</span>
          </button>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 via-orange-500 to-red-600 flex items-center justify-center font-bold text-sm shadow-md">
              <Flag className="w-4 h-4 text-slate-950 fill-current" />
            </div>
            <div>
              <h1 className="text-sm md:text-base font-black text-amber-200">
                จุดปล่อยตัว: เตรียมความพร้อมก่อนแข่ง (Race Preparation & Starting Grid)
              </h1>
              <p className="text-[11px] text-slate-400">
                เลือกสนามแข่งขัน ตรวจสอบกริดสตาร์ท 4 คัน และเตรียมปล่อยตัวด้วยสัญญาณเคานต์ดาวน์ 3-2-1
              </p>
            </div>
          </div>
        </div>

        {/* Ready / Start Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleStartCountdown}
            disabled={!isSetupValid || countdownValue !== null}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl font-black text-xs md:text-sm shadow-xl transition active:scale-95 min-h-[44px] ${
              isSetupValid
                ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400 hover:brightness-110 text-slate-950 shadow-emerald-500/30'
                : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
            }`}
          >
            <Play className="w-4 h-4 fill-current" />
            <span>พร้อมแข่ง (Ready - Start Race)</span>
          </button>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 p-4 max-w-7xl mx-auto w-full">
        {/* Left Column: Track Selector & Profile Details (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {/* Track Selector Tabs */}
          <div className="bg-slate-900/95 border border-indigo-500/30 rounded-2xl p-4 shadow-xl flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-black text-amber-300 flex items-center gap-1.5 uppercase">
                <MapPin className="w-4 h-4 text-amber-400" />
                เลือกสนามแข่งขัน (Select Race Track)
              </span>
              <span className="text-[10px] text-slate-400 font-mono">3 สนามแข่งขัน</span>
            </div>

            {/* 3 Track Option Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {RACE_TRACKS.map((track) => {
                const isSelected = selectedTrackId === track.id;
                return (
                  <button
                    key={track.id}
                    onClick={() => {
                      playTone(550, 'sine', 0.08);
                      setSelectedTrackId(track.id);
                    }}
                    className={`p-3 rounded-xl border text-left transition flex flex-col justify-between min-h-[85px] ${
                      isSelected
                        ? 'bg-amber-950/70 border-amber-500 text-white shadow-lg ring-2 ring-amber-500/30'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-xs line-clamp-1">{track.name.split('(')[0]}</div>
                      <div className="text-[11px] font-mono text-emerald-400 font-bold mt-0.5">
                        {track.distanceMeters} เมตร
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      {track.elevation}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Active Track Profile Visualization */}
            <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800 flex flex-col gap-3 mt-1">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                    <Milestone className="w-4 h-4 text-amber-400" />
                    {selectedTrack.name}
                  </h3>
                  <p className="text-[11px] text-slate-400">{selectedTrack.slopeProfile}</p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${selectedTrack.gradientBadge}`}>
                  {selectedTrack.elevation}
                </span>
              </div>

              {/* Graphical Elevation Profile SVG */}
              <div className="h-28 bg-slate-900/80 rounded-xl border border-slate-800 p-2 relative flex items-center justify-center overflow-hidden">
                <svg viewBox="0 0 400 100" className="w-full h-full">
                  {/* Grid Lines */}
                  <line x1="0" y1="25" x2="400" y2="25" stroke="#1e293b" strokeDasharray="3 3" />
                  <line x1="0" y1="50" x2="400" y2="50" stroke="#1e293b" strokeDasharray="3 3" />
                  <line x1="0" y1="75" x2="400" y2="75" stroke="#1e293b" strokeDasharray="3 3" />

                  {/* Profile Path */}
                  {selectedTrackId === 'flat_sprint' && (
                    <path
                      d="M 10 75 L 390 75"
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="5"
                      strokeLinecap="round"
                    />
                  )}
                  {selectedTrackId === 'hill_climb' && (
                    <path
                      d="M 10 80 Q 150 75, 220 40 T 390 20"
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="5"
                      strokeLinecap="round"
                    />
                  )}
                  {selectedTrackId === 'endurance_route' && (
                    <path
                      d="M 10 75 Q 80 30, 160 70 T 280 40 T 390 60"
                      fill="none"
                      stroke="#a855f7"
                      strokeWidth="5"
                      strokeLinecap="round"
                    />
                  )}

                  {/* Start & Finish Markers */}
                  <circle cx="20" cy="75" r="5" fill="#38bdf8" />
                  <text x="30" y="79" fill="#38bdf8" fontSize="9" fontWeight="bold">START</text>
                  <circle cx="380" cy={selectedTrackId === 'hill_climb' ? 20 : selectedTrackId === 'endurance_route' ? 60 : 75} r="5" fill="#ef4444" />
                  <text x="340" y={selectedTrackId === 'hill_climb' ? 17 : selectedTrackId === 'endurance_route' ? 57 : 72} fill="#ef4444" fontSize="9" fontWeight="bold">FINISH</text>
                </svg>
              </div>

              {/* Educational Learning Objective Box */}
              <div className="bg-indigo-950/40 p-3 rounded-xl border border-indigo-500/30 flex flex-col gap-1">
                <span className="text-[10px] font-black uppercase text-indigo-300 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  เป้าหมายการเรียนรู้วิทยาศาสตร์ประจำสนามนี้ (Learning Objective)
                </span>
                <p className="text-xs text-slate-200 leading-relaxed">
                  {selectedTrack.learningObjective}
                </p>
                <span className="text-[10px] text-emerald-400 font-mono mt-1">
                  💡 กลยุทธ์แนะนำ: {selectedTrack.recommendedStrategy}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Starting Grid & Compatibility Check (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* Starting Grid (4 Racers in Line) */}
          <div className="bg-slate-900/95 border border-indigo-500/30 rounded-2xl p-4 shadow-xl flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-black text-cyan-300 flex items-center gap-1.5 uppercase">
                <Users className="w-4 h-4 text-cyan-400" />
                กริดสตาร์ท 4 คัน (Starting Grid Lineup)
              </span>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded">
                4 COMPETITORS
              </span>
            </div>

            <div className="space-y-2">
              {/* Grid Slot #1: Player (You) */}
              <div className="bg-gradient-to-r from-cyan-950/80 to-slate-950 p-2.5 rounded-xl border-2 border-cyan-500 flex items-center gap-3 shadow-lg">
                <div className="w-12 h-14 bg-slate-900 rounded-lg p-0.5 border border-cyan-400 shrink-0 overflow-hidden flex items-center justify-center">
                  <AvatarRenderer avatar={state.character} size="sm" mode="2d" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black bg-cyan-500 text-slate-950 px-1.5 py-0.2 rounded font-mono">
                      GRID #1
                    </span>
                    <h4 className="text-xs font-black text-white truncate">
                      {state.character.name} (คุณ)
                    </h4>
                  </div>
                  <div className="text-[11px] font-mono text-emerald-400 mt-0.5 font-bold">
                    {state.batteryPack.name || `แบตเตอรี่ 2S2P (${packV.toFixed(1)}V ${packMah}mAh)`}
                  </div>
                  <span className="text-[10px] text-slate-400 block">
                    ความเร็วสูงสุด: {bikeTopSpeed} กม./ชม. | มอเตอร์ DC 3.0V
                  </span>
                </div>
              </div>

              {/* Grid Slot #2 to #4: AI Competitors */}
              {AI_RACERS.map((racer, idx) => (
                <div
                  key={racer.id}
                  className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800 flex items-center gap-3"
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold shrink-0 shadow-md border"
                    style={{ backgroundColor: `${racer.bikeColor}20`, borderColor: racer.bikeColor }}
                  >
                    {racer.avatarIcon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-mono bg-slate-800 text-slate-400 px-1.5 py-0.2 rounded">
                        GRID #{idx + 2}
                      </span>
                      <h4 className="text-xs font-bold text-slate-200 truncate">{racer.name}</h4>
                    </div>
                    <div className="text-[10px] text-slate-400 truncate mt-0.5">
                      {racer.batteryInfo}
                    </div>
                    <span className="text-[10px] text-amber-300 font-mono">
                      ความเร็ว: ~{racer.maxSpeedKmh} กม./ชม.
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Installed Pack & Motor Compatibility Card */}
          <div className="bg-slate-900/95 border border-indigo-500/30 rounded-2xl p-4 shadow-xl flex flex-col gap-2.5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-black text-emerald-300 flex items-center gap-1.5 uppercase">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                สถานะการจับคู่ทางวิศวกรรม (Compatibility Check)
              </span>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <BatteryCharging className="w-3.5 h-3.5 text-cyan-400" />
                  ชุดแบตเตอรี่ที่ติดตั้ง:
                </span>
                <span className="font-mono font-bold text-amber-300">
                  {packV.toFixed(1)}V / {packMah} mAh
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Gauge className="w-3.5 h-3.5 text-indigo-400" />
                  พิกัดมอเตอร์ไฟฟ้า:
                </span>
                <span className="font-mono font-bold text-indigo-300">
                  DC {motorRatedV.toFixed(1)}V (Max 3.0V)
                </span>
              </div>

              <div
                className={`p-2 rounded-lg flex items-center justify-between border ${
                  isSetupValid
                    ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                    : 'bg-rose-950/60 border-rose-500/50 text-rose-300'
                }`}
              >
                <span className="flex items-center gap-1.5 font-bold">
                  {isSetupValid ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                  ความปลอดภัยระบบไฟฟ้า:
                </span>
                <span className="font-bold">
                  {isSetupValid ? 'ผ่านเกณฑ์ความปลอดภัย 100%' : 'แรงดันไม่เข้ากัน! ห้ามลงแข่ง'}
                </span>
              </div>
            </div>

            {!isSetupValid && (
              <p className="text-[11px] text-rose-400 leading-relaxed bg-rose-950/40 p-2 rounded-lg border border-rose-800">
                คำเตือน: คุณยังไม่ได้ติดตั้งชุดแบตเตอรี่ 3.0V ที่ผ่านการรับรอง กรุณากดปุ่ม <strong>"กลับโรงเก็บจักรยาน"</strong> เพื่อติดตั้งชุด 2S2P หรือ 2S1P ให้เรียบร้อย
              </p>
            )}
          </div>

          {/* VOLT Tutor */}
          <VoltDialog
            mood={isSetupValid ? 'celebrate' : 'warning'}
            message={
              isSetupValid
                ? `ทุกอย่างพร้อมแล้วครับคุณ ${state.character.name}! แบตเตอรี่ 3.0V และมอเตอร์ 3V จับคู่กันอย่างลงตัวบนสนาม ${selectedTrack.name} กดปุ่ม 'พร้อมแข่ง' เพื่อเริ่มนับถอยหลังได้เลยครับ!`
                : 'ระบบความปลอดภัยตรวจพบว่าแรงดันแบตเตอรี่ยังไม่ถูกต้อง กรุณาย้อนกลับไปโรงเก็บจักรยานเพื่อเลือกติดตั้งชุด 2S2P ให้พร้อมก่อนครับ'
            }
          />
        </div>
      </div>

      {/* Full-Screen 3-2-1 Countdown Animation Overlay */}
      {countdownValue !== null && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="flex flex-col items-center gap-4 text-center">
            <span className="text-xs font-mono uppercase tracking-widest text-slate-400">
              {selectedTrack.name}
            </span>

            <div
              key={countdownText}
              className={`text-7xl md:text-9xl font-black font-mono tracking-wider animate-in zoom-in-75 duration-300 ${
                countdownValue === 0
                  ? 'text-emerald-400 drop-shadow-[0_0_50px_rgba(52,211,153,0.9)]'
                  : 'text-amber-400 drop-shadow-[0_0_40px_rgba(251,191,36,0.8)]'
              }`}
            >
              {countdownText}
            </div>

            <p className="text-sm font-bold text-slate-300 mt-2">
              {countdownValue > 0
                ? 'เตรียมคันเร่งและรักษาเสถียรภาพ...'
                : 'เหยียบคันเร่งเต็มสูบ มุ่งสู่ชัยชนะ!'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
