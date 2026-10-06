-- v14.1: Employee code is the sole credential by explicit product choice.
-- Opaque expiring sessions enforce roles; knowing another code still allows impersonation.
begin;
create schema if not exists private;
create table private.ij_web_sessions(
 token_hash text primary key, profile_id uuid not null references public.app_profiles(id),
 created_at timestamptz not null default now(), expires_at timestamptz not null default now()+interval '12 hours'
);
alter table private.ij_web_sessions enable row level security;
revoke all on private.ij_web_sessions from public,anon,authenticated;
create index on private.ij_web_sessions(profile_id);
create index on private.ij_web_sessions(expires_at);
create table public.ij_access_audit(
 id uuid primary key default gen_random_uuid(),actor_profile_id uuid references public.app_profiles(id),
 action text not null,target_id text,details jsonb not null default '{}'::jsonb,created_at timestamptz not null default now()
);
alter table public.ij_access_audit enable row level security;
revoke all on public.ij_access_audit from public,anon,authenticated;

create function private.ij_session_profile() returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object('id',p.id,'employee_code',p.employee_code,'full_name',p.full_name,'department_id',p.department_id,'role',a.system_role,'shift',p.shift,'position',p.position)
 from private.ij_web_sessions s join public.app_profiles p on p.id=s.profile_id
 join public.ij_user_access a on a.profile_id=p.id
 where s.token_hash=encode(sha256(convert_to(coalesce(nullif(current_setting('request.headers',true),'')::jsonb->>'x-ij-session',''),'UTF8')),'hex')
 and s.expires_at>now() and p.is_active and a.is_active limit 1
$$;
create function private.ij_has_role(roles text[]) returns boolean language sql stable security invoker set search_path='' as $$
 select coalesce(private.ij_session_profile()->>'role'=any(roles),false)
$$;
create function private.ij_require(roles text[],employee_code text default null) returns uuid
language plpgsql stable security invoker set search_path='' as $$
declare p jsonb:=private.ij_session_profile();begin
 if p is null then raise exception 'กรุณาเข้าสู่ระบบใหม่ / Session expired' using errcode='28000';end if;
 if not coalesce(p->>'role'=any(roles),false) or (employee_code is not null and upper(trim(employee_code))<>upper(p->>'employee_code')) then
 raise exception 'ไม่มีสิทธิ์ดำเนินการ / Permission denied' using errcode='42501';end if;
 return (p->>'id')::uuid;
