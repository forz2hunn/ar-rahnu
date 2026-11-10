# User management setup

The user-management module relies on Supabase Auth, organization membership policies, and a server-side Edge Function. Do not put the Supabase service-role key in the browser or in `.env.local`.

## Deploy the database changes

1. Open `schema.sql` in the Supabase SQL Editor and run the complete script.
2. The script creates organization and membership tables, adds organization-scoped row-level security, and leaves each Staff member's data private.
3. Admin and Manager accounts share the organization's portfolio. The existing account's `ar_rahnu_user_data` row is attached to the organization during first-admin bootstrap.

### Fix a missing `active` membership column

If the app reports `column ar_rahnu_organization_members.active does not exist`, open the SQL Editor for project `zyikvjbnroicbeezpxvx` and run `fix-missing-membership-active.sql`. The migration adds the column without changing existing membership roles, marks existing memberships active, refreshes the PostgREST schema cache, and returns a row confirming the column exists. Then reload the app and sign in again.

## Deploy the secure admin function

Deploy `functions/user-admin/index.ts` as the `user-admin` Supabase Edge Function. With the Supabase CLI installed, logged in (`supabase login`), and linked to this project, run:

```powershell
supabase link --project-ref zyikvjbnroicbeezpxvx
supabase functions deploy user-admin
```

If the first-admin bootstrap secrets have not already been set, set `BOOTSTRAP_ADMIN_EMAIL` to the email address of the existing account that should become the first Admin and configure `ORGANIZATION_NAME`. Supabase supplies `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` to Edge Functions. Keep the service-role key server-side.

Sign in to the app with that account after the schema and function are deployed. The first successful bootstrap creates the organization, assigns the Admin role, and migrates that account's existing portfolio row. Bootstrap is restricted to the configured email and only succeeds while no organization exists.

## Auth settings

- Disable public sign-ups in Supabase Auth settings. Admins create accounts directly from the Pengurusan Pengguna module by entering the user's email and an initial password of at least 12 characters. The email is confirmed by the Admin-created account; no invitation email is sent. Share the initial password with the user through a secure channel and ask them to change it after signing in.
- Add the deployed app URL to Supabase Auth's allowed redirect URLs so password-reset links return to the app.
- Configure Supabase Auth email/SMTP delivery for password-reset messages.
- Set the Auth email OTP/link expiry to `86400` seconds (24 hours) in the Supabase project's Auth email settings for password recovery.
- Admins can edit a member's email or set a new password from the member list. Passwords are sent only to the server-side Edge Function and are never stored in the browser database.

## Roles

- **Admin:** create user accounts with an initial password, edit member email/password, manage roles and membership, send password-reset emails, and access the shared organization portfolio.
- **Manager:** access and manage the shared organization portfolio, view the organization user list, and permanently delete non-Admin user accounts. Managers cannot invite users, change roles or access, send password-reset emails, or delete Admin accounts.
- **Staff:** access only their personal portfolio.

Deleting a user permanently deletes their Supabase Auth account. Related organization membership and user portfolio data are removed through the database foreign-key cascades. The action cannot be undone. Users cannot delete their own account or the last active Admin. An Admin deleting the organization creator takes over organization ownership first; Managers cannot delete Admin accounts. Deploy the updated `user-admin` Edge Function for account creation and the latest deletion behavior to take effect.
