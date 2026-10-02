import React, { useMemo, useState } from 'react'
import {
  LayoutDashboard, CalendarRange, History, Wrench, ListChecks, ShieldCheck, LogOut, RefreshCcw, Plus,
  Boxes, ClipboardCheck, AlertTriangle, Lightbulb, Gauge, PackageSearch, FileBarChart, Menu, X, CheckCircle2
} from '../icons.jsx'
import { Button } from './UI.jsx'

const HOME_ITEM=['menu','Main Menu','เมนูหลัก',LayoutDashboard]

const NAV_GROUPS = [
  {
    key:'operate', en:'Operations', th:'งานปฏิบัติการ',
    items:[
      ['dashboard','Dashboard','ภาพรวม',LayoutDashboard],
      ['assets','Machines','เครื่องจักร',Boxes],
      ['weekly','TPM / PM','แผนงาน',CalendarRange],
      ['inspection','Inspection','ตรวจสภาพ',ClipboardCheck],
    ]
  },
  {
    key:'control', en:'Control', th:'ควบคุมและติดตาม',
    items:[
      ['defects','Defects','จุดผิดปกติ',AlertTriangle],
      ['followup','Follow-up','งานติดตาม',ListChecks],
      ['opportunity','Opportunity','โอกาสปรับปรุง',Lightbulb],
      ['spares','Spare Parts','อะไหล่',PackageSearch],
    ]
  },
  {
    key:'records', en:'Records & Analysis', th:'ประวัติและวิเคราะห์',
    items:[
      ['history','Machine History','ประวัติเครื่อง',History],
      ['repairs','Repair History','ประวัติซ่อม',Wrench],
      ['kpi','KPI','ตัวชี้วัด',Gauge],
      ['pm','PM Standard','มาตรฐาน PM',ShieldCheck],
      ['reports','Reports','รายงาน',FileBarChart],
    ]
  }
]
const NAV = [HOME_ITEM,...NAV_GROUPS.flatMap(g=>g.items)]
const MOBILE_CORE=['menu','weekly','inspection','kpi']
const timeText=()=>new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date())

