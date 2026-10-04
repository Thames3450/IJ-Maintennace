import {inspectionThai} from '../lib/inspectionThai.js'
import PhotoActions from '../components/PhotoActions.jsx'
import React,{useEffect,useMemo,useState} from 'react'
import { Plus, AlertTriangle, CheckCircle2, Eye, Save, Camera, Trash2 } from '../icons.jsx'
import { Badge, Button, Empty, Modal, PageIntro, PriorityGuide, SelectMenu, FormError } from '../components/UI.jsx'
import { fmtDateTime, shortStatusLabel } from '../lib/utils.js'

import InspectionDetailModal from '../components/InspectionDetailModal.jsx'
import {FALLBACK_TEMPLATE,FALLBACK_ITEMS,inspectionRows} from '../lib/inspectionChecklist.js'

const PHOTO_LIMIT = 3

export default function Inspection({machines,inspections,templates,templateItems,onSaveInspection,onOpenMachine}){
  const [open,setOpen]=useState(false),[machine,setMachine]=useState(''),[template,setTemplate]=useState(''),[rows,setRows]=useState([]),[note,setNote]=useState(''),[saving,setSaving]=useState(false),[error,setError]=useState(''),[detail,setDetail]=useState(null),[startedAt,setStartedAt]=useState('')
  const activeTemplates=useMemo(()=>[...templates.filter(t=>t.is_active!==false&&templateItems.some(i=>i.template_id===t.id&&i.is_active!==false)),FALLBACK_TEMPLATE],[templates,templateItems])

  const cleanupPhotoUrls=(targetRows=[])=>{
    targetRows.forEach(r=>(r.photos||[]).forEach(p=>p?.preview&&URL.revokeObjectURL(p.preview)))
  }
  const closeModal=()=>{
    cleanupPhotoUrls(rows)
    if(saving)return
    setError('')
    setOpen(false)
    setMachine('')
    setNote('')
    setRows([])
  }

  useEffect(()=>{
    if(!open)return
    const chosen=activeTemplates.find(t=>t.id===template)||activeTemplates[0]
    if(template!==chosen.id){setTemplate(chosen.id);return}
    cleanupPhotoUrls(rows)
    const list=template===FALLBACK_TEMPLATE.id?FALLBACK_ITEMS:templateItems.filter(x=>x.template_id===template&&x.is_active!==false).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0))
    setRows(inspectionRows(list));setError('')
  },[open,template])
  const startInspection=()=>{setStartedAt(new Date().toISOString());setTemplate(activeTemplates[0].id);setError('');setOpen(true)}
  const changeTemplate=value=>{
    if(value===template)return
    if(rows.some(r=>r.result_status||(r.photos||[]).length)&&!window.confirm('เปลี่ยนรายการตรวจจะล้างผลที่กรอกในรอบนี้ ต้องการเปลี่ยนหรือไม่?'))return
    setTemplate(value)
  }

  const stats=useMemo(()=>({normal:inspections.filter(i=>i.overall_status==='normal'||i.overall_status==='completed').length,watch:inspections.filter(i=>i.overall_status==='watch').length,abnormal:inspections.filter(i=>i.overall_status==='abnormal').length}),[inspections])
  const update=(idx,patch)=>setRows(rs=>rs.map((r,i)=>i===idx?{...r,...patch}:r))

  const appendPhotos=(idx,fileList)=>{
    const files=Array.from(fileList||[]).filter(f=>f.type?.startsWith('image/'))
    if(!files.length)return
    if(files.some(f=>f.size>10*1024*1024)){setError('รูปต้องมีขนาดไม่เกิน 10 MB ต่อรูป');return}
    setRows(rs=>rs.map((r,i)=>{
      if(i!==idx)return r
      const current=r.photos||[]
      const slots=Math.max(0,PHOTO_LIMIT-current.length)
      const next=files.slice(0,slots).map(file=>({
        id:`${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
        file,
        name:file.name,
        preview:URL.createObjectURL(file),
        size:file.size,
        type:file.type
      }))
      return {...r,photos:[...current,...next]}
    }))
  }

  const removePhoto=(idx,photoId)=>{
    setRows(rs=>rs.map((r,i)=>{
      if(i!==idx)return r
      const target=(r.photos||[]).find(p=>p.id===photoId)
      if(target?.preview)URL.revokeObjectURL(target.preview)
      return {...r,photos:(r.photos||[]).filter(p=>p.id!==photoId)}
    }))
  }

  const submit=async()=>{
    if(saving)return
    setError('')
    if(!machine)return setError('กรุณาเลือกเครื่องที่จะตรวจ')
    if(!rows.length)return setError('ไม่พบรายการตรวจ กรุณาเลือกรายการตรวจพื้นฐาน IJ')
    const pending=rows.find(r=>!r.result_status)
    if(pending)return setError(`ยังไม่ได้เลือกผลตรวจ: ${pending.item_name}`)
    if(rows.every(r=>r.result_status==='na'))return setError('ต้องมีจุดตรวจที่ตรวจจริงอย่างน้อย 1 ข้อ')
    const missingNote=rows.find(r=>['watch','abnormal'].includes(r.result_status)&&!r.note.trim())
    if(missingNote)return setError(`กรุณาระบุสิ่งที่พบ: ${missingNote.item_name}`)
    const missingValue=rows.find(r=>r.value_type==='numeric'&&r.result_status!=='na'&&(r.numeric_value===''||!Number.isFinite(Number(r.numeric_value))))
    if(missingValue)return setError(`กรุณาระบุค่าที่วัด: ${missingValue.item_name}`)
    const outOfRange=rows.find(r=>r.value_type==='numeric'&&r.result_status==='normal'&&((r.min_value!=null&&Number(r.numeric_value)<Number(r.min_value))||(r.max_value!=null&&Number(r.numeric_value)>Number(r.max_value))))
    if(outOfRange)return setError(`ค่าที่วัดอยู่นอกเกณฑ์ กรุณาตรวจสอบและเลือกผลเฝ้าระวังหรือผิดปกติ: ${outOfRange.item_name}`)
    const missingPhoto=rows.find(r=>r.result_status==='abnormal'&&r.requires_photo_on_ng&&(r.photos||[]).length===0)
    if(missingPhoto)return setError(`ต้องแนบรูปเมื่อผิดปกติ: ${missingPhoto.item_name}`)
    setSaving(true)
    try{
      await onSaveInspection({machine_id:machine,template_id:template===FALLBACK_TEMPLATE.id?null:template,rows,note,started_at:startedAt})
      cleanupPhotoUrls(rows);setOpen(false);setMachine('');setNote('');setRows([])
    }catch(e){setError(`บันทึกไม่สำเร็จ: ${e.message||'กรุณาลองใหม่'}`)}finally{setSaving(false)}
  }


  return <>
    <PageIntro title="Condition Inspection" th="ตรวจสภาพเครื่อง" description="Online / condition-based inspection. Watch or abnormal results automatically become defects. · ผล Watch/Abnormal จะสร้าง Defect อัตโนมัติ"><Button icon={Plus} onClick={startInspection}>Start Inspection <small>เริ่มตรวจ</small></Button></PageIntro>
    <section className="summary-strip inspection-summary"><span><b>{inspections.length}</b> Inspections <small>ครั้งตรวจ</small></span><span className="good"><b>{stats.normal}</b> Normal <small>ปกติ</small></span><span className="warn"><b>{stats.watch}</b> Watch <small>เฝ้าระวัง</small></span><span className="bad"><b>{stats.abnormal}</b> Abnormal <small>ผิดปกติ</small></span></section>
    <div className="inspection-list">{inspections.length?[...inspections].sort((a,b)=>new Date(b.completed_at||b.created_at)-new Date(a.completed_at||a.created_at)).map(i=><article className="inspection-card" key={i.id}><div className={`inspection-status-icon ${i.overall_status}`}>{i.overall_status==='abnormal'?<AlertTriangle/>:<CheckCircle2/>}</div><div className="grow"><header><h3>{i.machines?.machine_no||'-'}</h3><Badge tone={i.overall_status==='abnormal'?'red':i.overall_status==='watch'?'amber':'green'}>{shortStatusLabel(i.overall_status)}</Badge></header><p>{i.note||'Condition inspection · ตรวจสภาพเครื่อง'}</p><span>{fmtDateTime(i.completed_at||i.created_at)} · {i.inspector_name_snapshot||'-'}</span></div><div className="inspection-score"><strong>{i.condition_score??'-'}%</strong><span>Condition<small>สภาพเครื่อง</small></span></div><Button size="sm" icon={Eye} onClick={()=>setDetail(i)}>ดูผลตรวจ</Button><Button size="sm" variant="ghost" icon={Eye} onClick={()=>onOpenMachine(i.machine_id)}>History <small>ประวัติ</small></Button></article>):<Empty title="No inspection yet" text="ยังไม่มี Inspection"/>}</div>
    <InspectionDetailModal inspection={detail} onClose={()=>setDetail(null)}/>
    <Modal open={open} busy={saving} onClose={closeModal} wide eyebrow="CONDITION BASED MAINTENANCE" title="Machine Condition Inspection" subtitle="ตรวจสภาพเครื่อง" footer={<><span className="muted">ตรวจแล้ว {rows.filter(r=>r.result_status).length}/{rows.length} ข้อ · เลือกผลให้ครบก่อนบันทึก</span><Button loading={saving} icon={Save} onClick={submit}>Save Inspection <small>บันทึก</small></Button></>}>
      <FormError message={error}/>
      <div className="workflow-help">เลือกเครื่อง → ตรวจทีละข้อและเลือกผล → บันทึกผลตรวจ</div>
      <div className="inspection-form-head"><label>Machine <small>เครื่องจักร</small><SelectMenu searchable value={machine} onChange={setMachine} options={[{value:'',label:'Select machine',sub:'เลือกเครื่อง'},...machines.map(m=>({value:m.id,label:m.machine_no,sub:m.machine_name||'เครื่องจักร'}))]}/></label><label>Checklist <small>รายการตรวจ</small><SelectMenu value={template} onChange={changeTemplate} options={activeTemplates.map(t=>({value:t.id,label:t.name,sub:`ทุก ${t.frequency_days||'-'} วัน · รอบการตรวจ`}))}/></label></div>
      {template===FALLBACK_TEMPLATE.id&&<details className="inspection-checklist-info"><summary>รายการตรวจพื้นฐาน IJ · 12 จุดตรวจ</summary><p>ตรวจจากภายนอกระหว่างเดินเครื่อง งานซ่อมและทดสอบระบบนิรภัยให้ทำตามขั้นตอนหยุดเครื่องที่อนุมัติ</p></details>}

      <div className="inspection-checklist">
        <div className="inspection-check-head"><span>#</span><span>Check Point <small>จุดตรวจ</small></span><span>Result <small>ผล</small></span><span>Note <small>หมายเหตุ / รูปภาพ</small></span></div>
        {rows.map((r,idx)=>{
          const showPhoto=['watch','abnormal'].includes(r.result_status)
          const photoRequired=showPhoto&&r.requires_photo_on_ng
          return <div className={`inspection-check-row state-${r.result_status}`} key={r.key||r.template_item_id||idx}>
            <span className="check-index">{idx+1}</span>
            <div>
              <b className="inspection-item-title">{inspectionThai(r.item_name)}</b>
              {r.inspection_method&&<p className="inspection-method">{inspectionThai(r.inspection_method,'method')}</p>}
              <small>ความสำคัญ {r.criticality} · {r.criticality==='A'?'วิกฤต / Critical':r.criticality==='B'?'สำคัญ / Important':'ทั่วไป / Routine'}</small>
              {photoRequired&&<small className="photo-required">Photo required when abnormal · ต้องมีรูปเมื่อผิดปกติ</small>}
            </div>
            <SelectMenu compact value={r.result_status} onChange={v=>update(idx,{result_status:v})} options={[{value:'',label:'ยังไม่ได้ตรวจ',sub:'เลือกผลหลังตรวจจริง'},{value:'normal',label:'Normal',sub:'ปกติ'},{value:'watch',label:'Watch',sub:'เฝ้าระวัง'},{value:'abnormal',label:'Abnormal',sub:'ผิดปกติ'},{value:'na',label:'N/A',sub:'ไม่เกี่ยวข้อง'}]}/>
            <div className="inspection-note-stack">
              {r.value_type==='numeric'&&<label>ค่าที่วัด ({r.unit||'-'})<input type="number" step="any" value={r.numeric_value} onChange={e=>update(idx,{numeric_value:e.target.value})}/><small>เกณฑ์ {r.min_value??'-'} ถึง {r.max_value??'-'} {r.unit}</small></label>}
              {r.value_type==='text'&&<input value={r.text_value} onChange={e=>update(idx,{text_value:e.target.value})} placeholder="ค่าหรือข้อความที่อ่านได้"/>}
              <input value={r.note} onChange={e=>update(idx,{note:e.target.value})} placeholder="Finding detail / รายละเอียดที่พบ"/>
              {showPhoto&&<div className="inspection-photo-panel">
                <div className="inspection-photo-head">
                  <span><Camera size={16}/> Photo evidence <small>แนบรูปหลักฐาน (สูงสุด {PHOTO_LIMIT} รูป)</small></span>
                  <PhotoActions disabled={(r.photos||[]).length>=PHOTO_LIMIT} onFiles={files=>appendPhotos(idx,files)}/>
                </div>
                {(r.photos||[]).length>0?<div className="inspection-photo-grid">{r.photos.map(photo=><figure key={photo.id} className="inspection-photo-thumb"><img src={photo.preview} alt={photo.name}/><button type="button" className="photo-remove-btn" onClick={()=>removePhoto(idx,photo.id)}><Trash2 size={14}/></button><figcaption>{Math.round((photo.size||0)/1024)} KB</figcaption></figure>)}</div>:<div className="inspection-photo-empty">No photo yet · ยังไม่มีรูป</div>}
              </div>}
            </div>
          </div>
        })}
      </div>
      <div className="inspection-overall-note"><label className="span-2">Overall note <small>หมายเหตุรวม</small><textarea rows="2" value={note} onChange={e=>setNote(e.target.value)} placeholder="Overall condition / สภาพรวมของเครื่อง"/></label></div>
    </Modal>
  </>
}
