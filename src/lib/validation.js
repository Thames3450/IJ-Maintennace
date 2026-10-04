export function nonNegative(value,label='เวลา'){
 const n=Number(value)
 if(value===''||!Number.isFinite(n)||n<0)throw new Error(`${label} ต้องเป็นตัวเลขตั้งแต่ 0 ขึ้นไป`)
 return n
}
export function positiveQuantity(value){const n=Number(value);if(!Number.isFinite(n)||n<=0)throw new Error('จำนวนอะไหล่ต้องมากกว่า 0');return n}
export function validDate(value){return /^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(`${value}T00:00:00`))&&new Date(`${value}T00:00:00Z`).toISOString().slice(0,10)===value}
export async function confirmedUpdate(query){const {data,error}=await query.select('id');if(error)throw error;if(!data?.length)throw new Error('ข้อมูลไม่ได้รับการอัปเดต อาจถูกเปลี่ยนโดยผู้อื่นหรือไม่มีสิทธิ์ กรุณารีเฟรช');return data}
