begin;

alter table education_unite.students add column gender text
  check (gender in ('female', 'male', 'nonbinary', 'prefer_not_to_say'));
alter table education_unite.students add column created_at timestamptz not null default now();

grant select (id, username, gender, created_at), insert, update (username, gender), delete
  on education_unite.students to education_unite_admin;
create policy admin_students on education_unite.students to education_unite_admin
  using (true) with check (true);

-- Rename/delete/reset share row locks with sign-in and password redemption.
grant execute on function education_unite.lock_student(text) to education_unite_admin;
grant delete on education_unite.student_sessions to education_unite_admin;
create policy admin_student_session_revoke on education_unite.student_sessions
  for delete to education_unite_admin using (true);
-- PostgreSQL DELETE also needs a SELECT policy for rows filtered by student_id.
grant select (student_id) on education_unite.student_sessions to education_unite_admin;
create policy admin_student_session_lookup on education_unite.student_sessions
  for select to education_unite_admin using (true);

create function education_unite.valid_student_reset(account_name text, reset_digest text)
  returns boolean language sql security definer set search_path = pg_catalog as $$
    select exists (
      select 1 from education_unite.student_resets r
      join education_unite.students s on s.id = r.student_id
      where s.username = account_name and s.password_hash = 'reset-required'
        and r.password_digest = reset_digest and r.expires_at > clock_timestamp()
    )
  $$;
revoke all on function education_unite.valid_student_reset(text, text) from public;
grant execute on function education_unite.valid_student_reset(text, text) to education_unite_app;

commit;
