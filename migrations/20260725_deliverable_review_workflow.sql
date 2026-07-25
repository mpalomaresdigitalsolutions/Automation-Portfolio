-- Versioned deliverables and client approval workflow.
-- Review in a staging project before applying to production.
begin;

alter table public.deliverables
  add column if not exists description text,
  add column if not exists review_status text not null default 'pending_review',
  add column if not exists current_version integer not null default 0,
  add column if not exists reviewed_at timestamptz,
  add column if not exists review_feedback text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'deliverables_review_status_check'
  ) then
    alter table public.deliverables add constraint deliverables_review_status_check
      check (review_status in ('draft','pending_review','approved','revision_requested'));
  end if;
end $$;

create table if not exists public.deliverable_versions (
  id bigint generated always as identity primary key,
  deliverable_id bigint not null references public.deliverables(id) on delete cascade,
  version_number integer not null check (version_number > 0),
  file_name text not null,
  file_path text not null,
  file_size bigint,
  notes text,
  uploaded_at timestamptz not null default now(),
  unique (deliverable_id, version_number)
);

create table if not exists public.deliverable_reviews (
  id bigint generated always as identity primary key,
  deliverable_id bigint not null references public.deliverables(id) on delete cascade,
  version_id bigint not null references public.deliverable_versions(id) on delete cascade,
  reviewer_email text not null,
  decision text not null check (decision in ('approved','revision_requested')),
  feedback text,
  created_at timestamptz not null default now()
);

create index if not exists idx_deliverable_versions_deliverable
  on public.deliverable_versions(deliverable_id, version_number desc);
create index if not exists idx_deliverable_reviews_deliverable
  on public.deliverable_reviews(deliverable_id, created_at desc);

alter table public.deliverable_versions enable row level security;
alter table public.deliverable_reviews enable row level security;

drop policy if exists deliverable_versions_admin_all on public.deliverable_versions;
create policy deliverable_versions_admin_all
  on public.deliverable_versions for all to authenticated
  using (public.is_portal_admin())
  with check (public.is_portal_admin());

drop policy if exists deliverable_versions_client_read on public.deliverable_versions;
create policy deliverable_versions_client_read
  on public.deliverable_versions for select to authenticated
  using (exists (
    select 1
    from public.deliverables d
    join public.projects p on p.id = d.project_id
    where d.id = deliverable_versions.deliverable_id
      and p.client_id = public.current_portal_client_id()
  ));

drop policy if exists deliverable_reviews_admin_read on public.deliverable_reviews;
create policy deliverable_reviews_admin_read
  on public.deliverable_reviews for select to authenticated
  using (public.is_portal_admin());

drop policy if exists deliverable_reviews_client_read on public.deliverable_reviews;
create policy deliverable_reviews_client_read
  on public.deliverable_reviews for select to authenticated
  using (exists (
    select 1
    from public.deliverables d
    join public.projects p on p.id = d.project_id
    where d.id = deliverable_reviews.deliverable_id
      and p.client_id = public.current_portal_client_id()
  ));

insert into storage.buckets (id, name, public, file_size_limit)
values ('deliverables', 'deliverables', false, 52428800)
on conflict (id) do update
set public = false, file_size_limit = excluded.file_size_limit;

drop policy if exists deliverable_files_admin_all on storage.objects;
create policy deliverable_files_admin_all
  on storage.objects for all to authenticated
  using (bucket_id = 'deliverables' and public.is_portal_admin())
  with check (bucket_id = 'deliverables' and public.is_portal_admin());

drop policy if exists deliverable_files_client_read on storage.objects;
create policy deliverable_files_client_read
  on storage.objects for select to authenticated
  using (
    bucket_id = 'deliverables'
    and exists (
      select 1 from public.projects p
      where p.id::text = (storage.foldername(name))[1]
        and p.client_id = public.current_portal_client_id()
    )
  );

create or replace function public.review_deliverable(
  p_deliverable_id bigint,
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
  v_deliverable public.deliverables%rowtype;
  v_version_id bigint;
  v_client_name text;
begin
  if p_decision not in ('approved','revision_requested') then
    raise exception using errcode = '22023', message = 'Invalid review decision';
  end if;
  if p_decision = 'revision_requested' and length(trim(coalesce(p_feedback,''))) < 3 then
    raise exception using errcode = '22023', message = 'Revision feedback is required';
  end if;

  select d.* into v_deliverable
  from public.deliverables d
  join public.projects p on p.id = d.project_id
  where d.id = p_deliverable_id
    and p.client_id = public.current_portal_client_id()
  for update;
  if not found then
    raise exception using errcode = '42501', message = 'Deliverable access denied';
  end if;

  select id into v_version_id
  from public.deliverable_versions
  where deliverable_id = p_deliverable_id
  order by version_number desc
  limit 1;
  if v_version_id is null then
    raise exception using errcode = '22023', message = 'No deliverable version is available';
  end if;

  insert into public.deliverable_reviews
    (deliverable_id, version_id, reviewer_email, decision, feedback)
  values
    (p_deliverable_id, v_version_id, v_email, p_decision, nullif(trim(coalesce(p_feedback,'')), ''));

  update public.deliverables
  set review_status = p_decision,
      reviewed_at = now(),
      review_feedback = nullif(trim(coalesce(p_feedback,'')), '')
  where id = p_deliverable_id;

  select display_name into v_client_name
  from public.portal_users where lower(email) = v_email limit 1;

  insert into public.activity_log(project_id, type, text)
  values (
    v_deliverable.project_id,
    'update',
    case when p_decision = 'approved'
      then '✅ Deliverable approved: ' || v_deliverable.name
      else '↩️ Revisions requested: ' || v_deliverable.name
    end
  );

  insert into public.notifications(type, message, client_name, client_email, related_id, is_read)
  values (
    'message_sent',
    case when p_decision = 'approved'
      then 'Deliverable approved: ' || v_deliverable.name
      else 'Revisions requested for: ' || v_deliverable.name
    end,
    coalesce(v_client_name, 'Client'),
    v_email,
    p_deliverable_id::text,
    false
  );
end;
$$;

revoke all on function public.review_deliverable(bigint, text, text) from public;
revoke all on function public.review_deliverable(bigint, text, text) from anon;
grant execute on function public.review_deliverable(bigint, text, text) to authenticated;

commit;
