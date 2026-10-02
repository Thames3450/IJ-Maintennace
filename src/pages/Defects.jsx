import React,{useMemo,useState} from 'react'
import { AlertTriangle, Plus, Wrench, Camera, CalendarClock } from '../icons.jsx'
import { Badge, Button, Empty, PageIntro, SelectMenu } from '../components/UI.jsx'
import { fmtDateTime, rolePlanner, statusLabel } from '../lib/utils.js'

export default function Defects({profile,findings,machines,onNew,onCreateTPM,onFollowUp}){
  const [status,setStatus]=useState('open'),[machine,setMachine]=useState(''),[priority,setPriority]=useState('')
  const rows=useMemo(()=>findings
    .filter(f=>status==='all'||(status==='open'?f.status!=='closed':f.status===status))
    .filter(f=>!machine||f.machine_id===machine)
    .filter(f=>!priority||f.priority===priority)
    .sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)),[findings,status,machine,priority])

  return <>
    <PageIntro title="Defect Register" th="ทะเบียนจุดผิดปกติ" description="Record what was found first: machine, defect, risk, priority and photo evidence. Action planning is managed separately in Follow-up. · บันทึกสิ่งที่พบก่อน แล้วค่อยวางแผนแก้ไขในเมนู Follow-up"><Button icon={Plus} onClick={onNew}>New Defect <small>เพิ่มจุดผิดปกติ</small></Button></PageIntro>

    <section className="defect-process-note">
      <span><b>1</b>Find defect<small>พบปัญหา</small></span><i>→</i><span><b>2</b>Record evidence<small>บันทึก + รูป</small></span><i>→</i><span><b>3</b>Follow-up action<small>วางแผนแก้ไข</small></span><i>→</i><span><b>4</b>Verify & close<small>ยืนยันผลและปิด</small></span>
    </section>

    <section className="compact-filter-bar"><SelectMenu value={status} onChange={setStatus} options={[{value:'open',label:'Open defects',sub:'จุดผิดปกติที่ยังไม่ปิด'},{value:'all',label:'All defects',sub:'ทั้งหมด'},{value:'waiting_spare',label:'Waiting Spare',sub:'รออะไหล่'},{value:'waiting_machine_stop',label:'Waiting Stop',sub:'รอหยุดเครื่อง'},{value:'in_progress',label:'In Progress',sub:'กำลังแก้ไข'},{value:'verification',label:'Verification',sub:'รอยืนยันผล'},{value:'closed',label:'Closed',sub:'ปิดแล้ว'}]}/><SelectMenu value={machine} onChange={setMachine} searchable options={[{value:'',label:'All machines',sub:'ทุกเครื่อง'},...machines.map(m=>({value:m.id,label:m.machine_no,sub:m.machine_name||'เครื่องจักร'}))]}/><SelectMenu value={priority} onChange={setPriority} options={[{value:'',label:'All priority',sub:'ทุกระดับ'},{value:'A',label:'A — Critical',sub:'วิกฤต / ต้องจัดการทันที'},{value:'B',label:'B — Important',sub:'สำคัญ / ควรแก้เร็ว'},{value:'C',label:'C — Routine',sub:'ทั่วไป / วางแผนทำ'}]}/></section>

    <div className="defect-board defect-register-grid">{rows.length?rows.map(f=>{
      const photos=f.attachments||[]
      return <article className={`defect-card defect-${f.priority}`} key={f.id}>
        <header><div className="machine-code">{f.machines?.machine_no||'-'}</div><div className="defect-badges"><Badge tone={f.priority==='A'?'red':f.priority==='B'?'amber':'neutral'}>P-{f.priority}</Badge><Badge tone={f.status==='closed'?'green':f.status==='waiting_spare'?'amber':f.status==='verification'?'purple':'blue'}>{statusLabel(f.status)}</Badge></div></header>
        <h3><AlertTriangle size={17}/>{f.finding}</h3>
        {f.risk&&<p className="defect-risk"><b>Risk / Impact · ผลกระทบ</b>{f.risk}</p>}
        {photos.length>0?<div className="defect-photo-gallery">{photos.slice(0,4).map((p,i)=><a key={p.id} href={p.signed_url||'#'} target="_blank" rel="noreferrer"><img src={p.signed_url} alt={p.file_name||`Defect photo ${i+1}`}/></a>)}</div>:<div className="defect-no-photo"><Camera size={15}/>No photo evidence · ไม่มีรูปประกอบ</div>}
        <div className="defect-source"><span>Source · ที่มา: {sourceText(f.source_type)}</span><span>{fmtDateTime(f.created_at)}</span></div>
        <div className="defect-register-status"><CalendarClock size={14}/><div><b>{followStatusText(f)}</b><small>{followStatusThai(f)}</small></div></div>
        <footer>{rolePlanner(profile.role)&&<><Button size="sm" icon={Wrench} onClick={()=>onFollowUp(f)}>Follow-up <small>วางแผนแก้ไข</small></Button><Button size="sm" variant="ghost" onClick={()=>onCreateTPM(f)}>Create TPM <small>นำเข้าแผน</small></Button></>}</footer>
      </article>
    }):<Empty title="No matching defects" text="ไม่มี Defect ตามเงื่อนไข"/>}</div>
  </>
}

function sourceText(s){return ({inspection:'Inspection / ตรวจสภาพ',tpm:'TPM / PM',repair:'Repair / งานซ่อม',manual:'Manual / พบหน้างาน',opportunity:'Opportunity / ปรับปรุง'}[s]||s||'Manual / พบหน้างาน')}
function followStatusText(f){if(f.status==='open'&&!f.permanent_action&&!f.temporary_action)return 'Action not planned';if(f.status==='closed')return 'Verified & closed';return statusLabel(f.status).split(' · ')[0]}
function followStatusThai(f){if(f.status==='open'&&!f.permanent_action&&!f.temporary_action)return 'ยังไม่ได้วางแผนแก้ไข';if(f.status==='closed')return 'ยืนยันผลและปิดงานแล้ว';return statusLabel(f.status).split(' · ')[1]||''}
