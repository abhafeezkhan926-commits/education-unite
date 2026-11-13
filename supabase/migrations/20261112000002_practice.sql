begin;

create table education_unite.active_practice (
  token_digest text primary key references education_unite.student_sessions(token_digest) on delete cascade,
  id uuid not null unique,
  expires_at timestamptz not null,
  state jsonb not null
);

alter table education_unite.active_practice enable row level security;
grant select, insert, update, delete on education_unite.active_practice to education_unite_app;
create policy active_practice_owner on education_unite.active_practice to education_unite_app
  using (token_digest = current_setting('education_unite.session_digest', true))
  with check (token_digest = current_setting('education_unite.session_digest', true));
create index active_practice_expiry_idx on education_unite.active_practice(expires_at);

create function education_unite.clear_expired_practice() returns void
  language sql security definer set search_path = pg_catalog
  as $$ delete from education_unite.active_practice where expires_at <= now() $$;
revoke all on function education_unite.clear_expired_practice() from public;
grant execute on function education_unite.clear_expired_practice() to education_unite_app;

grant insert on education_unite.practice_sessions, education_unite.practice_answers to education_unite_app;
create policy student_practice_insert on education_unite.practice_sessions for insert to education_unite_app
  with check (student_id::text = current_setting('education_unite.student_id', true));
create policy student_answers_insert on education_unite.practice_answers for insert to education_unite_app
  with check (exists (
    select 1 from education_unite.practice_sessions where id = practice_session_id
  ));

commit;
