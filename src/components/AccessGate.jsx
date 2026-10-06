import {setSessionToken} from '../lib/employeeSession.js'
import React,{useState} from 'react'
import {supabase} from '../lib/supabase.js'
import {Button,FormError,SelectMenu} from './UI.jsx'
import {CheckCircle2,LockKeyhole,UserRound,RefreshCcw} from '../icons.jsx'

const ROLES=[
  {value:'engineer',label:'Engineer / Admin',sub:'วิศวกร / แอดมิน'},
  {value:'technician',label:'Technician',sub:'ช่าง'},
  {value:'manager',label:'Manager',sub:'ผู้จัดการ'},
  {value:'production',label:'Production / Planning',sub:'ฝ่ายผลิต / แพลนนิ่ง'}
]

const firstRow=data=>Array.isArray(data)?data[0]:data

export default function AccessGate({onApproved,initialCode=''}){
  const [mode,setMode]=useState('login')
  const [code,setCode]=useState(initialCode)
  const [name,setName]=useState('')
  const [role,setRole]=useState('technician')
  const [position,setPosition]=useState('')
  const [pending,setPending]=useState(null)
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')

  const normalized=()=>code.trim().toUpperCase()
  const check=async()=>{
    const employeeCode=normalized();setError('')
    if(busy)return
    if(!/^[0-9]{4,12}$/.test(employeeCode))return setError('กรุณากรอกรหัสพนักงาน 4–12 หลัก')
    setBusy(true)
    try{
      const {data,error:loginError}=await supabase.rpc('ij_session_login',{p_employee_code:employeeCode})
      if(loginError)throw loginError
      const session=firstRow(data),profile=session?.profile
      if(profile?.id&&session.token){setSessionToken(session.token);await onApproved(profile);return}
      const {data:statusData,error:statusError}=await supabase.rpc('ij_access_request_status',{p_employee_code:employeeCode})
      if(statusError)throw statusError
      const request=firstRow(statusData)
      if(request){setPending(request);setName(request.full_name||'');setRole(request.requested_role||'technician');setMode(request.status==='pending'?'pending':'register');if(request.status==='rejected')setError(request.admin_note?`คำขอเดิมถูกส่งกลับ: ${request.admin_note}`:'คำขอเดิมถูกส่งกลับ สามารถแก้ข้อมูลและส่งใหม่ได้');return}
      setMode('register')
    }catch(e){setError(e.message||'ตรวจสอบรหัสพนักงานไม่สำเร็จ')}finally{setBusy(false)}
  }

  const register=async()=>{
    const employeeCode=normalized();setError('')
    if(!employeeCode||!name.trim())return setError('กรุณากรอกรหัสพนักงานและชื่อ-นามสกุล')
    setBusy(true)
    try{
      const {error:e}=await supabase.rpc('ij_access_register',{p_employee_code:employeeCode,p_full_name:name.trim(),p_requested_role:role,p_requested_position:position.trim()||null})
      if(e)throw e
      const {data}=await supabase.rpc('ij_access_request_status',{p_employee_code:employeeCode})
      setPending(firstRow(data)||{status:'pending',requested_role:role,full_name:name.trim()});setMode('pending')
    }catch(e){setError(e.message||'ส่งคำขอลงทะเบียนไม่สำเร็จ')}finally{setBusy(false)}
  }

  const reset=()=>{setMode('login');setPending(null);setName('');setPosition('');setError('')}

  return <div className="access-screen">
    <section className="access-card">
      <div className="access-brand"><img src="./ij-maintenance-logo.png" alt="IJ Maintenance"/><div><b>IJ Maintenance</b><span>Unified Maintenance System</span></div></div>
      {mode==='login'&&<>
        <div className="access-heading"><span className="access-icon"><LockKeyhole size={24}/></span><div><h1>เข้าสู่ระบบ</h1><p>Employee ID Login · ใช้รหัสพนักงาน</p></div></div>
        <p className="access-copy">กรอกรหัสพนักงานเพื่อเปิดหน้าระบบตามตำแหน่งของคุณ</p>
        <label className="access-field">Employee ID <small>รหัสพนักงาน</small><input autoFocus maxLength={12} disabled={busy} inputMode="numeric" autoComplete="username" value={code} onChange={e=>setCode(e.target.value)} onKeyDown={e=>e.key==='Enter'&&check()} placeholder="กรอกรหัสพนักงาน"/></label>
        <FormError message={error}/>
        <Button loading={busy} className="access-primary" icon={LockKeyhole} onClick={check}>เข้าสู่ระบบ <small>Sign in</small></Button>
        <p className="access-help">ถ้ายังไม่มีข้อมูล ระบบจะเปิดหน้าลงทะเบียนให้โดยอัตโนมัติ</p>
      </>}

      {mode==='register'&&<>
        <div className="access-heading"><span className="access-icon"><UserRound size={24}/></span><div><h1>ลงทะเบียนใช้งาน</h1><p>Registration · รอ Engineer/Admin อนุมัติ</p></div></div>
        <div className="access-code-chip">Employee ID <b>{normalized()}</b></div>
        <label className="access-field">Full name <small>ชื่อ-นามสกุล</small><input value={name} onChange={e=>setName(e.target.value)} placeholder="ชื่อ-นามสกุลจริง"/></label>
        <label className="access-field">Position / Role <small>ตำแหน่งของคุณ</small><SelectMenu value={role} onChange={setRole} options={ROLES}/></label>
        <label className="access-field">Position detail <small>ชื่อตำแหน่งเพิ่มเติม (ถ้ามี)</small><input value={position} onChange={e=>setPosition(e.target.value)} placeholder="เช่น Maintenance Engineer, Planning"/></label>
        <FormError message={error}/>
        <div className="access-actions"><Button variant="ghost" disabled={busy} onClick={reset}>กลับ</Button><Button loading={busy} icon={CheckCircle2} onClick={register}>ส่งขออนุมัติ <small>Submit</small></Button></div>
      </>}

      {mode==='pending'&&<>
        <div className="access-heading"><span className="access-icon pending"><CheckCircle2 size={25}/></span><div><h1>ส่งคำขอแล้ว</h1><p>Pending Approval · รออนุมัติสิทธิ์</p></div></div>
        <div className="pending-access-box"><b>{pending?.full_name||name}</b><span>{normalized()}</span><small>{ROLES.find(r=>r.value===(pending?.requested_role||role))?.label} · {ROLES.find(r=>r.value===(pending?.requested_role||role))?.sub}</small></div>
        <p className="access-copy">เมื่อ Engineer / Admin อนุมัติแล้ว ให้กดตรวจสอบสถานะอีกครั้ง</p>
        <FormError message={error}/>
        <Button loading={busy} className="access-primary" icon={RefreshCcw} onClick={check}>ตรวจสอบสถานะ <small>Check status</small></Button>
        <button className="access-text-button" onClick={reset}>ใช้รหัสพนักงานอื่น</button>
      </>}
      <footer className="access-footer">MPR Maintenance Database · Internal Use</footer>
    </section>
  </div>
}
