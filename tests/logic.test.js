import test from 'node:test'
import assert from 'node:assert/strict'
import {tpmMetrics,paretoData} from '../src/lib/kpi.js'
import {inspectionRows,inspectionSummary,FALLBACK_ITEMS} from '../src/lib/inspectionChecklist.js'
import {decodeActionResult,encodeActionResult} from '../src/lib/actionResult.js'
import {validDate,positiveQuantity,nonNegative,confirmedUpdate} from '../src/lib/validation.js'
import {readPaged} from '../src/lib/readPaged.js'
import {fmtDate,fmtDateTime} from '../src/lib/utils.js'
test('partial work stays open and overdue; cancelled excluded',()=>{
 const m=tpmMetrics([{planned_date:'2024-01-01',job_status:'completed'},{planned_date:'2024-01-01',job_status:'partial'},{planned_date:'2024-01-01',job_status:'cancelled'}],'2024-01-01','2024-01-31')
 assert.equal(m.completed,1);assert.equal(m.completion,50);assert.equal(m.overdue,1)
})
test('online checklist starts uninspected and local items have no foreign key',()=>{
 const rows=inspectionRows(FALLBACK_ITEMS);assert.equal(rows.length,12);assert.ok(rows.every(r=>r.result_status===''&&r.template_item_id===null))
})
test('condition score excludes N/A; all N/A does not report 100%',()=>{
 assert.deepEqual(inspectionSummary([{result_status:'normal'},{result_status:'abnormal'},{result_status:'na'}]),{score:65,overall:'abnormal'})
 assert.equal(inspectionSummary([{result_status:'na'}]).score,null)
})
test('performed work and verification survive round trip, old notes retained',()=>{
 assert.deepEqual(decodeActionResult(encodeActionResult('เปลี่ยนสายลม','เดินเครื่องแล้วไม่มีลมรั่ว')),{work_result:'เปลี่ยนสายลม',verification_note:'เดินเครื่องแล้วไม่มีลมรั่ว'})
 assert.deepEqual(decodeActionResult('Legacy note'),{work_result:'',verification_note:'Legacy note'})
})
test('dates reject impossible dates and quantities reject zero/negative',()=>{
 assert.equal(validDate('2026-02-30'),false);assert.equal(validDate('2024-02-29'),true)
 assert.throws(()=>positiveQuantity(0));assert.throws(()=>positiveQuantity(-1));assert.equal(nonNegative(0),0);assert.throws(()=>nonNegative(''))
})
test('no-row updates never report success',async()=>{
 await assert.rejects(()=>confirmedUpdate({select:async()=>({data:[],error:null})}))
 await assert.rejects(()=>confirmedUpdate({select:async()=>({data:null,error:new Error('denied')})}),/denied/)
})
test('reads beyond server page limits and reports configured cap',async()=>{
 const all=Array.from({length:1201},(_,id)=>({id})),query={range:async(a,b)=>({data:all.slice(a,b+1),error:null})}
 const full=await readPaged(query,2000);assert.equal(full.data.length,1201);assert.equal(full.capped,false)
 const capped=await readPaged(query,1000);assert.equal(capped.data.length,1000);assert.equal(capped.capped,true)
})
test('legacy invalid timestamps do not crash the page',()=>{assert.equal(fmtDate('bad date'),'-');assert.equal(fmtDateTime('bad date'),'-')})

test('Pareto cumulative percentage uses every category, not only the first ten',()=>{
 const p=paretoData(Array.from({length:11},(_,i)=>({label:String(i),value:1})))
 assert.equal(p.total,11);assert.equal(p.rows.length,10);assert.ok(p.rows.at(-1).cumulativePct<91)
})
