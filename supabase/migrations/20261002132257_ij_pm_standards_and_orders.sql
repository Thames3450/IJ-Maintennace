-- Independent IJ PM. Additive: does not change MPR PM or TPM tables/triggers.
-- Existing IJ no-login access is retained and limited to the IJ department.
create table public.ij_pm_standards (
 id uuid primary key default gen_random_uuid(),
 department_id uuid not null references public.departments(id),
 machine_id uuid references public.machines(id),
 code text not null check(length(btrim(code))>0),
 title text not null check(length(btrim(title))>0),
 revision integer not null default 1 check(revision>0),
 frequency text not null check(frequency in ('weekly','monthly','quarterly','semiannual','annual')),
 std_minutes integer not null default 0 check(std_minutes>=0),
 machine_scope text not null default '', reference text not null default '',
 prepared_by_name text not null default '', reviewer_name text not null default '',
 instructions text not null default '', need_machine_stop boolean not null default true,
 status text not null default 'draft' check(status in ('draft','approved')),
 items jsonb not null check(jsonb_typeof(items)='array' and jsonb_array_length(items)>0),
 approved_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(department_id,code,revision)
);
create index ij_pm_standards_machine_idx on public.ij_pm_standards(machine_id);
create table public.ij_pm_orders (
 id uuid primary key default gen_random_uuid(),
 department_id uuid not null references public.departments(id),
 machine_id uuid not null references public.machines(id),
 standard_id uuid not null references public.ij_pm_standards(id),
 standard_snapshot jsonb not null default '{}'::jsonb,
 machine_no_snapshot text not null default '', machine_name_snapshot text not null default '',
 due_date date not null,
 status text not null default 'planned' check(status in ('planned','in_progress','completed')),
 results jsonb not null default '[]'::jsonb check(jsonb_typeof(results)='array'),
 performed_by_name text not null default '', stop_minutes integer not null default 0 check(stop_minutes>=0),
 result_summary text not null default '', parts_used text not null default '', verification_note text not null default '',
 safety_confirmed boolean not null default false,
 overall_result text check(overall_result in ('normal','corrected','issue')),
 started_at timestamptz, completed_at timestamptz, completion_attempt_id uuid,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(standard_id,machine_id,due_date)
);
create index ij_pm_orders_department_due_idx on public.ij_pm_orders(department_id,due_date,id);
create index ij_pm_orders_machine_due_idx on public.ij_pm_orders(machine_id,due_date);

alter table public.ij_pm_standards enable row level security;
alter table public.ij_pm_orders enable row level security;
grant select,insert,update on public.ij_pm_standards,public.ij_pm_orders to anon;
-- Do not grant DELETE: accepted standards and completed work are permanent records.
create policy ij_pm_standards_read on public.ij_pm_standards for select to anon
 using(department_id in (select id from public.departments where dept_code='IJ'));
create policy ij_pm_standards_insert on public.ij_pm_standards for insert to anon
 with check(department_id in (select id from public.departments where dept_code='IJ'));
create policy ij_pm_standards_update on public.ij_pm_standards for update to anon
 using(department_id in (select id from public.departments where dept_code='IJ'))
 with check(department_id in (select id from public.departments where dept_code='IJ'));
create policy ij_pm_orders_read on public.ij_pm_orders for select to anon
 using(department_id in (select id from public.departments where dept_code='IJ'));
create policy ij_pm_orders_insert on public.ij_pm_orders for insert to anon
 with check(department_id in (select id from public.departments where dept_code='IJ'));
create policy ij_pm_orders_update on public.ij_pm_orders for update to anon
 using(department_id in (select id from public.departments where dept_code='IJ'))
 with check(department_id in (select id from public.departments where dept_code='IJ'));

