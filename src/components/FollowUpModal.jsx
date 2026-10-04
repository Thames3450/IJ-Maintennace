import React,{useEffect,useState} from 'react'
import {Button,Modal,SelectMenu,FormError} from './UI.jsx'
import {decodeActionResult} from '../lib/actionResult.js'
import {CheckCircle2} from '../icons.jsx'

function actionForm(finding,jobs){
 if(!finding)return {}
 const evidence=decodeActionResult(finding.verification_note||''),job=jobs.filter(j=>(j.ij_tpm_executions||[])[0]?.result_summary).sort((a,b)=>String(b.ij_tpm_executions[0].actual_completed_at||'').localeCompare(String(a.ij_tpm_executions[0].actual_completed_at||'')))[0],exec=job?.ij_tpm_executions?.[0]
 return {status:finding.status||'open',owner_profile_id:finding.owner_profile_id||job?.ij_tpm_job_assignees?.[0]?.profile_id||'',temporary_action:finding.temporary_action||'',permanent_action:finding.permanent_action||job?.details||job?.title||'',target_date:finding.target_date||'',spare_required:!!finding.spare_required,need_machine_stop:!!finding.need_machine_stop,work_result:finding.work_result||evidence.work_result||exec?.result_summary||'',verification_note:evidence.verification_note||exec?.verification_note||'',parts_used:finding.parts_used||exec?.parts_used||''}
}

