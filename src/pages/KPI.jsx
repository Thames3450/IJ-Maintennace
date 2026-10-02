import React,{useEffect,useMemo,useState} from 'react'
import { Activity, Gauge, Wrench, Timer, AlertTriangle, Settings2, Target, FileBarChart, Search, Clock3, CheckCircle2, TrendingUp, Repeat2, PackageSearch, CalendarDays } from '../icons.jsx'
import { Badge, Button, Modal, PageIntro, SelectMenu } from '../components/UI.jsx'
import { isoDate, machineGroup, minutesToHuman } from '../lib/utils.js'
import { periodRepairMetrics,tpmMetrics,pmMetrics,defectMetrics,topLossMachines } from '../lib/kpi.js'

const num=n=>Number(n)||0
const dateKey=v=>String(v||'').slice(0,10)
const monthToken=value=>String(value||'').slice(0,7)
const rangeStart=()=>{const d=new Date();return isoDate(new Date(d.getFullYear(),d.getMonth()-2,1))}
const monthStart=()=>{const d=new Date();return isoDate(new Date(d.getFullYear(),d.getMonth(),1))}
const ymdFromMonth=m=>`${m}-01`
const monthEnd=m=>isoDate(new Date(Number(m.slice(0,4)),Number(m.slice(5,7)),0))
const fmtMonth=m=>new Date(`${m}-01T00:00:00`).toLocaleDateString('en-US',{month:'short',year:'numeric'})
const fmtShortDate=v=>new Date(`${v}T00:00:00`).toLocaleDateString('en-US',{day:'numeric',month:'short'})

