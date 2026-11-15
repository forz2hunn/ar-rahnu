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
- The user list is linked to the member profile: each row shows the member's **profile photo** (the same image resolved for the Keahlian Ahli directory — from `avatar_photo_path` or the member's storage folder), the **full name** and **No. Keahlian** from the member registry, with the account email beneath. The search box matches name, email and membership number. The **user icon** in the actions column opens the same read-only profile viewer used in Keahlian Ahli (Butiran Peribadi & Alamat, Waris, Akaun Bank, PDPA), so an account can be inspected without leaving Pengurusan Pengguna. When a member has no photo, the initials tile coloured by role is shown instead.

## Roles

- **Admin:** create user accounts with an initial password, edit member email/password, manage roles and membership, send password-reset emails, and access the shared organization portfolio.
- **Manager:** access and manage the shared organization portfolio, view the organization user list, and permanently delete non-Admin user accounts. Managers cannot invite users, change roles or access, send password-reset emails, or delete Admin accounts.
- **Staff:** access only their personal portfolio.

## Member directory (Admin only)

The **Keahlian Ahli** menu is visible only to accounts with the `Admin` role. It stores the official member identity and the unique membership number for every organization member.

- **Name and IC number** are editable only in this module, so customers cannot change them from the self-service profile. The profile panel shows both fields as locked and points customers to customer service instead.
- **No. Keahlian** is generated as `ARK-<year>-<4-digit sequence>` (for example `ARK-2026-0001`). The generator reads every number already in use, so generated numbers never collide; the module also rejects a manually entered number that another member already owns and rejects a duplicated 12-digit IC.
- Data is stored in the organization portfolio row (`ar_rahnu_user_data.data.memberRegistry`) as `{ userId, fullName, icNumber, memberNo, updatedAt, address?, phone?, heirName?, poBox? }`. Because it lives in the shared organization record, every Admin and Manager sees the same directory after a reload or realtime update, and it is covered by the existing organization-scoped row-level security.
- The directory merges two sources: the account list returned by the `user-admin` function and the stored registry. If the account list cannot be loaded (function error, network, or a member account that `getUserById` fails to return), the rows are still displayed from the stored registry and marked **Akaun tidak dimuatkan**, so records never disappear from the screen.
- The `list` action also returns `fullName`, `icNumber` and `memberNo` from each member's `user_metadata`. When the stored registry is empty or partial, the app fills the missing fields from that profile automatically and saves the repaired registry back to the portfolio. This is why a member whose profile is complete is never lost from the directory. The same action now also returns `phone`, `addressLine`, `city`, `postcode`, `state`, `heirName`, `heirRelationship` and `heirPhone`, which the Surat Akuan Gadaian form uses so a new letter is pre-filled from the member's own profile.
- Use **Jana Semua No. Keahlian** to assign numbers to every member that does not have one yet. Members without a name or IC are listed as "Belum diisi"/"-" so they can be completed one by one.
- **Profile photos** are owned by the member's own *Profil Saya → Butiran Peribadi & Alamat*. The member directory displays that photo (avatar in the table and preview in the edit dialog) and never overrides it. The directory resolves each member's photo from the storage folder `<uid>/avatar/` in the private `ar-rahnu-profile-photos` bucket, so an existing photo is shown even when the message `avatar_photo_path` was never written; the newest file in the folder wins and the result is cached for the session. The signed-in member's own photo is also read from the session metadata and mirrored into `memberRegistry.photoPath`, and the `list` action returns `avatarPhotoPath` once the function is deployed. When a member has no photo at all, the edit dialog shows **Tambah Gambar Profil** so an Admin can upload one; the file goes to the member's avatar folder and `update-member-photo` writes `avatar_photo_path` into the member's metadata, which makes it appear in the member's own profile too. Run [`profile-photos.sql`](./profile-photos.sql) so organization Admins/Managers can read and manage their members' avatar folders — without that policy the folder scan reports **Tidak dapat dibaca**.
- **Semak Gambar Profil** (Admin only, directory toolbar) scans every member folder in the photo bucket and reports one of: `Ada gambar` (file and metadata match), `Storan sahaja` (file exists, metadata empty — the photo is still displayed), `Fail tiada` (metadata points to a removed file), `Tiada fail`, or `Tidak dapat dibaca` (storage policy blocks the read). Use it to answer "did this member ever upload a photo?" without SQL access.
- **View a member's profile (Admin only).** Select a member from the "Pilih ahli untuk lihat profil..." dropdown in the directory toolbar (or press **Profil** on a row) to open a read-only view of that member's *Butiran Peribadi & Alamat*, heir, bank and PDPA data, plus their profile photo. The data comes from the `get-member-profile` action of the `user-admin` Edge Function, which rejects non-Admin callers, returns only members of the caller's organization, masks nothing else on the server, and writes a `VIEW_MEMBER_PROFILE` audit event. The bank account number is masked in the UI (last four digits only). The dialog's **Kemaskini Maklumat Ahli** button opens the normal member edit dialog.
- To confirm whether a member ever uploaded a photo (metadata path and the actual file), run [`check-member-photos.sql`](./check-member-photos.sql) in the Supabase SQL Editor. It lists every organization member with `avatar_photo_path`, whether the file exists in the bucket, how many files sit in that member's folder, plus a storage-vs-metadata summary and the storage policies currently installed.
- The IC is masked in the table (`900101-14-****`, only the last four digits are hidden) and only shown in full inside the edit dialog.
- Saving a member calls the `update-member-profile` action of the `user-admin` Edge Function. That action writes `full_name`, `ic_number`, `member_no`, `identity_locked`, and `identity_updated_at` into the member's `user_metadata`, so the member's own profile shows the official name, IC, and membership number. Adding a missing photo calls `update-member-photo`, which writes `avatar_photo_path` into the same metadata. Deploy the function after changing `functions/user-admin/index.ts`; otherwise the directory still saves but the account is not synchronised and the app shows a sync warning.


Deleting a user permanently deletes their Supabase Auth account. Related organization membership and user portfolio data are removed through the database foreign-key cascades. The action cannot be undone. Users cannot delete their own account or the last active Admin. An Admin deleting the organization creator takes over organization ownership first; Managers cannot delete Admin accounts. Deploy the updated `user-admin` Edge Function for account creation and the latest deletion behavior to take effect.

When [`audit-trail.sql`](./audit-trail.sql) is installed and the updated `user-admin` Edge Function is deployed, membership/organization changes and user account actions are captured in the audit chain. Password values are never logged. Login/logout events are not yet ingested into this chain; consult Supabase Auth Audit Logs for authentication evidence.