end $$;
create function private.ij_session_login(code text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare p record;t text;begin
 if code is null or trim(code)!~'^[0-9]{4,12}$' then raise exception 'กรุณากรอกรหัสพนักงาน 4–12 หลัก';end if;
 select ap.*,ua.system_role into p from public.app_profiles ap join public.ij_user_access ua on ua.profile_id=ap.id
 where upper(trim(ap.employee_code))=upper(trim(code)) and ap.is_active and ua.is_active;
 if not found then return null;end if;
 delete from private.ij_web_sessions where expires_at<=now();
 t:=replace(gen_random_uuid()::text||gen_random_uuid()::text,'-','');
 insert into private.ij_web_sessions(token_hash,profile_id) values(encode(sha256(convert_to(t,'UTF8')),'hex'),p.id);
 return jsonb_build_object('token',t,'expires_at',now()+interval '12 hours','profile',jsonb_build_object('id',p.id,'employee_code',p.employee_code,'full_name',p.full_name,'department_id',p.department_id,'role',p.system_role,'shift',p.shift,'position',p.position));
end $$;
create function public.ij_session_login(p_employee_code text) returns jsonb language sql security invoker set search_path='' as $$select private.ij_session_login(p_employee_code)$$;
create function public.ij_session_current() returns jsonb language sql stable security invoker set search_path='' as $$select private.ij_session_profile()$$;
create function private.ij_session_logout() returns void language sql security definer set search_path='' as $$
 delete from private.ij_web_sessions where token_hash=encode(sha256(convert_to(coalesce(nullif(current_setting('request.headers',true),'')::jsonb->>'x-ij-session',''),'UTF8')),'hex')
$$;
create function public.ij_session_logout() returns void language sql security invoker set search_path='' as $$select private.ij_session_logout()$$;

-- Restrictive policies intersect with existing IJ department filters; shared authenticated MPR policies stay intact.
do $$declare t text;writer text;begin
 for t in select distinct tablename from pg_policies where schemaname='public' and 'anon'=any(roles)
 and (tablename like 'ij_%' or tablename in ('departments','machines','app_profiles','repair_reports','spare_requests','pm_plans','pm_schedule','kpi_settings')) loop
 execute format('create policy ij_session_read on public.%I as restrictive for select to anon using ((select private.ij_session_profile()) is not null)',t);
 writer:=case when t in ('ij_pm_standards','ij_deleted_records','ij_tpm_job_assignees','kpi_settings','machines','pm_plans','departments','app_profiles','ij_inspection_templates','ij_inspection_template_items') then 'ARRAY[''engineer'',''admin'']' else 'ARRAY[''engineer'',''admin'',''technician'']' end;
 execute format('create policy ij_session_insert on public.%I as restrictive for insert to anon with check ((select private.ij_has_role(%s)))',t,case when t='ij_tpm_jobs' then 'ARRAY[''engineer'',''admin'']' else writer end);
 execute format('create policy ij_session_update on public.%I as restrictive for update to anon using ((select private.ij_has_role(%s))) with check ((select private.ij_has_role(%s)))',t,writer,writer);
 execute format('create policy ij_session_delete on public.%I as restrictive for delete to anon using ((select private.ij_has_role(ARRAY[''engineer'',''admin''])))',t);
 end loop;
end $$;
-- Allow the existing failed-upload cleanup only for the maintainer's own draft evidence.
create function private.ij_owns_inspection(inspect_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select private.ij_has_role(array['engineer','admin']) or exists(select 1 from public.ij_condition_inspections i where i.id=inspect_id and i.inspector_profile_id=(private.ij_session_profile()->>'id')::uuid)
$$;
revoke all on function private.ij_owns_inspection(uuid) from public;
grant execute on function private.ij_owns_inspection(uuid) to anon,authenticated;
do $$declare t text;expr text;begin
 for t,expr in select * from (values
 ('ij_condition_inspections','private.ij_owns_inspection(id)'),
 ('ij_condition_results','private.ij_owns_inspection(inspection_id)'),
 ('ij_condition_result_attachments','private.ij_owns_inspection(inspection_id)'),
 ('ij_finding_attachments','uploaded_by=(private.ij_session_profile()->>''id'')::uuid')) as targets(name,predicate) loop
 if to_regclass('public.'||t) is not null then
 execute format('drop policy if exists ij_session_delete on public.%I',t);
 execute format('create policy ij_session_delete on public.%I as restrictive for delete to anon using ((select private.ij_has_role(array[''engineer'',''admin''])) or ((select private.ij_has_role(array[''technician''])) and %s))',t,expr);
 end if;
 end loop;
end $$;
-- Photo access uses the same session header, and only maintainers can upload.
create policy ij_session_photo_read on storage.objects as restrictive for select to anon using(bucket_id not in ('ij-inspection-photos','ij-defect-photos') or (select private.ij_session_profile()) is not null);
create policy ij_session_photo_write on storage.objects as restrictive for insert to anon with check(bucket_id not in ('ij-inspection-photos','ij-defect-photos') or (select private.ij_has_role(array['engineer','admin','technician'])));
create policy ij_session_photo_update on storage.objects as restrictive for update to anon using(bucket_id not in ('ij-inspection-photos','ij-defect-photos') or (select private.ij_has_role(array['engineer','admin','technician']))) with check(bucket_id not in ('ij-inspection-photos','ij-defect-photos') or (select private.ij_has_role(array['engineer','admin','technician'])));
create policy ij_session_photo_delete on storage.objects as restrictive for delete to anon using(bucket_id not in ('ij-inspection-photos','ij-defect-photos') or (select private.ij_has_role(array['engineer','admin','technician'])));

create function private.ij_can_execute_job(job uuid) returns boolean language sql stable security definer set search_path='' as $$
 select private.ij_has_role(array['engineer','admin']) or (private.ij_has_role(array['technician']) and exists(select 1 from public.ij_tpm_job_assignees a where a.job_id=job and a.profile_id=(private.ij_session_profile()->>'id')::uuid))
$$;
create policy ij_assigned_job_update on public.ij_tpm_jobs as restrictive for update to anon using(private.ij_can_execute_job(id)) with check(private.ij_can_execute_job(id));
create policy ij_assigned_execution_insert on public.ij_tpm_executions as restrictive for insert to anon with check(private.ij_can_execute_job(job_id));
create policy ij_assigned_execution_update on public.ij_tpm_executions as restrictive for update to anon using(private.ij_can_execute_job(job_id)) with check(private.ij_can_execute_job(job_id));
create function private.ij_guard_job_edit() returns trigger language plpgsql security invoker set search_path='' as $$begin
 if current_user='anon' and private.ij_has_role(array['technician']) and
 (to_jsonb(new)-array['job_status','updated_at']) is distinct from (to_jsonb(old)-array['job_status','updated_at']) then
 raise exception 'ช่างบันทึกผลได้ แต่แก้ไขแผนหรือการอนุมัติไม่ได้' using errcode='42501';end if;
 return new;
end $$;
create trigger ij_guard_job_edit before update on public.ij_tpm_jobs for each row execute function private.ij_guard_job_edit();

-- Wrap every exposed privileged access function. Existing implementation remains private.
do $$declare f record;arg_names text;guard text;body text;extras text;allowed text;
begin
 for f in select p.oid,p.proname,pg_get_function_identity_arguments(p.oid) ids,pg_get_function_arguments(p.oid) args,pg_get_function_result(p.oid) result,p.proargnames,p.pronargs,p.proretset,p.prorettype
 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in
 ('ij_access_admin_requests','ij_access_admin_users','ij_access_admin_decide','ij_access_admin_update_user','ij_access_assignees','ij_access_plan_decision','ij_access_register','ij_access_request_status') loop
 select string_agg(quote_ident(x),',') into arg_names from unnest(f.proargnames[1:f.pronargs]) x;
 arg_names:=coalesce(arg_names,'');extras:='';
 allowed:=case when f.proname like 'ij_access_admin_%' then 'array[''engineer'',''admin'']' else 'array[''engineer'',''admin'',''technician'',''manager'',''production'']' end;
 guard:=case when f.proname in ('ij_access_register','ij_access_request_status') then '' else format('perform private.ij_require(%s%s);',allowed,case when 'p_actor_employee_code'=any(f.proargnames) then ',p_actor_employee_code' else '' end) end;
 if f.proname='ij_access_register' then guard:='if p_employee_code is null or trim(p_employee_code)!~''^[0-9]{4,12}$'' then raise exception ''กรุณากรอกรหัสพนักงาน 4–12 หลัก'';end if; if coalesce(trim(p_full_name),'''')='''' or p_requested_role is null then raise exception ''กรุณากรอกชื่อและตำแหน่ง'';end if;';end if;
 if f.proname='ij_access_admin_decide' then extras:='perform pg_advisory_xact_lock(14001); if not exists(select 1 from public.ij_access_requests where id=p_request_id and status=''pending'') then raise exception ''คำขอนี้พิจารณาไปแล้ว'';end if;';end if;
 if f.proname='ij_access_admin_update_user' then extras:='perform pg_advisory_xact_lock(14001);if (not p_is_active or p_role not in (''engineer'',''admin'')) and exists(select 1 from public.ij_user_access where profile_id=p_profile_id and is_active and system_role in (''engineer'',''admin'')) and not exists(select 1 from public.ij_user_access a join public.app_profiles p on p.id=a.profile_id where a.profile_id<>p_profile_id and a.is_active and p.is_active and a.system_role in (''engineer'',''admin'')) then raise exception ''ต้องมี Engineer/Admin ที่ใช้งานได้อย่างน้อย 1 คน'';end if;';end if;
 -- Extra guards touching private access rows belong inside the private definer implementation.
 if extras<>'' then
  body:=pg_get_functiondef(f.oid);body:=replace(body,E'begin\n',E'begin\n'||extras||E'\n');execute body;
 end if;
 execute format('alter function public.%I(%s) set schema private',f.proname,f.ids);
 execute format('revoke all on function private.%I(%s) from public,anon,authenticated',f.proname,f.ids);
 execute format('grant execute on function private.%I(%s) to anon,authenticated',f.proname,f.ids);
 body:=format('begin %s %s private.%I(%s); end',guard,case when f.proretset then 'return query select * from' when f.prorettype='void'::regtype then 'perform' else 'return' end,f.proname,arg_names);
 execute format('create function public.%I(%s) returns %s language plpgsql security invoker set search_path='''' as %L',f.proname,f.args,f.result,body);
 execute format('revoke all on function public.%I(%s) from public',f.proname,f.ids);
 execute format('grant execute on function public.%I(%s) to anon,authenticated',f.proname,f.ids);
 end loop;
end $$;
revoke all on function public.ij_access_login(text) from public,anon,authenticated;

-- Attribute TPM/follow-up actions to the selected employee, including cross-department engineers.
create or replace function public.ij_work_actor(p_department_id uuid) returns uuid
language plpgsql stable security invoker set search_path='' as $$begin
 if current_user='anon' then return private.ij_require(array['engineer','admin','technician']);end if;
 return private.current_profile_id();end $$;

-- Use a single private decision implementation for engineer, production and manager.
create or replace function private.ij_access_plan_decision(p_actor_employee_code text,p_group_id uuid,p_action text,p_note text default null,p_proposed_date date default null)
returns void language plpgsql security definer set search_path='' as $$
declare actor uuid; r text;begin
 actor:=private.ij_require(array['engineer','admin','manager','production'],p_actor_employee_code);
 r:=private.ij_session_profile()->>'role';
 perform pg_advisory_xact_lock(hashtext(p_group_id::text));
 perform 1 from public.ij_tpm_jobs j where coalesce(j.plan_group_id,j.id)=p_group_id for update;
 if not found then raise exception 'ไม่พบแผนงาน';end if;
 if exists(select 1 from public.ij_tpm_jobs j where coalesce(j.plan_group_id,j.id)=p_group_id and not exists(select 1 from public.departments d where d.id=j.department_id and d.dept_code='IJ')) then raise exception 'แผนนี้ไม่ใช่งานของ IJ' using errcode='42501';end if;
 if exists(select 1 from public.ij_tpm_jobs j where coalesce(j.plan_group_id,j.id)=p_group_id and (j.job_status not in ('draft','planned','postponed') or exists(select 1 from public.ij_deleted_records d where d.record_type='tpm_job' and d.record_id=j.id))) then raise exception 'แผนนี้เริ่มทำ ปิด หรือยกเลิกแล้ว';end if;
 if p_action in ('change','return') and coalesce(trim(p_note),'')='' then raise exception 'กรุณาระบุเหตุผล';end if;
 if p_action in ('confirm','change') and r in ('engineer','admin','production') then
  update public.ij_tpm_jobs j set production_status=case p_action when 'confirm' then 'confirmed' else 'change_requested' end,production_note=nullif(trim(p_note),''),production_proposed_date=case when p_action='change' then p_proposed_date end,production_action_by=actor,production_action_at=now(),job_status=case when p_action='change' then 'draft' when manager_status in ('approved','not_required') then 'planned' else 'draft' end where coalesce(j.plan_group_id,j.id)=p_group_id;
 elsif p_action in ('approve','return') and r in ('engineer','admin','manager') then
  if p_action='approve' and exists(select 1 from public.ij_tpm_jobs j where coalesce(j.plan_group_id,j.id)=p_group_id and j.production_status not in ('confirmed','not_required')) then raise exception 'รอ Production ยืนยันช่วงหยุดเครื่องก่อน';end if;
  update public.ij_tpm_jobs j set manager_status=case p_action when 'approve' then 'approved' else 'rejected' end,manager_note=nullif(trim(p_note),''),manager_action_by=actor,manager_action_at=now(),job_status=case when p_action='return' then 'draft' else 'planned' end where coalesce(j.plan_group_id,j.id)=p_group_id;
 else raise exception 'ไม่มีสิทธิ์ดำเนินการ' using errcode='42501';end if;
 insert into public.ij_access_audit(actor_profile_id,action,target_id,details) values(actor,'plan_'||p_action,p_group_id::text,jsonb_build_object('note',p_note,'proposed_date',p_proposed_date));
end $$;

-- PM management RPCs need Engineer even though maintainers may create the automatic next cycle.
do $$declare f record;body text;begin
 for f in select p.oid,p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('ij_pm_save_standard','ij_pm_create_order','ij_delete_records') loop
 body:=pg_get_functiondef(f.oid);body:=replace(body,E'begin\n',E'begin\n if current_user=''anon'' then perform private.ij_require(array[''engineer'',''admin'']);end if;\n');execute body;
 end loop;
end $$;
-- Keep token helpers internal, expose only explicitly granted wrappers and RLS predicates.
revoke all on function private.ij_session_profile(),private.ij_has_role(text[]),private.ij_require(text[],text),private.ij_session_login(text),private.ij_session_logout(),private.ij_can_execute_job(uuid),private.ij_guard_job_edit() from public;
grant usage on schema private to anon,authenticated;
grant execute on function private.ij_session_profile(),private.ij_has_role(text[]),private.ij_require(text[],text),private.ij_session_login(text),private.ij_session_logout(),private.ij_can_execute_job(uuid) to anon,authenticated;
revoke all on function public.ij_session_login(text),public.ij_session_current(),public.ij_session_logout() from public;
grant execute on function public.ij_session_login(text),public.ij_session_current(),public.ij_session_logout() to anon,authenticated;
notify pgrst,'reload schema';

commit;
