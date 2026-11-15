begin;

create table education_unite.admin_email_challenges (
  token_digest text primary key,
  code_digest text not null,
  expires_at timestamptz not null,
  attempts_remaining smallint not null default 5 check (attempts_remaining between 0 and 5)
);
alter table education_unite.admin_email_challenges enable row level security;
revoke all on education_unite.admin_email_challenges from public, anon, authenticated;
grant select, insert, update, delete on education_unite.admin_email_challenges to education_unite_admin;
create policy admin_email_challenge_access on education_unite.admin_email_challenges
  to education_unite_admin using (true) with check (true);

commit;