create function public.ij_pm_validate_standard() returns trigger
language plpgsql security invoker set search_path='' as $$
declare item jsonb; min_v numeric; max_v numeric;
begin
 if tg_op='UPDATE' then
  if old.status='approved' then raise exception 'Approved standard is read-only; create a new revision'; end if;
  if new.id<>old.id or new.department_id<>old.department_id then raise exception 'Standard identity is read-only'; end if;
 end if;
 if not exists(select 1 from public.departments where id=new.department_id and dept_code='IJ') then raise exception 'PM is limited to IJ'; end if;
 if new.machine_id is not null and not exists(select 1 from public.machines where id=new.machine_id and department_id=new.department_id and is_active) then raise exception 'Machine is outside standard department'; end if;
 if new.items is null or jsonb_typeof(new.items)<>'array' or jsonb_array_length(new.items)=0 then raise exception 'Standard must contain checklist items'; end if;
 if (select count(*) from jsonb_array_elements(new.items))<>(select count(distinct x->>'id') from jsonb_array_elements(new.items) x) then raise exception 'Duplicate or missing item IDs'; end if;
 for item in select value from jsonb_array_elements(new.items) loop
  if coalesce(btrim(item->>'id'),'')='' or coalesce(btrim(item->>'name'),'')='' or coalesce(btrim(item->>'method'),'')='' or coalesce(btrim(item->>'criterion'),'')='' then raise exception 'Item name, method and acceptance criterion are required'; end if;
  if coalesce(item->>'type','') not in ('check','measurement') then raise exception 'Invalid item type'; end if;
  if item->>'type'='measurement' then
   min_v:=nullif(item->>'min_value','')::numeric; max_v:=nullif(item->>'max_value','')::numeric;
   if coalesce(btrim(item->>'unit'),'')='' or min_v is null or max_v is null or min_v>max_v or min_v::text in ('NaN','Infinity','-Infinity') or max_v::text in ('NaN','Infinity','-Infinity') then raise exception 'Measurement unit and valid manufacturer limits are required'; end if;
  end if;
 end loop;
 if new.status='approved' then
  if btrim(new.reference)='' or btrim(new.machine_scope)='' or btrim(new.prepared_by_name)='' or btrim(new.reviewer_name)='' then raise exception 'Model scope, reference, preparer and reviewer are required before approval'; end if;
  if new.std_minutes<=0 then raise exception 'Approved standard requires positive target minutes';end if;
  new.approved_at:=now();
 else new.approved_at:=null; end if;
 new.updated_at:=now(); return new;
end $$;
create trigger ij_pm_validate_standard before insert or update on public.ij_pm_standards for each row execute function public.ij_pm_validate_standard();

