-- Security hardening migration for the client portal.
-- Review in a staging Supabase project, then run once in the SQL editor.
-- This replaces the original permissive USING (true) policies.

begin;

create or replace function public.is_portal_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.portal_users
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      and role = 'admin'
  );
$$;

create or replace function public.current_portal_client_id()
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select client_id
  from public.portal_users
  where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    and role = 'client'
  limit 1;
$$;

revoke all on function public.is_portal_admin() from public;
revoke all on function public.current_portal_client_id() from public;
grant execute on function public.is_portal_admin() to authenticated;
grant execute on function public.current_portal_client_id() to authenticated;

drop policy if exists "admin_all_clients" on public.clients;
drop policy if exists "admin_all_projects" on public.projects;
drop policy if exists "admin_all_invoices" on public.invoices;
drop policy if exists "admin_all_deliverables" on public.deliverables;
drop policy if exists "admin_all_activity" on public.activity_log;
drop policy if exists "admin_all_users" on public.portal_users;

create policy "admins_manage_clients"
on public.clients for all to authenticated
using (public.is_portal_admin())
with check (public.is_portal_admin());

create policy "clients_read_own_profile"
on public.clients for select to authenticated
using (id = public.current_portal_client_id());

create policy "admins_manage_projects"
on public.projects for all to authenticated
using (public.is_portal_admin())
with check (public.is_portal_admin());

create policy "clients_read_own_projects"
on public.projects for select to authenticated
using (client_id = public.current_portal_client_id());

create policy "admins_manage_invoices"
on public.invoices for all to authenticated
using (public.is_portal_admin())
with check (public.is_portal_admin());

create policy "clients_read_own_invoices"
on public.invoices for select to authenticated
using (exists (
  select 1 from public.projects
  where projects.id = invoices.project_id
    and projects.client_id = public.current_portal_client_id()
));

create policy "admins_manage_deliverables"
on public.deliverables for all to authenticated
using (public.is_portal_admin())
with check (public.is_portal_admin());

create policy "clients_read_own_deliverables"
on public.deliverables for select to authenticated
using (exists (
  select 1 from public.projects
  where projects.id = deliverables.project_id
    and projects.client_id = public.current_portal_client_id()
));

create policy "admins_manage_activity"
on public.activity_log for all to authenticated
using (public.is_portal_admin())
with check (public.is_portal_admin());

create policy "clients_read_own_activity"
on public.activity_log for select to authenticated
using (exists (
  select 1 from public.projects
  where projects.id = activity_log.project_id
    and projects.client_id = public.current_portal_client_id()
));

create policy "admins_manage_portal_users"
on public.portal_users for all to authenticated
using (public.is_portal_admin())
with check (public.is_portal_admin());

create policy "users_read_own_portal_profile"
on public.portal_users for select to authenticated
using (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));

create index if not exists idx_portal_users_email_lower
  on public.portal_users (lower(email));
create index if not exists idx_projects_client_id on public.projects (client_id);
create index if not exists idx_invoices_project_id on public.invoices (project_id);
create index if not exists idx_deliverables_project_id on public.deliverables (project_id);
create index if not exists idx_activity_log_project_id on public.activity_log (project_id);

commit;

