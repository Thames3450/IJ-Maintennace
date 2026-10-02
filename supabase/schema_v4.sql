-- IJ Maintenance Unified System v4
-- Reference migration for MPR Maintenance. The live project has already been migrated.

alter table public.kpi_settings
  add column if not exists target_mtbf_hr numeric,
  add column if not exists target_mttr_min numeric,
  add column if not exists target_tpm_completion numeric,
  add column if not exists target_pm_compliance numeric,
  add column if not exists target_defect_closure numeric,
  add column if not exists target_repeat_failure_pct numeric;

alter table public.ij_tpm_findings
  add column if not exists source_type text not null default 'manual',
  add column if not exists source_inspection_id uuid,
  add column if not exists finding_type text not null default 'defect',
  add column if not exists recommendation text;

create table if not exists public.ij_inspection_templates (
  id uuid primary key default gen_random_uuid(), department_id uuid not null references public.departments(id),
  name text not null, equipment_type text, frequency_days integer not null default 7,
  is_active boolean not null default true, created_by uuid references public.app_profiles(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.ij_inspection_template_items (
  id uuid primary key default gen_random_uuid(), template_id uuid not null references public.ij_inspection_templates(id) on delete cascade,
  zone_code text, component_code text, item_name text not null, inspection_method text,
  value_type text not null default 'status', unit text, min_value numeric, max_value numeric,
  criticality text not null default 'B', requires_photo_on_ng boolean not null default false,
  sort_order integer not null default 0, is_active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.ij_condition_inspections (
  id uuid primary key default gen_random_uuid(), department_id uuid not null references public.departments(id),
  machine_id uuid not null references public.machines(id), template_id uuid references public.ij_inspection_templates(id),
  inspection_date date not null default ((now() at time zone 'Asia/Bangkok'))::date,
  started_at timestamptz, completed_at timestamptz, inspector_profile_id uuid references public.app_profiles(id),
  inspector_name_snapshot text, shift text, overall_status text not null default 'draft', condition_score numeric,
  note text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.ij_condition_results (
  id uuid primary key default gen_random_uuid(), inspection_id uuid not null references public.ij_condition_inspections(id) on delete cascade,
  template_item_id uuid references public.ij_inspection_template_items(id), zone_code text, component_code text,
  item_name_snapshot text not null, result_status text not null default 'normal', numeric_value numeric,
  text_value text, unit text, note text, finding_id uuid references public.ij_tpm_findings(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.ij_opportunities (
  id uuid primary key default gen_random_uuid(), department_id uuid not null references public.departments(id),
  machine_id uuid references public.machines(id), source_type text not null default 'manual', source_id uuid,
  category text not null default 'improvement', title text not null, details text, expected_benefit text,
  priority text not null default 'B', status text not null default 'open', owner_profile_id uuid references public.app_profiles(id),
  target_date date, converted_job_id uuid references public.ij_tpm_jobs(id), created_by uuid references public.app_profiles(id),
  completed_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

alter table public.ij_tpm_jobs
  add column if not exists source_finding_id uuid references public.ij_tpm_findings(id) on delete set null,
  add column if not exists source_opportunity_id uuid references public.ij_opportunities(id) on delete set null;

-- RLS/policies and the security-invoker `ij_maintenance_timeline` view are also installed in the live MPR project.
-- See README for the applied architecture.
