# ⚡ Battery Quest: Power Racing Academy (Gaming Kwanjai)

เกมจำลองการเรียนรู้ทางวิศวกรรมไฟฟ้าและจักรยานไฟฟ้า 3 มิติ (3D Educational Web Game) สำหรับนักเรียน/นักศึกษาอาชีวศึกษาและผู้สนใจทั่วไป พัฒนาด้วย **React 19 + TypeScript + Three.js + Vite + Tailwind CSS**

---

## 🚀 วิธีติดตั้งและเริ่มโปรเจกต์สำหรับผู้รับช่วงต่อ (Quick Start)

### 1. ความต้องการของระบบ (Prerequisites)
* **Node.js**: เวอร์ชัน `18.x` หรือ `20.x` ขึ้นไป ([ดาวน์โหลดได้ที่ nodejs.org](https://nodejs.org/))
* **Git**: สำหรับดึงโค้ดและจัดการเวอร์ชัน

### 2. ขั้นตอนการโคลนและติดตั้ง (Setup)
```bash
# 1. Clone repository ลงเครื่อง
git clone https://github.com/nattakwan/gamimg_kwanjai.git
cd gamimg_kwanjai

# 2. ติดตั้ง Dependencies ทั้งหมด
npm install

# 3. คัดลอกไฟล์คอนฟิก Environment Variables
cp .env.example .env

# 4. รัน Dev Server สำหรับทดสอบบน Localhost (พอร์ต 3000)
npm run dev
```
เปิดเบราว์เซอร์ไปที่: **`http://localhost:3000/`**

---

## 🛠️ คำสั่งสำคัญในโปรเจกต์ (Available Scripts)

| คำสั่ง | หน้าที่การทำงาน |
| :--- | :--- |
| `npm run dev` | รันเซิร์ฟเวอร์จำลองการพัฒนา (Local Dev Server) บน `http://localhost:3000/` |
| `npm run build` | คอมไพล์โปรเจกต์เป็น Production Static Web ลงในโฟลเดอร์ `dist/` |
| `npm run preview` | พรีวิวผลลัพธ์ของโฟลเดอร์ `dist/` ก่อนนำขึ้นเว็บจริง |
| `npm run lint` | ตรวจสอบความถูกต้องของ Type ด้วย TypeScript (`tsc --noEmit`) |
| `node scripts/deepseek_stage_harness.cjs` | รันชุดทดสอบฟิสิกส์ 3 มิติ, ระบบคำนวณแบตเตอรี่ และการจำลองแข่ง 4 ด่าน (20 Test Cases) |

---

## 📁 โครงสร้างโปรเจกต์ (Project Architecture)

```text
gamimg_kwanjai/
├── src/
│   ├── components/
│   │   ├── scenes/                     # หน้าจอเกมทั้ง 15 ฉากตามลำดับการเรียนรู้
│   │   │   ├── SplashScreen.tsx             # ฉากที่ 1: หน้าจอเริ่มต้น
│   │   │   ├── MainMenuScreen.tsx           # ฉากที่ 2: เมนูหลักของอคาเดมี
│   │   │   ├── CharacterCreatorScreen.tsx   # ฉากที่ 3: ระบบปรับแต่งตัวละคร 3D
│   │   │   ├── VoltTutorialScreen.tsx       # ฉากที่ 4: ปฐมนิเทศและทฤษฎีแบตเตอรี่พื้นฐาน
│   │   │   ├── MissionMapScreen.tsx         # ฉากที่ 5: แผนที่ภารกิจและ Roadmap
│   │   │   ├── BasicCircuitLabScreen.tsx    # ฉากที่ 6: ห้องแล็บวงจรไฟฟ้า 1 เซลล์เบื้องต้น
│   │   │   ├── SeriesLabScreen.tsx          # ฉากที่ 7: แล็บวงจรอนุกรม (แรงดันรวม VT = V1 + V2)
│   │   │   ├── ParallelLabScreen.tsx        # ฉากที่ 8: แล็บวงจรขนาน (กระแสรวม IT = I1 + I2)
│   │   │   ├── MixedLabScreen.tsx           # ฉากที่ 9: แล็บวงจรผสม 2S2P พร้อมโมดูล BMS/Fuse
│   │   │   ├── MotorTestScreen.tsx          # ฉากที่ 10: แท่นทดสอบไดโนมอเตอร์และเส้นโค้งแรงบิด
│   │   │   ├── BikeGarageScreen.tsx         # ฉากที่ 11: โรงเก็บและประกอบจักรยานไฟฟ้า (Soft Light UI)
│   │   │   ├── RacePrepScreen.tsx           # ฉากที่ 12: จุดเตรียมพร้อมปล่อยตัวและเลือกสนามแข่ง
│   │   │   ├── RacingScreen.tsx             # ฉากที่ 13: สนามแข่งขัน 3D เต็มรูปแบบ
│   │   │   ├── RaceResultsScreen.tsx        # ฉากที่ 14: โพเดียมสรุปผลและโทรมาตรการแข่งขัน
│   │   │   └── LearningReflectionScreen.tsx # ฉากที่ 15: แบบทดสอบสะท้อนคิดและใบประกาศนียบัตร
│   │   ├── common/                     # คอมโพเนนต์ส่วนกลาง (VoltDialog, AvatarRenderer ฯลฯ)
│   │   ├── character/                  # 3D Viewer แสดงตัวละครหมุนได้ 360 องศา
│   │   └── layout/                     # Header และโครงหน้าจอหลัก
│   ├── racing3d/                       # ระบบเอนจิน 3D และฟิสิกส์สนามแข่ง (Three.js)
│   │   ├── Racing3DRenderer.ts         # เอนจินสนามแข่ง 3D, ทางโค้ง, อัฒจันทร์, สภาพแวดล้อม
│   │   └── batteryPickupsConfig.ts     # การกระจายไอเทมแบตเตอรี่ตามความยาวสนาม
│   ├── context/                        # จัดการ GameState กลางของทั้งระบบ
│   └── types/                          # นิยาม Interface และ Data Models ทั้งหมด
├── dist/                               # โฟลเดอร์ผลลัพธ์สำหรับนำขึ้น Web Hosting (HTML/CSS/JS)
├── scripts/                            # ชุดทดสอบและสคริปต์จำลองฟิสิกส์อัตโนมัติ
├── vite.config.ts                      # คอนฟิก Vite (ตั้ง base: './' เพื่อรองรับทุกโฮสต์)
└── GEMINI.md                           # ข้อตกลงการแบ่งงานระหว่างโมเดล AI (DeepSeek & Gemini)
```

---

## 🌐 การนำขึ้นเว็บออนไลน์ (Deployment)

* **Vercel (แนะนำ)**: เชื่อมต่อกับ GitHub Repository ได้โดยตรง เมื่อ Push โค้ดเข้าสู่ Branch `main` ระบบจะ Build ให้อัตโนมัติ
* **Netlify / Host อื่นๆ**: สามารถลากโฟลเดอร์ `dist/` ไปวางบนหน้าเว็บ Netlify Drop หรือคัดลอกไฟล์ขึ้น Web Server ได้ทันที

---

## 🏆 มาตรฐานการพัฒนาและการส่งมอบ
1. ก่อนส่งงานหรือ Push โค้ดทุกครั้ง ต้องรัน `npm run lint` (`tsc --noEmit`) ให้ผ่าน **0 Errors**
2. รัน `node scripts/deepseek_stage_harness.cjs` ตรวจสอบความสมบูรณ์ทางฟิสิกส์ทั้ง 20 Test Cases ให้ผ่านทั้งหมด
3. รัน `npm run build` เพื่อยืนยันว่าไม่มีข้อผิดพลาดในการรวม Bundle
