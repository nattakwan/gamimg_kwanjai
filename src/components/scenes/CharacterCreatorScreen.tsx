/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CharacterCreatorScreen — Inspired by modern stylized mobile adventure games.
 * Features full 3D interactive character viewport with 360° rotation,
 * top name edit with gender selector badges, and left/right stepper controls
 * for Hair Color, Skin Tone, Face, Hair Style, Outfit, and Colors.
 */

import React, { useState } from 'react';
import {
  Edit3,
  Dice5,
  Save,
  ArrowRight,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Check,
} from 'lucide-react';
import { useGameState } from '../../context/GameStateContext';
import { CharacterState } from '../../types/game';
import { Character3DViewer } from '../character/Character3DViewer';

// 24 Hair Colors (1/24 to 24/24)
const HAIR_COLORS = [
  { id: '#451a03', name: 'น้ำตาลเอสเปรสโซ' },
  { id: '#78350f', name: 'น้ำตาลเข้ม' },
  { id: '#171717', name: 'ดำสนิท' },
  { id: '#292524', name: 'ดำธรรมชาติ' },
  { id: '#b45309', name: 'ทองแดงอบอุ่น' },
  { id: '#d97706', name: 'น้ำตาลทอง' },
  { id: '#f59e0b', name: 'ส้มอำพัน' },
  { id: '#ca8a04', name: 'บลอนด์ทอง' },
  { id: '#fde047', name: 'บลอนด์สว่าง' },
  { id: '#ea580c', name: 'ส้มเพลิง' },
  { id: '#dc2626', name: 'แดงเข้ม' },
  { id: '#991b1b', name: 'แดงมารูน' },
  { id: '#0284c7', name: 'ฟ้าไซเบอร์' },
  { id: '#2563eb', name: 'น้ำเงินโคบอลต์' },
  { id: '#1d4ed8', name: 'น้ำเงินรอยัล' },
  { id: '#10b981', name: 'เขียวมรกต' },
  { id: '#059669', name: 'เขียวป่าสน' },
  { id: '#8b5cf6', name: 'ม่วงนีออน' }, // index 18 (18/24 like in screenshot)
  { id: '#7c3aed', name: 'ม่วงไวโอเล็ต' },
  { id: '#ec4899', name: 'ชมพูฟิวเชีย' },
  { id: '#71717a', name: 'เทาเงิน' },
  { id: '#f1f5f9', name: 'ขาวแพลทินัม' },
  { id: '#a16207', name: 'น้ำตาลคาราเมล' },
  { id: '#0d9488', name: 'เขียวเทอร์ควอยซ์' },
];

// 24 Skin Tones (1/24 to 24/24)
const SKIN_TONES = [
  { id: '#fff1f2', name: 'ขาวสว่างมาก' },
  { id: '#fef2f2', name: 'ขาวอมชมพู' },
  { id: '#ffedd5', name: 'ขาวเหลือง' },
  { id: '#fed7aa', name: 'ขาวนวลธรรมชาติ' },
  { id: '#fed7aa', name: 'โทนเบจสว่าง' },
  { id: '#fdba74', name: 'โทนเนื้ออมส้ม' },
  { id: '#fb923c', name: 'โทนอบอุ่น' },
  { id: '#fde68a', name: 'โทนงาช้าง' },
  { id: '#fcd34d', name: 'โทนทรายทอง' },
  { id: '#fbbf24', name: 'โทนอำพัน' },
  { id: '#f59e0b', name: 'โทนสีน้ำผึ้งอ่อน' },
  { id: '#d97706', name: 'โทนน้ำตาลทอง' },
  { id: '#ca8a04', name: 'โทนสีน้ำผึ้งเข้ม' },
  { id: '#fbcfe8', name: 'โทนชมพูโรซี่' }, // index 14 (14/24 like in screenshot)
  { id: '#e2e8f0', name: 'โทนเย็นสว่าง' },
  { id: '#cbd5e1', name: 'โทนเทาไซเบอร์' },
  { id: '#a16207', name: 'โทนแทนธรรมชาติ' },
  { id: '#b45309', name: 'โทนบรอนซ์แทน' },
  { id: '#9a3412', name: 'โทนทองแดง' },
  { id: '#854d0e', name: 'โทนน้ำตาลคาราเมล' },
  { id: '#78350f', name: 'โทนน้ำตาลเข้ม' },
  { id: '#713f12', name: 'โทนโกโก้' },
  { id: '#451a03', name: 'โทนเอสเปรสโซ' },
  { id: '#292524', name: 'โทนเข้มลึก' },
];

