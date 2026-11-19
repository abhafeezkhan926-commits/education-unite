begin;

update education_unite.students set gender = null
  where gender is not null and gender not in ('male', 'female');
alter table education_unite.students drop constraint students_gender_check;
alter table education_unite.students add constraint students_gender_check
  check (gender in ('male', 'female'));

commit;
