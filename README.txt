StudentTrack Professional Website Update

Included: index.html, style.css, script.js.
Keep your EXISTING config.js. It must define window.SUPABASE_CONFIG with your existing Supabase project URL and publishable/anon key. Never use a service_role/secret key in frontend files.

Database columns expected (matches the current screenshots):
id, user_id, name, roll_no, department, cgpa, status, company, created_at.
No SQL migration is required by this package. Do not drop the table or existing RLS policies.

Features: Supabase login/signup/password reset, dashboard stats, add/edit/delete, search, status and CGPA eligibility filters, CSV export, responsive mobile layout.

Important eligibility note: the current database does not store company-specific minimum CGPA. This version displays eligibility using a default 7.0 CGPA threshold; this is a demonstration estimate, not official company eligibility. To persist different company criteria, the schema and UI must be migrated together.

Deployment:
1. Download/backup your current site files first.
2. In your GitHub Pages repository, replace index.html, style.css, script.js with the files in this folder.
3. Do NOT replace/delete config.js.
4. Commit changes to the branch used by GitHub Pages and wait for deployment.
5. Test login, records, add/edit/delete, filters and CSV export. If an issue occurs, restore your backup.

Password reset fix: the recovery link opens a new-password and confirm-password form. In Supabase Authentication > URL Configuration, ensure the live GitHub Pages URL is included in Redirect URLs.
