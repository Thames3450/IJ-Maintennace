import React,{useEffect,useState} from 'react'
import { Camera, Trash2 } from '../icons.jsx'
import { Modal, Button, PriorityGuide, SelectMenu } from './UI.jsx'

const PHOTO_LIMIT=4
const MAX_FILE_MB=10

export default function FindingModal({open,onClose,machines,job,profile,onSave}){
  const [form,setForm]=useState({machine_id:'',finding:'',risk:'',priority:'B',photos:[]})
  const [saving,setSaving]=useState(false)

  const cleanup=(photos=[])=>photos.forEach(p=>p?.preview&&URL.revokeObjectURL(p.preview))
  const close=()=>{cleanup(form.photos);onClose()}

  useEffect(()=>{
    if(!open)return
    cleanup(form.photos)
    setForm({machine_id:job?.machine_id||'',finding:'',risk:'',priority:'B',photos:[]})
  },[open,job])

  const addPhotos=fileList=>{
    const files=Array.from(fileList||[]).filter(f=>f.type?.startsWith('image/'))
    if(!files.length)return
    const oversize=files.find(f=>f.size>MAX_FILE_MB*1024*1024)
    if(oversize)return alert(`Photo is larger than ${MAX_FILE_MB} MB / รูปมีขนาดใหญ่เกิน ${MAX_FILE_MB} MB`)
    setForm(cur=>{
      const slots=Math.max(0,PHOTO_LIMIT-(cur.photos||[]).length)
      const next=files.slice(0,slots).map(file=>({id:`${Date.now()}_${Math.random().toString(36).slice(2,7)}`,file,name:file.name,preview:URL.createObjectURL(file),size:file.size,type:file.type}))
      return {...cur,photos:[...(cur.photos||[]),...next]}
    })
  }

  const removePhoto=id=>setForm(cur=>{
    const target=(cur.photos||[]).find(p=>p.id===id)
    if(target?.preview)URL.revokeObjectURL(target.preview)
    return {...cur,photos:(cur.photos||[]).filter(p=>p.id!==id)}
  })

  const submit=async()=>{
    if(!form.machine_id||!form.finding.trim())return alert('Select machine and enter defect / กรุณาเลือกเครื่องและระบุจุดผิดปกติ')
    setSaving(true)
    try{await onSave({...form,job_id:job?.id||null,found_by:profile.id});close()}finally{setSaving(false)}
  }

  return <Modal open={open} onClose={close} title={job?`New Defect · ${job.machines?.machine_no}`:'New Defect'} subtitle={job?'บันทึกจุดผิดปกติจากงาน TPM / PM':'บันทึกปัญหาที่พบ'} eyebrow="DEFECT / ABNORMALITY" footer={<div className="footer-actions"><Button variant="ghost" onClick={close}>Cancel · ยกเลิก</Button><Button loading={saving} onClick={submit}>Save Defect · บันทึก</Button></div>}>
    <div className="defect-form-intro"><b>Record what was found first.</b><small>บันทึกเฉพาะสิ่งที่พบก่อน ส่วนการวางแผนแก้ไขจะไปทำใน Follow-up</small></div>
    <PriorityGuide compact/>
    <div className="form-grid">
      <label>Machine <small>เครื่องจักร</small><SelectMenu searchable value={form.machine_id} disabled={!!job} onChange={v=>setForm({...form,machine_id:v})} options={[{value:'',label:'Select machine',sub:'เลือกเครื่อง'},...machines.map(m=>({value:m.id,label:m.machine_no,sub:m.machine_name||'เครื่องจักร'}))]}/></label>
      <label>Priority <small>ระดับความสำคัญ</small><SelectMenu value={form.priority} onChange={v=>setForm({...form,priority:v})} options={[{value:'A',label:'A — Critical',sub:'วิกฤต / จัดการทันที'},{value:'B',label:'B — Important',sub:'สำคัญ / ควรแก้เร็ว'},{value:'C',label:'C — Routine',sub:'ทั่วไป / วางแผนทำ'}]}/></label>
      <label className="span-2">Defect / Finding <small>จุดผิดปกติหรือปัญหาที่พบ</small><textarea rows="3" value={form.finding} onChange={e=>setForm({...form,finding:e.target.value})} placeholder="Example: Hydraulic hose has oil seepage / พบสาย Hydraulic มีน้ำมันซึม"/></label>
      <label className="span-2">Risk / Impact <small>ผลกระทบหรือความเสี่ยงที่อาจเกิดขึ้น</small><textarea rows="2" value={form.risk} onChange={e=>setForm({...form,risk:e.target.value})} placeholder="Safety / machine stop / quality / downtime impact · ผลกระทบต่อความปลอดภัย เครื่องหยุด คุณภาพ หรือ Downtime"/></label>
      <div className="span-2 defect-photo-upload">
        <div className="defect-photo-upload-head"><div><b>Photo Evidence</b><small>รูปภาพหลักฐาน · ถ่ายจากมือถือหรือแนบไฟล์ได้</small></div><label className={`inspection-photo-btn ${(form.photos||[]).length>=PHOTO_LIMIT?'disabled':''}`}><input type="file" accept="image/*" capture="environment" multiple disabled={(form.photos||[]).length>=PHOTO_LIMIT} onChange={e=>{addPhotos(e.target.files);e.target.value=''}}/><Camera size={15}/>{(form.photos||[]).length?'Add Photo':'Take / Upload'} <small>ถ่าย / แนบรูป</small></label></div>
        {(form.photos||[]).length?<div className="inspection-photo-grid defect-upload-grid">{form.photos.map(p=><figure key={p.id} className="inspection-photo-thumb"><img src={p.preview} alt={p.name}/><button type="button" className="photo-remove-btn" onClick={()=>removePhoto(p.id)}><Trash2 size={14}/></button><figcaption>{Math.round((p.size||0)/1024)} KB</figcaption></figure>)}</div>:<div className="inspection-photo-empty">No photo attached · ยังไม่มีรูป <span>(สูงสุด {PHOTO_LIMIT} รูป)</span></div>}
      </div>
    </div>
  </Modal>
}
