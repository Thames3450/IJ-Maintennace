import test from 'node:test'
import assert from 'node:assert/strict'
import {photoLocation,resolvePhotoUrls,PHOTO_URL_LIFETIME} from '../src/lib/photoUrls.js'
const fixture=handler=>{
 const calls=[]
 const client={storage:{from:bucket=>({
  createSignedUrls:async(paths,seconds)=>{
   calls.push({bucket,paths,seconds})
   return handler?handler(bucket,paths):{data:paths.map(path=>({path,signedUrl:`https://test.invalid/sign/${bucket}/${path}?token=fresh`}))}
  }
 })}}
 return {client,calls}
}
test('private photos sign each bucket once and deduplicate paths without changing original metadata',async()=>{
 const photos=[{id:'one',storage_path:'machine/one.jpg',public_url:'https://test.invalid/public/one.jpg'},{id:'two',storage_path:'machine/one.jpg'},{id:'three',storage_bucket:'ij-defect-photos',storage_path:'machine/one.jpg'}],original=structuredClone(photos),{client,calls}=fixture()
 const resolved=await resolvePhotoUrls(client,photos)
 assert.equal(calls.length,2);assert.deepEqual(calls[0].paths,['machine/one.jpg']);assert.equal(calls[0].seconds,PHOTO_URL_LIFETIME)
 assert.equal(resolved.length,3);assert.equal(resolved[0].signed_url,resolved[1].signed_url);assert.notEqual(resolved[0].signed_url,resolved[2].signed_url);assert.deepEqual(photos,original)
})
test('legacy public URL yields a private storage path, including encoded names',async()=>{
 const photo={public_url:'https://project.supabase.co/storage/v1/object/public/ij-inspection-photos/230T-5/old%20photo.jpg'}
 assert.deepEqual(photoLocation(photo),{bucket:'ij-inspection-photos',path:'230T-5/old photo.jpg'})
 const {client,calls}=fixture(),resolved=await resolvePhotoUrls(client,[photo]);assert.deepEqual(calls[0].paths,['230T-5/old photo.jpg']);assert.match(resolved[0].signed_url,/\/sign\//)
})
test('partial signing errors retain valid photos and never reuse a broken public URL',async()=>{
 const {client}=fixture((bucket,paths)=>({data:[{path:paths[0],signedUrl:'https://test.invalid/sign/good'},{path:paths[1],error:'Object not found',signedUrl:'https://test.invalid/sign/bad'}]}))
 const rows=await resolvePhotoUrls(client,[{storage_path:'good'},{storage_path:'bad',public_url:'https://test.invalid/public/bad',signed_url:'https://test.invalid/expired'},{storage_path:'omitted'}])
 assert.ok(rows[0].signed_url);assert.equal(rows[0].photo_error,null);for(const row of rows.slice(1)){assert.equal(row.signed_url,null);assert.ok(row.photo_error)}
})
test('one failed bucket does not suppress the other bucket or fall back to stale URLs',async()=>{
 const {client}=fixture((bucket,paths)=>{if(bucket==='ij-inspection-photos')throw new Error('network');return {data:paths.map(path=>({path,signedUrl:'https://test.invalid/sign/good'}))}})
 const rows=await resolvePhotoUrls(client,[{storage_path:'inspection',signed_url:'https://test.invalid/expired'},{storage_bucket:'ij-defect-photos',storage_path:'defect'}]);assert.equal(rows[0].signed_url,null);assert.ok(rows[0].photo_error);assert.ok(rows[1].signed_url)
})
test('large photo lists are signed in bounded batches',async()=>{
 const {client,calls}=fixture(),rows=await resolvePhotoUrls(client,Array.from({length:205},(_,n)=>({storage_path:`photo-${n}.jpg`})))
 assert.deepEqual(calls.map(c=>c.paths.length),[100,100,5]);assert.equal(rows.filter(r=>r.signed_url).length,205)
})
test('missing paths and unrelated buckets show an error without signing unrelated storage',async()=>{
 const {client,calls}=fixture(),rows=await resolvePhotoUrls(client,[{public_url:'https://example.com/file.jpg'},{storage_bucket:'other-department',storage_path:'photo.jpg'}])
 assert.equal(calls.length,0);assert.ok(rows.every(r=>!r.signed_url&&r.photo_error));assert.deepEqual(await resolvePhotoUrls(client,[]),[])
})