export default function KPI({profile,machines,jobs,repairs,findings,pmSchedule,kpiSettings,onSaveSettings}){
  const [filterMode,setFilterMode]=useState('month')
  const [from,setFrom]=useState(rangeStart())
  const [to,setTo]=useState(isoDate())
  const [startMonth,setStartMonth]=useState(monthToken(monthStart()))
  const [endMonth,setEndMonth]=useState(monthToken(isoDate()))
  const [group,setGroup]=useState('')
  const [machine,setMachine]=useState('')
  const [tab,setTab]=useState('overview')
  const [settingsOpen,setSettingsOpen]=useState(false)

  const cfg=kpiSettings?.find(x=>x.machine_no==null)||kpiSettings?.[0]||{}
  const groups=[...new Set(machines.map(m=>machineGroup(m.machine_no)))].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}))
  const monthOptions=useMemo(()=>{
    const raw=[...repairs.map(r=>monthToken(r.started_at)),...jobs.map(j=>monthToken(j.planned_date)),...findings.map(f=>monthToken(f.created_at)),...pmSchedule.map(p=>monthToken(p.due_date))].filter(Boolean)
    const uniq=[...new Set(raw)].sort()
    const current=monthToken(isoDate())
    if(!uniq.includes(current))uniq.push(current)
    return uniq.sort()
  },[repairs,jobs,findings,pmSchedule])

  useEffect(()=>{
    if(filterMode!=='month')return
    let start=startMonth||monthToken(monthStart()),end=endMonth||start
    if(start>end){const t=start;start=end;end=t;setStartMonth(start);setEndMonth(end)}
    setFrom(ymdFromMonth(start));setTo(monthEnd(end))
  },[filterMode,startMonth,endMonth])

  const setPreset=kind=>{
    const now=new Date(),current=monthToken(isoDate(now))
    if(kind==='thisMonth'){setFilterMode('month');setStartMonth(current);setEndMonth(current)}
    if(kind==='last3'){setFilterMode('month');setStartMonth(monthToken(isoDate(new Date(now.getFullYear(),now.getMonth()-2,1))));setEndMonth(current)}
    if(kind==='ytd'){setFilterMode('month');setStartMonth(`${now.getFullYear()}-01`);setEndMonth(current)}
    if(kind==='custom'){setFilterMode('custom');setFrom(rangeStart());setTo(isoDate())}
  }

  const scopedMachines=useMemo(()=>machines.filter(m=>!group||machineGroup(m.machine_no)===group).filter(m=>!machine||String(m.id)===String(machine)),[machines,group,machine])
  const idSet=useMemo(()=>new Set(scopedMachines.map(m=>String(m.id))),[scopedMachines])
  const numberSet=useMemo(()=>new Set(scopedMachines.map(m=>m.machine_no)),[scopedMachines])
  const scopedRepairs=useMemo(()=>repairs.filter(r=>idSet.has(String(r.machine_id))||numberSet.has(r.machine_no_snapshot)),[repairs,idSet,numberSet])
  const scopedJobs=useMemo(()=>jobs.filter(j=>idSet.has(String(j.machine_id))||numberSet.has(j.machine_no_snapshot)),[jobs,idSet,numberSet])
  const scopedFind=useMemo(()=>findings.filter(f=>idSet.has(String(f.machine_id))),[findings,idSet])
  const scopedPM=useMemo(()=>pmSchedule.filter(p=>idSet.has(String(p.machine_id))),[pmSchedule,idSet])

  const repair=useMemo(()=>periodRepairMetrics({repairs:scopedRepairs,machines:scopedMachines,from,to,hoursPerDay:cfg.hours_per_day||24}),[scopedRepairs,scopedMachines,from,to,cfg.hours_per_day])
  const tpm=useMemo(()=>tpmMetrics(scopedJobs,from,to),[scopedJobs,from,to])
  const pm=useMemo(()=>pmMetrics(scopedPM,from,to),[scopedPM,from,to])
  const defect=useMemo(()=>defectMetrics(scopedFind,from,to),[scopedFind,from,to])
  const topLoss=useMemo(()=>topLossMachines(repair.rows,10),[repair.rows])
  const analysis=useMemo(()=>buildAnalysis(repair.rows,tpm.rows,scopedMachines),[repair.rows,tpm.rows,scopedMachines])
  const trend=useMemo(()=>buildAdaptiveTrend({from,to,repairs:scopedRepairs,jobs:scopedJobs,machines:scopedMachines,hoursPerDay:cfg.hours_per_day||24}),[from,to,scopedRepairs,scopedJobs,scopedMachines,cfg.hours_per_day])
  const machineRisk=useMemo(()=>buildMachineRisk(repair.rows,scopedMachines),[repair.rows,scopedMachines])
  const recs=useMemo(()=>makeRecommendations({repair,tpm,pm,defect,topLoss,analysis,cfg}),[repair,tpm,pm,defect,topLoss,analysis,cfg])
  const lossHours=repair.lossMin/60
  const lossRate=scopedMachines.length>1?repair.maintenanceLossRate:(repair.plannedHours?lossHours/repair.plannedHours*100:0)
  const mtbfText=repair.breakdowns&&repair.mtbf!==null?`${repair.mtbf.toFixed(1)} h`:'N/A'
  const multiMachine=scopedMachines.length>1
  const mtbfLabel=multiMachine?'MTBF (Affected Machines)':'MTBF'
  const mtbfTh=multiMachine?'เฉพาะเครื่องที่มี Breakdown':'ระยะเวลาระหว่างงานเสีย'
  const mtbfNote=repair.breakdowns?(multiMachine?`Fleet MTBF ${repair.fleetMtbf.toFixed(1)} machine-h/failure · ${repair.affectedMachineCount}/${repair.machineCount} machines affected`:`Target ≥ ${cfg.target_mtbf_hr||100} h`):'No breakdown · ไม่มีงานเสีย'
  const mttrText=repair.breakdowns?`${repair.mttr.toFixed(1)} min`:'N/A'
  const availabilityLabel=multiMachine?'Maintenance Efficiency':'Availability'
  const availabilityTh=multiMachine?'ประสิทธิภาพเวลาหลังหัก Breakdown Loss':'ความพร้อมใช้งานของเครื่อง'
  const availabilityNote=multiMachine?`Fleet Availability ${repair.fleetAvailability.toFixed(2)}% · Period ${repair.days}d × ${repair.hoursPerDay}h`:`Target ≥ ${cfg.target_availability||80}%`

  return <>
    <PageIntro title="Maintenance KPI" th="ตัวชี้วัดงานซ่อมบำรุง" description="Enterprise reliability and loss dashboard using actual MPR Maintenance records. · วิเคราะห์ประสิทธิภาพ ความน่าเชื่อถือ และ Loss Time จากข้อมูลจริงในระบบ MPR">
      {profile.role==='admin'&&<Button variant="ghost" icon={Settings2} onClick={()=>setSettingsOpen(true)}>KPI Targets <small>ตั้งค่าเป้าหมาย</small></Button>}
    </PageIntro>

    <section className="kpi-v11-control card">
      <div className="kpi-v11-control-head">
        <div><span className="eyebrow">ANALYSIS SCOPE</span><h2>Performance period & machine scope</h2><p>Choose one month, multiple months, or a custom period. · เลือกเดือนเดียว หลายเดือน หรือกำหนดช่วงวันที่เอง</p></div>
        <div className="hero-presets"><button onClick={()=>setPreset('thisMonth')}>This month<small>เดือนนี้</small></button><button onClick={()=>setPreset('last3')}>Last 3 months<small>3 เดือนล่าสุด</small></button><button onClick={()=>setPreset('ytd')}>YTD<small>ตั้งแต่ต้นปี</small></button><button onClick={()=>setPreset('custom')}>Custom<small>กำหนดเอง</small></button></div>
      </div>
      <div className="filter-mode-segment"><button className={filterMode==='month'?'active':''} onClick={()=>setFilterMode('month')}>By Month <small>เลือกเป็นเดือน</small></button><button className={filterMode==='custom'?'active':''} onClick={()=>setFilterMode('custom')}>Custom Range <small>เลือกช่วงวันที่</small></button></div>
      <div className="kpi-v11-filter-grid">
        {filterMode==='month'?<><Field label="Start Month" th="เริ่มเดือน"><SelectMenu value={startMonth} onChange={setStartMonth} options={monthOptions.map(m=>({value:m,label:fmtMonth(m),sub:'เดือนเริ่มต้น'}))}/></Field><Field label="End Month" th="ถึงเดือน"><SelectMenu value={endMonth} onChange={setEndMonth} options={monthOptions.filter(m=>m>=startMonth).map(m=>({value:m,label:fmtMonth(m),sub:'เดือนสิ้นสุด'}))}/></Field></>:<><Field label="From" th="ตั้งแต่วันที่"><input type="date" value={from} onChange={e=>setFrom(e.target.value)}/></Field><Field label="To" th="ถึงวันที่"><input type="date" value={to} onChange={e=>setTo(e.target.value)}/></Field></>}
        <Field label="Machine Group" th="กลุ่มเครื่อง"><SelectMenu value={group} onChange={v=>{setGroup(v);setMachine('')}} options={[{value:'',label:'All IJ',sub:'ทั้งแผนก'},...groups.map(g=>({value:g,label:g,sub:'กลุ่มเครื่อง'}))]}/></Field>
        <Field label="Machine" th="เครื่องจักร" wide><SelectMenu searchable value={machine} onChange={setMachine} options={[{value:'',label:'All machines',sub:'ทุกเครื่อง'},...machines.filter(m=>!group||machineGroup(m.machine_no)===group).sort((a,b)=>a.machine_no.localeCompare(b.machine_no,undefined,{numeric:true})).map(m=>({value:m.id,label:m.machine_no,sub:m.machine_name||'เครื่องจักร'}))]}/></Field>
        <div className="scope-summary"><CalendarDays size={18}/><div><b>{fmtRange(from,to)}</b><small>{scopedMachines.length} machine(s) · {trend.granularityLabel}</small></div></div>
        <Button icon={Search}>Analyze KPI <small>วิเคราะห์ KPI</small></Button>
      </div>
    </section>

    <section className="executive-kpi-strip">
      <ExecutiveKpi icon={Gauge} label={availabilityLabel} th={availabilityTh} value={`${repair.availability.toFixed(1)}%`} note={availabilityNote} tone={toneHigh(repair.availability,cfg.target_availability||80)}/>
      <ExecutiveKpi icon={Activity} label={mtbfLabel} th={mtbfTh} value={mtbfText} note={mtbfNote} tone={repair.breakdowns?toneHigh(repair.mtbf,cfg.target_mtbf_hr||100):'neutral'}/>
      <ExecutiveKpi icon={Wrench} label="MTTR" th="เวลาซ่อมเฉลี่ย" value={mttrText} note={repair.breakdowns?`Target ≤ ${cfg.target_mttr_min||37} min`:'No breakdown · ไม่มีงานเสีย'} tone={repair.breakdowns?toneLow(repair.mttr,cfg.target_mttr_min||37):'neutral'}/>
      <ExecutiveKpi icon={Timer} label="Loss Time" th="เวลาสูญเสียจาก Breakdown" value={`${lossHours.toFixed(1)} h`} note={`${repair.lossMin.toLocaleString()} min total`} tone={lossHours>0?'red':'green'}/>
      <ExecutiveKpi icon={AlertTriangle} label="Breakdowns" th="จำนวนครั้งงานเสีย" value={repair.breakdowns} note={`${analysis.machineCount} machine(s) affected`} tone={repair.breakdowns?'amber':'green'}/>
      <ExecutiveKpi icon={TrendingUp} label={multiMachine?"Maintenance Loss Rate":"Loss Rate"} th={multiMachine?"Loss Time เทียบเวลาของช่วงที่เลือก":"สัดส่วนเวลาสูญเสีย"} value={`${lossRate.toFixed(2)}%`} note={multiMachine?"Accumulated breakdown loss ÷ period hours":"Loss time ÷ planned time"} tone={lossRate<=1?'green':lossRate<=3?'amber':'red'}/>
    </section>

    <section className="mtbf-method-note card">
      <div><b>KPI calculation basis <small>ฐานการคำนวณ KPI</small></b><p>{multiMachine?'For multiple machines, Maintenance Efficiency uses one calendar period as the denominator: (period hours − accumulated Breakdown Loss Time) ÷ period hours. Standard Fleet Availability is shown separately for engineering reference. MTBF uses operating hours of machines that actually had a breakdown ÷ total breakdowns.':'For one machine, Availability = (planned operating hours − breakdown downtime) ÷ planned operating hours. MTBF = operating hours ÷ breakdown count.'}</p></div>
      <div className="mtbf-method-stats"><span><b>{repair.days}</b><small>Operating days / วัน</small></span><span><b>{repair.plannedHoursPerMachine.toFixed(0)} h</b><small>Period hours / ชม.ช่วงที่เลือก</small></span><span><b>{(repair.lossMin/60).toFixed(1)} h</b><small>Breakdown Loss / เวลาสูญเสีย</small></span>{multiMachine&&<span><b>{repair.fleetAvailability.toFixed(2)}%</b><small>Fleet Availability / ค่า Fleet</small></span>}<span><b>{repair.breakdowns}</b><small>Breakdowns</small></span>{multiMachine&&<span><b>{repair.fleetMtbf?repair.fleetMtbf.toFixed(1):'N/A'} h</b><small>Fleet MTBF / machine-h per failure</small></span>}</div>
    </section>

    <div className="kpi-v11-tabs"><button className={tab==='overview'?'active':''} onClick={()=>setTab('overview')}><FileBarChart/><span>Executive Overview<small>ภาพรวมผู้บริหาร</small></span></button><button className={tab==='reliability'?'active':''} onClick={()=>setTab('reliability')}><Activity/><span>Reliability<small>ความน่าเชื่อถือ</small></span></button><button className={tab==='loss'?'active':''} onClick={()=>setTab('loss')}><Timer/><span>Loss Analysis<small>วิเคราะห์ Loss Time</small></span></button></div>

    {tab==='overview'&&<ExecutiveOverview repair={repair} tpm={tpm} pm={pm} defect={defect} topLoss={topLoss} analysis={analysis} trend={trend} machineRisk={machineRisk} cfg={cfg} multiMachine={multiMachine}/>} 
    {tab==='reliability'&&<ReliabilityView repair={repair} tpm={tpm} pm={pm} defect={defect} trend={trend} cfg={cfg} recs={recs} multiMachine={multiMachine}/>} 
    {tab==='loss'&&<LossView repair={repair} analysis={analysis} trend={trend} topLoss={topLoss} machineRisk={machineRisk}/>} 

    <KpiSettingsModal open={settingsOpen} onClose={()=>setSettingsOpen(false)} settings={cfg} onSave={async f=>{await onSaveSettings(f);setSettingsOpen(false)}}/>
  </>
}

