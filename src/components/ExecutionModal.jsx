import React,{useEffect,useState} from 'react'
import { Modal,Button,SelectMenu,FormError } from './UI.jsx'
import { fmtDate } from '../lib/utils.js'

export default function ExecutionModal({job,open,onClose,onFinish}){
 const [error,setError]=useState('')
 const [saving,setSaving]=useState(false),[form,setForm]=useState({result_summary:'',actual_stop_min:0,completion_status:'completed',parts_used:'',execution_note:'',abnormal_found:false,follow_up_required:false})
 useEffect(()=>{
  if(!open)return
  const old=(job?.ij_tpm_executions||[])[0],resume=old?.completion_status==='partial'
  setError('');setForm({result_summary:resume?old.result_summary||'':'',actual_stop_min:resume?old.actual_stop_min??0:0,completion_status:'completed',parts_used:resume?old.parts_used||'':'',execution_note:resume?old.execution_note||'':'',abnormal_found:resume?!!old.abnormal_found:false,follow_up_required:false})
 },[open,job])

 if(!job)return null
 const submit=async()=>{if(saving)return;setError('');if(!form.result_summary.trim())return setError('กรุณาระบุสิ่งที่ทำจริงและผลหลังทำ');if(!Number.isFinite(Number(form.actual_stop_min))||Number(form.actual_stop_min)<0)return setError('เวลาหยุดจริงต้องเป็นตัวเลขตั้งแต่ 0 ขึ้นไป');if(form.completion_status==='partial'&&!form.execution_note.trim())return setError('กรุณาระบุงานที่ยังเหลือในหมายเหตุ');setSaving(true);try{await onFinish(job,form);onClose()}catch(e){setError(`บันทึกไม่สำเร็จ: ${e.message||'กรุณาลองใหม่'}`)}finally{setSaving(false)}}
 return <Modal busy={saving} open={open} onClose={onClose} title={`Complete Job · ${job.machines?.machine_no||''}`} subtitle="บันทึกผลและปิดงาน" eyebrow="WORK RESULT" footer={<><span className="muted">Plan date · วันที่แผน: {fmtDate(job.planned_date)}</span><div className="footer-actions"><Button disabled={saving} variant="ghost" onClick={onClose}>Cancel · ยกเลิก</Button><Button loading={saving} onClick={submit}>Save & Close · บันทึกและปิด</Button></div></>}><FormError message={error}/>
   <div className="form-grid"><label className="span-2">Work result <small>ผลการทำงาน</small><textarea rows="4" value={form.result_summary} onChange={e=>setForm({...form,result_summary:e.target.value})} placeholder="What was found and what was done / สิ่งที่พบและสิ่งที่ดำเนินการ"/></label><label>Actual stop (min) <small>เวลาหยุดจริงรวมของงานนี้</small><input type="number" min="0" value={form.actual_stop_min} onChange={e=>setForm({...form,actual_stop_min:e.target.value})}/></label><label>Completion <small>ผลการปิดงาน</small><SelectMenu value={form.completion_status} onChange={v=>setForm({...form,completion_status:v})} options={[{value:'completed',label:'Completed',sub:'เสร็จแล้ว'},{value:'partial',label:'Partial',sub:'เสร็จบางส่วน'}]}/></label><label className="span-2">Parts used <small>อะไหล่ที่ใช้</small><input value={form.parts_used} onChange={e=>setForm({...form,parts_used:e.target.value})} placeholder="If any / ถ้ามี"/></label><label className="span-2">Remaining work / Note <small>งานที่ยังเหลือ / หมายเหตุ</small><textarea rows="3" value={form.execution_note} onChange={e=>setForm({...form,execution_note:e.target.value})}/></label><label className="check-card"><input type="checkbox" checked={form.abnormal_found} onChange={e=>setForm({...form,abnormal_found:e.target.checked})}/><span><b>Abnormal found</b><small>พบความผิดปกติระหว่างงาน</small></span></label><label className="check-card"><input type="checkbox" checked={form.follow_up_required} onChange={e=>setForm({...form,follow_up_required:e.target.checked})}/><span><b>Follow-up required</b><small>ต้องติดตามต่อหลังงาน</small></span></label></div>
 </Modal>
}
