import React, { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Plus, Play, Check, Pencil, Clock3, Users, Factory, ShieldCheck, AlertCircle, CalendarDays, ListChecks, TimerReset, CalendarClock } from '../icons.jsx'
import { Button, Badge, Empty, PageIntro, SelectMenu } from '../components/UI.jsx'
import { addDays, fmtDate, isoDate, mondayOf, rolePlanner, statusLabel, shortStatusLabel, workTypeShort } from '../lib/utils.js'

const todayIso=()=>isoDate(new Date())
const monthKey=d=>d.slice(0,7)
const dateObj=s=>new Date(`${s}T00:00:00`)
const monthLabel=d=>new Intl.DateTimeFormat('en-US',{month:'long',year:'numeric'}).format(d)
const dayNames=[['SUN','อา.'],['MON','จ.'],['TUE','อ.'],['WED','พ.'],['THU','พฤ.'],['FRI','ศ.'],['SAT','ส.']]

export default function WeeklyPlan({profile,jobs,machines,pmSchedule=[],weekStart,setWeekStart,onNewPlan,onCreatePM,onEditGroup,onStart,onFinish,onFinding,onPostpone}){
 const [machine,setMachine]=useState(''),[status,setStatus]=useState(''),[view,setView]=useState('month')
 const [month,setMonth]=useState(()=>monthKey(weekStart||todayIso()))
 const [selectedDate,setSelectedDate]=useState(()=>todayIso())

 const calendarJobs=useMemo(()=>jobs.filter(j=>!machine||j.machine_id===machine).filter(j=>!status||j.job_status===status),[jobs,machine,status])
 const calendarPM=useMemo(()=>pmSchedule.filter(p=>!machine||p.machine_id===machine),[pmSchedule,machine])
 const cells=useMemo(()=>buildMonthCells(month),[month])
 const monthStart=`${month}-01`, monthEnd=isoDate(new Date(Number(month.slice(0,4)),Number(month.slice(5,7)),0))
 const monthJobs=useMemo(()=>calendarJobs.filter(j=>j.planned_date>=monthStart&&j.planned_date<=monthEnd),[calendarJobs,monthStart,monthEnd])
 const monthPM=useMemo(()=>calendarPM.filter(p=>p.due_date>=monthStart&&p.due_date<=monthEnd),[calendarPM,monthStart,monthEnd])
 const monthGroups=groupJobs(monthJobs)
 const completed=monthJobs.filter(j=>['completed','partial'].includes(j.job_status)).length
 const overduePM=monthPM.filter(isPMOverdue).length
 const duePM=monthPM.filter(p=>!isPMDone(p)).length
 const totalStop=monthJobs.reduce((s,j)=>s+(Number(j.planned_stop_min)||0),0)
 const selectedJobs=calendarJobs.filter(j=>j.planned_date===selectedDate)
 const selectedPM=calendarPM.filter(p=>p.due_date===selectedDate)
 const selectedGroups=groupJobs(selectedJobs)
 const weekDate=selectedDate||weekStart
 const weekSun=startOfWeekSunday(dateObj(weekDate))
 const weekDays=Array.from({length:7},(_,i)=>isoDate(addDays(weekSun,i)))
 const listDates=[...new Set([...monthJobs.map(j=>j.planned_date),...monthPM.map(p=>p.due_date)])].sort((a,b)=>a.localeCompare(b))

 const moveMonth=n=>{
   const d=new Date(Number(month.slice(0,4)),Number(month.slice(5,7))-1+n,1)
   const m=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
   setMonth(m)
   const td=todayIso();setSelectedDate(monthKey(td)===m?td:`${m}-01`)
 }
 const goToday=()=>{const t=todayIso();setMonth(monthKey(t));setSelectedDate(t);setWeekStart(isoDate(mondayOf(dateObj(t))))}
 const chooseDay=d=>{setSelectedDate(d);setWeekStart(isoDate(mondayOf(dateObj(d))))}

 return <>
  <PageIntro title="TPM / PM Maintenance Calendar" th="ปฏิทินงาน TPM / PM" description="See preventive work by day, week and month. PM due dates and TPM plans are shown together in one calendar. · ดูงาน TPM และ PM ในปฏิทินเดียว กดวันที่เพื่อดูรายละเอียดหรือสร้างแผนได้ทันที">
   {rolePlanner(profile.role)&&<Button icon={Plus} onClick={()=>onNewPlan(selectedDate)}><span className="button-bi">Create Plan<small>สร้างแผนวันที่เลือก</small></span></Button>}
  </PageIntro>

  <section className="maintenance-calendar-toolbar card">
   <div className="calendar-period-control">
    <button onClick={()=>moveMonth(-1)} aria-label="Previous month"><ChevronLeft/></button>
    <div className="calendar-month-title"><b>{monthLabel(new Date(`${month}-01T00:00:00`))}</b><small>ปฏิทิน TPM / PM ประจำเดือน</small></div>
    <button onClick={()=>moveMonth(1)} aria-label="Next month"><ChevronRight/></button>
    <button className="today-button" onClick={goToday}>Today <small>วันนี้</small></button>
   </div>
   <div className="calendar-view-switch">
    <button className={view==='month'?'active':''} onClick={()=>setView('month')}>Month <small>เดือน</small></button>
    <button className={view==='week'?'active':''} onClick={()=>setView('week')}>Week <small>สัปดาห์</small></button>
    <button className={view==='list'?'active':''} onClick={()=>setView('list')}>List <small>รายการ</small></button>
   </div>
   <div className="calendar-filter-grid">
    <label>Machine <small>เครื่องจักร</small><SelectMenu value={machine} onChange={setMachine} searchable options={[{value:'',label:'All machines',sub:'ทุกเครื่อง'},...machines.map(m=>({value:m.id,label:m.machine_no,sub:m.machine_name||'เครื่องจักร'}))]}/></label>
    <label>Status <small>สถานะงาน TPM</small><SelectMenu value={status} onChange={setStatus} options={[{value:'',label:'All statuses',sub:'ทุกสถานะ'},...['draft','planned','in_progress','completed','partial','postponed','cancelled'].map(x=>{const [en,th]=statusLabel(x).split(' · ');return {value:x,label:en,sub:th||''}})]}/></label>
   </div>
  </section>

  <section className="calendar-summary-grid">
   <CalendarSummary icon={CalendarDays} label="TPM / PM Jobs" th="งานในเดือน" value={monthJobs.length}/>
   <CalendarSummary icon={CalendarClock} label="PM Due" th="PM ถึงรอบ" value={duePM} tone={overduePM?'amber':'blue'} sub={overduePM?`${overduePM} overdue · เกินกำหนด`:''}/>
   <CalendarSummary icon={Check} label="Completed" th="งานเสร็จแล้ว" value={`${completed}/${monthJobs.length}`} progress={monthJobs.length?Math.round(completed/monthJobs.length*100):0} tone="green"/>
   <CalendarSummary icon={TimerReset} label="Planned Stop" th="เวลาหยุดตามแผน" value={`${totalStop} min`}/>
  </section>

  <section className="calendar-legend card">
   <span><i className="legend-dot planned"/>TPM Planned <small>แผน TPM</small></span>
   <span><i className="legend-dot progress"/>In Progress <small>กำลังทำ</small></span>
   <span><i className="legend-dot completed"/>Completed <small>เสร็จแล้ว</small></span>
   <span><i className="legend-dot pm"/>PM Due <small>PM ถึงรอบ</small></span>
   <span><i className="legend-dot overdue"/>Overdue <small>เกินกำหนด</small></span>
   <span className="sunday-note">Sunday / วันอาทิตย์ = Preferred TPM day <small>วันหลักสำหรับวาง TPM</small></span>
  </section>

  {view==='month'&&<MonthView cells={cells} month={month} selectedDate={selectedDate} jobs={calendarJobs} pm={calendarPM} onSelect={chooseDay}/>} 
  {view==='week'&&<WeekView days={weekDays} selectedDate={selectedDate} jobs={calendarJobs} pm={calendarPM} onSelect={chooseDay}/>} 
  {view==='list'&&<AgendaView dates={listDates} jobs={calendarJobs} pm={calendarPM} onSelect={chooseDay}/>} 

  <section className="selected-day-panel card">
   <header className="selected-day-header">
    <div><span className="eyebrow">SELECTED DATE</span><h3>{longDate(selectedDate)}</h3><p>งานทั้งหมดในวันที่เลือก · TPM / PM และงานติดตาม</p></div>
    {rolePlanner(profile.role)&&<Button icon={Plus} onClick={()=>onNewPlan(selectedDate)}>Create plan <small>สร้างแผนวันนี้</small></Button>}
   </header>
   {!selectedJobs.length&&!selectedPM.length?<Empty title="No maintenance work on this date" text="ยังไม่มีงานในวันที่เลือก — กด Create plan เพื่อเพิ่มงาน"/>:<>
    {selectedPM.length>0&&<div className="selected-pm-stack"><h4>PM Due <small>PM ถึงรอบ</small></h4>{selectedPM.map(p=><PMDueCard key={p.id} item={p} onCreatePM={onCreatePM}/>)}</div>}
    {selectedGroups.length>0&&<div className="plan-group-stack selected-date-groups">{selectedGroups.map(([id,items])=><PlanGroup key={id} id={id} items={items} profile={profile} onEdit={()=>onEditGroup(id)} onStart={onStart} onFinish={onFinish} onFinding={onFinding} onPostpone={onPostpone}/>)}</div>}
   </>}
  </section>
 </>
}