function ExecutiveOverview({repair,tpm,pm,defect,topLoss,analysis,trend,machineRisk,cfg,multiMachine}){
  return <div className="kpi-v11-stack">
    <SectionTitle n="01" title="Reliability & Loss Executive View" th="ภาพรวมประสิทธิภาพหลัก พร้อม Loss Time และแนวโน้มตามช่วงเวลาที่เลือก"/>
    <div className="chart-grid-2 enterprise-chart-grid">
      <EnterpriseChart title={multiMachine?"Maintenance Efficiency vs Target":"Availability vs Target"} th={multiMachine?"แนวโน้มประสิทธิภาพเวลาหลังหัก Loss":"แนวโน้มความพร้อมใช้งาน"} meta={`Current ${repair.availability.toFixed(1)}% · Target ≥ ${cfg.target_availability||80}%`}><EnterpriseLine data={trend.rows} valueKey="availability" unit="%" target={cfg.target_availability||80} minHint={Math.max(0,Math.min(75,Math.floor(Math.min(...trend.rows.map(x=>x.availability||100))-5)))} maxHint={100}/></EnterpriseChart>
      <EnterpriseChart title="Breakdown Loss Time & Frequency" th="Loss Time เทียบจำนวนครั้งงานเสีย" meta={`${(repair.lossMin/60).toFixed(1)} h loss · ${repair.breakdowns} breakdowns`}><LossFrequencyCombo data={trend.rows}/></EnterpriseChart>
    </div>
    <div className="chart-grid-2 enterprise-chart-grid">
      <EnterpriseChart title="Top Loss Machines" th="เครื่องที่สร้าง Loss Time สูงสุด" meta="Use this ranking for TPM / RCA priority"><RankBars data={topLoss.slice(0,7).map(x=>({label:x.machine,value:x.loss/60,sub:`${x.count} breakdowns · ${x.topIssue}`}))} unit="h"/></EnterpriseChart>
      <EnterpriseChart title="Pareto by Failure Symptom" th="อาการที่สร้าง Loss Time สูงสุด" meta="Cumulative contribution to total loss"><ParetoEnterprise data={analysis.symptomLoss.slice(0,8).map(x=>({label:x.label,value:x.value}))}/></EnterpriseChart>
    </div>
    <SectionTitle n="02" title="Maintenance Control" th="มองทั้งงานป้องกัน งานค้าง และประสิทธิภาพการปิดงาน"/>
    <div className="control-kpi-grid">
      <ControlTile icon={CheckCircle2} label="TPM Completion" th="ปิดแผน TPM" value={`${tpm.completion}%`} note={`${tpm.completed}/${tpm.rows.length||0} jobs`} tone={toneHigh(tpm.completion,cfg.target_tpm_completion||100)}/>
      <ControlTile icon={Clock3} label="PM Compliance" th="ทำ PM ตามกำหนด" value={`${pm.compliance}%`} note={`${pm.completed}/${pm.due.length||0} due`} tone={toneHigh(pm.compliance,cfg.target_pm_compliance||100)}/>
      <ControlTile icon={AlertTriangle} label="Open Defects" th="จุดผิดปกติคงค้าง" value={defect.open} note={`${defect.waitingSpare} waiting spare`} tone={defect.open?'amber':'green'}/>
      <ControlTile icon={Repeat2} label="TPM Overdue" th="งาน TPM เกินกำหนด" value={tpm.overdue} note="Not completed on plan date" tone={tpm.overdue?'red':'green'}/>
    </div>
    <MachineRiskTable rows={machineRisk.slice(0,8)}/>
  </div>
}

