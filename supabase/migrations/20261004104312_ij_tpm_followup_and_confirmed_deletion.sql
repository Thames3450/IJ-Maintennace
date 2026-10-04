-- v13.11: atomic TPM/follow-up closeout and non-destructive IJ list deletion.
-- Existing records are not closed, deleted or backfilled by this migration.
create table if not exists public.ij_deleted_records (
 id uuid primary key default gen_random_uuid(),
 department_id uuid not null references public.departments(id),
 record_type text not null check(record_type in ('finding','tpm_job','inspection','opportunity','spare_request','pm_order','pm_standard','repair')),
 record_id uuid not null,
 deleted_by uuid references public.app_profiles(id),
 deleted_at timestamptz not null default now(),
 unique(record_type,record_id)
);
alter table public.ij_deleted_records enable row level security;
create policy ij_deleted_anon on public.ij_deleted_records for all to anon
 using(department_id in(select id from public.departments where dept_code='IJ'))
 with check(department_id in(select id from public.departments where dept_code='IJ'));
create policy ij_deleted_read on public.ij_deleted_records for select to authenticated
 using(private.can_read_department(department_id));
create policy ij_deleted_planner on public.ij_deleted_records for all to authenticated
 using(private.is_admin() or (private.is_supervisor() and department_id=private.current_department_id()))
 with check(private.is_admin() or (private.is_supervisor() and department_id=private.current_department_id()));
grant select,insert,delete on public.ij_deleted_records to anon,authenticated;
create index if not exists ij_deleted_records_department_idx on public.ij_deleted_records(department_id);
create index if not exists ij_tpm_jobs_source_finding_idx on public.ij_tpm_jobs(source_finding_id) where source_finding_id is not null;
alter table public.ij_tpm_executions add column if not exists verification_note text;
alter table public.ij_tpm_executions add column if not exists completion_attempt_id uuid;
alter table public.ij_tpm_findings add column if not exists work_result text;
alter table public.ij_tpm_findings add column if not exists actual_action text;
alter table public.ij_tpm_findings add column if not exists parts_used text;
alter table public.ij_tpm_findings add column if not exists work_started_at timestamptz;
alter table public.ij_tpm_findings add column if not exists work_started_by uuid references public.app_profiles(id);
alter table public.ij_tpm_findings add column if not exists work_completed_at timestamptz;
alter table public.ij_tpm_findings add column if not exists work_completed_by uuid references public.app_profiles(id);

create or replace function public.ij_work_actor(p_department_id uuid) returns uuid
language plpgsql stable security invoker set search_path='' as $$
declare actor uuid;
begin
 if current_user='anon' then
  select id into actor from public.app_profiles where username='ij-web' and is_active and department_id=p_department_id;
 else
  actor:=private.current_profile_id();
 end if;
 if actor is null then raise exception 'ไม่พบผู้บันทึกงานที่มีสิทธิ์'; end if;
 return actor;
end $$;

create or replace function public.ij_delete_records(p_record_type text,p_record_ids uuid[],p_confirmed boolean)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare tbl text; rid uuid; dept uuid; actor uuid; total integer:=0;
begin
 if p_confirmed is distinct from true then raise exception 'กรุณายืนยันก่อนลบรายการ'; end if;
 if coalesce(cardinality(p_record_ids),0)=0 or cardinality(p_record_ids)>200 then raise exception 'เลือก 1 ถึง 200 รายการที่จะลบ'; end if;
 tbl:=case p_record_type when 'finding' then 'ij_tpm_findings' when 'tpm_job' then 'ij_tpm_jobs' when 'inspection' then 'ij_condition_inspections' when 'opportunity' then 'ij_opportunities' when 'spare_request' then 'spare_requests' when 'pm_order' then 'ij_pm_orders' when 'pm_standard' then 'ij_pm_standards' when 'repair' then 'repair_reports' end;
 if tbl is null then raise exception 'ประเภทข้อมูลไม่รองรับการลบ'; end if;
 for rid in select distinct x from unnest(p_record_ids) x order by x loop
  execute format('select department_id from public.%I where id=$1',tbl) into dept using rid;
  if dept is null or not exists(select 1 from public.departments where id=dept and dept_code='IJ') then raise exception 'ไม่พบรายการหรือไม่มีสิทธิ์ลบ'; end if;
  actor:=public.ij_work_actor(dept);
  insert into public.ij_deleted_records(department_id,record_type,record_id,deleted_by) values(dept,p_record_type,rid,actor) on conflict(record_type,record_id) do nothing;
  total:=total+1;
 end loop;
 return jsonb_build_object('count',total);
end $$;

