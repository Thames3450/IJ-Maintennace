import React, { useMemo, useState } from 'react'
import {
  LayoutDashboard, CalendarRange, History, Wrench, ListChecks, ShieldCheck, LogOut, RefreshCcw, Plus,
  Boxes, ClipboardCheck, AlertTriangle, Lightbulb, Gauge, PackageSearch, FileBarChart, Menu, X, CheckCircle2, Users
} from '../icons.jsx'
import { Button } from './UI.jsx'
import {canOpenPage,roleLabel} from '../lib/access.js'

const HOME_ITEM=['menu','Main Menu','เมนูหลัก',LayoutDashboard]
const NAV_GROUPS = [
  {key:'operate',en:'Operations',th:'งานปฏิบัติการ',items:[
    ['dashboard','Dashboard','ภาพรวม',LayoutDashboard],['assets','Machines','เครื่องจักร',Boxes],['weekly','TPM Plan','แผน TPM',CalendarRange],['pm','PM Maintenance','มาตรฐานและงาน PM',ShieldCheck],['inspection','Inspection','ตรวจสภาพ',ClipboardCheck]
  ]},
  {key:'control',en:'Control',th:'ควบคุมและติดตาม',items:[
    ['defects','Defects','จุดผิดปกติ',AlertTriangle],['followup','Follow-up','งานติดตาม',ListChecks],['opportunity','Opportunity','โอกาสปรับปรุง',Lightbulb],['spares','Spare Parts','อะไหล่',PackageSearch]
  ]},
  {key:'records',en:'Records & Analysis',th:'ประวัติและวิเคราะห์',items:[
    ['history','Machine History','ประวัติเครื่อง',History],['repairs','Repair History','ประวัติซ่อม',Wrench],['kpi','KPI','ตัวชี้วัด',Gauge],['reports','Reports','รายงาน',FileBarChart]
  ]},
  {key:'system',en:'System',th:'ระบบและสิทธิ์',items:[['users','Users & Access','ผู้ใช้งานและสิทธิ์',Users]]}
]
const NAV=[HOME_ITEM,...NAV_GROUPS.flatMap(g=>g.items)]
const timeText=()=>new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date())