function ReliabilityView({repair,tpm,pm,defect,trend,cfg,recs,multiMachine}){
  const mtbfActual=repair.breakdowns?repair.mtbf:null,mttrActual=repair.breakdowns?repair.mttr:null
  return <div className="kpi-v11-stack">
    <SectionTitle n="01" title="Reliability Performance" th="วิเคราะห์ Availability, MTBF, MTTR และ Loss Rate แบบแยก KPI ชัดเจน"/>
    <div className="target-card-grid">
      <TargetCard label={multiMachine?"Maintenance Efficiency":"Availability"} th={multiMachine?"Loss ต่ำ ค่ายิ่งสูงยิ่งดี":"ยิ่งสูงยิ่งดี"} actual={repair.availability} target={cfg.target_availability||80} unit="%" good="high"/>
      <TargetCard label={repair.machineCount>1?'MTBF (Affected Machines)':'MTBF'} th={repair.machineCount>1?'เฉพาะเครื่องที่เกิด Breakdown · ยิ่งสูงยิ่งดี':'ยิ่งสูงยิ่งดี'} actual={mtbfActual} target={cfg.target_mtbf_hr||100} unit="h" good="high" na={!repair.breakdowns}/>
      <TargetCard label="MTTR" th="ยิ่งต่ำยิ่งดี" actual={mttrActual} target={cfg.target_mttr_min||37} unit="min" good="low" na={!repair.breakdowns}/>
    </div>
    <div className="chart-grid-2 enterprise-chart-grid">
      <EnterpriseChart title={repair.machineCount>1?'MTBF Trend — Affected Machines':'MTBF Trend'} th={repair.machineCount>1?'แนวโน้ม MTBF ของเครื่องที่เกิด Breakdown ในแต่ละช่วง':'แนวโน้มระยะเวลาระหว่างงานเสีย'} meta={`Target ≥ ${cfg.target_mtbf_hr||100} h`}><EnterpriseLine data={trend.rows} valueKey="mtbf" unit="h" target={cfg.target_mtbf_hr||100}/></EnterpriseChart>
      <EnterpriseChart title="MTTR Trend" th="แนวโน้มเวลาซ่อมเฉลี่ย" meta={`Target ≤ ${cfg.target_mttr_min||37} min`}><EnterpriseLine data={trend.rows} valueKey="mttr" unit="min" target={cfg.target_mttr_min||37}/></EnterpriseChart>
    </div>
    <div className="chart-grid-2 enterprise-chart-grid">
      <EnterpriseChart title="Loss Rate Trend" th="Loss Time เทียบ Planned Time" meta="Lower is better · ยิ่งต่ำยิ่งดี"><EnterpriseLine data={trend.rows} valueKey="lossRate" unit="%"/></EnterpriseChart>
      <EnterpriseChart title="TPM Completion Trend" th="การปิดงาน TPM ในแต่ละช่วง" meta={`Target ≥ ${cfg.target_tpm_completion||100}%`}><EnterpriseLine data={trend.rows} valueKey="tpm" unit="%" target={cfg.target_tpm_completion||100} minHint={0} maxHint={100}/></EnterpriseChart>
    </div>
    <SectionTitle n="02" title="Action Recommendation" th="ข้อเสนอแนะจาก KPI จริง เพื่อใช้จัดลำดับงาน Maintenance"/>
    <div className="recommend-grid-v7">{recs.map((r,i)=><article key={i} className={`recommend-card ${r.tone}`}><b>{r.title}</b><small>{r.th}</small><p>{r.detail}</p></article>)}</div>
  </div>
}

