-- General project suggestion Approval Center.
begin;

create table if not exists public.approval_requests (
  id bigint generated always as identity primary key,
  project_id bigint not null references public.projects(id) on delete cascade,
  title text not null check (length(trim(title)) between 3 and 160),
  description text not null check (length(trim(description)) between 3 and 4000),
  expected_benefit text,
  cost_impact numeric(12,2) not null default 0 check (cost_impact >= 0),
  timeline_impact text,
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  due_date date,
  status text not null default 'draft'
    check (status in ('draft','pending','approved','changes_requested','declined','expired','cancelled')),
  created_by_email text not null,
  submitted_at timestamptz,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.approval_responses (
  id bigint generated always as identity primary key,
  approval_request_id bigint not null references public.approval_requests(id) on delete cascade,
  responder_email text not null,
  decision text not null check (decision in ('approved','changes_requested','declined')),
  feedback text,
  created_at timestamptz not null default now()
);

create index if not exists idx_approval_requests_project_status
  on public.approval_requests(project_id, status, created_at desc);
create index if not exists idx_approval_responses_request
  on public.approval_responses(approval_request_id, created_at desc);

alter table public.approval_requests enable row level security;
alter table public.approval_responses enable row level security;

drop policy if exists approval_requests_admin_all on public.approval_requests;
create policy approval_requests_admin_all
  on public.approval_requests for all to authenticated
  using (public.is_portal_admin())
  with check (public.is_portal_admin());

drop policy if exists approval_requests_client_read on public.approval_requests;
create policy approval_requests_client_read
  on public.approval_requests for select to authenticated
  using (
    status <> 'draft'
    and exists (
      select 1 from public.projects p
      where p.id = approval_requests.project_id
        and p.client_id = public.current_portal_client_id()
    )
  );

drop policy if exists approval_responses_admin_read on public.approval_responses;
create policy approval_responses_admin_read
  on public.approval_responses for select to authenticated
  using (public.is_portal_admin());

drop policy if exists approval_responses_client_read on public.approval_responses;
create policy approval_responses_client_read
  on public.approval_responses for select to authenticated
  using (exists (
    select 1
    from public.approval_requests ar
    join public.projects p on p.id = ar.project_id
    where ar.id = approval_responses.approval_request_id
      and p.client_id = public.current_portal_client_id()
  ));

create or replace function public.respond_to_approval_request(
  p_request_id bigint,
  p_decision text,
  p_feedback text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_request public.approval_requests%rowtype;
  v_client_name text;
begin
  if p_decision not in ('approved','changes_requested','declined') then
    raise exception using errcode = '22023', message = 'Invalid approval decision';
  end if;
  if p_decision in ('changes_requested','declined')
     and length(trim(coalesce(p_feedback,''))) < 3 then
    raise exception using errcode = '22023', message = 'Feedback is required for this decision';
  end if;

  select ar.* into v_request
  from public.approval_requests ar
  join public.projects p on p.id = ar.project_id
  where ar.id = p_request_id
    and p.client_id = public.current_portal_client_id()
    and ar.status in ('pending','changes_requested')
  for update;

  if not found then
    raise exception using errcode = '42501', message = 'Approval request is unavailable';
  end if;
  if v_request.due_date is not null and v_request.due_date < current_date then
    raise exception using errcode = '22023', message = 'This approval request has expired';
  end if;

  insert into public.approval_responses
    (approval_request_id, responder_email, decision, feedback)
  values
    (p_request_id, v_email, p_decision, nullif(trim(coalesce(p_feedback,'')), ''));

  update public.approval_requests
  set status=p_decision, decided_at=now(), updated_at=now()
  where id=p_request_id;

  select display_name into v_client_name
  from public.portal_users where lower(email)=v_email limit 1;

  insert into public.activity_log(project_id, type, text)
  values (
    v_request.project_id,
    'update',
    case p_decision
      when 'approved' then '✅ Suggestion approved: '
      when 'changes_requested' then '↩️ Changes requested for suggestion: '
      else '❌ Suggestion declined: '
    end || v_request.title
  );

  insert into public.notifications(type, message, client_name, client_email, related_id, is_read)
  values (
    'message_sent',
    case p_decision
      when 'approved' then 'Suggestion approved: '
      when 'changes_requested' then 'Changes requested: '
      else 'Suggestion declined: '
    end || v_request.title,
    coalesce(v_client_name,'Client'),
    v_email,
    p_request_id::text,
    false
  );
end;
$$;

revoke all on function public.respond_to_approval_request(bigint,text,text) from public;
revoke all on function public.respond_to_approval_request(bigint,text,text) from anon;
grant execute on function public.respond_to_approval_request(bigint,text,text) to authenticated;

commit;
