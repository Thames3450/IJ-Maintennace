import React,{useEffect,useRef,useState} from 'react'
import { X, Loader2, ChevronDown, Check, Search } from '../icons.jsx'

export function Button({ children, variant='primary', size='md', className='', loading=false, icon:Icon, ...props }) {
  return <button className={`btn btn-${variant} btn-${size} ${className}`} {...props} disabled={loading || props.disabled}>
    {loading ? <Loader2 size={17} className="spin"/> : Icon ? <Icon size={17}/> : null}{children}
  </button>
}

export function SelectMenu({value,onChange,options=[],placeholder='Select',disabled=false,className='',searchable=false,compact=false}){
  const [open,setOpen]=useState(false),[query,setQuery]=useState('')
  const ref=useRef(null)
  useEffect(()=>{const close=e=>{if(ref.current&&!ref.current.contains(e.target))setOpen(false)};document.addEventListener('mousedown',close);return()=>document.removeEventListener('mousedown',close)},[])
  useEffect(()=>{if(!open)setQuery('')},[open])
  const norm=options.map(o=>typeof o==='string'?{value:o,label:o}:o)
  const current=norm.find(o=>String(o.value)===String(value))
  const filtered=query?norm.filter(o=>`${o.label||''} ${o.sub||''}`.toLowerCase().includes(query.toLowerCase())):norm
  const choose=v=>{onChange?.(v);setOpen(false)}
  return <div ref={ref} className={`select-menu ${open?'open':''} ${compact?'compact':''} ${disabled?'disabled':''} ${className}`}>
    <button type="button" className="select-menu-trigger" disabled={disabled} onClick={()=>!disabled&&setOpen(v=>!v)} aria-expanded={open}>
      <span className="select-menu-value">
        <b>{current?.label||placeholder}</b>
        {current?.sub&&<small>{current.sub}</small>}
      </span>
      <ChevronDown size={16} className="select-chevron"/>
    </button>
    {open&&<div className="select-menu-popover">
      {searchable&&<div className="select-menu-search"><Search size={15}/><input autoFocus value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search / ค้นหา"/></div>}
      <div className="select-menu-options">
        {filtered.length?filtered.map((o,i)=><button type="button" key={`${o.value}-${i}`} className={`select-option ${String(o.value)===String(value)?'active':''}`} onClick={()=>choose(o.value)}>
          <span><b>{o.label}</b>{o.sub&&<small>{o.sub}</small>}</span>{String(o.value)===String(value)&&<Check size={15}/>}
        </button>):<div className="select-empty">No option <small>ไม่พบตัวเลือก</small></div>}
      </div>
    </div>}
  </div>
}
export function Badge({ children, tone='neutral' }) { return <span className={`badge badge-${tone}`}>{children}</span> }
export function Empty({ title='No data yet', text='ยังไม่มีข้อมูล' }) { return <div className="empty-state"><div className="empty-orb"/><strong>{title}</strong>{text && <span>{text}</span>}</div> }
export function Modal({ open, onClose, title, eyebrow, subtitle, children, wide=false, footer }) {
  if (!open) return null
  return <div className="modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&onClose()}>
    <section className={`modal-card ${wide?'modal-wide':''}`}>
      <header className="modal-header"><div>{eyebrow&&<p className="eyebrow">{eyebrow}</p>}<h3>{title}</h3>{subtitle&&<span className="modal-subtitle">{subtitle}</span>}</div><button className="icon-button" onClick={onClose}><X size={20}/></button></header>
      <div className="modal-body">{children}</div>
      {footer && <footer className="modal-footer">{footer}</footer>}
    </section>
  </div>
}
export function Skeleton({ rows=3 }) { return <div className="skeleton-list">{Array.from({length:rows}).map((_,i)=><div key={i} className="skeleton-row"/>)}</div> }
export function PageIntro({title,th,description,children}){return <section className="page-intro"><div><h2>{title}</h2>{th&&<span>{th}</span>}{description&&<p>{description}</p>}</div>{children&&<div className="page-intro-actions">{children}</div>}</section>}
export function FieldLabel({en,th}){return <span className="field-bi"><b>{en}</b>{th&&<small>{th}</small>}</span>}

export function PriorityGuide({compact=false,title="Priority / Criticality Guide"}){
  return <section className={`priority-guide ${compact?'compact':''}`}>
    {!compact&&<header><b>{title}</b><small>ความหมายระดับ A / B / C</small></header>}
    <div className="priority-guide-grid">
      <div className="priority-a"><strong>A</strong><span><b>Critical</b><small>วิกฤต · เกี่ยวกับ Safety, เครื่องหยุด, เสียหายรุนแรง หรือเสี่ยงเกิด Downtime สูง — ต้องจัดการทันที</small></span></div>
      <div className="priority-b"><strong>B</strong><span><b>Important</b><small>สำคัญ · เริ่มเสื่อม/มีผลต่อ Reliability และอาจพัฒนาเป็น Breakdown — วาง Corrective / TPM โดยเร็ว</small></span></div>
      <div className="priority-c"><strong>C</strong><span><b>Routine</b><small>ทั่วไป · จุดเล็กน้อย/5S/สภาพที่ยังใช้งานได้ — เฝ้าติดตามและจัดการใน Planned PM</small></span></div>
    </div>
  </section>
}
