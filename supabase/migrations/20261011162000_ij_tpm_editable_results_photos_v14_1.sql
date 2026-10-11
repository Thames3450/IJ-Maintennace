-- IJ Maintenance v14.1
-- Editable TPM work results and photo evidence per TPM job.

create table if not exists public.ij_tpm_job_attachments (
  id uuid primary key default gen_random_uuid(),
  department_id uuid not null references public.departments(id) on delete restrict,
  job_id uuid not null references public.ij_tpm_jobs(id) on delete cascade,
  machine_id uuid references public.machines(id) on delete set null,
  photo_type text not null default 'additional' check (photo_type in ('before','after','additional')),
  caption text,
  file_name text not null,
  storage_bucket text not null default 'ij-tpm-photos',
  storage_path text not null,
  mime_type text,
  file_size bigint,
  uploaded_by uuid references public.app_profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists ij_tpm_job_attachments_job_idx
  on public.ij_tpm_job_attachments(job_id,created_at,id);
create index if not exists ij_tpm_job_attachments_machine_idx
  on public.ij_tpm_job_attachments(machine_id,created_at desc);

alter table public.ij_tpm_job_attachments enable row level security;
grant select,insert,delete on public.ij_tpm_job_attachments to anon,authenticated;

drop policy if exists ij_web_tpm_attachments_read on public.ij_tpm_job_attachments;
create policy ij_web_tpm_attachments_read on public.ij_tpm_job_attachments
for select to anon using (
  exists(select 1 from public.ij_tpm_jobs j
    where j.id=job_id and j.department_id='4b29bf28-2fac-4c31-9962-cd7dc8fc82f3'::uuid)
);

drop policy if exists ij_web_tpm_attachments_insert on public.ij_tpm_job_attachments;
create policy ij_web_tpm_attachments_insert on public.ij_tpm_job_attachments
for insert to anon with check (
  exists(select 1 from public.ij_tpm_jobs j
    where j.id=job_id and j.department_id='4b29bf28-2fac-4c31-9962-cd7dc8fc82f3'::uuid)
);

drop policy if exists ij_web_tpm_attachments_delete on public.ij_tpm_job_attachments;
create policy ij_web_tpm_attachments_delete on public.ij_tpm_job_attachments
for delete to anon using (
  exists(select 1 from public.ij_tpm_jobs j
    where j.id=job_id and j.department_id='4b29bf28-2fac-4c31-9962-cd7dc8fc82f3'::uuid)
);

drop policy if exists ij_tpm_attachments_read on public.ij_tpm_job_attachments;
create policy ij_tpm_attachments_read on public.ij_tpm_job_attachments
for select to authenticated using (
  exists(select 1 from public.ij_tpm_jobs j
    where j.id=job_id and private.is_active_user() and private.can_read_department(j.department_id))
);

drop policy if exists ij_tpm_attachments_write on public.ij_tpm_job_attachments;
create policy ij_tpm_attachments_write on public.ij_tpm_job_attachments
for insert to authenticated with check (
  exists(select 1 from public.ij_tpm_jobs j
    where j.id=job_id and private.is_active_user() and private.can_read_department(j.department_id))
);

drop policy if exists ij_tpm_attachments_delete on public.ij_tpm_job_attachments;
create policy ij_tpm_attachments_delete on public.ij_tpm_job_attachments
for delete to authenticated using (
  exists(select 1 from public.ij_tpm_jobs j
    where j.id=job_id and private.is_active_user() and private.can_read_department(j.department_id))
);

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values(
  'ij-tpm-photos','ij-tpm-photos',false,10485760,
  array['image/jpeg','image/png','image/webp','image/heic','image/heif']::text[]
)
on conflict(id) do update set
  public=false,
  file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists ij_web_tpm_photos_read on storage.objects;
create policy ij_web_tpm_photos_read on storage.objects
for select to anon using (bucket_id='ij-tpm-photos');

drop policy if exists ij_web_tpm_photos_insert on storage.objects;
create policy ij_web_tpm_photos_insert on storage.objects
for insert to anon with check (bucket_id='ij-tpm-photos');

drop policy if exists ij_web_tpm_photos_delete on storage.objects;
create policy ij_web_tpm_photos_delete on storage.objects
for delete to anon using (bucket_id='ij-tpm-photos');

drop policy if exists ij_tpm_photos_read on storage.objects;
create policy ij_tpm_photos_read on storage.objects
for select to authenticated using (bucket_id='ij-tpm-photos' and private.is_active_user());

drop policy if exists ij_tpm_photos_insert on storage.objects;
create policy ij_tpm_photos_insert on storage.objects
for insert to authenticated with check (bucket_id='ij-tpm-photos' and private.is_active_user());

drop policy if exists ij_tpm_photos_delete on storage.objects;
create policy ij_tpm_photos_delete on storage.objects
for delete to authenticated using (bucket_id='ij-tpm-photos' and private.is_active_user());
