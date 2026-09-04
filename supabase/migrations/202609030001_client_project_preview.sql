alter table public.opportunities
  add column if not exists client_preview_enabled boolean not null default false,
  add column if not exists preview_status text not null default 'not_ready',
  add column if not exists preview_url text,
  add column if not exists preview_submission_id uuid;

create or replace function public.admin_set_client_preview_visibility(
  p_opportunity_id uuid,
  p_enabled boolean
)
returns public.opportunities
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_opportunity public.opportunities;
begin
  if not exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  ) then
    raise exception 'Only administrators can change client preview visibility.';
  end if;

  update public.opportunities
  set client_preview_enabled = p_enabled,
      updated_at = now()
  where id = p_opportunity_id
  returning * into updated_opportunity;

  if updated_opportunity.id is null then
    raise exception 'Project not found.';
  end if;

  return updated_opportunity;
end;
$$;

grant execute on function public.admin_set_client_preview_visibility(uuid, boolean)
  to authenticated;

create policy "Clients can view their client user link"
  on public.client_users for select
  to authenticated
  using (user_id = auth.uid());

create policy "Clients can view their client record"
  on public.clients for select
  to authenticated
  using (
    exists (
      select 1 from public.client_users
      where client_users.client_id = clients.id
        and client_users.user_id = auth.uid()
    )
  );

create policy "Clients can view their project details"
  on public.opportunities for select
  to authenticated
  using (
    exists (
      select 1 from public.client_users
      where client_users.client_id = opportunities.client_id
        and client_users.user_id = auth.uid()
    )
  );

create policy "Clients can view their project assignments"
  on public.project_assignments for select
  to authenticated
  using (
    exists (
      select 1 from public.opportunities
      join public.client_users on client_users.client_id = opportunities.client_id
      where opportunities.id = project_assignments.opportunity_id
        and client_users.user_id = auth.uid()
    )
  );

create policy "Clients can view their project submissions"
  on public.project_submissions for select
  to authenticated
  using (
    exists (
      select 1
      from public.project_assignments
      join public.opportunities on opportunities.id = project_assignments.opportunity_id
      join public.client_users on client_users.client_id = opportunities.client_id
      where project_assignments.id = project_submissions.assignment_id
        and client_users.user_id = auth.uid()
    )
  );