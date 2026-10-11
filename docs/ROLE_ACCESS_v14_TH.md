# IJ Maintenance v14.0 — Role & Access

## Login

ใช้ Employee ID เพียงช่องเดียว ถ้ารหัสมี `ij_user_access` ที่ Active จะเข้าสู่ระบบทันที ถ้ายังไม่มี ระบบเปิด Registration ให้ระบุชื่อและตำแหน่งที่ขอใช้ จากนั้นรอ Engineer/Admin อนุมัติ

## Roles

| Role | สิทธิ์หลัก |
|---|---|
| Engineer / Admin | ทำงาน Maintenance ได้ครบ สร้าง/แก้แผน มอบหมาย Engineer/Technician ทำ Inspection, TPM/PM, Defect, Follow-up, Spare, ตรวจรับ, KPI/Report และจัดการผู้ใช้ |
| Technician | ดูและทำงานที่ได้รับมอบหมาย ทำ Inspection/TPM/PM บันทึกผล แจ้ง Defect/Follow-up และขออะไหล่ |
| Manager | ดู Dashboard, Machine Health, Loss Time, KPI, Calendar, History และ Approve/Return แผนพร้อม Comment |
| Production / Planning | ดู Dashboard, Machine Overview, Health/Loss/History และ Calendar ยืนยันช่วงหยุดเครื่องหรือเสนอเลื่อนพร้อมเหตุผล |

## Calendar Workflow

Engineer Create/Edit Plan → Assign Engineer/Technician → Production Confirm Stop หรือ Propose Change → Manager Approve/Return → Engineer/Technician Execute & Record → Engineer Follow-up/Verification → Closed

ไม่มีขั้นตอน Production รับเครื่องกลับผลิต

## Engineer mapping

- 680470 — นายอภิวุฒิ ขวัญเมืองคูณ — Engineer
- 680896 — นายรัฐธรรมนูญ เดชทะสอน — Engineer

## Security note

Employee-ID-only เหมาะกับการควบคุมหน้าและ workflow ภายในที่ต้องการความเร็ว แต่ไม่ป้องกันการสวมรหัส หากต้องการการยืนยันตัวตนที่แข็งแรงขึ้นให้เพิ่ม PIN/OTP หรือ Supabase Auth โดยยังใช้ Role mapping เดิมได้