export default function FollowUpModal({open,onClose,finding,technicians,onSave,initialMode='update',linkedJobs=[]}){
 const [form,setForm]=useState(()=>actionForm(finding,linkedJobs)),[mode,setMode]=useState(initialMode),[saving,setSaving]=useState(false),[error,setError]=useState('')
 const activeTPM=linkedJobs.filter(j=>!['completed','cancelled'].includes(j.job_status)),closed=finding?.status==='closed'
 const resultJob=linkedJobs.filter(j=>(j.ij_tpm_executions||[])[0]?.result_summary).sort((a,b)=>String(b.ij_tpm_executions[0].actual_completed_at||'').localeCompare(String(a.ij_tpm_executions[0].actual_completed_at||'')))[0]
 useEffect(()=>{
  if(!open||!finding)return
  setError('');setMode(initialMode);setForm(actionForm(finding,linkedJobs))
 },[open,finding,initialMode])
 if(!finding)return null
 const closeMode=mode==='close',photos=finding.attachments||[]
 const submit=async()=>{
  if(saving||closed)return
  setError('')
  const status=closeMode?'closed':form.status
  if(['verification','closed'].includes(status)&&!form.owner_profile_id)return setError('กรุณาเลือกผู้รับผิดชอบงาน')
  if(['verification','closed'].includes(status)&&!form.work_result?.trim())return setError('กรุณาระบุสิ่งที่ทำจริงและผลหลังทำ')
  if(closeMode&&!form.verification_note?.trim())return setError('กรุณาระบุผลตรวจยืนยันก่อนปิดงาน')
  if(closeMode&&activeTPM.length)return setError('งานนี้มี TPM ที่ยังไม่เสร็จ กรุณาบันทึกผลผ่านงาน TPM')
  setSaving(true)
  try{await onSave(finding,{...form,status});onClose()}catch(e){setError(`บันทึกไม่สำเร็จ: ${e.message||'กรุณาลองใหม่'}`)}finally{setSaving(false)}
 }
 const switchMode=next=>{setMode(next);setError('')}
 return <Modal open={open} busy={saving} onClose={onClose} title={closed?'รายละเอียดงานที่ปิดแล้ว':'อัปเดตงานติดตาม'} subtitle={finding.machines?.machine_no||'เครื่องจักร'} footer={closed?<Button variant="ghost" onClick={onClose}>ปิดหน้าต่าง</Button>:<><Button disabled={saving} variant="ghost" onClick={onClose}>ยกเลิก</Button><Button loading={saving} disabled={closeMode&&!!activeTPM.length} icon={CheckCircle2} onClick={submit}>{closeMode?'ยืนยันและปิดงาน':'บันทึกความคืบหน้า'}</Button></>}>
  <div className="followup-simple-editor"><FormError message={error}/><section className="followup-source"><span className="machine-code">{finding.machines?.machine_no||'-'}</span><h3>{finding.finding}</h3>{finding.finding?.length>120&&<details><summary>อ่านปัญหาเต็ม</summary><p>{finding.finding}</p></details>}{photos.length>0&&<details><summary>ดูรูปหลักฐาน ({photos.length})</summary><div className="defect-photo-gallery compact">{photos.map(p=><a key={p.id} href={p.signed_url||'#'} target="_blank" rel="noreferrer"><img src={p.signed_url} alt={p.file_name||'รูปหลักฐาน'}/></a>)}</div></details>}</section>
  {!closed&&<div className="followup-mode-tabs" role="tablist" aria-label="เลือกวิธีอัปเดตงาน"><button role="tab" aria-selected={!closeMode} className={!closeMode?'active':''} onClick={()=>switchMode('update')}>อัปเดตงาน</button><button role="tab" aria-selected={closeMode} className={closeMode?'active':''} disabled={!!activeTPM.length} onClick={()=>switchMode('close')}>บันทึกผลและปิดงาน</button></div>}
  {activeTPM.length>0&&<p className="linked-work-notice">เชื่อมกับ TPM {activeTPM.length} งาน ให้บันทึกผลและตรวจยืนยันใน TPM ระบบจะอัปเดตงานติดตามให้พร้อมกัน</p>}
  {resultJob&&!finding.work_result&&!decodeActionResult(finding.verification_note||'').work_result&&<p className="linked-work-notice">นำผลที่บันทึกใน TPM มาให้แล้ว ตรวจสอบผลและกรอกผลตรวจยืนยันเพื่อปิดงานได้เลย</p>}
  {closed?<dl className="followup-closed-result"><dt>สิ่งที่ทำจริง</dt><dd>{form.work_result||'—'}</dd><dt>ผลตรวจยืนยัน</dt><dd>{form.verification_note||'—'}</dd><dt>อะไหล่ที่ใช้</dt><dd>{form.parts_used||'—'}</dd></dl>:<>
   <p className="followup-mode-help">{closeMode?'กรอกผลที่ทำและผลตรวจยืนยัน แล้วกดปิดงานได้เลย':'เลือกสถานะและคนรับผิดชอบ จากนั้นบันทึกความคืบหน้า'}</p>
   <div className="form-grid followup-simple-fields">
    {!closeMode&&<label>สถานะงาน<SelectMenu value={form.status} onChange={status=>setForm({...form,status,spare_required:status==='waiting_spare'?true:form.spare_required,need_machine_stop:status==='waiting_machine_stop'?true:form.need_machine_stop})} options={[{value:'open',label:'รอแก้ไข'},{value:'in_progress',label:'กำลังแก้ไข'},{value:'waiting_spare',label:'รออะไหล่'},{value:'waiting_machine_stop',label:'รอหยุดเครื่อง'},{value:'verification',label:'รอตรวจยืนยัน'},...(form.status==='ready'?[{value:'ready',label:'พร้อมแก้ไข'}]:[])]}/></label>}
    <label>ผู้รับผิดชอบ<SelectMenu searchable value={form.owner_profile_id||''} onChange={owner_profile_id=>setForm({...form,owner_profile_id})} options={[{value:'',label:'เลือกผู้รับผิดชอบ'},...(technicians||[]).map(t=>({value:t.id,label:t.full_name||t.employee_code,sub:t.employee_code||''}))]}/></label>
    {!closeMode&&<><label className="span-2">งานที่จะทำ<textarea rows="2" value={form.permanent_action||''} onChange={e=>setForm({...form,permanent_action:e.target.value})} placeholder="เช่น เปลี่ยนสายลมที่รั่ว แล้วตรวจข้อต่อ"/></label><label>กำหนดเสร็จ<input type="date" value={form.target_date||''} onChange={e=>setForm({...form,target_date:e.target.value})}/></label></>}
   </div>
   {(closeMode||form.status==='verification')?<div className="followup-close-fields"><label>สิ่งที่ทำจริง / ผลหลังทำ<textarea rows="3" value={form.work_result||''} onChange={e=>setForm({...form,work_result:e.target.value})} placeholder="เช่น เปลี่ยนสายลม 2 เมตร และตรวจข้อต่อแล้ว"/></label><label>ผลตรวจยืนยัน<textarea rows="2" value={form.verification_note||''} onChange={e=>setForm({...form,verification_note:e.target.value})} placeholder="เช่น ทดลองเดินเครื่องแล้ว ไม่พบลมรั่วซ้ำ"/></label><label>อะไหล่ที่ใช้ (ถ้ามี)<input value={form.parts_used||''} onChange={e=>setForm({...form,parts_used:e.target.value})}/></label></div>:<details className="followup-extra" open={!!form.work_result||undefined}><summary>บันทึกสิ่งที่ทำแล้ว (ถ้ามี)</summary><label>สิ่งที่ทำจริง / ผลหลังทำ<textarea rows="3" value={form.work_result||''} onChange={e=>setForm({...form,work_result:e.target.value})}/></label></details>}
   <details className="followup-extra"><summary>รายละเอียดเพิ่มเติม (ถ้ามี)</summary>{closeMode&&<label>งานที่จะทำ<textarea rows="2" value={form.permanent_action||''} onChange={e=>setForm({...form,permanent_action:e.target.value})}/></label>}<div className="followup-checkboxes"><label><input type="checkbox" checked={!!form.spare_required} onChange={e=>setForm({...form,spare_required:e.target.checked})}/>ต้องใช้อะไหล่</label><label><input type="checkbox" checked={!!form.need_machine_stop} onChange={e=>setForm({...form,need_machine_stop:e.target.checked})}/>ต้องหยุดเครื่อง</label></div><label>วิธีควบคุมชั่วคราว<textarea rows="2" value={form.temporary_action||''} onChange={e=>setForm({...form,temporary_action:e.target.value})}/></label></details>
  </>}
  </div>
 </Modal>
}
