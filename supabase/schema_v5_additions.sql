-- IJ Maintenance Unified System v5 additions
-- Apply only if your MPR database does not already contain these changes.

-- Supervisor can update spare requests for their own department.
drop policy if exists ij_spare_supervisor_update on public.spare_requests;
create policy ij_spare_supervisor_update on public.spare_requests
for update using (
  private.is_supervisor()
  and department_id = private.current_department_id()
) with check (
  private.is_supervisor()
  and department_id = private.current_department_id()
);

-- Supervisor can create requests as themselves.
drop policy if exists ij_spare_supervisor_insert on public.spare_requests;
create policy ij_spare_supervisor_insert on public.spare_requests
for insert with check (
  private.is_supervisor()
  and department_id = private.current_department_id()
  and requester_profile_id = private.current_profile_id()
);
