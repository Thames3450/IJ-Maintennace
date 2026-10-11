# TPM Editable Result & Photos — v14.1

## สิ่งที่เพิ่ม
- งาน TPM ที่มีผลแล้วสามารถเปิด `Edit / Photos` เพื่อแก้ไขผลการทำงานได้
- Engineer / Admin แก้ไขผล TPM ได้ทุกงาน
- Technician แก้ไขได้เฉพาะงานที่ได้รับมอบหมาย
- แก้ไขได้: Work Result, Actual Stop, Parts Used, Note, Abnormal, Follow-up
- งานที่ Completed แล้ว การแก้ไขผลจะไม่เปิดงานกลับและไม่เปลี่ยน Workflow Status
- รูปภาพผูกกับ TPM Job แต่ละรายการโดยตรง
- รองรับประเภทภาพ Before / After / Additional
- เพิ่มหรือลบรูปภายหลังได้ แม้งาน TPM ปิดแล้ว
- รองรับสูงสุด 12 รูปต่อ 1 TPM Job และ 10 MB ต่อรูป
- รูปถูกเก็บใน private Supabase Storage bucket `ij-tpm-photos`

## Database
Migration: `20261011162000_ij_tpm_editable_results_photos_v14_1.sql`
Live MPR Maintenance database has already been migrated.
