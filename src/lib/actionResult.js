// Store work evidence in the existing verification_note column, preserving old notes.
const WORK='[ผลดำเนินการจริง / Work result]\n'
const VERIFY='\n[ผลตรวจยืนยัน / Verification]\n'
export function encodeActionResult(workResult='',verification=''){
 return workResult.trim()?`${WORK}${workResult.trim()}${VERIFY}${verification.trim()}`:verification.trim()
}
export function decodeActionResult(note=''){
 if(!note.startsWith(WORK))return {work_result:'',verification_note:note}
 const split=note.indexOf(VERIFY,WORK.length)
 return {work_result:split<0?note.slice(WORK.length):note.slice(WORK.length,split),verification_note:split<0?'':note.slice(split+VERIFY.length)}
}
