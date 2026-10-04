// Online visual inspection only. Use the approved machine procedure for intrusive work.
export const FALLBACK_TEMPLATE = { id:'local-ij-online', name:'ตรวจสภาพ IJ ระหว่างเดินเครื่อง / IJ online inspection', frequency_days:7, is_active:true }
const points = [
 ['สายลมและข้อต่อ / Air tubes & couplers','มองหารอยแตกร้าว สายเสียดสี และฟังเสียงลมรั่ว โดยไม่ถอดข้อต่อขณะมีแรงดัน','B','pneumatic'],
 ['น้ำมันไฮดรอลิกและสายไฮดรอลิก / Hydraulic leaks & hoses','สังเกตรอยรั่วซึม สายแตกร้าว และจุดเสียดสีจากภายนอก ห้ามใช้มือหารอยรั่ว','B','hydraulic'],
 ['ระดับและอุณหภูมิน้ำมัน / Oil level & temperature','อ่านค่าจากหน้าจอหรือเกจ เทียบช่วงที่กำหนดในคู่มือเครื่อง','B','hydraulic'],
 ['ประตูและสวิตช์นิรภัย / Door safety condition','ตรวจสภาพประตู สาย และสวิตช์จากภายนอก การทดสอบ interlock ต้องประสานฝ่ายผลิตตามขั้นตอน','A','safety'],
 ['ปุ่มหยุดฉุกเฉิน / Emergency stop condition','ตรวจปุ่มและป้ายว่าครบ ไม่แตก ไม่ถูกกีดขวาง การทดสอบการทำงานต้องอยู่ในช่วงหยุดเครื่องที่อนุมัติ','A','safety'],
 ['ตู้ไฟและการระบายอากาศ / Electrical cabinet exterior','ตรวจฝาปิด ช่องระบายอากาศ พัดลม และกลิ่นผิดปกติจากภายนอก ไม่เปิดตู้ขณะเดินเครื่อง','B','electrical'],
 ['มอเตอร์และปั๊ม / Motor & pump condition','สังเกตเสียง การสั่น และค่าความร้อนจากระยะปลอดภัย ไม่สัมผัสส่วนหมุน','B','drive'],
 ['จุดหล่อลื่น / Lubrication condition','สังเกตระดับจารบีและสัญญาณระบบหล่อลื่นจากจุดที่เข้าถึงได้อย่างปลอดภัย','B','lubrication'],
 ['Robot และ Gripper / Handling robot','สังเกตสายพาน สายลม สายไฟ และการเคลื่อนที่จากนอกเขตป้องกัน ไม่เข้าเขต Robot','B','robot'],
 ['ระบบหล่อเย็น / Cooling water','ตรวจรอยรั่ว สาย และอ่านเกจหรือ flow indicator เทียบค่ามาตรฐานของเครื่อง','B','cooling'],
 ['ระบบดูดและจ่าย Material / Material feeding','สังเกตการจ่ายวัตถุดิบ สายดูด การรั่วและสัญญาณ Alarm','B','material'],
 ['พื้นที่รอบเครื่อง / Housekeeping','ตรวจน้ำมันบนพื้น สิ่งกีดขวาง และความพร้อมทางเดิน','C','general']
]
export const FALLBACK_ITEMS=points.map(([item_name,inspection_method,criticality,component_code],i)=>({id:`local-point-${i+1}`,template_id:FALLBACK_TEMPLATE.id,item_name,inspection_method,criticality,component_code,sort_order:i,is_active:true}))
export function inspectionRows(items){return items.map(x=>({template_item_id:String(x.id).startsWith('local-point-')?null:x.id,key:x.id,item_name:x.item_name,inspection_method:x.inspection_method||'',zone_code:x.zone_code||null,component_code:x.component_code||null,result_status:'',numeric_value:'',text_value:'',value_type:x.value_type||'status',unit:x.unit||'',min_value:x.min_value,max_value:x.max_value,note:'',criticality:x.criticality||'B',requires_photo_on_ng:!!x.requires_photo_on_ng,photos:[]}))}
export function inspectionSummary(rows){
 const valid=rows.filter(r=>r.result_status!=='na')
 return {score:valid.length?Math.round(valid.reduce((s,r)=>s+({normal:100,watch:70,abnormal:30}[r.result_status]||0),0)/valid.length):null,overall:rows.some(r=>r.result_status==='abnormal')?'abnormal':rows.some(r=>r.result_status==='watch')?'watch':'normal'}
}
