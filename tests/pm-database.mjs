import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {PM_TEMPLATES} from '../src/lib/pmTemplates.js'
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
const {PGlite}=await import(process.env.PGLITE_MODULE||'@electric-sql/pglite')
const db=new PGlite();const checks=[]
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`
const query=(q,p=[])=>db.query(q,p)
async function check(name,fn){await fn();checks.push({name,passed:true});console.log('PASS '+name)}
async function rejects(sql,params,pattern){await assert.rejects(query(sql,params),pattern)}
try{
 await db.exec(`create role anon;create table public.departments(id uuid primary key,dept_code text);create table public.machines(id uuid primary key,department_id uuid references public.departments(id),machine_no text,machine_name text,is_active boolean);grant usage on schema public to anon;grant select on public.departments,public.machines to anon;`)
 await query('insert into departments values($1,$2),($3,$4)',[id(1),'IJ',id(2),'OTHER']);await query('insert into machines values($1,$2,$3,$4,true),($5,$6,$7,$8,true)',[id(3),id(1),'TEST-IJ','เครื่องทดสอบ',id(4),id(2),'OTHER','เครื่องอื่น'])
 // GitHub uploads can retain the old filename. Test the released migration once.
 const migration=path.join(root,'supabase/migrations/20261002134634_ij_pm_standards_and_orders.sql')
 assert.ok(fs.existsSync(migration),'Missing released PM migration: 20261002134634_ij_pm_standards_and_orders.sql')
 await db.exec(fs.readFileSync(migration,'utf8'))
 await db.exec('set role anon')
 const s={...structuredClone(PM_TEMPLATES[0]),id:id(5),department_id:id(1),machine_id:null,status:'draft',std_minutes:30,machine_scope:'TEST-IJ',reference:'คู่มือเครื่องทดสอบ',prepared_by_name:'ผู้จัดทำ',reviewer_name:'ผู้ทวนสอบ'}
 const save=std=>query('select public.ij_pm_save_standard($1::jsonb) as result',[JSON.stringify(std)])
 await check('anon creates IJ draft through SECURITY INVOKER RPC',async()=>{await save(s);assert.equal((await query('select * from ij_pm_standards')).rows.length,1)})
 await check('draft cannot be scheduled',async()=>{await rejects('select ij_pm_create_order($1::jsonb)',[JSON.stringify({id:id(6),standard_id:s.id,machine_id:id(3),due_date:'2026-01-31',scope_confirmed:true})],/approved/)})
 await check('approved standards require OEM reference',async()=>{await assert.rejects(save({...s,status:'approved',reference:''}),/reference/);s.status='approved';await save(s)})
 await check('standard retry is idempotent and approved revision is immutable',async()=>{await save(s);await assert.rejects(save({...s,title:'changed'}),/read-only/);assert.equal((await query('select count(*)::int as n from ij_pm_standards')).rows[0].n,1)})
 await check('IJ-only RLS blocks other department standards and machine assignment',async()=>{await assert.rejects(save({...s,id:id(20),code:'OTHER',department_id:id(2)}),/limited to IJ|row-level security/);await rejects('select ij_pm_create_order($1::jsonb)',[JSON.stringify({id:id(6),standard_id:s.id,machine_id:id(4),due_date:'2026-01-31',scope_confirmed:true})],/scope/)})
 const order={id:id(6),standard_id:s.id,machine_id:id(3),due_date:'2026-01-31',scope_confirmed:true}
 await check('create order uses approved snapshot; retry never duplicates',async()=>{await query('select ij_pm_create_order($1::jsonb)',[JSON.stringify(order)]);await query('select ij_pm_create_order($1::jsonb)',[JSON.stringify(order)]);assert.equal((await query('select standard_snapshot from ij_pm_orders')).rows[0].standard_snapshot.title,s.title)})
 const f={attempt_id:id(7),results:s.items.map(i=>({item_id:i.id,result:'',note:'',measured_value:null})),stop_minutes:0,performed_by_name:'',result_summary:'',parts_used:'',verification_note:'',safety_confirmed:false,generate_next:true}
 const result=(form,complete)=>query('select ij_pm_save_result($1::uuid,$2::jsonb,$3::boolean)',[order.id,JSON.stringify(form),complete])
 await check('incomplete PM cannot close; failed save leaves planned state',async()=>{await assert.rejects(result(f,true),/checklist result/);assert.equal((await query('select status from ij_pm_orders where id=$1',[order.id])).rows[0].status,'planned')})
 await check('draft progress is persisted independently of TPM',async()=>{f.results[0].result='normal';await result(f,false);const row=(await query('select * from ij_pm_orders where id=$1',[order.id])).rows[0];assert.equal(row.status,'in_progress');assert.ok(row.started_at);assert.equal(row.results[0].result,'normal')})
 await check('explicit start returns actual start time and is idempotent',async()=>{const before=(await query('select started_at from ij_pm_orders where id=$1',[order.id])).rows[0].started_at;const out=(await query('select ij_pm_start_order($1) result',[order.id])).rows[0].result;assert.ok(out.started_at);assert.equal(new Date(out.started_at).getTime(),new Date(before).getTime())})
 await check('PM snapshot cannot be replaced during work',async()=>{await rejects("update ij_pm_orders set standard_snapshot='{}' where id=$1",[order.id],/snapshot/)})
 f.results=f.results.map(r=>({...r,result:'na',note:'ไม่มีระบบนี้'}));f.performed_by_name='ช่างทดสอบ';f.result_summary='ทำ PM จริง';f.verification_note='ทดสอบคืนเครื่องผ่าน';f.safety_confirmed=true
 await check('all N/A PM cannot complete',async()=>{await assert.rejects(result(f,true),/all-N\/A/)})
 f.results=f.results.map(r=>({...r,result:'normal',note:''}))
 await check('PM completes atomically and creates one next cycle',async()=>{await result(f,true);const rows=(await query('select * from ij_pm_orders order by due_date')).rows;assert.equal(rows.length,2);assert.equal(rows[0].status,'completed');assert.equal(rows[0].stop_minutes,0);assert.equal(new Date(rows[1].due_date).toISOString().slice(0,10),'2026-02-07')})
 await check('completion retry never changes timestamp or duplicates next cycle',async()=>{const before=(await query('select completed_at from ij_pm_orders where id=$1',[order.id])).rows[0].completed_at;await result(f,true);assert.equal((await query('select count(*)::int n from ij_pm_orders')).rows[0].n,2);assert.equal(String((await query('select completed_at from ij_pm_orders where id=$1',[order.id])).rows[0].completed_at),String(before));await assert.rejects(result({...f,attempt_id:id(8)},true),/read-only/)})
 await check('completed PM rejects direct overwrite and delete',async()=>{await rejects('update ij_pm_orders set result_summary=$1 where id=$2',['changed',order.id],/read-only/);await rejects('delete from ij_pm_orders where id=$1',[order.id],/permission denied/)})
 const measured={...s,id:id(9),code:'MEASURE',frequency:'monthly',items:[{id:'zero',name:'ค่าทดสอบ',method:'วัดด้วยอุปกรณ์ทดสอบ',criterion:'0 ถึง 5',type:'measurement',unit:'bar',min_value:0,max_value:5}]};await save(measured)
 const mo={...order,id:id(10),standard_id:measured.id};await query('select ij_pm_create_order($1::jsonb)',[JSON.stringify(mo)])
 const mf={...f,results:[{item_id:'zero',result:'normal',measured_value:7,note:''}]}
 await check('backend rejects out-of-range pass and missing measured value',async()=>{await rejects('select ij_pm_save_result($1,$2,true)',[mo.id,JSON.stringify(mf)],/outside limits/);await rejects('select ij_pm_save_result($1,$2,true)',[mo.id,JSON.stringify({...mf,results:[{...mf.results[0],measured_value:null}]})],/measurement/)})
 await check('zero measurement saves and monthly recurrence clamps Jan 31',async()=>{mf.results[0].measured_value=0;await query('select ij_pm_save_result($1,$2,true)',[mo.id,JSON.stringify(mf)]);assert.equal((await query('select results from ij_pm_orders where id=$1',[mo.id])).rows[0].results[0].measured_value,0);assert.equal(new Date((await query('select due_date from ij_pm_orders where standard_id=$1 and status=$2',[measured.id,'planned'])).rows[0].due_date).toISOString().slice(0,10),'2026-02-28')})
 fs.writeFileSync(path.join(root,'docs/pm-database-test-results.json'),JSON.stringify({scope:'Local PostgreSQL (PGlite), real migration/RLS/triggers/RPC, no production records',passed:checks.length,checks},null,2));console.log(JSON.stringify({passed:checks.length,failed:0}))
}finally{await db.close()}
