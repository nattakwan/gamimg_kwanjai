/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Trophy,
  Award,
  Zap,
  Gauge,
  Clock,
  Sparkles,
  ArrowRight,
  RotateCcw,
  BookOpen,
  Wrench,
  BatteryCharging,
  CheckCircle2,
  MapPin,
  Flame,
  Star,
  Info,
  AlertTriangle,
} from 'lucide-react';
import { useGameState } from '../../context/GameStateContext';
import { AvatarRenderer } from '../common/AvatarRenderer';
import { VoltDialog } from '../common/VoltDialog';
import { CompetitorFinishResult } from '../../types/game';

export const RaceResultsScreen: React.FC = () => {
  const { state, goToScene } = useGameState();

  const rank = state.raceData?.rank || 1;
  const timeSec = state.raceData?.totalTimeSeconds || 45.2;
  const topSpeed = state.raceData?.topSpeedKmh || 36;
  const avgSpeed = state.raceData?.averageSpeedKmh || 30;
  const energyUsedMah = state.raceData?.energyUsedMah || 520;
  const remainingMah = state.raceData?.remainingEnergyMah ?? Math.max(0, 4000 - energyUsedMah);
  const remainingPct =
    state.raceData?.batteryPercentageRemaining ??
    Math.round((remainingMah / (remainingMah + energyUsedMah || 4000)) * 100);

  const trackId = state.raceData?.selectedTrackId || 'flat_sprint';
  const trackName = state.raceData?.trackName || 'แฟลต สปรินต์ (Flat Sprint - 400m)';
  const trackDist = state.raceData?.trackDistanceMeters || 400;

  const packV = state.batteryPack.nominalVoltage || state.batteryPack.totalVoltage || 3.0;
  const packMah = state.batteryPack.nominalCapacityMah || state.batteryPack.totalCapacityMah || 4000;
  const internalR = state.batteryPack.internalResistance || (state.batteryPack.parallelCount === 2 ? 0.15 : 0.3);

  const energyWh = ((packV * energyUsedMah) / 1000).toFixed(2);
  const efficiency = (Number(energyWh) / (trackDist / 1000)).toFixed(1); // Wh/km

  // Documented Scoring Breakdown (out of 30)
  const scoring = state.raceData?.scoringBreakdown || {
    rankPoints: rank === 1 ? 12 : rank === 2 ? 9 : rank === 3 ? 6 : 3,
    speedPacingPoints: avgSpeed >= 30 ? 10 : avgSpeed >= 26 ? 8 : avgSpeed >= 22 ? 6 : 4,
    batteryEfficiencyPoints: remainingPct > 25 ? 8 : remainingPct > 10 ? 6 : remainingPct > 0 ? 4 : 2,
    totalPoints: state.raceData?.raceScoreOutOf30 || 27,
  };
  const totalScore30 = scoring.totalPoints;
  const bestScore30 = state.raceData?.bestRaceScore || totalScore30;

  // Actual Finish Order from Scene 13
  const competitorResults: CompetitorFinishResult[] =
    state.raceData?.competitorResults && state.raceData.competitorResults.length === 4
      ? state.raceData.competitorResults
      : [
          {
            id: 'player',
            name: `${state.character.name} (คุณ)`,
            isPlayer: true,
            avatarIcon: '⚡',
            color: state.bike?.frameColor || state.bikeSetup?.frameColor || '#0284c7',
            bikeDesc: state.batteryPack.name || `${packV.toFixed(1)}V 2S2P`,
            finishTimeSeconds: timeSec,
            rank,
            averageSpeedKmh: avgSpeed,
            gapSeconds: rank === 1 ? 0 : 1.5,
          },
          {
            id: 'racer_tina',
            name: 'เทอร์โบ ทีน่า (Turbo Tina)',
            isPlayer: false,
            avatarIcon: '🚀',
            color: '#a855f7',
            bikeDesc: '2S2P (3.0V 4000mAh)',
            finishTimeSeconds: Number((timeSec + (rank === 1 ? 1.6 : -1.2)).toFixed(1)),
            rank: rank === 1 ? 2 : 1,
            averageSpeedKmh: 31,
            gapSeconds: rank === 1 ? 1.6 : 0,
          },
          {
            id: 'racer_sam',
            name: 'สปีดี้ แซม (Speedy Sam)',
            isPlayer: false,
            avatarIcon: '⚡',
            color: '#ef4444',
            bikeDesc: '2S1P (3.0V 2000mAh)',
            finishTimeSeconds: Number((timeSec + (rank <= 2 ? 3.2 : 0.8)).toFixed(1)),
            rank: rank <= 2 ? 3 : 2,
            averageSpeedKmh: 28,
            gapSeconds: 3.2,
          },
          {
            id: 'racer_captain',
            name: 'กัปตัน บิ๊กบล็อก (Captain Big-Block)',
            isPlayer: false,
            avatarIcon: '🛡️',
            color: '#f59e0b',
            bikeDesc: '2S3P High-Grip',
            finishTimeSeconds: Number((timeSec + 4.9).toFixed(1)),
            rank: 4,
            averageSpeedKmh: 26,
            gapSeconds: 4.9,
          },
        ].sort((a, b) => a.rank - b.rank);

  // Top 3 for Podium
  const podium1st = competitorResults.find((c) => c.rank === 1) || competitorResults[0];
  const podium2nd = competitorResults.find((c) => c.rank === 2) || competitorResults[1];
  const podium3rd = competitorResults.find((c) => c.rank === 3) || competitorResults[2];
  const rank4th = competitorResults.find((c) => c.rank === 4) || competitorResults[3];

  const isExhausted = Boolean(state.raceData?.batteryExhaustedMidway);
  const isStalled = Boolean(state.raceData?.stalledOnHill);
  const chosenMotorV = state.raceData?.chosenMotorVoltage || 12;
  const downhillSavedWh = state.raceData?.downhillEnergySavedWh || 0;

  // Dynamic scientific explanation of how battery choice & physics affected the race outcome
  const getBatteryExplanation = () => {
    if (isStalled || isExhausted) {
      if (chosenMotorV === 24 && packMah <= 2000) {
        return `❌ วิกฤตพลังงานหมดกลางทาง (Energy Exhaustion): คุณเลือกมอเตอร์กำลังสูง 24V (800W) ซึ่งต้องการกระแสสูงถึง 6.8A แต่ภายใต้กฎการจำกัดโควตา 8 ก้อน การต่อแบบ 8S 1P ให้ความจุเหลือเพียง 2,000 mAh ทำให้ประจุไฟฟ้าหมดก่อนถึงยอดเขา! ในทางฟิสิกส์ แรงถีบของมนุษย์ (~60N) ไม่สามารถเอาชนะแรงดึงดูดของโลกบนเนิน 16% (F = mg*sin(θ) ≈ 127N) ได้ จึงทำให้รถติดค้างบนเนิน (Stalled)!`;
      }
      if (packV < chosenMotorV * 0.7) {
        return `❌ เกิดปัญหาแรงดันตกพิกัดรุนแรง (Severe Undervoltage): คุณใช้มอเตอร์พิกัด ${chosenMotorV}V แต่จ่ายไฟด้วยแบตเตอรี่ ${packV}V ทำให้กำลังขับของมอเตอร์ลดลงเหลือเพียง ${Math.round(Math.pow(packV / chosenMotorV, 2) * 100)}% แรงบิดไม่เพียงพอที่จะเอาชนะแรงโน้มถ่วงความชัน 14-16% ได้!`;
      }
      return `❌ แบตเตอรี่หมดพลังงานระหว่างการแข่งขัน ส่งผลให้มอเตอร์ไฟฟ้าหยุดทำงานกะทันหัน และรถสูญเสียแรงขับเคลื่อนจนหยุดนิ่งบนเนินเขา`;
    }

    if (trackId === 'offroad_downhill') {
      const regenMah = state.raceData?.regeneratedEnergyMah || 0;
      return `🚵 ผลการแข่งขันบนเส้นทางวิบาก MX Offroad Downhill (800m)! คุณควบคุมจักรยานทิ้งดิ่งลงเขาชัน -22% ผ่านเนินจั๊มพ์ได้อย่างมีเสถียรภาพ และใช้ระบบ Regenerative Braking (KERS) ชาร์จพลังงานกลับคืนสู่แบตเตอรี่ได้ถึง ${regenMah > 0 ? regenMah.toFixed(1) : '15.4'} mAh ระบบช่วงล่างโช้คอัพหน้าซับแรงกระแทกและการถ่ายน้ำหนักตัว (Lean Back) ช่วยให้เข้าเส้นชัยได้อย่างสมบูรณ์แบบ!`;
    }
    if (trackId === 'hill_climb') {
      return `🏆 ผลสำเร็จจากการจับคู่วิศวกรรมยอดเยี่ยม! มอเตอร์ ${chosenMotorV}V ทำงานคู่กับชุดแบตเตอรี่ ${packV}V (${packMah} mAh) ได้อย่างกลมกลืน ช่วงไต่เขาชัน 14-16% มอเตอร์สร้างแรงบิดเอาชนะแรงโน้มถ่วง F = mg*sin(θ) ได้อย่างราบรื่น และในช่วงลงเขาชัน 9% คุณประหยัดพลังงานได้ ${downhillSavedWh > 0 ? downhillSavedWh.toFixed(1) : '1.2'} Wh จากการปล่อยไหลฟรี (Coasting) ทำให้มีพลังงานเหลือรอดเข้าเส้นชัยได้อย่างสง่างาม!`;
    }
    if (trackId === 'endurance_route') {
      return `การแข่งขันระยะทางยาว 1,200 เมตร (3 รอบสนาม) อาศัยความจุพลังงานเป็นหลัก ชุดแบตเตอรี่ ${packMah} mAh ทำให้มีประจุเพียงพอตลอดการแข่งขันโดยเหลือพลังงานสำรองถึง ${remainingPct}% (${remainingMah} mAh) ป้องกันไม่ให้ระบบตัดการทำงานหรือแบตเตอรี่หมดกลางทาง`;
    }
    return `บนสนามทางเรียบความเร็วสูง (400m) แรงดันไฟฟ้าพิกัด ${packV.toFixed(
      1
    )}V ตรงกับมอเตอร์ DC ${chosenMotorV}V พอดี ทำให้มอเตอร์สามารถทำรอบการหมุนสูงสุดได้อย่างปลอดภัย และการจ่ายกระแสช่วยให้อัตราเร่งออกตัวช่วงต้นทรงพลังจนคว้าชัยชนะได้สำเร็จ!`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-sky-50 to-indigo-50/40 text-slate-800 flex flex-col font-sans select-none p-3 md:p-6">
      <div className="max-w-5xl mx-auto w-full flex-1 flex flex-col gap-5 justify-between">
        {/* Top Header Card: Title & Trophy */}
        <div className={`bg-white/95 border rounded-3xl p-5 md:p-6 shadow-sm flex flex-wrap items-center justify-between gap-4 relative overflow-hidden ${
          isStalled || isExhausted ? 'border-rose-300' : 'border-slate-200/90'
        }`}>
          <div className="flex items-center gap-4">
            <div
              className={`w-16 h-16 md:w-20 md:h-20 rounded-2xl flex items-center justify-center shadow-sm border-2 shrink-0 ${
                isStalled || isExhausted
                  ? 'bg-rose-50 border-rose-400 text-rose-600'
                  : rank === 1
                  ? 'bg-amber-50 border-amber-400 text-amber-600 shadow-amber-200'
                  : rank === 2
                  ? 'bg-slate-100 border-slate-300 text-slate-600'
                  : 'bg-amber-100/60 border-amber-500 text-amber-700'
              }`}
            >
              {isStalled || isExhausted ? (
                <AlertTriangle className="w-8 h-8 md:w-10 md:h-10" />
              ) : (
                <Trophy className="w-8 h-8 md:w-10 md:h-10" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className={`text-[11px] font-black uppercase tracking-wider px-3 py-0.5 rounded-full ${
                  isStalled || isExhausted
                    ? 'bg-rose-100 text-rose-700 border border-rose-300'
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  {isStalled || isExhausted
                    ? 'สรุปผลการแข่งขัน: รถติดค้างบนเนิน (STALLED ON HILL)'
                    : 'สรุปผลการแข่งขันทางการ (Official Race Results)'}
                </span>
                <span className="text-[11px] font-mono text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full font-bold">
                  {trackName.split('(')[0]}
                </span>
              </div>

              <h1 className="text-xl md:text-3xl font-black text-slate-800 mt-1">
                {isStalled || isExhausted
                  ? `⚠️ แบตเตอรี่หมดกลางทาง! คุณ ${state.character.name} ติดค้างบนเนินชัน`
                  : rank === 1
                  ? `🏆 ชัยชนะอันดับที่ 1! ยอดเยี่ยมมากคุณ ${state.character.name}!`
                  : `🏁 เข้าเส้นชัยอันดับที่ #${rank}! ทำผลงานได้ยอดเยี่ยมคุณ ${state.character.name}!`}
              </h1>

              <p className="text-xs text-slate-600 mt-1 flex items-center gap-3">
                <span>
                  เวลา: <strong className="text-emerald-700 font-mono">{timeSec.toFixed(1)} วิ</strong>
                </span>
                <span>•</span>
                <span>
                  ความเร็วเฉลี่ย: <strong className="text-cyan-700 font-mono">{avgSpeed} กม./ชม.</strong>
                </span>
                <span>•</span>
                <span>
                  แบตเตอรี่คงเหลือ: <strong className={remainingPct <= 5 ? 'text-rose-600 font-mono' : 'text-amber-700 font-mono'}>{remainingPct}%</strong>
                </span>
              </p>
            </div>
          </div>

          {/* Race Score Badge out of 30 */}
          <div className="bg-amber-50/80 p-3.5 rounded-2xl border-2 border-amber-300 flex flex-col items-center justify-center shrink-0 min-w-[130px] shadow-sm">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">คะแนนการแข่งขัน</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-3xl font-black font-mono text-amber-700">{totalScore30}</span>
              <span className="text-xs font-mono text-slate-500">/ 30</span>
            </div>
            <span className="text-[10px] font-mono text-emerald-700 font-bold mt-0.5">
              สถิติดีที่สุด: {bestScore30}/30
            </span>
          </div>
        </div>

        {/* 3-Step Championship Podium Presentation */}
        <div className="bg-white/95 border border-slate-200/90 rounded-3xl p-5 shadow-sm flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-xs font-black text-amber-800 uppercase flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-amber-600" />
              โพเดียม 3 อันดับแรก (Championship Podium)
            </span>
            <span className="text-[10px] font-mono text-slate-500">
              ตัดสินตามเวลาจริงที่เข้าเส้นชัย (Crossing Times)
            </span>
          </div>

          {/* Podium Pedestals Grid */}
          <div className="grid grid-cols-3 gap-2 md:gap-4 items-end pt-4 pb-2 max-w-2xl mx-auto w-full">
            {/* 2nd Place Pedestal (Left) */}
            <div className="flex flex-col items-center">
              {/* Rider Avatar / Icon */}
              <div
                className={`w-14 h-16 md:w-16 md:h-20 rounded-2xl p-1 border-2 flex items-center justify-center mb-2 shadow-sm ${
                  podium2nd.isPlayer
                    ? 'border-cyan-400 bg-cyan-50 ring-4 ring-cyan-200'
                    : 'border-slate-300 bg-slate-50'
                }`}
              >
                {podium2nd.isPlayer ? (
                  <AvatarRenderer avatar={state.character} size="sm" mode="2d" />
                ) : (
                  <span className="text-2xl">{podium2nd.avatarIcon}</span>
                )}
              </div>
              <span className="text-xs font-bold text-slate-700 truncate max-w-[100px] md:max-w-none text-center">
                {podium2nd.name}
              </span>
              <span className="text-[10px] font-mono text-emerald-700 font-bold">
                {podium2nd.finishTimeSeconds.toFixed(1)} วิ (+{podium2nd.gapSeconds.toFixed(1)})
              </span>

              {/* Pedestal Block #2 */}
              <div className="w-full h-24 md:h-28 bg-gradient-to-t from-slate-200 to-slate-100 border-t-4 border-slate-400 rounded-t-2xl flex flex-col items-center justify-center shadow-sm mt-2">
                <span className="text-2xl md:text-3xl font-black font-mono text-slate-700">#2</span>
                <span className="text-[10px] font-bold text-slate-600 uppercase">รองชนะเลิศ</span>
              </div>
            </div>

            {/* 1st Place Pedestal (Center - Highest) */}
            <div className="flex flex-col items-center">
              {/* Champion Crown / Trophy */}
              <div className="text-amber-500 mb-1 animate-bounce">👑</div>
              <div
                className={`w-16 h-20 md:w-20 md:h-24 rounded-2xl p-1 border-2 flex items-center justify-center mb-2 shadow-md ${
                  podium1st.isPlayer
                    ? 'border-amber-400 bg-amber-50 ring-4 ring-amber-200'
                    : 'border-amber-400 bg-amber-50/50'
                }`}
              >
                {podium1st.isPlayer ? (
                  <AvatarRenderer avatar={state.character} size="sm" mode="2d" />
                ) : (
                  <span className="text-3xl">{podium1st.avatarIcon}</span>
                )}
              </div>
              <span className="text-xs md:text-sm font-black text-amber-800 truncate max-w-[120px] md:max-w-none text-center">
                {podium1st.name}
              </span>
              <span className="text-[11px] font-mono text-emerald-700 font-black">
                {podium1st.finishTimeSeconds.toFixed(1)} วิ (WINNER)
              </span>

              {/* Pedestal Block #1 */}
              <div className="w-full h-32 md:h-36 bg-gradient-to-t from-amber-200 via-amber-100 to-amber-50 border-t-4 border-amber-400 rounded-t-2xl flex flex-col items-center justify-center shadow-md mt-2">
                <span className="text-3xl md:text-4xl font-black font-mono text-amber-800">#1</span>
                <span className="text-[10px] md:text-xs font-black text-amber-700 uppercase">ชนะเลิศ</span>
              </div>
            </div>

            {/* 3rd Place Pedestal (Right) */}
            <div className="flex flex-col items-center">
              <div
                className={`w-14 h-16 md:w-16 md:h-20 rounded-2xl p-1 border-2 flex items-center justify-center mb-2 shadow-sm ${
                  podium3rd.isPlayer
                    ? 'border-cyan-400 bg-cyan-50 ring-4 ring-cyan-200'
                    : 'border-amber-300 bg-slate-50'
                }`}
              >
                {podium3rd.isPlayer ? (
                  <AvatarRenderer avatar={state.character} size="sm" mode="2d" />
                ) : (
                  <span className="text-2xl">{podium3rd.avatarIcon}</span>
                )}
              </div>
              <span className="text-xs font-bold text-slate-700 truncate max-w-[100px] md:max-w-none text-center">
                {podium3rd.name}
              </span>
              <span className="text-[10px] font-mono text-emerald-700 font-bold">
                {podium3rd.finishTimeSeconds.toFixed(1)} วิ (+{podium3rd.gapSeconds.toFixed(1)})
              </span>

              {/* Pedestal Block #3 */}
              <div className="w-full h-20 md:h-22 bg-gradient-to-t from-orange-100 to-amber-50 border-t-4 border-amber-500 rounded-t-2xl flex flex-col items-center justify-center shadow-sm mt-2">
                <span className="text-2xl md:text-3xl font-black font-mono text-amber-800">#3</span>
                <span className="text-[10px] font-bold text-amber-700 uppercase">อันดับ 3</span>
              </div>
            </div>
          </div>

          {/* 4th Place Card */}
          <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200 flex items-center justify-between text-xs text-slate-600 max-w-2xl mx-auto w-full">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded bg-slate-200 text-slate-600 font-mono font-bold flex items-center justify-center text-[11px]">
                #4
              </span>
              <span>{rank4th.avatarIcon}</span>
              <span className="font-bold text-slate-700">{rank4th.name}</span>
              <span className="text-[10px] text-slate-500">({rank4th.bikeDesc})</span>
            </div>
            <span className="font-mono text-slate-600">
              {rank4th.finishTimeSeconds.toFixed(1)} วิ (+{rank4th.gapSeconds.toFixed(1)})
            </span>
          </div>
        </div>

        {/* Detailed Telemetry & Documented Scoring Rules (2 Columns) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          {/* Left Column: Official Telemetry Stats (6 Cols) */}
          <div className="md:col-span-6 bg-white/95 border border-slate-200/90 rounded-3xl p-4 shadow-sm flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-xs font-black text-cyan-800 uppercase flex items-center gap-1.5">
                <Gauge className="w-4 h-4 text-cyan-600" />
                ข้อมูลโทรมาตรการแข่งขัน (Saved Race Telemetry)
              </span>
              <span className="text-[10px] text-slate-500 font-mono">ระยะ {trackDist} ม.</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200 shadow-inner">
                <Clock className="w-3.5 h-3.5 text-emerald-600 mb-1" />
                <span className="text-[10px] text-slate-500 block">เวลาเข้าเส้นชัยรวม</span>
                <span className="font-mono font-bold text-emerald-800 text-sm">{timeSec.toFixed(1)} วินาที</span>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200 shadow-inner">
                <Gauge className="w-3.5 h-3.5 text-cyan-600 mb-1" />
                <span className="text-[10px] text-slate-500 block">ความเร็วเฉลี่ย / สูงสุด</span>
                <span className="font-mono font-bold text-cyan-800 text-sm">
                  {avgSpeed} / {topSpeed} กม./ชม.
                </span>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200 shadow-inner">
                <Zap className="w-3.5 h-3.5 text-amber-600 mb-1" />
                <span className="text-[10px] text-slate-500 block">พลังงานที่ใช้ไป</span>
                <span className="font-mono font-bold text-amber-800 text-sm">
                  {energyUsedMah} mAh ({energyWh} Wh)
                </span>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200 shadow-inner">
                <BatteryCharging className="w-3.5 h-3.5 text-teal-600 mb-1" />
                <span className="text-[10px] text-slate-500 block">พลังงานแบตเตอรี่คงเหลือ</span>
                <span className="font-mono font-bold text-teal-800 text-sm">
                  {remainingMah} mAh ({remainingPct}%)
                </span>
              </div>

              {state.raceData?.regeneratedEnergyMah && state.raceData.regeneratedEnergyMah > 0 ? (
                <div className="bg-emerald-50 p-2.5 rounded-2xl border border-emerald-200 col-span-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BatteryCharging className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <span className="text-[10px] text-slate-500 block">พลังงานที่ชาร์จกลับ (KERS Regenerated)</span>
                      <span className="font-mono font-bold text-emerald-800 text-sm">
                        +{state.raceData.regeneratedEnergyMah.toFixed(1)} mAh (
                        {((state.raceData.regeneratedEnergyMah * packV) / 1000).toFixed(2)} Wh)
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-300">
                    KERS REGEN
                  </span>
                </div>
              ) : null}

              {state.raceData?.batteryPickupsCollected !== undefined ? (
                <div className="bg-emerald-50/70 p-2.5 rounded-2xl border border-emerald-200 col-span-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🔋</span>
                    <div>
                      <span className="text-[10px] text-slate-500 block">ไอเทมพลังงานที่เก็บได้ (Pickups)</span>
                      <span className="font-mono font-bold text-emerald-800 text-sm">
                        {state.raceData.batteryPickupsCollected} / {state.raceData.totalPickupsAvailable || 0} ชิ้น
                        {state.raceData.pickupEnergyRecoveredMah ? ` (+${state.raceData.pickupEnergyRecoveredMah} mAh)` : ''}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-300">
                    ENERGY BOOST
                  </span>
                </div>
              ) : null}
            </div>

            {/* Scientific Explanation of Battery Choice */}
            <div className="bg-indigo-50/70 p-3 rounded-2xl border border-indigo-100 flex flex-col gap-1 mt-1">
              <span className="text-[10px] font-black uppercase text-indigo-800 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                บทวิเคราะห์ผลลัพธ์จากชุดแบตเตอรี่ที่เลือก (Battery Physics Impact)
              </span>
              <p className="text-[11px] text-slate-700 leading-relaxed">{getBatteryExplanation()}</p>
            </div>
          </div>

          {/* Right Column: Documented Scoring Rubric out of 30 (6 Cols) */}
          <div className="md:col-span-6 bg-white/95 border border-slate-200/90 rounded-3xl p-4 shadow-sm flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-xs font-black text-amber-800 uppercase flex items-center gap-1.5">
                <Award className="w-4 h-4 text-amber-600" />
                เกณฑ์การคิดคะแนน 30 คะแนน (Documented Scoring Rule)
              </span>
              <span className="text-[10px] font-mono text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full font-bold">
                TOTAL {totalScore30}/30
              </span>
            </div>

            <div className="space-y-2 text-xs">
              {/* Category 1: Rank Points (Max 12) */}
              <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200 flex items-center justify-between shadow-inner">
                <div>
                  <div className="font-bold text-slate-700 flex items-center gap-1.5">
                    <span>1. คะแนนอันดับเข้าเส้นชัย (Finish Rank)</span>
                  </div>
                  <span className="text-[10px] text-slate-500">
                    อันดับ 1 = 12 คะแนน, อันดับ 2 = 9, อันดับ 3 = 6, อันดับ 4 = 3
                  </span>
                </div>
                <span className="font-mono font-black text-amber-800 text-sm">
                  {scoring.rankPoints} / 12
                </span>
              </div>

              {/* Category 2: Speed / Pacing Points (Max 10) */}
              <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200 flex items-center justify-between shadow-inner">
                <div>
                  <div className="font-bold text-slate-700 flex items-center gap-1.5">
                    <span>2. คะแนนความเร็วและเพซ (Speed & Pacing)</span>
                  </div>
                  <span className="text-[10px] text-slate-500">
                    &ge;30 กม./ชม. = 10 คะแนน, &ge;26 = 8, &ge;22 = 6, &lt;22 = 4
                  </span>
                </div>
                <span className="font-mono font-black text-cyan-800 text-sm">
                  {scoring.speedPacingPoints} / 10
                </span>
              </div>

              {/* Category 3: Battery Efficiency (Max 8) */}
              <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200 flex items-center justify-between shadow-inner">
                <div>
                  <div className="font-bold text-slate-700 flex items-center gap-1.5">
                    <span>3. การบริหารพลังงานแบตเตอรี่ (Energy Efficiency)</span>
                  </div>
                  <span className="text-[10px] text-slate-500">
                    แบตเตอรี่คงเหลือ &gt;25% = 8 คะแนน, &gt;10% = 6, &gt;0% = 4, หมด = 2
                  </span>
                </div>
                <span className="font-mono font-black text-emerald-800 text-sm">
                  {scoring.batteryEfficiencyPoints} / 8
                </span>
              </div>
            </div>

            {/* Total Summary Bar */}
            <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-50 to-emerald-50 border border-amber-200 flex items-center justify-between mt-auto shadow-sm">
              <span className="font-bold text-xs text-amber-800 flex items-center gap-1">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                คะแนนรวมรอบนี้ (Score Awarded):
              </span>
              <span className="font-mono font-black text-xl text-amber-800">{totalScore30} / 30</span>
            </div>
          </div>
        </div>

        {/* VOLT Tutor */}
        <VoltDialog
          mood="celebrate"
          message={`สุดยอดฝีมือครับคุณ ${state.character.name}! สถิติเวลาและการใช้พลังงานถูกบันทึกเรียบร้อย คุณสามารถกด 'ตรวจสอบวงจร' เพื่อปรับแต่งแบตเตอรี่เพิ่มเติม หรือกด 'ถอดบทเรียนความรู้' เพื่อทำแบบทดสอบวิชาการและรับประกาศนียบัตรได้เลยครับ!`}
        />

        {/* Action Buttons: Retry Race, Review Circuit, Continue to Reflection */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
          <button
            onClick={() => goToScene('racing')}
            className="w-full sm:flex-1 py-3.5 rounded-2xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-2 transition min-h-[46px] border border-slate-200 active:scale-95 shadow-sm"
          >
            <RotateCcw className="w-4 h-4 text-cyan-600" />
            <span>แข่งใหม่อีกครั้ง (Retry Race)</span>
          </button>

          <button
            onClick={() => goToScene('bike_garage')}
            className="w-full sm:flex-1 py-3.5 rounded-2xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-2 transition min-h-[46px] border border-slate-200 active:scale-95 shadow-sm"
          >
            <Wrench className="w-4 h-4 text-amber-600" />
            <span>ตรวจสอบวงจรแบตเตอรี่ (Review Circuit)</span>
          </button>

          <button
            onClick={() => goToScene('learning_reflection')}
            className="w-full sm:flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-black text-xs shadow-md flex items-center justify-center gap-2 transition min-h-[46px] active:scale-95"
          >
            <BookOpen className="w-4 h-4" />
            <span>ถอดบทเรียนความรู้และรับวุฒิบัตร (Continue to Reflection)</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
