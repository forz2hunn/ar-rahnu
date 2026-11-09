# Supabase setup

1. In the Supabase SQL Editor for project `zyikvjbnroicbeezpxvx`, run [`supabase/schema.sql`](./supabase/schema.sql). It creates the per-user data table, enables row-level security, and adds the table to Realtime.
2. Copy `.env.example` to `.env.local` and set `VITE_SUPABASE_ANON_KEY` to the project's publishable key (or legacy anon key). The project URL is already filled in. Never use a `service_role` or secret key in this browser app.
3. Restart the Vite server, open the app, and register/log in with Supabase Auth. If email confirmation is enabled, confirm the account before logging in.
4. The first login imports the existing browser's transactions, institutions, assets and suppliers only when that account has no cloud data yet. If cloud data already exists, it is loaded as the source of truth.

Each authenticated user can only read or modify their own row. App changes are saved automatically and updates from other sessions are received through Supabase Realtime.
