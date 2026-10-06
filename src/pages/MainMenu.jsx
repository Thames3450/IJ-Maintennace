import React from 'react'
import {
  LayoutDashboard, Boxes, CalendarRange, ClipboardCheck, AlertTriangle, ListChecks,
  Lightbulb, History, Wrench, Gauge, PackageSearch, ShieldCheck, FileBarChart,
  Plus, ArrowRight, CheckCircle2, Users
} from '../icons.jsx'
import { Button } from '../components/UI.jsx'
import {canOpenPage,roleLabel,isEngineer,isMaintainer,isManager,isProduction} from '../lib/access.js'

const GROUPS=[
  {key:'operations',en:'Operations',th:'งานปฏิบัติการ',items:[
    ['dashboard','Dashboard','ภาพรวม','ดูภาพรวมสถานะงานซ่อม งานค้าง และจุดที่ต้องติดตาม',LayoutDashboard],
    ['assets','Machines','เครื่องจักร','เปิดข้อมูลรายเครื่อง สภาพเครื่อง และกิจกรรมล่าสุด',Boxes],
    ['weekly','TPM Plan','แผน TPM','ดูปฏิทิน วางแผน หรือเปิดงานตามสิทธิ์ของคุณ',CalendarRange],
    ['pm','PM Maintenance','มาตรฐานและงาน PM','เปิดมาตรฐาน ตาราง PM และผลรายข้อ',ShieldCheck],
    ['inspection','Inspection','ตรวจสภาพ','ตรวจสภาพเครื่องและบันทึกจุดผิดปกติ',ClipboardCheck]
  ]},
  {key:'control',en:'Control & Follow-up',th:'ควบคุมและติดตาม',items:[
    ['defects','Defects','จุดผิดปกติ','ดูจุดผิดปกติจาก TPM การตรวจสภาพ และงานซ่อม',AlertTriangle],
    ['followup','Follow-up','งานติดตาม','ติดตามงานรออะไหล่ รอหยุดเครื่อง และงานค้าง',ListChecks],
    ['opportunity','Opportunity','โอกาสปรับปรุง','เก็บและติดตามโอกาสปรับปรุง Reliability',Lightbulb],
    ['spares','Spare Parts','อะไหล่','ดูคำขออะไหล่และสถานะการจัดหา',PackageSearch],
    ['users','Users & Access','ผู้ใช้งานและสิทธิ์','อนุมัติผู้ใช้ กำหนดตำแหน่ง และเปิด/ปิดสิทธิ์',Users]
  ]},
  {key:'records',en:'Records & Analysis',th:'ประวัติและวิเคราะห์',items:[
    ['history','Machine History','ประวัติเครื่อง','รวม Repair, TPM/PM, Inspection และ Defect รายเครื่อง',History],
    ['repairs','Repair History','ประวัติซ่อม','ดู Breakdown, Corrective และ Loss Time ย้อนหลัง',Wrench],
    ['kpi','KPI','ตัวชี้วัด','วิเคราะห์ MTBF, MTTR, Availability, Downtime และผลงาน TPM',Gauge],
    ['reports','Reports','รายงาน','รายงานสรุปสำหรับผู้จัดการและ Production',FileBarChart]
  ]}
]

const roleIntro=role=>{
 if(isEngineer(role))return ['Maintenance Control Center','วางแผน ทำงาน ตรวจเครื่อง ตรวจรับ และจัดการระบบได้ครบ']
 if(isMaintainer(role))return ['My Maintenance Workspace','เปิดงานที่ได้รับมอบหมาย ตรวจเครื่อง ทำงาน และบันทึกผล']
 if(isManager(role))return ['Management Overview','ติดตามสุขภาพเครื่อง Loss Time แผน TPM/PM และอนุมัติงาน']
 if(isProduction(role))return ['Production & Planning View','ดูภาพรวมเครื่อง ปฏิทิน Maintenance และยืนยันช่วงหยุดเครื่อง']
 return ['IJ Maintenance','ระบบซ่อมบำรุงแผนก IJ']
}

