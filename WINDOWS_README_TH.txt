IJ Maintenance v14.0 — Employee ID Login + Role-based Workflow

วิธีอัปเดตบน Windows / GitHub Pages
1. แตก ZIP ด้วย Extract all
2. เปิดโฟลเดอร์ ij-system-v14.0
3. คัดลอกไฟล์ภายในทั้งหมดไปทับ root ของ repository IJ-Maintenance เดิม
4. GitHub Desktop: Commit changes → Push origin
5. รอ GitHub Actions build และ deploy เป็นสีเขียว แล้วเปิดเว็บใหม่

การเข้าใช้งาน
- Login ใช้รหัสพนักงานอย่างเดียว
- ถ้ามีสิทธิ์ในระบบแล้ว จะเปิดหน้าตาม Role ทันที
- ถ้ายังไม่มีสิทธิ์ ระบบจะให้ลงทะเบียนชื่อและตำแหน่ง แล้วรอ Engineer/Admin อนุมัติ
- Engineer/Admin: สิทธิ์ Maintenance เต็ม + Inspection + ทำงานเอง + มอบหมาย + User & Access
- Technician: ตรวจ/ทำงาน/บันทึกผลตามงานที่ได้รับมอบหมาย
- Manager: ดูภาพรวม เครื่อง Loss/KPI/Calendar และ Approve/Return
- Production/Planning: ดูภาพรวมรายเครื่องและ Calendar, Confirm Stop หรือ Propose Change

ฐานข้อมูล MPR ของโครงการนี้ติดตั้ง migration v14 แล้ว ไม่ต้องรัน SQL ซ้ำ
หมายเหตุ: Employee-ID-only เป็น access control สำหรับงานภายใน ไม่ใช่ high-security authentication
