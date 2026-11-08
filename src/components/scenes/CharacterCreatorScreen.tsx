/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  User,
  Sparkles,
  Dice5,
  Save,
  ArrowRight,
  ArrowLeft,
  Check,
} from 'lucide-react';
import { useGameState } from '../../context/GameStateContext';
import { CharacterState } from '../../types/game';
import { AvatarRenderer } from '../common/AvatarRenderer';

const HAIR_STYLES = [
  { id: 'spiky', name: 'ทรงสไปกี้ (Spiky)' },
  { id: 'sleek_bob', name: 'บ็อบเรียบ (Sleek Bob)' },
  { id: 'ponytail', name: 'หางม้า (Ponytail)' },
  { id: 'curly', name: 'หยิกสั้น (Curly)' },
  { id: 'short_crop', name: 'ทรงสั้นเท่ (Short Crop)' },
];

const HAIR_COLORS = [
  { id: '#f59e0b', name: 'สีส้มอำพัน' },
  { id: '#0284c7', name: 'สีฟ้าไซเบอร์' },
  { id: '#ef4444', name: 'สีแดงเพลิง' },
  { id: '#10b981', name: 'สีเขียวมรกต' },
  { id: '#1e293b', name: 'สีดำสนิท' },
  { id: '#f1f5f9', name: 'สีเงินแพลทินัม' },
];

const SKIN_TONES = [
  { id: '#fed7aa', name: 'โทนสว่าง' },
  { id: '#fdba74', name: 'โทนกลาง' },
  { id: '#fbcfe8', name: 'โทนชมพู' },
  { id: '#ca8a04', name: 'โทนสีน้ำผึ้ง' },
  { id: '#78350f', name: 'โทนเข้ม' },
];

const OUTFIT_COLORS = [
  { id: '#0284c7', name: 'สีน้ำเงินสถาบัน' },
  { id: '#f59e0b', name: 'สีส้มช่างกล' },
  { id: '#10b981', name: 'สีเขียวนักซิ่ง' },
  { id: '#8b5cf6', name: 'สีม่วงควอนตัม' },
  { id: '#ef4444', name: 'สีแดงสปีดสเตอร์' },
  { id: '#0f172a', name: 'สีดำคาร์บอน' },
];

