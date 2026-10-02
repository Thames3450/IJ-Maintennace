-- IJ Maintenance Unified System v12
-- Separate Defect Register from Follow-up Action Tracker and add Defect photo evidence.

alter table public.ij_tpm_findings
  add column if not exists owner_profile_id uuid references public.app_profiles(id) on delete set null,
  add column if not exists need_machine_stop boolean not null default false,
  add column if not exists verification_note text,
  add column if not exists verified_by uuid references public.app_profiles(id) on delete set null,
  add column if not exists verified_at timestamptz,
  add column if not exists action_updated_at timestamptz;

alter table public.ij_tpm_findings drop constraint if exists ij_tpm_findings_status_check;
alter table public.ij_tpm_findings
  add constraint ij_tpm_findings_status_check
  check (status in ('open','waiting_spare','waiting_machine_stop','in_progress','verification','closed'));

create index if not exists ij_tpm_findings_owner_idx on public.ij_tpm_findings(owner_profile_id);

create table if not exists public.ij_finding_attachments (
  id uuid primary key default gen_random_uuid(),
  department_id uuid not null references public.departments(id) on delete restrict,
  finding_id uuid not null references public.ij_tpm_findings(id) on delete cascade,
  machine_id uuid references public.machines(id) on delete set null,
  file_name text not null,
  storage_bucket text not null default 'ij-defect-photos',
  storage_path text not null,
  mime_type text,
  file_size bigint,
  uploaded_by uuid references public.app_profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists ij_finding_attachments_finding_idx on public.ij_finding_attachments(finding_id);
create index if not exists ij_finding_attachments_department_idx on public.ij_finding_attachments(department_id, created_at desc);

alter table public.ij_finding_attachments enable row level security;

drop policy if exists ij_finding_attachments_read on public.ij_finding_attachments;
create policy ij_finding_attachments_read on public.ij_finding_attachments
for select using (private.is_active_user() and private.can_read_department(department_id));

drop policy if exists ij_finding_attachments_insert on public.ij_finding_attachments;
create policy ij_finding_attachments_insert on public.ij_finding_attachments
for insert with check (
  private.is_active_user()
  and department_id=private.current_department_id()
  and uploaded_by=private.current_profile_id()
);

drop policy if exists ij_finding_attachments_delete on public.ij_finding_attachments;
create policy ij_finding_attachments_delete on public.ij_finding_attachments
for delete using (
  private.is_admin()
  or (private.is_active_user() and department_id=private.current_department_id() and uploaded_by=private.current_profile_id())
  or (private.is_supervisor() and department_id=private.current_department_id())
);

grant select, insert, delete on public.ij_finding_attachments to authenticated;

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('ij-defect-photos','ij-defect-photos',false,10485760,array['image/jpeg','image/png','image/webp','image/heic','image/heif'])
on conflict (id) do update
set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists ij_defect_photos_read on storage.objects;
create policy ij_defect_photos_read on storage.objects
for select to authenticated using (bucket_id='ij-defect-photos' and private.is_active_user());

drop policy if exists ij_defect_photos_insert on storage.objects;
create policy ij_defect_photos_insert on storage.objects
for insert to authenticated with check (bucket_id='ij-defect-photos' and private.is_active_user());

drop policy if exists ij_defect_photos_delete on storage.objects;
create policy ij_defect_photos_delete on storage.objects
for delete to authenticated using (bucket_id='ij-defect-photos' and private.is_active_user());
