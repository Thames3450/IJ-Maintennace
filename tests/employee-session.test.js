import test from 'node:test'
import assert from 'node:assert/strict'
import {sessionFetch,setSessionToken,sessionToken} from '../src/lib/employeeSession.js'
test('employee session reaches REST and Storage, changes immediately, and never reaches another origin',async()=>{
 const previous=globalThis.localStorage,values=new Map(),calls=[]
 globalThis.localStorage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)}
 try{
 const fetcher=sessionFetch('https://example.supabase.co',async(input,init)=>{calls.push(init);return {ok:true}})
 setSessionToken('first-token');await fetcher('https://example.supabase.co/rest/v1/machines',{headers:{apikey:'public-test'}})
 assert.equal(calls.at(-1).headers.get('x-ij-session'),'first-token');assert.equal(calls.at(-1).headers.get('apikey'),'public-test')
 setSessionToken('next-token');await fetcher(new URL('https://example.supabase.co/storage/v1/object/sign/bucket'),{method:'POST'})
 assert.equal(calls.at(-1).headers.get('x-ij-session'),'next-token')
 await fetcher('https://another.example/photo');assert.equal(calls.at(-1).headers.get('x-ij-session'),null)
 setSessionToken('');await fetcher(new Request('https://example.supabase.co/rest/v1/machines',{headers:{'x-ij-session':'stale'}}))
 assert.equal(sessionToken(),'');assert.equal(calls.at(-1).headers.get('x-ij-session'),null)
 }finally{if(previous===undefined)delete globalThis.localStorage;else globalThis.localStorage=previous}
})
