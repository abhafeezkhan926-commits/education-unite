import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { studentTransaction } from './student-db';
import { sessionDigest, sessionName } from './student-security';

export async function withStudent(work) {
  const token = (await cookies()).get(sessionName)?.value;
  if (!token || !/^[\w-]{43}$/.test(token)) redirect('/login');
  const tokenDigest = sessionDigest(token);

  return studentTransaction(async (db) => {
    const { rows: [student] } = await db.query(
      `select students.id, students.username
       from education_unite.student_sessions as sessions
       join education_unite.students as students on students.id = sessions.student_id
       where sessions.token_digest = $1 and sessions.expires_at > now()`,
      [tokenDigest],
    );
    if (!student) redirect('/login');
    await db.query('select education_unite.lock_student($1)', [student.username]);
    const session = await db.query(
      'select 1 from education_unite.student_sessions where token_digest = $1 and expires_at > clock_timestamp()',
      [tokenDigest],
    );
    if (!session.rows.length) redirect('/login');
    await db.query(
      "select set_config('education_unite.student_id', $1, true), set_config('education_unite.session_digest', $2, true)",
      [student.id, tokenDigest],
    );
    return work(db, student, tokenDigest);
  });
}