function LossView({repair,analysis,trend,topLoss,machineRisk}){
  return <div className="kpi-v11-stack">
    <SectionTitle n="01" title="Loss Time Analysis" th="วิเคราะห์เวลาสูญเสียจาก Breakdown เพื่อหาเครื่องและอาการที่ควรแก้ก่อน"/>
    <div className="loss-summary-banner"><div><span>Total Breakdown Loss Time</span><small>Loss Time รวมจากงานเสีย</small><b>{minutesToHuman(repair.lossMin)}</b></div><div><span>Average Loss / Breakdown</span><small>เวลาเสียเฉลี่ยต่อครั้ง</small><b>{repair.breakdowns?(repair.lossMin/repair.breakdowns).toFixed(1):0} min</b></div><div><span>Breakdown Count</span><small>จำนวนครั้งงานเสีย</small><b>{repair.breakdowns}</b></div><div><span>Machines Affected</span><small>จำนวนเครื่องที่มีงานเสีย</small><b>{analysis.machineCount}</b></div></div>
    <EnterpriseChart title="Loss Time Trend" th="แนวโน้มเวลาสูญเสียตามช่วงเวลา" meta="Breakdown loss only · ไม่รวม Planned TPM stop"><EnterpriseBars data={trend.rows} valueKey="lossHours" unit="h"/></EnterpriseChart>
    <div className="chart-grid-2 enterprise-chart-grid">
      <EnterpriseChart title="Loss Time by Machine" th="จัดอันดับเครื่องตามชั่วโมงสูญเสีย" meta="Top machines by actual loss time"><RankBars data={topLoss.slice(0,10).map(x=>({label:x.machine,value:x.loss/60,sub:`${x.count} breakdowns`}))} unit="h"/></EnterpriseChart>
      <EnterpriseChart title="Loss Time by Symptom" th="อาการที่ทำให้เสียเวลามากที่สุด" meta="Prioritize RCA using actual loss"><RankBars data={analysis.symptomLoss.slice(0,10).map(x=>({label:x.label,value:x.value/60}))} unit="h"/></EnterpriseChart>
    </div>
    <div className="chart-grid-2 enterprise-chart-grid">
      <EnterpriseChart title="Breakdown Frequency by Failure Point" th="จุดเสียที่เกิดซ้ำบ่อย" meta="Frequency view · จำนวนครั้ง"><RankBars data={analysis.pointCount.slice(0,10).map(x=>({label:x.label,value:x.count}))} unit="times"/></EnterpriseChart>
      <EnterpriseChart title="Loss Concentration Pareto" th="Pareto Loss Time ตามเครื่อง" meta="Cumulative share of breakdown loss"><ParetoEnterprise data={analysis.machineLoss.slice(0,10).map(x=>({label:x.label,value:x.value}))}/></EnterpriseChart>
    </div>
    <MachineRiskTable rows={machineRisk.slice(0,12)} expanded/>
  </div>
}

function Field({label,th,children,wide=false}){return <label className={wide?'wide-field':''}>{label}<small>{th}</small>{children}</label>}
function ExecutiveKpi({icon:Icon,label,th,value,note,tone='neutral'}){return <article className={`executive-kpi ${tone}`}><div className="exec-kpi-icon"><Icon size={19}/></div><div><span>{label}<small>{th}</small></span><b>{value}</b><em>{note}</em></div></article>}
function SectionTitle({n,title,th}){return <div className="section-title-v11"><span>{n}</span><div><b>{title}</b><small>{th}</small></div></div>}
function EnterpriseChart({title,th,meta,children}){return <section className="enterprise-chart"><header><div className="enterprise-chart-icon"><FileBarChart size={20}/></div><div><b>{title}</b><small>{th}</small></div><em>{meta}</em></header><div className="enterprise-chart-body">{children}</div></section>}
function ControlTile({icon:Icon,label,th,value,note,tone='neutral'}){return <article className={`control-tile ${tone}`}><Icon size={20}/><div><span>{label}<small>{th}</small></span><b>{value}</b><em>{note}</em></div></article>}

function EnterpriseLine({data=[],valueKey,unit='',target=null,minHint=null,maxHint=null}){
  const valid=data.map((x,i)=>({x,i,v:x[valueKey]})).filter(x=>x.v!==null&&x.v!==undefined&&Number.isFinite(Number(x.v)))
  if(!valid.length)return <NoData/>
  const vals=valid.map(x=>num(x.v));let min=minHint!==null?num(minHint):Math.min(0,...vals);let max=maxHint!==null?num(maxHint):Math.max(...vals,target??0,1)
  if(max<=min)max=min+1
  const w=900,h=290,pL=55,pR=20,pT=24,pB=48
  const xPos=i=>pL+(i/(Math.max(1,data.length-1)))*(w-pL-pR)
  const yPos=v=>h-pB-((num(v)-min)/(max-min))*(h-pT-pB)
  const pts=valid.map(x=>[xPos(x.i),yPos(x.v),x.i])
  const ticks=[0,.25,.5,.75,1].map(q=>max-(max-min)*q)
  const area=pts.length>1?`${pts[0][0]},${h-pB} ${pts.map(p=>`${p[0]},${p[1]}`).join(' ')} ${pts[pts.length-1][0]},${h-pB}`:''
  const targetY=target!==null?yPos(target):null
  return <div className="enterprise-line-chart"><svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">{ticks.map((t,i)=>{const y=pT+i*((h-pT-pB)/4);return <g key={i}><line x1={pL} x2={w-pR} y1={y} y2={y} className="ent-grid"/><text x={pL-10} y={y+4} textAnchor="end" className="ent-axis">{formatMetric(t)}</text></g>})}{targetY!==null&&target>=min&&target<=max&&<line x1={pL} x2={w-pR} y1={targetY} y2={targetY} className="ent-target"/>}{area&&<polygon points={area} className="ent-area"/>}<polyline points={pts.map(p=>`${p[0]},${p[1]}`).join(' ')} className="ent-line" fill="none"/>{pts.map((p,i)=>{const value=data[p[2]][valueKey];const labelY=p[1]<(pT+20)?p[1]+20:p[1]-11;return <g key={i}><circle cx={p[0]} cy={p[1]} r="5" className="ent-dot"/><text x={p[0]} y={labelY} textAnchor="middle" className="ent-data-label">{formatDataLabel(value,unit)}</text><title>{`${data[p[2]].label}: ${formatMetric(value)} ${unit}`}</title></g>})}</svg><div className="ent-xlabels">{data.map((x,i)=><span key={i}>{x.label}</span>)}</div><div className="ent-legend"><span><i className="actual"/>Actual {unit&&`(${unit})`}</span>{target!==null&&<span><i className="target"/>Target {target}{unit}</span>}</div></div>
}

