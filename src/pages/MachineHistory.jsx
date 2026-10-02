import React, { useEffect, useState } from 'react'
import { Wrench, CalendarCheck2, Clock3, UserRound, ClipboardCheck, AlertTriangle, Lightbulb } from '../icons.jsx'
import { supabase } from '../lib/supabase.js'
import { Badge, Empty, Skeleton, PageIntro, SelectMenu } from '../components/UI.jsx'
import { fmtDateTime, statusLabel, workTypeShort } from '../lib/utils.js'

export default function MachineHistory({machines,departmentId,initialMachine,onConsumedInitial}){
 const [machine,setMachine]=useState(initialMachine||''),[type,setType]=useState(''),[rows,setRows]=useState([]),[loading,setLoading]=useState(false)
 useEffect(()=>{if(initialMachine){setMachine(initialMachine);onConsumedInitial?.()}},[initialMachine])
 useEffect(()=>{(async()=>{if(!machine){setRows([]);return}setLoading(true);const {data,error}=await supabase.from('ij_maintenance_timeline').select('*').eq('department_id',departmentId).eq('machine_id',machine).order('event_at',{ascending:false}).limit(1500);if(!error)setRows(data||[]);else console.error(error);setLoading(false)})()},[machine,departmentId])
 const visible=(type?rows.filter(r=>r.event_type===type):rows).slice().sort((a,b)=>new Date(b.event_at)-new Date(a.event_at)),selected=machines.find(m=>m.id===machine)
 return <><PageIntro title="Machine Profile & Timeline" th="ประวัติเครื่องแบบรวม" description="Repair + TPM/PM + Inspection + Defect + Opportunity in one timeline. · รวมกิจกรรมทั้งหมดของเครื่องไว้หน้าเดียว"/><section className="history-filters"><label>Machine <small>เครื่องจักร</small><SelectMenu value={machine} onChange={setMachine} searchable placeholder="Select machine" options={[{value:'',label:'Select machine',sub:'เลือกเครื่อง'},...machines.map(m=>({value:m.id,label:m.machine_no,sub:m.machine_name||'เครื่องจักร'}))]}/></label><label>Event type <small>ประเภทประวัติ</small><SelectMenu value={type} onChange={setType} options={EVENT_OPTIONS}/></label></section>{selected&&<div className="machine-banner"><div className="machine-banner-code">{selected.machine_no}</div><div><h3>{selected.machine_name}</h3><span>{selected.area||'-'} · Criticality {selected.criticality||'-'} · {selected.has_robot?'Robot':'No Robot'}</span></div><div className="machine-stat"><b>{visible.length}</b><span>Timeline events<small>รายการประวัติ</small></span></div></div>}{loading?<Skeleton rows={5}/>:!machine?<Empty title="Select a machine" text="เลือกเครื่องเพื่อดูประวัติทั้งหมด"/>:visible.length?<div className="timeline-pro">{visible.map(r=><article key={`${r.event_type}-${r.event_id}`}><div className={`timeline-icon ${eventClass(r.event_type)}`}>{eventIcon(r.event_type)}</div><div className="timeline-content"><header><div><Badge tone={eventTone(r.event_type,r.status)}><span className="event-type-bi"><b>{eventText(r.event_type).en}</b><small>{eventText(r.event_type).th}</small></span></Badge><h3>{r.title}</h3></div><time>{fmtDateTime(r.event_at)}</time></header>{r.detail&&<p>{r.detail}</p>}<footer>{r.duration_min!==null&&<span><Clock3 size={14}/>{r.duration_min||0} min</span>}<span><UserRound size={14}/>{r.person_name||'-'}</span><Badge tone={String(r.status).includes('complete')||r.status==='normal'||r.status==='closed'?'green':'neutral'}>{statusLabel(r.status)}</Badge><span>{r.ref_no}</span></footer></div></article>)}</div>:<Empty/>}</>
}
const EVENT_OPTIONS=[
 {value:'',label:'All events',sub:'ทุกประเภท'},
 {value:'repair',label:'Repair',sub:'งานซ่อม'},
 {value:'pm_scheduled',label:'PM',sub:'บำรุงรักษาตามรอบ'},
 {value:'tpm_added',label:'TPM',sub:'งานดูแลตามแผน'},
 {value:'inspection',label:'Inspection',sub:'ตรวจสภาพเครื่อง'},
 {value:'finding',label:'Defect',sub:'จุดผิดปกติ'},
 {value:'opportunity',label:'Opportunity',sub:'โอกาสปรับปรุง'}
]
function eventText(t){return {repair:{en:'Repair',th:'งานซ่อม'},pm_scheduled:{en:'PM',th:'บำรุงรักษาตามรอบ'},tpm_added:{en:'TPM',th:'งานดูแลตามแผน'},inspection:{en:'Inspection',th:'ตรวจสภาพ'},finding:{en:'Defect',th:'จุดผิดปกติ'},opportunity:{en:'Opportunity',th:'โอกาสปรับปรุง'}}[t]||{en:workTypeShort(t),th:'ประวัติงาน'}}
function eventIcon(t){if(t==='repair')return <Wrench size={17}/>;if(t==='inspection')return <ClipboardCheck size={17}/>;if(t==='finding')return <AlertTriangle size={17}/>;if(t==='opportunity')return <Lightbulb size={17}/>;return <CalendarCheck2 size={17}/>}
function eventClass(t){return ['repair','inspection','finding','opportunity'].includes(t)?t:'tpm'}
function eventTone(t,status){if(t==='repair'||t==='finding')return 'red';if(t==='inspection')return status==='abnormal'?'red':status==='watch'?'amber':'green';if(t==='opportunity')return 'amber';return 'blue'}
