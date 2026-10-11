import React,{useEffect,useRef,useState} from 'react'
import { Modal,Button,SelectMenu,FormError,Badge } from './UI.jsx'
import { fmtDate } from '../lib/utils.js'
import PhotoActions from './PhotoActions.jsx'
import PhotoAttachment from './PhotoAttachment.jsx'
import PhotoRemoveButton from './PhotoRemoveButton.jsx'

const PHOTO_LIMIT=12
const MAX_FILE_MB=10
const PHOTO_TYPES=[
 {value:'before',label:'Before',sub:'ก่อนทำ'},
 {value:'after',label:'After',sub:'หลังทำ'},
 {value:'additional',label:'Additional',sub:'รูปเพิ่มเติม'}
]
const typeLabel=t=>PHOTO_TYPES.find(x=>x.value===t)?.label||'Additional'

export default function ExecutionModal({job,open,onClose,onFinish,linkedFinding,otherOpenJobs=0,editOnly=false}){
 const attempt=useRef(null)
 const [error,setError]=useState('')
 const [saving,setSaving]=useState(false)
 const [photoType,setPhotoType]=useState('after')
 const [newPhotos,setNewPhotos]=useState([])
 const [deletedPhotoIds,setDeletedPhotoIds]=useState([])
 const [form,setForm]=useState({result_summary:'',actual_stop_min:0,completion_status:'completed',parts_used:'',execution_note:'',abnormal_found:false,follow_up_required:false,verification_note:'',close_linked_finding:true})
 const cleanup=photos=>photos.forEach(p=>p?.preview&&URL.revokeObjectURL(p.preview))

 useEffect(()=>{
  if(!open)return
  setNewPhotos(cur=>{cleanup(cur);return []});setDeletedPhotoIds([]);setPhotoType(editOnly?'additional':'after')
  const old=(job?.ij_tpm_executions||[])[0]
  attempt.current=crypto.randomUUID()
  setError('')
  setForm({
   result_summary:old?.result_summary||'',
   actual_stop_min:old?.actual_stop_min??0,
   completion_status:old?.completion_status||'completed',
   parts_used:old?.parts_used||'',
   execution_note:old?.execution_note||'',
   abnormal_found:!!old?.abnormal_found,
   follow_up_required:!!old?.follow_up_required,
   verification_note:old?.verification_note||'',
   close_linked_finding:true
  })
 },[open,job,editOnly])

 if(!job)return null
 const existingPhotos=(job.tpm_attachments||[]).filter(p=>!deletedPhotoIds.includes(p.id))
 const totalPhotos=existingPhotos.length+newPhotos.length
 const linkedOpen=linkedFinding&&linkedFinding.status!=='closed'
 const canClose=!editOnly&&linkedOpen&&form.completion_status==='completed'&&!form.follow_up_required&&!otherOpenJobs
 const close=()=>{if(saving)return;cleanup(newPhotos);onClose()}
 const addPhotos=fileList=>{
  const files=Array.from(fileList||[]).filter(f=>f.type?.startsWith('image/'))
  if(!files.length)return
  const oversize=files.find(f=>f.size>MAX_FILE_MB*1024*1024)
  if(oversize)return setError(`รูป ${oversize.name} มีขนาดเกิน ${MAX_FILE_MB} MB`)
  const slots=Math.max(0,PHOTO_LIMIT-totalPhotos)
  if(!slots)return setError(`แนบได้สูงสุด ${PHOTO_LIMIT} รูปต่อ 1 งาน TPM`)
  const added=files.slice(0,slots).map(file=>({id:`new_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,file,name:file.name,preview:URL.createObjectURL(file),size:file.size,type:file.type,photo_type:photoType}))
  setNewPhotos(cur=>[...cur,...added])
 }
 const removeNew=id=>setNewPhotos(cur=>{const target=cur.find(p=>p.id===id);if(target?.preview)URL.revokeObjectURL(target.preview);return cur.filter(p=>p.id!==id)})
 const removeExisting=id=>setDeletedPhotoIds(cur=>cur.includes(id)?cur:[...cur,id])
 const submit=async()=>{
  if(saving)return
  setError('')
  if(!form.result_summary.trim())return setError('กรุณาระบุสิ่งที่ทำจริงและผลหลังทำ')
  if(!Number.isInteger(Number(form.actual_stop_min))||Number(form.actual_stop_min)<0)return setError('เวลาหยุดจริงต้องเป็นจำนวนนาทีตั้งแต่ 0 ขึ้นไป')
  if(!editOnly&&form.completion_status==='partial'&&!form.execution_note.trim())return setError('กรุณาระบุงานที่ยังเหลือในหมายเหตุ')
  if(canClose&&form.close_linked_finding&&!form.verification_note?.trim())return setError('กรุณาระบุผลตรวจยืนยัน เพื่อปิดงานติดตามพร้อม TPM')
  setSaving(true)
  try{
   await onFinish(job,{...form,attempt_id:attempt.current,new_photos:newPhotos,deleted_photo_ids:deletedPhotoIds})
   cleanup(newPhotos);onClose()
  }catch(e){setError(`บันทึกไม่สำเร็จ: ${e.message||'กรุณาลองใหม่'}`)}finally{setSaving(false)}
 }

 return <Modal busy={saving} open={open} onClose={close} title={`${editOnly?'Edit TPM Result':'Complete Job'} · ${job.machines?.machine_no||''}`} subtitle={editOnly?'แก้ไขผลการทำงานและเพิ่มรูปภาพในรายการนี้':'บันทึกผลและปิดงาน'} eyebrow={editOnly?'EDIT WORK RESULT':'WORK RESULT'} footer={<><span className="muted">Plan date · วันที่แผน: {fmtDate(job.planned_date)}</span><div className="footer-actions"><Button disabled={saving} variant="ghost" onClick={close}><span className="button-bi">ยกเลิก<small>Cancel</small></span></Button><Button loading={saving} onClick={submit}><span className="button-bi">{editOnly?'บันทึกการแก้ไข':'บันทึกและปิดงาน'}<small>{editOnly?'Save Changes':'Save & Close'}</small></span></Button></div></>}>
  <FormError message={error}/>
  {editOnly&&<div className="tpm-edit-notice"><b>Edit Result / แก้ไขผล TPM</b><span>แก้ผลการทำงาน เวลา อะไหล่ หมายเหตุ และเพิ่ม/ลบรูปได้ โดยไม่เปลี่ยนสถานะงานที่ปิดแล้ว</span></div>}
  {!editOnly&&linkedOpen&&<section className="linked-closeout"><strong>งานติดตามที่เชื่อมไว้</strong><p>{linkedFinding.finding}</p>{canClose?<><label className="linked-close-choice"><input type="checkbox" checked={!!form.close_linked_finding} onChange={e=>setForm({...form,close_linked_finding:e.target.checked})}/>ปิดงานติดตามพร้อม TPM</label>{form.close_linked_finding?<label>ผลตรวจยืนยันหลังแก้ไข<textarea rows="2" value={form.verification_note||''} onChange={e=>setForm({...form,verification_note:e.target.value})} placeholder="เช่น ทดลองเดินเครื่องแล้ว ไม่พบลมรั่วซ้ำ"/></label>:<small>ส่งผลแก้ไขกลับไปที่งานติดตาม และรอตรวจยืนยัน</small>}</>:<small>{otherOpenJobs?`ยังมี TPM ที่เชื่อมไว้ ${otherOpenJobs} งาน ให้ทำให้ครบก่อนปิดงานติดตาม`:'ผลจะส่งกลับไปที่งานติดตาม โดยยังเปิดไว้ให้ทำต่อ'}</small>}</section>}
  <div className="form-grid">
   <label className="span-2">Work result <small>ผลการทำงาน</small><textarea rows="4" value={form.result_summary} onChange={e=>setForm({...form,result_summary:e.target.value})} placeholder="What was found and what was done / สิ่งที่พบและสิ่งที่ดำเนินการ"/></label>
   <label>Actual stop (min) <small>เวลาหยุดจริงรวมของงานนี้</small><input type="number" min="0" value={form.actual_stop_min} onChange={e=>setForm({...form,actual_stop_min:e.target.value})}/></label>
   {editOnly?<label>Completion <small>สถานะงาน</small><div className="readonly-status-box"><Badge tone={job.job_status==='completed'?'green':'amber'}>{job.job_status==='completed'?'Completed · เสร็จแล้ว':'Partial · ทำบางส่วน'}</Badge></div></label>:<label>Completion <small>ผลการปิดงาน</small><SelectMenu value={form.completion_status} onChange={v=>setForm({...form,completion_status:v})} options={[{value:'completed',label:'Completed',sub:'เสร็จแล้ว'},{value:'partial',label:'Partial',sub:'เสร็จบางส่วน'}]}/></label>}
   <label className="span-2">Parts used <small>อะไหล่ที่ใช้</small><input value={form.parts_used} onChange={e=>setForm({...form,parts_used:e.target.value})} placeholder="If any / ถ้ามี"/></label>
   <label className="span-2">Remaining work / Note <small>งานที่ยังเหลือ / หมายเหตุ</small><textarea rows="3" value={form.execution_note} onChange={e=>setForm({...form,execution_note:e.target.value})}/></label>
   <label className="check-card"><input type="checkbox" checked={form.abnormal_found} onChange={e=>setForm({...form,abnormal_found:e.target.checked})}/><span><b>Abnormal found</b><small>พบความผิดปกติระหว่างงาน</small></span></label>
   <label className="check-card"><input type="checkbox" checked={form.follow_up_required} onChange={e=>setForm({...form,follow_up_required:e.target.checked})}/><span><b>Follow-up required</b><small>ต้องติดตามต่อหลังงาน</small></span></label>
   <section className="span-2 tpm-photo-editor">
    <header><div><b>TPM Photos</b><small>รูปภาพของงานนี้ · เพิ่มภายหลังได้แม้งานเสร็จแล้ว</small></div><span>{totalPhotos}/{PHOTO_LIMIT}</span></header>
    <div className="tpm-photo-toolbar"><div className="tpm-photo-type"><SelectMenu value={photoType} onChange={setPhotoType} options={PHOTO_TYPES}/></div><PhotoActions disabled={totalPhotos>=PHOTO_LIMIT} onFiles={addPhotos}/></div>
    {totalPhotos?<div className="tpm-photo-grid">
      {existingPhotos.map(p=><figure key={p.id} className="tpm-photo-item"><div className="tpm-photo-kind">{typeLabel(p.photo_type)}</div><PhotoAttachment photo={p} defaultBucket="ij-tpm-photos"/><PhotoRemoveButton name={p.file_name} disabled={saving} onRemove={()=>removeExisting(p.id)}/><figcaption>{p.file_name||'TPM photo'}</figcaption></figure>)}
      {newPhotos.map(p=><figure key={p.id} className="tpm-photo-item pending"><div className="tpm-photo-kind">{typeLabel(p.photo_type)}</div><img src={p.preview} alt={p.name}/><PhotoRemoveButton name={p.name} disabled={saving} onRemove={()=>removeNew(p.id)}/><figcaption>{p.name}<small>รอบันทึก</small></figcaption></figure>)}
    </div>:<div className="inspection-photo-empty">No TPM photo attached · ยังไม่มีรูปภาพในรายการนี้</div>}
   </section>
  </div>
 </Modal>
}