function LossFrequencyCombo({data=[]}){
  if(!data.length)return <NoData/>
  const maxLoss=Math.max(...data.map(x=>num(x.lossHours)),1),maxCount=Math.max(...data.map(x=>num(x.breakdowns)),1)
  const w=900,h=290,pL=55,pR=50,pT=24,pB=48,plotW=w-pL-pR,step=plotW/Math.max(1,data.length),barW=Math.min(42,step*.45)
  const yLoss=v=>h-pB-(num(v)/maxLoss)*(h-pT-pB),yCount=v=>h-pB-(num(v)/maxCount)*(h-pT-pB)
  const linePts=data.map((x,i)=>[pL+step*i+step/2,yCount(x.breakdowns)])
  return <div className="enterprise-combo"><svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">{[0,.25,.5,.75,1].map((q,i)=>{const y=pT+i*((h-pT-pB)/4);return <g key={i}><line x1={pL} x2={w-pR} y1={y} y2={y} className="ent-grid"/><text x={pL-10} y={y+4} textAnchor="end" className="ent-axis">{formatMetric(maxLoss*(1-q))}h</text><text x={w-pR+10} y={y+4} className="ent-axis">{formatMetric(maxCount*(1-q))}</text></g>})}{data.map((x,i)=>{const cx=pL+step*i+step/2,y=yLoss(x.lossHours);const labelY=Math.max(pT+12,y-9);return <g key={`bar-${i}`}><rect x={cx-barW/2} y={y} width={barW} height={h-pB-y} rx="5" className="ent-bar"><title>{`${x.label}: ${x.lossHours.toFixed(1)} h loss`}</title></rect><text x={cx-6} y={labelY} textAnchor="end" className="ent-data-label ent-loss-label">{formatDataLabel(x.lossHours,'h')}</text></g>})}<polyline points={linePts.map(p=>p.join(',')).join(' ')} className="ent-line-secondary" fill="none"/>{linePts.map((p,i)=>{const count=data[i].breakdowns;const labelY=p[1]<(pT+18)?p[1]+20:p[1]-10;return <g key={`freq-${i}`}><circle cx={p[0]} cy={p[1]} r="5" className="ent-dot-secondary"><title>{`${data[i].label}: ${count} breakdowns`}</title></circle><text x={p[0]+9} y={labelY} textAnchor="start" className="ent-data-label ent-frequency-label">{count}x</text></g>})}</svg><div className="ent-xlabels">{data.map((x,i)=><span key={i}>{x.label}</span>)}</div><div className="ent-legend"><span><i className="bar"/>Loss Time (h)</span><span><i className="frequency"/>Breakdowns</span></div></div>
}

function EnterpriseBars({data=[],valueKey='value',unit=''}){
  if(!data.length)return <NoData/>
  const max=Math.max(...data.map(x=>num(x[valueKey])),1)
  return <div className="enterprise-bars"><div className="enterprise-bars-stage">{data.map((x,i)=><div className="enterprise-bar-col" key={i}><div className="bar-value">{formatMetric(x[valueKey])}</div><div className="bar-slot"><i style={{height:`${Math.max(3,num(x[valueKey])/max*100)}%`}} title={`${x.label}: ${formatMetric(x[valueKey])} ${unit}`}/></div><span>{x.label}</span></div>)}</div><div className="ent-legend"><span><i className="bar"/>{unit?`Actual (${unit})`:'Actual'}</span></div></div>
}

function RankBars({data=[],unit=''}){
  if(!data.length)return <NoData/>
  const max=Math.max(...data.map(x=>num(x.value)),1)
  return <div className="rank-bars">{data.map((x,i)=><div className="rank-bar-row" key={i}><span className="rank-no">{i+1}</span><div className="rank-label"><b title={x.label}>{x.label}</b>{x.sub&&<small>{x.sub}</small>}</div><div className="rank-track"><i style={{width:`${Math.max(3,num(x.value)/max*100)}%`}}/></div><strong>{formatMetric(x.value)} {unit}</strong></div>)}</div>
}

function ParetoEnterprise({data=[]}){
  if(!data.length)return <NoData/>
  const rows=data.slice(0,10),total=rows.reduce((s,x)=>s+num(x.value),0)||1,max=Math.max(...rows.map(x=>num(x.value)),1);let cum=0
  return <div className="pareto-enterprise">{rows.map((x,i)=>{cum+=num(x.value);const cp=cum/total*100;return <div className="pareto-ent-row" key={i}><span>{i+1}</span><b title={x.label}>{x.label}</b><div className="pareto-ent-track"><i style={{width:`${Math.max(3,num(x.value)/max*100)}%`}}/></div><strong>{formatMetric(num(x.value)/60)} h</strong><em>{cp.toFixed(0)}%</em></div>})}<div className="pareto-note">Cumulative % · เปอร์เซ็นต์สะสมของ Loss Time</div></div>
}

function MachineRiskTable({rows=[],expanded=false}){
  return <section className="machine-risk-panel"><header><div><b>Machine Loss & Reliability Ranking</b><small>จัดอันดับตามข้อมูล Breakdown และ Loss Time จริง</small></div><span>Risk rule: High ≥20% loss share or ≥5 breakdowns</span></header><div className="machine-risk-table"><div className="machine-risk-head"><span>#</span><span>Machine</span><span>Breakdowns</span><span>Loss Time</span><span>Avg / Event</span><span>Loss Share</span><span>Attention</span></div>{rows.map((r,i)=><div className="machine-risk-row" key={r.machine}><span>{i+1}</span><b>{r.machine}</b><span>{r.count}</span><span>{r.lossHours.toFixed(1)} h</span><span>{r.avgMin.toFixed(0)} min</span><span>{r.share.toFixed(1)}%</span><Badge tone={r.level==='High'?'red':r.level==='Medium'?'amber':'blue'}>{r.level}</Badge></div>)}</div></section>
}

