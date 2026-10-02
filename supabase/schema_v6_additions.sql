-- IJ Maintenance Unified System v11.2
-- Add photo attachments for condition inspection abnormalities.

create table if not exists public.ij_condition_result_attachments (
  id uuid primary key default gen_random_uuid(),
  result_id uuid not null references public.ij_condition_results(id) on delete cascade,
  inspection_id uuid not null references public.ij_condition_inspections(id) on delete cascade,
  machine_id uuid references public.machines(id) on delete set null,
  file_name text not null,
  storage_bucket text not null default 'ij-inspection-photos',
  storage_path text not null,
  public_url text,
  mime_type text,
  file_size bigint,
  uploaded_by uuid references public.app_profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_ij_condition_result_attachments_result_id
  on public.ij_condition_result_attachments(result_id);

create index if not exists idx_ij_condition_result_attachments_inspection_id
  on public.ij_condition_result_attachments(inspection_id);

-- Storage bucket to create in Supabase Storage:
--   name: ij-inspection-photos
--   public: true (recommended for fast preview in the web app)
