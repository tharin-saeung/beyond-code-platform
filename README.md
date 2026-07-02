# 🏗️ Beyond Code Academy - AI Auto-Grader Platform

แพลตฟอร์มฝึกเขียนโค้ดภาษา Python เชิงปฏิสัมพันธ์ (Interactive Learning Platform) พร้อมระบบตรวจให้คะแนนอัจฉริยะ (AI Auto-Grading Engine) และแผงควบคุมสำหรับผู้สอนแบบครบวงจร

---

## 🛠️ Tech Stack

| ส่วนประกอบ | เทคโนโลยี |
|---|---|
| Frontend & Backend API | Next.js 16 (App Router) & Tailwind CSS |
| Database & Authentication | Supabase (PostgreSQL) |
| Code Editor Component | `@monaco-editor/react` (Controlled Mode) |
| AI Grading Engine | Gemini API ผ่าน Server-side API Route (`/api/grade`) |

---

## ⚙️ Setup Instructions

**1. ติดตั้ง Dependencies**

```bash
npm install
```

**2. ตั้งค่า Environment Variables**

สร้างไฟล์ `.env.local` ที่ root ของโปรเจกต์ แล้วใส่ค่าดังนี้:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_public_key
GEMINI_API_KEY=your_gemini_api_key_here
```

**3. รันแอปพลิเคชันบน Local Server**

```bash
npm run dev
```

เปิดใช้งานผ่านเบราว์เซอร์ที่ `http://localhost:3000`

---

## 🧠 AI Auto-Grading Approach

ระบบตรวจให้คะแนนของเราไม่ได้ทำเพียง Static Output Matching แต่ใช้ความสามารถของ LLM ในการวิเคราะห์เชิงลึก:

- **Semantic Code Analysis** — วิเคราะห์ตรรกะและความถูกต้องของโค้ด พร้อมประเมิน Time/Space Complexity (Big-O) ของอัลกอริทึมที่นักเรียนเขียน
- **Pedagogical Tutor Mode** — ออกแบบ Prompt Constraints ให้ AI ไม่เฉลยโค้ดฉบับเต็ม (Zero Code Leakage) แต่จะชี้จุดผิดด้าน Syntax และให้แนวทางเชิงโครงสร้างแบบนามธรรม (Abstract Guidelines) เพื่อกระตุ้นให้นักเรียนคิดวิเคราะห์ต่อเอง
- **Prompt Injection Defense** — มีชั้นกรองป้องกันคำสั่งแอบแฝง (Prompt Injection / Jailbreak) ที่อาจถูกซ่อนไว้ในคอมเมนต์หรือ Docstring ของโค้ด Python ก่อนส่งเข้าสู่โมเดล

---

## 🛡️ Resilient UI Architecture

ส่วนนี้แยกออกจากตรรกะ AI โดยเด็ดขาด เพื่อความเสถียรของประสบการณ์ผู้ใช้:

- **Hybrid State Persistence** — โค้ดที่นักเรียนกำลังพิมพ์ (Drafting Code) จะถูก autosave ลง `localStorage` แบบเรียลไทม์เพื่อกันข้อมูลหายเมื่อรีเฟรชหน้า ส่วนคะแนนและผลประเมินอย่างเป็นทางการจะถูกดึงสดจากตาราง `submissions` ใน Supabase ทุกครั้งที่คอมโพเนนต์ mount
- **Zero UI State Overlapping** — แยกฝั่งผู้สอนออกเป็น Sub-route ชัดเจน: `/admin` สำหรับตารางสรุปคะแนน และ `/admin/assignments` สำหรับจัดการคลังโจทย์ (CRUD) เพื่อลดความซับซ้อนของ Tabs State

---