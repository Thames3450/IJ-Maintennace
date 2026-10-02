import { machineGroup, pct } from './utils.js'

export function periodRepairMetrics({repairs=[],machines=[],from,to,hoursPerDay=24}){
  const start=new Date(`${from}T00:00:00`), end=new Date(`${to}T23:59:59`)
  const rows=repairs.filter(r=>{const d=new Date(r.started_at);return d>=start&&d<=end})
  const lossMin=rows.reduce((s,r)=>s+(Number(r.loss_time_min)||0),0)
  const breakdowns=rows.length

  // Inclusive day count. Example 1 Sep → 29 Sep = 29 days, not 28.
  const startDay=new Date(`${from}T00:00:00`), endDay=new Date(`${to}T00:00:00`)
  const days=Math.max(1,Math.floor((endDay-startDay)/86400000)+1)
  const hoursDay=Number(hoursPerDay)||24
  const plannedHoursPerMachine=days*hoursDay
  const machineCount=Math.max(1,machines.length)
  const plannedHours=plannedHoursPerMachine*machineCount
  const operatingHours=Math.max(0,plannedHours-lossMin/60)

  // Build per-machine reliability first. This prevents a large machine count from
  // making the user-facing MTBF look like one machine ran tens of thousands of hours.
  const stats=machines.map(m=>{
    const mr=rows.filter(r=>String(r.machine_id||'')===String(m.id)||r.machine_no_snapshot===m.machine_no)
    const mLossMin=mr.reduce((s,r)=>s+(Number(r.loss_time_min)||0),0)
    const failures=mr.length
    const mOperatingHours=Math.max(0,plannedHoursPerMachine-mLossMin/60)
    return {machine_id:m.id,machine_no:m.machine_no,failures,lossMin:mLossMin,operatingHours:mOperatingHours,mtbf:failures?mOperatingHours/failures:null}
  })
  const affectedStats=stats.filter(x=>x.failures>0)
  const affectedMachineCount=affectedStats.length
  const affectedOperatingHours=affectedStats.reduce((s,x)=>s+x.operatingHours,0)

  // User-facing MTBF: weighted MTBF of machines that actually had a failure in the period.
  // Fleet MTBF is retained separately for reliability engineering reference.
  const mtbf=breakdowns?affectedOperatingHours/breakdowns:null
  const fleetMtbf=breakdowns?operatingHours/breakdowns:null
  const mttr=breakdowns?lossMin/breakdowns:0

  // Two different concepts are intentionally kept separate:
  // 1) Fleet Availability = total fleet uptime / total scheduled machine-hours.
  //    This is the conventional fleet calculation and becomes very high when many
  //    parallel machines are selected.
  // 2) Maintenance Time Efficiency = one selected calendar period minus accumulated
  //    breakdown loss time, divided by that same period. This is the department view
  //    requested by IJ management and makes the loss burden visible without multiplying
  //    the denominator by machine count.
  const fleetAvailability=plannedHours?Math.max(0,operatingHours/plannedHours*100):100
  const periodLossHours=lossMin/60
  const maintenanceLossRate=plannedHoursPerMachine?Math.min(100,Math.max(0,periodLossHours/plannedHoursPerMachine*100)):0
  const maintenanceEfficiency=Math.max(0,100-maintenanceLossRate)
  const affectedAvailability=affectedMachineCount
    ? Math.max(0,affectedOperatingHours/(plannedHoursPerMachine*affectedMachineCount)*100)
    : 100

  // Primary UI value: single machine = conventional machine availability;
  // multiple machines = department maintenance time efficiency. Fleet availability
  // remains available separately and is shown with an explicit label.
  const availability=machineCount===1?fleetAvailability:maintenanceEfficiency
  const failureRate1000=operatingHours?breakdowns/operatingHours*1000:0
  return {rows,lossMin,breakdowns,days,hoursPerDay:hoursDay,machineCount,plannedHoursPerMachine,plannedHours,operatingHours,affectedMachineCount,affectedOperatingHours,mtbf,fleetMtbf,mttr,availability,fleetAvailability,affectedAvailability,maintenanceEfficiency,maintenanceLossRate,failureRate1000,machineStats:stats}
}

export function tpmMetrics(jobs=[],from,to){
  const start=new Date(`${from}T00:00:00`), end=new Date(`${to}T23:59:59`)
  const rows=jobs.filter(j=>{const d=new Date(`${j.planned_date}T00:00:00`);return d>=start&&d<=end && j.job_status!=='cancelled'})
  const completed=rows.filter(j=>['completed','partial'].includes(j.job_status)).length
  return {rows,completed,completion:pct(completed,rows.length),overdue:rows.filter(j=>!['completed','partial'].includes(j.job_status)&&new Date(`${j.planned_date}T23:59:59`)<new Date()).length}
}

export function pmMetrics(schedule=[],from,to){
  const start=new Date(`${from}T00:00:00`),end=new Date(`${to}T23:59:59`)
  const due=schedule.filter(x=>{const d=new Date(`${x.due_date}T00:00:00`);return d>=start&&d<=end})
  const completed=due.filter(x=>x.status==='completed'||x.completed_at).length
  const overdue=schedule.filter(x=>!x.completed_at&&x.status!=='completed'&&new Date(`${x.due_date}T23:59:59`)<new Date()).length
  return {due,completed,compliance:pct(completed,due.length),overdue}
}

export function defectMetrics(findings=[],from,to){
  const start=new Date(`${from}T00:00:00`),end=new Date(`${to}T23:59:59`)
  const created=findings.filter(f=>{const d=new Date(f.created_at);return d>=start&&d<=end})
  const closed=created.filter(f=>f.status==='closed').length
  return {created,closed,closure:pct(closed,created.length),open:findings.filter(f=>f.status!=='closed').length,waitingSpare:findings.filter(f=>f.status==='waiting_spare').length}
}

export function groupLoss(repairs=[]){
  const map=new Map()
  repairs.forEach(r=>{const k=machineGroup(r.machine_no_snapshot);map.set(k,(map.get(k)||0)+(Number(r.loss_time_min)||0))})
  return [...map.entries()].sort((a,b)=>b[1]-a[1])
}

export function topLossMachines(repairs=[],limit=8){
  const map=new Map()
  repairs.forEach(r=>{const k=r.machine_no_snapshot||'-';const cur=map.get(k)||{machine:k,loss:0,count:0,issues:new Map()};cur.loss+=Number(r.loss_time_min)||0;cur.count++;const issue=r.symptom||'Unknown';cur.issues.set(issue,(cur.issues.get(issue)||0)+1);map.set(k,cur)})
  return [...map.values()].map(x=>({...x,topIssue:[...x.issues.entries()].sort((a,b)=>b[1]-a[1])[0]?.[0]||'-'})).sort((a,b)=>b.loss-a.loss).slice(0,limit)
}
