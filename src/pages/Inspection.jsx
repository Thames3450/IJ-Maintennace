import React,{useEffect,useMemo,useState} from 'react'
import { Plus, AlertTriangle, CheckCircle2, Eye, Save, Camera, Trash2 } from '../icons.jsx'
import { Badge, Button, Empty, Modal, PageIntro, PriorityGuide, SelectMenu } from '../components/UI.jsx'
import { fmtDateTime, shortStatusLabel } from '../lib/utils.js'

const PHOTO_LIMIT = 3

export default function Inspection({machines,inspections,templates,templateItems,onSaveInspection,onOpenMachine}){
  const [open,setOpen]=useState(false),[machine,setMachine]=useState(''),[template,setTemplate]=useState(''),[rows,setRows]=useState([]),[note,setNote]=useState(''),[saving,setSaving]=useState(false)
  const activeTemplates=templates.filter(t=>t.is_active!==false)

  const cleanupPhotoUrls=(targetRows=[])=>{
    targetRows.forEach(r=>(r.photos||[]).forEach(p=>p?.preview&&URL.revokeObjectURL(p.preview)))
  }
  const closeModal=()=>{
    cleanupPhotoUrls(rows)
    setOpen(false)
    setMachine('')
    setNote('')
    setRows([])
  }

  useEffect(()=>{if(open&&!template&&activeTemplates[0])setTemplate(activeTemplates[0].id)},[open,template,activeTemplates])
  useEffect(()=>{
    if(!open)return
    cleanupPhotoUrls(rows)
    const list=templateItems.filter(x=>x.template_id===template&&x.is_active!==false).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0))
    setRows(list.map(x=>({
      template_item_id:x.id,
      item_name:x.item_name,
      zone_code:x.zone_code||null,
      component_code:x.component_code||null,
      result_status:'normal',
      numeric_value:'',
      text_value:'',
      unit:x.unit||'',
      note:'',
      criticality:x.criticality||'B',
      requires_photo_on_ng:!!x.requires_photo_on_ng,
      photos:[]
    })))
  },[open,template,templateItems])

  const stats=useMemo(()=>({normal:inspections.filter(i=>i.overall_status==='normal'||i.overall_status==='completed').length,watch:inspections.filter(i=>i.overall_status==='watch').length,abnormal:inspections.filter(i=>i.overall_status==='abnormal').length}),[inspections])
  const update=(idx,patch)=>setRows(rs=>rs.map((r,i)=>i===idx?{...r,...patch}:r))

  const appendPhotos=(idx,fileList)=>{
    const files=Array.from(fileList||[]).filter(f=>f.type?.startsWith('image/'))
    if(!files.length)return
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
    if(!machine)return alert('Select machine / กรุณาเลือกเครื่อง')
    if(!rows.length)return alert('Checklist not found / ไม่พบ Checklist')
    const missingPhoto=rows.find(r=>r.result_status==='abnormal'&&r.requires_photo_on_ng&&(r.photos||[]).length===0)
    if(missingPhoto)return alert(`Photo required for abnormal item: ${missingPhoto.item_name} / ต้องแนบรูปเมื่อผิดปกติ`)
    setSaving(true)
    try{
      await onSaveInspection({machine_id:machine,template_id:template,rows,note})
      closeModal()
    }finally{setSaving(false)}
  }

  return <>
    <PageIntro title="Condition Inspection" th="ตรวจสภาพเครื่อง" description="Online / condition-based inspection. Watch or abnormal results automatically become defects. · ผล Watch/Abnormal จะสร้าง Defect อัตโนมัติ"><Button icon={Plus} onClick={()=>setOpen(true)}>Start Inspection <small>เริ่มตรวจ</small></Button></PageIntro>
    <section className="summary-strip inspection-summary"><span><b>{inspections.length}</b> Inspections <small>ครั้งตรวจ</small></span><span className="good"><b>{stats.normal}</b> Normal <small>ปกติ</small></span><span className="warn"><b>{stats.watch}</b> Watch <small>เฝ้าระวัง</small></span><span className="bad"><b>{stats.abnormal}</b> Abnormal <small>ผิดปกติ</small></span></section>
    <div className="inspection-list">{inspections.length?[...inspections].sort((a,b)=>new Date(b.completed_at||b.created_at)-new Date(a.completed_at||a.created_at)).map(i=><article className="inspection-card" key={i.id}><div className={`inspection-status-icon ${i.overall_status}`}>{i.overall_status==='abnormal'?<AlertTriangle/>:<CheckCircle2/>}</div><div className="grow"><header><h3>{i.machines?.machine_no||'-'}</h3><Badge tone={i.overall_status==='abnormal'?'red':i.overall_status==='watch'?'amber':'green'}>{shortStatusLabel(i.overall_status)}</Badge></header><p>{i.note||'Condition inspection · ตรวจสภาพเครื่อง'}</p><span>{fmtDateTime(i.completed_at||i.created_at)} · {i.inspector_name_snapshot||'-'}</span></div><div className="inspection-score"><strong>{i.condition_score??'-'}%</strong><span>Condition<small>สภาพเครื่อง</small></span></div><Button size="sm" variant="ghost" icon={Eye} onClick={()=>onOpenMachine(i.machine_id)}>History <small>ประวัติ</small></Button></article>):<Empty title="No inspection yet" text="ยังไม่มี Inspection"/>}</div>
    <Modal open={open} onClose={closeModal} wide eyebrow="CONDITION BASED MAINTENANCE" title="Machine Condition Inspection" subtitle="ตรวจสภาพเครื่อง" footer={<><span className="muted">Watch / Abnormal → Defect Follow-up automatically · ระบบจะสร้าง Defect อัตโนมัติ</span><Button loading={saving} icon={Save} onClick={submit}>Save Inspection <small>บันทึก</small></Button></>}>
      <div className="inspection-form-head"><label>Machine <small>เครื่องจักร</small><SelectMenu searchable value={machine} onChange={setMachine} options={[{value:'',label:'Select machine',sub:'เลือกเครื่อง'},...machines.map(m=>({value:m.id,label:m.machine_no,sub:m.machine_name||'เครื่องจักร'}))]}/></label><label>Checklist <small>รายการตรวจ</small><SelectMenu value={template} onChange={setTemplate} options={activeTemplates.map(t=>({value:t.id,label:t.name,sub:`Every ${t.frequency_days||'-'} days · รอบการตรวจ`}))}/></label><label className="span-2">Overall note <small>หมายเหตุรวม</small><textarea rows="2" value={note} onChange={e=>setNote(e.target.value)} placeholder="Overall condition / สภาพรวมของเครื่อง"/></label></div>
      <PriorityGuide title="Inspection Criticality / ระดับความสำคัญของจุดตรวจ"/>
      <div className="inspection-checklist">
        <div className="inspection-check-head"><span>#</span><span>Check Point <small>จุดตรวจ</small></span><span>Result <small>ผล</small></span><span>Note <small>หมายเหตุ / รูปภาพ</small></span></div>
        {rows.map((r,idx)=>{
          const showPhoto=r.result_status==='abnormal'
          const photoRequired=showPhoto&&r.requires_photo_on_ng
          return <div className={`inspection-check-row state-${r.result_status}`} key={r.template_item_id||idx}>
            <span className="check-index">{idx+1}</span>
            <div>
              <b>{r.item_name}</b>
              <small>Criticality {r.criticality} · {r.criticality==='A'?'Critical / วิกฤต':r.criticality==='B'?'Important / สำคัญ':'Routine / ทั่วไป'}</small>
              {photoRequired&&<small className="photo-required">Photo required when abnormal · ต้องมีรูปเมื่อผิดปกติ</small>}
            </div>
            <SelectMenu compact value={r.result_status} onChange={v=>update(idx,{result_status:v})} options={[{value:'normal',label:'Normal',sub:'ปกติ'},{value:'watch',label:'Watch',sub:'เฝ้าระวัง'},{value:'abnormal',label:'Abnormal',sub:'ผิดปกติ'},{value:'na',label:'N/A',sub:'ไม่เกี่ยวข้อง'}]}/>
            <div className="inspection-note-stack">
              <input value={r.note} onChange={e=>update(idx,{note:e.target.value})} placeholder="Finding detail / รายละเอียดที่พบ"/>
              {showPhoto&&<div className="inspection-photo-panel">
                <div className="inspection-photo-head">
                  <span><Camera size={16}/> Photo evidence <small>แนบรูปหลักฐาน (สูงสุด {PHOTO_LIMIT} รูป)</small></span>
                  <label className={`inspection-photo-btn ${(r.photos||[]).length>=PHOTO_LIMIT?'disabled':''}`}>
                    <input type="file" accept="image/*" capture="environment" multiple onChange={e=>{appendPhotos(idx,e.target.files);e.target.value=''}} disabled={(r.photos||[]).length>=PHOTO_LIMIT}/>
                    <Camera size={14}/>
                    {(r.photos||[]).length?'Add / Change':'Take / Upload'} <small>ถ่ายหรือแนบรูป</small>
                  </label>
                </div>
                {(r.photos||[]).length>0?<div className="inspection-photo-grid">{r.photos.map(photo=><figure key={photo.id} className="inspection-photo-thumb"><img src={photo.preview} alt={photo.name}/><button type="button" className="photo-remove-btn" onClick={()=>removePhoto(idx,photo.id)}><Trash2 size={14}/></button><figcaption>{Math.round((photo.size||0)/1024)} KB</figcaption></figure>)}</div>:<div className="inspection-photo-empty">No photo yet · ยังไม่มีรูป</div>}
              </div>}
            </div>
          </div>
        })}
      </div>
    </Modal>
  </>
}
