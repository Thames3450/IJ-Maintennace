// Display translations only: keep template IDs and recorded source labels unchanged.
export const INSPECTION_POINTS_TH={
 'Emergency Stop / Safety Circuit':'ปุ่มหยุดฉุกเฉิน / วงจรนิรภัย',
 'Door Safety Limit Switch':'ลิมิตสวิตช์นิรภัยประตู',
 'Pneumatic Tube / Air Leak':'สายลม / จุดลมรั่ว',
 'Air Filter / Water Drain':'ชุดกรองลม / การระบายน้ำ',
 'Hydraulic Oil Leak / Hose':'จุดน้ำมันไฮดรอลิกรั่ว / สายไฮดรอลิก',
 'Hydraulic Oil Level':'ระดับน้ำมันไฮดรอลิก',
 'Hydraulic Pump / Coupling':'ปั๊มไฮดรอลิก / คัปปลิง',
 'Electrical Cabinet Cleanliness':'ความสะอาดตู้ไฟฟ้า',
 'Electrical Wiring / Terminal':'สายไฟ / จุดต่อสายไฟ',
 'Robot / Handling System':'หุ่นยนต์ / ระบบหยิบจับชิ้นงาน',
 'Cooling Water / Leakage':'ระบบน้ำหล่อเย็น / จุดรั่ว',
 'Machine Cleanliness / Abnormal Condition':'ความสะอาดเครื่อง / สภาพผิดปกติ'
}
export const INSPECTION_METHODS_TH={
 'Functional check':'ตรวจสอบการทำงาน',
 'Functional + visual check':'ตรวจสอบการทำงานและสภาพภายนอก',
 'Visual + leak check':'ตรวจสภาพภายนอกและจุดรั่ว',
 'Visual + drain check':'ตรวจสภาพภายนอกและการระบายน้ำ',
 'Visual inspection':'ตรวจสภาพด้วยสายตา',
 'Level check':'ตรวจสอบระดับ',
 'Noise / vibration / visual':'ตรวจเสียง การสั่น และสภาพภายนอก',
 'Visual / loose connection':'ตรวจสภาพภายนอกและจุดต่อที่หลวม',
 'Belt / gripper / abnormal sound':'ตรวจสายพาน ชุดจับชิ้นงาน และเสียงผิดปกติ',
 '5S + general inspection':'ตรวจ 5ส และสภาพทั่วไป'
}
const normalize=s=>s.trim().replace(/\s+/g,' ').toLowerCase()
export function inspectionThai(text='',kind='point'){
 const source=String(text||'')
 if(!source||/[\u0e00-\u0e7f]/.test(source))return source
 const dict=kind==='method'?INSPECTION_METHODS_TH:INSPECTION_POINTS_TH
 const match=Object.keys(dict).find(k=>normalize(k)===normalize(source))
 return match?`${dict[match]} / ${source}`:source
}
