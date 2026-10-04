import {inspectionThai} from '../lib/inspectionThai.js'
import React,{useEffect,useState} from 'react'
import {Modal,Badge,FormError,Skeleton,Empty} from './UI.jsx'
import {supabase} from '../lib/supabase.js'
import {readPaged} from '../lib/readPaged.js'
import {resolvePhotoUrls} from '../lib/photoUrls.js'
import PhotoAttachment from './PhotoAttachment.jsx'
import {fmtDateTime,statusLabel} from '../lib/utils.js'

export default function InspectionDetailModal({inspection,onClose}){
 const [rows,setRows]=useState([]),[photos,setPhotos]=useState([]),[loading,setLoading]=useState(false),[error,setError]=useState(''),[retry,setRetry]=useState(0)
 useEffect(()=>{
  let cancelled=false
  if(!inspection)return
  setRows([]);setPhotos([]);setError('');setLoading(true)
  ;(async()=>{
   try{
    const [results,attachments]=await Promise.all([
     readPaged(supabase.from('ij_condition_results').select('*').eq('inspection_id',inspection.id).order('created_at').order('id'),1000),
     readPaged(supabase.from('ij_condition_result_attachments').select('*').eq('inspection_id',inspection.id).order('created_at').order('id'),1000)
    ])
    if(results.error)throw results.error
    if(cancelled)return
    setRows(results.data||[])
    if(attachments.error){setError('โหลดรูปประกอบไม่สำเร็จ');return}
    const resolved=await resolvePhotoUrls(supabase,attachments.data||[])
    if(cancelled)return
    setPhotos(resolved)
    if(results.capped||attachments.capped)setError('รายการมีจำนวนมาก แสดงได้สูงสุด 1,000 รายการ')
   }catch(e){if(!cancelled)setError(`โหลดผลตรวจไม่สำเร็จ: ${e.message}`)}finally{if(!cancelled)setLoading(false)}
  })()
  return()=>{cancelled=true}
 },[inspection?.id,retry])
 if(!inspection)return null
 return <Modal open onClose={onClose} wide title={`ผลตรวจ · ${inspection.machines?.machine_no||''}`} subtitle={`${fmtDateTime(inspection.completed_at||inspection.created_at)} · ${inspection.inspector_name_snapshot||'-'}`}>
  <FormError message={error}/>
  {error&&!loading&&<button type="button" className="btn btn-outline" onClick={()=>setRetry(x=>x+1)}>ลองโหลดข้อมูลใหม่</button>}
  {loading?<Skeleton rows={4}/>:rows.length?<div className="inspection-result-list">{rows.map((r,i)=><article key={r.id}>
   <header><b>{i+1}. {inspectionThai(r.item_name_snapshot)}</b><Badge tone={r.result_status==='abnormal'?'red':r.result_status==='watch'?'amber':r.result_status==='na'?'neutral':'green'}>{statusLabel(r.result_status)}</Badge></header>
   {r.numeric_value!=null&&<p>ค่าที่วัด: {r.numeric_value} {r.unit||''}</p>}{r.text_value&&<p>{r.text_value}</p>}{r.note&&<p>สิ่งที่พบ: {r.note}</p>}
   <div className="defect-photo-gallery">{photos.filter(p=>p.result_id===r.id).map(p=><PhotoAttachment key={p.id} photo={p}/>)}</div>
  </article>)}</div>:<Empty title="ไม่มีรายละเอียดผลตรวจ" text="ตรวจสอบว่ารอบนี้มีผลตรวจบันทึกครบหรือไม่"/>}
  {inspection.note&&<div className="workflow-help">หมายเหตุรวม: {inspection.note}</div>}
 </Modal>
}
