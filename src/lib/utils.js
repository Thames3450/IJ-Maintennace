export const fmtDate = (value) => {
  if (!value) return '-'
  const d = new Date(String(value).length === 10 ? `${value}T00:00:00` : value)
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(d)
}
export const fmtDateTime = (value) => {
  if (!value) return '-'
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit', hour12:false }).format(new Date(value))
}
export const isoDate = (d = new Date()) => {
  const x = new Date(d); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0, 10)
}
export const mondayOf = (d = new Date()) => {
  const x = new Date(d); const day = x.getDay() || 7; x.setHours(0,0,0,0); x.setDate(x.getDate() - day + 1); return x
}
export const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x }
export const nextSunday = () => { const d = new Date(); const add = (7 - d.getDay()) % 7 || 7; return isoDate(addDays(d, add)) }
export const startOfMonth = (d = new Date()) => new Date(d.getFullYear(), d.getMonth(), 1)
export const daysBetween = (from, to) => Math.max(1, Math.ceil((new Date(to) - new Date(from)) / 86400000) + 1)
export const clamp = (n,min=0,max=100) => Math.min(max,Math.max(min,Number(n)||0))
export const pct = (num,den) => den ? Math.round((Number(num)||0) / den * 100) : 0
export const minutesToHuman = (min) => {
  const n=Number(min)||0; if(n<60)return `${n} min`; const h=Math.floor(n/60),m=n%60; return `${h} h${m?` ${m} min`:''}`
}
export const statusLabel = (s='') => ({
  draft:'Draft · ร่าง', planned:'Ready · พร้อมทำ', in_progress:'In Progress · กำลังทำ', completed:'Completed · เสร็จแล้ว', partial:'Partial · เสร็จบางส่วน', postponed:'Postponed · เลื่อน', cancelled:'Cancelled · ยกเลิก',
  open:'Open · เปิด', waiting_spare:'Waiting Spare · รออะไหล่', waiting_machine_stop:'Waiting Stop · รอหยุดเครื่อง', verification:'Verification · รอยืนยันผล', closed:'Closed · ปิดแล้ว', confirmed:'Confirmed · ยืนยัน', waiting:'Waiting · รอ', approved:'Approved · อนุมัติ', rejected:'Rejected · ไม่อนุมัติ', not_required:'Not Required · ไม่ต้องอนุมัติ',
  normal:'Normal · ปกติ', watch:'Watch · เฝ้าระวัง', abnormal:'Abnormal · ผิดปกติ', review:'Review · ตรวจสอบ', change_requested:'Change Requested · ขอเปลี่ยน', new:'New · ใหม่', ready:'Ready · พร้อม', sent:'Sent · ส่งแล้ว', follow_up:'Follow-up · ติดตาม'
}[s] || String(s).replaceAll('_',' '))
export const shortStatusLabel = (s='') => ({
  draft:'Draft', planned:'Ready', in_progress:'In Progress', completed:'Completed', partial:'Partial', postponed:'Postponed', cancelled:'Cancelled',
  open:'Open', waiting_spare:'Waiting Spare', waiting_machine_stop:'Waiting Stop', verification:'Verification', closed:'Closed', confirmed:'Confirmed', waiting:'Waiting', approved:'Approved', rejected:'Rejected', not_required:'N/A',
  normal:'Normal', watch:'Watch', abnormal:'Abnormal', review:'Review', change_requested:'Change', new:'New', ready:'Ready', sent:'Sent', follow_up:'Follow-up'
}[s] || String(s).replaceAll('_',' '))
export const workTypeLabel = (s='') => ({
  pm_scheduled:'PM · บำรุงรักษาตามรอบ', tpm_added:'TPM · งานเพิ่มตามสภาพ', follow_up:'Follow-up · งานติดตาม', improvement:'Improvement · ปรับปรุง', emergency_repair:'Repair · ซ่อม', repair:'Repair · ซ่อม', inspection:'Inspection · ตรวจสภาพ', finding:'Defect · จุดผิดปกติ', opportunity:'Opportunity · โอกาสปรับปรุง'
}[s] || s)
export const workTypeShort = (s='') => ({ pm_scheduled:'PM', tpm_added:'TPM', follow_up:'Follow-up', improvement:'Improvement', emergency_repair:'Repair', repair:'Repair', inspection:'Inspection', finding:'Defect', opportunity:'Opportunity' }[s] || s)
export const rolePlanner = (role) => ['admin','supervisor'].includes(role)
export const uid = () => crypto.randomUUID()
export const machineGroup = (machineNo='') => {
  const m=String(machineNo).match(/^(\d+)T/); return m ? `${m[1]}T` : 'Other'
}
export const naturalMachineSort = (a,b) => String(a?.machine_no||a||'').localeCompare(String(b?.machine_no||b||''), undefined, {numeric:true,sensitivity:'base'})
export const kpiTone = (value,target,better='high') => {
  if(target===null||target===undefined||target==='') return 'neutral'
  const v=Number(value)||0,t=Number(target)||0
  if(better==='low') return v<=t?'green':v<=t*1.2?'amber':'red'
  return v>=t?'green':v>=t*.9?'amber':'red'
}