create or replace function public.ij_tpm_start_job(p_job_id uuid) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare j public.ij_tpm_jobs; f public.ij_tpm_findings; actor uuid; owner_id uuid; affected integer;
begin
 select * into j from public.ij_tpm_jobs where id=p_job_id for update;
 if not found or exists(select 1 from public.ij_deleted_records where record_type='tpm_job' and record_id=p_job_id) then raise exception 'ไม่พบงาน TPM หรือถูกลบจากรายการแล้ว'; end if;
 actor:=public.ij_work_actor(j.department_id);
 if j.job_status='in_progress' then return jsonb_build_object('id',j.id); end if;
 if j.job_status not in ('planned','postponed','partial') or j.production_status not in ('confirmed','not_required') or j.manager_status not in ('approved','not_required') then raise exception 'กรุณายืนยันฝ่ายผลิตและอนุมัติแผนก่อนเริ่มงาน'; end if;
 if j.source_finding_id is not null and not exists(select 1 from public.ij_deleted_records where record_type='finding' and record_id=j.source_finding_id) then
  select * into f from public.ij_tpm_findings where id=j.source_finding_id for update;
  if not found then raise exception 'ไม่พบงานติดตามต้นทางหรือไม่มีสิทธิ์อัปเดต'; end if;
  if f.department_id<>j.department_id or f.machine_id<>j.machine_id then raise exception 'งาน TPM และงานติดตามต้องเป็นเครื่องเดียวกัน'; end if;
 end if;
 insert into public.ij_tpm_executions(job_id,actual_started_at,updated_by) values(j.id,now(),actor)
 on conflict(job_id) do update set actual_started_at=coalesce(ij_tpm_executions.actual_started_at,excluded.actual_started_at),actual_completed_at=null,updated_by=actor;
 update public.ij_tpm_jobs set job_status='in_progress' where id=j.id;
 get diagnostics affected=row_count; if affected<>1 then raise exception 'ไม่มีสิทธิ์เริ่มงาน TPM'; end if;
 select profile_id into owner_id from public.ij_tpm_job_assignees where job_id=j.id order by is_lead desc,id limit 1;
 if f.id is not null and f.status<>'closed' then
  update public.ij_tpm_findings set status='in_progress',owner_profile_id=coalesce(owner_id,owner_profile_id,actor),permanent_action=coalesce(nullif(btrim(permanent_action),''),nullif(j.details,''),j.title),target_date=coalesce(target_date,j.planned_date),work_started_at=coalesce(work_started_at,now()),work_started_by=coalesce(work_started_by,actor),action_updated_at=now()
  where id=j.source_finding_id and department_id=j.department_id and machine_id=j.machine_id and status<>'closed'
    and not exists(select 1 from public.ij_deleted_records where record_type='finding' and record_id=j.source_finding_id);
  get diagnostics affected=row_count; if affected<>1 then raise exception 'ไม่มีสิทธิ์อัปเดตงานติดตาม'; end if;
 end if;
 return jsonb_build_object('id',j.id);
end $$;

