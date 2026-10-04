// Supabase may cap each response below a requested limit. Use small bounded pages.
export async function readPaged(query,cap=10000){
 const data=[]
 for(let offset=0;offset<cap;offset+=500){
  const size=Math.min(500,cap-offset),result=await query.range(offset,offset+size-1)
  if(result.error)return result
  const batch=result.data||[];data.push(...batch)
  if(batch.length<size)return {...result,data,capped:false}
 }
 return {data,error:null,capped:true}
}
