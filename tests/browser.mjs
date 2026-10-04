import assert from 'node:assert/strict'
import {PM_TEMPLATES} from '../src/lib/pmTemplates.js'
import {nextPMDate} from '../src/lib/pm.js'
import fs from 'node:fs'
import path from 'node:path'
import {spawn} from 'node:child_process'
import {fileURLToPath,pathToFileURL} from 'node:url'
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright')
const date=new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Bangkok'})
const {default:jsQR}=await import('jsqr')
const {PNG}=await import('pngjs')
const results=[]
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5176'],{cwd:root,stdio:['ignore','pipe','pipe']})
await new Promise((resolve,reject)=>{server.stdout.on('data',d=>{if(d.toString().includes('Local:'))resolve()});server.stderr.on('data',d=>process.stderr.write(d));server.on('exit',()=>reject(new Error('Vite exited')))})
let browser
try{
 browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE,args:['--no-sandbox','--no-zygote','--disable-dev-shm-usage','--single-process','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}:{})})
 const check=async(name,fn)=>{await fn();results.push({name,passed:true});console.log('PASS '+name)}
 const fixture=async(width=1280,{native=false}={})=>{
  const context=await browser.newContext({viewport:{width,height:width<600?844:900},timezoneId:'Asia/Bangkok',isMobile:width<600,hasTouch:width<600})
  const page=await context.newPage(),errors=[],writes=[]
  const m1={id:'m1',machine_no:'650T-8',machine_name:'เครื่องทดสอบ 1',equipment_type:'injection',is_active:true,department_id:'dept',department_code:'IJ',criticality:'B'},m2={...m1,id:'m2',machine_no:'850T-16',machine_name:'เครื่องทดสอบ 2'}
  const baseJob={machine_id:'m1',department_id:'dept',machines:m1,planned_date:date,title:'ตรวจสายลม (ข้อมูลทดสอบ)',priority:'B',production_status:'confirmed',manager_status:'approved',work_type:'tpm_added',planned_stop_min:60,need_machine_stop:true,sequence_no:0,ij_tpm_executions:[]}
  const pmStandard={id:'std1',department_id:'dept',code:'PM-TEST-M-001',title:'PM ทดสอบรายเดือน',revision:1,frequency:'monthly',std_minutes:45,status:'approved',machine_id:null,machine_scope:'เครื่องทดสอบ 1 และ 2',reference:'คู่มือทดสอบ หน้า 20',prepared_by_name:'ผู้จัดทำทดสอบ',reviewer_name:'ผู้ทวนสอบทดสอบ',instructions:'ดำเนินการตามขั้นตอนที่อนุมัติ',need_machine_stop:true,items:[{id:'clean',section:'ทดสอบ',name:'ทำความสะอาดตามแผน',method:'ทำความสะอาดจุดทดสอบ',criterion:'สะอาดไม่มีสิ่งกีดขวาง',tool:'ผ้า',type:'check'},{id:'pressure',section:'ทดสอบค่า',name:'วัดค่าทดสอบ',method:'วัดด้วยอุปกรณ์ทดสอบ',criterion:'0 ถึง 5 bar (ค่าทดสอบเท่านั้น)',type:'measurement',unit:'bar',min_value:0,max_value:5}]}
  const pmOrder={id:'pm-order1',department_id:'dept',machine_id:'m1',standard_id:'std1',standard_snapshot:structuredClone(pmStandard),machine_no_snapshot:'650T-8',machine_name_snapshot:'เครื่องทดสอบ 1',due_date:date,status:'planned',results:[],stop_minutes:0}
  const tables={ij_pm_standards:[pmStandard],ij_pm_orders:[pmOrder],machines:[m1,m2],ij_tpm_jobs:[{...baseJob,id:'partial-job',plan_group_id:'g1',job_status:'partial'},{...baseJob,id:'active-job',plan_group_id:'g2',job_status:'in_progress'},{...baseJob,id:'postponed-job',plan_group_id:'g3',job_status:'postponed'}],ij_tpm_executions:[],ij_tpm_findings:[{id:'f1',department_id:'dept',machine_id:'m1',machines:m1,priority:'B',finding:'สายลมรั่ว (ข้อมูลทดสอบ)',status:'open',created_at:new Date().toISOString()}],ij_inspection_templates:native?[{id:'t1',department_id:'dept',name:'รายการตรวจทดสอบ',is_active:true}]:[],ij_inspection_template_items:native?[{id:'item1',template_id:'t1',item_name:'ค่าที่วัด',value_type:'numeric',unit:'bar',min_value:0,max_value:10,is_active:true,criticality:'B'}]:[],pm_schedule:[{id:'pm1',department_id:'dept',machine_id:'m1',due_date:date,machine_no_snapshot:'650T-8',plan_title_snapshot:'PM ทดสอบวันนี้',status:'scheduled'}],spare_requests:[{id:'sp1',department_id:'dept',machine_id:'m1',machine:m1,status:'new',part_name:'สายลมทดสอบ',requested_reason:'ทดสอบระบบ',quantity:1,created_at:new Date().toISOString()}],kpi_settings:[{id:'machine-setting',dept_code:'IJ',machine_no:'650T-8',hours_per_day:24,target_availability:90}],ij_condition_inspections:[],ij_condition_results:[],ij_condition_result_attachments:[],ij_finding_attachments:[],ij_opportunities:[],ij_tpm_job_assignees:[],ij_maintenance_timeline:[]}
  let counter=0,failTable='',failMethod='',failAfter=0,emptyPatch=false,delayTimeline=false
  page.on('pageerror',e=>errors.push(e.message))
  await page.route('https://hftlogubohbjiivcvkut.supabase.co/**',async route=>{
   const req=route.request(),url=new URL(req.url()),table=url.pathname.split('/').pop(),method=req.method();
   if(url.pathname.startsWith('/storage/v1/')){
    if(method==='POST'&&url.pathname.includes('/object/sign/')){const body=req.postDataJSON();return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body.paths.map(p=>({path:p,signedURL:`/object/public/ij-inspection-photos/${p}`})))})}
    if(method==='POST')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({Key:'test-photo',Id:'photo'})})
    if(method==='DELETE')return route.fulfill({status:200,contentType:'application/json',body:'[]'})
    return route.fulfill({status:200,contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==','base64')})
   }
   if(table==='app_profiles'){return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(url.searchParams.has('username')?{id:'profile',full_name:'ผู้ทดสอบ',role:'admin',department_id:'dept'}:[{id:'tech1',full_name:'ช่างทดสอบ',role:'technician',department_id:'dept'}])})}
   if(table==='departments')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({id:'dept',dept_code:'IJ'})})
   if(failTable===table&&method===failMethod&&failAfter--<=0){failTable='';return route.fulfill({status:500,contentType:'application/json',body:JSON.stringify({message:'Simulated API failure',code:'TEST'})})}
   if(url.pathname.startsWith('/rest/v1/rpc/')){
    const payload=req.postDataJSON();writes.push({table,method,payload});let response
    if(table==='ij_pm_save_standard'){
     const row={...payload.p_standard,created_at:new Date().toISOString()};const idx=tables.ij_pm_standards.findIndex(x=>x.id===row.id);if(idx<0)tables.ij_pm_standards.push(row);else tables.ij_pm_standards[idx]=row;response={id:row.id}
    }else if(table==='ij_pm_create_order'){
     const f=payload.p_order,std=tables.ij_pm_standards.find(x=>x.id===f.standard_id),m=tables.machines.find(x=>x.id===f.machine_id);let row=tables.ij_pm_orders.find(x=>x.id===f.id);if(!row){row={id:f.id,department_id:'dept',machine_id:f.machine_id,standard_id:f.standard_id,standard_snapshot:structuredClone(std),machine_no_snapshot:m.machine_no,machine_name_snapshot:m.machine_name,due_date:f.due_date,status:'planned',results:[],stop_minutes:0};tables.ij_pm_orders.push(row)}response={id:row.id}
    }else if(table==='ij_pm_start_order'){
     const row=tables.ij_pm_orders.find(x=>x.id===payload.p_order_id);row.status='in_progress';row.started_at=row.started_at||new Date().toISOString();response=structuredClone(row)
    }else if(table==='ij_pm_save_result'){
     const f=payload.p_result,row=tables.ij_pm_orders.find(x=>x.id===payload.p_order_id);Object.assign(row,f,{status:payload.p_complete?'completed':'in_progress',started_at:row.started_at||new Date().toISOString(),completed_at:payload.p_complete?new Date().toISOString():null,overall_result:f.results.some(r=>r.result==='abnormal')?'issue':f.results.some(r=>r.result==='corrected')?'corrected':'normal'});if(payload.p_complete&&f.generate_next&&!tables.ij_pm_orders.some(x=>x.standard_id===row.standard_id&&x.machine_id===row.machine_id&&x.due_date===nextPMDate(row.due_date,row.standard_snapshot.frequency)))tables.ij_pm_orders.push({...structuredClone(row),id:'next-'+(++counter),due_date:nextPMDate(row.due_date,row.standard_snapshot.frequency),status:'planned',results:[],started_at:null,completed_at:null});response={id:row.id,status:row.status}
    }else return route.fulfill({status:404,contentType:'application/json',body:JSON.stringify({message:'Unknown RPC'})})
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(response)})
   }
   const match=row=>[...url.searchParams].every(([key,v])=>{if(key.includes('.'))return true;if(v.startsWith('in.('))return v.slice(4,-1).split(',').includes(String(row[key]));if(v.startsWith('eq.'))return String(row[key]??'')===v.slice(3);if(v.startsWith('neq.'))return String(row[key]??'')!==v.slice(4);if(v==='is.null')return row[key]==null;return true})
   let data=tables[table]||[]
   if(method==='POST'){
    const payload=req.postDataJSON();writes.push({table,method,payload});const rows=(Array.isArray(payload)?payload:[payload]).map(r=>({...r,id:r.id||`new-${++counter}`,created_at:new Date().toISOString(),...(r.machine_id?{machines:tables.machines.find(m=>m.id===r.machine_id)}:{})}))
    tables[table]||=[]
    for(const row of rows){const idx=table==='ij_tpm_executions'?tables[table].findIndex(x=>x.job_id===row.job_id):-1;if(idx<0)tables[table].push(row);else tables[table][idx]={...tables[table][idx],...row}}
    data=rows
   }else if(method==='PATCH'){
    const payload=req.postDataJSON();writes.push({table,method,payload});data=emptyPatch?[]:data.filter(match).map(r=>Object.assign(r,payload));emptyPatch=false
   }else if(method==='DELETE'){
    writes.push({table,method});const removed=data.filter(match);tables[table]=data.filter(r=>!removed.includes(r));if(table==='ij_condition_inspections'){const ids=new Set(removed.map(r=>r.id));tables.ij_condition_results=tables.ij_condition_results.filter(r=>!ids.has(r.inspection_id))}data=[]
   }else{
    data=data.filter(match)
    if(table==='ij_tpm_jobs')data=data.map(j=>({...j,ij_tpm_executions:tables.ij_tpm_executions.filter(e=>e.job_id===j.id)}))
    if(table==='ij_maintenance_timeline'){
      const mid=url.searchParams.get('machine_id')?.slice(3)
      if(delayTimeline&&mid==='m1')await new Promise(r=>setTimeout(r,300))
      data=[{machine_id:mid,department_id:'dept',event_id:mid,event_type:'repair',title:`ประวัติ ${mid}`,event_at:new Date().toISOString(),status:'completed',duration_min:0}]
    }
    const offset=Number(url.searchParams.get('offset'))||0,limit=Number(url.searchParams.get('limit'))||500;data=data.slice(offset,offset+limit)
   }
   const single=req.headers().accept?.includes('vnd.pgrst.object')
   return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(single?(data[0]||null):data)})
  })
  await page.route('https://fonts.googleapis.com/**',r=>r.fulfill({status:200,contentType:'text/css',body:''}))
  await page.goto('http://127.0.0.1:5176');await page.locator('.start-task-panel').waitFor()
  return {page,context,tables,writes,errors,fail:(table,method,after=0)=>{failTable=table;failMethod=method;failAfter=after},emptyPatch:()=>{emptyPatch=true},delayTimeline:()=>{delayTimeline=true}}
 }
 const go=async(page,id)=>{await page.evaluate(x=>{location.hash=x},id);await page.waitForTimeout(90)}
 const choose=async(page,trigger,label)=>{await trigger.click();const options=page.locator('.select-portal [role="option"]');await options.filter({hasText:label}).first().click();assert.equal(await page.locator('.select-portal').count(),0)}
 const {page,context,tables,writes,errors,fail,emptyPatch,delayTimeline}=await fixture()
 await check('all 14 pages render without React errors',async()=>{
  for(const id of ['menu','dashboard','assets','weekly','inspection','defects','followup','opportunity','history','repairs','kpi','spares','pm','reports']){await go(page,id);assert.equal(await page.locator('.app-error-screen').count(),0)}assert.deepEqual(errors,[])
 })
 await check('missing checklist gets 12 uninspected points; selection closes',async()=>{
  await go(page,'inspection');await page.getByRole('button',{name:/Start Inspection/}).click();await choose(page,page.locator('.inspection-form-head .select-menu-trigger').first(),'650T-8')
  assert.equal(await page.locator('.inspection-check-row').count(),12);assert.equal(await page.locator('.inspection-check-row.state-').count(),12)
  await page.getByRole('button',{name:/Save Inspection/}).click();assert.match(await page.locator('.form-error').innerText(),/ยังไม่ได้เลือกผลตรวจ/)
 })
 await check('dropdown supports search, Enter, Escape, outside click',async()=>{
  const trigger=page.locator('.inspection-form-head .select-menu-trigger').first();await trigger.click();await page.getByRole('textbox',{name:/Search options/}).fill('850');await page.getByRole('textbox',{name:/Search options/}).press('Enter');assert.equal(await page.locator('.select-portal').count(),0);assert.match(await trigger.innerText(),/850T-16/)
  await trigger.click();await page.keyboard.press('Escape');assert.equal(await page.locator('.select-portal').count(),0);assert.equal(await page.locator('[role=dialog]').count(),1)
  await trigger.click();await page.locator('.workflow-help').first().click();assert.equal(await page.locator('.select-portal').count(),0)
 })
 await check('normal inspection saves checked items and has no fake defect',async()=>{
  for(const row of await page.locator('.inspection-check-row').all())await choose(page,row.locator('.select-menu-trigger'),'Normal')
  await page.getByRole('button',{name:/Save Inspection/}).click();await page.locator('[role=dialog]').waitFor({state:'hidden'});assert.equal(tables.ij_condition_results.length,12);assert.equal(tables.ij_tpm_findings.length,1)
 })
 await check('saved inspection can be opened to review every result',async()=>{
  await page.getByRole('button',{name:'ดูผลตรวจ'}).first().click();await page.locator('.inspection-result-list article').first().waitFor();assert.equal(await page.locator('.inspection-result-list article').count(),12);await page.locator('[role=dialog]').getByRole('button',{name:/Close dialog/}).click()
 })
 await check('failed inspection cleans up partial rows, retry preserves the entered result',async()=>{
  await page.getByRole('button',{name:/Start Inspection/}).click();await choose(page,page.locator('.inspection-form-head .select-menu-trigger').first(),'650T-8')
  const rows=await page.locator('.inspection-check-row').all();await choose(page,rows[0].locator('.select-menu-trigger'),'Abnormal');await rows[0].locator('.inspection-note-stack>input').fill('พบลมรั่วที่ข้อต่อ')
  for(const row of rows.slice(1))await choose(page,row.locator('.select-menu-trigger'),'N/A')
  fail('ij_condition_results','POST',1);await page.getByRole('button',{name:/Save Inspection/}).click();await page.locator('.form-error').filter({hasText:'Simulated'}).waitFor()
  assert.equal(tables.ij_condition_inspections.length,1);assert.equal(tables.ij_condition_results.length,12);assert.equal(tables.ij_tpm_findings.length,1);assert.equal(await rows[0].locator('.inspection-note-stack>input').inputValue(),'พบลมรั่วที่ข้อต่อ')
 })
 await check('abnormal inspection creates follow-up with photo evidence',async()=>{
  const input=page.locator('.inspection-check-row').first().locator('input[type=file]:not([capture])');await input.setInputFiles({name:'test.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==','base64')})
  await page.getByRole('button',{name:/Save Inspection/}).click();await page.locator('[role=dialog]').waitFor({state:'hidden'});assert.equal(tables.ij_tpm_findings.length,2);assert.equal(tables.ij_condition_result_attachments.length,1)
  await go(page,'defects');const card=page.locator('.defect-card').filter({hasText:'พบลมรั่วที่ข้อต่อ'});assert.equal(await card.locator('.defect-photo-gallery img').count(),1);await go(page,'weekly')
 })
 await check('partial work resumes; start explicitly updates job state',async()=>{
  await go(page,'weekly');const row=page.locator('.job-row-pro').filter({hasText:'Partial'});await row.getByRole('button',{name:/Resume/}).click();await page.waitForFunction(()=>document.querySelectorAll('.job-row-pro').length>=3);await page.waitForTimeout(120);assert.equal(tables.ij_tpm_jobs.find(j=>j.id==='partial-job').job_status,'in_progress')
 })
 await check('finish requires actual result; zero downtime is preserved; partial remains open',async()=>{
  const row=page.locator('.job-row-pro').filter({hasText:'In Progress'}).first();await row.getByRole('button',{name:/Finish/}).click();await page.getByRole('button',{name:/Save & Close/}).click();assert.match(await page.locator('.form-error').innerText(),/สิ่งที่ทำจริง/)
  await page.locator('[role=dialog] textarea').first().fill('เปลี่ยนสายลมแล้ว (ทดสอบ)');await choose(page,page.locator('[role=dialog] .select-menu-trigger'),'Partial');await page.locator('[role=dialog] textarea').last().fill('ยังเหลืองานตรวจรั่ว');await page.getByRole('button',{name:/Save & Close/}).click();await page.locator('[role=dialog]').waitFor({state:'hidden'});const exec=tables.ij_tpm_executions.at(-1);assert.equal(exec.actual_stop_min,0);assert.equal(exec.completion_status,'partial')
 })
 await check('closed follow-up requires owner, actual work and verification',async()=>{
  await go(page,'followup');await page.locator('.follow-action-card').filter({hasText:'สายลมรั่ว (ข้อมูลทดสอบ)'}).getByRole('button',{name:/Plan Action/}).click();await choose(page,page.locator('[role=dialog] .select-menu-trigger').first(),'Closed');await page.locator('[role=dialog] textarea').nth(1).fill('เปลี่ยนสายลม');await choose(page,page.locator('[role=dialog] .select-menu-trigger').nth(1),'ช่างทดสอบ');await page.getByRole('button',{name:/Save Action/}).click();assert.match(await page.locator('.form-error').innerText(),/สิ่งที่ทำจริง/)
  await page.locator('[role=dialog] textarea').nth(2).fill('เปลี่ยนสายลม 2 เมตร');await page.locator('[role=dialog] textarea').nth(3).fill('ตรวจหลังเดินเครื่อง ไม่มีลมรั่ว');await page.getByRole('button',{name:/Save Action/}).click();await page.locator('[role=dialog]').waitFor({state:'hidden'});assert.equal(tables.ij_tpm_findings[0].status,'closed');assert.match(tables.ij_tpm_findings[0].verification_note,/เปลี่ยนสายลม 2 เมตร/)
 })
 await check('request rejects zero quantity; API failure keeps entered values',async()=>{
  await go(page,'spares');await page.getByRole('button',{name:/New Request/}).click();const modal=page.locator('[role=dialog]');await modal.locator('label').filter({hasText:'Part name'}).locator('input').fill('สายลม');await modal.locator('label').filter({hasText:'Reason / application'}).locator('textarea').fill('เปลี่ยนที่รั่ว');await modal.locator('label').filter({hasText:'Quantity'}).locator('input').fill('0');await page.getByRole('button',{name:/Submit Request/}).click();assert.match(await page.locator('.form-error').innerText(),/มากกว่า 0/)
  await modal.locator('label').filter({hasText:'Quantity'}).locator('input').fill('2');fail('spare_requests','POST');await page.getByRole('button',{name:/Submit Request/}).click();await page.locator('.form-error').filter({hasText:'Simulated'}).waitFor();assert.equal(await modal.locator('label').filter({hasText:'Part name'}).locator('input').inputValue(),'สายลม');await page.getByRole('button',{name:/Cancel/}).click()
 })
 await check('no-row status update is shown as error',async()=>{
  emptyPatch();await choose(page,page.locator('.spare-status-control .select-menu-trigger').first(),'Review');await page.locator('.form-error').filter({hasText:'ไม่ได้รับการอัปเดต'}).waitFor()
 })
 await check('PM has independent standards, five templates and a due-today work order',async()=>{
  await go(page,'pm');assert.equal(await page.locator('.pm-standard-card.template').count(),5);assert.equal(await page.getByRole('button',{name:/Add to TPM|ใส่แผน/}).count(),0);await page.getByRole('tab',{name:'ตารางและทำ PM'}).click();assert.equal(await page.locator('.pm-order-card').count(),1);assert.match(await page.locator('.pm-order-card').innerText(),/ถึงรอบวันนี้/)
 })
 await check('PM starts unchecked; completion validation is separate from TPM',async()=>{
  await page.getByRole('button',{name:'เริ่มทำ PM'}).click();assert.equal(await page.locator('.pm-result-options button.selected').count(),0);await page.getByRole('button',{name:'บันทึกและปิด PM'}).click();assert.match(await page.locator('.form-error').innerText(),/ยังไม่ได้บันทึกผล/)
  const items=await page.locator('.pm-execution-item').all();await items[0].getByRole('button',{name:'ผ่าน',exact:true}).click();await page.getByRole('button',{name:'บันทึกไว้ทำต่อ'}).click();await page.locator('[role=dialog]').waitFor({state:'hidden'});assert.equal(tables.ij_pm_orders[0].status,'in_progress');assert.equal(tables.ij_pm_orders[0].results[0].result,'normal');await page.getByRole('button',{name:'ทำ PM ต่อ'}).click();assert.equal(await page.locator('.pm-result-options button.selected').count(),1)
 })
 await check('PM saves actual zero, handover and next cycle without creating a TPM job',async()=>{
  const writesBefore=writes.filter(w=>w.table==='ij_tpm_jobs'&&w.method==='POST').length;const items=await page.locator('.pm-execution-item').all();await items[1].getByRole('button',{name:'ผ่าน',exact:true}).click();await items[1].locator('input[type=number]').fill('0')
  const modal=page.locator('[role=dialog]');await modal.locator('label').filter({hasText:'ชื่อผู้ทำ PM'}).locator('input').fill('ช่างทดสอบ PM');await modal.locator('label').filter({hasText:'สิ่งที่ทำจริงและผลสรุป'}).locator('textarea').fill('ทำความสะอาดและวัดค่า ผ่านทั้ง 2 ข้อ');await modal.locator('label').filter({hasText:'ผลทดสอบหลัง PM /'}).locator('textarea').fill('ทดสอบคืนเครื่องผ่าน');await modal.locator('.pm-closeout input[type=checkbox]').first().check()
  fail('ij_pm_save_result','POST');await page.getByRole('button',{name:'บันทึกและปิด PM'}).click();await page.locator('.form-error').filter({hasText:'Simulated'}).waitFor();assert.equal(await items[1].locator('input[type=number]').inputValue(),'0');await page.getByRole('button',{name:'บันทึกและปิด PM'}).click();await page.locator('[role=dialog]').waitFor({state:'hidden'});assert.equal(tables.ij_pm_orders[0].status,'completed');assert.equal(tables.ij_pm_orders[0].results[1].measured_value,0);assert.equal(tables.ij_pm_orders.length,2);assert.equal(writes.filter(w=>w.table==='ij_tpm_jobs'&&w.method==='POST').length,writesBefore)
  await page.getByRole('button',{name:'ดูผลรายข้อ'}).click();assert.equal(await page.locator('.pm-history-results article').count(),2);assert.match(await page.locator('.pm-history-document').innerText(),/0 bar/);await page.locator('[role=dialog]').getByRole('button',{name:/Close dialog/}).click()
 })
 await check('PM template approval requires reference, scope and reviewer; order uses approved standard',async()=>{
  await page.getByRole('tab',{name:'ใบมาตรฐาน PM'}).click();const card=page.locator('.pm-standard-card.template').filter({hasText:'PM ประจำสัปดาห์'});await card.getByRole('button',{name:'ดูใบมาตรฐาน'}).click();assert.equal(await page.locator('.pm-document-items article').count(),6);await page.getByRole('button',{name:'ปรับแม่แบบเป็นมาตรฐาน'}).click();await page.getByRole('button',{name:'รับรองมาตรฐาน',exact:true}).click();assert.match(await page.locator('.form-error').innerText(),/รุ่นเครื่อง/)
  const modal=page.locator('[role=dialog]');for(const [label,value] of [['เวลาเป้าหมาย (นาที)','30'],['รุ่นเครื่อง / ขอบเขต','เครื่องทดสอบ'],['คู่มือ / เอกสารอ้างอิง','คู่มือเครื่องทดสอบ ฉบับ 1 หน้า 20'],['ผู้จัดทำ','ผู้จัดทำทดสอบ'],['ผู้ทวนสอบมาตรฐาน','ผู้ทวนสอบทดสอบ']])await modal.locator('label').filter({hasText:label}).locator('input').fill(value);await page.getByRole('button',{name:'รับรองมาตรฐาน',exact:true}).click();await page.locator('[role=dialog]').waitFor({state:'hidden'});const std=tables.ij_pm_standards.find(x=>x.code==='PM-IJ-W-001');assert.equal(std.status,'approved');await page.locator('.pm-standard-card').filter({hasText:'PM-IJ-W-001'}).filter({hasText:'รับรองแล้ว'}).getByRole('button',{name:'จัดรอบ',exact:true}).click();await choose(page,page.locator('.pm-order-editor .select-menu-trigger').nth(1),'850T-16');await page.getByRole('button',{name:'สร้างรอบ PM'}).click();assert.match(await page.locator('.form-error').innerText(),/ยืนยัน/);await page.locator('.pm-order-editor input[type=checkbox]').check();await page.getByRole('button',{name:'สร้างรอบ PM'}).click();await page.locator('[role=dialog]').waitFor({state:'hidden'});assert.ok(tables.ij_pm_orders.some(x=>x.machine_id==='m2'&&x.standard_id===std.id))
 })
 await check('history ignores a slower response for the previous machine',async()=>{
  delayTimeline();await go(page,'history');await choose(page,page.locator('.history-filters .select-menu-trigger').first(),'650T-8');await choose(page,page.locator('.history-filters .select-menu-trigger').first(),'850T-16');await page.locator('.timeline-content h3').filter({hasText:'ประวัติ m2'}).waitFor();await page.waitForTimeout(350);assert.equal(await page.locator('.timeline-content h3').filter({hasText:'ประวัติ m1'}).count(),0)
 })
 await check('back and refresh preserve selected page',async()=>{await go(page,'assets');await go(page,'inspection');await page.goBack();assert.match(page.url(),/#assets/);await page.reload();await page.locator('.asset-grid-v5').waitFor();assert.match(page.url(),/#assets/)})
 await check('plan retry reuses already created rows after a later API failure',async()=>{
  await go(page,'weekly');await page.locator('.page-intro').getByRole('button',{name:/Create Plan/}).click()
  const modal=page.locator('[role=dialog]');await choose(page,modal.locator('.machine-job-card .select-menu-trigger').first(),'650T-8');await modal.locator('label').filter({hasText:'Work title'}).locator('input').fill('ทดสอบแผน 1')
  await modal.getByRole('button',{name:/Add Machine/}).click();const second=modal.locator('.machine-job-card').nth(1);await choose(page,second.locator('.select-menu-trigger').first(),'850T-16');await second.locator('label').filter({hasText:'Work title'}).locator('input').fill('ทดสอบแผน 2')
  fail('ij_tpm_jobs','POST',1);await modal.getByRole('button',{name:/Save Plan/}).click();await page.locator('.form-error').filter({hasText:'Simulated'}).waitFor();assert.equal(tables.ij_tpm_jobs.filter(j=>j.title.startsWith('ทดสอบแผน')).length,1)
  await modal.getByRole('button',{name:/Save Plan/}).click();await page.locator('[role=dialog]').waitFor({state:'hidden'});const planned=tables.ij_tpm_jobs.filter(j=>j.title.startsWith('ทดสอบแผน'));assert.equal(planned.length,2);assert.equal(new Set(planned.map(j=>j.plan_group_id)).size,1)
 })
 await check('department KPI settings never overwrite a machine-specific record',async()=>{
  await go(page,'kpi');await page.getByRole('button',{name:/KPI Targets/}).click();await page.getByRole('button',{name:/Save Targets/}).click();await page.locator('[role=dialog]').waitFor({state:'hidden'});assert.equal(tables.kpi_settings.find(k=>k.id==='machine-setting').machine_no,'650T-8');assert.ok(writes.some(w=>w.table==='kpi_settings'&&w.method==='POST'))
 })
 await check('partial loading failure is visible and refresh can recover',async()=>{
  fail('ij_opportunities','GET');await page.locator('.topbar-actions').getByRole('button',{name:/Refresh/}).click();await page.locator('.form-error').filter({hasText:'โหลดข้อมูลบางส่วนไม่สำเร็จ'}).waitFor();assert.match(await page.locator('.system-statusbar').innerText(),/ข้อมูลโหลดไม่ครบ/)
  await page.locator('.form-error').getByRole('button',{name:'ลองโหลดใหม่'}).click();await page.locator('.form-error').waitFor({state:'hidden'})
 })
 await check('desktop UI uses readable fonts and stays within the viewport on every page',async()=>{
  fs.mkdirSync(path.join(root,'docs/screenshots/desktop'),{recursive:true})
  for(const id of ['menu','dashboard','assets','weekly','inspection','defects','followup','opportunity','history','repairs','kpi','spares','pm','reports']){
   await go(page,id);await page.screenshot({path:path.join(root,'docs/screenshots/desktop',id+'.png'),fullPage:true})
   const problems=await page.evaluate(()=>Array.from(document.querySelectorAll('body *')).filter(e=>e.childNodes.length&&Array.from(e.childNodes).some(n=>n.nodeType===Node.TEXT_NODE&&n.textContent.trim())&&e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden'&&parseFloat(getComputedStyle(e).fontSize)<14).map(e=>({text:e.textContent.slice(0,60),size:getComputedStyle(e).fontSize,tag:e.tagName})));assert.deepEqual(problems,[],id+' has text under 14px');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=1281),id+' overflows')
  }
 })
 assert.deepEqual(errors,[]);
 const mobile=await fixture(390);await go(mobile.page,'inspection');await mobile.page.getByRole('button',{name:/Start Inspection/}).click()
 await check('mobile picker closes on tap; popup stays in viewport',async()=>{
  const modalBox=await mobile.page.locator('[role=dialog]').boundingBox();assert.ok(modalBox.y>=0&&modalBox.y+modalBox.height<=845);const trigger=mobile.page.locator('.inspection-form-head .select-menu-trigger').first();await trigger.tap();const box=await mobile.page.locator('.select-portal').boundingBox();assert.ok(box.x>=0&&box.x+box.width<=391&&box.y>=0&&box.y+box.height<=845);await mobile.page.getByRole('option').filter({hasText:'650T-8'}).tap();assert.equal(await mobile.page.locator('.select-portal').count(),0)
  await mobile.page.screenshot({path:path.join(root,'docs/screenshots/inspection-mobile.png'),fullPage:true})
 })
 await mobile.page.locator('[role=dialog]').getByRole('button',{name:/Close dialog/}).click()
 await check('mobile pages have 14px minimum text and no sideways page scrolling',async()=>{
  fs.mkdirSync(path.join(root,'docs/screenshots/mobile'),{recursive:true})
  for(const id of ['menu','dashboard','assets','weekly','inspection','defects','followup','opportunity','history','repairs','kpi','spares','pm','reports']){await go(mobile.page,id);await mobile.page.screenshot({path:path.join(root,'docs/screenshots/mobile',id+'.png'),fullPage:true});assert.ok(await mobile.page.evaluate(()=>document.documentElement.scrollWidth<=391),id+' mobile overflow');const small=await mobile.page.evaluate(()=>Array.from(document.querySelectorAll('body *')).filter(e=>Array.from(e.childNodes).some(n=>n.nodeType===3&&n.textContent.trim())&&e.getClientRects().length&&parseFloat(getComputedStyle(e).fontSize)<14).map(e=>({text:e.textContent.slice(0,50),size:getComputedStyle(e).fontSize})));assert.deepEqual(small,[],id+' mobile tiny text')}
  await go(mobile.page,'pm');await mobile.page.getByRole('tab',{name:'ตารางและทำ PM'}).click();await mobile.page.getByRole('button',{name:'เริ่มทำ PM'}).click();await mobile.page.locator('.pm-execution-item').first().getByRole('button',{name:'ผ่าน',exact:true}).tap();assert.equal(await mobile.page.locator('.pm-result-options button.selected').count(),1);await mobile.page.screenshot({path:path.join(root,'docs/screenshots/mobile/pm-work-order.png'),fullPage:true});assert.ok(await mobile.page.evaluate(()=>document.documentElement.scrollWidth<=391));await mobile.page.getByRole('button',{name:'บันทึกไว้ทำต่อ'}).tap();await mobile.page.locator('[role=dialog]').waitFor({state:'hidden'});assert.equal(mobile.tables.ij_pm_orders[0].status,'in_progress')
 })
 assert.deepEqual(mobile.errors,[]);
 const native=await fixture(1280,{native:true});await go(native.page,'inspection');await native.page.getByRole('button',{name:/Start Inspection/}).click();await choose(native.page,native.page.locator('.inspection-form-head .select-menu-trigger').first(),'650T-8');await choose(native.page,native.page.locator('.inspection-check-row .select-menu-trigger'),'Normal');await native.page.locator('.inspection-note-stack input[type=number]').fill('0')
 await check('numeric checklist saves an actual zero value',async()=>{
  await native.page.getByRole('button',{name:/Save Inspection/}).click();await native.page.locator('[role=dialog]').waitFor({state:'hidden'});assert.equal(native.tables.ij_condition_results[0].numeric_value,0)
 })
 
 await check('QR labels decode to the correct machine; reload and back retain routing; print excludes controls',async()=>{
  await go(page,'assets');await page.getByRole('button',{name:'พิมพ์ QR เครื่องที่แสดง (2)'}).click();await page.locator('.qr-settings input[type=url]').fill('https://example.com/ij/');await page.locator('.machine-qr-label').first().waitFor();await page.waitForFunction(()=>document.querySelectorAll('.machine-qr-label img').length===2)
  const imageURL=await page.locator('.machine-qr-label img').first().getAttribute('src');const png=PNG.sync.read(Buffer.from(imageURL.split(',')[1],'base64'));const decoded=jsQR(new Uint8ClampedArray(png.data),png.width,png.height);assert.ok(decoded);assert.equal(decoded.data,'https://example.com/ij/#history?machine=m1')
  await page.emulateMedia({media:'print'});assert.equal(await page.locator('.qr-settings').isVisible(),false);assert.equal(await page.locator('.machine-qr-sheet').isVisible(),true);assert.equal(await page.locator('.app-frame').isVisible(),false);assert.equal(await page.locator('.modal-backdrop').evaluate(e=>getComputedStyle(e).position),'static');await page.screenshot({path:path.join(root,'docs/screenshots/qr-print.png'),fullPage:true});await page.emulateMedia({media:'screen'})
  await page.getByRole('button',{name:'ล้างที่เลือก'}).click();assert.equal(await page.getByRole('button',{name:'พิมพ์ / บันทึก PDF (0)'}).isDisabled(),true);await page.locator('.qr-selection label').filter({hasText:'850T-16'}).click();await page.locator('.machine-qr-label').waitFor();assert.equal(await page.locator('.machine-qr-label').count(),1)
  await page.locator('.qr-settings input[type=url]').fill('http://localhost:5176');await page.getByText('ใช้ URL เว็บจริงที่มือถือเข้าถึงได้ ก่อนพิมพ์ QR').waitFor();assert.equal(await page.getByRole('button',{name:'พิมพ์ / บันทึก PDF (0)'}).isDisabled(),true);await page.getByRole('button',{name:'ปิด',exact:true}).click()
  await go(page,'history?machine=m2');await page.locator('.machine-banner-code').filter({hasText:'850T-16'}).waitFor();await page.reload();await page.locator('.machine-banner-code').filter({hasText:'850T-16'}).waitFor();await go(page,'history?machine=m1');await page.locator('.machine-banner-code').filter({hasText:'650T-8'}).waitFor();await page.goBack();await page.locator('.machine-banner-code').filter({hasText:'850T-16'}).waitFor()
  await go(mobile.page,'history?machine=m1');await mobile.page.locator('.machine-banner-code').filter({hasText:'650T-8'}).waitFor();await mobile.page.getByRole('button',{name:'พิมพ์ QR · 650T-8'}).click();await mobile.page.locator('.qr-settings input[type=url]').fill('https://example.com/ij/');await mobile.page.locator('.machine-qr-label').waitFor();assert.ok(await mobile.page.evaluate(()=>document.documentElement.scrollWidth<=391));await mobile.page.screenshot({path:path.join(root,'docs/screenshots/mobile/qr-label.png'),fullPage:true});await mobile.page.getByRole('button',{name:'ปิด',exact:true}).click()
 })
 await check('camera and gallery are distinct pickers in defect and inspection forms',async()=>{
  await go(page,'defects');await page.getByRole('button',{name:/New Defect|เพิ่ม.*ผิดปกติ|แจ้ง.*ผิดปกติ/}).first().click();assert.equal(await page.getByLabel('ถ่ายรูป',{exact:true}).getAttribute('capture'),'environment');assert.equal(await page.getByLabel('เลือกจากเครื่อง',{exact:true}).getAttribute('capture'),null);await page.getByLabel('เลือกจากเครื่อง',{exact:true}).setInputFiles({name:'gallery.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==','base64')});await page.locator('.defect-upload-grid figure>img').waitFor();assert.equal(await page.locator('.defect-upload-grid figure>img').count(),1);await page.getByRole('button',{name:'ปิดหน้าต่าง / Close dialog'}).click()
  await go(page,'inspection');await page.getByRole('button',{name:/Start Inspection/}).click();await choose(page,page.locator('.inspection-form-head .select-menu-trigger').first(),'650T-8');const row=page.locator('.inspection-check-row').first();await choose(page,row.locator('.select-menu-trigger'),'Abnormal');assert.equal(await row.getByLabel('ถ่ายรูป',{exact:true}).getAttribute('capture'),'environment');assert.equal(await row.getByLabel('เลือกจากเครื่อง',{exact:true}).getAttribute('capture'),null);await page.getByRole('button',{name:'ปิดหน้าต่าง / Close dialog'}).click()
 })
 fs.writeFileSync(path.join(root,'docs/browser-test-results.json'),JSON.stringify({scope:'Local browser with mocked Supabase; no production writes',results},null,2))
 console.log(JSON.stringify({passed:results.length,failed:0}))
}finally{await browser?.close();server.kill()}