create or replace function public.ij_tpm_finish_job(p_job_id uuid,p_result jsonb) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare j public.ij_tpm_jobs; f public.ij_tpm_findings; e public.ij_tpm_executions; actor uuid; owner_id uuid; completion text; work text; verify text; attempt uuid; stop_min integer; needs_followup boolean; close_source boolean; linked boolean:=false; source_status text; other_open boolean; linked_work text; linked_parts text; affected integer;
begin
 select * into j from public.ij_tpm_jobs where id=p_job_id for update;
 if not found or exists(select 1 from public.ij_deleted_records where record_type='tpm_job' and record_id=p_job_id) then raise exception 'ไม่พบงาน TPM หรือถูกลบจากรายการแล้ว'; end if;
 actor:=public.ij_work_actor(j.department_id);
 work:=btrim(coalesce(p_result->>'result_summary','')); verify:=btrim(coalesce(p_result->>'verification_note','')); completion:=p_result->>'completion_status'; attempt:=(p_result->>'attempt_id')::uuid; stop_min:=(p_result->>'actual_stop_min')::integer;
 if work='' then raise exception 'กรุณาระบุสิ่งที่ทำจริงและผลหลังทำ'; end if;
 if completion is null or completion not in ('completed','partial') or attempt is null or stop_min is null or stop_min<0 then raise exception 'ข้อมูลผล TPM ไม่ถูกต้อง'; end if;
 select * into e from public.ij_tpm_executions where job_id=j.id;
 if j.job_status='completed' then
  if e.completion_attempt_id=attempt then return jsonb_build_object('id',j.id,'status',j.job_status,'retried',true); end if;
  raise exception 'งาน TPM ปิดแล้ว ไม่สามารถบันทึกผลซ้ำได้';
 end if;
 if j.job_status not in ('in_progress','partial') then raise exception 'กรุณาเริ่มงาน TPM ก่อนบันทึกผล'; end if;
 if completion='partial' and btrim(coalesce(p_result->>'execution_note',''))='' then raise exception 'กรุณาระบุงานที่ยังเหลือ'; end if;
 needs_followup:=coalesce((p_result->>'follow_up_required')::boolean,false) or completion='partial';
 if j.source_finding_id is not null and not exists(select 1 from public.ij_deleted_records where record_type='finding' and record_id=j.source_finding_id) then
  select * into f from public.ij_tpm_findings where id=j.source_finding_id for update;
  if not found then raise exception 'ไม่พบงานติดตามต้นทางหรือไม่มีสิทธิ์อัปเดต'; end if;
  linked:=true;
  if linked and (f.department_id<>j.department_id or f.machine_id<>j.machine_id) then raise exception 'งาน TPM และงานติดตามต้องเป็นเครื่องเดียวกัน'; end if;
 end if;
 other_open:=exists(select 1 from public.ij_tpm_jobs x where x.source_finding_id=j.source_finding_id and x.id<>j.id and x.job_status not in ('completed','cancelled') and not exists(select 1 from public.ij_deleted_records d where d.record_type='tpm_job' and d.record_id=x.id));
 close_source:=linked and f.status<>'closed' and completion='completed' and not needs_followup and not other_open and coalesce((p_result->>'close_linked_finding')::boolean,true);
 if close_source and verify='' then raise exception 'กรุณาระบุผลตรวจยืนยัน เพื่อปิดงานติดตามพร้อม TPM'; end if;
 insert into public.ij_tpm_executions(job_id,actual_started_at,actual_completed_at,actual_stop_min,result_summary,abnormal_found,follow_up_required,parts_used,execution_note,completion_status,updated_by,verification_note,completion_attempt_id)
 values(j.id,coalesce(e.actual_started_at,now()),now(),stop_min,work,coalesce((p_result->>'abnormal_found')::boolean,false),needs_followup,nullif(p_result->>'parts_used',''),nullif(p_result->>'execution_note',''),completion,actor,nullif(verify,''),attempt)
 on conflict(job_id) do update set actual_completed_at=excluded.actual_completed_at,actual_stop_min=excluded.actual_stop_min,result_summary=excluded.result_summary,abnormal_found=excluded.abnormal_found,follow_up_required=excluded.follow_up_required,parts_used=excluded.parts_used,execution_note=excluded.execution_note,completion_status=excluded.completion_status,updated_by=excluded.updated_by,verification_note=excluded.verification_note,completion_attempt_id=excluded.completion_attempt_id;
 update public.ij_tpm_jobs set job_status=completion where id=j.id;
 get diagnostics affected=row_count; if affected<>1 then raise exception 'ไม่มีสิทธิ์อัปเดตงาน TPM'; end if;
 if linked and f.status<>'closed' then
  select profile_id into owner_id from public.ij_tpm_job_assignees where job_id=j.id order by is_lead desc,id limit 1;
  select case when count(*)>1 then string_agg(concat(x.title,': ',r.result_summary),chr(10)||chr(10) order by x.planned_date,x.sequence_no,x.id) else work end,string_agg(distinct nullif(r.parts_used,''),chr(10)) into linked_work,linked_parts from public.ij_tpm_jobs x join public.ij_tpm_executions r on r.job_id=x.id where x.source_finding_id=f.id and nullif(btrim(r.result_summary),'') is not null and not exists(select 1 from public.ij_deleted_records d where d.record_type='tpm_job' and d.record_id=x.id);
  source_status:=case when close_source then 'closed' when needs_followup or other_open then 'in_progress' else 'verification' end;
  update public.ij_tpm_findings set status=source_status,owner_profile_id=coalesce(owner_id,owner_profile_id,actor),permanent_action=coalesce(nullif(btrim(permanent_action),''),nullif(j.details,''),j.title),target_date=coalesce(target_date,j.planned_date),actual_action=linked_work,work_result=linked_work,parts_used=linked_parts,verification_note=concat('[ผลดำเนินการจริง / Work result]',chr(10),linked_work,chr(10),'[ผลตรวจยืนยัน / Verification]',chr(10),verify),work_started_at=coalesce(work_started_at,e.actual_started_at,now()),work_started_by=coalesce(work_started_by,actor),work_completed_at=case when completion='completed' then now() else null end,work_completed_by=case when completion='completed' then actor else null end,verified_at=case when close_source then now() else null end,verified_by=case when close_source then actor else null end,closed_at=case when close_source then now() else null end,closed_by=case when close_source then actor else null end,action_updated_at=now() where id=f.id;
  get diagnostics affected=row_count; if affected<>1 then raise exception 'ไม่มีสิทธิ์อัปเดตงานติดตาม'; end if;
 elsif (not linked or f.status='closed') and needs_followup and not exists(select 1 from public.ij_tpm_findings where job_id=j.id and finding='TPM follow-up: '||j.title and status<>'closed' and not exists(select 1 from public.ij_deleted_records d where d.record_type='finding' and d.record_id=ij_tpm_findings.id)) then
  insert into public.ij_tpm_findings(job_id,department_id,machine_id,finding,risk,priority,status,found_by,source_type,finding_type) values(j.id,j.department_id,j.machine_id,'TPM follow-up: '||j.title,coalesce(nullif(p_result->>'execution_note',''),work),j.priority,'open',actor,'tpm','defect');
 end if;
 return jsonb_build_object('id',j.id,'status',completion,'finding_status',source_status,'finding_id',case when linked then f.id else null end);
