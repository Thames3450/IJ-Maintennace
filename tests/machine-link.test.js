import test from 'node:test'
import assert from 'node:assert/strict'
import {machineLink,readMachineRoute} from '../src/lib/machineLink.js'
test('machine QR keeps hosting subpath and encodes the machine identity',()=>{
 const url=machineLink('https://example.com/ij/?old=1#assets','เครื่อง & 1')
 assert.equal(new URL(url).pathname,'/ij/')
 assert.equal(readMachineRoute(new URL(url).hash),'เครื่อง & 1')
 assert.equal(new URL(url).search,'')
})
test('machine QR rejects local and executable addresses',()=>{
 for(const base of ['http://localhost:5176','http://127.0.0.1','http://[::1]','javascript:alert(1)','https://user:pass@example.com'])assert.throws(()=>machineLink(base,'m1'))
})
