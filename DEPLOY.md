# Deploy IJ Maintenance v14.0 to GitHub Pages

## GitHub Desktop
1. Copy every file inside `ij-system-v14.0` over the root of the existing `IJ-Maintenance` repository.
2. Do not copy or commit `node_modules` or an old `dist` folder.
3. Open GitHub Desktop and commit, for example: `IJ Maintenance v14 role login`.
4. Push origin to `main`.
5. Open GitHub → Actions and wait for `Deploy IJ Maintenance to GitHub Pages` to complete.
6. Open the Pages URL and hard refresh (`Ctrl + F5`).

## Expected first screen
The site opens at **Employee ID Login / เข้าสู่ระบบด้วยรหัสพนักงาน**.

- Existing approved employee ID → opens the workspace for that role.
- Unknown/unapproved employee ID → opens Registration → choose requested role → wait for Engineer/Admin approval.
- Engineer/Admin can approve requests from **Users & Access / ผู้ใช้งานและสิทธิ์**.

## Database
The existing MPR Supabase project used by this system already has the v14 migration installed. Do not run it again on the current project. The migration file is kept in `supabase/migrations/20261004150000_ij_employee_role_access_v14.sql` for source control and deployment to a different compatible project.

## GitHub Pages setting
Repository → Settings → Pages → Build and deployment → Source: **GitHub Actions**.

## Security note
Employee-ID-only access is intentionally lightweight for internal workflow use. It does not prove identity if another person knows an employee ID. Add PIN/OTP/Supabase Auth later if stronger authentication is required.
