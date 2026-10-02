import React from 'react'
import {
  LayoutDashboard, Boxes, CalendarRange, ClipboardCheck, AlertTriangle, ListChecks,
  Lightbulb, History, Wrench, Gauge, PackageSearch, ShieldCheck, FileBarChart,
  Plus, ArrowRight, CheckCircle2, Activity, Clock3
} from '../icons.jsx'
import { Button } from '../components/UI.jsx'

const GROUPS=[
  {
    key:'operations',
    en:'Operations', th:'งานปฏิบัติการ',
    desc:'Daily maintenance work and machine condition control. · งานประจำวันที่ใช้ดูแลสภาพและวางแผนเครื่องจักร',
    items:[
      ['dashboard','Dashboard','ภาพรวม','View current maintenance status, open work and important alerts.','ดูภาพรวมสถานะงานซ่อม งานค้าง และจุดที่ต้องติดตาม',LayoutDashboard],
      ['assets','Machines','เครื่องจักร','Open machine profiles, condition and recent maintenance activity.','เปิดข้อมูลรายเครื่อง สภาพเครื่อง และกิจกรรมล่าสุด',Boxes],
      ['weekly','TPM / PM','แผน TPM / PM','Create and follow multi-machine preventive maintenance plans.','สร้างและติดตามแผน TPM/PM แบบหลายเครื่อง',CalendarRange],
      ['inspection','Inspection','ตรวจสภาพ','Perform condition inspection and record abnormal findings.','ตรวจสภาพเครื่องและบันทึกจุดผิดปกติ',ClipboardCheck],
    ]
  },
  {
    key:'control',
    en:'Control & Follow-up', th:'ควบคุมและติดตาม',
    desc:'Control abnormal conditions, pending actions and spare support. · จัดการปัญหา งานค้าง และสิ่งที่ต้องติดตามต่อ',
    items:[
      ['defects','Defects','จุดผิดปกติ','Review abnormal findings from TPM, inspection and repair work.','ดูจุดผิดปกติจาก TPM การตรวจสภาพ และงานซ่อม',AlertTriangle],
      ['followup','Follow-up','งานติดตาม','Track waiting spare, waiting machine stop and open actions.','ติดตามงานรออะไหล่ รอหยุดเครื่อง และงานค้าง',ListChecks],
      ['opportunity','Opportunity','โอกาสปรับปรุง','Capture reliability and maintainability improvement opportunities.','เก็บโอกาสปรับปรุงด้าน Reliability และการซ่อมบำรุง',Lightbulb],
      ['spares','Spare Parts','อะไหล่','Review requests and update spare request status.','ดูรายการขออะไหล่และอัปเดตสถานะ',PackageSearch],
    ]
  },
  {
    key:'records',
    en:'Records & Analysis', th:'ประวัติและวิเคราะห์',
    desc:'Trace machine history, analyze KPI and prepare management reports. · ใช้ย้อนประวัติ วิเคราะห์ KPI และจัดทำรายงาน',
    items:[
      ['history','Machine History','ประวัติเครื่อง','One timeline for Repair, TPM/PM, Inspection, Defect and Opportunity.','รวมประวัติ Repair, TPM/PM, Inspection, Defect และ Opportunity ในหน้าเดียว',History],
      ['repairs','Repair History','ประวัติซ่อม','Review breakdown and corrective maintenance history.','ดูประวัติงานเสียและงานซ่อมย้อนหลัง',Wrench],
      ['kpi','KPI','ตัวชี้วัด','Analyze MTBF, MTTR, Availability, Downtime and TPM performance.','วิเคราะห์ MTBF, MTTR, Availability, Downtime และผลงาน TPM',Gauge],
      ['pm','PM Standard','มาตรฐาน PM','Manage preventive maintenance standards and due work.','จัดการมาตรฐาน PM และงานที่ถึงกำหนด',ShieldCheck],
      ['reports','Reports','รายงาน','Prepare executive maintenance report for management and production.','จัดทำรายงานสรุปสำหรับผู้จัดการและ Production',FileBarChart],
    ]
  }
]

export default function MainMenu({profile,jobs=[],repairs=[],findings=[],spares=[],onGo,onNewPlan,planner}){
  const activeJobs=jobs.filter(j=>!['completed','partial','cancelled'].includes(j.job_status)).length
  const openFindings=findings.filter(f=>f.status!=='closed').length
  const waitingSpare=findings.filter(f=>f.status==='waiting_spare').length
  const repair30=repairs.filter(r=>Date.now()-new Date(r.started_at).getTime()<=30*86400000).length

  return <div className="main-menu-page">
    <section className="menu-welcome card">
      <div className="menu-welcome-copy">
        <span className="eyebrow">IJ MAINTENANCE CONTROL CENTER</span>
        <h2>Main Menu</h2>
        <p className="menu-welcome-th">เมนูหลักระบบซ่อมบำรุงแผนก IJ</p>
        <p>Select the module you want to work with. Every module uses the same MPR Maintenance database and machine history. <span>เลือกเมนูที่ต้องการใช้งาน โดยข้อมูลทั้งหมดเชื่อมอยู่ในฐาน MPR Maintenance เดียวกัน</span></p>
        <div className="menu-user-line"><CheckCircle2 size={17}/><span>Direct workspace <b>IJ Maintenance</b></span><small>No Login · เปิดระบบและใช้งานได้ทันที</small></div>
      </div>
      <div className="menu-quick-actions">
        {planner&&<Button icon={Plus} onClick={onNewPlan}>Create TPM Plan <small>สร้างแผน TPM</small></Button>}
        <Button variant="ghost" icon={LayoutDashboard} onClick={()=>onGo('dashboard')}>Open Dashboard <small>เปิดภาพรวม</small></Button>
      </div>
    </section>

    <section className="menu-status-strip">
      <StatusMini icon={CalendarRange} label="Open TPM / PM" th="งานแผนที่ยังไม่ปิด" value={activeJobs}/>
      <StatusMini icon={AlertTriangle} label="Open Defects" th="จุดผิดปกติคงค้าง" value={openFindings}/>
      <StatusMini icon={PackageSearch} label="Waiting Spare" th="งานรออะไหล่" value={waitingSpare}/>
      <StatusMini icon={Wrench} label="Repairs / 30 Days" th="งานซ่อม 30 วัน" value={repair30}/>
    </section>

    <div className="menu-groups">
      {GROUPS.map(group=><section className="menu-group" key={group.key}>
        <header className="menu-group-header">
          <div><b>{group.en}</b><small>{group.th}</small></div>
          <p>{group.desc}</p>
        </header>
        <div className="module-grid">
          {group.items.map(([id,en,th,desc,descTh,Icon])=><button className="module-card" key={id} onClick={()=>onGo(id)}>
            <span className="module-icon"><Icon size={24}/></span>
            <span className="module-card-copy">
              <b>{en}</b><small className="module-th">{th}</small>
              <p>{desc}<span>{descTh}</span></p>
            </span>
            <span className="module-arrow"><ArrowRight size={16}/></span>
          </button>)}
        </div>
      </section>)}
    </div>
  </div>
}

function StatusMini({icon:Icon,label,th,value}){
  return <article className="menu-status-card"><span className="menu-status-icon"><Icon size={20}/></span><div><small>{label}<span>{th}</span></small><b>{value}</b></div></article>
}
