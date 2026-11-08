/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  MapPin,
  Lock,
  Star,
  CheckCircle2,
  Play,
  Award,
  Zap,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  ShieldAlert,
  BatteryCharging,
  Gauge,
  Cpu,
  Trophy,
  Layers,
  Wrench,
  HelpCircle,
} from 'lucide-react';
import { useGameState } from '../../context/GameStateContext';
import { VoltDialog } from '../common/VoltDialog';
import { AvatarRenderer } from '../common/AvatarRenderer';

const MISSION_FACILITIES: Record<
  string,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  m1: { label: 'ห้องทดลองวงจรปิดพื้นฐาน', icon: Cpu, color: 'text-sky-400 bg-sky-950/60 border-sky-800' },
  m2: { label: 'ห้องวิจัยการต่อแบบอนุกรม', icon: Zap, color: 'text-amber-400 bg-amber-950/60 border-amber-800' },
  m3: { label: 'ห้องวิจัยการต่อแบบขนาน', icon: BatteryCharging, color: 'text-emerald-400 bg-emerald-950/60 border-emerald-800' },
  m4: { label: 'โรงงานประกอบแพ็กแบตเตอรี่', icon: Layers, color: 'text-indigo-400 bg-indigo-950/60 border-indigo-800' },
  m5: { label: 'ห้องทดสอบไดนาโมมอเตอร์', icon: Gauge, color: 'text-purple-400 bg-purple-950/60 border-purple-800' },
  m6: { label: 'สนามแข่งขันจักรยานชิงแชมป์', icon: Trophy, color: 'text-rose-400 bg-rose-950/60 border-rose-800' },
};

const MISSION_VOLT_TIPS: Record<string, string> = {
  m1: 'เริ่มจากเรียนรู้การไหลของอิเล็กตรอน วงจรปิด-วงจรเปิด และการควบคุมสวิตช์ไฟหลอด 1.5V ครับ',
  m2: 'การต่อเซลล์แบบอนุกรมจะนำแรงดันมารวมกัน (V_total = V1 + V2) ช่วยเพิ่มแรงดันขับดันหลอดไฟสว่างจ้าขึ้น!',
  m3: 'การต่อแบบขนาน แรงดันไฟฟ้าจะเท่าเดิมที่ 1.5V แต่ความจุ (mAh) จะเพิ่มขึ้นสองเท่า ช่วยให้วงจรจ่ายไฟได้นานขึ้น!',
  m4: 'รวมกลุ่มอนุกรมและขนานเข้าด้วยกันเป็น 4S 2P เพื่อให้ได้ทั้ง 6.0V และ 4000mAh สำหรับจักรยานแข่ง!',
  m5: 'ทดสอบแพ็กแบตเตอรี่กับมอเตอร์กระแสตรง สังเกตความสัมพันธ์ระหว่างโวลต์ กระแส และรอบ RPM!',
  m6: 'สนามแข่งกรังด์ปรีซ์เปิดแล้ว! นำจักรยานและแบตเตอรี่ที่ผ่านการทดสอบเข้าสู่สนามเพื่อคว้าแชมป์!',
};

