-- IJ Maintenance v14.0
-- Employee-code access, registration approval, role routing, and calendar approval workflow.

create table if not exists public.ij_user_access (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.app_profiles(id) on delete cascade,
  system_role text not null check (system_role in ('engineer','technician','manager','production','admin')),
  is_active boolean not null default true,
  approved_by_profile_id uuid references public.app_profiles(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ij_access_requests (
  id uuid primary key default gen_random_uuid(),
  employee_code text not null unique,
  full_name text not null,
  requested_role text not null check (requested_role in ('engineer','technician','manager','production')),
  requested_position text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  admin_note text,
  approved_by_profile_id uuid references public.app_profiles(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ij_user_access enable row level security;
alter table public.ij_access_requests enable row level security;
revoke all on public.ij_user_access from anon, authenticated;
revoke all on public.ij_access_requests from anon, authenticated;

create index if not exists ij_user_access_role_idx on public.ij_user_access(system_role,is_active);
create index if not exists ij_access_requests_status_idx on public.ij_access_requests(status,created_at desc);

alter table public.ij_tpm_jobs
  add column if not exists production_note text,
  add column if not exists production_proposed_date date,
  add column if not exists production_action_by uuid references public.app_profiles(id) on delete set null,
  add column if not exists production_action_at timestamptz,
  add column if not exists manager_note text,
  add column if not exists manager_action_by uuid references public.app_profiles(id) on delete set null,
  add column if not exists manager_action_at timestamptz;

-- Existing active IJ technicians can enter immediately.
insert into public.ij_user_access(profile_id,system_role,is_active,approved_at)
select p.id,
       case when p.role in ('admin','supervisor') then 'engineer' else 'technician' end,
       true,
       now()
from public.app_profiles p
join public.departments d on d.id=p.department_id and d.dept_code='IJ'
where p.is_active=true and upper(coalesce(p.employee_code,'')) <> 'IJ-WEB'
on conflict(profile_id) do nothing;

-- Current IJ engineers. Keep their shared MPR profile/department intact.
insert into public.ij_user_access(profile_id,system_role,is_active,approved_at)
select p.id,'engineer',true,now()
from public.app_profiles p
where p.employee_code in ('680470','680896')
on conflict(profile_id) do update
set system_role='engineer',is_active=true,updated_at=now();

create or replace function public.ij_access_login(p_employee_code text)
returns table(
  id uuid,
  employee_code text,
  full_name text,
  department_id uuid,
  role text,
  shift text,
  "position" text
)
language sql
stable
security definer
set search_path=public
as $$
  select p.id,p.employee_code,p.full_name,p.department_id,a.system_role,p.shift,
         coalesce(p.position,
           case a.system_role
             when 'engineer' then 'Engineer'
             when 'technician' then 'Technician'
             when 'manager' then 'Manager'
             when 'production' then 'Production / Planning'
             else 'Administrator'
           end)
  from public.app_profiles p
  join public.ij_user_access a on a.profile_id=p.id
  where upper(trim(p.employee_code))=upper(trim(p_employee_code))
    and p.is_active=true and a.is_active=true
  limit 1
$$;

create or replace function public.ij_access_request_status(p_employee_code text)
returns table(
  request_id uuid,
  status text,
  requested_role text,
  full_name text,
  admin_note text,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path=public
as $$
  select r.id,r.status,r.requested_role,r.full_name,r.admin_note,r.created_at,r.updated_at
  from public.ij_access_requests r
  where upper(trim(r.employee_code))=upper(trim(p_employee_code))
  limit 1
$$;

create or replace function public.ij_access_register(
  p_employee_code text,
  p_full_name text,
  p_requested_role text,
  p_requested_position text default null
)
returns table(request_id uuid,status text)
language plpgsql
security definer
set search_path=public
as $$
declare
  v_code text:=upper(trim(p_employee_code));
  v_name text:=trim(p_full_name);
  v_id uuid;
  v_status text;
begin
  if v_code='' or length(v_code)>30 then raise exception 'กรุณาระบุรหัสพนักงานให้ถูกต้อง'; end if;
  if v_name='' or length(v_name)>160 then raise exception 'กรุณาระบุชื่อ-นามสกุล'; end if;
  if p_requested_role not in ('engineer','technician','manager','production') then raise exception 'ตำแหน่งไม่ถูกต้อง'; end if;

  if exists(
    select 1 from public.app_profiles p
    join public.ij_user_access a on a.profile_id=p.id
    where upper(trim(p.employee_code))=v_code and p.is_active and a.is_active
  ) then
    raise exception 'รหัสพนักงานนี้มีสิทธิ์ใช้งานแล้ว กรุณาเข้าสู่ระบบ';
  end if;

  insert into public.ij_access_requests(employee_code,full_name,requested_role,requested_position,status,admin_note,approved_by_profile_id,approved_at,updated_at)
  values(v_code,v_name,p_requested_role,nullif(trim(p_requested_position),''),'pending',null,null,null,now())
  on conflict(employee_code) do update set
    full_name=excluded.full_name,
    requested_role=excluded.requested_role,
    requested_position=excluded.requested_position,
    status='pending',
    admin_note=null,
    approved_by_profile_id=null,
    approved_at=null,
    updated_at=now()
  returning id,ij_access_requests.status into v_id,v_status;

  return query select v_id,v_status;
end
$$;

create or replace function public.ij_access_assignees()
returns table(
  id uuid,
  employee_code text,
  full_name text,
  role text,
  shift text,
  department_id uuid,
  "position" text
)
language sql
stable
security definer
set search_path=public
as $$
  select p.id,p.employee_code,p.full_name,a.system_role,p.shift,p.department_id,p.position
  from public.ij_user_access a
  join public.app_profiles p on p.id=a.profile_id
  where a.is_active=true and p.is_active=true and a.system_role in ('engineer','technician','admin')
  order by case when a.system_role in ('engineer','admin') then 0 else 1 end,p.full_name
$$;

create or replace function public.ij_access_admin_requests(p_actor_employee_code text)
returns table(
  id uuid,
  employee_code text,
  full_name text,
  requested_role text,
  requested_position text,
  status text,
  admin_note text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path=public
as $$
begin
  if not exists(
    select 1 from public.app_profiles p
    join public.ij_user_access a on a.profile_id=p.id
    where upper(trim(p.employee_code))=upper(trim(p_actor_employee_code))
      and p.is_active and a.is_active and a.system_role in ('engineer','admin')
  ) then raise exception 'ไม่มีสิทธิ์จัดการผู้ใช้'; end if;

  return query
  select r.id,r.employee_code,r.full_name,r.requested_role,r.requested_position,r.status,r.admin_note,r.created_at,r.updated_at
  from public.ij_access_requests r
  order by case r.status when 'pending' then 0 when 'rejected' then 1 else 2 end,r.created_at desc;
end
$$;

create or replace function public.ij_access_admin_users(p_actor_employee_code text)
returns table(
  profile_id uuid,
  employee_code text,
  full_name text,
  role text,
  "position" text,
  is_active boolean,
  approved_at timestamptz
)
language plpgsql
stable
security definer
set search_path=public
as $$
begin
  if not exists(
    select 1 from public.app_profiles p
    join public.ij_user_access a on a.profile_id=p.id
    where upper(trim(p.employee_code))=upper(trim(p_actor_employee_code))
      and p.is_active and a.is_active and a.system_role in ('engineer','admin')
  ) then raise exception 'ไม่มีสิทธิ์จัดการผู้ใช้'; end if;

  return query
  select p.id,p.employee_code,p.full_name,a.system_role,p.position,a.is_active,a.approved_at
  from public.ij_user_access a
  join public.app_profiles p on p.id=a.profile_id
  order by a.is_active desc,
           case a.system_role when 'engineer' then 0 when 'admin' then 0 when 'manager' then 1 when 'production' then 2 else 3 end,
           p.full_name;
end
$$;

create or replace function public.ij_access_admin_decide(
  p_actor_employee_code text,
  p_request_id uuid,
  p_approve boolean,
  p_role text default null,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare
  v_actor uuid;
  v_req public.ij_access_requests%rowtype;
  v_profile uuid;
  v_ij_dept uuid;
  v_role text;
begin
  select p.id into v_actor
  from public.app_profiles p
  join public.ij_user_access a on a.profile_id=p.id
  where upper(trim(p.employee_code))=upper(trim(p_actor_employee_code))
    and p.is_active and a.is_active and a.system_role in ('engineer','admin')
  limit 1;
  if v_actor is null then raise exception 'ไม่มีสิทธิ์อนุมัติผู้ใช้'; end if;

  select * into v_req from public.ij_access_requests where id=p_request_id for update;
  if not found then raise exception 'ไม่พบคำขอลงทะเบียน'; end if;

  if not p_approve then
    update public.ij_access_requests
    set status='rejected',admin_note=nullif(trim(p_note),''),approved_by_profile_id=v_actor,approved_at=now(),updated_at=now()
    where id=p_request_id;
    return;
  end if;

  v_role:=coalesce(p_role,v_req.requested_role);
  if v_role not in ('engineer','technician','manager','production','admin') then raise exception 'Role ไม่ถูกต้อง'; end if;

  select id into v_profile from public.app_profiles where upper(trim(employee_code))=upper(trim(v_req.employee_code)) limit 1;
  if v_profile is null then
    select id into v_ij_dept from public.departments where dept_code='IJ' limit 1;
    insert into public.app_profiles(employee_code,full_name,department_id,role,is_active,position)
    values(
      upper(trim(v_req.employee_code)),
      trim(v_req.full_name),
      v_ij_dept,
      'technician',
      true,
      coalesce(nullif(trim(v_req.requested_position),''),
        case v_role
          when 'engineer' then 'Engineer'
          when 'technician' then 'ช่างเทคนิค'
          when 'manager' then 'Manager'
          when 'production' then 'Production / Planning'
          else 'Administrator'
        end)
    )
    returning id into v_profile;
  end if;

  insert into public.ij_user_access(profile_id,system_role,is_active,approved_by_profile_id,approved_at,updated_at)
  values(v_profile,v_role,true,v_actor,now(),now())
  on conflict(profile_id) do update set
    system_role=excluded.system_role,
    is_active=true,
    approved_by_profile_id=v_actor,
    approved_at=now(),
    updated_at=now();

  update public.ij_access_requests
  set status='approved',admin_note=nullif(trim(p_note),''),approved_by_profile_id=v_actor,approved_at=now(),updated_at=now()
  where id=p_request_id;
end
$$;

create or replace function public.ij_access_admin_update_user(
  p_actor_employee_code text,
  p_profile_id uuid,
  p_role text,
  p_is_active boolean
)
returns void
language plpgsql
security definer
set search_path=public
as $$
begin
  if not exists(
    select 1 from public.app_profiles p
    join public.ij_user_access a on a.profile_id=p.id
    where upper(trim(p.employee_code))=upper(trim(p_actor_employee_code))
      and p.is_active and a.is_active and a.system_role in ('engineer','admin')
  ) then raise exception 'ไม่มีสิทธิ์จัดการผู้ใช้'; end if;
  if p_role not in ('engineer','technician','manager','production','admin') then raise exception 'Role ไม่ถูกต้อง'; end if;

  update public.ij_user_access
  set system_role=p_role,is_active=p_is_active,updated_at=now()
  where profile_id=p_profile_id;
  if not found then raise exception 'ไม่พบผู้ใช้'; end if;
end
$$;

create or replace function public.ij_access_plan_decision(
  p_actor_employee_code text,
  p_group_id uuid,
  p_action text,
  p_note text default null,
  p_proposed_date date default null
)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare
  v_actor uuid;
  v_role text;
begin
  select p.id,a.system_role into v_actor,v_role
  from public.app_profiles p
  join public.ij_user_access a on a.profile_id=p.id
  where upper(trim(p.employee_code))=upper(trim(p_actor_employee_code))
    and p.is_active and a.is_active
  limit 1;
  if v_actor is null then raise exception 'ไม่พบสิทธิ์ผู้ใช้งาน'; end if;

  if v_role='production' then
    if p_action='confirm' then
      update public.ij_tpm_jobs set
        production_status='confirmed',production_note=nullif(trim(p_note),''),
        production_proposed_date=null,production_action_by=v_actor,production_action_at=now(),
        job_status=case when manager_status in ('approved','not_required') and job_status='draft' then 'planned' else job_status end
      where coalesce(plan_group_id,id)=p_group_id;
    elsif p_action='change' then
      if coalesce(trim(p_note),'')='' then raise exception 'กรุณาระบุเหตุผลที่เสนอเลื่อน'; end if;
      update public.ij_tpm_jobs set
        production_status='change_requested',production_note=trim(p_note),
        production_proposed_date=p_proposed_date,production_action_by=v_actor,production_action_at=now(),
        job_status=case when job_status='planned' then 'draft' else job_status end
      where coalesce(plan_group_id,id)=p_group_id;
    else raise exception 'Action ของ Production ไม่ถูกต้อง';
    end if;
  elsif v_role='manager' then
    if p_action='approve' then
      update public.ij_tpm_jobs set
        manager_status='approved',manager_note=nullif(trim(p_note),''),
        manager_action_by=v_actor,manager_action_at=now(),
        job_status=case when production_status in ('confirmed','not_required') and job_status='draft' then 'planned' else job_status end
      where coalesce(plan_group_id,id)=p_group_id;
    elsif p_action='return' then
      if coalesce(trim(p_note),'')='' then raise exception 'กรุณาระบุเหตุผลที่ส่งกลับ'; end if;
      update public.ij_tpm_jobs set
        manager_status='rejected',manager_note=trim(p_note),
        manager_action_by=v_actor,manager_action_at=now(),
        job_status=case when job_status='planned' then 'draft' else job_status end
      where coalesce(plan_group_id,id)=p_group_id;
    else raise exception 'Action ของ Manager ไม่ถูกต้อง';
    end if;
  else
    raise exception 'ตำแหน่งนี้ไม่มีสิทธิ์อนุมัติในปฏิทิน';
  end if;

  if not found then raise exception 'ไม่พบแผนงาน'; end if;
end
$$;

grant execute on function public.ij_access_login(text) to anon,authenticated;
grant execute on function public.ij_access_request_status(text) to anon,authenticated;
grant execute on function public.ij_access_register(text,text,text,text) to anon,authenticated;
grant execute on function public.ij_access_assignees() to anon,authenticated;
grant execute on function public.ij_access_admin_requests(text) to anon,authenticated;
grant execute on function public.ij_access_admin_users(text) to anon,authenticated;
grant execute on function public.ij_access_admin_decide(text,uuid,boolean,text,text) to anon,authenticated;
grant execute on function public.ij_access_admin_update_user(text,uuid,text,boolean) to anon,authenticated;
grant execute on function public.ij_access_plan_decision(text,uuid,text,text,date) to anon,authenticated;
