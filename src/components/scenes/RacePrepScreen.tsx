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
  id: 'flat_sprint' | 'hill_climb' | 'endurance_route' | 'offroad_downhill';
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
      'ทดสอบความเร็วปลายและอัตราเร่ง: มอเตอร์ 6V / 12V / 24V จะใช้กำลังเต็มพิกัดบนทางราบ',
    recommendedStrategy: 'เปิดคันเร่งเต็ม 100% พร้อมใช้ไนโตรบูสต์ในช่วง 100 เมตรสุดท้าย',
    gradientBadge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  },
  {
    id: 'hill_climb',
    name: 'ฮิลล์ ไคลมบ์ (Hill Climb - 600m)',
    distanceMeters: 600,
    elevation: 'ทางไต่เขาชันสลับลงเขา (+16% / -9%)',
    slopeProfile: 'ไต่เขาชัน 14-16% สลับทางปล่อยไหลลงเขา 9% (1 รอบจบ Point-to-Point)',
    lapCount: 1,
    terrainType: 'พื้นคอนกรีตหยาบยึดเกาะสูง (High-Traction Concrete)',
    learningObjective:
      'ศึกษาผลของแรงโน้มถ่วง F = mg*sin(θ): ตอนขึ้นเขาต้องใช้แรงบิดสูง ตอนลงเขาปล่อยไหลได้โดยกินไฟ 0W และพิสูจน์ว่าต่อแบตเตอรี่โควตา 8 ก้อนแบบใดจะไม่หมดกลางทาง!',
    recommendedStrategy: 'หากใช้มอเตอร์ 24V (8S 1P 2000mAh) อย่ากด Boost ตอนลงเขา ให้ปล่อยไหลเพื่อประหยัดไฟไว้ขึ้นยอดเขาสุดท้าย!',
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
      'การบริหารประจุแบตเตอรี่ในระยะทางไกล: แพ็กความจุสูง (8,000 mAh หรือ 4,000 mAh) จะช่วยให้วิ่งจนจบ 3 รอบได้',
    recommendedStrategy: 'บริหารพลังงานให้สม่ำเสมอ ผ่อนคันเร่งเข้าโค้ง และเร่งเต็มที่ในทางตรง',
    gradientBadge: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
  },
  {
    id: 'offroad_downhill',
    name: 'เอ็มเอ็กซ์ ออฟโรด ดาวน์ฮิลล์ (MX Downhill - 800m)',
    distanceMeters: 800,
    elevation: 'ทางวิบากทิ้งดิ่งลงเขาสูงชัน (-22% / +8%)',
    slopeProfile: 'ออกตัวจากยอดเขาสันเขา ดิ่งลงเขาสุดขั้ว -22% ผ่านเนินจั๊มพ์ โค้งหักศอก และแคนยอน',
    lapCount: 1,
    terrainType: 'เส้นทางวิบากลูกรังและหินผาภูเขา (MX Offroad Gravel & Ridge Trail)',
    learningObjective:
      'ทดสอบระบบ Regenerative Braking (KERS): แรงโน้มถ่วงตอนทิ้งดิ่งลงเขาช่วยปั่นไฟชาร์จกลับเข้าแบตเตอรี่ พร้อมระบบโช้คอัพซับแรงกระแทก',
    recommendedStrategy: 'ช่วงทิ้งดิ่งลงเขาชัน -22% แตะเบรกชาร์จไฟกลับ (Regen) และถ่ายน้ำหนักตัวไปข้างหลัง (Lean Back) เพื่อทรงตัว',
    gradientBadge: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
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

  const [selectedTrackId, setSelectedTrackId] = useState<'flat_sprint' | 'hill_climb' | 'endurance_route' | 'offroad_downhill'>('flat_sprint');
  const selectedTrack = RACE_TRACKS.find((t) => t.id === selectedTrackId) || RACE_TRACKS[0];

  // Installed Pack & Bike Specs
  const packV = state.batteryPack.nominalVoltage || state.batteryPack.totalVoltage || 12.0;
  const packMah = state.batteryPack.nominalCapacityMah || state.batteryPack.totalCapacityMah || 4000;
  const motorRatedV = state.bikeSetup?.motorRatedVoltage || state.bikeSetup?.motorVoltageRating || 12.0;
  const motorName = state.bikeSetup?.motorName || `${motorRatedV}V Motor`;
  const bikeTopSpeed = state.bikeSetup?.topSpeedKmh || 35;

  // Validation: Overvoltage (> 110% of motor rating) is dangerous; undervoltage is permitted with warning
  const isOverVoltage = packV > motorRatedV * 1.1;
  const isSetupValid = !isOverVoltage && packMah >= 1000;

  // Direct start race transition: Countdown 3-2-1 happens inside RacingScreen on the 3D starting grid only!
  const handleStartRace = () => {
    if (!isSetupValid) {
      playTone(180, 'sawtooth', 0.3);
      return;
    }
    playTone(660, 'sine', 0.2);
    updateRaceData({
      selectedTrackId,
      trackName: selectedTrack.name,
      trackDistanceMeters: selectedTrack.distanceMeters,
      rank: 1,
    });
    goToScene('racing');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-sky-50 to-indigo-50/40 text-slate-800 flex flex-col font-sans select-none pb-12">
      {/* Top Header */}
      <div className="bg-white/95 border-b border-slate-200/90 shadow-sm px-4 py-3 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button
            onClick={() => goToScene('bike_garage')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 transition active:scale-95 min-h-[40px] cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-emerald-600" />
            <span>โรงเก็บจักรยาน</span>
          </button>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 flex items-center justify-center font-bold text-sm text-white shadow-sm">
              <Flag className="w-4 h-4 fill-white" />
            </div>
            <div>
              <h1 className="text-sm md:text-base font-black text-slate-900 flex items-center gap-2">
                <span>จุดปล่อยตัว: เตรียมความพร้อมก่อนแข่ง (Race Preparation)</span>
                <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-200">
                  ฉากที่ 12
                </span>
              </h1>
              <p className="text-[11px] text-slate-500">
                เลือกสนามแข่งขัน ตรวจสอบกริดสตาร์ท 4 คัน และกดพร้อมแข่งเพื่อเข้าสู่สนาม
              </p>
            </div>
          </div>
        </div>

        {/* Ready / Start Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleStartRace}
            disabled={!isSetupValid}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl font-black text-xs md:text-sm shadow-md transition active:scale-95 min-h-[40px] cursor-pointer ${
              isSetupValid
                ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:brightness-105 text-white shadow-emerald-500/20'
                : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
            }`}
          >
            <Play className="w-4 h-4 fill-current" />
            <span>พร้อมแข่ง (Enter Race)</span>
          </button>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 p-4 max-w-7xl mx-auto w-full">
        {/* Left Column: Track Selector & Profile Details (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {/* Track Selector Tabs */}
          <div className="bg-white/95 border border-slate-200/90 rounded-3xl p-4 shadow-sm flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-xs font-black text-amber-800 flex items-center gap-1.5 uppercase">
                <MapPin className="w-4 h-4 text-amber-600" />
                เลือกสนามแข่งขัน (Select Race Track)
              </span>
              <span className="text-[10px] text-slate-500 font-mono font-semibold">4 สนามแข่งขัน (มีด่านวิบาก MX)</span>
            </div>

            {/* 4 Track Option Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {RACE_TRACKS.map((track) => {
                const isSelected = selectedTrackId === track.id;
                return (
                  <button
                    key={track.id}
                    onClick={() => {
                      playTone(550, 'sine', 0.08);
                      setSelectedTrackId(track.id);
                    }}
                    className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between min-h-[85px] cursor-pointer ${
                      isSelected
                        ? 'bg-amber-50 border-amber-400 text-amber-950 font-bold shadow-sm ring-1 ring-amber-300'
                        : 'bg-slate-50/80 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-xs line-clamp-1">{track.name.split('(')[0]}</div>
                      <div className="text-[11px] font-mono text-emerald-700 font-bold mt-0.5">
                        {track.distanceMeters} เมตร
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      {track.elevation}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Active Track Profile Visualization */}
            <div className="bg-slate-50/90 rounded-2xl p-4 border border-slate-200/90 flex flex-col gap-3 mt-1 shadow-inner">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
                    <Milestone className="w-4 h-4 text-amber-600" />
                    {selectedTrack.name}
                  </h3>
                  <p className="text-[11px] text-slate-500">{selectedTrack.slopeProfile}</p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold border bg-white border-slate-200 text-slate-700 shadow-sm">
                  {selectedTrack.elevation}
                </span>
              </div>

              {/* Graphical Elevation Profile SVG */}
              <div className="h-28 bg-white rounded-xl border border-slate-200 p-2 relative flex items-center justify-center overflow-hidden shadow-sm">
                <svg viewBox="0 0 400 100" className="w-full h-full">
                  {/* Grid Lines */}
                  <line x1="0" y1="25" x2="400" y2="25" stroke="#f1f5f9" strokeDasharray="3 3" />
                  <line x1="0" y1="50" x2="400" y2="50" stroke="#f1f5f9" strokeDasharray="3 3" />
                  <line x1="0" y1="75" x2="400" y2="75" stroke="#f1f5f9" strokeDasharray="3 3" />

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
                      stroke="#8b5cf6"
                      strokeWidth="5"
                      strokeLinecap="round"
                    />
                  )}
                  {selectedTrackId === 'offroad_downhill' && (
                    <path
                      d="M 10 20 Q 120 25, 200 80 T 390 70"
                      fill="none"
                      stroke="#f43f5e"
                      strokeWidth="5"
                      strokeLinecap="round"
                    />
                  )}

                  {/* Start & Finish Markers */}
                  <circle cx="20" cy={selectedTrackId === 'offroad_downhill' ? 22 : 75} r="5" fill="#0284c7" />
                  <text x="30" y={selectedTrackId === 'offroad_downhill' ? 26 : 79} fill="#0284c7" fontSize="9" fontWeight="bold">START</text>
                  <circle cx="380" cy={selectedTrackId === 'hill_climb' ? 20 : selectedTrackId === 'endurance_route' ? 60 : 70} r="5" fill="#e11d48" />
                  <text x="340" y={selectedTrackId === 'hill_climb' ? 17 : selectedTrackId === 'endurance_route' ? 57 : 67} fill="#e11d48" fontSize="9" fontWeight="bold">FINISH</text>
                </svg>
              </div>

              {/* Educational Learning Objective Box */}
              <div className="bg-indigo-50/70 p-3.5 rounded-2xl border border-indigo-200/80 flex flex-col gap-1">
                <span className="text-[10px] font-black uppercase text-indigo-900 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  เป้าหมายการเรียนรู้วิทยาศาสตร์ประจำสนามนี้ (Learning Objective)
                </span>
                <p className="text-xs text-indigo-950 leading-relaxed font-medium">
                  {selectedTrack.learningObjective}
                </p>
                <span className="text-[10px] text-emerald-800 font-mono mt-1 font-bold">
                  💡 กลยุทธ์แนะนำ: {selectedTrack.recommendedStrategy}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Starting Grid & Compatibility Check (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* Starting Grid (4 Racers in Line) */}
          <div className="bg-white/95 border border-slate-200/90 rounded-3xl p-4 shadow-sm flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-xs font-black text-cyan-800 flex items-center gap-1.5 uppercase">
                <Users className="w-4 h-4 text-cyan-600" />
                กริดสตาร์ท 4 คัน (Starting Grid Lineup)
              </span>
              <span className="text-[10px] font-mono font-bold text-cyan-800 bg-cyan-50 border border-cyan-200 px-2 py-0.5 rounded-full">
                4 COMPETITORS
              </span>
            </div>

            <div className="space-y-2">
              {/* Grid Slot #1: Player (You) */}
              <div className="bg-gradient-to-r from-cyan-50/90 to-white p-3 rounded-2xl border-2 border-cyan-400 flex items-center gap-3 shadow-sm">
                <div className="w-12 h-14 bg-white rounded-xl p-0.5 border border-cyan-200 shrink-0 overflow-hidden flex items-center justify-center shadow-inner">
                  <AvatarRenderer avatar={state.character} size="sm" mode="2d" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black bg-cyan-600 text-white px-1.5 py-0.2 rounded-md font-mono">
                      GRID #1
                    </span>
                    <h4 className="text-xs font-black text-slate-900 truncate">
                      {state.character.name} (คุณ)
                    </h4>
                  </div>
                  <div className="text-[11px] font-mono text-emerald-700 mt-0.5 font-bold">
                    {state.batteryPack.name || `แบตเตอรี่ 2S2P (${packV.toFixed(1)}V ${packMah}mAh)`}
                  </div>
                  <span className="text-[10px] text-slate-500 block">
                    ความเร็วสูงสุด: {bikeTopSpeed} กม./ชม. | มอเตอร์ {motorName}
                  </span>
                </div>
              </div>

              {/* Grid Slot #2 to #4: AI Competitors */}
              {AI_RACERS.map((racer, idx) => (
                <div
                  key={racer.id}
                  className="bg-slate-50/80 p-2.5 rounded-xl border border-slate-200 flex items-center gap-3"
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold shrink-0 shadow-sm border bg-white"
                    style={{ borderColor: `${racer.bikeColor}60` }}
                  >
                    {racer.avatarIcon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-mono bg-slate-200 text-slate-600 px-1.5 py-0.2 rounded-md font-bold">
                        GRID #{idx + 2}
                      </span>
                      <h4 className="text-xs font-bold text-slate-800 truncate">{racer.name}</h4>
                    </div>
                    <div className="text-[10px] text-slate-500 truncate mt-0.5">
                      {racer.batteryInfo}
                    </div>
                    <span className="text-[10px] text-amber-700 font-mono font-semibold">
                      ความเร็ว: ~{racer.maxSpeedKmh} กม./ชม.
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Installed Pack & Motor Compatibility Card */}
          <div className="bg-white/95 border border-slate-200/90 rounded-3xl p-4 shadow-sm flex flex-col gap-2.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-xs font-black text-emerald-800 flex items-center gap-1.5 uppercase">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                สถานะการจับคู่ทางวิศวกรรม (Compatibility Check)
              </span>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-600 flex items-center gap-1.5 font-semibold">
                  <BatteryCharging className="w-3.5 h-3.5 text-cyan-600" />
                  ชุดแบตเตอรี่ที่ติดตั้ง:
                </span>
                <span className="font-mono font-bold text-amber-800">
                  {packV.toFixed(1)}V / {packMah} mAh ({state.batteryPack.totalCells || 8} ก้อน)
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-600 flex items-center gap-1.5 font-semibold">
                  <Gauge className="w-3.5 h-3.5 text-indigo-600" />
                  พิกัดมอเตอร์ไฟฟ้า:
                </span>
                <span className="font-mono font-bold text-indigo-800">
                  DC {motorRatedV.toFixed(1)}V ({motorName})
                </span>
              </div>

              <div
                className={`p-2.5 rounded-xl flex items-center justify-between border ${
                  isSetupValid
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                    : 'bg-rose-50 border-rose-300 text-rose-800'
                }`}
              >
                <span className="flex items-center gap-1.5 font-bold">
                  {isSetupValid ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <XCircle className="w-4 h-4 text-rose-600" />}
                  ความปลอดภัยระบบไฟฟ้า:
                </span>
                <span className="font-bold">
                  {isSetupValid
                    ? packV === motorRatedV
                      ? 'แรงดันตรงพิกัด 100% (สมบูรณ์แบบ)'
                      : 'ผ่านเกณฑ์ (แรงดันต่ำกว่าพิกัด มอเตอร์หมุนช้าลง)'
                    : 'อันตราย! แรงดันเกินพิกัด ห้ามลงแข่ง'}
                </span>
              </div>
            </div>

            {!isSetupValid && (
              <p className="text-[11px] text-rose-700 leading-relaxed bg-rose-50 p-2.5 rounded-xl border border-rose-200 font-medium">
                คำเตือน: แรงดันแบตเตอรี่ ({packV}V) เกินพิกัดมอเตอร์ ({motorRatedV}V) กรุณากดปุ่ม <strong>"กลับโรงเก็บจักรยาน"</strong> เพื่อเลือกชุดแบตเตอรี่ที่ไม่เกินพิกัด
              </p>
            )}
          </div>

          {/* VOLT Tutor */}
          <VoltDialog
            mood={isSetupValid ? 'celebrate' : 'warning'}
            message={
              isSetupValid
                ? `ทุกอย่างพร้อมแล้วครับคุณ ${state.character.name}! มอเตอร์ ${motorRatedV}V และแบตเตอรี่ ${packV}V (${packMah}mAh) บนสนาม ${selectedTrack.name} กดปุ่ม 'พร้อมแข่ง' เพื่อเข้าสู่สนามแข่งขันได้เลยครับ!`
                : 'ระบบความปลอดภัยตรวจพบว่าแรงดันแบตเตอรี่เกินพิกัดมอเตอร์ กรุณาย้อนกลับไปโรงเก็บจักรยานเพื่อปรับแต่งให้ถูกต้องก่อนครับ'
            }
          />
        </div>
      </div>
    </div>
  );
};
