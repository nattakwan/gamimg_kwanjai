# AI Model Delegation & Project Guidelines: Gaming Kwanjai

เอกสารข้อตกลงและเงื่อนไขการแบ่งงานระหว่างโมเดล AI ในโปรเจกต์จักรยานไฟฟ้า 3D (Gaming Kwanjai)

---

## 1. กลยุทธ์การแบ่งงานระหว่าง AI Models (Model Delegation Strategy)

### 🖼️ 1.1 Gemini Flash (Vision, UI & Large Context)
* **หน้าที่หลัก:**
  - **การประมวลผลรูปภาพ (Vision / Multimodal):** วิเคราะห์ภาพตัวอย่าง UI (เช่น ตัวละคร Mockup, ฉากสนามแข่ง 3D) เพื่อนำมาถอดแบบดีไซน์
  - **อ่านบริบททั้งโปรเจกต์ (Wide Context):** อ่านและวิเคราะห์ไฟล์จำนวนมากพร้อมกัน สรุปสถาปัตยกรรมระบบ
  - **งาน Frontend UI:** ออกแบบและประกอบ UI Component (React + Tailwind CSS) ครอบฉาก 3D เช่น หน้า Dashboard, ปุ่มควบคุม, แถบสถานะ

### 🧠 1.2 DeepSeek Reasoner (R1) (3D Math, Spatial Coordinates & Deep Logic)
* **หน้าที่หลัก:**
  - **การปั้นโมเดล 3D แบบ Procedural (Three.js / Blender):** คำนวณพิกัด 3 แกน ($X, Y, Z$), ลำดับจุดหมุน (Pivot & Hierarchy), เส้นโค้ง Splines, รูปทรงเรขาคณิต (Geometries) สำหรับชิ้นส่วนจักรยาน, ทรงผม, ร่างกายตัวละคร
  - **ระบบ Kinematics & Animations:** การคำนวณข้อต่อกระดูก (เช่น ขาคนปั่นจักรยานแนบติดกับบันไดถีบตลอดการหมุน 360 องศา)
  - **การคำนวณฟิสิกส์เชิงลึก (Physics & Math):** แรงต้านอากาศ ($F_{aero}$), แรงเสียดทานการกลิ้ง ($F_{roll}$), กราฟแรงบิดมอเตอร์ไฟฟ้า, การใช้พลังงานแบตเตอรี่
  - **ตรรกะ AI คู่แข่ง (Competitor AI Logic):** ระบบ Dynamic Pacing, Rubber-banding, การดูดลมท้าย (Slipstream), การหลบหลีก
  - **การแก้บั๊กซับซ้อน (Deep Debugging):** ปัญหา Memory leak ใน WebGL/Three.js, การกระตุกของเฟรมเรต, Race conditions

### ⚡ 1.3 DeepSeek Chat (V3) (Fast Coding & Routine Development)
* **หน้าที่หลัก:**
  - **เติมโค้ดอัตโนมัติ (Tab Autocomplete):** ทำงานร่วมกับ Continue / Roo Code ใน IDE สำหรับงานเขียนโค้ดบรรทัดต่อบรรทัด
  - **งานเขียน TypeScript Types / Interfaces:** นิยาม Data Structures, Configs, Constants
  - **Utility & Helper Functions:** ฟังก์ชันคำนวณแปลงหน่วย, ฟังก์ชันจัดรูปแบบเวลา (Lap timer)
  - **งานปรับแต่งสีและแสง:** ปรับแต่งค่าสี, Material properties (`roughness`, `metalness`), แสงเงาเบื้องต้น

---

## 2. การตั้งค่าสิ่งแวดล้อม (Environment & Keys)
* `DEEPSEEK_API_KEY`: จัดเก็บใน `.env` และ Windows User Environment Variables
* `GEMINI_API_KEY`: จัดเก็บใน `.env`
* คอนฟิกโมเดลสำหรับ Continue อยู่ที่ `.continue/config.json` และ `~/.continue/config.yaml`

---

## 3. การซิงค์และบันทึกงานไปยัง OneDrive (Cross-Location Sync: Home & University)
* **โฟลเดอร์เป้าหมายบน OneDrive:** `C:\Users\natta\OneDrive\RMUTL\Gaming`
* **กฎก่อนเลิกงานทุกครั้ง (Mandatory Pre-Exit Rule):**
  - ก่อนจบงาน, สรุปผล หรือส่งมอบงานให้ผู้ใช้ทุกครั้ง ต้องทำการซิงค์ไฟล์โปรเจกต์จาก `e:\gittest\gamimg_kwanjai` ไปยัง `C:\Users\natta\OneDrive\RMUTL\Gaming` เสมอ (ยกเว้น `node_modules`, `.vite`, `dist`)
  - คำสั่งสำหรับซิงค์: `npm run sync:onedrive` (หรือ `node scripts/sync_onedrive.cjs`)
  - เพื่อให้ผู้ใช้สามารถเดินทางไปเปิดทำงานต่อที่มหาวิทยาลัยได้ทันที โดยโค้ดเป็นเวอร์ชันล่าสุด 100% เสมอ


