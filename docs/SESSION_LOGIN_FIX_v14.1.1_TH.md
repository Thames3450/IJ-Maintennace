# IJ Maintenance v14.1.1 — Session Login Fix

แก้ปัญหา Login ด้วยรหัสพนักงานสำเร็จ แต่หน้าเว็บขึ้น `Cannot open IJ Maintenance`

สาเหตุ: ฐานข้อมูลใช้ RLS แบบ session (`x-ij-session`) แต่ frontend v14.1 เรียก `ij_access_login` ซึ่งคืนเฉพาะ Profile และไม่ได้สร้าง/ส่ง session token ทำให้ query หลัง Login ถูก RESTRICTIVE RLS ปฏิเสธ

การแก้ไข:
- Login เปลี่ยนไปใช้ `ij_session_login`
- เก็บ token ใน localStorage ชั่วคราว
- ทุก Supabase request แนบ `x-ij-session` อัตโนมัติ
- ตอนเปิดเว็บตรวจ session ด้วย `ij_session_current`
- Session หมดอายุแล้วสามารถสร้างใหม่จาก Employee ID ที่ browser จำไว้
- Logout เรียก `ij_session_logout` และล้าง token

ไม่มีการเปลี่ยนข้อมูล TPM/PM/Inspection/Defect เดิม
