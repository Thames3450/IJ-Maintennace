import React,{useMemo,useState} from 'react'
import { Search, History, AlertTriangle, Wrench, ClipboardCheck, CalendarCheck2, Activity, ChevronRight } from '../icons.jsx'
import { Badge, Button, Empty, PageIntro, SelectMenu } from '../components/UI.jsx'
import { fmtDateTime, machineGroup, naturalMachineSort } from '../lib/utils.js'

export default function Assets({machines,jobs,repairs,findings,inspections,onOpenMachine}){
  const [q,setQ]=useState(''),[group,setGroup]=useState(''),[view,setView]=useState('activity')
  const groups=useMemo(()=>[...new Set(machines.map(m=>machineGroup(m.machine_no)))].sort(),[machines])
  const rows=useMemo(()=>machines.filter(m=>!group||machineGroup(m.machine_no)===group).filter(m=>!q||`${m.machine_no} ${m.machine_name} ${m.area||''}`.toLowerCase().includes(q.toLowerCase())).map(m=>{
    const mRepairs=repairs.filter(r=>r.machine_id===m.id || String(r.machine_no_snapshot||'').trim()===String(m.machine_no||'').trim()).sort((a,b)=>new Date(b.started_at)-new Date(a.started_at))
    const mJobs=jobs.filter(j=>j.machine_id===m.id).sort((a,b)=>String(b.planned_date).localeCompare(String(a.planned_date)))
    const mFind=findings.filter(f=>f.machine_id===m.id&&f.status!=='closed')
    const mInsp=inspections.filter(i=>i.machine_id===m.id).sort((a,b)=>new Date(b.completed_at||b.created_at)-new Date(a.completed_at||a.created_at))
    const lastRepair=mRepairs[0],lastJob=mJobs.find(j=>['completed','partial'].includes(j.job_status)),lastInspection=mInsp[0]
    const loss30=mRepairs.filter(r=>new Date(r.started_at)>=new Date(Date.now()-30*86400000)).reduce((s,r)=>s+(Number(r.loss_time_min)||0),0)
    const activityCount=mRepairs.length+mJobs.length+mInsp.length+mFind.length
    return {...m,lastRepair,lastJob,lastInspection,repairCount:mRepairs.length,tpmCount:mJobs.filter(j=>['completed','partial'].includes(j.job_status)).length,openFindings:mFind.length,loss30,activityCount}
  }).sort((a,b)=>view==='activity'?(b.activityCount-a.activityCount)||naturalMachineSort(a,b):naturalMachineSort(a,b)),[machines,repairs,jobs,findings,inspections,q,group,view])
  return <>
    <PageIntro title="Machine Center" th="ศูนย์ข้อมูลเครื่องจักร" description="One machine profile for repair, TPM/PM, inspection, defects and condition history. · รวมข้อมูลทุกงานของเครื่องไว้หน้าเดียว"/>
    <section className="asset-toolbar"><div className="search-box"><Search size={17}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search machine / ค้นหาเครื่อง"/></div><SelectMenu value={group} onChange={setGroup} options={[{value:'',label:'All machine groups',sub:'ทุกกลุ่มเครื่อง'},...groups.map(g=>({value:g,label:g,sub:'Machine group · กลุ่มเครื่อง'}))]}/><div className="segment compact-segment"><button className={view==='activity'?'active':''} onClick={()=>setView('activity')}>Active first <small>มีข้อมูลก่อน</small></button><button className={view==='all'?'active':''} onClick={()=>setView('all')}>Machine order <small>เรียงเครื่อง</small></button></div></section>
    <div className="asset-grid-v5">{rows.length?rows.map(m=><article className={`asset-card-v5 ${m.openFindings?'has-alert':''}`} key={m.id}>
      <header><div><span className="asset-group">{machineGroup(m.machine_no)}</span><h3>{m.machine_no}</h3><p>{m.machine_name}</p></div><Badge tone={m.openFindings?'amber':m.lastInspection?.overall_status==='abnormal'?'red':'green'}>{m.openFindings?`${m.openFindings} Open Defect`:m.lastInspection?.overall_status||'Normal'}</Badge></header>
      <div className="machine-health-row"><div className={`condition-ring ${m.lastInspection?.overall_status||'none'}`}><strong>{m.lastInspection?.condition_score??'—'}</strong><span>Condition</span></div><div className="machine-health-copy"><div><span>Last repair <small>ซ่อมล่าสุด</small></span><b>{m.lastRepair?fmtDateTime(m.lastRepair.started_at):'No record · ไม่มีข้อมูล'}</b>{m.lastRepair&&<em>{m.lastRepair.symptom}</em>}</div><div><span>Last TPM <small>TPM ล่าสุด</small></span><b>{m.lastJob?fmtDateTime(m.lastJob.ij_tpm_executions?.[0]?.actual_completed_at||m.lastJob.planned_date):'No record · ไม่มีข้อมูล'}</b></div><div><span>Last inspection <small>ตรวจล่าสุด</small></span><b>{m.lastInspection?fmtDateTime(m.lastInspection.completed_at||m.lastInspection.created_at):'No record · ไม่มีข้อมูล'}</b></div></div></div>
      <div className="machine-stat-grid"><div><Wrench/><span>Repair records<small>ประวัติซ่อม</small></span><b>{m.repairCount}</b></div><div><CalendarCheck2/><span>TPM done<small>TPM ที่ทำแล้ว</small></span><b>{m.tpmCount}</b></div><div><Activity/><span>Loss 30d<small>Loss 30 วัน</small></span><b>{m.loss30} min</b></div><div><AlertTriangle/><span>Open defect<small>จุดค้าง</small></span><b>{m.openFindings}</b></div></div>
      <Button variant="soft" onClick={()=>onOpenMachine(m.id)}>Open Machine Profile <small>ดูข้อมูลเครื่อง</small><ChevronRight size={16}/></Button>
    </article>):<Empty/>}</div>
  </>
}
