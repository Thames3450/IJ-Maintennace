import test from 'node:test'
import assert from 'node:assert/strict'
import {canOpenPage,isEngineer,isMaintainer,isManager,isProduction,defaultPageForRole} from '../src/lib/access.js'

test('engineer can execute maintenance and open every core IJ page',()=>{
  assert.equal(isEngineer('engineer'),true)
  assert.equal(isMaintainer('engineer'),true)
  for(const page of ['menu','dashboard','assets','weekly','inspection','defects','followup','opportunity','history','repairs','kpi','spares','pm','reports','users']) assert.equal(canOpenPage('engineer',page),true,page)
})

test('technician can work but cannot manage users or management reports',()=>{
  assert.equal(isMaintainer('technician'),true)
  assert.equal(canOpenPage('technician','inspection'),true)
  assert.equal(canOpenPage('technician','pm'),true)
  assert.equal(canOpenPage('technician','users'),false)
  assert.equal(canOpenPage('technician','kpi'),false)
})

test('manager and production use dashboard-first read/decision workspaces',()=>{
  assert.equal(isManager('manager'),true)
  assert.equal(isProduction('production'),true)
  assert.equal(defaultPageForRole('manager'),'dashboard')
  assert.equal(defaultPageForRole('production'),'dashboard')
  assert.equal(canOpenPage('manager','weekly'),true)
  assert.equal(canOpenPage('production','weekly'),true)
  assert.equal(canOpenPage('production','assets'),true)
  assert.equal(canOpenPage('manager','inspection'),false)
  assert.equal(canOpenPage('production','inspection'),false)
  assert.equal(canOpenPage('production','users'),false)
})
