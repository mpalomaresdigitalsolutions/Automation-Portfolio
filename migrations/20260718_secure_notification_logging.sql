-- Deploy only after reviewing against the live production schema.
-- This does not modify any existing Wave 1 policy.

begin;

create or replace function public.log_portal_notification(
  p_type text,
  p_message text,
  p_related_id text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(auth.email());
  v_name text;
  v_client_id bigint;
  v_related_id bigint;
begin
  if v_email is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;

  if p_type not in ('client_login', 'invoice_viewed', 'pdf_viewed') then
    raise exception using errcode = '22023', message = 'Unsupported notification type';
  end if;

  if p_message is null or length(trim(p_message)) < 1 or length(p_message) > 500 then
    raise exception using errcode = '22023', message = 'Notification message must contain 1 to 500 characters';
  end if;

  select pu.display_name, pu.client_id
    into v_name, v_client_id
  from public.portal_users as pu
  where lower(pu.email) = v_email
    and pu.role = 'client'
  limit 1;

  if v_client_id is null then
    raise exception using errcode = '42501', message = 'Client portal access required';
  end if;

  if p_type in ('invoice_viewed', 'pdf_viewed') then
    if coalesce(p_related_id, '') !~ '^[0-9]+$' then
      raise exception using errcode = '22023', message = 'A valid related record is required';
    end if;
    v_related_id := p_related_id::bigint;
  end if;

  if p_type = 'invoice_viewed' and not exists (
    select 1 from public.projects as p
    where p.id = v_related_id
      and p.client_id = v_client_id
      and p.deleted_at is null
  ) then
    raise exception using errcode = '42501', message = 'Project access denied';
  end if;

  if p_type = 'pdf_viewed' and not exists (
    select 1
    from public.invoices as i
    join public.projects as p on p.id = i.project_id
    where i.id = v_related_id
      and p.client_id = v_client_id
      and i.deleted_at is null
      and p.deleted_at is null
  ) then
    raise exception using errcode = '42501', message = 'Invoice access denied';
  end if;

  insert into public.notifications (
    type, message, client_name, client_email, related_id, is_read
  ) values (
    p_type,
    trim(p_message),
    coalesce(nullif(trim(v_name), ''), split_part(v_email, '@', 1)),
    v_email,
    coalesce(p_related_id, ''),
    false
  );
end;
$$;

revoke all on function public.log_portal_notification(text, text, text) from public;
revoke all on function public.log_portal_notification(text, text, text) from anon;
grant execute on function public.log_portal_notification(text, text, text) to authenticated;

create or replace function public.log_admin_notification(
  p_type text,
  p_message text,
  p_related_id text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(auth.email());
begin
  if v_email is null or not public.is_admin() then
    raise exception using errcode = '42501', message = 'Administrator access required';
  end if;
  if p_type not in ('invoice_created', 'invoice_deleted', 'contract_completed') then
    raise exception using errcode = '22023', message = 'Unsupported notification type';
  end if;
  if p_message is null or length(trim(p_message)) < 1 or length(p_message) > 500 then
    raise exception using errcode = '22023', message = 'Notification message must contain 1 to 500 characters';
  end if;

  insert into public.notifications (
    type, message, client_name, client_email, related_id, is_read
  ) values (
    p_type, trim(p_message), 'Administrator', v_email, coalesce(p_related_id, ''), false
  );
end;
$$;

revoke all on function public.log_admin_notification(text, text, text) from public;
revoke all on function public.log_admin_notification(text, text, text) from anon;
grant execute on function public.log_admin_notification(text, text, text) to authenticated;

commit;
