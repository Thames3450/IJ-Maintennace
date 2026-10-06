import React, { useCallback, useEffect, useState, useRef } from 'react'
import { supabase } from './lib/supabase.js'
import {readPaged} from './lib/readPaged.js'
import {resolvePhotoUrls} from './lib/photoUrls.js'
import {inspectionSummary} from './lib/inspectionChecklist.js'
import {workflowRPC} from './lib/workflowService.js'
import {visibleRecords} from './lib/recordDeletion.js'
import DeleteConfirmModal from './components/DeleteConfirmModal.jsx'
import {pmOrderAsSchedule} from './lib/pm.js'
import {savePMStandard,createPMOrder,startPMOrder,savePMResult} from './lib/pmService.js'
import {nonNegative,positiveQuantity,validDate,confirmedUpdate} from './lib/validation.js'
import { isoDate, mondayOf, rolePlanner, naturalMachineSort } from './lib/utils.js'
import Layout from './components/Layout.jsx'
import PlanBuilder from './components/PlanBuilder.jsx'
import ExecutionModal from './components/ExecutionModal.jsx'
import FindingModal from './components/FindingModal.jsx'
import { Skeleton } from './components/UI.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Assets from './pages/Assets.jsx'
import WeeklyPlan from './pages/WeeklyPlan.jsx'
import Inspection from './pages/Inspection.jsx'
import Defects from './pages/Defects.jsx'
import FollowUp from './pages/FollowUp.jsx'
import Opportunities from './pages/Opportunities.jsx'
import MachineHistory from './pages/MachineHistory.jsx'
import RepairHistory from './pages/RepairHistory.jsx'
import KPI from './pages/KPI.jsx'
import SpareParts from './pages/SpareParts.jsx'
import PMStandard from './pages/PMStandard.jsx'
import Reports from './pages/Reports.jsx'
import MainMenu from './pages/MainMenu.jsx'

