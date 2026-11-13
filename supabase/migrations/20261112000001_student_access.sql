begin;

create role education_unite_app nologin nobypassrls;
grant usage on schema education_unite to education_unite_app;
grant select on education_unite.join_codes to education_unite_app;
grant select, insert on education_unite.students to education_unite_app;
grant select, insert, delete on education_unite.student_sessions to education_unite_app;
grant select, insert, update, delete on education_unite.rate_limit_windows to education_unite_app;
grant select on education_unite.practice_sessions, education_unite.practice_answers to education_unite_app;

create policy app_codes on education_unite.join_codes for select to education_unite_app using (true);
create policy app_student_lookup on education_unite.students for select to education_unite_app using (true);
create policy app_student_signup on education_unite.students for insert to education_unite_app with check (true);
create policy app_sessions on education_unite.student_sessions to education_unite_app using (true) with check (true);
create policy app_limits on education_unite.rate_limit_windows to education_unite_app using (true) with check (true);

create policy student_practice on education_unite.practice_sessions for select to education_unite_app
  using (student_id::text = current_setting('education_unite.student_id', true));
create policy student_answers on education_unite.practice_answers for select to education_unite_app
  using (exists (
    select 1 from education_unite.practice_sessions
    where id = practice_session_id
  ));

create index student_sessions_expiry_idx on education_unite.student_sessions(expires_at);
create index rate_limit_expiry_idx on education_unite.rate_limit_windows(expires_at);
commit;
