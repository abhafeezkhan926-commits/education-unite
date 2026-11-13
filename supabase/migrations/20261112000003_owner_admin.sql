begin;

create role education_unite_admin nologin nobypassrls;
grant usage on schema education_unite to education_unite_admin;
grant insert (code_digest, expires_at), select (expires_at)
  on education_unite.join_codes to education_unite_admin;
create policy admin_code_create on education_unite.join_codes
  for insert to education_unite_admin with check (true);
create policy admin_code_expiry on education_unite.join_codes
  for select to education_unite_admin using (true);

create table education_unite.admin_sessions (
  token_digest text primary key,
  expires_at timestamptz not null
);
alter table education_unite.admin_sessions enable row level security;
grant select, insert, delete on education_unite.admin_sessions to education_unite_admin;
create policy admin_sessions on education_unite.admin_sessions to education_unite_admin
  using (true) with check (true);

create table education_unite.student_resets (
  student_id uuid primary key references education_unite.students(id) on delete cascade,
  password_digest text not null,
  expires_at timestamptz not null
);
create index student_resets_expiry_idx on education_unite.student_resets(expires_at);
alter table education_unite.student_resets enable row level security;
revoke all on education_unite.student_resets, education_unite.admin_sessions from public, anon, authenticated;

create function education_unite.clear_expired_resets() returns void
  language sql security definer set search_path = pg_catalog
  as $$ delete from education_unite.student_resets where expires_at <= now() $$;
revoke all on function education_unite.clear_expired_resets() from public;
grant execute on function education_unite.clear_expired_resets() to education_unite_admin, education_unite_app;

alter table education_unite.rate_limit_windows drop constraint rate_limit_windows_action_check;
alter table education_unite.rate_limit_windows add check
  (action in ('student_login', 'student_join', 'student_reset', 'admin_login'));

create function education_unite.lock_student(account_name text) returns void
  language sql set search_path = pg_catalog
  as $$ select pg_advisory_xact_lock(hashtextextended(account_name, 452017)) $$;
revoke all on function education_unite.lock_student(text) from public;
grant execute on function education_unite.lock_student(text) to education_unite_app;

create function education_unite.issue_student_reset(account_name text, reset_digest text)
  returns timestamptz language plpgsql security definer set search_path = pg_catalog as $$
declare
  account_id uuid;
  deadline timestamptz;
begin
  perform education_unite.lock_student(account_name);
  update education_unite.students set password_hash = 'reset-required'
    where username = account_name returning id into account_id;
  if account_id is null then
    return null;
  end if;
  deadline := clock_timestamp() + interval '15 minutes';
  insert into education_unite.student_resets (student_id, password_digest, expires_at)
    values (account_id, reset_digest, deadline)
    on conflict (student_id) do update
    set password_digest = excluded.password_digest, expires_at = excluded.expires_at;
  delete from education_unite.student_sessions where student_id = account_id;
  return deadline;
end
$$;
revoke all on function education_unite.issue_student_reset(text, text) from public;
grant execute on function education_unite.issue_student_reset(text, text) to education_unite_admin;

create function education_unite.redeem_student_reset(
  account_name text, reset_digest text, new_password_hash text, login_bucket text
) returns boolean language plpgsql security definer set search_path = pg_catalog as $$
declare
  account_id uuid;
begin
  perform education_unite.lock_student(account_name);
  delete from education_unite.student_resets as resets using education_unite.students as students
    where students.username = account_name and resets.student_id = students.id
      and resets.password_digest = reset_digest and resets.expires_at > clock_timestamp()
    returning resets.student_id into account_id;
  if account_id is null then
    return false;
  end if;
  update education_unite.students set password_hash = new_password_hash where id = account_id;
  delete from education_unite.rate_limit_windows
    where action = 'student_login' and subject_digest = login_bucket;
  return true;
end
$$;
revoke all on function education_unite.redeem_student_reset(text, text, text, text) from public;
grant execute on function education_unite.redeem_student_reset(text, text, text, text)
  to education_unite_app;

commit;
