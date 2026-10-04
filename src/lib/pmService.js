import {supabase} from './supabase.js'
import {validatePMStandard,validatePMExecution} from './pm.js'

async function call(name,args){
 const {data,error}=await supabase.rpc(name,args)
 if(error){
  if(error.code==='PGRST202'||error.code==='42P01')throw new Error('ระบบ PM ยังไม่ได้ติดตั้งส่วนฐานข้อมูล กรุณาติดตั้ง migration ที่มากับเวอร์ชันนี้')
  if(error.code==='23505')throw new Error(name==='ij_pm_save_standard'?'รหัสมาตรฐานและ Revision นี้มีอยู่แล้ว กรุณาใช้ Revision ถัดไป':'มีรอบ PM ของมาตรฐานนี้ในเครื่องและวันเดียวกันแล้ว กรุณาตรวจตาราง PM')
  throw new Error(error.message)
 }
 if(!data?.id)throw new Error('ยังไม่ได้รับการยืนยันการบันทึก PM กรุณารีเฟรชและตรวจรายการก่อนลองอีกครั้ง')
 return data
}
export async function savePMStandard(form,departmentId){
 const clean=validatePMStandard(form)
 const keys=['id','code','title','revision','frequency','std_minutes','machine_id','machine_scope','reference','prepared_by_name','reviewer_name','instructions','need_machine_stop','status','items']
 const payload=Object.fromEntries(keys.map(k=>[k,clean[k]??null]));payload.machine_id=payload.machine_id||null;payload.department_id=departmentId
 return call('ij_pm_save_standard',{p_standard:payload})
}
export const createPMOrder=form=>call('ij_pm_create_order',{p_order:form})
export const startPMOrder=order=>call('ij_pm_start_order',{p_order_id:order.id})
export const savePMResult=(order,form,complete)=>call('ij_pm_save_result',{p_order_id:order.id,p_result:validatePMExecution(order.standard_snapshot.items,form,complete),p_complete:complete})