export default function Layout({ page, setPage, profile, onLogout, onRefresh, onNewPlan, planner, children, dataErrors=[],lastSynced }) {
  const [more,setMore]=useState(false)
  const role=profile?.role
  const roleInfo=roleLabel(role)
  const visibleGroups=useMemo(()=>NAV_GROUPS.map(g=>({...g,items:g.items.filter(([id])=>canOpenPage(role,id))})).filter(g=>g.items.length),[role])
  const visibleNav=useMemo(()=>[HOME_ITEM,...visibleGroups.flatMap(g=>g.items)],[visibleGroups])
  const mobileCore=useMemo(()=>['menu','dashboard','weekly','inspection','assets'].filter(id=>canOpenPage(role,id)).slice(0,4),[role])
  const lastSync=lastSynced?new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit',hour12:false}).format(lastSynced):'-'
  const [refreshing,setRefreshing]=useState(false)
  const current=useMemo(()=>visibleNav.find(n=>n[0]===page)||visibleNav[0],[page,visibleNav])
  const currentGroup=useMemo(()=>page==='menu'?['home','Main Menu','เมนูหลัก']:visibleGroups.find(g=>g.items.some(n=>n[0]===page))||visibleGroups[0],[page,visibleGroups])
  const go=id=>{if(!canOpenPage(role,id))return;setPage(id);setMore(false);window.scrollTo({top:0,behavior:'smooth'})}
  const refresh=async()=>{try{setRefreshing(true);await onRefresh?.()}finally{setRefreshing(false)}}

  return <div className="app-frame enterprise-shell">
    <aside className="sidebar enterprise-sidebar">
      <button className="brand enterprise-brand brand-home-button" onClick={()=>go('menu')}><div className="brand-logo"><img src="./ij-maintenance-logo.png" alt="IJ Maintenance" /></div><div><b>IJ Maintenance</b><span>Unified Maintenance System</span></div></button>
      <div className="system-identity"><span className="status-dot"/><div><b>MPR Unified Database</b><small>ฐานข้อมูลกลางงานซ่อมบำรุง</small></div></div>
      <nav className="side-nav side-nav-scroll grouped-nav">
        <section className="nav-section nav-home-section"><button className={page==='menu'?'active':''} onClick={()=>go('menu')}><span className="nav-icon-wrap"><LayoutDashboard size={17}/></span><span className="nav-copy"><b>เมนูหลัก</b><small>Main Menu</small></span></button></section>
        {visibleGroups.map(group=><section className="nav-section" key={group.key}><div className="nav-section-title"><span>{group.th}</span><small>{group.en}</small></div>{group.items.map(([id,en,th,Icon])=><button key={id} className={page===id?'active':''} onClick={()=>go(id)}><span className="nav-icon-wrap"><Icon size={17}/></span><span className="nav-copy"><b>{th}</b><small>{en}</small></span></button>)}</section>)}
      </nav>
      <div className="side-bottom">
        <div className="system-version-card"><span>System</span><b>IJ-MNT v14.0</b><small>Role Access · Employee ID</small></div>
        <div className="user-card role-user-card"><div className="avatar">{profile?.full_name?.slice(0,1)||'U'}</div><div className="grow"><b>{profile?.full_name}</b><span>{profile?.employee_code} · {roleInfo.th||roleInfo.en}</span></div><button className="user-logout-button" title="ออกจากระบบ" onClick={onLogout}><LogOut size={18}/></button></div>
      </div>
    </aside>

    <main className="content-shell enterprise-content">
      <header className="topbar enterprise-topbar"><div className="topbar-title-block"><div className="breadcrumb"><span>IJ Maintenance</span><i>/</i><span>{Array.isArray(currentGroup)?currentGroup[1]:currentGroup.en}</span></div><h1>{current?.[2]||'เมนูหลัก'}</h1><span className="topbar-sub">{current?.[1]||'Main Menu'}</span></div><div className="topbar-actions"><span className="role-chip">{roleInfo.en}</span><Button variant="ghost" icon={RefreshCcw} loading={refreshing} onClick={refresh}><span className="button-bi">Refresh<small>รีเฟรช</small></span></Button>{planner&&page!=='pm'&&<Button icon={Plus} onClick={onNewPlan}><span className="button-bi">Create TPM Plan<small>สร้างแผน TPM</small></span></Button>}<Button variant="ghost" icon={LogOut} onClick={onLogout}><span className="button-bi">Logout<small>ออกจากระบบ</small></span></Button></div></header>
      <div className="system-statusbar"><div><span className="status-dot"/><b>{dataErrors.length?'ข้อมูลโหลดไม่ครบ':'Database connected'}</b><small>MPR Maintenance · ฐานข้อมูลเดียวกัน</small></div><div><CheckCircle2 size={15}/><b>{roleInfo.en}</b><small>{profile?.employee_code} · {roleInfo.th}</small></div><div><RefreshCcw size={14}/><b>Last sync {lastSync}</b><small>อัปเดตข้อมูลล่าสุด</small></div><div className="statusbar-version"><b>v14.0</b><small>Role-based Access</small></div></div>
      <div className="page-wrap enterprise-page-wrap">{children}</div>
      <footer className="system-footer"><span>IJ Maintenance Unified System</span><i>•</i><span>Data source: MPR Maintenance</span><i>•</i><span>Internal use</span></footer>
    </main>

    <nav className="mobile-nav enterprise-mobile-nav">
      {mobileCore.map(id=>{const item=NAV.find(n=>n[0]===id);if(!item)return null;const [,en,th,Icon]=item;return <button key={id} className={page===id?'active':''} onClick={()=>go(id)}><Icon size={20}/><span>{id==='weekly'?'TPM':id==='dashboard'?'ภาพรวม':th}</span></button>})}
      <button className={mobileCore.includes(page)?'':'active'} onClick={()=>setMore(true)}><Menu size={20}/><span>More</span><small>เพิ่มเติม</small></button>
    </nav>
    {more&&<div className="mobile-more-backdrop" onClick={()=>setMore(false)}><section className="mobile-more-sheet enterprise-more-sheet" onClick={e=>e.stopPropagation()}><header><div><p className="eyebrow">IJ MODULES</p><h3>All Modules</h3><span>{roleInfo.en} · {roleInfo.th}</span></div><button className="icon-button" onClick={()=>setMore(false)}><X size={20}/></button></header>{visibleGroups.map(group=><div className="mobile-module-group" key={group.key}><div className="mobile-module-title"><b>{group.en}</b><small>{group.th}</small></div><div className="mobile-more-grid">{group.items.filter(([id])=>!mobileCore.includes(id)).map(([id,en,th,Icon])=><button key={id} className={page===id?'active':''} onClick={()=>go(id)}><Icon size={22}/><b>{th}</b><small>{en}</small></button>)}</div></div>)}<button className="mobile-sheet-logout" onClick={onLogout}><LogOut size={18}/>ออกจากระบบ · Logout</button></section></div>}
  </div>
}