// 8 Face Styles (1/8 to 8/8)
const FACE_STYLES = [
  { id: 1, name: 'หน้าเนียนใส (Clean)' },
  { id: 2, name: 'เคราแพะสไตลิช (Goatee)' },
  { id: 3, name: 'เคราสั้นคมเข้ม (Trimmed Beard)' },
  { id: 4, name: 'เคราเต็มกรอบหน้า (Full Beard)' },
  { id: 5, name: 'หนวดขาว & แว่นตากลม (Professor Glasses & Mustache)' },
  { id: 6, name: 'กระแก้มธรรมชาติ (Freckles)' },
  { id: 7, name: 'แว่นก๊อกเกิลไฟฟ้าบนหน้าผาก (Electric Goggles)' },
  { id: 8, name: 'ลวดลายไซเบอร์ (Cyber Mark)' },
];

// 8 Hair Styles (1/8 to 8/8)
const HAIR_STYLES = [
  { id: 'side_braid', name: 'เปียข้างสาวเทค (Electra Side Braid)' },
  { id: 'wild_scientist', name: 'ผมฟูนักวิทย์สติเฟื่อง (Wild Professor)' },
  { id: 'spiky', name: 'ทรงสไปกี้ตั้ง (Spiky)' },
  { id: 'adventurer', name: 'ลอนคลื่นนักผจญภัย (Adventurer Waves)' },
  { id: 'short_crop', name: 'ทรงสั้นเท่ทันสมัย (Short Crop)' },
  { id: 'sleek_bob', name: 'บ็อบเรียบโมเดิร์น (Sleek Bob)' },
  { id: 'ponytail', name: 'หางม้าทะมัดทะแมง (High Ponytail)' },
  { id: 'curly', name: 'หยิกสั้นมีสไตล์ (Curly)' },
];

// 6 Outfits (1/6 to 6/6)
const OUTFITS = [
  { id: 'tech_hoodie', name: 'ฮู้ดดี้สายฟ้า & แท็บเล็ต (Electric Hoodie & Tablet)' },
  { id: 'tweed_professor', name: 'สูททวีด & หนูแฮมสเตอร์ (Professor Coat & Hamster)' },
  { id: 'adventurer_shirt', name: 'เสื้อนักผจญภัยคอวี (Adventurer Tunic)' },
  { id: 'speed_jumpsuit', name: 'จัมป์สูทนักซิ่ง (Speed Jumpsuit)' },
  { id: 'lab_coat', name: 'เสื้อกาวน์ช่างไฟฟ้า (Cadet Lab Coat)' },
  { id: 'cyber_armor', name: 'ชุดเกราะควอนตัม (Cyber Armor)' },
];

// 12 Outfit Colors
const OUTFIT_COLORS = [
  { id: '#f8fafc', name: 'สีขาวครีม (Off-White)' },
  { id: '#0284c7', name: 'สีน้ำเงินสถาบัน (Cadet Blue)' },
  { id: '#f59e0b', name: 'สีส้มช่างกล (Amber Gold)' },
  { id: '#10b981', name: 'สีเขียวนักซิ่ง (Emerald)' },
  { id: '#ef4444', name: 'สีแดงสปีด (Speed Red)' },
  { id: '#8b5cf6', name: 'สีม่วงควอนตัม (Violet)' },
  { id: '#0f172a', name: 'สีดำคาร์บอน (Carbon Black)' },
  { id: '#387478', name: 'สีเขียวเทล (Sage Teal)' },
  { id: '#ca8a04', name: 'สีทองคาลาเมล (Caramel)' },
  { id: '#78350f', name: 'สีน้ำตาลหนัง (Leather Brown)' },
  { id: '#e2e8f0', name: 'สีเงินไทเทเนียม (Silver)' },
  { id: '#ec4899', name: 'สีชมพูนีออน (Neon Pink)' },
];

