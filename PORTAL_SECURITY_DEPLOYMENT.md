# Client portal security deployment

These artifacts are prepared locally and have **not** been applied to the
production Supabase project. Wave 1 must remain unchanged, and Wave 2 remains a
separate backup-gated database task.

## Files prepared

- `migrations/20260718_secure_notification_logging.sql`
- `migrations/20260718_client_invitation_rpc.sql`
- `supabase/functions/invite-portal-client/index.ts`
- Updated `admin.html`
- Updated `client-view.html`

## Required deployment order

1. Confirm a current, restorable Supabase backup.
2. Review both migrations against the live schema with Claude/Supabase MCP.
3. Apply `20260718_secure_notification_logging.sql` in the Supabase SQL editor.
4. Apply `20260718_client_invitation_rpc.sql` in the Supabase SQL editor.
5. Link the Supabase CLI, if it is not already linked:

   ```powershell
   supabase login
   supabase link --project-ref dkkriesneublbmrihgvp
   ```

6. Confirm the Edge Function environment provides `SUPABASE_URL`,
   `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`. Supabase normally
   provides these built-in secrets. Never commit their values.
7. Deploy the function:

   ```powershell
   supabase functions deploy invite-portal-client --project-ref dkkriesneublbmrihgvp
   ```

8. Configure the Auth email template and allow-list the redirect URL:
   `https://mpalomaresdigitalsolutions.online/login.html`.
9. Deploy the updated HTML only after testing the function with an admin test
   account and confirming a non-admin receives HTTP 403.

The current machine does not have Deno or the Supabase CLI installed, so the
Edge Function was prepared but not compiled or deployed here.

## Compatibility review

### Confirmed local fixes

- Client notifications now use a server-side RPC. Identity is derived from the
  authenticated session, and project/invoice ownership is validated.
- Admin notification calls previously referenced an undefined function. They now
  use an admin-only RPC with an explicit event allow-list.
- Browser-side `supabase.auth.signUp()` and temporary-password collection were
  removed from the admin portal.
- Client creation now invokes `invite-portal-client`.
- Opening the new-client form now clears stale edit state.
- Client email is disabled while editing an existing record so it cannot drift
  away from the Supabase Auth email. A future protected “change login email”
  workflow is required if email changes are needed.
- The client-side welcome webhook was disabled; invitations are sent by the
  protected Edge Function.
- Meeting-link RLS failures are now shown separately from a legitimate empty
  appointment list.

### Compatible with the known Wave 1 policies

- Admin clients/projects/invoices queries: authenticated admin access expected.
- Client profile and project queries: filtered by the authenticated client's
  `client_id`.
- Conversation/message reads: live Wave 1 policies scope rows by client.
- Client notification writes: secure RPC replaces the formerly incompatible
  direct insert.
- Admin notification reads/updates: expected to remain admin-only.
- Soft deletes: the UI reloads after DELETE; live triggers convert deletion to
  `deleted_at`, and the reported SELECT policies exclude deleted rows.

### Requires live policy confirmation

The audit report does not contain the complete policy definitions. These flows
must be checked against the live `pg_policies` output before production release:

- projects, invoices, deliverables, milestones, contracts, activity_log
- message and conversation INSERT/UPDATE policies
- settings SELECT for login/client branding and admin UPSERT
- portal_users self SELECT and admin UPDATE
- invoice/contract/milestone administrative mutations

Do not guess or loosen policies if one of these tests fails.

## Decision required: client meeting links

`client-view.html` queries `meet_links` by the signed-in email, but the audit says
the live SELECT policy is admin-only. The client will therefore see “temporarily
unavailable” until a client-scoped policy is approved.

A database reviewer should confirm the exact schema and consider a policy shaped
like the following; this SQL is illustrative and has not been applied:

```sql
create policy meet_links_select_own_or_admin
on public.meet_links
for select
to authenticated
using (public.is_admin() or lower(guest_email) = lower(auth.email()));
```

## Manual test checklist

- Admin login and role redirect
- Client login and role redirect
- Admin invitation succeeds and sends one email
- Client row and portal_users row are both created
- Non-admin invitation call returns 403 and creates nothing
- Duplicate invitation creates no partial records
- Client notification RPC accepts valid events and rejects unsupported events
- Client A cannot reference Client B's project or invoice in the notification RPC
- Admin CRUD workflows still operate under live RLS
- Client invoices, milestones, deliverables, contracts, activity, and messages load
- Client A and Client B receive only their own Realtime messages
- Sign-out clears the session and returns to login

## Rate limiting note

The Edge Function includes a small per-instance in-memory limiter and database
uniqueness provides duplicate protection. In-memory limits are not globally
consistent across Edge isolates. Add a durable rate-limit store or gateway rule
before high-volume public use.

## Portal AI deployment

The admin and client AI interfaces call the authenticated Supabase Edge Function:

- `supabase/functions/portal-ai/index.ts`

It supports:

- Admin daily operational brief
- Admin message drafting
- Client project questions using tenant-scoped records
- Client message improvement using an authorized conversation

The function verifies the Supabase JWT and `portal_users` role before reading any
records. Client project and conversation ownership are checked server-side. The
browser does not provide database context to the model.

Set the AI provider key as a Supabase secret; never put its value in HTML or Git:

```powershell
supabase secrets set DEEPSEEK_API_KEY=<your-key> --project-ref dkkriesneublbmrihgvp
```

Deploy after backup confirmation and staging review:

```powershell
supabase functions deploy portal-ai --project-ref dkkriesneublbmrihgvp
```

After deployment succeeds, change `PORTAL_AI_ENABLED` from `false` to `true` in
both `admin.html` and `client-view.html`. The disabled default prevents previews
from calling an Edge Function that does not yet exist and avoids misleading
CORS/network errors.

Before production release, test each action with Admin, Client A, and Client B.
Confirm Client A cannot request Client B's project or conversation ID. AI drafts
are suggestions only and are never sent automatically.
