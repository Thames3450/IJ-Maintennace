import React,{useEffect,useRef,useState} from 'react'
import {supabase} from '../lib/supabase.js'
import {resolvePhotoUrls} from '../lib/photoUrls.js'
import './PhotoAttachment.css'

export default function PhotoAttachment({photo,defaultBucket='ij-inspection-photos'}){
 const [url,setUrl]=useState(photo.signed_url||''),[error,setError]=useState(photo.photo_error||''),[loading,setLoading]=useState(false),[attempt,setAttempt]=useState(0)
 const sequence=useRef(0),autoRetried=useRef(false),busy=useRef(false)
 const name=photo.file_name||'รูปประกอบ'
 useEffect(()=>{
  sequence.current++;autoRetried.current=false;busy.current=false
  setUrl(photo.signed_url||'');setError(photo.photo_error||'');setLoading(false);setAttempt(0)
  return()=>{sequence.current++}
 },[photo.id,photo.storage_bucket,photo.storage_path,photo.signed_url,photo.photo_error])
 const reload=async()=>{
  if(busy.current)return
  busy.current=true;setLoading(true);setError('')
  const current=++sequence.current
  try{
   const [resolved]=await resolvePhotoUrls(supabase,[photo],{defaultBucket})
   if(current!==sequence.current)return
   setUrl(resolved.signed_url||'');setError(resolved.photo_error||'');setAttempt(x=>x+1)
  }catch{
   if(current===sequence.current){setUrl('');setError('โหลดรูปไม่สำเร็จ กรุณาลองใหม่')}
  }finally{if(current===sequence.current){busy.current=false;setLoading(false)}}
 }
 const imageFailed=()=>{
  if(!autoRetried.current){autoRetried.current=true;reload()}
  else{setUrl('');setError('โหลดรูปไม่สำเร็จ กรุณาลองใหม่')}
 }
 return <div className="attachment-photo">
  {url&&!error&&!loading?<a href={url} target="_blank" rel="noreferrer" aria-label={`เปิดรูป ${name}`}><img key={attempt} src={url} alt={name} loading="lazy" onError={imageFailed}/></a>:<div className="photo-load-fallback">
   <small>{name}</small>
   <span role={loading?'status':undefined}>{loading?'กำลังโหลดรูป…':error||'ยังโหลดรูปไม่สำเร็จ'}</span>
   {!loading&&<button type="button" className="btn btn-outline photo-retry" aria-label={`ลองโหลดรูปใหม่ ${name}`} onClick={()=>{autoRetried.current=true;reload()}}>ลองโหลดรูปใหม่</button>}
  </div>}
 </div>
}