create function public.ij_pm_validate_order() returns trigger
language plpgsql security invoker set search_path='' as $$
declare s public.ij_pm_standards; m public.machines; item jsonb; r jsonb; v numeric; total integer; count_real integer:=0; has_issue boolean:=false; has_corrected boolean:=false;
begin
 if tg_op='INSERT' then
  select * into s from public.ij_pm_standards where id=new.standard_id;
  select * into m from public.machines where id=new.machine_id;
  if s.id is null or s.status<>'approved' then raise exception 'Use an approved PM standard'; end if;
  if m.id is null or not m.is_active or m.department_id<>s.department_id or new.department_id<>s.department_id or (s.machine_id is not null and s.machine_id<>m.id) then raise exception 'Machine is outside standard scope'; end if;
  if new.status<>'planned' then raise exception 'New PM must start as planned'; end if;
  new.standard_snapshot:=to_jsonb(s); new.machine_no_snapshot:=m.machine_no; new.machine_name_snapshot:=coalesce(m.machine_name,'');
  new.results:='[]'::jsonb; new.started_at:=null; new.completed_at:=null; new.overall_result:=null; new.completion_attempt_id:=null;
 else
  if old.status='completed' then raise exception 'Completed PM is read-only'; end if;
  if new.id<>old.id or new.department_id<>old.department_id or new.machine_id<>old.machine_id or new.standard_id<>old.standard_id or new.due_date<>old.due_date or new.standard_snapshot is distinct from old.standard_snapshot or new.machine_no_snapshot<>old.machine_no_snapshot or new.machine_name_snapshot<>old.machine_name_snapshot then raise exception 'PM planning fields and standard snapshot are read-only'; end if;
  if old.status='in_progress' and new.status='planned' then raise exception 'Started PM cannot return to planned'; end if;
  new.started_at:=case when new.status in ('in_progress','completed') then coalesce(old.started_at,now()) else null end;
  if new.status<>'completed' then new.completed_at:=null;new.overall_result:=null;new.completion_attempt_id:=null;end if;
 end if;
 if jsonb_typeof(new.results)<>'array' then raise exception 'Results must be an array'; end if;
 if (select count(*) from jsonb_array_elements(new.results))<>(select count(distinct x->>'item_id') from jsonb_array_elements(new.results) x) then raise exception 'Duplicate or missing result IDs'; end if;
 if exists(select 1 from jsonb_array_elements(new.results) x where not exists(select 1 from jsonb_array_elements(new.standard_snapshot->'items') y where y->>'id'=x->>'item_id')) then raise exception 'Result is outside PM standard'; end if;
 if new.status='completed' then
  total:=jsonb_array_length(new.standard_snapshot->'items');
  if total=0 or jsonb_array_length(new.results)<>total then raise exception 'Complete every checklist item'; end if;
  for item in select value from jsonb_array_elements(new.standard_snapshot->'items') loop
   select value into r from jsonb_array_elements(new.results) where value->>'item_id'=item->>'id';
   if coalesce(r->>'result','') not in ('normal','corrected','abnormal','na') then raise exception 'Complete every checklist result'; end if;
   if r->>'result'<>'na' then count_real:=count_real+1;end if;
   if r->>'result' in ('corrected','abnormal','na') and coalesce(btrim(r->>'note'),'')='' then raise exception 'Explain abnormal, corrected and N/A items'; end if;
   if item->>'type'='measurement' and r->>'result'<>'na' then
    v:=nullif(r->>'measured_value','')::numeric;
    if v is null or v::text in ('NaN','Infinity','-Infinity') then raise exception 'Record actual measurement'; end if;
    if r->>'result' in ('normal','corrected') and (v<(item->>'min_value')::numeric or v>(item->>'max_value')::numeric) then raise exception 'Measurement outside limits must be abnormal'; end if;
   end if;
   has_issue:=has_issue or r->>'result'='abnormal';has_corrected:=has_corrected or r->>'result'='corrected';
  end loop;
  if count_real=0 then raise exception 'Cannot complete an all-N/A PM'; end if;
  if btrim(new.performed_by_name)='' or btrim(new.result_summary)='' or btrim(new.verification_note)='' or not new.safety_confirmed or new.completion_attempt_id is null then raise exception 'Technician, actual work, verification and handover confirmation are required'; end if;
  new.overall_result:=case when has_issue then 'issue' when has_corrected then 'corrected' else 'normal' end;
  new.completed_at:=now();
 end if;
 new.updated_at:=now();return new;
end $$;
create trigger ij_pm_validate_order before insert or update on public.ij_pm_orders for each row execute function public.ij_pm_validate_order();

create function public.ij_pm_save_standard(p_standard jsonb) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare s public.ij_pm_standards; existing public.ij_pm_standards;
begin
 s:=jsonb_populate_record(null::public.ij_pm_standards,p_standard);
 select * into existing from public.ij_pm_standards where id=s.id for update;
 if found and existing.status='approved' then
  if (to_jsonb(existing)-array['approved_at','created_at','updated_at'])=(to_jsonb(s)-array['approved_at','created_at','updated_at']) then return jsonb_build_object('id',existing.id); end if;
  raise exception 'Approved standard is read-only; create a new revision';
 end if;
 insert into public.ij_pm_standards(id,department_id,machine_id,code,title,revision,frequency,std_minutes,machine_scope,reference,prepared_by_name,reviewer_name,instructions,need_machine_stop,status,items)
 values(s.id,s.department_id,s.machine_id,btrim(s.code),btrim(s.title),s.revision,s.frequency,s.std_minutes,s.machine_scope,s.reference,s.prepared_by_name,s.reviewer_name,s.instructions,s.need_machine_stop,s.status,s.items)
 on conflict(id) do update set code=excluded.code,title=excluded.title,revision=excluded.revision,frequency=excluded.frequency,std_minutes=excluded.std_minutes,machine_id=excluded.machine_id,machine_scope=excluded.machine_scope,reference=excluded.reference,prepared_by_name=excluded.prepared_by_name,reviewer_name=excluded.reviewer_name,instructions=excluded.instructions,need_machine_stop=excluded.need_machine_stop,status=excluded.status,items=excluded.items
 returning * into s;
 return jsonb_build_object('id',s.id);
