import {decodeActionResult} from './actionResult.js'
export const FOLLOWUP_STATUS={open:'รอแก้ไข',ready:'พร้อมแก้ไข',waiting_spare:'รออะไหล่',waiting_machine_stop:'รอหยุดเครื่อง',in_progress:'กำลังแก้ไข',verification:'รอตรวจยืนยัน',closed:'ปิดงานแล้ว'}
export const isFollowUpOverdue=(f,today)=>f.status!=='closed'&&!!f.target_date&&f.target_date<today
export function followUpNext(f){
 if(f.status==='closed')return 'แก้ไขและตรวจยืนยันแล้ว'
 if(f.status==='waiting_spare')return 'ติดตามอะไหล่ แล้วนัดวันเข้าทำ'
 if(f.status==='waiting_machine_stop')return 'ยืนยันช่วงหยุดเครื่องกับฝ่ายผลิต'
 if(f.status==='verification')return 'ตรวจผลหลังแก้ไข แล้วบันทึกยืนยัน'
 if(!f.owner_profile_id)return 'มอบหมายผู้รับผิดชอบ'
 if(!f.permanent_action?.trim())return 'ระบุวิธีแก้ไขและวันกำหนด'
 if(!f.work_result&&!decodeActionResult(f.verification_note||'').work_result)return 'ทำตามแผน แล้วบันทึกผลที่ทำจริง'
 return 'ตรวจผลหลังแก้ไข ก่อนปิดงาน'
}
