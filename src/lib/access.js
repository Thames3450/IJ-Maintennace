export const ROLE_LABELS={
  engineer:{en:'Engineer / Admin',th:'วิศวกร / แอดมิน'},
  admin:{en:'Engineer / Admin',th:'วิศวกร / แอดมิน'},
  technician:{en:'Technician',th:'ช่าง'},
  manager:{en:'Manager',th:'ผู้จัดการ'},
  production:{en:'Production / Planning',th:'ฝ่ายผลิต / แพลนนิ่ง'}
}

export const roleLabel=role=>ROLE_LABELS[role]||{en:role||'-',th:''}
export const isEngineer=role=>['engineer','admin'].includes(role)
export const isTechnician=role=>role==='technician'
export const isMaintainer=role=>isEngineer(role)||isTechnician(role)
export const isManager=role=>role==='manager'
export const isProduction=role=>role==='production'
export const canManageUsers=role=>isEngineer(role)
export const canManagePlans=role=>isEngineer(role)
export const canExecuteMaintenance=role=>isMaintainer(role)
export const canInspect=role=>isMaintainer(role)
export const canViewManagement=role=>isEngineer(role)||isManager(role)||isProduction(role)

export const PAGE_ACCESS={
  menu:['engineer','admin','technician','manager','production'],
  dashboard:['engineer','admin','technician','manager','production'],
  assets:['engineer','admin','technician','manager','production'],
  weekly:['engineer','admin','technician','manager','production'],
  inspection:['engineer','admin','technician'],
  defects:['engineer','admin','technician','manager'],
  followup:['engineer','admin','technician','manager'],
  opportunity:['engineer','admin','technician','manager'],
  history:['engineer','admin','technician','manager','production'],
  repairs:['engineer','admin','technician','manager','production'],
  kpi:['engineer','admin','manager','production'],
  spares:['engineer','admin','technician','manager'],
  pm:['engineer','admin','technician','manager','production'],
  reports:['engineer','admin','manager','production'],
  users:['engineer','admin']
}

export const canOpenPage=(role,page)=>(PAGE_ACCESS[page]||[]).includes(role)
export const defaultPageForRole=role=>role==='manager'||role==='production'?'dashboard':'menu'