export const MissionMapScreen: React.FC = () => {
  const { state, goToScene } = useGameState();

  const [selectedMissionId, setSelectedMissionId] = useState<string>(() => {
    const uncompleted = state.missions.find((m) => m.isUnlocked && !m.isCompleted);
    if (uncompleted) return uncompleted.id;
    const firstUnlocked = state.missions.find((m) => m.isUnlocked);
    return firstUnlocked?.id || state.missions[0]?.id || 'm1';
  });

  const selectedMission =
    state.missions.find((m) => m.id === selectedMissionId) || state.missions[0];

  const totalMissions = state.missions.length;
  const completedMissions = state.missions.filter((m) => m.isCompleted).length;
  const progressPercent = Math.round((completedMissions / Math.max(1, totalMissions)) * 100);
  const totalStarsEarned = state.missions.reduce((acc, m) => acc + (m.stars || 0), 0);
  const maxPossibleStars = totalMissions * 3;

  const facility = MISSION_FACILITIES[selectedMission.id] || {
    label: 'ห้องปฏิบัติการวิทยาศาสตร์',
    icon: Cpu,
    color: 'text-sky-400 bg-sky-950/60 border-sky-800',
  };
  const FacilityIcon = facility.icon;

  const voltMessage = !selectedMission.isUnlocked
    ? `ภารกิจนี้ยังถูกล็อกอยู่ครับ cadet! คุณจำเป็นต้องผ่านภารกิจ "${selectedMission.prerequisiteTitle || 'ด่านก่อนหน้า'}" ให้สำเร็จก่อน`
    : selectedMission.isCompleted
    ? `คุณผ่านภารกิจนี้ด้วยคะแนน ${selectedMission.highestScore || 0} แต้มแล้ว สามารถกดเริ่มเพื่อฝึกซ้อมทำคะแนนระดับ 3 ดาวได้ตลอดเวลาครับ`
    : MISSION_VOLT_TIPS[selectedMission.id] ||
      'ตรวจสอบอุปกรณ์และเป้าหมายให้พร้อม จากนั้นกดปุ่มเริ่มภารกิจเพื่อเข้าสู่ห้องทดลองได้เลยครับ!';

  return (
    <div className="max-w-6xl mx-auto p-3 sm:p-6 space-y-5">
      {/* Top Header Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl backdrop-blur flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => goToScene('main_menu')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 transition-all text-xs sm:text-sm font-semibold active:scale-95 shrink-0 cursor-pointer"
            title="กลับสู่หน้าจอเมนูหลัก"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>กลับสู่เมนูหลัก</span>
          </button>

          <div>
            <h1 className="text-lg sm:text-xl font-extrabold text-white flex items-center gap-2">
              <MapPin className="w-5 h-5 text-amber-400 shrink-0" />
              <span>แผนที่ภารกิจสถาบันนักซิ่ง</span>
            </h1>
            <p className="text-xs text-slate-400">
              เส้นทางฝึกอบรมวิศวกรไฟฟ้า 6 ด่าน สู่การแข่งขันจักรยานชิงแชมป์
            </p>
          </div>
        </div>

        {/* Cadet Profile & Progress Pill */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          <div className="flex items-center gap-2.5 bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-1.5">
            <div className="w-8 h-8 rounded-lg overflow-hidden bg-slate-800 border border-slate-700 shrink-0">
              <AvatarRenderer avatar={state.character} size="sm" mode="2d" />
            </div>
            <div className="text-left">
              <div className="text-xs font-bold text-white truncate max-w-[120px]">
                {state.character.name || 'นักเรียนฝึกหัด'}
              </div>
              <div className="text-[10px] text-amber-300 font-medium">
                {state.learning.academyRank}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <div className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 font-bold flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span>
                {totalStarsEarned} / {maxPossibleStars}
              </span>
            </div>

            <div className="px-3 py-1.5 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-300 font-bold flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-sky-400" />
              <span>
                {completedMissions} / {totalMissions} ด่าน
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Curriculum Progress Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 font-bold text-slate-300">
            <Zap className="w-4 h-4 text-amber-400" />
            <span>ความก้าวหน้าหลักสูตรวิศวกรรมไฟฟ้า (Curriculum Progress)</span>
          </div>
          <span className="font-mono font-bold text-amber-400">
            {completedMissions} / {totalMissions} ด่าน ({progressPercent}%)
          </span>
        </div>
        <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800">
          <div
            className="h-full bg-gradient-to-r from-amber-500 via-sky-400 to-emerald-400 rounded-full transition-all duration-700"
            style={{ width: `${Math.max(5, progressPercent)}%` }}
          />
        </div>
      </div>

      <VoltDialog
        mood={!selectedMission.isUnlocked ? 'warning' : selectedMission.isCompleted ? 'happy' : 'idea'}
        title={`คำแนะนำจาก VOLT: ${selectedMission.code}`}
        message={voltMessage}
      />

      {/* Main Grid: Connected Roadmap (Left) + Mission Details Panel (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Connected Visual Map Nodes (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <MapPin className="w-4 h-4 text-sky-400" />
                <span>เส้นทางเชื่อมต่อวงจร (Circuit Roadmap)</span>
              </h2>
              <p className="text-[11px] text-slate-400">
                แตะด่านที่ต้องการเพื่อตรวจสอบเป้าหมายและเริ่มปฏิบัติภารกิจ
              </p>
            </div>
            <div className="text-[11px] text-slate-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 font-mono">
              6 ภารกิจหลัก
            </div>
          </div>

          <div className="relative space-y-3 pt-1">
            {state.missions.map((mission, idx) => {
              const isSelected = mission.id === selectedMission.id;
              const isLast = idx === state.missions.length - 1;
              const nextMission = state.missions[idx + 1];
              const isPathActive = mission.isCompleted && nextMission?.isUnlocked;
              const fInfo = MISSION_FACILITIES[mission.id] || MISSION_FACILITIES.m1;
              const FIcon = fInfo.icon;

              return (
                <div key={mission.id} className="relative">
                  {!isLast && (
                    <div className="absolute left-6 top-14 bottom-[-14px] w-1 z-0 flex flex-col items-center">
                      <div
                        className={`w-1 h-full rounded-full transition-colors ${
                          isPathActive
                            ? 'bg-gradient-to-b from-emerald-500 via-sky-400 to-amber-400'
                            : mission.isCompleted
                            ? 'bg-emerald-500/50'
                            : 'bg-slate-800 border-dashed'
                        }`}
                      />
                    </div>
                  )}

                  <div
                    onClick={() => setSelectedMissionId(mission.id)}
                    className={`relative z-10 p-3.5 sm:p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 group ${
                      !mission.isUnlocked
                        ? isSelected
                          ? 'bg-slate-900 border-amber-500/50 text-slate-400 shadow-md ring-1 ring-amber-500/30'
                          : 'bg-slate-950/60 border-slate-800/80 text-slate-500 hover:border-slate-700/80'
                        : isSelected
                        ? 'bg-gradient-to-r from-sky-950/80 via-slate-900 to-amber-950/40 border-sky-400 text-white shadow-lg ring-2 ring-sky-400/40'
                        : 'bg-slate-800/50 hover:bg-slate-800/80 border-slate-700/60 text-slate-200 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div
                        className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 shadow-md ${
                          !mission.isUnlocked
                            ? 'bg-slate-800 text-slate-500 border border-slate-700'
                            : mission.isCompleted
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                            : isSelected
                            ? 'bg-amber-400 text-slate-950 font-extrabold shadow-amber-400/30'
                            : 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                        }`}
                      >
                        {!mission.isUnlocked ? (
                          <Lock className="w-5 h-5 text-slate-500" />
                        ) : mission.isCompleted ? (
                          <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                        ) : (
                          <FIcon className="w-5 h-5" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              !mission.isUnlocked
                                ? 'bg-slate-800 text-slate-500'
                                : 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                            }`}
                          >
                            {mission.code}
                          </span>
                          <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
                            {fInfo.label}
                          </span>
                        </div>

                        <h3 className="text-xs sm:text-sm font-bold truncate mt-0.5 text-white">
                          {mission.title}
                        </h3>

                        <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                          {mission.objective}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0 text-right">
                      {!mission.isUnlocked ? (
                        <div className="flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                          <Lock className="w-3 h-3 text-slate-500" />
                          <span>ล็อกอยู่</span>
                        </div>
                      ) : mission.isCompleted ? (
                        <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span>ผ่านแล้ว</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-[11px] font-semibold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 animate-pulse">
                          <Sparkles className="w-3 h-3 text-amber-400" />
                          <span>พร้อมเริ่ม</span>
                        </div>
                      )}

                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3].map((s) => (
                          <Star
                            key={s}
                            className={`w-3.5 h-3.5 ${
                              s <= (mission.stars || 0)
                                ? 'fill-amber-400 text-amber-400 drop-shadow-[0_0_4px_rgba(251,191,36,0.5)]'
                                : 'text-slate-700'
                            }`}
                          />
                        ))}
                      </div>

                      <div className="text-[10px] font-mono text-slate-400">
                        {mission.highestScore && mission.highestScore > 0 ? (
                          <span className="text-sky-300 font-semibold">
                            {mission.highestScore.toLocaleString()} แต้ม
                          </span>
                        ) : (
                          <span>+{mission.rewardExp} EXP</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Selected Mission Detail Card & Start Action (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="border-b border-slate-800 pb-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded border border-amber-500/20">
                  {selectedMission.code}
                </span>

                {selectedMission.isCompleted ? (
                  <span className="text-xs font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    ผ่านภารกิจแล้ว
                  </span>
                ) : selectedMission.isUnlocked ? (
                  <span className="text-xs font-bold text-sky-400 bg-sky-500/15 border border-sky-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                    ปลดล็อกแล้ว
                  </span>
                ) : (
                  <span className="text-xs font-bold text-rose-400 bg-rose-500/15 border border-rose-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5" />
                    ยังถูกล็อก
                  </span>
                )}
              </div>

              <h3 className="text-base sm:text-lg font-extrabold text-white mt-2">
                {selectedMission.title}
              </h3>

              <div className={`mt-2 inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border ${facility.color}`}>
                <FacilityIcon className="w-3.5 h-3.5" />
                <span>{facility.label}</span>
              </div>
            </div>

            {!selectedMission.isUnlocked ? (
              <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/80 text-rose-200 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-xs text-rose-300">
                  <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>ภารกิจยังไม่เปิดให้เข้าใช้งาน</span>
                </div>
                <p className="text-xs leading-relaxed text-rose-300/90">
                  คุณต้องผ่านภารกิจ{' '}
                  <span className="font-bold underline text-white">
                    {selectedMission.prerequisiteTitle || 'ด่านก่อนหน้า'}
                  </span>{' '}
                  ให้สำเร็จก่อน ระบบจึงจะเปิดประตูห้องทดลองนี้ให้ครับ
                </p>
              </div>
            ) : selectedMission.isCompleted ? (
              <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-200 flex items-start gap-2 text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <p>
                  คุณผ่านการทดสอบด่านนี้แล้ว สามารถเข้าเล่นซ้ำเพื่อพัฒนาฝีมือและทำสถิติคะแนน 3 ดาวใหม่ได้เสมอ!
                </p>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-sky-950/40 border border-sky-800/60 text-sky-200 flex items-start gap-2 text-xs">
                <Zap className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <p>
                  คุณสมบัติของคุณพร้อมแล้ว! กดปุ่มเริ่มภารกิจด้านล่างเพื่อเข้าสู่ห้องทดลองทันที
                </p>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                <span>เป้าหมายการทดลอง</span>
              </label>
              <div className="text-xs text-slate-200 bg-slate-950/70 p-3 rounded-xl border border-slate-800 leading-relaxed">
                {selectedMission.objective}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block mb-0.5">แรงดันเป้าหมาย</span>
                <span className="font-mono font-bold text-amber-300 text-sm">
                  {selectedMission.requiredVoltageMin.toFixed(1)}V –{' '}
                  {selectedMission.requiredVoltageMax.toFixed(1)}V
                </span>
              </div>
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block mb-0.5">ความจุขั้นต่ำ</span>
                <span className="font-mono font-bold text-sky-300 text-sm">
                  {selectedMission.requiredCapacityMin.toLocaleString()} mAh
                </span>
              </div>
            </div>

            {selectedMission.equipment && selectedMission.equipment.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5 text-sky-400" />
                  <span>อุปกรณ์ประจำภารกิจ</span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {selectedMission.equipment.map((item, i) => (
                    <span
                      key={i}
                      className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800/80 text-slate-200 border border-slate-700 font-medium"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
              <div className="space-y-0.5">
                <span className="text-[10px] text-slate-400 block">คะแนนสูงสุดของคุณ</span>
                <span className="font-mono font-bold text-sky-300 text-sm">
                  {selectedMission.highestScore ? `${selectedMission.highestScore.toLocaleString()} แต้ม` : 'ยังไม่มีคะแนน'}
                </span>
              </div>
              <div className="text-right space-y-0.5">
                <span className="text-[10px] text-slate-400 block">รางวัลเมื่อสำเร็จ</span>
                <span className="font-mono font-bold text-amber-400 text-sm">
                  +{selectedMission.rewardExp} EXP
                </span>
              </div>
            </div>
          </div>

          <div className="pt-2">
            {selectedMission.isUnlocked ? (
              <button
                onClick={() => goToScene(selectedMission.targetScene)}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-400/20 active:scale-98 transition-all cursor-pointer"
              >
                <Play className="w-4 h-4 fill-slate-950" />
                <span>
                  {selectedMission.isCompleted
                    ? `เข้าสู่ภารกิจอีกครั้ง (${selectedMission.code})`
                    : `เริ่มภารกิจ (${selectedMission.code})`}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                disabled
                className="w-full py-3.5 px-4 rounded-xl bg-slate-800/80 text-slate-500 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 border border-slate-700/60 cursor-not-allowed opacity-70"
                title={`ต้องผ่าน ${selectedMission.prerequisiteTitle || 'ด่านก่อนหน้า'} ก่อน`}
              >
                <Lock className="w-4 h-4 text-slate-500" />
                <span>ยังล็อกอยู่ (ต้องผ่าน {selectedMission.prerequisiteTitle || 'ด่านก่อนหน้า'})</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
