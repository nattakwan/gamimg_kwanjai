/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SceneId, SceneMeta } from '../types/game';

export const SCENES_METADATA: Record<SceneId, SceneMeta> = {
  splash: {
    id: 'splash',
    title: 'เริ่มต้นการผจญภัย',
    category: 'menu',
    description: 'หน้าจอต้อนรับสู่อคาเดมีนักประดิษฐ์พลังงานไฟฟ้า',
  },
  main_menu: {
    id: 'main_menu',
    title: 'เมนูหลักสถาบัน',
    category: 'menu',
    description: 'เลือกเริ่มเกมใหม่ เล่นต่อ การตั้งค่า หรือคู่มือการเล่น',
  },
  character_creator: {
    id: 'character_creator',
    title: 'สร้างนักประดิษฐ์',
    category: 'menu',
    description: 'ปรับแต่งตัวละครและชุดนักแข่งพลังงานไฟฟ้าประจำตัว',
  },
  volt_tutorial: {
    id: 'volt_tutorial',
    title: 'บทเรียนหุ่นยนต์ VOLT',
    category: 'tutorial',
    description: 'เรียนรู้ขั้วไฟฟ้า แรงดัน และการปิดวงจรกับหุ่นยนต์คู่หู',
  },
  mission_map: {
    id: 'mission_map',
    title: 'แผนที่ภารกิจอคาเดมี',
    category: 'menu',
    description: 'เลือกด่านทดลองและสนามแข่งตามลำดับความก้าวหน้า',
  },
  basic_circuit_lab: {
    id: 'basic_circuit_lab',
    title: 'LAB 1: วงจรปิดพื้นฐาน',
    category: 'lab',
    description: 'ต่อเซลล์ AA 1.5V เข้ากับสวิตช์และหลอดไฟเพื่อสร้างวงจรปิดสมบูรณ์',
  },
  series_lab: {
    id: 'series_lab',
    title: 'LAB 2: วงจรอนุกรม',
    category: 'lab',
    description: 'ต่อเซลล์แบบหัวต่อท้าย (+ ชน -) เพื่อเพิ่มแรงดันไฟฟ้าเป็น 3.0V',
  },
  parallel_lab: {
    id: 'parallel_lab',
    title: 'LAB 3: วงจรขนาน',
    category: 'lab',
    description: 'ต่อเซลล์แบบขนาน (+ ชน +, - ชน -) เพื่อเพิ่มความจุเป็น 4000mAh',
  },
  mixed_lab: {
    id: 'mixed_lab',
    title: 'LAB 4: วงจรผสมแพ็กแบตเตอรี่',
    category: 'lab',
    description: 'ออกแบบแพ็กแบตเตอรี่แบบ 4S 2P เพื่อให้ได้ทั้ง 6.0V และ 4000mAh',
  },
  motor_test: {
    id: 'motor_test',
    title: 'LAB 5: ทดสอบมอเตอร์ไฟฟ้า',
    category: 'lab',
    description: 'ทดสอบการจ่ายกระแสและวัดรอบ RPM ของมอเตอร์กระแสตรง',
  },
  bike_garage: {
    id: 'bike_garage',
    title: 'โรงเก็บจักรยานแข่ง (Garage)',
    category: 'garage',
    description: 'ปรับแต่งเฟรม มอเตอร์ และติดตั้งแพ็กแบตเตอรี่ลงในตัวรถ',
  },
  race_prep: {
    id: 'race_prep',
    title: 'เตรียมความพร้อมก่อนแข่ง',
    category: 'race',
    description: 'ตรวจเช็กความพร้อมของระบบไฟฟ้าและวางแผนกลยุทธ์การเร่ง',
  },
  racing: {
    id: 'racing',
    title: 'สนามแข่งขันชิงแชมป์ (Racing)',
    category: 'race',
    description: 'ควบคุมจักรยานไฟฟ้า เร่งความเร็ว และบริหารพลังงานเข้าเส้นชัย',
  },
  race_results: {
    id: 'race_results',
    title: 'ผลการแข่งขันและรางวัล',
    category: 'race',
    description: 'สรุปผลเวลา อันดับการแข่งขัน และประสิทธิภาพการใช้พลังงาน',
  },
  learning_reflection: {
    id: 'learning_reflection',
    title: 'บทสรุปและทบทวนความรู้',
    category: 'education',
    description: 'ทบทวนความรู้ทางวิศวกรรมไฟฟ้าและตอบคำถามเพื่อรับเหรียญรางวัล',
  },
};
