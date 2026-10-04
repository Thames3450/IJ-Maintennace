export function machineLink(base,machineId){
 const url=new URL(base)
 if(!['http:','https:'].includes(url.protocol)||url.username||url.password)throw new Error('กรุณาระบุ URL เว็บแบบ https:// หรือ http://')
 if(['localhost','127.0.0.1','0.0.0.0','[::1]'].includes(url.hostname))throw new Error('ใช้ URL เว็บจริงที่มือถือเข้าถึงได้ ก่อนพิมพ์ QR')
 url.search='';url.hash=`history?machine=${encodeURIComponent(machineId)}`
 return url.href
}
export function readMachineRoute(hash){return new URLSearchParams(hash.split('?')[1]||'').get('machine')||''}
