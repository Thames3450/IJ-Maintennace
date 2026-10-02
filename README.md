# IJ Maintenance Unified System v13.0 — No Login

React + Vite maintenance system for IJ Department using the existing MPR Maintenance Supabase database.

## v13 change
- Removed the Login page completely.
- Opening the site goes directly to Main Menu.
- Uses the Supabase publishable key with IJ-scoped anonymous RLS policies.
- No Admin password, service-role key, or private credential is stored in the frontend.
- GitHub Pages workflow is included in `.github/workflows/deploy-pages.yml`.

## Run locally
```bash
npm install
npm run dev
```
Open `http://localhost:5173`.

## Build
```bash
npm run build
```

## Important security note
No Login means possession of the published GitHub Pages URL is effectively access to this IJ web application. The v13 Supabase policies intentionally permit the anonymous web role to read/write the IJ maintenance module. Do not publish this URL broadly or use this mode if the system later needs multiple users or confidential access control.


## v13.3 branding
- Replaced the web/app icon with the new pastel-blue IJ gear and wrench logo.
- Transparent browser/favicon artwork with no white border.
- Sidebar and startup screen now use the same IJ logo.