export default function App(){
  const [profile,setProfile]=useState(null)
  const [department,setDepartment]=useState(null)
  const [machines,setMachines]=useState([])
  const [technicians,setTechnicians]=useState([])
  const [jobs,setJobs]=useState([])
  const [repairs,setRepairs]=useState([])
  const [findings,setFindings]=useState([])
  const [deletedRecords,setDeletedRecords]=useState([]),[deleteTarget,setDeleteTarget]=useState(null),[tpmFocus,setTpmFocus]=useState(null)
  const [pmPlans,setPmPlans]=useState([])
  const [pmSchedule,setPmSchedule]=useState([])
  const [pmStandards,setPmStandards]=useState([]),[pmOrders,setPmOrders]=useState([]),[legacyPMSchedule,setLegacyPMSchedule]=useState([])
  const [inspections,setInspections]=useState([])
  const [inspectionTemplates,setInspectionTemplates]=useState([])
  const [inspectionItems,setInspectionItems]=useState([])
  const [opportunities,setOpportunities]=useState([])
  const [spareRequests,setSpareRequests]=useState([])
  const [kpiSettings,setKpiSettings]=useState([])
  const pageIds=['menu','dashboard','assets','weekly','inspection','defects','followup','opportunity','history','repairs','kpi','spares','pm','reports']
  const pageFromHash=()=>{const p=window.location.hash.slice(1).split('?')[0];return pageIds.includes(p)?p:'menu'}
  const [page,setPageState]=useState(pageFromHash)
  const setPage=p=>{if(pageIds.includes(p)){window.location.hash=p;setPageState(p);window.scrollTo({top:0})}}
  useEffect(()=>{const change=()=>{setPageState(pageFromHash());setHistoryFocus(new URLSearchParams(window.location.hash.split('?')[1]||'').get('machine')||'')};window.addEventListener('hashchange',change);return()=>window.removeEventListener('hashchange',change)},[])
  const [dataErrors,setDataErrors]=useState([]),[lastSync,setLastSync]=useState(null)
  const toastTimer=useRef(null),jobLocks=useRef(new Set()),loadSequence=useRef(0)
  const [loading,setLoading]=useState(true)
  const [refreshing,setRefreshing]=useState(false)
  const [toast,setToast]=useState(null)
  const [weekStart,setWeekStart]=useState(isoDate(mondayOf(new Date())))
  const [planOpen,setPlanOpen]=useState(false)
  const [editingGroup,setEditingGroup]=useState(null)
  const [planSource,setPlanSource]=useState(null)
  const [planInitialDate,setPlanInitialDate]=useState('')
  const [finishJob,setFinishJob]=useState(null)
  const [findingJob,setFindingJob]=useState(null)
  const [findingOpen,setFindingOpen]=useState(false)
  const [historyFocus,setHistoryFocus]=useState(()=>new URLSearchParams(window.location.hash.split('?')[1]||'').get('machine')||'')
  const [followupFocus,setFollowupFocus]=useState('')

  const notify=useCallback((message,type='ok')=>{setToast({message,type});clearTimeout(toastTimer.current);toastTimer.current=setTimeout(()=>setToast(null),type==='error'?8000:4000)},[])

  const loadProfile=useCallback(async()=>{
    const {data,error}=await supabase.from('app_profiles').select('id,auth_user_id,employee_code,full_name,department_id,role,shift,position').eq('username','ij-web').eq('is_active',true).single()
    if(error) throw error
    setProfile(data); return data
  },[])

  const loadAll=useCallback(async(userProfile=profile)=>{
    if(!userProfile) return
    const sequence=++loadSequence.current
    setRefreshing(true)
    try{
      const {data:dept,error:deptErr}=await supabase.from('departments').select('*').eq('dept_code','IJ').single()
      if(deptErr) throw deptErr
      setDepartment(dept)
      const since=new Date(); since.setFullYear(since.getFullYear()-3)
      const modules=[
        ['deletedRecords',supabase.from('ij_deleted_records').select('*').eq('department_id',dept.id)],
        ['machines',supabase.from('machines').select('id,machine_no,machine_name,area,section,criticality,equipment_type,has_robot,department_id,department_code,target_mtbf_hr,target_mttr_min,planned_hours_month').eq('department_code','IJ').eq('is_active',true).order('machine_no')],
        ['jobs',supabase.from('ij_tpm_jobs').select('*, machines(id,machine_no,machine_name,area,criticality), ij_tpm_executions(*)').eq('department_id',dept.id).order('planned_date',{ascending:false}).order('sequence_no',{ascending:true}).limit(1800)],
        ['repairs',supabase.from('repair_reports').select('id,department_id,machine_id,record_no,machine_no_snapshot,machine_name_snapshot,symptom,cause,action_taken,spare_parts,status,started_at,finished_at,loss_time_min,technician_name_snapshot,problem_type,severity,remark,source_system').eq('department_id',dept.id).is('deleted_at',null).gte('started_at',since.toISOString()).order('started_at',{ascending:false}).limit(3000)],
        ['findings',supabase.from('ij_tpm_findings').select('*, machines(id,machine_no,machine_name)').eq('department_id',dept.id).order('created_at',{ascending:false}).limit(1600)],
        ['findingAttachments',supabase.from('ij_finding_attachments').select('*').eq('department_id',dept.id).order('created_at',{ascending:false}).limit(4000)],
        ['inspectionResults',supabase.from('ij_condition_results').select('id,finding_id,ij_condition_inspections!inner(department_id)').eq('ij_condition_inspections.department_id',dept.id).not('finding_id','is',null).order('id')],
        ['inspectionAttachments',supabase.from('ij_condition_result_attachments').select('*,ij_condition_inspections!inner(department_id)').eq('ij_condition_inspections.department_id',dept.id).order('created_at',{ascending:false})],
        ['pmPlans',supabase.from('pm_plans').select('*, machines(id,machine_no,machine_name)').eq('department_id',dept.id).eq('is_active',true).order('created_at',{ascending:false})],
        ['pmSchedule',supabase.from('pm_schedule').select('*').eq('department_id',dept.id).order('due_date',{ascending:false}).limit(2000)],
        ['pmStandards',supabase.from('ij_pm_standards').select('*').eq('department_id',dept.id).order('created_at',{ascending:false})],
        ['pmOrders',supabase.from('ij_pm_orders').select('*').eq('department_id',dept.id).order('due_date',{ascending:false})],
        ['inspections',supabase.from('ij_condition_inspections').select('*, machines(id,machine_no,machine_name,area,criticality)').eq('department_id',dept.id).order('inspection_date',{ascending:false}).order('created_at',{ascending:false}).limit(1500)],
        ['templates',supabase.from('ij_inspection_templates').select('*').eq('department_id',dept.id).eq('is_active',true).order('created_at')],
        ['templateItems',supabase.from('ij_inspection_template_items').select('*').eq('is_active',true).order('sort_order')],
        ['opportunities',supabase.from('ij_opportunities').select('*, machines(id,machine_no,machine_name)').eq('department_id',dept.id).order('created_at',{ascending:false}).limit(1000)],
        ['spares',supabase.from('spare_requests').select('*, machine:machines(id,machine_no,machine_name)').eq('department_id',dept.id).order('created_at',{ascending:false}).limit(1500)],
        ['kpi',supabase.from('kpi_settings').select('*').eq('dept_code','IJ').order('updated_at',{ascending:false})]
      ]
      const results=await Promise.all(modules.map(async([name,q])=>{const caps={jobs:1800,repairs:3000,findings:1600,findingAttachments:4000,inspections:1500,opportunities:1000,spares:1500,pmSchedule:2000};const result=await readPaged(q.order('id'),caps[name]||10000);if(result.error)console.error(`[IJ] load ${name} failed`,result.error);return[name,result]}))
      if(sequence!==loadSequence.current)return false
      const map=Object.fromEntries(results)
      const listReady=!map.deletedRecords.error&&!map.deletedRecords.capped
      const deletions=map.deletedRecords.data||[]
      const kinds={jobs:'tpm_job',repairs:'repair',findings:'finding',inspections:'inspection',opportunities:'opportunity',spares:'spare_request',pmOrders:'pm_order',pmStandards:'pm_standard'}
      if(listReady){setDeletedRecords(deletions);for(const [name,kind] of Object.entries(kinds))if(!map[name].error)map[name].data=visibleRecords(map[name].data||[],deletions,kind)}
      const failures=results.filter(([,r])=>r.error||r.capped).map(([name,r])=>r.capped?`${name}: เกินขอบเขตข้อมูลที่โหลด`:name)
      if(!map.machines.error)setMachines([...(map.machines.data||[])].sort(naturalMachineSort))
      if(listReady&&!map.repairs.error)setRepairs(map.repairs.data||[])
      if(listReady&&!map.findings.error){
        let findingRows=map.findings.data||[]
        const resultToFinding=new Map((map.inspectionResults?.data||[]).map(r=>[r.id,r.finding_id]))
        const fromInspection=(map.inspectionAttachments?.data||[]).map(a=>({...a,storage_bucket:a.storage_bucket||'ij-inspection-photos',finding_id:resultToFinding.get(a.result_id)})).filter(a=>a.finding_id)
        const attachmentRows=[...(!map.findingAttachments?.error?(map.findingAttachments?.data||[]):[]),...fromInspection]
        if(attachmentRows.length){
          const resolved=await resolvePhotoUrls(supabase,attachmentRows,{defaultBucket:'ij-defect-photos'})
          if(sequence!==loadSequence.current)return false
          if(resolved.some(p=>p.photo_error))failures.push('photo previews')
          const byFinding=new Map()
          resolved.forEach(a=>{if(!byFinding.has(a.finding_id))byFinding.set(a.finding_id,[]);byFinding.get(a.finding_id).push(a)})
          findingRows=findingRows.map(f=>({...f,attachments:byFinding.get(f.id)||[]}))
        }else findingRows=findingRows.map(f=>({...f,attachments:[]}))
        setFindings(findingRows)
      }
      if(!map.pmPlans.error)setPmPlans(map.pmPlans.data||[])
      if(listReady&&!map.pmStandards.error)setPmStandards(map.pmStandards.data||[])
      if(listReady&&!map.pmOrders.error)setPmOrders(map.pmOrders.data||[])
      if(!map.pmSchedule.error)setLegacyPMSchedule(map.pmSchedule.data||[])
      if(listReady&&!map.pmSchedule.error&&!map.pmOrders.error)setPmSchedule([...(map.pmSchedule.data||[]).map(p=>({...p,source:'mpr'})),...(map.pmOrders.data||[]).map(pmOrderAsSchedule)])
      if(listReady&&!map.inspections.error)setInspections(map.inspections.data||[])
      if(!map.templates.error)setInspectionTemplates(map.templates.data||[])
      if(!map.templateItems.error)setInspectionItems(map.templateItems.data||[])
      if(listReady&&!map.opportunities.error)setOpportunities(map.opportunities.data||[])
      if(listReady&&!map.spares.error)setSpareRequests(map.spares.data||[])
      if(!map.kpi.error)setKpiSettings(map.kpi.data||[])
      if(listReady&&!map.jobs.error){
        let enriched=map.jobs.data||[]
        try{
          const {data:assignees,error}=await readPaged(supabase.from('ij_tpm_job_assignees').select('id,job_id,profile_id,is_lead').order('id'),7000)
          if(error)throw error
          const jobIds=new Set(enriched.map(j=>j.id));const rel=(assignees||[]).filter(a=>jobIds.has(a.job_id));const profileIds=[...new Set(rel.map(a=>a.profile_id).filter(Boolean))]
          const profiles=[];for(let i=0;i<profileIds.length;i+=100){const {data,error:pErr}=await supabase.from('app_profiles').select('id,full_name,employee_code,shift').in('id',profileIds.slice(i,i+100));if(pErr)throw pErr;profiles.push(...(data||[]))}
          const pMap=new Map(profiles.map(x=>[x.id,x])),byJob=new Map();rel.forEach(a=>{if(!byJob.has(a.job_id))byJob.set(a.job_id,[]);byJob.get(a.job_id).push({...a,assignee_profile:pMap.get(a.profile_id)||null})})
          enriched=enriched.map(j=>({...j,ij_tpm_job_assignees:byJob.get(j.id)||[]}))
        }catch(e){failures.push('assignees');console.error('[IJ] assignee merge failed',e);enriched=enriched.map(j=>({...j,ij_tpm_job_assignees:[]}))}
        setJobs(enriched)
      }
      if(rolePlanner(userProfile.role)){
        const {data:t,error}=await supabase.from('app_profiles').select('id,employee_code,full_name,role,shift,department_id').eq('is_active',true).eq('department_id',dept.id).in('role',['technician','supervisor']).order('full_name')
        if(!error)setTechnicians(t||[]);else failures.push('technicians')
      }else setTechnicians([userProfile])
      if(sequence!==loadSequence.current)return false
      setDataErrors(failures);if(!failures.length)setLastSync(new Date())
      return failures.length===0
    }catch(e){console.error('[IJ] refresh failed',e);setDataErrors(['connection']);return false}finally{if(sequence===loadSequence.current)setRefreshing(false)}
  },[profile])

  const boot=useCallback(async()=>{setLoading(true);try{const p=await loadProfile();if(p)await loadAll(p)}catch(e){console.error(e);notify(e.message||'System loading failed · โหลดระบบไม่สำเร็จ','error')}finally{setLoading(false)}},[loadProfile,loadAll,notify])
  useEffect(()=>{boot()},[])

  const openNewPlan=(date='')=>{const chosen=typeof date==='string'?date:'';setEditingGroup(null);setPlanSource(null);setPlanInitialDate(chosen);setPlanOpen(true)}
  const openEditGroup=id=>{setEditingGroup(jobs.filter(j=>(j.plan_group_id||j.id)===id));setPlanSource(null);setPlanInitialDate('');setPlanOpen(true)}
  const openSource=(type,data)=>{if(type==='finding'){if(data.status==='closed')return notify('งานนี้ปิดแล้ว','error');const linked=jobs.find(j=>j.source_finding_id===data.id&&!['completed','cancelled'].includes(j.job_status));if(linked){openTPM(linked);notify('งานนี้มีแผน TPM แล้ว เปิดงานเดิมให้แล้ว');return}}setEditingGroup(null);setPlanSource({type,data});setPlanInitialDate(type==='pm'?(data?.due_date||''):'');setPlanOpen(true)}
  const openMachine=id=>{window.location.hash=`history?machine=${encodeURIComponent(id)}`;setHistoryFocus(id);setPageState('history');window.scrollTo({top:0})}
  const openFollowUp=f=>{setFollowupFocus(f.id);setPage('followup')}

  const openTPM=job=>{setTpmFocus(job);setPage('weekly')}
  const requestDelete=(kind,record)=>setDeleteTarget({kind,records:Array.isArray(record)?record:[record]})
  const deleteRecords=async target=>{await workflowRPC('ij_delete_records',{p_record_type:target.kind,p_record_ids:target.records.map(r=>r.id),p_confirmed:true});const ids=new Set(target.records.map(r=>r.id)),setters={finding:setFindings,tpm_job:setJobs,inspection:setInspections,opportunity:setOpportunities,spare_request:setSpareRequests,pm_order:setPmOrders,pm_standard:setPmStandards,repair:setRepairs};setters[target.kind]?.(rows=>rows.filter(r=>!ids.has(r.id)));setDeletedRecords(rows=>[...rows,...target.records.map(r=>({record_type:target.kind,record_id:r.id}))]);await loadAll(profile);notify(`ลบออกจากรายการแล้ว ${target.records.length} รายการ`)}

  const savePlan=async({meta,rows,assignees,onRowSaved})=>{
    if(!department||!profile)return
    if(!validDate(meta.date))throw new Error('วันที่แผนไม่ถูกต้อง')
    rows.forEach(row=>nonNegative(row.planned_stop_min,'เวลาหยุดตามแผน'))
    const groupId=meta.group_id||editingGroup?.[0]?.plan_group_id||editingGroup?.[0]?.id||crypto.randomUUID(),ready=['confirmed','not_required'].includes(meta.production_status)&&['approved','not_required'].includes(meta.manager_status)
    let firstJobId=null
    const savedIds=new Set()
    for(let i=0;i<rows.length;i++){
      const row=rows[i],existing=editingGroup?.find(j=>j.id===row.id),current=existing?.job_status,jobStatus=['in_progress','completed','partial','cancelled'].includes(current)?current:(ready?'planned':'draft')
      const source={source_repair_report_id:null,source_finding_id:null,source_opportunity_id:null,source_pm_plan_id:null}
      if(planSource&&i===0){if(planSource.type==='repair')source.source_repair_report_id=planSource.data.id;if(planSource.type==='finding')source.source_finding_id=row.source_finding_id||null;if(planSource.type==='opportunity')source.source_opportunity_id=planSource.data.id;if(planSource.type==='pm')source.source_pm_plan_id=planSource.data.plan_id||null}
      if(row.source_finding_id&&planSource?.type==='finding'&&row.machine_id!==planSource.data.machine_id)throw new Error('งานติดตามต้องเป็นเครื่องเดิมที่พบปัญหา')
      const payload={department_id:department.id,machine_id:row.machine_id,work_type:row.work_type,title:row.title.trim(),details:row.details||null,reason_trigger:row.reason_trigger||null,priority:row.priority,planned_date:meta.date,planned_start_time:meta.time||null,planned_stop_min:row.need_machine_stop?nonNegative(row.planned_stop_min):0,need_machine_stop:row.need_machine_stop,production_status:meta.production_status,manager_status:meta.manager_status,job_status:jobStatus,plan_group_id:groupId,plan_group_name:meta.name||null,plan_group_note:meta.note||null,sequence_no:i,...(existing?{}:source)}
      let jobId=row.id
      if(jobId){await confirmedUpdate(supabase.from('ij_tpm_jobs').update(payload).eq('id',jobId))}else{const {data,error}=await supabase.from('ij_tpm_jobs').insert({...payload,created_by:profile.id}).select('id').single();if(error)throw error;jobId=data.id;onRowSaved?.(row.key,jobId)}
      savedIds.add(jobId)
      if(i===0)firstJobId=jobId
      const {error:delErr}=await supabase.from('ij_tpm_job_assignees').delete().eq('job_id',jobId);if(delErr)throw delErr
      if(assignees.length){const {error}=await supabase.from('ij_tpm_job_assignees').insert(assignees.map((pid,index)=>({job_id:jobId,profile_id:pid,is_lead:index===0,assigned_by:profile.id})));if(error)throw error}
    }
    const removed=(editingGroup||[]).filter(j=>!savedIds.has(j.id));if(removed.length)await workflowRPC('ij_delete_records',{p_record_type:'tpm_job',p_record_ids:removed.map(j=>j.id),p_confirmed:true})
    if(planSource?.type==='opportunity'&&firstJobId)await confirmedUpdate(supabase.from('ij_opportunities').update({converted_job_id:firstJobId,status:'planned'}).eq('id',planSource.data.id))
    if(planSource?.type==='finding'){const sourceRow=rows.find(r=>r.source_finding_id===planSource.data.id);if(sourceRow)await confirmedUpdate(supabase.from('ij_tpm_findings').update({permanent_action:sourceRow.details||sourceRow.title,target_date:meta.date,owner_profile_id:assignees[0]||planSource.data.owner_profile_id||null,need_machine_stop:sourceRow.need_machine_stop,status:planSource.data.status==='open'&&sourceRow.need_machine_stop?'waiting_machine_stop':planSource.data.status}).eq('id',planSource.data.id).neq('status','closed'))}
    setPlanSource(null);await loadAll(profile);notify('บันทึกแผน TPM แล้ว')
  }

  const startJob=async job=>{
    if(jobLocks.current.has(job.id))return
    jobLocks.current.add(job.id)
    try{await workflowRPC('ij_tpm_start_job',{p_job_id:job.id});await loadAll(profile);notify(`เริ่มงานแล้ว · ${job.machines?.machine_no||''}`)}catch(e){notify(e.message,'error')}finally{jobLocks.current.delete(job.id)}
  }
  const completeJob=async(job,form)=>{
    if(jobLocks.current.has(job.id))throw new Error('กำลังบันทึกงานนี้ กรุณารอสักครู่')
    if(!form.result_summary?.trim())throw new Error('กรุณาระบุผลการทำงานจริง')
    const stop=nonNegative(form.actual_stop_min,'เวลาหยุดจริง')
    jobLocks.current.add(job.id)
    try{
      const result=await workflowRPC('ij_tpm_finish_job',{p_job_id:job.id,p_result:{...form,actual_stop_min:stop}})
      await loadAll(profile)
      notify(result?.finding_status==='closed'?'ปิดงาน TPM และงานติดตามที่เชื่อมไว้แล้ว':form.completion_status==='partial'?'บันทึกผลบางส่วนแล้ว · งานติดตามยังเปิดให้ทำต่อ':result?.finding_status==='verification'?'บันทึกผล TPM แล้ว · งานติดตามรอตรวจยืนยัน':'บันทึกผล TPM แล้ว')
    }finally{jobLocks.current.delete(job.id)}
  }
  const postponeJob=async job=>{
    const date=prompt('เลื่อนงานไปวันที่ (YYYY-MM-DD)',job.planned_date);if(!date)return
    if(!validDate(date))return notify('วันที่ไม่ถูกต้อง กรุณาใช้ YYYY-MM-DD','error')
    try{await confirmedUpdate(supabase.from('ij_tpm_jobs').update({planned_date:date,job_status:'postponed'}).eq('id',job.id));await loadAll(profile);notify('เลื่อนงานแล้ว')}catch(e){notify(e.message,'error')}
  }


  const saveFinding=async form=>{
    const {data:finding,error}=await supabase.from('ij_tpm_findings').insert({department_id:department.id,machine_id:form.machine_id,job_id:form.job_id||null,finding:form.finding.trim(),risk:form.risk||null,priority:form.priority,status:'open',spare_required:false,need_machine_stop:false,found_by:form.found_by,source_type:form.job_id?'tpm':'manual',finding_type:'defect'}).select('id').single()
    if(error)throw error
    const machineInfo=machines.find(m=>m.id===form.machine_id)
    const machineCode=(machineInfo?.machine_no||'unknown-machine').replace(/[^a-zA-Z0-9_-]/g,'_')
    const warnings=[]
    for(let i=0;i<(form.photos||[]).length;i++){
      const p=form.photos[i]
      if(!p?.file)continue
      try{
        const ext=(p.file.name?.split('.').pop()||'jpg').toLowerCase()
        const path=`${machineCode}/${finding.id}/${Date.now()}_${i+1}.${ext}`
        const {error:uploadError}=await supabase.storage.from('ij-defect-photos').upload(path,p.file,{cacheControl:'3600',upsert:false,contentType:p.file.type||'image/jpeg'})
        if(uploadError)throw uploadError
        const {error:metaError}=await supabase.from('ij_finding_attachments').insert({department_id:department.id,finding_id:finding.id,machine_id:form.machine_id,file_name:p.name||p.file.name||`defect_${i+1}.${ext}`,storage_bucket:'ij-defect-photos',storage_path:path,mime_type:p.type||p.file.type||'image/jpeg',file_size:p.size||p.file.size||null,uploaded_by:profile.id})
        if(metaError)throw metaError
      }catch(err){console.error('Defect photo upload failed',err);warnings.push(i+1)}
    }
    await loadAll(profile)
    if(warnings.length)notify(`Defect saved, but some photos failed · บันทึก Defect แล้ว แต่รูปบางรูปอัปโหลดไม่สำเร็จ`,'error')
    else notify('Defect saved · บันทึกจุดผิดปกติแล้ว')
  }
  const saveFollowUpAction=async(f,form)=>{
    await workflowRPC('ij_followup_save',{p_finding_id:f.id,p_action:form})
    await loadAll(profile)
    notify(form.status==='closed'?'ยืนยันผลและปิดงานแล้ว':'บันทึกความคืบหน้าแล้ว')
  }

  const saveInspection=async({machine_id,template_id,rows,note,started_at})=>{
    if(!rows.length||rows.some(r=>!['normal','watch','abnormal','na'].includes(r.result_status)))throw new Error('กรุณาเลือกผลตรวจให้ครบทุกข้อ')
    if(rows.every(r=>r.result_status==='na'))throw new Error('ต้องมีจุดตรวจจริงอย่างน้อย 1 ข้อ')
    const {score,overall}=inspectionSummary(rows)
    const now=new Date().toISOString()
    const machineInfo=machines.find(m=>m.id===machine_id)
    const machineCode=(machineInfo?.machine_no||'unknown-machine').replace(/[^a-zA-Z0-9_-]/g,'_')
    const {data:inspection,error}=await supabase.from('ij_condition_inspections').insert({department_id:department.id,machine_id,template_id:template_id||null,inspection_date:isoDate(),started_at:started_at||now,completed_at:now,inspector_profile_id:profile.id,inspector_name_snapshot:profile.full_name,shift:profile.shift||null,overall_status:overall,condition_score:score,note:note||null}).select('id').single();if(error)throw error
    const uploadWarnings=[],createdFindings=[],uploadedPaths=[]
    try{
    for(const row of rows){
      let findingId=null
      if(['watch','abnormal'].includes(row.result_status)){
        const {data:f,error:fErr}=await supabase.from('ij_tpm_findings').insert({department_id:department.id,machine_id,source_type:'inspection',source_inspection_id:inspection.id,finding_type:'condition',finding:`${row.item_name}: ${row.note||row.result_status}`,risk:row.note||`${row.result_status} condition`,recommendation:'ตรวจสอบและวางแผน Corrective / TPM ตามความเหมาะสม',priority:row.result_status==='abnormal'?(row.criticality==='C'?'B':'A'):(row.criticality||'B'),status:'open',spare_required:false,found_by:profile.id}).select('id').single();if(fErr)throw fErr;findingId=f.id;createdFindings.push(f.id)
      }
      const {data:result,error:rErr}=await supabase.from('ij_condition_results').insert({inspection_id:inspection.id,template_item_id:row.template_item_id||null,zone_code:row.zone_code||null,component_code:row.component_code||null,item_name_snapshot:row.item_name,result_status:row.result_status,numeric_value:row.numeric_value===''||row.numeric_value==null?null:Number(row.numeric_value),text_value:row.text_value||null,unit:row.unit||null,note:row.note||null,finding_id:findingId}).select('id').single();if(rErr)throw rErr
      const photos=(row.photos||[]).filter(p=>p?.file)
      if(photos.length){
        for(let i=0;i<photos.length;i++){
          const p=photos[i]
          try{
            const ext=(p.file?.name?.split('.').pop()||'jpg').toLowerCase()
            const path=`${machineCode}/${inspection.id}/${result.id}_${Date.now()}_${i+1}.${ext}`
            const {error:uploadError}=await supabase.storage.from('ij-inspection-photos').upload(path,p.file,{cacheControl:'3600',upsert:false,contentType:p.file.type||'image/jpeg'})
            if(uploadError)throw uploadError
            uploadedPaths.push(path)
            const {error:metaError}=await supabase.from('ij_condition_result_attachments').insert({result_id:result.id,inspection_id:inspection.id,machine_id,file_name:p.name||`photo_${i+1}.${ext}`,storage_bucket:'ij-inspection-photos',storage_path:path,public_url:null,mime_type:p.type||p.file.type||'image/jpeg',file_size:p.size||p.file.size||null,uploaded_by:profile.id})
            if(metaError)throw metaError
          }catch(err){
            console.error('Inspection photo upload failed',err)
            uploadWarnings.push(`${row.item_name} (${i+1})`)
          }
        }
      }
    }
    }catch(e){
      // Best-effort compensation; the existing API has no transaction RPC.
      const cleanupErrors=[]
      if(uploadedPaths.length){const {error}=await supabase.storage.from('ij-inspection-photos').remove(uploadedPaths);if(error)cleanupErrors.push(error)}
      const {error:cleanupError}=await supabase.from('ij_condition_inspections').delete().eq('id',inspection.id)
      if(cleanupError)cleanupErrors.push(cleanupError)
      if(createdFindings.length){const {error}=await supabase.from('ij_tpm_findings').delete().in('id',createdFindings);if(error)cleanupErrors.push(error)}
      if(cleanupErrors.length){console.error('[IJ] incomplete inspection cleanup',cleanupErrors);await loadAll(profile);throw new Error('บันทึกได้บางส่วนและล้างข้อมูลไม่สำเร็จ กรุณารีเฟรชตรวจประวัติก่อนบันทึกซ้ำ')}
      throw e
    }
    await loadAll(profile)
    if(uploadWarnings.length) notify(`Inspection saved, but some photos failed to upload · บันทึกแล้ว แต่รูปอัปโหลดไม่ครบ: ${uploadWarnings.join(', ')}`,'error')
    else notify(`Inspection completed · ตรวจเสร็จแล้ว · Condition ${score}%`)
  }

  const saveOpportunity=async form=>{const {error}=await supabase.from('ij_opportunities').insert({department_id:department.id,machine_id:form.machine_id||null,category:form.category,title:form.title.trim(),details:form.details||null,expected_benefit:form.expected_benefit||null,priority:form.priority,status:'open',target_date:form.target_date||null,created_by:profile.id,source_type:'manual'});if(error)throw error;await loadAll(profile);notify('Opportunity saved · บันทึก Opportunity แล้ว')}
  const updateOpportunity=async(o,status)=>{const {error}=await supabase.from('ij_opportunities').update({status,completed_at:status==='completed'?new Date().toISOString():null}).eq('id',o.id);if(error)return notify(error.message,'error');await loadAll(profile);notify('Opportunity updated · อัปเดต Opportunity แล้ว')}

  const saveSpare=async form=>{const payload={department_id:department.id,machine_id:form.machine_id||null,requester_profile_id:profile.id,requester_name_snapshot:profile.full_name,requester_code_snapshot:profile.employee_code||null,requester_shift_snapshot:profile.shift||null,requester_role_snapshot:profile.role,source_type:'technician',requested_part_name:form.requested_part_name.trim(),requested_part_no:form.requested_part_no||null,requested_specification:form.requested_specification||null,requested_reason:form.requested_reason.trim(),part_name:form.requested_part_name.trim(),part_no:form.requested_part_no||null,specification:form.requested_specification||null,quantity:positiveQuantity(form.quantity),unit:form.unit||'pcs',urgency:form.urgency,remark:form.remark||null,status:'new'};const {error}=await supabase.from('spare_requests').insert(payload);if(error)throw error;await loadAll(profile);notify('Spare request submitted · ส่งคำขออะไหล่แล้ว')}
  const updateSpareStatus=async(request,nextStatus)=>{const patch={status:nextStatus,status_changed_at:new Date().toISOString()};if(nextStatus==='closed'){patch.closed_by=profile.id;patch.closed_at=new Date().toISOString()}else{patch.closed_by=null;patch.closed_at=null}await confirmedUpdate(supabase.from('spare_requests').update(patch).eq('id',request.id));await loadAll(profile);notify(`Spare status updated · อัปเดตสถานะเป็น ${nextStatus.replaceAll('_',' ')}`)}

  const saveKpiSettings=async form=>{if(Object.values(form).some(v=>v!==''&&v!=null&&(!Number.isFinite(Number(v))||Number(v)<0)))throw new Error('ค่า KPI ต้องเป็นตัวเลขตั้งแต่ 0 ขึ้นไป');const clean=v=>v===''||v===null?null:Number(v);const current=kpiSettings.find(x=>x.machine_no==null);const payload={dept_code:'IJ',machine_no:null,hours_per_day:clean(form.hours_per_day)??24,days_per_week:clean(form.days_per_week)??7,target_availability:clean(form.target_availability)??95,target_mtbf_hr:clean(form.target_mtbf_hr),target_mttr_min:clean(form.target_mttr_min),target_tpm_completion:clean(form.target_tpm_completion),target_pm_compliance:clean(form.target_pm_compliance),target_defect_closure:clean(form.target_defect_closure),target_repeat_failure_pct:clean(form.target_repeat_failure_pct),updated_at:new Date().toISOString()};let error;if(current){await confirmedUpdate(supabase.from('kpi_settings').update(payload).eq('id',current.id))}else{({error}=await supabase.from('kpi_settings').insert(payload))}if(error)throw error;await loadAll(profile);notify('KPI targets saved · บันทึก KPI Targets แล้ว')}

  if(loading)return <div className="boot-screen"><div className="boot-logo"><img src="./ij-maintenance-logo.png" alt="IJ Maintenance" /></div><div className="boot-copy"><b>Opening IJ Maintenance</b><small>กำลังโหลดระบบโดยไม่ต้องเข้าสู่ระบบ</small></div><Skeleton rows={3}/></div>
  if(!profile||!department)return <div className="boot-screen boot-error"><div className="boot-logo"><img src="./ij-maintenance-logo.png" alt="IJ Maintenance" /></div><div className="boot-copy"><b>Cannot open IJ Maintenance</b><small>โหลดข้อมูลไม่สำเร็จ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่</small><button className="btn primary" onClick={boot}>Retry · ลองใหม่</button></div></div>

  const pageNode={
    menu:<MainMenu profile={profile} jobs={jobs} repairs={repairs} findings={findings} spares={spareRequests} planner={rolePlanner(profile.role)} onNewFinding={()=>{setFindingJob(null);setFindingOpen(true)}} onGo={setPage} onNewPlan={openNewPlan}/>,
    dashboard:<Dashboard jobs={jobs} repairs={repairs} findings={findings} inspections={inspections} pmSchedule={pmSchedule} kpiSettings={kpiSettings} machines={machines} onGo={setPage} onEditGroup={openEditGroup}/>,
    assets:<Assets machines={machines} jobs={jobs} repairs={repairs} findings={findings} inspections={inspections} onOpenMachine={openMachine}/>,
    weekly:<WeeklyPlan profile={profile} jobs={jobs.filter(j=>j.work_type!=='pm_scheduled')} machines={machines} weekStart={weekStart} setWeekStart={setWeekStart} onNewPlan={openNewPlan} onEditGroup={openEditGroup} onStart={startJob} onFinish={setFinishJob} onFinding={j=>{setFindingJob(j);setFindingOpen(true)}} onPostpone={postponeJob} initialJob={tpmFocus} onConsumedInitial={()=>setTpmFocus(null)} onDelete={rolePlanner(profile.role)?r=>requestDelete('tpm_job',r):null}/>,
    inspection:<Inspection profile={profile} machines={machines} inspections={inspections} templates={inspectionTemplates} templateItems={inspectionItems} onSaveInspection={saveInspection} onOpenMachine={openMachine} onDelete={rolePlanner(profile.role)?r=>requestDelete('inspection',r):null}/>,
    defects:<Defects profile={profile} findings={findings} machines={machines} onNew={()=>{setFindingJob(null);setFindingOpen(true)}} onCreateTPM={f=>openSource('finding',f)} onFollowUp={openFollowUp} onDelete={rolePlanner(profile.role)?r=>requestDelete('finding',r):null}/>,
    followup:<FollowUp profile={profile} findings={findings} technicians={[...technicians,...(technicians.some(t=>t.id===profile.id)?[]:[profile])]} jobs={jobs} onOpenTPM={openTPM} onDelete={rolePlanner(profile.role)?r=>requestDelete('finding',r):null} onSaveAction={saveFollowUpAction} onCreateTPM={f=>openSource('finding',f)} initialFinding={followupFocus} onConsumedInitial={()=>setFollowupFocus('')}/>,
    opportunity:<Opportunities profile={profile} machines={machines} opportunities={opportunities} onSave={saveOpportunity} onCreateTPM={o=>openSource('opportunity',o)} onUpdateStatus={updateOpportunity} onDelete={rolePlanner(profile.role)?r=>requestDelete('opportunity',r):null}/>,
    history:<MachineHistory machines={machines} departmentId={department?.id} pmOrders={pmOrders} deletedRecords={deletedRecords} initialMachine={historyFocus} onConsumedInitial={()=>setHistoryFocus('')}/>,
    repairs:<RepairHistory profile={profile} repairs={repairs} machines={machines} onCreateTPM={r=>openSource('repair',r)} onDelete={rolePlanner(profile.role)?r=>requestDelete('repair',r):null}/>,
    kpi:<KPI profile={profile} machines={machines} jobs={jobs} repairs={repairs} findings={findings} pmSchedule={pmSchedule} kpiSettings={kpiSettings} onSaveSettings={saveKpiSettings}/>,
    spares:<SpareParts profile={profile} machines={machines} requests={spareRequests} onSave={saveSpare} onUpdateStatus={updateSpareStatus} onDelete={rolePlanner(profile.role)?r=>requestDelete('spare_request',r):null}/>,
    pm:<PMStandard standards={pmStandards} orders={pmOrders} legacySchedule={legacyPMSchedule} machines={machines} onDeleteOrder={rolePlanner(profile.role)?r=>requestDelete('pm_order',r):null} onDeleteStandard={rolePlanner(profile.role)?r=>requestDelete('pm_standard',r):null} onSaveStandard={async f=>{await savePMStandard(f,department.id);await loadAll(profile);notify('บันทึกมาตรฐาน PM แล้ว')}} onCreateOrder={async f=>{await createPMOrder(f);await loadAll(profile);notify('สร้างรอบ PM แล้ว')}} onStartOrder={async o=>{const row=await startPMOrder(o);await loadAll(profile);return row}} onSaveResult={async(o,f,complete)=>{await savePMResult(o,f,complete);await loadAll(profile);notify(complete?'บันทึกและปิด PM แล้ว':'บันทึก PM ไว้ทำต่อแล้ว')}} onFinding={o=>{setFindingJob({machine_id:o.machine_id,machines:machines.find(m=>m.id===o.machine_id),title:o.standard_snapshot.title,initial_finding:`[PM ${o.standard_snapshot.code} · ${o.due_date}]\n`+o.results.filter(r=>r.result==='abnormal').map(r=>`${o.standard_snapshot.items.find(i=>i.id===r.item_id)?.name}: ${r.note}`).join('\n')});setFindingOpen(true)}}/>,
    reports:<Reports machines={machines} jobs={jobs} repairs={repairs} findings={findings} inspections={inspections} kpiSettings={kpiSettings}/>
  }[page]

  return <>
    <Layout dataErrors={dataErrors} lastSynced={lastSync} page={page} setPage={setPage} profile={profile} onRefresh={()=>loadAll(profile)} onNewPlan={openNewPlan} planner={rolePlanner(profile.role)}>{refreshing&&<div className="sync-bar"><i/></div>}{dataErrors.length>0&&<div className="form-error" role="alert">โหลดข้อมูลบางส่วนไม่สำเร็จ ({dataErrors.join(', ')}) ข้อมูลสรุปอาจไม่ครบ <button type="button" onClick={()=>loadAll(profile)}>ลองโหลดใหม่</button></div>}{pageNode}</Layout>
    <PlanBuilder open={planOpen} onClose={()=>{setPlanOpen(false);setPlanInitialDate('')}} machines={machines} technicians={technicians} editingGroup={editingGroup} sourceContext={planSource} initialDate={planInitialDate} onSave={savePlan}/>
    <DeleteConfirmModal target={deleteTarget} onClose={()=>setDeleteTarget(null)} onDelete={deleteRecords}/>
    <ExecutionModal linkedFinding={findings.find(f=>f.id===finishJob?.source_finding_id)} otherOpenJobs={jobs.filter(j=>j.id!==finishJob?.id&&j.source_finding_id===finishJob?.source_finding_id&&!['completed','cancelled'].includes(j.job_status)).length} job={finishJob} open={!!finishJob} onClose={()=>setFinishJob(null)} onFinish={completeJob}/>
    <FindingModal open={findingOpen} onClose={()=>setFindingOpen(false)} machines={machines} job={findingJob} profile={profile} onSave={saveFinding}/>
    {toast&&<div className={`toast-pro ${toast.type}`}>{toast.message}</div>}
  </>
}
