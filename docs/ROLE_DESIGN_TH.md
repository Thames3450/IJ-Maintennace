# ข้อกำหนดระบบ Login และสิทธิ์ — v14.0

ระบบ v14.0 เปิดใช้ Employee ID Login และ Role-based workspace แล้ว โดยใช้ฐาน MPR เดิมและตาราง access แยกเพื่อไม่กระทบ role/department ที่ระบบอื่นใช้อยู่

- Login ใช้รหัสพนักงานอย่างเดียว ถ้ามีสิทธิ์ Active เข้าระบบได้ทันที
- ถ้ายังไม่มีสิทธิ์ ระบบให้ลงทะเบียนชื่อและตำแหน่งที่ขอ จากนั้นรอ Engineer/Admin อนุมัติหรือปรับ Role
- Engineer/Admin ทำงาน Maintenance ได้ครบ รวมตรวจเครื่อง รับมอบหมายงาน ทำ TPM/PM บันทึกผล วางแผน ตรวจรับ KPI/Report และจัดการผู้ใช้
- อภิวุฒิ (680470) และ รัฐธรรมนูญ (680896) เป็น Engineer และแสดงในรายชื่อ Assignee ร่วมกับ Technician
- Technician ตรวจเครื่อง ทำงานที่ได้รับมอบหมาย บันทึกผล รูป Defect/Follow-up และขออะไหล่
- Manager ดู Dashboard, Machine Health, Loss Time, KPI, History และปฏิทิน PM/TPM พร้อม Approve หรือ Return แผนพร้อมความเห็น
- Production / Planning ดู Dashboard และภาพรวมรายเครื่อง ดูปฏิทิน ยืนยันช่วงหยุดเครื่อง หรือเสนอเลื่อนพร้อมเหตุผล
- ไม่มีขั้นตอน Production รับเครื่องกลับผลิต
- Defect, Follow-up, TPM/PM และ Machine History ยังคงแนวคิดบันทึกครั้งเดียวแล้วเชื่อมข้อมูลต้นทาง

## ขอบเขตความปลอดภัย

v14.0 ใช้ Employee ID only ตามข้อกำหนด จึงเป็น workflow access control สำหรับระบบภายใน ไม่ใช่ strong authentication แม้ตาราง access จะปิด direct read/write และการอนุมัติสำคัญใช้ RPC ตรวจ Role แต่ผู้ที่ทราบรหัสพนักงานผู้อื่นยังสามารถสวมสิทธิ์ของรหัสนั้นได้ การยกระดับในอนาคตควรเพิ่ม PIN/OTP หรือ Supabase Auth