export default function MainMenu({profile,jobs=[],repairs=[],findings=[],spares=[],onGo,onNewPlan,planner,onNewFinding}){
  const activeJobs=jobs.filter(j=>!['completed','cancelled'].includes(j.job_status)).length
  const openFindings=findings.filter(f=>f.status!=='closed').length
  const waitingSpare=findings.filter(f=>f.status==='waiting_spare').length
  const repair30=repairs.filter(r=>Date.now()-new Date(r.started_at).getTime()<=30*86400000).length
  const [introEn,introTh]=roleIntro(profile.role),role=roleLabel(profile.role)
  const groups=GROUPS.map(g=>({...g,items:g.items.filter(([id])=>canOpenPage(profile.role,id))})).filter(g=>g.items.length)
  return <div className="main-menu-page">
    <section className="menu-welcome card"><div className="menu-welcome-copy"><span className="eyebrow">{introEn.toUpperCase()}</span><h2>สวัสดี {profile.full_name}</h2><p className="menu-welcome-th">{introTh}</p><p>ระบบจะแสดงเมนูและสิทธิ์ตามตำแหน่ง <b>{role.en}</b> · {role.th}</p><div className="menu-user-line"><CheckCircle2 size={17}/><span>Employee ID <b>{profile.employee_code}</b></span><small>Role-based access · สิทธิ์ตามตำแหน่ง</small></div></div><div className="menu-quick-actions">{planner&&<Button icon={Plus} onClick={onNewPlan}>Create TPM Plan <small>สร้างแผน TPM</small></Button>}<Button variant="ghost" icon={LayoutDashboard} onClick={()=>onGo('dashboard')}>Open Dashboard <small>เปิดภาพรวม</small></Button></div></section>

    {isMaintainer(profile.role)&&<section className="start-task-panel"><h3>เริ่มจากงานที่ต้องการ</h3><div className="start-task-grid">{canOpenPage(profile.role,'inspection')&&<button onClick={()=>onGo('inspection')}><ClipboardCheck/><b>ตรวจสภาพเครื่อง</b><small>Engineer และช่างตรวจและบันทึกผลได้</small></button>}{canOpenPage(profile.role,'defects')&&<button onClick={onNewFinding}><AlertTriangle/><b>พบปัญหา / แจ้งจุดผิดปกติ</b><small>เลือกเครื่อง ระบุปัญหา และแนบรูป</small></button>}<button onClick={()=>onGo('weekly')}><CalendarRange/><b>งาน TPM ของทีม</b><small>ดูแผน ผู้รับผิดชอบ และเปิดทำงาน</small></button><button onClick={()=>onGo('pm')}><ShieldCheck/><b>งาน PM</b><small>เปิดใบงานและบันทึกผล PM</small></button></div></section>}

    <section className="menu-status-strip"><StatusMini icon={CalendarRange} label="Open TPM" th="งานแผนที่ยังไม่ปิด" value={activeJobs}/><StatusMini icon={AlertTriangle} label="Open Defects" th="จุดผิดปกติคงค้าง" value={openFindings}/><StatusMini icon={PackageSearch} label="Waiting Spare" th="งานรออะไหล่" value={waitingSpare}/><StatusMini icon={Wrench} label="Repairs / 30 Days" th="งานซ่อม 30 วัน" value={repair30}/></section>

    <div className="menu-groups">{groups.map(group=><section className="menu-group" key={group.key}><header className="menu-group-header"><div><b>{group.th}</b><small>{group.en}</small></div></header><div className="module-grid">{group.items.map(([id,en,th,desc,Icon])=><button className="module-card" key={id} onClick={()=>onGo(id)}><span className="module-icon"><Icon size={24}/></span><span className="module-card-copy"><b>{th}</b><small className="module-th">{en}</small><p>{desc}</p></span><span className="module-arrow"><ArrowRight size={16}/></span></button>)}</div></section>)}</div>
  </div>
}
function StatusMini({icon:Icon,label,th,value}){return <article className="menu-status-card"><span className="menu-status-icon"><Icon size={20}/></span><div><small>{label}<span>{th}</span></small><b>{value}</b></div></article>}