function TargetCard({label,th,actual,target,unit,good='high',na=false}){if(na)return <article className="target-card-v7"><header><div><b>{label}</b><small>{th}</small></div><Badge tone="neutral">N/A</Badge></header><div className="target-meter"><i style={{width:'0%'}}/></div><footer><span>Actual <b>No failure</b></span><span>Target <b>{good==='low'?'≤':'≥'} {target} {unit}</b></span></footer></article>;const pass=good==='low'?num(actual)<=num(target):num(actual)>=num(target);const ratio=good==='low'?(num(actual)?Math.min(100,num(target)/num(actual)*100):100):(num(target)?Math.min(100,num(actual)/num(target)*100):100);return <article className="target-card-v7"><header><div><b>{label}</b><small>{th}</small></div><Badge tone={pass?'green':'red'}>{pass?'PASS':'CHECK'}</Badge></header><div className="target-meter"><i style={{width:`${Math.max(4,ratio)}%`}}/></div><footer><span>Actual <b>{num(actual).toFixed(1)} {unit}</b></span><span>Target <b>{good==='low'?'≤':'≥'} {target} {unit}</b></span></footer></article>}
function NoData(){return <div className="no-chart-data-v7"><FileBarChart/><b>No data for selected period</b><small>ยังไม่มีข้อมูลในช่วงที่เลือก</small></div>}

function buildAnalysis(rows,jobs,machines){
  const countBy=(arr,keyFn,valueFn=()=>1)=>{const map=new Map();arr.forEach(x=>{const key=keyFn(x)||'Not specified';map.set(key,(map.get(key)||0)+valueFn(x))});return [...map.entries()].map(([label,value])=>({label,value,count:value})).sort((a,b)=>b.value-a.value)}
  const symptomCount=countBy(rows,r=>r.symptom).map(x=>({...x,count:x.value}))
  const symptomLoss=countBy(rows,r=>r.symptom,r=>num(r.loss_time_min))
  const pointCount=countBy(rows,r=>r.area_point_snapshot||r.production_line_snapshot||'Not specified').map(x=>({...x,count:x.value}))
  const machineLoss=countBy(rows,r=>r.machine_no_snapshot||machines.find(m=>String(m.id)===String(r.machine_id))?.machine_no||'-',r=>num(r.loss_time_min))
  const dailyLoss=countBy(rows,r=>dateKey(r.started_at),r=>num(r.loss_time_min)).sort((a,b)=>a.label.localeCompare(b.label)).slice(-31)
  return {symptomCount,symptomLoss,pointCount,machineLoss,dailyLoss,topSymptom:symptomCount[0]||null,topPoint:pointCount[0]||null,machineCount:new Set(rows.map(r=>r.machine_id||r.machine_no_snapshot).filter(Boolean)).size,tpmStop:jobs.reduce((s,j)=>s+num(j.planned_stop_min),0)}
}

function buildMachineRisk(rows,machines){
  const map=new Map(),total=rows.reduce((s,r)=>s+num(r.loss_time_min),0)||1
  rows.forEach(r=>{const machine=r.machine_no_snapshot||machines.find(m=>String(m.id)===String(r.machine_id))?.machine_no||'-';const cur=map.get(machine)||{machine,count:0,lossMin:0};cur.count+=1;cur.lossMin+=num(r.loss_time_min);map.set(machine,cur)})
  return [...map.values()].map(x=>{const share=x.lossMin/total*100,avgMin=x.count?x.lossMin/x.count:0,level=(share>=20||x.count>=5)?'High':(share>=10||x.count>=3)?'Medium':'Monitor';return {...x,lossHours:x.lossMin/60,share,avgMin,level}}).sort((a,b)=>b.lossMin-a.lossMin)
}

function buildAdaptiveTrend({from,to,repairs,jobs,machines,hoursPerDay}){
  const days=inclusiveDays(from,to)
  let buckets=[],granularityLabel='Monthly trend · แนวโน้มรายเดือน'
  if(days<=14){granularityLabel='Daily trend · แนวโน้มรายวัน';buckets=dayBuckets(from,to)}
  else if(days<=62){granularityLabel='Weekly trend · แนวโน้มรายสัปดาห์';buckets=weekBuckets(from,to)}
  else{granularityLabel='Monthly trend · แนวโน้มรายเดือน';buckets=monthBuckets(from,to)}
  const rows=buckets.map(b=>{const r=periodRepairMetrics({repairs,machines,from:b.start,to:b.end,hoursPerDay}),t=tpmMetrics(jobs,b.start,b.end);const lossHours=r.lossMin/60;return {...b,availability:r.availability,mtbf:r.breakdowns?r.mtbf:null,mttr:r.breakdowns?r.mttr:null,lossMin:r.lossMin,lossHours,lossRate:r.machineCount>1?r.maintenanceLossRate:(r.plannedHours?lossHours/r.plannedHours*100:0),breakdowns:r.breakdowns,tpm:t.rows.length?t.completion:null}})
  return {rows,granularityLabel}
}
function inclusiveDays(from,to){return Math.max(1,Math.floor((new Date(`${to}T00:00:00`)-new Date(`${from}T00:00:00`))/86400000)+1)}
function dayBuckets(from,to){const out=[];let d=new Date(`${from}T00:00:00`),e=new Date(`${to}T00:00:00`);while(d<=e&&out.length<31){const s=isoDate(d);out.push({start:s,end:s,label:fmtShortDate(s)});d.setDate(d.getDate()+1)}return out}
function weekBuckets(from,to){const out=[];let d=new Date(`${from}T00:00:00`),e=new Date(`${to}T00:00:00`);while(d<=e&&out.length<12){const s=isoDate(d);let x=new Date(d);x.setDate(x.getDate()+6);if(x>e)x=new Date(e);const en=isoDate(x);out.push({start:s,end:en,label:`${fmtShortDate(s)}–${fmtShortDate(en)}`});d=new Date(x);d.setDate(d.getDate()+1)}return out}
function monthBuckets(from,to){const out=[];const s=new Date(`${from}T00:00:00`),e=new Date(`${to}T00:00:00`);let d=new Date(s.getFullYear(),s.getMonth(),1);while(d<=e&&out.length<24){const ms=isoDate(d),me=isoDate(new Date(d.getFullYear(),d.getMonth()+1,0));out.push({start:ms<from?from:ms,end:me>to?to:me,label:d.toLocaleDateString('en-US',{month:'short',year:'2-digit'})});d=new Date(d.getFullYear(),d.getMonth()+1,1)}return out}

