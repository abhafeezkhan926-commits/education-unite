begin;

create schema education_unite;
revoke all on schema education_unite from public, anon, authenticated;

create table education_unite.students (
  id uuid primary key default gen_random_uuid(),
  username text not null unique check (username = lower(username) and length(username) > 0),
  password_hash text not null check (length(password_hash) > 0)
);

create table education_unite.join_codes (
  id uuid primary key default gen_random_uuid(),
  code_digest text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  check (expires_at = created_at + interval '168 hours')
);

create table education_unite.student_sessions (
  token_digest text primary key,
  student_id uuid not null references education_unite.students(id) on delete cascade,
  expires_at timestamptz not null
);

create index student_sessions_student_id_idx on education_unite.student_sessions(student_id);

create table education_unite.practice_sessions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references education_unite.students(id) on delete cascade,
  duration_seconds integer not null check (duration_seconds >= 0)
);

create index practice_sessions_student_id_idx on education_unite.practice_sessions(student_id);

create table education_unite.practice_answers (
  practice_session_id uuid not null references education_unite.practice_sessions(id) on delete cascade,
  question_position integer not null check (question_position > 0),
  question_snapshot jsonb not null check (jsonb_typeof(question_snapshot) = 'object'),
  answer text not null,
  primary key (practice_session_id, question_position)
);

create table education_unite.rate_limit_windows (
  action text not null check (action in ('student_login', 'student_join')),
  subject_digest text not null,
  expires_at timestamptz not null,
  attempt_count integer not null check (attempt_count > 0),
  primary key (action, subject_digest)
);

alter table education_unite.students enable row level security;
alter table education_unite.join_codes enable row level security;
alter table education_unite.student_sessions enable row level security;
alter table education_unite.practice_sessions enable row level security;
alter table education_unite.practice_answers enable row level security;
alter table education_unite.rate_limit_windows enable row level security;

revoke all on all tables in schema education_unite from public, anon, authenticated;

commit;
