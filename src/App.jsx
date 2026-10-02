import React, { useCallback, useEffect, useState } from 'react'
import { supabase } from './lib/supabase.js'
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
  const [pmPlans,setPmPlans]=useState([])
  const [pmSchedule,setPmSchedule]=useState([])
  const [inspections,setInspections]=useState([])
  const [inspectionTemplates,setInspectionTemplates]=useState([])
  const [inspectionItems,setInspectionItems]=useState([])
  const [opportunities,setOpportunities]=useState([])
  const [spareRequests,setSpareRequests]=useState([])
  const [kpiSettings,setKpiSettings]=useState([])
  const [page,setPage]=useState('menu')
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
  const [historyFocus,setHistoryFocus]=useState('')
  const [followupFocus,setFollowupFocus]=useState('')

  const notify=useCallback((message,type='ok')=>{setToast({message,type});setTimeout(()=>setToast(null),3200)},[])

  const loadProfile=useCallback(async()=>{
    const {data,error}=await supabase.from('app_profiles').select('id,auth_user_id,employee_code,full_name,department_id,role,shift,position').eq('username','ij-web').eq('is_active',true).single()
    if(error) throw error
    setProfile(data); return data
  },[])

  const loadAll=useCallback(async(userProfile=profile)=>{
    if(!userProfile) return
    setRefreshing(true)
    try{
      const {data:dept,error:deptErr}=await supabase.from('departments').select('*').eq('dept_code','IJ').single()
      if(deptErr) throw deptErr
      setDepartment(dept)
      const since=new Date(); since.setFullYear(since.getFullYear()-3)
      const modules=[
        ['machines',supabase.from('machines').select('id,machine_no,machine_name,area,section,criticality,equipment_type,has_robot,department_id,department_code,target_mtbf_hr,target_mttr_min,planned_hours_month').eq('department_code','IJ').eq('is_active',true).order('machine_no')],
        ['jobs',supabase.from('ij_tpm_jobs').select('*, machines(id,machine_no,machine_name,area,criticality), ij_tpm_executions(*)').eq('department_id',dept.id).order('planned_date',{ascending:false}).order('sequence_no',{ascending:true}).limit(1800)],
        ['repairs',supabase.from('repair_reports').select('id,department_id,machine_id,record_no,machine_no_snapshot,machine_name_snapshot,symptom,cause,action_taken,spare_parts,status,started_at,finished_at,loss_time_min,technician_name_snapshot,problem_type,severity,remark,source_system').eq('department_id',dept.id).is('deleted_at',null).gte('started_at',since.toISOString()).order('started_at',{ascending:false}).limit(3000)],
        ['findings',supabase.from('ij_tpm_findings').select('*, machines(id,machine_no,machine_name)').eq('department_id',dept.id).order('created_at',{ascending:false}).limit(1600)],
        ['findingAttachments',supabase.from('ij_finding_attachments').select('*').eq('department_id',dept.id).order('created_at',{ascending:false}).limit(4000)],
        ['pmPlans',supabase.from('pm_plans').select('*, machines(id,machine_no,machine_name)').eq('department_id',dept.id).eq('is_active',true).order('created_at',{ascending:false})],
        ['pmSchedule',supabase.from('pm_schedule').select('*').eq('department_id',dept.id).order('due_date',{ascending:false}).limit(2000)],
        ['inspections',supabase.from('ij_condition_inspections').select('*, machines(id,machine_no,machine_name,area,criticality)').eq('department_id',dept.id).order('inspection_date',{ascending:false}).order('created_at',{ascending:false}).limit(1500)],
        ['templates',supabase.from('ij_inspection_templates').select('*').eq('department_id',dept.id).eq('is_active',true).order('created_at')],
        ['templateItems',supabase.from('ij_inspection_template_items').select('*').eq('is_active',true).order('sort_order')],
        ['opportunities',supabase.from('ij_opportunities').select('*, machines(id,machine_no,machine_name)').eq('department_id',dept.id).order('created_at',{ascending:false}).limit(1000)],
        ['spares',supabase.from('spare_requests').select('*, machine:machines(id,machine_no,machine_name)').eq('department_id',dept.id).order('created_at',{ascending:false}).limit(1500)],
        ['kpi',supabase.from('kpi_settings').select('*').eq('dept_code','IJ').order('updated_at',{ascending:false})]
      ]
      const results=await Promise.all(modules.map(async([name,q])=>{const result=await q;if(result.error)console.error(`[IJ] load ${name} failed`,result.error);return[name,result]}))
      const map=Object.fromEntries(results)
      if(!map.machines.error)setMachines([...(map.machines.data||[])].sort(naturalMachineSort))
      if(!map.repairs.error)setRepairs(map.repairs.data||[])
      if(!map.findings.error){
        let findingRows=map.findings.data||[]
        const attachmentRows=!map.findingAttachments?.error?(map.findingAttachments?.data||[]):[]
        if(attachmentRows.length){
          const signedMap=new Map()
          const paths=[...new Set(attachmentRows.map(a=>a.storage_path).filter(Boolean))]
          try{
            for(let i=0;i<paths.length;i+=100){
              const batch=paths.slice(i,i+100)
              const {data:signed,error:signedErr}=await supabase.storage.from('ij-defect-photos').createSignedUrls(batch,3600)
              if(signedErr)throw signedErr
              ;(signed||[]).forEach(x=>{if(x.path)signedMap.set(x.path,x.signedUrl||x.signed_url||null)})
            }
          }catch(e){console.error('[IJ] defect photo signed URL failed',e)}
          const byFinding=new Map()
          attachmentRows.forEach(a=>{if(!byFinding.has(a.finding_id))byFinding.set(a.finding_id,[]);byFinding.get(a.finding_id).push({...a,signed_url:signedMap.get(a.storage_path)||null})})
          findingRows=findingRows.map(f=>({...f,attachments:byFinding.get(f.id)||[]}))
        }else findingRows=findingRows.map(f=>({...f,attachments:[]}))
        setFindings(findingRows)
      }
      if(!map.pmPlans.error)setPmPlans(map.pmPlans.data||[])
      if(!map.pmSchedule.error)setPmSchedule(map.pmSchedule.data||[])
      if(!map.inspections.error)setInspections(map.inspections.data||[])
      if(!map.templates.error)setInspectionTemplates(map.templates.data||[])
      if(!map.templateItems.error)setInspectionItems(map.templateItems.data||[])
      if(!map.opportunities.error)setOpportunities(map.opportunities.data||[])
      if(!map.spares.error)setSpareRequests(map.spares.data||[])
      if(!map.kpi.error)setKpiSettings(map.kpi.data||[])
      if(!map.jobs.error){
        let enriched=map.jobs.data||[]
        try{
          const {data:assignees,error}=await supabase.from('ij_tpm_job_assignees').select('id,job_id,profile_id,is_lead').limit(7000)
          if(error)throw error
          const jobIds=new Set(enriched.map(j=>j.id));const rel=(assignees||[]).filter(a=>jobIds.has(a.job_id));const profileIds=[...new Set(rel.map(a=>a.profile_id).filter(Boolean))]
          const profiles=[];for(let i=0;i<profileIds.length;i+=100){const {data,error:pErr}=await supabase.from('app_profiles').select('id,full_name,employee_code,shift').in('id',profileIds.slice(i,i+100));if(pErr)throw pErr;profiles.push(...(data||[]))}
          const pMap=new Map(profiles.map(x=>[x.id,x])),byJob=new Map();rel.forEach(a=>{if(!byJob.has(a.job_id))byJob.set(a.job_id,[]);byJob.get(a.job_id).push({...a,assignee_profile:pMap.get(a.profile_id)||null})})
          enriched=enriched.map(j=>({...j,ij_tpm_job_assignees:byJob.get(j.id)||[]}))
        }catch(e){console.error('[IJ] assignee merge failed',e);enriched=enriched.map(j=>({...j,ij_tpm_job_assignees:[]}))}
        setJobs(enriched)
      }
      if(rolePlanner(userProfile.role)){
        const {data:t,error}=await supabase.from('app_profiles').select('id,employee_code,full_name,role,shift,department_id').eq('is_active',true).eq('department_id',dept.id).in('role',['technician','supervisor']).order('full_name')
        if(!error)setTechnicians(t||[])
      }else setTechnicians([userProfile])
    }finally{setRefreshing(false)}
  },[profile])

  const boot=useCallback(async()=>{setLoading(true);try{const p=await loadProfile();if(p)await loadAll(p)}catch(e){console.error(e);notify(e.message||'System loading failed · โหลดระบบไม่สำเร็จ','error')}finally{setLoading(false)}},[loadProfile,loadAll,notify])
  useEffect(()=>{boot()},[])

  const openNewPlan=(date='')=>{const chosen=typeof date==='string'?date:'';setEditingGroup(null);setPlanSource(null);setPlanInitialDate(chosen);setPlanOpen(true)}
  const openEditGroup=id=>{setEditingGroup(jobs.filter(j=>(j.plan_group_id||j.id)===id));setPlanSource(null);setPlanInitialDate('');setPlanOpen(true)}
  const openSource=(type,data)=>{setEditingGroup(null);setPlanSource({type,data});setPlanInitialDate(type==='pm'?(data?.due_date||''):'');setPlanOpen(true)}
  const openMachine=id=>{setHistoryFocus(id);setPage('history')}
  const openFollowUp=f=>{setFollowupFocus(f.id);setPage('followup')}

  const savePlan=async({meta,rows,assignees})=>{
    if(!department||!profile)return
    const groupId=editingGroup?.[0]?.plan_group_id||crypto.randomUUID(),ready=['confirmed','not_required'].includes(meta.production_status)&&['approved','not_required'].includes(meta.manager_status)
    const keepIds=new Set(rows.filter(r=>r.id).map(r=>r.id));for(const old of (editingGroup||[]).filter(j=>!keepIds.has(j.id))){const {error}=await supabase.from('ij_tpm_jobs').delete().eq('id',old.id);if(error)throw error}
    let firstJobId=null
    for(let i=0;i<rows.length;i++){
      const row=rows[i],existing=editingGroup?.find(j=>j.id===row.id),current=existing?.job_status,jobStatus=['in_progress','completed','partial','cancelled'].includes(current)?current:(ready?'planned':'draft')
      const source={source_repair_report_id:null,source_finding_id:null,source_opportunity_id:null,source_pm_plan_id:null}
      if(planSource&&i===0){if(planSource.type==='repair')source.source_repair_report_id=planSource.data.id;if(planSource.type==='finding')source.source_finding_id=planSource.data.id;if(planSource.type==='opportunity')source.source_opportunity_id=planSource.data.id;if(planSource.type==='pm')source.source_pm_plan_id=planSource.data.plan_id||null}
      const payload={department_id:department.id,machine_id:row.machine_id,work_type:row.work_type,title:row.title.trim(),details:row.details||null,reason_trigger:row.reason_trigger||null,priority:row.priority,planned_date:meta.date,planned_start_time:meta.time||null,planned_stop_min:Number(row.planned_stop_min)||0,need_machine_stop:row.need_machine_stop,production_status:meta.production_status,manager_status:meta.manager_status,job_status:jobStatus,plan_group_id:groupId,plan_group_name:meta.name||null,plan_group_note:meta.note||null,sequence_no:i,...(existing?{}:source)}
      let jobId=row.id
      if(jobId){const {error}=await supabase.from('ij_tpm_jobs').update(payload).eq('id',jobId);if(error)throw error}else{const {data,error}=await supabase.from('ij_tpm_jobs').insert({...payload,created_by:profile.id}).select('id').single();if(error)throw error;jobId=data.id}
      if(i===0)firstJobId=jobId
      const {error:delErr}=await supabase.from('ij_tpm_job_assignees').delete().eq('job_id',jobId);if(delErr)throw delErr
      if(assignees.length){const {error}=await supabase.from('ij_tpm_job_assignees').insert(assignees.map((pid,index)=>({job_id:jobId,profile_id:pid,is_lead:index===0,assigned_by:profile.id})));if(error)throw error}
    }
    if(planSource?.type==='opportunity'&&firstJobId)await supabase.from('ij_opportunities').update({converted_job_id:firstJobId,status:'planned'}).eq('id',planSource.data.id)
    if(planSource?.type==='finding'&&planSource.data.status==='open')await supabase.from('ij_tpm_findings').update({status:'waiting_machine_stop'}).eq('id',planSource.data.id)
    setPlanSource(null);await loadAll(profile);notify('TPM / PM plan saved · บันทึกแผนเรียบร้อย')
  }

  const startJob=async job=>{const cur=(job.ij_tpm_executions||[])[0];const {error}=await supabase.from('ij_tpm_executions').upsert({job_id:job.id,actual_started_at:cur?.actual_started_at||new Date().toISOString(),updated_by:profile.id},{onConflict:'job_id'});if(error)return notify(error.message,'error');await loadAll(profile);notify(`Job started ${job.machines?.machine_no} · เริ่มงานแล้ว`)}
  const completeJob=async(job,form)=>{const cur=(job.ij_tpm_executions||[])[0];const {error}=await supabase.from('ij_tpm_executions').upsert({job_id:job.id,actual_started_at:cur?.actual_started_at||new Date().toISOString(),actual_completed_at:new Date().toISOString(),actual_stop_min:Number(form.actual_stop_min)||0,result_summary:form.result_summary||null,abnormal_found:form.abnormal_found,follow_up_required:form.follow_up_required,parts_used:form.parts_used||null,execution_note:form.execution_note||null,completion_status:form.completion_status,updated_by:profile.id},{onConflict:'job_id'});if(error)throw error;if(form.follow_up_required)await supabase.from('ij_tpm_findings').insert({job_id:job.id,department_id:department.id,machine_id:job.machine_id,finding:`TPM follow-up: ${job.title}`,risk:form.result_summary||null,priority:job.priority||'B',status:'open',spare_required:false,found_by:profile.id,source_type:'tpm',finding_type:'defect'});await loadAll(profile);notify(`Job completed ${job.machines?.machine_no} · ปิดงานเรียบร้อย`)}
  const postponeJob=async job=>{const date=prompt('Postpone to date / เลื่อนไปวันที่ (YYYY-MM-DD)',job.planned_date);if(!date)return;const {error}=await supabase.from('ij_tpm_jobs').update({planned_date:date,job_status:'postponed'}).eq('id',job.id);if(error)return notify(error.message,'error');await loadAll(profile);notify('Job postponed · เลื่อนงานแล้ว')}

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
  const closeFinding=async f=>{const {error}=await supabase.from('ij_tpm_findings').update({status:'closed',closed_by:profile.id,closed_at:new Date().toISOString()}).eq('id',f.id);if(error)return notify(error.message,'error');await loadAll(profile);notify('Defect closed · ปิด Defect แล้ว')}

  const saveFollowUpAction=async(f,form)=>{
    const closing=form.status==='closed'
    const patch={
      status:form.status,
      owner_profile_id:form.owner_profile_id||null,
      temporary_action:form.temporary_action||null,
      permanent_action:form.permanent_action||null,
      target_date:form.target_date||null,
      spare_required:!!form.spare_required,
      need_machine_stop:!!form.need_machine_stop,
      verification_note:form.verification_note||null,
      action_updated_at:new Date().toISOString(),
      ...(closing?{verified_by:profile.id,verified_at:new Date().toISOString(),closed_by:profile.id,closed_at:new Date().toISOString()}:{verified_by:null,verified_at:null,closed_by:null,closed_at:null})
    }
    const {error}=await supabase.from('ij_tpm_findings').update(patch).eq('id',f.id)
    if(error)throw error
    await loadAll(profile)
    notify(closing?'Follow-up verified and closed · ยืนยันผลและปิดงานแล้ว':'Follow-up action saved · บันทึกแผนติดตามแล้ว')
  }

  const saveInspection=async({machine_id,template_id,rows,note})=>{
    const valid=rows.filter(r=>r.result_status!=='na'),score=valid.length?Math.round(valid.reduce((s,r)=>s+(r.result_status==='normal'?100:r.result_status==='watch'?70:30),0)/valid.length):100
    const overall=rows.some(r=>r.result_status==='abnormal')?'abnormal':rows.some(r=>r.result_status==='watch')?'watch':'normal'
    const now=new Date().toISOString()
    const machineInfo=machines.find(m=>m.id===machine_id)
    const machineCode=(machineInfo?.machine_no||'unknown-machine').replace(/[^a-zA-Z0-9_-]/g,'_')
    const {data:inspection,error}=await supabase.from('ij_condition_inspections').insert({department_id:department.id,machine_id,template_id:template_id||null,inspection_date:isoDate(),started_at:now,completed_at:now,inspector_profile_id:profile.id,inspector_name_snapshot:profile.full_name,shift:profile.shift||null,overall_status:overall,condition_score:score,note:note||null}).select('id').single();if(error)throw error
    const uploadWarnings=[]
    for(const row of rows){
      let findingId=null
      if(['watch','abnormal'].includes(row.result_status)){
        const {data:f,error:fErr}=await supabase.from('ij_tpm_findings').insert({department_id:department.id,machine_id,source_type:'inspection',source_inspection_id:inspection.id,finding_type:'condition',finding:`Inspection: ${row.item_name}`,risk:row.note||`${row.result_status} condition`,recommendation:'ตรวจสอบและวางแผน Corrective / TPM ตามความเหมาะสม',priority:row.result_status==='abnormal'?(row.criticality==='C'?'B':'A'):(row.criticality||'B'),status:'open',spare_required:false,found_by:profile.id}).select('id').single();if(fErr)throw fErr;findingId=f.id
      }
      const {data:result,error:rErr}=await supabase.from('ij_condition_results').insert({inspection_id:inspection.id,template_item_id:row.template_item_id||null,zone_code:row.zone_code||null,component_code:row.component_code||null,item_name_snapshot:row.item_name,result_status:row.result_status,numeric_value:row.numeric_value||null,text_value:row.text_value||null,unit:row.unit||null,note:row.note||null,finding_id:findingId}).select('id').single();if(rErr)throw rErr
      const photos=(row.photos||[]).filter(p=>p?.file)
      if(photos.length){
        for(let i=0;i<photos.length;i++){
          const p=photos[i]
          try{
            const ext=(p.file?.name?.split('.').pop()||'jpg').toLowerCase()
            const path=`${machineCode}/${inspection.id}/${result.id}_${Date.now()}_${i+1}.${ext}`
            const {error:uploadError}=await supabase.storage.from('ij-inspection-photos').upload(path,p.file,{cacheControl:'3600',upsert:false,contentType:p.file.type||'image/jpeg'})
            if(uploadError)throw uploadError
            const {data:urlData}=supabase.storage.from('ij-inspection-photos').getPublicUrl(path)
            const {error:metaError}=await supabase.from('ij_condition_result_attachments').insert({result_id:result.id,inspection_id:inspection.id,machine_id,file_name:p.name||`photo_${i+1}.${ext}`,storage_bucket:'ij-inspection-photos',storage_path:path,public_url:urlData?.publicUrl||null,mime_type:p.type||p.file.type||'image/jpeg',file_size:p.size||p.file.size||null,uploaded_by:profile.id})
            if(metaError)throw metaError
          }catch(err){
            console.error('Inspection photo upload failed',err)
            uploadWarnings.push(`${row.item_name} (${i+1})`)
          }
        }
      }
    }
    await loadAll(profile)
    if(uploadWarnings.length) notify(`Inspection saved, but some photos failed to upload · บันทึกแล้ว แต่รูปอัปโหลดไม่ครบ: ${uploadWarnings.join(', ')}`,'error')
    else notify(`Inspection completed · ตรวจเสร็จแล้ว · Condition ${score}%`)
  }

  const saveOpportunity=async form=>{const {error}=await supabase.from('ij_opportunities').insert({department_id:department.id,machine_id:form.machine_id||null,category:form.category,title:form.title.trim(),details:form.details||null,expected_benefit:form.expected_benefit||null,priority:form.priority,status:'open',target_date:form.target_date||null,created_by:profile.id,source_type:'manual'});if(error)throw error;await loadAll(profile);notify('Opportunity saved · บันทึก Opportunity แล้ว')}
  const updateOpportunity=async(o,status)=>{const {error}=await supabase.from('ij_opportunities').update({status,completed_at:status==='completed'?new Date().toISOString():null}).eq('id',o.id);if(error)return notify(error.message,'error');await loadAll(profile);notify('Opportunity updated · อัปเดต Opportunity แล้ว')}

  const saveSpare=async form=>{const payload={department_id:department.id,machine_id:form.machine_id||null,requester_profile_id:profile.id,requester_name_snapshot:profile.full_name,requester_code_snapshot:profile.employee_code||null,requester_shift_snapshot:profile.shift||null,requester_role_snapshot:profile.role,source_type:'technician',requested_part_name:form.requested_part_name.trim(),requested_part_no:form.requested_part_no||null,requested_specification:form.requested_specification||null,requested_reason:form.requested_reason.trim(),part_name:form.requested_part_name.trim(),part_no:form.requested_part_no||null,specification:form.requested_specification||null,quantity:Number(form.quantity)||1,unit:form.unit||'pcs',urgency:form.urgency,remark:form.remark||null,status:'new'};const {error}=await supabase.from('spare_requests').insert(payload);if(error)throw error;await loadAll(profile);notify('Spare request submitted · ส่งคำขออะไหล่แล้ว')}
  const updateSpareStatus=async(request,nextStatus)=>{const patch={status:nextStatus,status_changed_at:new Date().toISOString()};if(nextStatus==='closed'){patch.closed_by=profile.id;patch.closed_at=new Date().toISOString()}else{patch.closed_by=null;patch.closed_at=null}const {error}=await supabase.from('spare_requests').update(patch).eq('id',request.id);if(error)throw error;await loadAll(profile);notify(`Spare status updated · อัปเดตสถานะเป็น ${nextStatus.replaceAll('_',' ')}`)}

  const saveKpiSettings=async form=>{const clean=v=>v===''||v===null?null:Number(v);const current=kpiSettings.find(x=>x.machine_no==null)||kpiSettings[0];const payload={dept_code:'IJ',machine_no:null,hours_per_day:clean(form.hours_per_day)??24,days_per_week:clean(form.days_per_week)??7,target_availability:clean(form.target_availability)??95,target_mtbf_hr:clean(form.target_mtbf_hr),target_mttr_min:clean(form.target_mttr_min),target_tpm_completion:clean(form.target_tpm_completion),target_pm_compliance:clean(form.target_pm_compliance),target_defect_closure:clean(form.target_defect_closure),target_repeat_failure_pct:clean(form.target_repeat_failure_pct),updated_at:new Date().toISOString()};let error;if(current){({error}=await supabase.from('kpi_settings').update(payload).eq('id',current.id))}else{({error}=await supabase.from('kpi_settings').insert(payload))}if(error)throw error;await loadAll(profile);notify('KPI targets saved · บันทึก KPI Targets แล้ว')}

  if(loading)return <div className="boot-screen"><div className="boot-logo">IJ</div><div className="boot-copy"><b>Opening IJ Maintenance</b><small>กำลังโหลดระบบโดยไม่ต้องเข้าสู่ระบบ</small></div><Skeleton rows={3}/></div>
  if(!profile)return <div className="boot-screen boot-error"><div className="boot-logo">IJ</div><div className="boot-copy"><b>Cannot open IJ Maintenance</b><small>โหลดข้อมูลไม่สำเร็จ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่</small><button className="btn primary" onClick={boot}>Retry · ลองใหม่</button></div></div>

  const pageNode={
    menu:<MainMenu profile={profile} jobs={jobs} repairs={repairs} findings={findings} spares={spareRequests} planner={rolePlanner(profile.role)} onGo={setPage} onNewPlan={openNewPlan}/>,
    dashboard:<Dashboard jobs={jobs} repairs={repairs} findings={findings} inspections={inspections} pmSchedule={pmSchedule} kpiSettings={kpiSettings} machines={machines} onGo={setPage} onEditGroup={openEditGroup}/>,
    assets:<Assets machines={machines} jobs={jobs} repairs={repairs} findings={findings} inspections={inspections} onOpenMachine={openMachine}/>,
    weekly:<WeeklyPlan profile={profile} jobs={jobs} machines={machines} pmSchedule={pmSchedule} weekStart={weekStart} setWeekStart={setWeekStart} onNewPlan={openNewPlan} onCreatePM={p=>openSource('pm',p)} onEditGroup={openEditGroup} onStart={startJob} onFinish={setFinishJob} onFinding={j=>{setFindingJob(j);setFindingOpen(true)}} onPostpone={postponeJob}/>,
    inspection:<Inspection profile={profile} machines={machines} inspections={inspections} templates={inspectionTemplates} templateItems={inspectionItems} onSaveInspection={saveInspection} onOpenMachine={openMachine}/>,
    defects:<Defects profile={profile} findings={findings} machines={machines} onNew={()=>{setFindingJob(null);setFindingOpen(true)}} onCreateTPM={f=>openSource('finding',f)} onFollowUp={openFollowUp}/>,
    followup:<FollowUp profile={profile} findings={findings} technicians={technicians} onSaveAction={saveFollowUpAction} onCreateTPM={f=>openSource('finding',f)} initialFinding={followupFocus} onConsumedInitial={()=>setFollowupFocus('')}/>,
    opportunity:<Opportunities profile={profile} machines={machines} opportunities={opportunities} onSave={saveOpportunity} onCreateTPM={o=>openSource('opportunity',o)} onUpdateStatus={updateOpportunity}/>,
    history:<MachineHistory machines={machines} departmentId={department?.id} initialMachine={historyFocus} onConsumedInitial={()=>setHistoryFocus('')}/>,
    repairs:<RepairHistory profile={profile} repairs={repairs} machines={machines} onCreateTPM={r=>openSource('repair',r)}/>,
    kpi:<KPI profile={profile} machines={machines} jobs={jobs} repairs={repairs} findings={findings} pmSchedule={pmSchedule} kpiSettings={kpiSettings} onSaveSettings={saveKpiSettings}/>,
    spares:<SpareParts profile={profile} machines={machines} requests={spareRequests} onSave={saveSpare} onUpdateStatus={updateSpareStatus}/>,
    pm:<PMStandard plans={pmPlans} schedule={pmSchedule} onCreateTPM={p=>openSource('pm',p)}/>,
    reports:<Reports machines={machines} jobs={jobs} repairs={repairs} findings={findings} inspections={inspections} kpiSettings={kpiSettings}/>
  }[page]

  return <>
    <Layout page={page} setPage={setPage} profile={profile} onRefresh={()=>loadAll(profile)} onNewPlan={openNewPlan} planner={rolePlanner(profile.role)}>{refreshing&&<div className="sync-bar"><i/></div>}{pageNode}</Layout>
    <PlanBuilder open={planOpen} onClose={()=>{setPlanOpen(false);setPlanInitialDate('')}} machines={machines} technicians={technicians} editingGroup={editingGroup} sourceContext={planSource} initialDate={planInitialDate} onSave={savePlan}/>
    <ExecutionModal job={finishJob} open={!!finishJob} onClose={()=>setFinishJob(null)} onFinish={completeJob}/>
    <FindingModal open={findingOpen} onClose={()=>setFindingOpen(false)} machines={machines} job={findingJob} profile={profile} onSave={saveFinding}/>
    {toast&&<div className={`toast-pro ${toast.type}`}>{toast.message}</div>}
  </>
}