end $$;

create function public.ij_pm_create_order(p_order jsonb) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare s public.ij_pm_standards; o public.ij_pm_orders; wanted_id uuid; wanted_date date; wanted_machine uuid;
begin
 if coalesce((p_order->>'scope_confirmed')::boolean,false) is not true then raise exception 'Confirm machine model matches standard scope'; end if;
 wanted_id:=(p_order->>'id')::uuid;wanted_date:=(p_order->>'due_date')::date;wanted_machine:=(p_order->>'machine_id')::uuid;
 select * into s from public.ij_pm_standards where id=(p_order->>'standard_id')::uuid;
 if not found or s.status<>'approved' then raise exception 'Use an approved PM standard';end if;
 select * into o from public.ij_pm_orders where id=wanted_id;
 if found then
  if o.standard_id=s.id and o.machine_id=wanted_machine and o.due_date=wanted_date then return jsonb_build_object('id',o.id);end if;
  raise exception 'PM request identity conflict';
 end if;
 insert into public.ij_pm_orders(id,department_id,machine_id,standard_id,due_date)
 values(wanted_id,s.department_id,wanted_machine,s.id,wanted_date) returning * into o;
 return jsonb_build_object('id',o.id);
end $$;

create function public.ij_pm_start_order(p_order_id uuid) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare o public.ij_pm_orders;
begin
 select * into o from public.ij_pm_orders where id=p_order_id for update;
 if not found then raise exception 'PM order not found or inaccessible';end if;
 if o.status='completed' then raise exception 'Completed PM is read-only';end if;
 if o.status='planned' then update public.ij_pm_orders set status='in_progress' where id=o.id returning * into o;end if;
 return to_jsonb(o);
end $$;

create function public.ij_pm_save_result(p_order_id uuid,p_result jsonb,p_complete boolean default false) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare o public.ij_pm_orders; next_date date; next_id uuid; attempt uuid;
begin
 select * into o from public.ij_pm_orders where id=p_order_id for update;
 if not found then raise exception 'PM order not found or inaccessible'; end if;
 attempt:=(p_result->>'attempt_id')::uuid;
 if o.status='completed' then
  if p_complete and o.completion_attempt_id=attempt then return jsonb_build_object('id',o.id,'status',o.status); end if;
  raise exception 'Completed PM is read-only';
 end if;
 update public.ij_pm_orders set status=case when p_complete then 'completed' else 'in_progress' end,
 results=p_result->'results',performed_by_name=coalesce(p_result->>'performed_by_name',''),stop_minutes=(p_result->>'stop_minutes')::integer,
 result_summary=coalesce(p_result->>'result_summary',''),parts_used=coalesce(p_result->>'parts_used',''),verification_note=coalesce(p_result->>'verification_note',''),
 safety_confirmed=coalesce((p_result->>'safety_confirmed')::boolean,false),completion_attempt_id=case when p_complete then attempt else null end
 where id=o.id returning * into o;
 if p_complete and coalesce((p_result->>'generate_next')::boolean,false) then
  next_date:=(o.due_date+case o.standard_snapshot->>'frequency' when 'weekly' then interval '7 days' when 'monthly' then interval '1 month' when 'quarterly' then interval '3 months' when 'semiannual' then interval '6 months' when 'annual' then interval '1 year' end)::date;
  insert into public.ij_pm_orders(department_id,machine_id,standard_id,due_date)
  values(o.department_id,o.machine_id,o.standard_id,next_date)
  on conflict(standard_id,machine_id,due_date) do nothing returning id into next_id;
 end if;
 return jsonb_build_object('id',o.id,'status',o.status,'next_order_id',next_id);
end $$;

revoke all on function public.ij_pm_validate_standard(),public.ij_pm_validate_order() from public;
revoke all on function public.ij_pm_save_standard(jsonb),public.ij_pm_create_order(jsonb),public.ij_pm_start_order(uuid),public.ij_pm_save_result(uuid,jsonb,boolean) from public;
grant execute on function public.ij_pm_save_standard(jsonb),public.ij_pm_create_order(jsonb),public.ij_pm_start_order(uuid),public.ij_pm_save_result(uuid,jsonb,boolean) to anon;
