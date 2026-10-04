import React,{useEffect,useState} from 'react'
import {Modal,Button,FormError} from './UI.jsx'
import {Trash2} from '../icons.jsx'
import {RECORD_NAMES,recordTitle} from '../lib/recordDeletion.js'
import {fmtDate} from '../lib/utils.js'
export default function DeleteConfirmModal({target,onClose,onDelete}){
 const [confirmed,setConfirmed]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('')
 useEffect(()=>{setConfirmed(false);setError('')},[target])
 if(!target)return null
 const submit=async()=>{if(!confirmed||busy)return;setBusy(true);setError('');try{await onDelete(target);onClose()}catch(e){setError(`ลบไม่สำเร็จ: ${e.message||'กรุณาลองใหม่'}`)}finally{setBusy(false)}}
 const context={finding:'รายการนี้จะหายจากทะเบียนจุดผิดปกติและงานติดตาม งาน TPM ที่เชื่อมไว้ยังอยู่',inspection:'ลบเฉพาะผลตรวจครั้งนี้ งานติดตามที่เกิดจากผลตรวจยังอยู่',tpm_job:'ลบเฉพาะงาน TPM ที่แสดงด้านล่าง งานติดตามต้นทางยังอยู่',pm_standard:'รอบ PM และผล PM ที่ใช้มาตรฐานนี้ยังอยู่',repair:'ลบออกจากหน้าระบบ IJ ประวัติในระบบต้นทางยังอยู่',spare_request:'ลบออกจากหน้าระบบ IJ รายการในระบบอะไหล่ต้นทางยังอยู่'}[target.kind]
 return <Modal open busy={busy} onClose={onClose} title="ยืนยันการลบรายการ" subtitle={`${RECORD_NAMES[target.kind]} · ${target.records.length} รายการ`} footer={<><Button variant="ghost" disabled={busy} onClick={onClose}>ยกเลิก</Button><Button className="delete-confirm-button" loading={busy} disabled={!confirmed} icon={Trash2} onClick={submit}>ยืนยันลบ {target.records.length} รายการ</Button></>}>
  <div className="delete-confirm-content"><FormError message={error}/><p>ตรวจสอบรายการด้านล่างก่อนลบ รายการจะหายจากหน้าระบบ IJ โดยยังเก็บข้อมูลเดิมและรูปหลักฐานไว้</p><ul className="delete-record-list">{target.records.map(r=><li key={r.id}><strong>{r.machines?.machine_no||r.machine?.machine_no||r.machine_no_snapshot||'IJ'} · {recordTitle(r)}</strong><span>{r.planned_date?`วันที่แผน ${fmtDate(r.planned_date)}`:r.due_date?`กำหนด ${fmtDate(r.due_date)}`:r.inspection_date?`ตรวจวันที่ ${fmtDate(r.inspection_date)}`:''}</span></li>)}</ul>{context&&<p className="delete-context">{context}</p>}<label className="delete-acknowledgement"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>ฉันตรวจสอบรายการที่จะลบแล้ว</label></div>
 </Modal>
}