export const CharacterCreatorScreen: React.FC = () => {
  const { state, updateCharacter, goToScene } = useGameState();

  const [charDraft, setCharDraft] = useState<CharacterState>(state.character);
  const [nameError, setNameError] = useState<string | null>(null);

  const handleRandomize = () => {
    const randomHair = HAIR_STYLES[Math.floor(Math.random() * HAIR_STYLES.length)].id as CharacterState['hairStyle'];
    const randomHairColor = HAIR_COLORS[Math.floor(Math.random() * HAIR_COLORS.length)].id;
    const randomSkin = SKIN_TONES[Math.floor(Math.random() * SKIN_TONES.length)].id;
    const randomOutfit = OUTFIT_COLORS[Math.floor(Math.random() * OUTFIT_COLORS.length)].id;

    setCharDraft((prev) => ({
      ...prev,
      hairStyle: randomHair,
      hairColor: randomHairColor,
      skinTone: randomSkin,
      outfitColor: randomOutfit,
      suitColor: randomOutfit,
    }));
  };

  const handleSaveAndContinue = () => {
    if (!charDraft.name.trim()) {
      setNameError('กรุณากรอกชื่อตัวละครของท่าน');
      return;
    }
    updateCharacter(charDraft);
    goToScene('volt_tutorial');
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white flex items-center gap-2">
            <User className="w-6 h-6 text-sky-400" />
            <span>สร้างตัวละครนักประดิษฐ์ (Character Creator)</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            ออกแบบชุดและรูปลักษณ์ของนักแข่งพลังงานไฟฟ้าประจำตัว
          </p>
        </div>

        <button
          onClick={handleRandomize}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-xs font-bold transition-all self-start sm:self-auto cursor-pointer"
        >
          <Dice5 className="w-4 h-4" />
          <span>สุ่มรูปลักษณ์ (Randomize)</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* 3D Preview (5 cols) */}
        <div className="md:col-span-5 bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl flex flex-col items-center justify-center space-y-3">
          <div className="text-xs font-mono font-bold text-slate-400">
            ตัวอย่างแบบจำลอง 3 มิติ (หมุนรอบตัว)
          </div>

          <div className="w-full h-64 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-center relative overflow-hidden">
            <AvatarRenderer avatar={charDraft} size="xl" mode="3d" />
          </div>

          <div className="text-center space-y-0.5">
            <div className="text-base font-extrabold text-white">{charDraft.name || 'นักประดิษฐ์'}</div>
            <div className="text-xs text-amber-400 font-mono font-semibold">{charDraft.title}</div>
          </div>
        </div>

        {/* Customization Controls (7 cols) */}
        <div className="md:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
          {/* Name Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300">ชื่อนักประดิษฐ์ (Player Name)</label>
            <input
              type="text"
              value={charDraft.name}
              onChange={(e) => {
                setCharDraft((prev) => ({ ...prev, name: e.target.value }));
                setNameError(null);
              }}
              placeholder="ระบุชื่อตัวละคร..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-bold text-sm focus:outline-none focus:border-sky-400"
              maxLength={20}
            />
            {nameError && <div className="text-xs text-rose-400 font-semibold">{nameError}</div>}
          </div>

          {/* Gender / Body Type */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300">สรีระพื้นฐาน (Body Type)</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setCharDraft((prev) => ({ ...prev, bodyType: 'boy', gender: 'cadet_boy' }))}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  charDraft.bodyType === 'boy'
                    ? 'bg-sky-500 text-slate-950 border-sky-400 shadow-md'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                เด็กหนุ่มนักซิ่ง (Cadet Boy)
              </button>
              <button
                type="button"
                onClick={() => setCharDraft((prev) => ({ ...prev, bodyType: 'girl', gender: 'cadet_girl' }))}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  charDraft.bodyType === 'girl'
                    ? 'bg-sky-500 text-slate-950 border-sky-400 shadow-md'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                เด็กสาวนักประดิษฐ์ (Cadet Girl)
              </button>
            </div>
          </div>

          {/* Hair Styles */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300">ทรงผม (Hair Style)</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {HAIR_STYLES.map((h) => (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => setCharDraft((prev) => ({ ...prev, hairStyle: h.id as CharacterState['hairStyle'] }))}
                  className={`p-2 rounded-xl border text-[11px] font-semibold text-center truncate transition-all cursor-pointer ${
                    charDraft.hairStyle === h.id
                      ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {h.name}
                </button>
              ))}
            </div>
          </div>

          {/* Hair Colors */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300">สีผม (Hair Color)</label>
            <div className="flex flex-wrap gap-2">
              {HAIR_COLORS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCharDraft((prev) => ({ ...prev, hairColor: c.id }))}
                  className={`w-8 h-8 rounded-full border-2 transition-transform cursor-pointer flex items-center justify-center ${
                    charDraft.hairColor === c.id ? 'scale-110 border-white' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c.id }}
                  title={c.name}
                >
                  {charDraft.hairColor === c.id && <Check className="w-4 h-4 text-white drop-shadow" />}
                </button>
              ))}
            </div>
          </div>

          {/* Skin Tone */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300">โทนสีผิว (Skin Tone)</label>
            <div className="flex flex-wrap gap-2">
              {SKIN_TONES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setCharDraft((prev) => ({ ...prev, skinTone: s.id }))}
                  className={`w-8 h-8 rounded-full border-2 transition-transform cursor-pointer flex items-center justify-center ${
                    charDraft.skinTone === s.id ? 'scale-110 border-white' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: s.id }}
                  title={s.name}
                >
                  {charDraft.skinTone === s.id && <Check className="w-4 h-4 text-slate-950" />}
                </button>
              ))}
            </div>
          </div>

          {/* Outfit Color */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300">สีชุดแข่งประจำตัว (Suit Color)</label>
            <div className="flex flex-wrap gap-2">
              {OUTFIT_COLORS.map((oc) => (
                <button
                  key={oc.id}
                  type="button"
                  onClick={() => setCharDraft((prev) => ({ ...prev, outfitColor: oc.id, suitColor: oc.id }))}
                  className={`w-8 h-8 rounded-full border-2 transition-transform cursor-pointer flex items-center justify-center ${
                    charDraft.outfitColor === oc.id ? 'scale-110 border-white' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: oc.id }}
                  title={oc.name}
                >
                  {charDraft.outfitColor === oc.id && <Check className="w-4 h-4 text-white" />}
                </button>
              ))}
            </div>
          </div>

          {/* Save & Continue Button */}
          <div className="pt-2">
            <button
              onClick={handleSaveAndContinue}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-400/20 active:scale-98 transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>บันทึกตัวละครและเริ่มบทเรียน (Save Character)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
