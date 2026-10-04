import React,{useEffect,useState} from 'react'
import { Button, Modal, SelectMenu, FormError } from './UI.jsx'
import {decodeActionResult} from '../lib/actionResult.js'
import { CalendarClock, PackageOpen, Wrench, CheckCircle2 } from '../icons.jsx'

export default function FollowUpModal({open,onClose,finding,technicians,onSave}){
  const [form,setForm]=useState({status:'open',owner_profile_id:'',temporary_action:'',permanent_action:'',target_date:'',spare_required:false,need_machine_stop:false,verification_note:''})
  const [saving,setSaving]=useState(false),[error,setError]=useState('')

  useEffect(()=>{
    if(!open||!finding)return
    setError('')
    setForm({
      status:finding.status||'open',
      owner_profile_id:finding.owner_profile_id||'',
      temporary_action:finding.temporary_action||'',
      permanent_action:finding.permanent_action||'',
      target_date:finding.target_date||'',
      spare_required:!!finding.spare_required,
      need_machine_stop:!!finding.need_machine_stop,
      ...decodeActionResult(finding.verification_note||'')
    })
  },[open,finding])

  const submit=async()=>{
    if(!finding||saving)return
    setError('')
    if(['in_progress','verification','closed'].includes(form.status)&&!form.permanent_action.trim())return setError('กรุณาระบุวิธีแก้ไข / งานที่จะทำ')
    if(['in_progress','verification','closed'].includes(form.status)&&!form.owner_profile_id)return setError('กรุณาเลือกผู้รับผิดชอบงาน')
    if(['verification','closed'].includes(form.status)&&!form.work_result.trim())return setError('กรุณาระบุสิ่งที่ทำจริงและผลหลังทำ ก่อนส่งยืนยันหรือปิดงาน')
    if(form.status==='closed'&&!form.verification_note.trim())return setError('กรุณาระบุผลตรวจยืนยันก่อนปิดงาน')
    setSaving(true)
    try{await onSave(finding,form);onClose()}catch(e){setError(`บันทึกไม่สำเร็จ: ${e.message||'กรุณาลองใหม่'}`)}finally{setSaving(false)}
  }


  if(!finding)return null
  const photos=finding.attachments||[]
  return <Modal open={open} busy={saving} onClose={onClose} wide title={finding.status==='closed'?'รายละเอียดงานที่ปิดแล้ว':'อัปเดตงานติดตาม'} subtitle={finding.machines?.machine_no||'เครื่องจักร'} footer={<><Button disabled={saving} variant="ghost" onClick={onClose}>ยกเลิก</Button><Button loading={saving} icon={CheckCircle2} onClick={submit}>{form.status==='closed'?'ยืนยันและปิดงาน':'บันทึกความคืบหน้า'}</Button></>}>
    <div className="followup-editor"><FormError message={error}/>
    <section className="followup-source"><span className="machine-code">{finding.machines?.machine_no||'-'}</span><h3>{finding.finding}</h3>{finding.finding?.length>120&&<details><summary>อ่านปัญหาเต็ม</summary><p>{finding.finding}</p></details>}{finding.risk&&<p>{finding.risk}</p>}{photos.length>0&&<details><summary>ดูรูปหลักฐาน ({photos.length})</summary><div className="defect-photo-gallery compact">{photos.map(p=><a key={p.id} href={p.signed_url||'#'} target="_blank" rel="noreferrer"><img src={p.signed_url} alt={p.file_name||'รูปหลักฐาน'}/></a>)}</div></details>}</section>
    <section className="followup-editor-section"><div className="followup-section-title"><span>1</span><div><h4>วางแผนแก้ไข</h4><p>ระบุคนรับผิดชอบ สิ่งที่จะทำ และวันกำหนด</p></div></div>
    <div className="form-grid follow-action-form">
      <label>สถานะงาน<SelectMenu value={form.status} onChange={v=>setForm({...form,status:v,spare_required:v==='waiting_spare'?true:form.spare_required,need_machine_stop:v==='waiting_machine_stop'?true:form.need_machine_stop})} options={[
        {value:'open',label:'รอวางแผน'},{value:'waiting_spare',label:'รออะไหล่'},{value:'waiting_machine_stop',label:'รอหยุดเครื่อง'},{value:'in_progress',label:'กำลังแก้ไข'},{value:'verification',label:'รอตรวจยืนยัน'},{value:'closed',label:'ยืนยันผลและปิดงาน'}
      ]}/></label>
      <label>ผู้รับผิดชอบ<SelectMenu searchable value={form.owner_profile_id} onChange={v=>setForm({...form,owner_profile_id:v})} options={[{value:'',label:'ยังไม่มอบหมาย'},...(technicians||[]).map(t=>({value:t.id,label:t.full_name||t.employee_code,sub:t.employee_code||''}))]}/></label>
      <label className="span-2">งานที่จะทำ<textarea rows="2" value={form.permanent_action} onChange={e=>setForm({...form,permanent_action:e.target.value})} placeholder="เช่น เปลี่ยนสายลมที่รั่ว แล้วตรวจข้อต่อ"/></label>
      <label>กำหนดเสร็จ<input type="date" value={form.target_date} onChange={e=>setForm({...form,target_date:e.target.value})}/></label>
      <div className="followup-checkboxes"><label><input type="checkbox" checked={form.spare_required} onChange={e=>setForm({...form,spare_required:e.target.checked})}/>ต้องใช้อะไหล่</label><label><input type="checkbox" checked={form.need_machine_stop} onChange={e=>setForm({...form,need_machine_stop:e.target.checked})}/>ต้องหยุดเครื่อง</label></div>
      <details className="span-2 followup-optional" open={!!form.temporary_action||undefined}><summary>การควบคุมปัญหาชั่วคราว (ถ้ามี)</summary><label>วิธีควบคุมชั่วคราว<textarea rows="2" value={form.temporary_action} onChange={e=>setForm({...form,temporary_action:e.target.value})} placeholder="บันทึกเฉพาะเมื่อมีวิธีควบคุมระหว่างรอแก้ไข"/></label></details>
    </div></section>
    <section className="followup-editor-section"><div className="followup-section-title"><span>2</span><div><h4>บันทึกสิ่งที่ทำจริง</h4><p>กรอกหลังเข้าทำงานแล้ว เพื่อแยกผลจริงออกจากแผน</p></div></div><label>สิ่งที่ทำจริง / ผลหลังทำ<textarea rows="3" value={form.work_result||''} onChange={e=>setForm({...form,work_result:e.target.value})} placeholder="ทำอะไร เมื่อไหร่ และได้ผลอย่างไร"/></label></section>
    <section className="followup-editor-section"><div className="followup-section-title"><span>3</span><div><h4>ตรวจยืนยันและปิดงาน</h4><p>ปิดงานได้เมื่อมีผู้รับผิดชอบ ผลงานจริง และผลตรวจยืนยัน</p></div></div><label>ผลตรวจยืนยัน<textarea rows="2" value={form.verification_note} onChange={e=>setForm({...form,verification_note:e.target.value})} placeholder="เช่น ทดลองเดินเครื่องแล้ว ไม่พบลมรั่วซ้ำ"/></label>{form.status==='closed'&&<div className="followup-close-note">เมื่อบันทึก งานนี้จะย้ายไปหมวด “ปิดงานแล้ว”</div>}</section>
    </div>
  </Modal>
}
