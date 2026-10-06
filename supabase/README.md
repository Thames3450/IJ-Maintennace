# Supabase additions for IJ Unified System v4

Applied to MPR Maintenance project `hftlogubohbjiivcvkut`:

- extended `kpi_settings` targets
- extended `ij_tpm_findings` source/finding metadata
- `ij_inspection_templates`
- `ij_inspection_template_items`
- `ij_condition_inspections`
- `ij_condition_results`
- `ij_opportunities`
- source links from TPM jobs to findings/opportunities
- `ij_maintenance_timeline` security-invoker view
- RLS/grants for authenticated MPR users
- seeded `Injection Basic Condition Check`

These changes are additive and use the existing MPR machine/department/profile masters.

## v13.11 (4 October 2026)

Applied `20261004104312_ij_tpm_followup_and_confirmed_deletion.sql` to the existing project. It adds SECURITY INVOKER transactional TPM start/finish and direct follow-up closeout, verification/attempt fields, and an IJ-scoped RLS deletion marker table. Existing records are not backfilled, closed, or deleted by installing it. Markers hide records in this IJ frontend while retaining source records and photo objects; they do not alter external MPR lists. The frontend must be updated too. Other compatible projects should apply this once after the PM migration.

## v14.1 — pending deployment

20261004161427_ij_employee_sessions_and_permissions.sql is included but NOT applied to the live project. Deploy the matching frontend and then apply this SQL once as described in the root README. Old frontend clients stop working after enforcement. Local PostgreSQL permission tests pass; production Storage/session integration remains to be checked during rollout.
