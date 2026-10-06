const SESSION_KEY='ij_employee_session_v1'
export function sessionToken(){try{return localStorage.getItem(SESSION_KEY)||''}catch{return ''}}
export function setSessionToken(token){if(token)localStorage.setItem(SESSION_KEY,token);else localStorage.removeItem(SESSION_KEY)}
export function sessionFetch(origin,fetcher=globalThis.fetch){return (input,init={})=>{
 const url=new URL(input instanceof URL?input.href:typeof input==='string'?input:input.url)
 const headers=new Headers(init.headers||(typeof input!=='string'?input.headers:undefined))
 if(url.origin===new URL(origin).origin){const token=sessionToken();if(token)headers.set('x-ij-session',token);else headers.delete('x-ij-session')}
 return fetcher(input,{...init,headers})
}}
