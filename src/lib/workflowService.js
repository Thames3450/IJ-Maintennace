import {supabase} from './supabase.js'
export async function workflowRPC(name,args){
 const {data,error}=await supabase.rpc(name,args)
 if(error){if(error.code==='PGRST202')throw new Error('ฐานข้อมูลยังไม่พร้อมสำหรับรุ่น v13.11 กรุณาติดตั้งไฟล์อัปเดตฐานข้อมูลก่อนใช้งาน');throw error}
 return data
}
