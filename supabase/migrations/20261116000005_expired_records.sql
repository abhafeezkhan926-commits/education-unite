create function education_unite.purge_expired() returns void
  language sql set search_path = pg_catalog as $$
  delete from education_unite.join_codes where expires_at <= now();
  delete from education_unite.student_sessions where expires_at <= now();
  delete from education_unite.admin_sessions where expires_at <= now();
  delete from education_unite.admin_email_challenges where expires_at <= now();
  delete from education_unite.student_resets where expires_at <= now();
  delete from education_unite.active_practice where expires_at <= now();
  delete from education_unite.rate_limit_windows where expires_at <= now();
$$;

revoke all on function education_unite.purge_expired() from public;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('education-unite-purge', '17 * * * *', 'select education_unite.purge_expired()');
  end if;
end;
$$;
alter policy student_answers on education_unite.practice_answers using (exists (
  select 1 from education_unite.practice_sessions
  where practice_sessions.id = practice_answers.practice_session_id
));
