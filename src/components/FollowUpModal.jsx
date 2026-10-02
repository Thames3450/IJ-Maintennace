import React,{useEffect,useState} from 'react'
import { Button, Modal, SelectMenu } from './UI.jsx'
import { CalendarClock, PackageOpen, Wrench, CheckCircle2 } from '../icons.jsx'

export default function FollowUpModal({open,onClose,finding,technicians,onSave}){
  const [form,setForm]=useState({status:'open',owner_profile_id:'',temporary_action:'',permanent_action:'',target_date:'',spare_required:false,need_machine_stop:false,verification_note:''})
  const [saving,setSaving]=useState(false)

  useEffect(()=>{
    if(!open||!finding)return
    setForm({
      status:finding.status||'open',
      owner_profile_id:finding.owner_profile_id||'',
      temporary_action:finding.temporary_action||'',
      permanent_action:finding.permanent_action||'',
      target_date:finding.target_date||'',
      spare_required:!!finding.spare_required,
      need_machine_stop:!!finding.need_machine_stop,
      verification_note:finding.verification_note||''
    })
  },[open,finding])

  const submit=async()=>{
    if(!finding)return
    if(['in_progress','verification','closed'].includes(form.status)&&!form.permanent_action.trim())return alert('Enter permanent action / กรุณาระบุการแก้ไขถาวร')
    if(form.status==='closed'&&!form.verification_note.trim())return alert('Enter verification note before closing / กรุณาระบุผลยืนยันก่อนปิดงาน')
    setSaving(true)
    try{await onSave(finding,form);onClose()}finally{setSaving(false)}
  }

  if(!finding)return null
  const photos=finding.attachments||[]
  return <Modal open={open} onClose={onClose} wide eyebrow="ACTION TRACKER" title="Follow-up Action" subtitle="วางแผนและติดตามการแก้ไข" footer={<><Button variant="ghost" onClick={onClose}>Cancel · ยกเลิก</Button><Button loading={saving} icon={CheckCircle2} onClick={submit}>Save Action <small>บันทึกงานติดตาม</small></Button></>}>
    <section className={`follow-source-card priority-${finding.priority||'B'}`}>
      <div className="follow-source-top"><span className="machine-code">{finding.machines?.machine_no||'-'}</span><span className={`priority priority-${finding.priority||'B'}`}>P-{finding.priority||'B'}</span></div>
      <h3>{finding.finding}</h3>
      {finding.risk&&<p>{finding.risk}</p>}
      {photos.length>0&&<div className="defect-photo-gallery compact">{photos.slice(0,4).map(p=><a key={p.id} href={p.signed_url||'#'} target="_blank" rel="noreferrer"><img src={p.signed_url} alt={p.file_name||'Defect evidence'}/></a>)}</div>}
    </section>

    <div className="form-grid follow-action-form">
      <label>Status <small>สถานะงานติดตาม</small><SelectMenu value={form.status} onChange={v=>setForm({...form,status:v})} options={[
        {value:'open',label:'Action Pending',sub:'ยังไม่ได้วางแผนแก้ไข'},
        {value:'waiting_spare',label:'Waiting Spare',sub:'รออะไหล่'},
        {value:'waiting_machine_stop',label:'Waiting Machine Stop',sub:'รอหยุดเครื่อง'},
        {value:'in_progress',label:'In Progress',sub:'กำลังดำเนินการ'},
        {value:'verification',label:'Verification',sub:'รอยืนยันผลหลังแก้ไข'},
        {value:'closed',label:'Closed',sub:'ยืนยันผลและปิดงาน'}
      ]}/></label>
      <label>Owner <small>ผู้รับผิดชอบ</small><SelectMenu searchable value={form.owner_profile_id} onChange={v=>setForm({...form,owner_profile_id:v})} options={[{value:'',label:'Not assigned',sub:'ยังไม่มอบหมาย'},...(technicians||[]).map(t=>({value:t.id,label:t.full_name||t.employee_code,sub:`${t.employee_code||'-'} · ${t.role||'Maintenance'}`}))]}/></label>
      <label className="span-2">Temporary Action <small>การแก้ไขชั่วคราว / Containment</small><textarea rows="3" value={form.temporary_action} onChange={e=>setForm({...form,temporary_action:e.target.value})} placeholder="Immediate action to control risk / วิธีควบคุมปัญหาชั่วคราว"/></label>
      <label className="span-2">Permanent Action <small>การแก้ไขถาวร</small><textarea rows="3" value={form.permanent_action} onChange={e=>setForm({...form,permanent_action:e.target.value})} placeholder="Permanent corrective action / วิธีแก้ไขถาวร"/></label>
      <label>Target Date <small>วันที่เป้าหมาย</small><input type="date" value={form.target_date} onChange={e=>setForm({...form,target_date:e.target.value})}/></label>
      <div className="follow-check-grid">
        <label className="check-card compact-check"><input type="checkbox" checked={form.spare_required} onChange={e=>setForm({...form,spare_required:e.target.checked})}/><span><PackageOpen size={17}/><b>Spare required</b><small>ต้องใช้อะไหล่</small></span></label>
        <label className="check-card compact-check"><input type="checkbox" checked={form.need_machine_stop} onChange={e=>setForm({...form,need_machine_stop:e.target.checked})}/><span><Wrench size={17}/><b>Machine stop</b><small>ต้องหยุดเครื่อง</small></span></label>
      </div>
      {['verification','closed'].includes(form.status)&&<label className="span-2">Verification Note <small>ผลตรวจยืนยันหลังแก้ไข</small><textarea rows="3" value={form.verification_note} onChange={e=>setForm({...form,verification_note:e.target.value})} placeholder="Confirm the defect is resolved / ยืนยันว่าปัญหาได้รับการแก้ไขแล้ว"/></label>}
    </div>
  </Modal>
}
