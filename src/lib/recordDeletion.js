export const RECORD_NAMES={finding:'งานติดตาม / จุดผิดปกติ',tpm_job:'งาน TPM',inspection:'ผลตรวจเครื่อง',opportunity:'รายการปรับปรุง',spare_request:'คำขออะไหล่',pm_order:'รอบ PM',pm_standard:'มาตรฐาน PM',repair:'รายการซ่อม'}
export function visibleRecords(rows=[],deleted=[],kind){
 const ids=new Set(deleted.filter(d=>d.record_type===kind).map(d=>d.record_id))
 return rows.filter(row=>!ids.has(row.id))
}
export const timelineRecordType=type=>({finding:'finding',inspection:'inspection',opportunity:'opportunity',repair:'repair',pm_scheduled:'tpm_job',tpm_added:'tpm_job',follow_up:'tpm_job',improvement:'tpm_job',emergency_repair:'tpm_job'}[type])
export const recordTitle=r=>r.finding||r.title||r.standard_snapshot?.title||r.part_name||r.requested_part_name||r.symptom||r.note||'ผลตรวจสภาพเครื่อง'
