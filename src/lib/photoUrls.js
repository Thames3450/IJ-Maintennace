export const PHOTO_URL_LIFETIME=3600
const PHOTO_BUCKETS=new Set(['ij-inspection-photos','ij-defect-photos'])

export function photoLocation(photo,defaultBucket='ij-inspection-photos'){
 let bucket=photo.storage_bucket||defaultBucket,path=photo.storage_path||''
 if(!path&&photo.public_url){
  try{
   const url=new URL(photo.public_url)
   const match=url.pathname.match(/^\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+)$/)
   if(match){bucket=photo.storage_bucket||decodeURIComponent(match[1]);path=decodeURIComponent(match[2])}
  }catch{}
 }
 return {bucket,path}
}

// Both IJ photo buckets are private. A public URL is never a fallback.
export async function resolvePhotoUrls(client,photos,{defaultBucket='ij-inspection-photos'}={}){
 const groups=new Map(),urls=new Map(),errors=new Map()
 const locations=photos.map(photo=>photoLocation(photo,defaultBucket))
 for(const {bucket,path} of locations){
  const key=`${bucket}/${path}`
  if(!PHOTO_BUCKETS.has(bucket)||!path){errors.set(key,'ไม่พบข้อมูลไฟล์รูป');continue}
  if(!groups.has(bucket))groups.set(bucket,new Set())
  groups.get(bucket).add(path)
 }
 for(const [bucket,paths] of groups){
  const list=[...paths]
  for(let i=0;i<list.length;i+=100){
   const batch=list.slice(i,i+100)
   try{
    const {data,error}=await client.storage.from(bucket).createSignedUrls(batch,PHOTO_URL_LIFETIME)
    if(error)throw error
    const byPath=new Map((data||[]).map(item=>[item.path,item]))
    for(const path of batch){
     const item=byPath.get(path),url=item?.signedUrl||item?.signed_url
     if(!item?.error&&url)urls.set(`${bucket}/${path}`,url)
     else errors.set(`${bucket}/${path}`,'โหลดรูปไม่สำเร็จ กรุณาลองใหม่')
    }
   }catch{
    batch.forEach(path=>errors.set(`${bucket}/${path}`,'โหลดรูปไม่สำเร็จ กรุณาลองใหม่'))
   }
  }
 }
 return photos.map((photo,i)=>{
  const location=locations[i],key=`${location.bucket}/${location.path}`
  return {...photo,storage_bucket:location.bucket,storage_path:location.path,signed_url:urls.get(key)||null,photo_error:errors.get(key)||null}
 })
}
