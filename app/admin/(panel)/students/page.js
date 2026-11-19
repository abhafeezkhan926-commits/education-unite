import Link from 'next/link';
import { withAdmin } from '../../../admin-auth';
import GenderField from '../../../gender-field';
import { genders, readGender } from '../../../student-profile.mjs';

export default async function Students({ searchParams }) {
  const params = await searchParams;
  const query = String(params.q ?? '').trim().toLowerCase().slice(0, 64);
  const gender = params.gender === 'unspecified' ? 'unspecified' : readGender(params.gender);
  const requested = Number(params.page);
  const requestedPage = Number.isSafeInteger(requested) && requested > 0 ? Math.min(requested, 1000000) : 1;
  const { students, total, page } = await withAdmin(async (db) => {
    const values = [query, gender ?? null];
    const where = `where ($1 = '' or position($1 in username) > 0)
      and ($2::text is null or gender = $2 or ($2 = 'unspecified' and gender is null))`;
    const { rows: [{ count }] } = await db.query(`select count(*)::int as count from education_unite.students ${where}`, values);
    const page = Math.min(requestedPage, Math.max(1, Math.ceil(count / 20)));
    const { rows } = await db.query(`select id, username, gender, created_at from education_unite.students ${where}
      order by username, id limit 20 offset $3`, [...values, (page - 1) * 20]);
    return { students: rows, total: count, page };
  });
  function pageUrl(value) {
    return '/admin/students?' + new URLSearchParams({ q: query, gender: gender ?? '', page: String(value) });
  }
  const message = { updated: 'Student updated.', deleted: 'Student and their practice data deleted.' }[params.status];
  return <>
    <section className="admin-surface students-heading">
      <div><h1>Students</h1><p>Manage student accounts and access.</p></div>
      <Link className="primary-link" href="/admin/students/new">Add student</Link>
    </section>
    <section className="admin-surface">
      {message && <p role="status">{message}</p>}
      <form className="student-filters" action="/admin/students" method="get">
        <label>Search username<input name="q" type="search" maxLength={64} defaultValue={query} placeholder="Search students…" /></label>
        <GenderField filter value={gender ?? ''} />
        <button className="secondary-button" type="submit">Apply filters</button>
        <Link href="/admin/students">Clear filters</Link>
      </form>
      <p role="status">{total} {total === 1 ? 'student' : 'students'} found</p>
      {students.length ? <ul className="students-list">
        {students.map((student) => <li key={student.id}>
          <div><strong>{student.username}</strong><span>{genders.find(([key]) => key === student.gender)?.[1] ?? 'Not specified'}</span></div>
          <div className="student-row-actions">
            <Link className="secondary-button" href={'/admin/students/' + student.id} aria-label={'Edit ' + student.username}>Edit</Link>
            <Link className="secondary-button" href={'/admin/students/' + student.id + '?action=password'} aria-label={'Reset password for ' + student.username}>
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="8" cy="8" r="5" /><path d="m12 12 9 9m-3-3 3-3m-6 0 3-3" /></svg>
              <span>Password</span>
            </Link>
            <Link className="secondary-button" href={'/admin/students/' + student.id + '?action=delete'} aria-label={'Delete ' + student.username}>Delete</Link>
          </div>
        </li>)}
      </ul> : <p>No students match these filters.</p>}
      <div className="student-pagination" aria-label="Student pages">
        {page > 1 && <Link className="secondary-button" href={pageUrl(page - 1)}>Previous</Link>}
        <span>Page {page} of {Math.max(1, Math.ceil(total / 20))}</span>
        {page * 20 < total && <Link className="secondary-button" href={pageUrl(page + 1)}>Next</Link>}
      </div>
    </section>
  </>;
}
