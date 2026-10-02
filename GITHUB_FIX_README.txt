IJ Maintenance v13.1 - GitHub Pages build fix

Problem fixed:
  sh: 1: vite: Permission denied

Cause:
  node_modules created on Windows was tracked in Git and then reused on GitHub's Linux runner.

Recommended:
  1) Copy all v13.1 files over your repository folder.
  2) Double-click FIX_GITHUB_BUILD.cmd
  3) Wait for GitHub Actions.

Or use GitHub Desktop after running:
  git rm -r --cached node_modules

The new .gitignore prevents node_modules from being committed again.
The new workflow deletes any old node_modules, installs dependencies on Ubuntu,
and runs Vite via Node directly.
