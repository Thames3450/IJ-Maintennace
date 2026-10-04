import React,{useEffect,useId,useLayoutEffect,useRef,useState} from 'react'
import {createPortal} from 'react-dom'
import {ChevronDown,Check,Search,X} from '../icons.jsx'

export default function SelectMenu({value,onChange,options=[],placeholder='เลือก / Select',disabled=false,className='',searchable=false,compact=false}){
 const [open,setOpen]=useState(false),[query,setQuery]=useState(''),[position,setPosition]=useState({}),[active,setActive]=useState(0)
 const root=useRef(null),popup=useRef(null),trigger=useRef(null),list=useRef(null),search=useRef(null),id=useId()
 const norm=options.map(o=>typeof o==='string'?{value:o,label:o}:o),current=norm.find(o=>String(o.value)===String(value))
 const filtered=norm.filter(o=>`${o.label||''} ${o.sub||''}`.toLowerCase().includes(query.trim().toLowerCase()))
 const close=(focus=false)=>{setOpen(false);setQuery('');if(focus)trigger.current?.focus()}
 const choose=(v,e)=>{e?.preventDefault();e?.stopPropagation();close(true);onChange?.(v)}
 useEffect(()=>{if(disabled)close()},[disabled])
 useLayoutEffect(()=>{
  if(!open)return
  const place=()=>{const rect=trigger.current?.getBoundingClientRect();if(!rect)return;const mobile=window.innerWidth<=820;const width=mobile?window.innerWidth-24:Math.min(Math.max(rect.width,240),window.innerWidth-24);const available=window.innerHeight-rect.bottom-16;const above=available<200&&rect.top>available;const height=Math.max(100,Math.min(360,above?rect.top-16:available));setPosition(mobile?{left:12,right:12,bottom:12,top:'auto',maxHeight:'70dvh'}:{left:Math.max(12,Math.min(rect.left,window.innerWidth-width-12)),width,top:above?'auto':rect.bottom+6,bottom:above?window.innerHeight-rect.top+6:'auto',maxHeight:height})}
  place();window.addEventListener('resize',place);window.addEventListener('scroll',place,true)
  return()=>{window.removeEventListener('resize',place);window.removeEventListener('scroll',place,true)}
 },[open])
 useEffect(()=>{
  if(!open)return
  setActive(Math.max(0,filtered.findIndex(o=>String(o.value)===String(value))))
  if(searchable)search.current?.focus();else list.current?.focus()
  const outside=e=>{if(!root.current?.contains(e.target)&&!popup.current?.contains(e.target))close()}
  const escape=e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close(true)}}
  const focusOutside=e=>{if(!root.current?.contains(e.target)&&!popup.current?.contains(e.target))close()}
  document.addEventListener('pointerdown',outside);document.addEventListener('keydown',escape,true);document.addEventListener('focusin',focusOutside)
  return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape,true);document.removeEventListener('focusin',focusOutside)}
 },[open])
 const keyboard=e=>{
  if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();const next=Math.max(0,Math.min(filtered.length-1,active+(e.key==='ArrowDown'?1:-1)));setActive(next);list.current?.children[next]?.scrollIntoView({block:'nearest'})}
  if(e.key==='Enter'&&filtered[active])choose(filtered[active].value,e)
  if(e.key==='Tab')close()
 }
 return <div ref={root} className={`select-menu ${open?'open':''} ${compact?'compact':''} ${disabled?'disabled':''} ${className}`}>
  <button ref={trigger} type="button" className="select-menu-trigger" disabled={disabled} onClick={e=>{e.preventDefault();e.stopPropagation();setOpen(v=>!v)}} onKeyDown={e=>{if(['ArrowDown','ArrowUp'].includes(e.key)){e.preventDefault();setOpen(true)}}} aria-haspopup="listbox" aria-controls={open?id:undefined} aria-expanded={open}>
   <span className="select-menu-value"><b>{current?.label||placeholder}</b>{current?.sub&&<small>{current.sub}</small>}</span><ChevronDown size={16} className="select-chevron"/>
  </button>
  {open&&createPortal(<div ref={popup} className="select-menu-popover select-portal" style={position} onClick={e=>e.stopPropagation()}>
   <div className="select-popup-head"><b>เลือกตัวเลือก / Select</b><button type="button" aria-label="ปิดตัวเลือก / Close options" onClick={()=>close(true)}><X size={18}/></button></div>
   {searchable&&<div className="select-menu-search"><Search size={15}/><input ref={search} value={query} onChange={e=>{setQuery(e.target.value);setActive(0)}} onKeyDown={keyboard} placeholder="ค้นหาเครื่อง / ตัวเลือก" aria-label="ค้นหาตัวเลือก / Search options"/></div>}
   <div ref={list} id={id} role="listbox" tabIndex={0} aria-activedescendant={filtered[active]?`${id}-${active}`:undefined} className="select-menu-options" onKeyDown={keyboard}>
    {filtered.length?filtered.map((o,i)=><button type="button" role="option" id={`${id}-${i}`} aria-selected={String(o.value)===String(value)} key={`${o.value}-${i}`} className={`select-option ${String(o.value)===String(value)?'active':''} ${i===active?'keyboard-active':''}`} onMouseEnter={()=>setActive(i)} onClick={e=>choose(o.value,e)}><span><b>{o.label}</b>{o.sub&&<small>{o.sub}</small>}</span>{String(o.value)===String(value)&&<Check size={15}/>}</button>):<div className="select-empty">ไม่พบตัวเลือก / No option</div>}
   </div>
  </div>,document.body)}
 </div>
}
