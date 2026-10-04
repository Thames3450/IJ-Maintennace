import React from 'react'

export default function PhotoRemoveButton({name, disabled=false, onRemove}) {
  const remove=()=>{
    if(disabled)return
    if(window.confirm(`นำรูป “${name || 'รูปที่เลือก'}” ออกจากรายการแนบหรือไม่?`))onRemove()
  }
  return <button type="button" className="photo-remove-btn" disabled={disabled} aria-label={`นำรูปออก: ${name || 'รูปที่เลือก'}`} title="นำรูปออก" onClick={remove}>
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6L6 18"/></svg>
  </button>
}
