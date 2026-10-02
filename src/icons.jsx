import React from 'react'

const BASE = import.meta.env.BASE_URL || './'
const files = {
  analytics:'Analytics-Graph-Bar-1--Streamline-Ultimate.png', alert:'Alert-Triangle--Streamline-Ultimate.png', alertLaptop:'Alert-Message-Laptop--Streamline-Ultimate.png', alertUser:'Alert-User--Streamline-Ultimate.png',
  attach:'Attachment--Streamline-Ultimate.png', bin:'Bin--Streamline-Ultimate.png', calendar:'Calendar-Add-1--Streamline-Ultimate.png', camera:'Camera-1--Streamline-Ultimate.png', check:'Check-Circle-1--Streamline-Ultimate.png', cog:'Cog-1--Streamline-Ultimate.png', delete2:'Delete-2--Streamline-Ultimate.png', truck:'Delivery-Truck-2--Streamline-Ultimate.png', hourglass:'Hourglass--Streamline-Ultimate.png', house:'House-1--Streamline-Ultimate.png', list:'List-Bullets--Streamline-Ultimate.png', login:'Login--Streamline-Ultimate.png', logout:'Logout--Streamline-Ultimate.png', add:'Multiple-Actions-Add--Streamline-Ultimate.png', pencil:'Pencil-Write-2--Streamline-Ultimate.png', pin:'Pin-1--Streamline-Ultimate.png', print:'Print-Text--Streamline-Ultimate.png', remove:'Remove-Circle--Streamline-Ultimate.png', search:'Search-1--Streamline-Ultimate.png', share:'Share-1--Streamline-Ultimate.png', shipAdd:'Shipment-Add--Streamline-Ultimate.png', box:'Shipment-Box--Streamline-Ultimate.png', shipCheck:'Shipment-Check--Streamline-Ultimate.png', person:'Single-Man-Half--Streamline-Ultimate.png', userAdd:'Single-Neutral-Actions-Add_1--Streamline-Ultimate.png', userEdit:'Single-Neutral-Actions-Edit-1_1--Streamline-Ultimate.png', sync:'Synchronize-Arrow-1--Streamline-Ultimate.png', tags:'Tags-Double-1--Streamline-Ultimate.png', taskAdd:'Task-Checklist-Add--Streamline-Ultimate.png', taskCheck:'Task-Checklist-Check--Streamline-Ultimate.png', taskRemove:'Task-Checklist-Remove--Streamline-Ultimate.png', taskWrite:'Task-Checklist-Write--Streamline-Ultimate.png', clock:'Time-Clock-Circle--Streamline-Ultimate.png', clockFile:'Time-Clock-File--Streamline-Ultimate.png', clockAdd:'Time-Clock-File-Add--Streamline-Ultimate.png', clockCheck:'Time-Clock-File-Check--Streamline-Ultimate.png', clockWarn:'Time-Clock-File-Warning--Streamline-Ultimate.png', clockHand:'Time-Clock-Hand-1--Streamline-Ultimate.png', wrench:'Wrench--Streamline-Ultimate.png', bellCheck:'Alarm-Bell-Check--Streamline-Ultimate.png'
}

function icon(key,{rotate=0}={}){
  return function StreamlineIcon({size=20,className='',style={},alt='',...props}){
    const px=typeof size==='number'?`${size}px`:size
    return <img aria-hidden={alt?'false':'true'} alt={alt} className={`streamline-icon ${className||''}`} src={`${BASE}icons/${files[key]}`} style={{width:px,height:px,objectFit:'contain',display:'inline-block',flex:'0 0 auto',transform:rotate?`rotate(${rotate}deg)`:undefined,...style}} {...props}/>
  }
}

export const LayoutDashboard=icon('house')
export const CalendarRange=icon('calendar')
export const History=icon('clockFile')
export const Wrench=icon('wrench')
export const ListChecks=icon('taskCheck')
export const ShieldCheck=icon('bellCheck')
export const LogOut=icon('logout')
export const RefreshCcw=icon('sync')
export const Plus=icon('add')
export const Boxes=icon('box')
export const ClipboardCheck=icon('taskCheck')
export const AlertTriangle=icon('alert')
export const Lightbulb=icon('pencil')
export const Gauge=icon('analytics')
export const PackageSearch=icon('box')
export const FileBarChart=icon('analytics')
export const Menu=icon('list')
export const X=icon('remove')
export const Loader2=icon('sync')
export const Shield=icon('bellCheck')
export const Hash=icon('tags')
export const LockKeyhole=icon('login')
export const ArrowRight=icon('share',{rotate:90})
export const Trash2=icon('delete2')
export const Copy=icon('attach')
export const CalendarDays=icon('calendar')
export const Users=icon('userAdd')
export const Factory=icon('cog')
export const Activity=icon('analytics')
export const Clock3=icon('clock')
export const CheckCircle2=icon('check')
export const Timer=icon('clockHand')
export const Settings2=icon('cog')
export const Repeat2=icon('sync')
export const Info=icon('alertLaptop')
export const TrendingUp=icon('analytics')
export const Target=icon('pin')
export const Eye=icon('alertUser')
export const Save=icon('taskCheck')
export const Search=icon('search')
export const ChevronDown=icon('share',{rotate:180})
export const CalendarClock=icon('clockAdd')
export const PlusCircle=icon('taskAdd')
export const UserRound=icon('person')
export const ChevronLeft=icon('share',{rotate:-90})
export const ChevronRight=icon('share',{rotate:90})
export const Play=icon('clockHand')
export const Check=icon('check')
export const Pencil=icon('pencil')
export const AlertCircle=icon('alert')
export const TimerReset=icon('sync')
export const PackageOpen=icon('box')
export const ArrowUpRight=icon('share')
export const Printer=icon('print')
export const Download=icon('shipAdd')
export const Filter=icon('tags')
export const CalendarCheck2=icon('clockCheck')

export const Camera=icon('camera')