function MonthView({cells,month,selectedDate,jobs,pm,onSelect}){
 return <section className="calendar-month-shell card">
  <div className="calendar-weekday-head">{dayNames.map(([en,th],i)=><div key={en} className={i===0?'sunday':''}><b>{en}</b><small>{th}</small></div>)}</div>
  <div className="calendar-month-grid">{cells.map((d,i)=>{
   const date=isoDate(d),outside=monthKey(date)!==month,today=date===todayIso(),selected=date===selectedDate,sunday=d.getDay()===0
   const dayJobs=jobs.filter(j=>j.planned_date===date),dayPM=pm.filter(p=>p.due_date===date)
   const events=buildDayEvents(dayJobs,dayPM)
   return <button type="button" key={date+i} className={`calendar-day ${outside?'outside':''} ${today?'today':''} ${selected?'selected':''} ${sunday?'sunday':''}`} onClick={()=>onSelect(date)}>
    <div className="calendar-day-top"><span className="date-number">{d.getDate()}</span>{today&&<em>TODAY</em>}{sunday&&!outside&&<small>TPM</small>}</div>
    <div className="calendar-event-stack">{events.slice(0,3).map((e,idx)=><span key={idx} className={`calendar-event ${e.tone}`} title={e.title}><i/>{e.title}</span>)}{events.length>3&&<span className="calendar-more">+{events.length-3} more · เพิ่มเติม</span>}</div>
    {!!events.length&&<div className="calendar-mobile-dots">{events.slice(0,4).map((e,idx)=><i key={idx} className={e.tone}/>)}</div>}
   </button>
  })}</div>
 </section>
}
function WeekView({days,selectedDate,jobs,pm,onSelect}){
 return <section className="calendar-week-shell card"><div className="week-card-grid">{days.map(d=>{const obj=dateObj(d),events=buildDayEvents(jobs.filter(j=>j.planned_date===d),pm.filter(p=>p.due_date===d));return <button type="button" className={`week-day-card ${d===selectedDate?'selected':''} ${obj.getDay()===0?'sunday':''}`} key={d} onClick={()=>onSelect(d)}><header><span>{dayNames[obj.getDay()][0]}</span><b>{obj.getDate()}</b><small>{new Intl.DateTimeFormat('en-US',{month:'short'}).format(obj)}</small></header><div>{events.length?events.map((e,i)=><span key={i} className={`week-event ${e.tone}`}><i/>{e.title}</span>):<small className="no-event">No work · ไม่มีงาน</small>}</div></button>})}</div></section>
}
function AgendaView({dates,jobs,pm,onSelect}){
 if(!dates.length)return <Empty title="No maintenance work this month" text="ยังไม่มี TPM / PM ในเดือนนี้"/>
 return <section className="calendar-agenda card">{dates.map(d=>{const dayJobs=jobs.filter(j=>j.planned_date===d),dayPM=pm.filter(p=>p.due_date===d),events=buildDayEvents(dayJobs,dayPM);return <button type="button" className="agenda-day" key={d} onClick={()=>onSelect(d)}><div className="agenda-date"><b>{dateObj(d).getDate()}</b><span>{new Intl.DateTimeFormat('en-US',{month:'short'}).format(dateObj(d))}</span></div><div className="agenda-body"><h4>{new Intl.DateTimeFormat('en-US',{weekday:'long'}).format(dateObj(d))}<small>{events.length} event(s) · งาน</small></h4><div>{events.map((e,i)=><span key={i} className={`agenda-event ${e.tone}`}><i/>{e.title}</span>)}</div></div><ChevronRight/></button>})}</section>
}
function buildDayEvents(jobs,pm){
 const out=[]
 jobs.forEach(j=>out.push({tone:jobTone(j),title:`${j.machines?.machine_no||''} ${j.title||'TPM'}`.trim()}))
 pm.forEach(p=>out.push({tone:isPMOverdue(p)?'overdue':isPMDone(p)?'completed':'pm',title:`PM ${p.machine_no_snapshot||''} ${p.plan_title_snapshot||''}`.trim()}))
 return out
}
function jobTone(j){if(j.job_status==='completed'||j.job_status==='partial')return 'completed';if(j.job_status==='in_progress')return 'progress';if(j.job_status==='postponed')return 'overdue';return 'planned'}
function isPMDone(p){return !!p.completed_at||p.status==='completed'}
function isPMOverdue(p){return !isPMDone(p)&&p.due_date<todayIso()}
function buildMonthCells(month){const [y,m]=month.split('-').map(Number),first=new Date(y,m-1,1),start=addDays(first,-first.getDay());return Array.from({length:42},(_,i)=>addDays(start,i))}
function startOfWeekSunday(d){return addDays(d,-d.getDay())}
function longDate(s){return new Intl.DateTimeFormat('en-US',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(dateObj(s))}
function CalendarSummary({icon:Icon,label,th,value,sub,progress,tone='blue'}){return <article className={`calendar-summary-card ${tone}`}><div className="metric-icon blue"><Icon size={18}/></div><div><span>{label}</span><small>{th}</small><strong>{value}</strong>{sub&&<em>{sub}</em>}{progress!==undefined&&<div className="mini-progress"><i style={{width:`${progress}%`}}/></div>}</div></article>}
function PMDueCard({item,onCreatePM}){const overdue=isPMOverdue(item),done=isPMDone(item);return <article className={`selected-pm-card ${overdue?'overdue':done?'done':'due'}`}><div className="pm-calendar-icon"><CalendarClock/></div><div className="grow"><div className="job-title-line"><h4>{item.machine_no_snapshot||'-'} · {item.plan_title_snapshot||'PM Scheduled'}</h4><Badge tone={overdue?'red':done?'green':'amber'}>{overdue?'Overdue · เกินกำหนด':done?'Completed · เสร็จแล้ว':'PM Due · ถึงรอบ'}</Badge></div><p>Due {fmtDate(item.due_date)} · Standard {item.std_minutes_snapshot||0} min</p></div>{!done&&onCreatePM&&<Button size="sm" variant="soft" icon={Plus} onClick={()=>onCreatePM(item)}>Add to plan <small>ใส่แผน TPM/PM</small></Button>}</article>}
function groupJobs(rows){const m=new Map();rows.forEach(j=>{const id=j.plan_group_id||j.id;if(!m.has(id))m.set(id,[]);m.get(id).push(j)});return [...m.entries()].sort((a,b)=>b[1][0].planned_date.localeCompare(a[1][0].planned_date))}
function PlanGroup({items,profile,onEdit,onStart,onFinish,onFinding,onPostpone,readOnly=false}){
 const first=items[0],done=items.filter(j=>['completed','partial'].includes(j.job_status)).length,pct=items.length?done/items.length*100:0
 const prod=uniform(items,'production_status'),mgr=uniform(items,'manager_status'),names=[...new Set(items.flatMap(j=>(j.ij_tpm_job_assignees||[]).map(a=>a.assignee_profile?.full_name).filter(Boolean)))]
 const editable=!readOnly&&rolePlanner(profile.role)&&items.every(j=>['draft','planned','postponed'].includes(j.job_status))&&items.every(j=>!(j.ij_tpm_executions||[])[0]?.actual_started_at)
 return <article className="plan-group-pro">
   <header className="plan-group-header"><div className="plan-date"><strong>{new Date(first.planned_date+'T00:00:00').getDate()}</strong><span>{new Intl.DateTimeFormat('en',{month:'short'}).format(new Date(first.planned_date+'T00:00:00'))}</span></div><div className="grow"><div className="plan-name-row"><div><h3>{first.plan_group_name||`TPM Plan · ${fmtDate(first.planned_date)}`}</h3><span className="plan-subtitle">{items.length} machine jobs · {new Set(items.map(x=>x.machine_id)).size} machines</span></div>{editable&&<button className="icon-text" onClick={onEdit}><Pencil size={15}/>Edit <small>แก้แผน</small></button>}</div><div className="plan-meta"><span><Clock3 size={15}/>{items.reduce((s,j)=>s+(Number(j.planned_stop_min)||0),0)} min planned stop</span><span><Users size={15}/>{names.length?names.join(', '):'Not assigned · ยังไม่มอบหมาย'}</span></div><div className="approval-pills"><Badge tone={prod==='confirmed'||prod==='not_required'?'green':'amber'}><Factory size={13}/> Production · {shortStatusLabel(prod)}</Badge><Badge tone={mgr==='approved'||mgr==='not_required'?'green':'amber'}><ShieldCheck size={13}/> Manager · {shortStatusLabel(mgr)}</Badge></div></div><div className="group-progress"><b>{Math.round(pct)}%</b><span>{done}/{items.length} completed</span><div><i style={{width:`${pct}%`}}/></div></div></header>
   <div className="job-list">{[...items].sort((a,b)=>(a.sequence_no||0)-(b.sequence_no||0)).map(j=><Job key={j.id} job={j} profile={profile} onStart={onStart} onFinish={onFinish} onFinding={onFinding} onPostpone={onPostpone} readOnly={readOnly}/>)}</div>
 </article>
}
function Job({job,profile,onStart,onFinish,onFinding,onPostpone,readOnly}){
 const assigned=(job.ij_tpm_job_assignees||[]).some(a=>a.profile_id===profile.id),can=!readOnly&&(rolePlanner(profile.role)||assigned)
 const exec=(job.ij_tpm_executions||[])[0]
 return <div className="job-row-pro"><div className="machine-code">{job.machines?.machine_no||'-'}</div><div className="grow"><div className="job-title-line"><h4>{job.title}</h4><Badge tone={job.job_status==='completed'?'green':job.job_status==='in_progress'?'blue':job.job_status==='postponed'?'amber':'neutral'}>{shortStatusLabel(job.job_status)}</Badge><span className={`priority priority-${job.priority}`}>P-{job.priority}</span></div>{job.details&&<p>{job.details}</p>}<div className="job-sub"><span>{workTypeShort(job.work_type)}</span><span>{job.need_machine_stop?'Machine stop · หยุดเครื่อง':'Online · ไม่หยุดเครื่อง'}</span><span>{exec?.actual_stop_min??job.planned_stop_min} min</span></div>{exec?.result_summary&&<div className="job-result"><b>Result</b><span>{exec.result_summary}</span></div>}</div><div className="job-buttons">{can&&job.job_status==='planned'&&<Button size="sm" icon={Play} onClick={()=>onStart(job)}>Start <small>เริ่ม</small></Button>}{can&&job.job_status==='in_progress'&&<Button size="sm" icon={Check} onClick={()=>onFinish(job)}>Finish <small>ปิดงาน</small></Button>}{can&&['planned','in_progress'].includes(job.job_status)&&<Button size="sm" variant="ghost" icon={AlertCircle} onClick={()=>onFinding(job)}>Finding</Button>}{!readOnly&&rolePlanner(profile.role)&&['draft','planned'].includes(job.job_status)&&<button className="text-button" onClick={()=>onPostpone(job)}>Postpone <small>เลื่อน</small></button>}</div></div>
}
function uniform(items,key){const vals=[...new Set(items.map(x=>x[key]))];return vals.length===1?vals[0]:'mixed'}
