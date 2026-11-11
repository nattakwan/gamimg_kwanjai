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
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950 text-white flex flex-col font-sans select-none p-3 md:p-6">
      <div className="max-w-5xl mx-auto w-full flex-1 flex flex-col gap-5 justify-between">
        {/* Top Header Card: Title & Trophy */}
        <div className={`bg-slate-900/95 border-2 rounded-3xl p-5 md:p-6 shadow-2xl flex flex-wrap items-center justify-between gap-4 relative overflow-hidden ${
          isStalled || isExhausted ? 'border-rose-500/60' : 'border-indigo-500/40'
        }`}>
          <div className="flex items-center gap-4">
            <div
              className={`w-16 h-16 md:w-20 md:h-20 rounded-2xl flex items-center justify-center shadow-xl border-2 shrink-0 ${
                isStalled || isExhausted
                  ? 'bg-rose-500/20 border-rose-500 text-rose-400'
                  : rank === 1
                  ? 'bg-amber-500/20 border-amber-400 text-amber-400 shadow-amber-500/30'
                  : rank === 2
                  ? 'bg-slate-300/20 border-slate-300 text-slate-300'
                  : 'bg-amber-700/20 border-amber-600 text-amber-600'
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
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    : 'bg-amber-500/20 text-amber-400'
                }`}>
                  {isStalled || isExhausted
                    ? 'สรุปผลการแข่งขัน: รถติดค้างบนเนิน (STALLED ON HILL)'
                    : 'สรุปผลการแข่งขันทางการ (Official Race Results)'}
                </span>
                <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/20 px-2.5 py-0.5 rounded-full font-bold">
                  {trackName.split('(')[0]}
                </span>
              </div>

              <h1 className="text-xl md:text-3xl font-black text-white mt-1">
                {isStalled || isExhausted
                  ? `⚠️ แบตเตอรี่หมดกลางทาง! คุณ ${state.character.name} ติดค้างบนเนินชัน`
                  : rank === 1
                  ? `🏆 ชัยชนะอันดับที่ 1! ยอดเยี่ยมมากคุณ ${state.character.name}!`
                  : `🏁 เข้าเส้นชัยอันดับที่ #${rank}! ทำผลงานได้ยอดเยี่ยมคุณ ${state.character.name}!`}
              </h1>

              <p className="text-xs text-slate-300 mt-1 flex items-center gap-3">
                <span>
                  เวลา: <strong className="text-emerald-400 font-mono">{timeSec.toFixed(1)} วิ</strong>
                </span>
                <span>•</span>
                <span>
                  ความเร็วเฉลี่ย: <strong className="text-cyan-400 font-mono">{avgSpeed} กม./ชม.</strong>
                </span>
                <span>•</span>
                <span>
                  แบตเตอรี่คงเหลือ: <strong className={remainingPct <= 5 ? 'text-rose-400 font-mono' : 'text-amber-400 font-mono'}>{remainingPct}%</strong>
                </span>
              </p>
            </div>
          </div>

          {/* Race Score Badge out of 30 */}
          <div className="bg-slate-950 p-3.5 rounded-2xl border-2 border-amber-500/50 flex flex-col items-center justify-center shrink-0 min-w-[130px] shadow-lg shadow-amber-500/20">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">คะแนนการแข่งขัน</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-3xl font-black font-mono text-amber-300">{totalScore30}</span>
              <span className="text-xs font-mono text-slate-400">/ 30</span>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 mt-0.5">
              สถิติดีที่สุด: {bestScore30}/30
            </span>
          </div>
        </div>

        {/* 3-Step Championship Podium Presentation */}
        <div className="bg-slate-900/90 border border-indigo-500/30 rounded-3xl p-5 shadow-xl flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-black text-amber-300 uppercase flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-amber-400" />
              โพเดียม 3 อันดับแรก (Championship Podium)
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              ตัดสินตามเวลาจริงที่เข้าเส้นชัย (Crossing Times)
            </span>
          </div>

          {/* Podium Pedestals Grid */}
          <div className="grid grid-cols-3 gap-2 md:gap-4 items-end pt-4 pb-2 max-w-2xl mx-auto w-full">
            {/* 2nd Place Pedestal (Left) */}
            <div className="flex flex-col items-center">
              {/* Rider Avatar / Icon */}
              <div
                className={`w-14 h-16 md:w-16 md:h-20 rounded-2xl p-1 border-2 flex items-center justify-center mb-2 shadow-lg ${
                  podium2nd.isPlayer
                    ? 'border-cyan-400 bg-cyan-950/70 ring-4 ring-cyan-400/30'
                    : 'border-slate-400 bg-slate-950'
                }`}
              >
                {podium2nd.isPlayer ? (
                  <AvatarRenderer avatar={state.character} size="sm" mode="2d" />
                ) : (
                  <span className="text-2xl">{podium2nd.avatarIcon}</span>
                )}
              </div>
              <span className="text-xs font-bold text-slate-200 truncate max-w-[100px] md:max-w-none text-center">
                {podium2nd.name}
              </span>
              <span className="text-[10px] font-mono text-emerald-400 font-bold">
                {podium2nd.finishTimeSeconds.toFixed(1)} วิ (+{podium2nd.gapSeconds.toFixed(1)})
              </span>

              {/* Pedestal Block #2 */}
              <div className="w-full h-24 md:h-28 bg-gradient-to-t from-slate-800 to-slate-700 border-t-4 border-slate-300 rounded-t-2xl flex flex-col items-center justify-center shadow-lg mt-2">
                <span className="text-2xl md:text-3xl font-black font-mono text-slate-200">#2</span>
                <span className="text-[10px] font-bold text-slate-300 uppercase">รองชนะเลิศ</span>
              </div>
            </div>

            {/* 1st Place Pedestal (Center - Highest) */}
            <div className="flex flex-col items-center">
              {/* Champion Crown / Trophy */}
              <div className="text-amber-400 mb-1 animate-bounce">👑</div>
              <div
                className={`w-16 h-20 md:w-20 md:h-24 rounded-2xl p-1 border-2 flex items-center justify-center mb-2 shadow-2xl ${
                  podium1st.isPlayer
                    ? 'border-amber-400 bg-amber-950/60 ring-4 ring-amber-400/40'
                    : 'border-amber-400 bg-slate-950'
                }`}
              >
                {podium1st.isPlayer ? (
                  <AvatarRenderer avatar={state.character} size="sm" mode="2d" />
                ) : (
                  <span className="text-3xl">{podium1st.avatarIcon}</span>
                )}
              </div>
              <span className="text-xs md:text-sm font-black text-amber-300 truncate max-w-[120px] md:max-w-none text-center">
                {podium1st.name}
              </span>
              <span className="text-[11px] font-mono text-emerald-400 font-black">
                {podium1st.finishTimeSeconds.toFixed(1)} วิ (WINNER)
              </span>

              {/* Pedestal Block #1 */}
              <div className="w-full h-32 md:h-36 bg-gradient-to-t from-amber-950/80 via-amber-800/70 to-amber-600 border-t-4 border-amber-300 rounded-t-2xl flex flex-col items-center justify-center shadow-xl shadow-amber-500/20 mt-2">
                <span className="text-3xl md:text-4xl font-black font-mono text-amber-100">#1</span>
                <span className="text-[10px] md:text-xs font-black text-amber-200 uppercase">ชนะเลิศ</span>
              </div>
            </div>

            {/* 3rd Place Pedestal (Right) */}
            <div className="flex flex-col items-center">
              <div
                className={`w-14 h-16 md:w-16 md:h-20 rounded-2xl p-1 border-2 flex items-center justify-center mb-2 shadow-lg ${
                  podium3rd.isPlayer
                    ? 'border-cyan-400 bg-cyan-950/70 ring-4 ring-cyan-400/30'
                    : 'border-amber-700 bg-slate-950'
                }`}
              >
                {podium3rd.isPlayer ? (
                  <AvatarRenderer avatar={state.character} size="sm" mode="2d" />
                ) : (
                  <span className="text-2xl">{podium3rd.avatarIcon}</span>
                )}
              </div>
              <span className="text-xs font-bold text-slate-200 truncate max-w-[100px] md:max-w-none text-center">
                {podium3rd.name}
              </span>
              <span className="text-[10px] font-mono text-emerald-400 font-bold">
                {podium3rd.finishTimeSeconds.toFixed(1)} วิ (+{podium3rd.gapSeconds.toFixed(1)})
              </span>

              {/* Pedestal Block #3 */}
              <div className="w-full h-20 md:h-22 bg-gradient-to-t from-amber-950/90 to-amber-900 border-t-4 border-amber-600 rounded-t-2xl flex flex-col items-center justify-center shadow-lg mt-2">
                <span className="text-2xl md:text-3xl font-black font-mono text-amber-300">#3</span>
                <span className="text-[10px] font-bold text-amber-400 uppercase">อันดับ 3</span>
              </div>
            </div>
          </div>

          {/* 4th Place Card */}
          <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between text-xs text-slate-400 max-w-2xl mx-auto w-full">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded bg-slate-800 text-slate-400 font-mono font-bold flex items-center justify-center text-[11px]">
                #4
              </span>
              <span>{rank4th.avatarIcon}</span>
              <span className="font-bold text-slate-300">{rank4th.name}</span>
              <span className="text-[10px] text-slate-500">({rank4th.bikeDesc})</span>
            </div>
            <span className="font-mono text-slate-400">
              {rank4th.finishTimeSeconds.toFixed(1)} วิ (+{rank4th.gapSeconds.toFixed(1)})
            </span>
          </div>
        </div>

        {/* Detailed Telemetry & Documented Scoring Rules (2 Columns) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          {/* Left Column: Official Telemetry Stats (6 Cols) */}
          <div className="md:col-span-6 bg-slate-900/90 border border-indigo-500/30 rounded-2xl p-4 shadow-xl flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-black text-cyan-300 uppercase flex items-center gap-1.5">
                <Gauge className="w-4 h-4 text-cyan-400" />
                ข้อมูลโทรมาตรการแข่งขัน (Saved Race Telemetry)
              </span>
              <span className="text-[10px] text-slate-400 font-mono">ระยะ {trackDist} ม.</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <Clock className="w-3.5 h-3.5 text-emerald-400 mb-1" />
                <span className="text-[10px] text-slate-400 block">เวลาเข้าเส้นชัยรวม</span>
                <span className="font-mono font-bold text-emerald-300 text-sm">{timeSec.toFixed(1)} วินาที</span>
              </div>

              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <Gauge className="w-3.5 h-3.5 text-cyan-400 mb-1" />
                <span className="text-[10px] text-slate-400 block">ความเร็วเฉลี่ย / สูงสุด</span>
                <span className="font-mono font-bold text-cyan-300 text-sm">
                  {avgSpeed} / {topSpeed} กม./ชม.
                </span>
              </div>

              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <Zap className="w-3.5 h-3.5 text-amber-400 mb-1" />
                <span className="text-[10px] text-slate-400 block">พลังงานที่ใช้ไป</span>
                <span className="font-mono font-bold text-amber-300 text-sm">
                  {energyUsedMah} mAh ({energyWh} Wh)
                </span>
              </div>

              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <BatteryCharging className="w-3.5 h-3.5 text-teal-400 mb-1" />
                <span className="text-[10px] text-slate-400 block">พลังงานแบตเตอรี่คงเหลือ</span>
                <span className="font-mono font-bold text-teal-300 text-sm">
                  {remainingMah} mAh ({remainingPct}%)
                </span>
              </div>
            </div>

            {/* Scientific Explanation of Battery Choice */}
            <div className="bg-indigo-950/40 p-3 rounded-xl border border-indigo-500/30 flex flex-col gap-1 mt-1">
              <span className="text-[10px] font-black uppercase text-indigo-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                บทวิเคราะห์ผลลัพธ์จากชุดแบตเตอรี่ที่เลือก (Battery Physics Impact)
              </span>
              <p className="text-[11px] text-slate-200 leading-relaxed">{getBatteryExplanation()}</p>
            </div>
          </div>

          {/* Right Column: Documented Scoring Rubric out of 30 (6 Cols) */}
          <div className="md:col-span-6 bg-slate-900/90 border border-indigo-500/30 rounded-2xl p-4 shadow-xl flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-black text-amber-300 uppercase flex items-center gap-1.5">
                <Award className="w-4 h-4 text-amber-400" />
                เกณฑ์การคิดคะแนน 30 คะแนน (Documented Scoring Rule)
              </span>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded font-bold">
                TOTAL {totalScore30}/30
              </span>
            </div>

            <div className="space-y-2 text-xs">
              {/* Category 1: Rank Points (Max 12) */}
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-200 flex items-center gap-1.5">
                    <span>1. คะแนนอันดับเข้าเส้นชัย (Finish Rank)</span>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    อันดับ 1 = 12 คะแนน, อันดับ 2 = 9, อันดับ 3 = 6, อันดับ 4 = 3
                  </span>
                </div>
                <span className="font-mono font-black text-amber-300 text-sm">
                  {scoring.rankPoints} / 12
                </span>
              </div>

              {/* Category 2: Speed / Pacing Points (Max 10) */}
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-200 flex items-center gap-1.5">
                    <span>2. คะแนนความเร็วและเพซ (Speed & Pacing)</span>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    &ge;30 กม./ชม. = 10 คะแนน, &ge;26 = 8, &ge;22 = 6, &lt;22 = 4
                  </span>
                </div>
                <span className="font-mono font-black text-cyan-300 text-sm">
                  {scoring.speedPacingPoints} / 10
                </span>
              </div>

              {/* Category 3: Battery Efficiency (Max 8) */}
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-200 flex items-center gap-1.5">
                    <span>3. การบริหารพลังงานแบตเตอรี่ (Energy Efficiency)</span>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    แบตเตอรี่คงเหลือ &gt;25% = 8 คะแนน, &gt;10% = 6, &gt;0% = 4, หมด = 2
                  </span>
                </div>
                <span className="font-mono font-black text-emerald-300 text-sm">
                  {scoring.batteryEfficiencyPoints} / 8
                </span>
              </div>
            </div>

            {/* Total Summary Bar */}
            <div className="p-3 rounded-xl bg-gradient-to-r from-amber-950/70 via-slate-950 to-emerald-950/70 border border-amber-500/40 flex items-center justify-between mt-auto">
              <span className="font-bold text-xs text-amber-200 flex items-center gap-1">
                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                คะแนนรวมรอบนี้ (Score Awarded):
              </span>
              <span className="font-mono font-black text-xl text-amber-300">{totalScore30} / 30</span>
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
            className="w-full sm:flex-1 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition min-h-[46px] border border-slate-700 active:scale-95 shadow-md"
          >
            <RotateCcw className="w-4 h-4 text-cyan-400" />
            <span>แข่งใหม่อีกครั้ง (Retry Race)</span>
          </button>

          <button
            onClick={() => goToScene('bike_garage')}
            className="w-full sm:flex-1 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition min-h-[46px] border border-slate-700 active:scale-95 shadow-md"
          >
            <Wrench className="w-4 h-4 text-amber-400" />
            <span>ตรวจสอบวงจรแบตเตอรี่ (Review Circuit)</span>
          </button>

          <button
            onClick={() => goToScene('learning_reflection')}
            className="w-full sm:flex-1 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400 hover:brightness-110 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2 transition min-h-[46px] active:scale-95"
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
