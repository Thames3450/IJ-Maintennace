import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const weekly=fs.readFileSync(new URL('../src/pages/WeeklyPlan.jsx',import.meta.url),'utf8')
const app=fs.readFileSync(new URL('../src/App.jsx',import.meta.url),'utf8')
const modal=fs.readFileSync(new URL('../src/components/ExecutionModal.jsx',import.meta.url),'utf8')

test('completed historical TPM without execution still exposes add result/photos',()=>{
  assert.match(weekly,/const canEditResult=can&&\['completed','partial'\]\.includes\(job\.job_status\)/)
  assert.doesNotMatch(weekly,/canEditResult=can&&!!exec/)
  assert.match(weekly,/Add Result \/ Photos/)
})

test('historical edit can create result metadata only when result data exists and can save photos only',()=>{
  assert.match(app,/else if\(hasExecutionData\)/)
  assert.match(app,/syncTpmPhotos\(job,\{new_photos,deleted_photo_ids\}\)/)
  assert.match(modal,/if\(!editOnly&&!form\.result_summary\.trim\(\)\)/)
  assert.match(modal,/if\(editOnly&&!hasEditData\)/)
})
