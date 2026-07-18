-- Database half of the invite-portal-client Edge Function.
-- Review against the live schema and deploy before deploying the Edge Function.

begin;

create table if not exists public.security_audit_log (
  id bigint generated always as identity primary key,
  actor_email text not null,
  action text not null,
  target_email text,
  target_client_id bigint references public.clients(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.security_audit_log enable row level security;

drop policy if exists security_audit_admin_select on public.security_audit_log;
create policy security_audit_admin_select
  on public.security_audit_log
  for select
  to authenticated
  using (public.is_admin());

create index if not exists idx_security_audit_created_at
  on public.security_audit_log (created_at desc);

create or replace function public.provision_portal_client(
  p_actor_email text,
  p_name text,
  p_email text,
  p_company text default null,
  p_phone text default null,
  p_logo_url text default null,
  p_brand_color text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client public.clients%rowtype;
  v_actor text := lower(trim(p_actor_email));
  v_email text := lower(trim(p_email));
  v_initials text;
begin
  if not exists (
    select 1 from public.portal_users
    where lower(email) = v_actor and role = 'admin'
  ) then
    raise exception using errcode = '42501', message = 'Administrator access required';
  end if;

  if exists (select 1 from public.portal_users where lower(email) = v_email)
     or exists (select 1 from public.clients where lower(email) = v_email) then
    raise exception using errcode = '23505', message = 'Portal account cannot be provisioned';
  end if;

  v_initials := upper(left(regexp_replace(trim(p_name), '[^[:alnum:] ]', '', 'g'), 1));
  if position(' ' in trim(p_name)) > 0 then
    v_initials := v_initials || upper(left(split_part(trim(p_name), ' ', 2), 1));
  end if;
  if coalesce(v_initials, '') = '' then v_initials := 'CL'; end if;

  insert into public.clients (
    name, email, company, phone, logo_url, brand_color, avatar_initials, avatar_color
  ) values (
    trim(p_name), v_email, nullif(trim(p_company), ''), nullif(trim(p_phone), ''),
    nullif(trim(p_logo_url), ''), nullif(trim(p_brand_color), ''), v_initials, 'av-blue'
  ) returning * into v_client;

  insert into public.portal_users (email, role, client_id, display_name)
  values (v_email, 'client', v_client.id, trim(p_name));

  insert into public.security_audit_log (
    actor_email, action, target_email, target_client_id, metadata
  ) values (
    v_actor, 'portal_client_invited', v_email, v_client.id,
    jsonb_build_object('company_provided', nullif(trim(p_company), '') is not null)
  );

  return jsonb_build_object('client_id', v_client.id);
end;
$$;

revoke all on function public.provision_portal_client(text,text,text,text,text,text,text) from public;
revoke all on function public.provision_portal_client(text,text,text,text,text,text,text) from anon;
revoke all on function public.provision_portal_client(text,text,text,text,text,text,text) from authenticated;
grant execute on function public.provision_portal_client(text,text,text,text,text,text,text) to service_role;

commit;