function makeRecommendations({repair,tpm,pm,defect,topLoss,analysis,cfg}){
  const out=[]
  if(topLoss[0])out.push({tone:'red',title:`Focus ${topLoss[0].machine}`,th:'เครื่องที่สร้าง Loss Time สูงสุด',detail:`Loss ${minutesToHuman(topLoss[0].loss)} from ${topLoss[0].count} breakdown(s). Top issue: ${topLoss[0].topIssue}`})
  if(analysis.topSymptom)out.push({tone:'amber',title:`RCA: ${analysis.topSymptom.label}`,th:'ทำ RCA อาการที่เกิดซ้ำ',detail:`Found ${analysis.topSymptom.count} time(s). Review PM point, spare readiness and permanent countermeasure.`})
  if(repair.breakdowns&&repair.mttr>num(cfg.target_mttr_min||37))out.push({tone:'amber',title:'Reduce MTTR',th:'ลดเวลาซ่อมเฉลี่ย',detail:`Actual ${repair.mttr.toFixed(1)} min vs target ${cfg.target_mttr_min||37} min. Review response time, troubleshooting and critical spare readiness.`})
  if(tpm.rows.length&&tpm.completion<100)out.push({tone:'blue',title:'Close TPM backlog',th:'ปิดแผน TPM ที่ค้าง',detail:`Completed ${tpm.completed}/${tpm.rows.length} jobs (${tpm.completion}%).`})
  if(defect.waitingSpare)out.push({tone:'blue',title:'Follow up waiting spare',th:'ติดตามอะไหล่ค้าง',detail:`${defect.waitingSpare} open finding(s) are waiting for spare parts.`})
  if(!out.length)out.push({tone:'green',title:'Performance is stable',th:'ผลการดำเนินงานอยู่ในเกณฑ์ปกติ',detail:'Continue condition inspection, TPM and PM while monitoring loss concentration.'})
  return out.slice(0,6)
}
function toneHigh(actual,target){return num(actual)>=num(target)?'green':num(actual)>=num(target)*.9?'amber':'red'}
function toneLow(actual,target){return num(actual)<=num(target)?'green':num(actual)<=num(target)*1.2?'amber':'red'}
function formatMetric(v){const n=num(v);if(Math.abs(n)>=1000)return n.toLocaleString(undefined,{maximumFractionDigits:0});if(Math.abs(n)>=100)return n.toFixed(0);if(Math.abs(n)>=10)return n.toFixed(1);return n.toFixed(2).replace(/\.00$/,'')}
function formatDataLabel(v,unit=''){if(v===null||v===undefined||!Number.isFinite(Number(v)))return '-';const n=num(v);let value;if(unit==='%')value=n.toFixed(1);else if(unit==='h'||unit==='min')value=n>=10?n.toFixed(1):n.toFixed(2).replace(/0+$/,'').replace(/\.$/,'');else value=formatMetric(n);return `${value}${unit==='%'?'%':unit?` ${unit}`:''}`}
function fmtRange(from,to){const a=new Date(`${from}T00:00:00`),b=new Date(`${to}T00:00:00`);const same=a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth();return same?a.toLocaleDateString('en-US',{month:'long',year:'numeric'}):`${a.toLocaleDateString('en-US',{month:'short',year:'numeric'})} → ${b.toLocaleDateString('en-US',{month:'short',year:'numeric'})}`}

function KpiSettingsModal({open,onClose,settings,onSave}){
  const [f,setF]=useState({})
  useEffect(()=>{if(open)setF({hours_per_day:settings.hours_per_day??24,days_per_week:settings.days_per_week??7,target_availability:settings.target_availability??80,target_mtbf_hr:settings.target_mtbf_hr??100,target_mttr_min:settings.target_mttr_min??37,target_tpm_completion:settings.target_tpm_completion??100,target_pm_compliance:settings.target_pm_compliance??100,target_defect_closure:settings.target_defect_closure??100})},[open,settings])
  return <Modal open={open} onClose={onClose} eyebrow="KPI CONFIGURATION" title="KPI Target Settings" subtitle="ตั้งค่าเป้าหมาย KPI ของแผนก IJ" footer={<><Button variant="ghost" onClick={onClose}>Cancel · ยกเลิก</Button><Button onClick={()=>onSave(f)}>Save Targets · บันทึก</Button></>}><div className="form-grid"><label>Operating Hours / Day <small>ชั่วโมงเดินเครื่องต่อวัน</small><input type="number" value={f.hours_per_day??''} onChange={e=>setF({...f,hours_per_day:e.target.value})}/></label><label>Days / Week <small>วันทำงานต่อสัปดาห์</small><input type="number" value={f.days_per_week??''} onChange={e=>setF({...f,days_per_week:e.target.value})}/></label><label>Availability Target (%)<input type="number" step="0.01" value={f.target_availability??''} onChange={e=>setF({...f,target_availability:e.target.value})}/></label><label>MTBF Target (h)<input type="number" value={f.target_mtbf_hr??''} onChange={e=>setF({...f,target_mtbf_hr:e.target.value})}/></label><label>MTTR Target (min)<input type="number" value={f.target_mttr_min??''} onChange={e=>setF({...f,target_mttr_min:e.target.value})}/></label><label>TPM Completion Target (%)<input type="number" value={f.target_tpm_completion??''} onChange={e=>setF({...f,target_tpm_completion:e.target.value})}/></label><label>PM Compliance Target (%)<input type="number" value={f.target_pm_compliance??''} onChange={e=>setF({...f,target_pm_compliance:e.target.value})}/></label><label>Defect Closure Target (%)<input type="number" value={f.target_defect_closure??''} onChange={e=>setF({...f,target_defect_closure:e.target.value})}/></label></div></Modal>
}
