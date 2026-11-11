# AI Model Delegation & Project Guidelines: Gaming Kwanjai

เอกสารข้อตกลงและเงื่อนไขการแบ่งงานระหว่างโมเดล AI ในโปรเจกต์จักรยานไฟฟ้า 3D (Gaming Kwanjai)

---

## 1. กลยุทธ์การแบ่งงานระหว่าง AI Models (New Model Delegation Strategy)

### 🧠 1.1 DeepSeek V4 Pro (3D Math, Spatial Coordinates, Kinematics & Deep Logic)
* **หน้าที่หลัก:**
  - **การปั้นโมเดล 3D แบบ Procedural (Three.js / Blender):** คำนวณพิกัด 3 แกน ($X, Y, Z$), ลำดับจุดหมุน (Pivot & Hierarchy), เส้นโค้ง Splines, รูปทรงเรขาคณิต (Geometries) สำหรับชิ้นส่วนจักรยาน, ชุดแฮนด์, ตะเกียบหน้า, ทรงผม, ร่างกายตัวละคร, และอุปกรณ์ห้องแล็บวงจรไฟฟ้า
  - **ระบบ Kinematics & Two-Bone Inverse Kinematics (IK):** การคำนวณสรีระนักปั่น (Pelvis heave/sway/roll/yaw, Torso effort bobbing & counter-roll, Head gaze stabilization, แขนงอตามแฮนด์เลี้ยว, ขาถีบตามบันได $360^\circ$)
  - **การคำนวณฟิสิกส์เชิงลึก (Physics & Math):** แรงต้านอากาศ ($F_{aero}$), แรงเสียดทานการกลิ้ง ($F_{roll}$), แรงต้านความชัน ($F_{slope}$), กราฟแรงบิดมอเตอร์และประสิทธิภาพตามแรงดัน ($5\text{V}, 12\text{V}, 24\text{V}$), อัตราการคายประจุแบตเตอรี่, คำนวณวงจรผสม/ขนาน/อนุกรม
  - **ตรรกะ AI คู่แข่ง (Competitor AI Strategy):** Dynamic Pacing, Rubber-banding, การดูดลมท้าย (Slipstream), การเข้าโค้งและหลบหลีก
  - **การแก้บั๊กซับซ้อนระดับสูง (Deep Debugging):** วิเคราะห์และแก้ปัญหา Memory leak ใน WebGL/Three.js, การกระตุกของเฟรมเรต, Buffer management, Race conditions

### ⚡ 1.2 DeepSeek Flash (Fast Coding, Routine Development & Tab Autocomplete)
* **หน้าที่หลัก:**
  - **เติมโค้ดอัตโนมัติความเร็วสูง (High-Speed Tab Autocomplete):** ทำงานร่วมกับ Continue / Roo Code ใน IDE สำหรับงานเขียนโค้ดบรรทัดต่อบรรทัดแบบเรียลไทม์
  - **งานเขียน TypeScript Types / Interfaces:** นิยาม Data Structures, Configs, Game state models, Constants
  - **งานปรับแต่งสี วัสดุ และแสงเงา (Materials & Styling):** ปรับแต่งค่าสี, Material properties (`roughness`, `metalness`, `shininess`), สีผิว, แสงเงาเบื้องต้น, Tailwind CSS classes
  - **Utility & Helper Functions:** ฟังก์ชันคำนวณแปลงหน่วย ($m/s \leftrightarrow km/h$, $V, A, W$), ฟังก์ชันจัดรูปแบบเวลา (Lap timer, Formatters)
  - **Unit Testing & Test Helpers:** สร้างและรันชุดทดสอบเบื้องต้น

### 🖼️ 1.3 Gemini 3.8 Flash (Vision, UI & Large Context)
* **โมเดลที่ใช้งาน:** `gemini-3.8-flash` (หรือ `Gemini 3.8 Flash High` บน Antigravity IDE)
* **หน้าที่หลัก:**
  - **การประมวลผลรูปภาพ (Vision / Multimodal):** วิเคราะห์ภาพตัวอย่าง UI (เช่น ตัวละคร Mockup, ฉากสนามแข่ง 3D, ภาพถ่ายอุปกรณ์วงจรจริงที่ผู้ใช้อัปโหลด) เพื่อนำมาถอดแบบดีไซน์
  - **อ่านบริบททั้งโปรเจกต์ (Wide Context):** อ่านและวิเคราะห์ไฟล์จำนวนมากพร้อมกัน สรุปสถาปัตยกรรมระบบ ด้วย Context Window ขนาดใหญ่พิเศษและความเร็วสูง
  - **งาน Frontend UI:** ออกแบบและประกอบ UI Component (React + Tailwind CSS) ครอบฉาก 3D เช่น หน้า Dashboard, ปุ่มควบคุม, แถบสถานะ, Modal dialogs

---

## 2. การตั้งค่าสิ่งแวดล้อม (Environment & Keys)
* `DEEPSEEK_API_KEY`: จัดเก็บใน `.env` และ Windows User Environment Variables
* `GEMINI_API_KEY`: จัดเก็บใน `.env`
* คอนฟิกโมเดลสำหรับ Continue อยู่ที่ `.continue/config.json` และ `~/.continue/config.yaml` โดยรองรับทั้ง `deepseek-v4-pro` และ `deepseek-flash` (พร้อม fallback ไปยัง `deepseek-reasoner` และ `deepseek-chat`)

---

## 3. สภาพแวดล้อมการพัฒนา (Single-Machine Local Development)
* **พื้นที่พัฒนาหลัก:** `e:\gittest\gamimg_kwanjai`
* **สถานะโครงการข้ามเครื่อง:** ยกเลิกการซิงค์และใช้งานบนเครื่องมหาวิทยาลัยแล้ว เน้นการพัฒนา ทดสอบ และรันบนเครื่องนี้เครื่องเดียว (Local Workstation)
* ไม่จำเป็นต้องรันสคริปต์ซิงค์ OneDrive หรือ Chat Export/Import ก่อนจบงานอีกต่อไป ให้เน้นการพัฒนาฟีเจอร์ กราฟิก 3D และระบบเกมบนเครื่องนี้โดยตรง


