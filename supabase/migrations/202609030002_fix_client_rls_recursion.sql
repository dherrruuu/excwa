create or replace function public.is_client_user_for(
  p_client_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.client_users
    where client_id = p_client_id
      and user_id = p_user_id
  );
$$;

create or replace function public.is_client_project_for(
  p_opportunity_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.opportunities opportunity
    join public.client_users client_user
      on client_user.client_id = opportunity.client_id
    where opportunity.id = p_opportunity_id
      and client_user.user_id = p_user_id
  );
$$;

create or replace function public.is_client_assignment_for(
  p_assignment_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.project_assignments assignment
    join public.opportunities opportunity
      on opportunity.id = assignment.opportunity_id
    join public.client_users client_user
      on client_user.client_id = opportunity.client_id
    where assignment.id = p_assignment_id
      and client_user.user_id = p_user_id
  );
$$;

revoke all on function public.is_client_user_for(uuid, uuid) from public;
revoke all on function public.is_client_project_for(uuid, uuid) from public;
revoke all on function public.is_client_assignment_for(uuid, uuid) from public;
grant execute on function public.is_client_user_for(uuid, uuid) to authenticated;
grant execute on function public.is_client_project_for(uuid, uuid) to authenticated;
grant execute on function public.is_client_assignment_for(uuid, uuid) to authenticated;

drop policy if exists "Clients can view their client record" on public.clients;
drop policy if exists "Clients can view their project details" on public.opportunities;
drop policy if exists "Clients can view their project assignments" on public.project_assignments;
drop policy if exists "Clients can view their project submissions" on public.project_submissions;

create policy "Clients can view their client record"
  on public.clients for select
  to authenticated
  using (public.is_client_user_for(id));

create policy "Clients can view their project details"
  on public.opportunities for select
  to authenticated
  using (public.is_client_user_for(client_id));

create policy "Clients can view their project assignments"
  on public.project_assignments for select
  to authenticated
  using (public.is_client_project_for(opportunity_id));

create policy "Clients can view their project submissions"
  on public.project_submissions for select
  to authenticated
  using (public.is_client_assignment_for(assignment_id));