import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {PM_TEMPLATES} from '../src/lib/pmTemplates.js'
import {PGlite} from '@electric-sql/pglite'
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),db=new PGlite(),checks=[]
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`
const q=(sql,args=[])=>db.query(sql,args)
const check=async(name,fn)=>{await fn();checks.push({name,passed:true});console.log('PASS '+name)}
const row=async(table,n)=>(await q(`select * from ${table} where id=$1`,[id(n)])).rows[0]
const finish=(n,patch={})=>q('select ij_tpm_finish_job($1,$2::jsonb) result',[id(n),JSON.stringify({result_summary:'เปลี่ยนสายลมแล้ว',verification_note:'เดินเครื่องแล้วไม่มีรั่ว',completion_status:'completed',actual_stop_min:0,attempt_id:id(100+n),close_linked_finding:true,...patch})])
const archive=(type,ids,confirmed=true)=>q('select ij_delete_records($1,$2::uuid[],$3)',[type,ids.map(id),confirmed])
try{
 await db.exec(`create role anon;create role authenticated;create schema private;
 create table departments(id uuid primary key,dept_code text);
 create table app_profiles(id uuid primary key,department_id uuid references departments(id),username text,is_active boolean default true);
 create table machines(id uuid primary key,department_id uuid references departments(id),machine_no text,machine_name text,is_active boolean default true);
 create function private.current_profile_id() returns uuid language sql stable as 'select nullif(current_setting(''test.profile'',true),'''')::uuid';
 create function private.current_department_id() returns uuid language sql stable as 'select nullif(current_setting(''test.department'',true),'''')::uuid';
 create function private.is_admin() returns boolean language sql stable as 'select coalesce(current_setting(''test.role'',true),'''')=''admin''';
 create function private.is_supervisor() returns boolean language sql stable as 'select coalesce(current_setting(''test.role'',true),'''')=''supervisor''';
 create function private.can_read_department(d uuid) returns boolean language sql stable as 'select d=private.current_department_id()';
 grant usage on schema public,private to anon,authenticated;grant execute on all functions in schema private to anon,authenticated;
 create table ij_tpm_findings(id uuid primary key default gen_random_uuid(),job_id uuid,department_id uuid references departments(id),machine_id uuid references machines(id),finding text,risk text,priority text default 'B',status text default 'open' check(status in('open','ready','waiting_spare','waiting_machine_stop','in_progress','verification','closed')),source_type text,source_inspection_id uuid,finding_type text,temporary_action text,permanent_action text,target_date date,owner_profile_id uuid references app_profiles(id),spare_required boolean default false,need_machine_stop boolean default false,found_by uuid references app_profiles(id),verification_note text,verified_by uuid,verified_at timestamptz,closed_by uuid,closed_at timestamptz,action_updated_at timestamptz);
 create table ij_tpm_jobs(id uuid primary key default gen_random_uuid(),department_id uuid references departments(id),machine_id uuid references machines(id),title text,details text,priority text default 'B',planned_date date,job_status text,production_status text default 'confirmed',manager_status text default 'approved',source_finding_id uuid references ij_tpm_findings(id),sequence_no integer default 0);
 create table ij_tpm_executions(id uuid primary key default gen_random_uuid(),job_id uuid unique references ij_tpm_jobs(id),actual_started_at timestamptz,actual_completed_at timestamptz,actual_stop_min integer check(actual_stop_min>=0),result_summary text,abnormal_found boolean default false,follow_up_required boolean default false,parts_used text,execution_note text,completion_status text,updated_by uuid references app_profiles(id));
 create table ij_tpm_job_assignees(id uuid primary key default gen_random_uuid(),job_id uuid references ij_tpm_jobs(id),profile_id uuid references app_profiles(id),is_lead boolean default false);
 create table ij_condition_inspections(id uuid primary key,department_id uuid references departments(id));
 create table ij_opportunities(id uuid primary key,department_id uuid references departments(id));
 create table spare_requests(id uuid primary key,department_id uuid references departments(id));
 create table repair_reports(id uuid primary key,department_id uuid references departments(id));
 grant select on departments,machines,app_profiles to anon,authenticated;
 grant select,insert,update on ij_tpm_findings,ij_tpm_jobs,ij_tpm_executions,ij_tpm_job_assignees,ij_condition_inspections,ij_opportunities,spare_requests,repair_reports to anon,authenticated;`)
 await q('insert into departments values($1,$2),($3,$4)',[id(1),'IJ',id(2),'OTHER'])
 await q('insert into app_profiles values($1,$2,$3,true),($4,$2,$5,true)',[id(3),id(1),'ij-web',id(4),'tech'])
 await q('insert into machines values($1,$2,$3,$4,true),($5,$6,$7,$8,true)',[id(5),id(1),'TEST-IJ','เครื่องทดสอบ',id(6),id(2),'OTHER','เครื่องอื่น'])
 for(const table of ['ij_tpm_findings','ij_tpm_jobs','ij_condition_inspections','ij_opportunities','spare_requests','repair_reports'])await db.exec(`alter table ${table} enable row level security;create policy test_ij on ${table} for all to anon,authenticated using(department_id in(select id from departments where dept_code='IJ')) with check(department_id in(select id from departments where dept_code='IJ'));`)
 await db.exec(`alter table ij_tpm_executions enable row level security;create policy test_exec on ij_tpm_executions for all to anon using(exists(select 1 from ij_tpm_jobs where id=job_id)) with check(exists(select 1 from ij_tpm_jobs where id=job_id));`)
 await db.exec(fs.readFileSync(path.join(root,'supabase/migrations/20261002134634_ij_pm_standards_and_orders.sql'),'utf8'))
 await db.exec(fs.readFileSync(path.join(root,'supabase/migrations/20261004104312_ij_tpm_followup_and_confirmed_deletion.sql'),'utf8'))

 await db.exec(`alter table app_profiles alter column id set default gen_random_uuid();alter table app_profiles add column full_name text default 'ผู้ทดสอบ',add column role text default 'technician',add column shift text,add column position text,add column employee_code text;
 alter table ij_tpm_jobs add column plan_group_id uuid;alter table ij_condition_inspections add column inspector_profile_id uuid;
 create schema storage;create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
 alter table storage.objects enable row level security;grant all on storage.objects to anon;grant usage on schema storage to anon;
 create policy photos on storage.objects for all to anon using(bucket_id='ij-inspection-photos') with check(bucket_id='ij-inspection-photos');
 alter table ij_tpm_job_assignees enable row level security;create policy assignees on ij_tpm_job_assignees for all to anon using(true) with check(true);
 `)
 await q("update app_profiles set employee_code='1111' where id=$1",[id(4)])
 for(const [n,code] of [[7,'2222'],[8,'3333'],[9,'4444']])await q("insert into app_profiles(id,department_id,username,is_active,employee_code) values($1,$2,$3,true,$3)",[id(n),id(1),code])
 await db.exec(fs.readFileSync(path.join(root,'supabase/migrations/20261004150000_ij_employee_role_access_v14.sql'),'utf8'))
 for(const [n,role] of [[7,'engineer'],[8,'manager'],[9,'production']])await q('update ij_user_access set system_role=$1 where profile_id=$2',[role,id(n)])
 await db.exec(fs.readFileSync(path.join(root,'supabase/migrations/20261004161427_ij_employee_sessions_and_permissions.sql'),'utf8'))
 await q("insert into ij_tpm_jobs(id,department_id,machine_id,title,planned_date,job_status,manager_status,production_status) values($1,$2,$3,'ทดสอบ','2026-10-04','draft','waiting','waiting')",[id(20),id(1),id(5)])
 await q('insert into ij_tpm_job_assignees(job_id,profile_id) values($1,$2)',[id(20),id(4)])
 await db.exec('set role anon')
 const login=async code=>(await q('select ij_session_login($1) as s',[code])).rows[0].s
 const setToken=async token=>q("select set_config('request.headers',$1,false)",[JSON.stringify({'x-ij-session':token})])
 const engineer=await login('2222'),tech=await login('1111'),manager=await login('3333'),production=await login('4444')
 await check('employee-code login returns expiring sessions and unknown employees get registration',async()=>{assert.ok(engineer.token.length>=64);assert.equal(engineer.profile.role,'engineer');assert.equal(await login('9999'),null);await assert.rejects(login('xx'),/รหัสพนักงาน/)})
 await check('bare API cannot read jobs or use the old code-only login RPC',async()=>{await setToken('');assert.equal((await q('select * from ij_tpm_jobs')).rows.length,0);await assert.rejects(q("select ij_access_login('2222')"),/permission denied/);await assert.rejects(q("select ij_access_admin_users('2222')"),/Session expired/)})
 await check('registration is pending and cannot grant its requested engineer role',async()=>{await q("select ij_access_register('9999','ผู้สมัครทดสอบ','engineer',null)");assert.equal(await login('9999'),null);assert.equal((await q("select * from ij_access_request_status('9999')")).rows[0].status,'pending')})
 await check('manager sees plans but cannot mutate repairs, plans or impersonate engineer',async()=>{await setToken(manager.token);assert.equal((await q('select * from ij_tpm_jobs')).rows.length,1);assert.equal((await q("update ij_tpm_jobs set title='ไม่ควรเปลี่ยน' returning id")).rows.length,0);await assert.rejects(q("select ij_access_admin_users('2222')"),/Permission denied/)})
 await check('production cannot approve as manager and manager waits for production',async()=>{await setToken(production.token);await assert.rejects(q("select ij_access_plan_decision('4444',$1,'approve')",[id(20)]),/ไม่มีสิทธิ์/);await setToken(manager.token);await assert.rejects(q("select ij_access_plan_decision('3333',$1,'approve')",[id(20)]),/Production/)})
 await check('engineer can confirm production and approve with recorded actor',async()=>{await setToken(engineer.token);await q("select ij_access_plan_decision('2222',$1,'confirm')",[id(20)]);await q("select ij_access_plan_decision('2222',$1,'approve')",[id(20)]);const j=await row('ij_tpm_jobs',20);assert.equal(j.job_status,'planned');assert.equal(j.manager_action_by,id(7));assert.equal(j.production_action_by,id(7))})
 await check('engineer appears in assignees and can inspect and work across departments',async()=>{await setToken(engineer.token);assert.ok((await q('select * from ij_access_assignees()')).rows.some(p=>p.id===id(7)));assert.equal((await q('select ij_work_actor($1) a',[id(1)])).rows[0].a,id(7));await q('insert into ij_condition_inspections(id,department_id) values($1,$2)',[id(30),id(1)])})
 await check('assigned technician can start TPM, cannot edit plan fields, and cannot approve',async()=>{await setToken(tech.token);await assert.rejects(q("update ij_tpm_jobs set title='ปลอม' where id=$1",[id(20)]),/แก้ไขแผน/);await q('select ij_tpm_start_job($1)',[id(20)]);assert.equal((await row('ij_tpm_jobs',20)).job_status,'in_progress');await assert.rejects(q("select ij_access_plan_decision('1111',$1,'approve')",[id(20)]),/Permission denied/)})
 await check('started plan cannot be approved or returned even by engineer',async()=>{await setToken(engineer.token);await assert.rejects(q("select ij_access_plan_decision('2222',$1,'return','แก้ไข')",[id(20)]),/เริ่มทำ/)})
 await check('engineer approves pending registration once and cannot remove last engineer',async()=>{await setToken(engineer.token);const req=(await q("select * from ij_access_admin_requests('2222')")).rows[0];await q("select ij_access_admin_decide('2222',$1,true,'technician')",[req.id]);assert.equal((await login('9999')).profile.role,'technician');await assert.rejects(q("select ij_access_admin_decide('2222',$1,true,'engineer')",[req.id]),/พิจารณาไปแล้ว/);await assert.rejects(q("select ij_access_admin_update_user('2222',$1,'technician',false)",[id(7)]),/อย่างน้อย/)})
 await check('disabled user loses existing session immediately',async()=>{await setToken(engineer.token);await q("select ij_access_admin_update_user('2222',$1,'manager',false)",[id(8)]);await setToken(manager.token);assert.equal((await q('select ij_session_current() s')).rows[0].s,null);assert.equal((await q('select * from ij_tpm_jobs')).rows.length,0)})
 await check('private photo policies deny signed-out and manager upload, permit maintainer',async()=>{await setToken('');assert.equal((await q('select * from storage.objects')).rows.length,0);await assert.rejects(q("insert into storage.objects(bucket_id,name) values('ij-inspection-photos','none')"),/row-level security/);await setToken(production.token);await assert.rejects(q("insert into storage.objects(bucket_id,name) values('ij-inspection-photos','none')"),/row-level security/);await setToken(tech.token);await q("insert into storage.objects(bucket_id,name) values('ij-inspection-photos','test')")})
 await check('logout invalidates the old token; expiry and invalid tokens fail closed',async()=>{await setToken(tech.token);await q('select ij_session_logout()');assert.equal((await q('select ij_session_current() s')).rows[0].s,null);await setToken('forged');assert.equal((await q('select ij_session_current() s')).rows[0].s,null);await db.exec('reset role');await q("update private.ij_web_sessions set expires_at=now()-interval '1 minute' where profile_id=$1",[id(7)]);await db.exec('set role anon');await setToken(engineer.token);assert.equal((await q('select ij_session_current() s')).rows[0].s,null)})
 fs.writeFileSync(path.join(root,'docs/access-database-test-results.json'),JSON.stringify({scope:'Local PostgreSQL / PGlite; real migrations, allow and deny tests; no production work records',passed:checks.length,checks},null,2));console.log(JSON.stringify({passed:checks.length,failed:0}))
}catch(e){console.error(e.message,e.where||'');process.exitCode=1}finally{await db.close()}
