import React,{useEffect,useState} from 'react'
import {supabase} from '../lib/supabase.js'
import {Badge,Button,Empty,FormError,PageIntro,SelectMenu} from '../components/UI.jsx'
import {CheckCircle2,RefreshCcw,UserRound} from '../icons.jsx'

const ROLES=[
 {value:'engineer',label:'Engineer / Admin',sub:'วิศวกร / แอดมิน'},
 {value:'technician',label:'Technician',sub:'ช่าง'},
 {value:'manager',label:'Manager',sub:'ผู้จัดการ'},
 {value:'production',label:'Production / Planning',sub:'ฝ่ายผลิต / แพลนนิ่ง'}
]
const roleName=r=>ROLES.find(x=>x.value===r)?.label||r

export default function UserManagement({profile}){
 const [requests,setRequests]=useState([]),[users,setUsers]=useState([]),[busy,setBusy]=useState(false),[error,setError]=useState('')
 const [edits,setEdits]=useState({})
 const load=async()=>{setBusy(true);setError('');try{const [rq,us]=await Promise.all([supabase.rpc('ij_access_admin_requests',{p_actor_employee_code:profile.employee_code}),supabase.rpc('ij_access_admin_users',{p_actor_employee_code:profile.employee_code})]);if(rq.error)throw rq.error;if(us.error)throw us.error;setRequests(rq.data||[]);setUsers(us.data||[]);const next={};(us.data||[]).forEach(u=>next[u.profile_id]={role:u.role,is_active:u.is_active});setEdits(next)}catch(e){setError(e.message)}finally{setBusy(false)}}
 useEffect(()=>{load()},[profile.employee_code])
 const decide=async(r,approve)=>{let note='';if(!approve){note=window.prompt('เหตุผลที่ส่งกลับ / Reject reason','')||'';if(!note.trim())return}const chosen=approve?(edits[`request-${r.id}`]?.role||r.requested_role):r.requested_role;setBusy(true);setError('');try{const {error:e}=await supabase.rpc('ij_access_admin_decide',{p_actor_employee_code:profile.employee_code,p_request_id:r.id,p_approve:approve,p_role:chosen,p_note:note||null});if(e)throw e;await load()}catch(e){setError(e.message)}finally{setBusy(false)}}
 const saveUser=async u=>{const v=edits[u.profile_id]||{role:u.role,is_active:u.is_active};setBusy(true);setError('');try{const {error:e}=await supabase.rpc('ij_access_admin_update_user',{p_actor_employee_code:profile.employee_code,p_profile_id:u.profile_id,p_role:v.role,p_is_active:v.is_active});if(e)throw e;await load()}catch(e){setError(e.message)}finally{setBusy(false)}}
 const pending=requests.filter(r=>r.status==='pending')
 return <>
  <PageIntro title="User & Access Management" th="ผู้ใช้งานและสิทธิ์" description="อนุมัติการลงทะเบียน กำหนดตำแหน่ง และเปิด/ปิดสิทธิ์ใช้งาน IJ Maintenance">
   <Button variant="ghost" icon={RefreshCcw} loading={busy} onClick={load}>Refresh <small>รีเฟรช</small></Button>
  </PageIntro>
  <FormError message={error}/>
  <section className="access-admin-summary"><article><span>Pending approval</span><small>รออนุมัติ</small><b>{pending.length}</b></article><article><span>Active users</span><small>ผู้ใช้ที่เปิดใช้งาน</small><b>{users.filter(u=>u.is_active).length}</b></article></section>
  <section className="card user-admin-section"><header><div><h3>คำขอลงทะเบียน</h3><span>Registration Requests</span></div></header>{pending.length?<div className="user-request-list">{pending.map(r=>{const key=`request-${r.id}`,role=edits[key]?.role||r.requested_role;return <article key={r.id}><div className="user-request-avatar"><UserRound/></div><div className="grow"><b>{r.full_name}</b><span>{r.employee_code}</span><small>ขอสิทธิ์ {roleName(r.requested_role)}{r.requested_position?` · ${r.requested_position}`:''}</small></div><div className="request-role"><SelectMenu value={role} onChange={v=>setEdits(s=>({...s,[key]:{role:v}}))} options={ROLES}/></div><div className="request-actions"><Button size="sm" variant="ghost" disabled={busy} onClick={()=>decide(r,false)}>ส่งกลับ</Button><Button size="sm" icon={CheckCircle2} disabled={busy} onClick={()=>decide(r,true)}>อนุมัติ</Button></div></article>})}</div>:<Empty title="No pending registration" text="ไม่มีคำขอที่รออนุมัติ"/>}</section>
  <section className="card user-admin-section"><header><div><h3>ผู้ใช้งานระบบ</h3><span>Approved Users</span></div></header><div className="user-access-table">{users.map(u=>{const v=edits[u.profile_id]||{role:u.role,is_active:u.is_active};return <article key={u.profile_id}><div className="grow"><b>{u.full_name}</b><span>{u.employee_code} · {u.position||'-'}</span><Badge tone={v.is_active?'green':'neutral'}>{v.is_active?'Active · ใช้งาน':'Disabled · ปิดสิทธิ์'}</Badge></div><SelectMenu value={v.role} onChange={role=>setEdits(s=>({...s,[u.profile_id]:{...v,role}}))} options={ROLES}/><label className="user-active-toggle"><input type="checkbox" checked={v.is_active} onChange={e=>setEdits(s=>({...s,[u.profile_id]:{...v,is_active:e.target.checked}}))}/><span>เปิดใช้งาน</span></label><Button size="sm" variant="soft" disabled={busy} onClick={()=>saveUser(u)}>บันทึก</Button></article>})}</div></section>
 </>
}