end $$;

create or replace function public.ij_followup_save(p_finding_id uuid,p_action jsonb) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare f public.ij_tpm_findings; actor uuid; new_status text; owner_id uuid; work text; verify text; affected integer;
begin
 select * into f from public.ij_tpm_findings where id=p_finding_id for update;
 if not found or exists(select 1 from public.ij_deleted_records where record_type='finding' and record_id=p_finding_id) then raise exception 'ไม่พบงานติดตามหรือถูกลบแล้ว'; end if;
 actor:=public.ij_work_actor(f.department_id); new_status:=p_action->>'status'; owner_id:=nullif(p_action->>'owner_profile_id','')::uuid; work:=btrim(coalesce(p_action->>'work_result','')); verify:=btrim(coalesce(p_action->>'verification_note',''));
 if f.status='closed' then raise exception 'งานนี้ปิดแล้ว'; end if;
 if new_status is null or new_status not in ('open','ready','in_progress','waiting_spare','waiting_machine_stop','verification','closed') then raise exception 'สถานะงานไม่ถูกต้อง'; end if;
 if new_status in ('verification','closed') and (owner_id is null or work='') then raise exception 'กรุณาระบุผู้รับผิดชอบและผลการทำงานจริง'; end if;
 if new_status='closed' and verify='' then raise exception 'กรุณาระบุผลตรวจยืนยันก่อนปิดงาน'; end if;
 if new_status='closed' and exists(select 1 from public.ij_tpm_jobs j where j.source_finding_id=f.id and j.job_status not in ('completed','cancelled') and not exists(select 1 from public.ij_deleted_records d where d.record_type='tpm_job' and d.record_id=j.id)) then raise exception 'งานนี้มี TPM ที่ยังไม่เสร็จ กรุณาบันทึกผลผ่านงาน TPM'; end if;
 update public.ij_tpm_findings set status=new_status,owner_profile_id=owner_id,permanent_action=coalesce(nullif(btrim(p_action->>'permanent_action'),''),case when new_status in ('verification','closed') then work end),temporary_action=nullif(p_action->>'temporary_action',''),target_date=nullif(p_action->>'target_date','')::date,spare_required=coalesce((p_action->>'spare_required')::boolean,false),need_machine_stop=coalesce((p_action->>'need_machine_stop')::boolean,false),actual_action=nullif(work,''),work_result=nullif(work,''),parts_used=nullif(p_action->>'parts_used',''),verification_note=case when work<>'' then concat('[ผลดำเนินการจริง / Work result]',chr(10),work,chr(10),'[ผลตรวจยืนยัน / Verification]',chr(10),verify) else nullif(verify,'') end,work_started_at=case when new_status in ('in_progress','verification','closed') then coalesce(work_started_at,now()) else work_started_at end,work_started_by=case when new_status in ('in_progress','verification','closed') then coalesce(work_started_by,actor) else work_started_by end,work_completed_at=case when new_status in ('verification','closed') then coalesce(work_completed_at,now()) else work_completed_at end,work_completed_by=case when new_status in ('verification','closed') then coalesce(work_completed_by,actor) else work_completed_by end,verified_at=case when new_status='closed' then now() else null end,verified_by=case when new_status='closed' then actor else null end,closed_at=case when new_status='closed' then now() else null end,closed_by=case when new_status='closed' then actor else null end,action_updated_at=now() where id=f.id;
 get diagnostics affected=row_count; if affected<>1 then raise exception 'ไม่มีสิทธิ์อัปเดตงานติดตาม'; end if;
 return jsonb_build_object('id',f.id,'status',new_status);
end $$;

revoke all on function public.ij_work_actor(uuid),public.ij_delete_records(text,uuid[],boolean),public.ij_tpm_start_job(uuid),public.ij_tpm_finish_job(uuid,jsonb),public.ij_followup_save(uuid,jsonb) from public;
grant execute on function public.ij_work_actor(uuid),public.ij_delete_records(text,uuid[],boolean),public.ij_tpm_start_job(uuid),public.ij_tpm_finish_job(uuid,jsonb),public.ij_followup_save(uuid,jsonb) to anon,authenticated;
notify pgrst,'reload schema';
