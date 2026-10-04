import {isoDate} from './utils.js'

export const PM_FREQUENCIES=[
 {value:'weekly',label:'ทุกสัปดาห์',sub:'Weekly · 7 วัน'},
 {value:'monthly',label:'ทุกเดือน',sub:'Monthly · 1 เดือน'},
 {value:'quarterly',label:'ทุก 3 เดือน',sub:'Quarterly'},
 {value:'semiannual',label:'ทุก 6 เดือน',sub:'Semiannual'},
 {value:'annual',label:'ทุกปี',sub:'Annual'}
]
export const frequencyName=v=>PM_FREQUENCIES.find(x=>x.value===v)?.label||v
export const isPMDone=p=>p.status==='completed'||!!p.completed_at
export const isPMOverdue=(p,today=isoDate())=>!isPMDone(p)&&p.status!=='skipped'&&p.due_date<today
export const pmResultName=v=>({normal:'ผ่าน',corrected:'แก้ไขแล้วผ่าน',abnormal:'ไม่ผ่าน / ต้องติดตาม',na:'ไม่เกี่ยวข้อง'})[v]||'ยังไม่ตรวจ'
export const pmResultTone=v=>({normal:'green',corrected:'blue',abnormal:'red',na:'neutral'})[v]||'neutral'
export const emptyPMResults=items=>items.map(item=>({item_id:item.id,result:'',measured_value:'',note:''}))

export function nextPMDate(date,frequency){
 const [y,m,d]=date.split('-').map(Number)
 if(frequency==='weekly'){const out=new Date(y,m-1,d+7);return isoDate(out)}
 const offset={monthly:1,quarterly:3,semiannual:6,annual:12}[frequency]
 if(!offset)throw new Error('รอบ PM ไม่ถูกต้อง')
 const month=new Date(y,m-1+offset,1)
 return isoDate(new Date(month.getFullYear(),month.getMonth(),Math.min(d,new Date(month.getFullYear(),month.getMonth()+1,0).getDate())))
}

export function validatePMStandard(form){
 if(!form.code?.trim()||!form.title?.trim())throw new Error('กรุณาระบุรหัสและชื่อมาตรฐาน PM')
 if(!Number.isInteger(Number(form.revision))||Number(form.revision)<1)throw new Error('Revision ต้องเป็นจำนวนเต็มตั้งแต่ 1 ขึ้นไป')
 if(!PM_FREQUENCIES.some(x=>x.value===form.frequency))throw new Error('กรุณาเลือกรอบ PM')
 if(!Number.isInteger(Number(form.std_minutes))||Number(form.std_minutes)<0)throw new Error('เวลามาตรฐานต้องเป็นจำนวนเต็มตั้งแต่ 0 ขึ้นไป')
 if(!form.items?.length)throw new Error('ต้องมีรายการ PM อย่างน้อย 1 ข้อ')
 const ids=new Set()
 for(const [i,item] of form.items.entries()){
  if(!item.id||ids.has(item.id))throw new Error('รหัสรายการ PM ซ้ำกัน');ids.add(item.id)
  if(!item.name?.trim()||!item.method?.trim()||!item.criterion?.trim())throw new Error(`ข้อ ${i+1}: ระบุชื่อ วิธีทำ และเกณฑ์ผ่านให้ครบ`)
  if(!['check','measurement'].includes(item.type))throw new Error(`ข้อ ${i+1}: ประเภทผลไม่ถูกต้อง`)
  if(item.type==='measurement'){
   const min=item.min_value,max=item.max_value
   if(!item.unit?.trim()||min===''||min==null||max===''||max==null||!Number.isFinite(Number(min))||!Number.isFinite(Number(max))||Number(min)>Number(max))throw new Error(`ข้อ ${i+1}: ระบุหน่วยและช่วงค่าตามคู่มือให้ครบ`)
  }
 }
 if(form.status==='approved'&&(!form.reference?.trim()||!form.machine_scope?.trim()||!form.reviewer_name?.trim()||!form.prepared_by_name?.trim()))throw new Error('ก่อนรับรองมาตรฐาน ต้องระบุรุ่นเครื่อง เอกสารอ้างอิง ผู้จัดทำ และผู้ทวนสอบ')
 if(form.status==='approved'&&Number(form.std_minutes)<=0)throw new Error('ก่อนรับรองมาตรฐาน กรุณากำหนดเวลาเป้าหมาย PM มากกว่า 0 นาที')
 return {...form,std_minutes:Number(form.std_minutes),revision:Math.max(1,Number(form.revision)||1),items:form.items.map(x=>({...x,min_value:x.type==='measurement'?Number(x.min_value):null,max_value:x.type==='measurement'?Number(x.max_value):null}))}
}

export function validatePMExecution(items,form,complete=true){
 if(!Number.isInteger(Number(form.stop_minutes))||Number(form.stop_minutes)<0||form.stop_minutes==='')throw new Error('เวลาหยุดจริงต้องเป็นจำนวนเต็มตั้งแต่ 0 ขึ้นไป')
 const results=items.map(item=>{
  const row=(form.results||[]).find(r=>r.item_id===item.id)||{item_id:item.id,result:'',note:'',measured_value:''}
  const n=row.measured_value
  if(complete&&!['normal','corrected','abnormal','na'].includes(row.result))throw new Error(`ยังไม่ได้บันทึกผล: ${item.name}`)
  if(complete&&['abnormal','corrected','na'].includes(row.result)&&!row.note?.trim())throw new Error(`${item.name}: ระบุปัญหา สิ่งที่แก้ไข หรือเหตุผลที่ไม่เกี่ยวข้อง`)
  const value=n===''||n==null?null:Number(n)
  if(value!==null&&!Number.isFinite(value))throw new Error(`${item.name}: ค่าที่วัดไม่ถูกต้อง`)
  if(complete&&item.type==='measurement'&&row.result!=='na'){
   if(value===null)throw new Error(`${item.name}: กรุณาบันทึกค่าที่วัดจริง`)
   if(['normal','corrected'].includes(row.result)&&((item.min_value!=null&&value<Number(item.min_value))||(item.max_value!=null&&value>Number(item.max_value))))throw new Error(`${item.name}: ค่าที่วัดอยู่นอกเกณฑ์ ต้องเลือกไม่ผ่าน`)
  }
  return {...row,measured_value:value}
 })
 if(complete){
  if(results.every(r=>r.result==='na'))throw new Error('ไม่สามารถปิด PM ที่ไม่เกี่ยวข้องทุกข้อได้')
  if(!form.performed_by_name?.trim())throw new Error('กรุณาระบุชื่อผู้ทำ PM')
  if(!form.result_summary?.trim())throw new Error('กรุณาบันทึกสิ่งที่ทำจริงและผลสรุป PM')
  if(!form.verification_note?.trim()||!form.safety_confirmed)throw new Error('กรุณาบันทึกการทดสอบหลัง PM และยืนยันตรวจคืนสภาพก่อนปิดงาน')
 }
 return {...form,results,stop_minutes:Number(form.stop_minutes)}
}

export function pmOrderAsSchedule(order){return {...order,source:'ij_pm',plan_id:order.standard_id,plan_title_snapshot:order.standard_snapshot?.title||'PM',frequency_snapshot:order.standard_snapshot?.frequency,std_minutes_snapshot:order.standard_snapshot?.std_minutes||0,execution_note:order.result_summary}}
