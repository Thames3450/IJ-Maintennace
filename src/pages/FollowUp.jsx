import React,{useEffect,useMemo,useState} from 'react'
import { PackageOpen, CalendarClock, Wrench, Camera, UserRound } from '../icons.jsx'
import { Button, Badge, Empty, PageIntro, SelectMenu } from '../components/UI.jsx'
import FollowUpModal from '../components/FollowUpModal.jsx'
import { fmtDate, rolePlanner, statusLabel } from '../lib/utils.js'

export default function FollowUp({profile,findings,technicians,onSaveAction,onCreateTPM,initialFinding,onConsumedInitial}){
  const [status,setStatus]=useState('active')
  const [priority,setPriority]=useState('')
  const [selected,setSelected]=useState(null)

  useEffect(()=>{
    if(!initialFinding)return
    const found=findings.find(f=>f.id===initialFinding)
    if(found)setSelected(found)
    onConsumedInitial?.()
  },[initialFinding,findings])

  const rows=useMemo(()=>findings
    .filter(f=>status==='all'||(status==='active'?f.status!=='closed':f.status===status))
    .filter(f=>!priority||f.priority===priority)
    .sort((a,b)=>{
      const rank={A:0,B:1,C:2};const pa=rank[a.priority]??9,pb=rank[b.priority]??9
      if(pa!==pb)return pa-pb
      const ta=a.target_date?new Date(a.target_date).getTime():Infinity,tb=b.target_date?new Date(b.target_date).getTime():Infinity
      if(ta!==tb)return ta-tb
      return new Date(b.created_at)-new Date(a.created_at)
    }),[findings,status,priority])

  return <>
    <PageIntro title="Follow-up Action Tracker" th="ติดตามการแก้ไข" description="Follow-up is created from an existing defect. Assign owner, action, target date, spare/machine-stop requirements and verify before closing. · ใช้ Defect ที่พบแล้วมาวางแผนและติดตามจนยืนยันผล"><div className="followup-page-note"><b>Defect → Action → Verify → Close</b><small>ปัญหาที่พบ → วางแผนแก้ไข → ยืนยันผล → ปิดงาน</small></div></PageIntro>

    <section className="compact-filter-bar"><SelectMenu value={status} onChange={setStatus} options={[{value:'active',label:'Active follow-up',sub:'งานที่ยังไม่ปิด'},{value:'all',label:'All',sub:'ทั้งหมด'},{value:'open',label:'Action Pending',sub:'ยังไม่ได้วางแผน'},{value:'waiting_spare',label:'Waiting Spare',sub:'รออะไหล่'},{value:'waiting_machine_stop',label:'Waiting Stop',sub:'รอหยุดเครื่อง'},{value:'in_progress',label:'In Progress',sub:'กำลังดำเนินการ'},{value:'verification',label:'Verification',sub:'รอยืนยันผล'},{value:'closed',label:'Closed',sub:'ปิดแล้ว'}]}/><SelectMenu value={priority} onChange={setPriority} options={[{value:'',label:'All priority',sub:'ทุกระดับ'},{value:'A',label:'A — Critical',sub:'วิกฤต / เร่งด่วน'},{value:'B',label:'B — Important',sub:'สำคัญ / ควรแก้เร็ว'},{value:'C',label:'C — Routine',sub:'ทั่วไป / วางแผนทำ'}]}/></section>

    <div className="follow-grid action-tracker-grid">{rows.length?rows.map(f=>{
      const owner=(technicians||[]).find(t=>t.id===f.owner_profile_id)
      const photos=f.attachments||[]
      const actionPending=f.status==='open'&&!f.temporary_action&&!f.permanent_action
      return <article className={`follow-card-pro follow-action-card priority-${f.priority}`} key={f.id}>
        <header><div className="machine-code">{f.machines?.machine_no||'-'}</div><div className="defect-badges"><Badge tone={f.priority==='A'?'red':f.priority==='B'?'amber':'neutral'}>P-{f.priority}</Badge><Badge tone={f.status==='closed'?'green':f.status==='waiting_spare'?'amber':f.status==='verification'?'purple':'blue'}>{actionPending?'Action Pending · รอวางแผน':statusLabel(f.status)}</Badge></div></header>
        <div className="follow-defect-title"><span>DEFECT / จุดผิดปกติ</span><h3>{f.finding}</h3>{f.risk&&<p>{f.risk}</p>}</div>
        {photos.length>0&&<div className="follow-photo-strip"><Camera size={14}/>{photos.slice(0,3).map(p=><a key={p.id} href={p.signed_url||'#'} target="_blank" rel="noreferrer"><img src={p.signed_url} alt={p.file_name||'Defect evidence'}/></a>)}<small>{photos.length} photo(s)</small></div>}
        <div className="follow-meta follow-meta-v12">
          <span><UserRound size={15}/>Owner <b>{owner?.full_name||'Not assigned · ยังไม่มอบหมาย'}</b></span>
          <span><CalendarClock size={15}/>Target <b>{fmtDate(f.target_date)}</b></span>
          <span><PackageOpen size={15}/>Spare <b>{f.spare_required?'Required · ต้องใช้':'No · ไม่ใช้'}</b></span>
          <span><Wrench size={15}/>Stop <b>{f.need_machine_stop?'Required · ต้องหยุด':'No · ไม่ต้องหยุด'}</b></span>
        </div>
        {(f.temporary_action||f.permanent_action)&&<div className="follow-action-summary">{f.temporary_action&&<div><span>Temporary / ชั่วคราว</span><p>{f.temporary_action}</p></div>}{f.permanent_action&&<div><span>Permanent / ถาวร</span><p>{f.permanent_action}</p></div>}</div>}
        {f.verification_note&&<div className="verification-box"><b>Verification / ผลยืนยัน</b><p>{f.verification_note}</p></div>}
        {rolePlanner(profile.role)&&<footer><Button size="sm" icon={Wrench} onClick={()=>setSelected(f)}>{actionPending?'Plan Action':'Update Action'} <small>{actionPending?'วางแผนแก้ไข':'อัปเดตงาน'}</small></Button>{f.status!=='closed'&&<Button size="sm" variant="ghost" onClick={()=>onCreateTPM(f)}>Create TPM <small>นำเข้าแผน</small></Button>}</footer>}
      </article>
    }):<Empty title="No follow-up" text="ไม่มีงานติดตามตามเงื่อนไข"/>}</div>

    <FollowUpModal open={!!selected} onClose={()=>setSelected(null)} finding={selected} technicians={technicians} onSave={onSaveAction}/>
  </>
}
