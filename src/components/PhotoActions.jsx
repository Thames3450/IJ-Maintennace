import React from 'react'
import {Camera} from '../icons.jsx'
export default function PhotoActions({disabled=false,onFiles}){
 const pick=e=>{onFiles(e.target.files);e.target.value=''}
 return <div className="photo-actions"><label className={`inspection-photo-btn ${disabled?'disabled':''}`}><input aria-label="ถ่ายรูป" type="file" accept="image/*" capture="environment" disabled={disabled} onChange={pick}/><Camera size={16}/>ถ่ายรูป</label><label className={`inspection-photo-btn ${disabled?'disabled':''}`}><input aria-label="เลือกจากเครื่อง" type="file" accept="image/*" multiple disabled={disabled} onChange={pick}/>เลือกจากเครื่อง</label></div>
}
