# Deploy v13.5 to GitHub Pages

This build does not have a login page.

## GitHub Desktop
1. Copy all files from this project over the existing repository files.
2. Open GitHub Desktop.
3. Commit with a message such as `IJ Maintenance v13 no login`.
4. Click **Push origin**.
5. In GitHub, open **Actions** and wait for `Deploy IJ Maintenance to GitHub Pages` to finish.
6. Open the Pages URL and hard refresh with `Ctrl + F5`.

The site should open directly to **Main Menu**. There should be no Sign in screen.

## GitHub Pages setting
Repository → Settings → Pages → Build and deployment → Source: **GitHub Actions**.

## Security
This is intentional no-login mode. Anyone who can reach the Pages URL can use the IJ web app under the IJ-scoped public database policies.


## v13.5 branding
- Replaced the web/app icon with the new pastel-blue IJ gear and wrench logo.
- Transparent browser/favicon artwork with no white border.
- Sidebar and startup screen now use the same IJ logo.