export default function Layout({ page, setPage, profile, onLogout, onRefresh, onNewPlan, planner, children }) {
  const [more,setMore]=useState(false)
  const [lastSync,setLastSync]=useState(timeText())
  const [refreshing,setRefreshing]=useState(false)
  const current=useMemo(()=>NAV.find(n=>n[0]===page)||NAV[0],[page])
  const currentGroup=useMemo(()=>page==='menu'?['home','Main Menu','เมนูหลัก']:NAV_GROUPS.find(g=>g.items.some(n=>n[0]===page))||NAV_GROUPS[0],[page])
  const go=(id)=>{setPage(id);setMore(false);window.scrollTo({top:0,behavior:'smooth'})}
  const refresh=async()=>{
    try{setRefreshing(true);await onRefresh?.();setLastSync(timeText())}finally{setRefreshing(false)}
  }

  return <div className="app-frame enterprise-shell">
    <aside className="sidebar enterprise-sidebar">
      <button className="brand enterprise-brand brand-home-button" onClick={()=>go('menu')}>
        <div className="brand-logo"><img src="./ij-maintenance-logo.png" alt="IJ Maintenance" /></div>
        <div><b>IJ Maintenance</b><span>Unified Maintenance System</span></div>
      </button>
      <div className="system-identity">
        <span className="status-dot"/><div><b>MPR Unified Database</b><small>ฐานข้อมูลกลางงานซ่อมบำรุง</small></div>
      </div>
      <nav className="side-nav side-nav-scroll grouped-nav">
        <section className="nav-section nav-home-section"><button className={page==='menu'?'active':''} onClick={()=>go('menu')}><span className="nav-icon-wrap"><LayoutDashboard size={17}/></span><span className="nav-copy"><b>Main Menu</b><small>เมนูหลัก</small></span></button></section>
        {NAV_GROUPS.map(group=><section className="nav-section" key={group.key}>
          <div className="nav-section-title"><span>{group.en}</span><small>{group.th}</small></div>
          {group.items.map(([id,en,th,Icon])=><button key={id} className={page===id?'active':''} onClick={()=>go(id)}>
            <span className="nav-icon-wrap"><Icon size={17}/></span>
            <span className="nav-copy"><b>{en}</b><small>{th}</small></span>
          </button>)}
        </section>)}
      </nav>
      <div className="side-bottom">
        <div className="system-version-card"><span>System</span><b>IJ-MNT v13.3</b><small>Direct Access · No Login</small></div>
        <div className="user-card"><div className="avatar">{profile?.full_name?.slice(0,1)||'U'}</div><div><b>{profile?.full_name}</b><span>{profile?.employee_code} · {profile?.role}</span></div></div>
      </div>
    </aside>

    <main className="content-shell enterprise-content">
      <header className="topbar enterprise-topbar">
        <div className="topbar-title-block">
          <div className="breadcrumb"><span>IJ Maintenance</span><i>/</i><span>{currentGroup[1]}</span></div>
          <h1>{current[1]}</h1><span className="topbar-sub">{current[2]}</span>
        </div>
        <div className="topbar-actions">
          <span className="role-chip">{profile?.role?.toUpperCase()}</span>
          <Button variant="ghost" icon={RefreshCcw} loading={refreshing} onClick={refresh}><span className="button-bi">Refresh<small>รีเฟรช</small></span></Button>
          {planner&&<Button icon={Plus} onClick={onNewPlan}><span className="button-bi">Create TPM Plan<small>สร้างแผน TPM</small></span></Button>}
        </div>
      </header>

      <div className="system-statusbar">
        <div><span className="status-dot"/><b>Database connected</b><small>MPR Maintenance · ฐานข้อมูลเดียวกัน</small></div>
        <div><CheckCircle2 size={15}/><b>Direct access</b><small>เปิดใช้งานทันที · ไม่ต้อง Login</small></div>
        <div><RefreshCcw size={14}/><b>Last sync {lastSync}</b><small>อัปเดตข้อมูลล่าสุด</small></div>
        <div className="statusbar-version"><b>v13.3</b><small>No Login Mode</small></div>
      </div>

      <div className="page-wrap enterprise-page-wrap">{children}</div>
      <footer className="system-footer"><span>IJ Maintenance Unified System</span><i>•</i><span>Data source: MPR Maintenance</span><i>•</i><span>Internal use</span></footer>
    </main>

    <nav className="mobile-nav enterprise-mobile-nav">
      {MOBILE_CORE.map(id=>{const [,en,th,Icon]=NAV.find(n=>n[0]===id);return <button key={id} className={page===id?'active':''} onClick={()=>go(id)}><Icon size={20}/><span>{en}</span><small>{th}</small></button>})}
      <button className={MOBILE_CORE.includes(page)?'':'active'} onClick={()=>setMore(true)}><Menu size={20}/><span>More</span><small>เพิ่มเติม</small></button>
    </nav>

    {more&&<div className="mobile-more-backdrop" onClick={()=>setMore(false)}>
      <section className="mobile-more-sheet enterprise-more-sheet" onClick={e=>e.stopPropagation()}>
        <header><div><p className="eyebrow">IJ MODULES</p><h3>All Modules</h3><span>เมนูทั้งหมด</span></div><button className="icon-button" onClick={()=>setMore(false)}><X size={20}/></button></header>
        {NAV_GROUPS.map(group=><div className="mobile-module-group" key={group.key}>
          <div className="mobile-module-title"><b>{group.en}</b><small>{group.th}</small></div>
          <div className="mobile-more-grid">{group.items.filter(([id])=>!MOBILE_CORE.includes(id)).map(([id,en,th,Icon])=><button key={id} className={page===id?'active':''} onClick={()=>go(id)}><Icon size={22}/><b>{en}</b><small>{th}</small></button>)}</div>
        </div>)}
      </section>
    </div>}
  </div>
}
