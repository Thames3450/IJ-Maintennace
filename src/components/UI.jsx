import React,{useEffect,useRef,useId} from 'react'
import {createPortal} from 'react-dom'
import { X, Loader2, ChevronDown, Check, Search } from '../icons.jsx'

export function Button({ children, variant='primary', size='md', className='', loading=false, icon:Icon, ...props }) {
  return <button className={`btn btn-${variant} btn-${size} ${className}`} {...props} disabled={loading || props.disabled}>
    {loading ? <Loader2 size={17} className="spin"/> : Icon ? <Icon size={17}/> : null}{children}
  </button>
}

export {default as SelectMenu} from './SelectMenu.jsx'
export function Badge({ children, tone='neutral' }) { return <span className={`badge badge-${tone}`}>{children}</span> }
export function Empty({ title='No data yet', text='ยังไม่มีข้อมูล' }) { return <div className="empty-state"><div className="empty-orb"/><strong>{title}</strong>{text && <span>{text}</span>}</div> }
export function Modal({ open, onClose, title, eyebrow, subtitle, children, wide=false, footer, busy=false }) {
  const card=useRef(null),titleId=useId()
  useEffect(()=>{
    if(!open)return
    const previous=document.activeElement,overflow=document.body.style.overflow
    document.body.style.overflow='hidden'
    card.current?.focus()
    const keyboard=e=>{
      if(e.key==='Escape'&&!busy&&!document.querySelector('.select-portal'))onClose()
      if(e.key==='Tab'&&!document.querySelector('.select-portal')){
        const nodes=[...card.current.querySelectorAll('button:not(:disabled),input:not(:disabled),textarea:not(:disabled),[tabindex="0"]')].filter(x=>x.getClientRects().length)
        if(!nodes.length){e.preventDefault();return}
        const first=nodes[0],last=nodes[nodes.length-1]
        if(e.shiftKey&&(document.activeElement===first||document.activeElement===card.current)){e.preventDefault();last.focus()}
        else if(!e.shiftKey&&(document.activeElement===last||document.activeElement===card.current)){e.preventDefault();first.focus()}
      }
    }
    document.addEventListener('keydown',keyboard)
    return()=>{document.body.style.overflow=overflow;document.removeEventListener('keydown',keyboard);previous?.focus()}
  },[open,busy])
  if (!open) return null
  return createPortal(<div className="modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&!busy&&onClose()}>
    <section ref={card} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-busy={busy} className={`modal-card ${wide?'modal-wide':''}`}>
      <header className="modal-header"><div>{eyebrow&&<p className="eyebrow">{eyebrow}</p>}<h3 id={titleId}>{title}</h3>{subtitle&&<span className="modal-subtitle">{subtitle}</span>}</div><button type="button" className="icon-button" aria-label="ปิดหน้าต่าง / Close dialog" disabled={busy} onClick={onClose}><X size={20}/></button></header>
      <div className="modal-body"><fieldset disabled={busy} className="modal-fields">{children}</fieldset></div>
      {footer && <footer className="modal-footer">{footer}</footer>}
    </section>
  </div>,document.body)
}
export function FormError({message}){return message?<div className="form-error" role="alert">{message}</div>:null}
export function Skeleton({ rows=3 }) { return <div className="skeleton-list">{Array.from({length:rows}).map((_,i)=><div key={i} className="skeleton-row"/>)}</div> }
export function PageIntro({title,th,description,children}){return <section className="page-intro"><div><h2>{th||title}</h2>{th&&<span>{title}</span>}{description&&<p>{description}</p>}</div>{children&&<div className="page-intro-actions">{children}</div>}</section>}
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
