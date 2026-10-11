# TPM Historical Edit / Photos Fix v14.1.2

แก้กรณีงาน TPM Historical ที่ตั้งสถานะ Completed/Partial ไว้แล้ว แต่ไม่มีแถวผลการทำงานใน `ij_tpm_executions` ทำให้ปุ่ม Edit / Photos ไม่แสดงใน v14.1.1

พฤติกรรมใหม่:
- Completed / Partial แสดงปุ่มแก้ไขสำหรับ Engineer/Admin หรือผู้รับผิดชอบที่มีสิทธิ์
- เพิ่มรูปอย่างเดียวได้
- ถ้ามีการกรอกผล เวลา อะไหล่ หมายเหตุ หรือ flag ระบบจะสร้าง execution ย้อนหลังให้อัตโนมัติ
- ไม่เปลี่ยนสถานะ Completed/Partial ของงาน