export const CharacterCreatorScreen: React.FC = () => {
  const { state, updateCharacter, goToScene } = useGameState();

  const [charDraft, setCharDraft] = useState<CharacterState>({
    ...state.character,
    faceStyle: state.character.faceStyle || 3,
    hairStyle: state.character.hairStyle || 'short_crop',
    jacketStyle: state.character.jacketStyle || 'adventurer_shirt',
  });

  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [nameInputValue, setNameInputValue] = useState<string>(charDraft.name || 'Alis');

  // Find current indices for steppers
  const hairColorIdx = Math.max(
    0,
    HAIR_COLORS.findIndex((c) => c.id.toLowerCase() === charDraft.hairColor?.toLowerCase())
  );

  const skinToneIdx = Math.max(
    0,
    SKIN_TONES.findIndex((s) => s.id.toLowerCase() === charDraft.skinTone?.toLowerCase())
  );

  const faceStyleIdx = (charDraft.faceStyle || 3) - 1;

  const hairStyleIdx = Math.max(
    0,
    HAIR_STYLES.findIndex((h) => h.id === charDraft.hairStyle)
  );

  const outfitIdx = Math.max(
    0,
    OUTFITS.findIndex((o) => o.id === charDraft.jacketStyle)
  );

  const outfitColorIdx = Math.max(
    0,
    OUTFIT_COLORS.findIndex((c) => c.id.toLowerCase() === charDraft.outfitColor?.toLowerCase())
  );

  // Stepper handlers
  const handleHairColorStep = (delta: number) => {
    const nextIdx = (hairColorIdx + delta + HAIR_COLORS.length) % HAIR_COLORS.length;
    setCharDraft((prev) => ({ ...prev, hairColor: HAIR_COLORS[nextIdx].id }));
  };

  const handleSkinToneStep = (delta: number) => {
    const nextIdx = (skinToneIdx + delta + SKIN_TONES.length) % SKIN_TONES.length;
    setCharDraft((prev) => ({ ...prev, skinTone: SKIN_TONES[nextIdx].id }));
  };

  const handleFaceStyleStep = (delta: number) => {
    const nextIdx = (faceStyleIdx + delta + FACE_STYLES.length) % FACE_STYLES.length;
    setCharDraft((prev) => ({ ...prev, faceStyle: FACE_STYLES[nextIdx].id }));
  };

  const handleHairStyleStep = (delta: number) => {
    const nextIdx = (hairStyleIdx + delta + HAIR_STYLES.length) % HAIR_STYLES.length;
    setCharDraft((prev) => ({
      ...prev,
      hairStyle: HAIR_STYLES[nextIdx].id as CharacterState['hairStyle'],
    }));
  };

  const handleOutfitStep = (delta: number) => {
    const nextIdx = (outfitIdx + delta + OUTFITS.length) % OUTFITS.length;
    setCharDraft((prev) => ({
      ...prev,
      jacketStyle: OUTFITS[nextIdx].id as CharacterState['jacketStyle'],
    }));
  };

  const handleOutfitColorStep = (delta: number) => {
    const nextIdx = (outfitColorIdx + delta + OUTFIT_COLORS.length) % OUTFIT_COLORS.length;
    setCharDraft((prev) => ({
      ...prev,
      outfitColor: OUTFIT_COLORS[nextIdx].id,
      suitColor: OUTFIT_COLORS[nextIdx].id,
    }));
  };

  // Gender toggles
  const handleSelectBoy = () => {
    setCharDraft((prev) => ({
      ...prev,
      gender: 'cadet_boy',
      bodyType: 'boy',
    }));
  };

  const handleSelectGirl = () => {
    setCharDraft((prev) => ({
      ...prev,
      gender: 'cadet_girl',
      bodyType: 'girl',
    }));
  };

  // Quick Archetype Presets (ELECTRIO & Adventurer)
  const handleSelectPreset = (archetype: 'tech_girl' | 'professor' | 'adventurer') => {
    if (archetype === 'tech_girl') {
      setNameInputValue('ขวัญใจ (Kwanjai)');
      setCharDraft((prev) => ({
        ...prev,
        name: 'ขวัญใจ (Kwanjai)',
        gender: 'cadet_girl',
        bodyType: 'girl',
        hairStyle: 'side_braid',
        hairColor: '#b45309', // Warm copper / auburn
        skinTone: '#ffedd5', // Fair warm
        faceStyle: 6, // Freckles
        jacketStyle: 'tech_hoodie',
        outfitColor: '#0284c7', // Cyan electric blue
        suitColor: '#0284c7',
        archetype: 'tech_girl',
        hasTablet: true,
        hasGoggles: false,
        hasGlasses: false,
        hasMustache: false,
        hasPetHamster: false,
      }));
    } else if (archetype === 'professor') {
      setNameInputValue('ดร.วัตต์ (Prof. Watt)');
      setCharDraft((prev) => ({
        ...prev,
        name: 'ดร.วัตต์ (Prof. Watt)',
        gender: 'cadet_boy',
        bodyType: 'boy',
        hairStyle: 'wild_scientist',
        hairColor: '#f1f5f9', // Fluffy platinum white
        skinTone: '#fed7aa',
        faceStyle: 5, // Glasses & Mustache
        jacketStyle: 'tweed_professor',
        outfitColor: '#ca8a04', // Caramel tweed
        suitColor: '#ca8a04',
        archetype: 'professor',
        hasTablet: false,
        hasGoggles: true,
        hasGlasses: true,
        hasMustache: true,
        hasPetHamster: true,
      }));
    } else {
      setNameInputValue('Alis');
      setCharDraft((prev) => ({
        ...prev,
        name: 'Alis',
        gender: 'cadet_boy',
        bodyType: 'boy',
        hairStyle: 'short_crop',
        hairColor: '#78350f', // Dark brown
        skinTone: '#fed7aa',
        faceStyle: 3, // Trimmed beard
        jacketStyle: 'adventurer_shirt',
        outfitColor: '#f8fafc',
        suitColor: '#f8fafc',
        archetype: 'adventurer',
        hasTablet: false,
        hasGoggles: false,
        hasGlasses: false,
        hasMustache: false,
        hasPetHamster: false,
      }));
    }
  };

  const handleRandomize = () => {
    const randomHairColor = HAIR_COLORS[Math.floor(Math.random() * HAIR_COLORS.length)].id;
    const randomSkin = SKIN_TONES[Math.floor(Math.random() * SKIN_TONES.length)].id;
    const randomFace = FACE_STYLES[Math.floor(Math.random() * FACE_STYLES.length)].id;
    const randomHair = HAIR_STYLES[Math.floor(Math.random() * HAIR_STYLES.length)].id as CharacterState['hairStyle'];
    const randomOutfit = OUTFITS[Math.floor(Math.random() * OUTFITS.length)].id as CharacterState['jacketStyle'];
    const randomOutfitColor = OUTFIT_COLORS[Math.floor(Math.random() * OUTFIT_COLORS.length)].id;

    setCharDraft((prev) => ({
      ...prev,
      hairColor: randomHairColor,
      skinTone: randomSkin,
      faceStyle: randomFace,
      hairStyle: randomHair,
      jacketStyle: randomOutfit,
      outfitColor: randomOutfitColor,
      suitColor: randomOutfitColor,
    }));
  };

  const handleSaveAndContinue = () => {
    const finalName = nameInputValue.trim() || 'Alis';
    const updated = {
      ...charDraft,
      name: finalName,
    };
    updateCharacter(updated);
    goToScene('volt_tutorial');
  };

  const isGirl = charDraft.gender === 'cadet_girl' || charDraft.bodyType === 'girl';

  return (
    <div className="relative min-h-[calc(100vh-3.5rem)] max-h-[calc(100vh-3.5rem)] md:h-[calc(100vh-3.5rem)] w-full flex flex-col justify-between overflow-y-auto md:overflow-hidden font-sans select-none bg-gradient-to-b from-[#87c5eb] via-[#b6e2a1] to-[#437b2d]">
      {/* ── Meadow Sky & Nature Backdrop Overlay ── */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Soft sunlight glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-b from-amber-100/40 via-yellow-100/20 to-transparent blur-3xl" />

        {/* Soft rolling hills silhouette */}
        <div className="absolute bottom-0 inset-x-0 h-64 bg-gradient-to-t from-[#2e591b] via-[#4d8631]/80 to-transparent" />

        {/* Foreground stylized grass blade accents */}
        <div className="absolute bottom-0 inset-x-0 h-16 flex justify-between items-end opacity-70 px-2 pointer-events-none">
          {Array.from({ length: 36 }).map((_, i) => (
            <div
              key={i}
              className="bg-[#244713] rounded-t-full transform origin-bottom"
              style={{
                width: `${8 + (i % 5) * 4}px`,
                height: `${20 + ((i * 7) % 28)}px`,
                transform: `rotate(${((i % 7) - 3) * 5}deg)`,
              }}
            />
          ))}
        </div>
      </div>

      {/* ── Top Header: Character Name & Gender Badges ── */}
      <header className="relative z-20 pt-2 md:pt-3 flex flex-col items-center gap-1.5 shrink-0">
        {/* Name with Edit Pencil Icon */}
        <div className="flex items-center gap-2">
          {isEditingName ? (
            <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-md px-3 py-1 rounded-2xl border border-amber-400/60 shadow-xl">
              <input
                type="text"
                value={nameInputValue}
                onChange={(e) => setNameInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') setIsEditingName(false);
                }}
                className="bg-transparent text-white font-black text-lg md:text-2xl text-center focus:outline-none w-40 md:w-48"
                maxLength={18}
                autoFocus
              />
              <button
                type="button"
                onClick={() => setIsEditingName(false)}
                className="p-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition"
                title="ยืนยันชื่อ"
              >
                <Check className="w-4 h-4 md:w-5 md:h-5 stroke-[3]" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 group">
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-black text-white tracking-wide drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]">
                {nameInputValue || 'Alis'}
              </h1>
              <button
                type="button"
                onClick={() => setIsEditingName(true)}
                className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-[#78350f] hover:bg-[#92400e] active:scale-95 border-2 border-[#b45309] text-white flex items-center justify-center shadow-lg transition-all cursor-pointer"
                title="แก้ไขชื่อตัวละคร"
              >
                <Edit3 className="w-3.5 h-3.5 md:w-4 md:h-4 stroke-[2.5]" />
              </button>
            </div>
          )}
        </div>

        {/* Gender Selection Badges (Matching Screenshot) */}
        <div className="flex items-center gap-2.5">
          {/* Female Icon Badge */}
          <button
            type="button"
            onClick={handleSelectGirl}
            className={`w-11 h-11 md:w-13 md:h-13 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer shadow-lg active:scale-95 border-2 ${
              isGirl
                ? 'bg-[#ea580c] border-amber-300 shadow-orange-500/50 scale-105 ring-4 ring-orange-400/30'
                : 'bg-[#1e3a34] hover:bg-[#254942] border-[#2e5950] opacity-85 hover:opacity-100'
            }`}
            title="เลือกตัวละครหญิง (Cadet Girl)"
          >
            {/* Female Figure Silhouette */}
            <svg className="w-6 h-6 md:w-7 md:h-7 fill-white drop-shadow" viewBox="0 0 24 24">
              <circle cx="12" cy="5" r="3" />
              <path d="M12 9c-2.5 0-4.5 1.8-4.5 4.2l1.2 6.8h6.6l1.2-6.8c0-2.4-2-4.2-4.5-4.2z" />
            </svg>
          </button>

          {/* Male Icon Badge (Selected in screenshot) */}
          <button
            type="button"
            onClick={handleSelectBoy}
            className={`w-11 h-11 md:w-13 md:h-13 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer shadow-lg active:scale-95 border-2 ${
              !isGirl
                ? 'bg-[#ea580c] border-amber-300 shadow-orange-500/50 scale-105 ring-4 ring-orange-400/30'
                : 'bg-[#1e3a34] hover:bg-[#254942] border-[#2e5950] opacity-85 hover:opacity-100'
            }`}
            title="เลือกตัวละครชาย (Cadet Boy)"
          >
            {/* Male Figure Silhouette */}
            <svg className="w-6 h-6 md:w-7 md:h-7 fill-white drop-shadow" viewBox="0 0 24 24">
              <circle cx="12" cy="5" r="3" />
              <path d="M14 9h-4c-1.1 0-2 .9-2 2v5h2v6h4v-6h2v-5c0-1.1-.9-2-2-2z" />
            </svg>
          </button>
        </div>

        {/* Quick Archetype Preset Selectors (ELECTRIO & Adventurer Styles) */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 px-2">
          <button
            type="button"
            onClick={() => handleSelectPreset('tech_girl')}
            className={`px-2.5 py-1 rounded-full text-xs md:text-sm font-black transition-all flex items-center gap-1 shadow-md active:scale-95 cursor-pointer border ${
              charDraft.archetype === 'tech_girl' || (isGirl && charDraft.hairStyle === 'side_braid')
                ? 'bg-gradient-to-r from-sky-500 to-cyan-500 text-white border-cyan-300 ring-2 ring-cyan-300/50 scale-105'
                : 'bg-[#153428]/85 hover:bg-[#1f4a39] text-[#e0f2fe] border-[#2e5950]'
            }`}
            title="น้องขวัญใจ: สาวน้อยอัจฉริยะระบบไฟฟ้า ถือแท็บเล็ตเทเลเมทรี"
          >
            <span>⚡</span>
            <span>น้องขวัญใจ (Tech Girl)</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectPreset('professor')}
            className={`px-2.5 py-1 rounded-full text-xs md:text-sm font-black transition-all flex items-center gap-1 shadow-md active:scale-95 cursor-pointer border ${
              charDraft.archetype === 'professor' || charDraft.jacketStyle === 'tweed_professor'
                ? 'bg-gradient-to-r from-amber-600 to-yellow-600 text-white border-amber-300 ring-2 ring-amber-300/50 scale-105'
                : 'bg-[#153428]/85 hover:bg-[#1f4a39] text-[#fef3c7] border-[#2e5950]'
            }`}
            title="ดร.วัตต์: ศาสตราจารย์สติเฟื่อง แว่นกลม แว่นก๊อกเกิล และหนูแฮมสเตอร์"
          >
            <span>🔬</span>
            <span>ศ.ดร.วัตต์ (Prof. Watt)</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectPreset('adventurer')}
            className={`px-2.5 py-1 rounded-full text-xs md:text-sm font-black transition-all flex items-center gap-1 shadow-md active:scale-95 cursor-pointer border ${
              charDraft.archetype === 'adventurer' || (!isGirl && charDraft.jacketStyle === 'adventurer_shirt')
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-emerald-300 ring-2 ring-emerald-300/50 scale-105'
                : 'bg-[#153428]/85 hover:bg-[#1f4a39] text-[#dcfce7] border-[#2e5950]'
            }`}
            title="อลิส: ช่างกลและนักผจญภัยนักซิ่ง"
          >
            <span>🚴</span>
            <span>อลิส (Adventurer)</span>
          </button>
        </div>
      </header>

      {/* ── Main Interactive Section: Left Controls, 3D Character, Right Controls ── */}
      <main className="relative z-10 flex-1 min-h-0 w-full max-w-6xl mx-auto px-3 sm:px-4 md:px-6 grid grid-cols-1 md:grid-cols-12 items-center gap-2 md:gap-4 py-1">
        {/* ── Left Column: Hair Color, Skin Tone, Face ── */}
        <div className="md:col-span-3 flex flex-row md:flex-col flex-wrap md:flex-nowrap gap-2 md:gap-3.5 justify-center items-center order-2 md:order-1">
          {/* 1. Hair Color Stepper */}
          <div className="flex flex-col items-center">
            <span className="text-xs md:text-sm font-black text-[#fef08a] drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] tracking-wide mb-0.5">
              Hair Color
            </span>
            <div className="w-full max-w-[190px] bg-[#1d3d2c]/90 border-2 border-[#37694d] rounded-2xl p-1 shadow-xl flex items-center justify-between gap-1 backdrop-blur-sm">
              <button
                type="button"
                onClick={() => handleHairColorStep(-1)}
                className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-gradient-to-r from-[#2f5e43] to-[#244933] hover:brightness-110 active:scale-95 text-[#fde047] flex items-center justify-center transition shadow cursor-pointer border border-[#437b58]"
                title="สีก่อนหน้า"
              >
                <ChevronLeft className="w-5 h-5 stroke-[3]" />
              </button>

              <div className="flex items-center gap-1.5 font-mono font-black text-white text-sm md:text-base">
                <span
                  className="w-3.5 h-3.5 rounded-full border border-white/60 shadow"
                  style={{ backgroundColor: HAIR_COLORS[hairColorIdx].id }}
                />
                <span>
                  {hairColorIdx + 1}/{HAIR_COLORS.length}
                </span>
              </div>

              <button
                type="button"
                onClick={() => handleHairColorStep(1)}
                className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-gradient-to-r from-[#2f5e43] to-[#244933] hover:brightness-110 active:scale-95 text-[#fde047] flex items-center justify-center transition shadow cursor-pointer border border-[#437b58]"
                title="สีถัดไป"
              >
                <ChevronRight className="w-5 h-5 stroke-[3]" />
              </button>
            </div>
          </div>

          {/* 2. Skin Tone Stepper */}
          <div className="flex flex-col items-center">
            <span className="text-xs md:text-sm font-black text-[#fef08a] drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] tracking-wide mb-0.5">
              Skin Tone
            </span>
            <div className="w-full max-w-[190px] bg-[#1d3d2c]/90 border-2 border-[#37694d] rounded-2xl p-1 shadow-xl flex items-center justify-between gap-1 backdrop-blur-sm">
              <button
                type="button"
                onClick={() => handleSkinToneStep(-1)}
                className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-gradient-to-r from-[#2f5e43] to-[#244933] hover:brightness-110 active:scale-95 text-[#fde047] flex items-center justify-center transition shadow cursor-pointer border border-[#437b58]"
                title="โทนสีก่อนหน้า"
              >
                <ChevronLeft className="w-5 h-5 stroke-[3]" />
              </button>

              <div className="flex items-center gap-1.5 font-mono font-black text-white text-sm md:text-base">
                <span
                  className="w-3.5 h-3.5 rounded-full border border-white/60 shadow"
                  style={{ backgroundColor: SKIN_TONES[skinToneIdx].id }}
                />
                <span>
                  {skinToneIdx + 1}/{SKIN_TONES.length}
                </span>
              </div>

              <button
                type="button"
                onClick={() => handleSkinToneStep(1)}
                className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-gradient-to-r from-[#2f5e43] to-[#244933] hover:brightness-110 active:scale-95 text-[#fde047] flex items-center justify-center transition shadow cursor-pointer border border-[#437b58]"
                title="โทนสีถัดไป"
              >
                <ChevronRight className="w-5 h-5 stroke-[3]" />
              </button>
            </div>
          </div>

          {/* 3. Face Stepper */}
          <div className="flex flex-col items-center">
            <span className="text-xs md:text-sm font-black text-[#fef08a] drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] tracking-wide mb-0.5">
              Face
            </span>
            <div className="w-full max-w-[190px] bg-[#1d3d2c]/90 border-2 border-[#37694d] rounded-2xl p-1 shadow-xl flex items-center justify-between gap-1 backdrop-blur-sm">
              <button
                type="button"
                onClick={() => handleFaceStyleStep(-1)}
                className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-gradient-to-r from-[#2f5e43] to-[#244933] hover:brightness-110 active:scale-95 text-[#fde047] flex items-center justify-center transition shadow cursor-pointer border border-[#437b58]"
                title="ใบหน้าก่อนหน้า"
              >
                <ChevronLeft className="w-5 h-5 stroke-[3]" />
              </button>

              <div className="font-mono font-black text-white text-sm md:text-base">
                {faceStyleIdx + 1}/{FACE_STYLES.length}
              </div>

              <button
                type="button"
                onClick={() => handleFaceStyleStep(1)}
                className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-gradient-to-r from-[#2f5e43] to-[#244933] hover:brightness-110 active:scale-95 text-[#fde047] flex items-center justify-center transition shadow cursor-pointer border border-[#437b58]"
                title="ใบหน้าถัดไป"
              >
                <ChevronRight className="w-5 h-5 stroke-[3]" />
              </button>
            </div>
            <span className="text-[10px] font-bold text-emerald-950 mt-0.5 drop-shadow-sm">
              {FACE_STYLES[faceStyleIdx].name.split('(')[0]}
            </span>
          </div>
        </div>

        {/* ── Center Column: 3D Character Viewer (6 Cols) ── */}
        <div className="md:col-span-6 h-[280px] sm:h-[340px] md:h-[420px] lg:h-[480px] flex items-center justify-center relative order-1 md:order-2">
          <Character3DViewer character={charDraft} className="w-full h-full" />
        </div>

        {/* ── Right Column: Hair Style, Outfit, Outfit Color ── */}
        <div className="md:col-span-3 flex flex-row md:flex-col flex-wrap md:flex-nowrap gap-2 md:gap-3.5 justify-center items-center order-3">
          {/* 1. Hair Style Stepper */}
          <div className="flex flex-col items-center">
            <span className="text-xs md:text-sm font-black text-[#fef08a] drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] tracking-wide mb-0.5">
              Hair Style
            </span>
            <div className="w-full max-w-[190px] bg-[#1d3d2c]/90 border-2 border-[#37694d] rounded-2xl p-1 shadow-xl flex items-center justify-between gap-1 backdrop-blur-sm">
              <button
                type="button"
                onClick={() => handleHairStyleStep(-1)}
                className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-gradient-to-r from-[#2f5e43] to-[#244933] hover:brightness-110 active:scale-95 text-[#fde047] flex items-center justify-center transition shadow cursor-pointer border border-[#437b58]"
                title="ทรงผมก่อนหน้า"
              >
                <ChevronLeft className="w-5 h-5 stroke-[3]" />
              </button>

              <div className="font-mono font-black text-white text-sm md:text-base">
                {hairStyleIdx + 1}/{HAIR_STYLES.length}
              </div>

              <button
                type="button"
                onClick={() => handleHairStyleStep(1)}
                className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-gradient-to-r from-[#2f5e43] to-[#244933] hover:brightness-110 active:scale-95 text-[#fde047] flex items-center justify-center transition shadow cursor-pointer border border-[#437b58]"
                title="ทรงผมถัดไป"
              >
                <ChevronRight className="w-5 h-5 stroke-[3]" />
              </button>
            </div>
            <span className="text-[10px] font-bold text-emerald-950 mt-0.5 drop-shadow-sm text-center">
              {HAIR_STYLES[hairStyleIdx].name.split('(')[0]}
            </span>
          </div>

          {/* 2. Outfit Stepper */}
          <div className="flex flex-col items-center">
            <span className="text-xs md:text-sm font-black text-[#fef08a] drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] tracking-wide mb-0.5">
              Outfit
            </span>
            <div className="w-full max-w-[190px] bg-[#1d3d2c]/90 border-2 border-[#37694d] rounded-2xl p-1 shadow-xl flex items-center justify-between gap-1 backdrop-blur-sm">
              <button
                type="button"
                onClick={() => handleOutfitStep(-1)}
                className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-gradient-to-r from-[#2f5e43] to-[#244933] hover:brightness-110 active:scale-95 text-[#fde047] flex items-center justify-center transition shadow cursor-pointer border border-[#437b58]"
                title="ชุดก่อนหน้า"
              >
                <ChevronLeft className="w-5 h-5 stroke-[3]" />
              </button>

              <div className="font-mono font-black text-white text-sm md:text-base">
                {outfitIdx + 1}/{OUTFITS.length}
              </div>

              <button
                type="button"
                onClick={() => handleOutfitStep(1)}
                className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-gradient-to-r from-[#2f5e43] to-[#244933] hover:brightness-110 active:scale-95 text-[#fde047] flex items-center justify-center transition shadow cursor-pointer border border-[#437b58]"
                title="ชุดถัดไป"
              >
                <ChevronRight className="w-5 h-5 stroke-[3]" />
              </button>
            </div>
            <span className="text-[10px] font-bold text-emerald-950 mt-0.5 drop-shadow-sm text-center">
              {OUTFITS[outfitIdx].name.split('(')[0]}
            </span>
          </div>

          {/* 3. Outfit Color Stepper */}
          <div className="flex flex-col items-center">
            <span className="text-xs md:text-sm font-black text-[#fef08a] drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] tracking-wide mb-0.5">
              Color
            </span>
            <div className="w-full max-w-[190px] bg-[#1d3d2c]/90 border-2 border-[#37694d] rounded-2xl p-1 shadow-xl flex items-center justify-between gap-1 backdrop-blur-sm">
              <button
                type="button"
                onClick={() => handleOutfitColorStep(-1)}
                className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-gradient-to-r from-[#2f5e43] to-[#244933] hover:brightness-110 active:scale-95 text-[#fde047] flex items-center justify-center transition shadow cursor-pointer border border-[#437b58]"
                title="สีก่อนหน้า"
              >
                <ChevronLeft className="w-5 h-5 stroke-[3]" />
              </button>

              <div className="flex items-center gap-1.5 font-mono font-black text-white text-sm md:text-base">
                <span
                  className="w-3.5 h-3.5 rounded-full border border-white/60 shadow"
                  style={{ backgroundColor: OUTFIT_COLORS[outfitColorIdx].id }}
                />
                <span>
                  {outfitColorIdx + 1}/{OUTFIT_COLORS.length}
                </span>
              </div>

              <button
                type="button"
                onClick={() => handleOutfitColorStep(1)}
                className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-gradient-to-r from-[#2f5e43] to-[#244933] hover:brightness-110 active:scale-95 text-[#fde047] flex items-center justify-center transition shadow cursor-pointer border border-[#437b58]"
                title="สีถัดไป"
              >
                <ChevronRight className="w-5 h-5 stroke-[3]" />
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* ── Bottom Action Toolbar — Sticky/Docked across all screens ── */}
      <footer className="sticky bottom-0 md:relative z-30 pb-2 md:pb-4 pt-2 px-3 md:px-4 flex items-center justify-center gap-2 md:gap-3 max-w-xl mx-auto w-full shrink-0 bg-gradient-to-t from-[#1b3815]/90 via-[#23481a]/60 to-transparent backdrop-blur-xs rounded-t-2xl">
        {/* Back Button */}
        <button
          type="button"
          onClick={() => goToScene('main_menu')}
          className="px-3 md:px-4 py-2.5 md:py-3 rounded-2xl bg-[#1e293b]/90 hover:bg-[#334155] border-2 border-slate-600 text-white font-bold text-xs md:text-sm flex items-center gap-1.5 shadow-lg active:scale-95 transition cursor-pointer backdrop-blur-md"
        >
          <ArrowLeft className="w-3.5 h-3.5 md:w-4 md:h-4" />
          <span>เมนูหลัก</span>
        </button>

        {/* Randomize Button */}
        <button
          type="button"
          onClick={handleRandomize}
          className="px-3 md:px-4 py-2.5 md:py-3 rounded-2xl bg-[#0f766e]/90 hover:bg-[#115e59] border-2 border-[#14b8a6] text-amber-200 font-bold text-xs md:text-sm flex items-center gap-1.5 shadow-lg active:scale-95 transition cursor-pointer backdrop-blur-md"
          title="สุ่มรูปลักษณ์ตัวละคร"
        >
          <Dice5 className="w-3.5 h-3.5 md:w-4 md:h-4" />
          <span>สุ่มรูปลักษณ์</span>
        </button>

        {/* Save & Confirm Button */}
        <button
          type="button"
          onClick={handleSaveAndContinue}
          className="flex-1 py-2.5 md:py-3.5 px-4 md:px-6 rounded-2xl bg-gradient-to-r from-[#ea580c] via-[#f59e0b] to-[#eab308] hover:brightness-110 text-slate-950 font-black text-xs md:text-base flex items-center justify-center gap-1.5 md:gap-2 shadow-xl shadow-amber-500/40 active:scale-98 transition border-2 border-amber-200 cursor-pointer"
        >
          <Save className="w-3.5 h-3.5 md:w-4 md:h-4" />
          <span>บันทึกตัวละคร (Confirm)</span>
          <ArrowRight className="w-4 h-4 md:w-5 md:h-5 stroke-[3]" />
        </button>
      </footer>
    </div>
  );
};
